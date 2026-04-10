import { Router, type IRouter } from "express";
import { db, examsTable, mcqsTable, examAttemptsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start exam
router.post("/exams/:id/start", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const examId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const studentId = req.currentUser!.id;

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  if (!exam.isActive) { res.status(403).json({ error: "Exam is not active" }); return; }

  if (exam.startTime && new Date() < new Date(exam.startTime)) {
    res.status(403).json({ error: "Exam has not started yet" }); return;
  }

  if (exam.endTime && new Date() > new Date(exam.endTime)) {
    res.status(403).json({ error: "Exam time has ended" }); return;
  }

  const [completedAttempt] = await db
    .select()
    .from(examAttemptsTable)
    .where(and(
      eq(examAttemptsTable.studentId, studentId),
      eq(examAttemptsTable.examId, examId),
      eq(examAttemptsTable.isCompleted, true),
    ));

  if (completedAttempt) {
    res.status(403).json({ error: "You have already submitted this exam" }); return;
  }

  const [existingAttempt] = await db
    .select()
    .from(examAttemptsTable)
    .where(and(
      eq(examAttemptsTable.studentId, studentId),
      eq(examAttemptsTable.examId, examId),
      eq(examAttemptsTable.isCompleted, false),
    ));

  if (existingAttempt) {
    const mcqs = await db.select().from(mcqsTable).where(eq(mcqsTable.examId, examId));
    const questionOrder: number[] = JSON.parse(existingAttempt.questionOrder);
    const shuffleMap: Record<string, { label: string; text: string }[]> = JSON.parse(existingAttempt.shuffleMap);
    const existingAnswers: Record<string, string> = JSON.parse(existingAttempt.answers);

    const mcqMap: Record<number, typeof mcqs[0]> = {};
    for (const m of mcqs) mcqMap[m.id] = m;

    const questions = questionOrder.map((qId, idx) => {
      const mcq = mcqMap[qId];
      return {
        id: mcq.id,
        questionText: mcq.questionText,
        shuffledOptions: shuffleMap[String(qId)] || [
          { label: "A", text: mcq.optionA },
          { label: "B", text: mcq.optionB },
          { label: "C", text: mcq.optionC },
          { label: "D", text: mcq.optionD },
        ],
        displayNumber: idx + 1,
      };
    });

    res.json({
      attemptId: existingAttempt.id,
      examId,
      questions,
      durationMinutes: exam.durationMinutes,
      startedAt: existingAttempt.startedAt,
      existingAnswers,
    });
    return;
  }

  const mcqs = await db.select().from(mcqsTable).where(eq(mcqsTable.examId, examId));
  if (mcqs.length === 0) {
    res.status(400).json({ error: "No questions uploaded for this exam" });
    return;
  }

  const shuffledMcqs = shuffleArray(mcqs);
  const questionOrder = shuffledMcqs.map(m => m.id);
  const shuffleMap: Record<string, { label: string; text: string }[]> = {};

  const questions = shuffledMcqs.map((mcq, idx) => {
    const originalOptions = [
      { label: "A", text: mcq.optionA },
      { label: "B", text: mcq.optionB },
      { label: "C", text: mcq.optionC },
      { label: "D", text: mcq.optionD },
    ];
    const shuffledOptions = shuffleArray(originalOptions);
    shuffleMap[String(mcq.id)] = shuffledOptions;

    return {
      id: mcq.id,
      questionText: mcq.questionText,
      shuffledOptions,
      displayNumber: idx + 1,
    };
  });

  const [attempt] = await db.insert(examAttemptsTable).values({
    studentId,
    examId,
    shuffleMap: JSON.stringify(shuffleMap),
    questionOrder: JSON.stringify(questionOrder),
    answers: "{}",
    isCompleted: false,
  }).returning();

  res.json({
    attemptId: attempt.id,
    examId,
    questions,
    durationMinutes: exam.durationMinutes,
    startedAt: attempt.startedAt,
    existingAnswers: {},
  });
});

// Save answer
router.post("/exams/:id/save-answer", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { attemptId, questionId, selectedOption } = req.body;
  if (!attemptId || !questionId || !selectedOption) {
    res.status(400).json({ error: "attemptId, questionId, selectedOption required" });
    return;
  }

  const [attempt] = await db.select().from(examAttemptsTable).where(eq(examAttemptsTable.id, Number(attemptId)));
  if (!attempt || attempt.isCompleted) {
    res.status(400).json({ error: "Invalid or completed attempt" });
    return;
  }

  const answers = JSON.parse(attempt.answers);
  answers[String(questionId)] = selectedOption;

  await db.update(examAttemptsTable).set({ answers: JSON.stringify(answers) }).where(eq(examAttemptsTable.id, Number(attemptId)));
  res.json({ success: true, message: "Answer saved" });
});

// Submit exam
router.post("/exams/:id/submit", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const examId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { attemptId, answers, submissionReason } = req.body;

  const [attempt] = await db.select().from(examAttemptsTable).where(eq(examAttemptsTable.id, Number(attemptId)));
  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
  if (attempt.isCompleted) {
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    res.json({
      id: attempt.id,
      studentId: attempt.studentId,
      examId: attempt.examId,
      score: attempt.score ?? 0,
      totalQuestions: exam?.totalQuestions ?? 0,
      percentage: attempt.score != null && exam ? parseFloat(((attempt.score / exam.totalQuestions) * 100).toFixed(1)) : 0,
      submissionReason: attempt.submissionReason ?? "manual",
      submittedAt: attempt.submittedAt,
    });
    return;
  }

  const savedAnswers = JSON.parse(attempt.answers);
  const finalAnswers = { ...savedAnswers, ...answers };
  const shuffleMap: Record<string, { label: string; text: string }[]> = JSON.parse(attempt.shuffleMap);

  const mcqs = await db.select().from(mcqsTable).where(eq(mcqsTable.examId, examId));
  const mcqMap: Record<number, typeof mcqs[0]> = {};
  for (const m of mcqs) mcqMap[m.id] = m;

  let score = 0;
  for (const [qIdStr, selectedLabel] of Object.entries(finalAnswers)) {
    const mcq = mcqMap[Number(qIdStr)];
    if (!mcq) continue;
    const shuffledOptions = shuffleMap[qIdStr];
    if (!shuffledOptions) continue;

    const selectedEntry = shuffledOptions.find(o => o.label === selectedLabel);
    if (!selectedEntry) continue;

    const correctText = mcq[`option${mcq.correctOption}` as keyof typeof mcq] as string;
    if (selectedEntry.text === correctText) score++;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, attempt.studentId));

  await db.update(examAttemptsTable).set({
    answers: JSON.stringify(finalAnswers),
    isCompleted: true,
    score,
    submissionReason: submissionReason || "manual",
    submittedAt: new Date(),
  }).where(eq(examAttemptsTable.id, Number(attemptId)));

  const totalQuestions = exam?.totalQuestions ?? mcqs.length;
  res.json({
    id: attempt.id,
    studentId: attempt.studentId,
    studentName: student?.name,
    rollNumber: student?.rollNumber,
    examId: attempt.examId,
    examTitle: exam?.title,
    score,
    totalQuestions,
    percentage: parseFloat(((score / totalQuestions) * 100).toFixed(1)),
    submissionReason: submissionReason || "manual",
    submittedAt: new Date(),
  });
});

// Publish exam
router.post("/exams/:id/publish", requireAuth, requireRole("faculty", "admin"), async (req, res): Promise<void> => {
  const examId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  await db.update(examsTable).set({ isActive: true }).where(eq(examsTable.id, examId));
  res.json({ success: true, message: "Exam published" });
});

// Unpublish exam
router.post("/exams/:id/unpublish", requireAuth, requireRole("faculty", "admin"), async (req, res): Promise<void> => {
  const examId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  await db.update(examsTable).set({ isActive: false }).where(eq(examsTable.id, examId));
  res.json({ success: true, message: "Exam unpublished" });
});

export default router;