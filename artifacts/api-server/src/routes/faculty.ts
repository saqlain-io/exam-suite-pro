import { Router, type IRouter } from "express";
import { db, examsTable, mcqsTable, subjectsTable, programsTable, semestersTable, examAttemptsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// Helper: Convert Pakistan time string to UTC Date
function pkTimeToUTC(timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;
  // If already has timezone info, use as is
  if (timeStr.includes('+') || timeStr.includes('Z')) {
    return new Date(timeStr);
  }
  // Assume Pakistan time (UTC+5), subtract 5 hours
  const d = new Date(timeStr);
  d.setHours(d.getHours() - 5);
  return d;
}

// Faculty dashboard
router.get("/faculty/dashboard", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const [[examsRow], [mcqsRow], [activeRow]] = await Promise.all([
    db.select({ cnt: count() }).from(examsTable),
    db.select({ cnt: count() }).from(mcqsTable),
    db.select({ cnt: count() }).from(examsTable).where(eq(examsTable.isActive, true)),
  ]);

  const recentExams = await db
    .select({
      id: examsTable.id,
      title: examsTable.title,
      subjectId: examsTable.subjectId,
      subjectName: subjectsTable.name,
      programId: examsTable.programId,
      programName: programsTable.name,
      semesterId: examsTable.semesterId,
      yearId: examsTable.yearId,
      durationMinutes: examsTable.durationMinutes,
      totalQuestions: examsTable.totalQuestions,
      isActive: examsTable.isActive,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdAt: examsTable.createdAt,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .leftJoin(programsTable, eq(examsTable.programId, programsTable.id))
    .orderBy(sql`${examsTable.createdAt} DESC`)
    .limit(5);

  const mcqCounts = await db
    .select({ examId: mcqsTable.examId, cnt: count() })
    .from(mcqsTable)
    .groupBy(mcqsTable.examId);

  const mcqMap: Record<number, number> = {};
  for (const m of mcqCounts) mcqMap[m.examId] = m.cnt;

  res.json({
    totalExams: examsRow.cnt,
    totalMcqs: mcqsRow.cnt,
    activeExams: activeRow.cnt,
    recentExams: recentExams.map(e => ({ ...e, mcqCount: mcqMap[e.id] ?? 0 })),
  });
});

// Get all exams
router.get("/faculty/exams", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const exams = await db
    .select({
      id: examsTable.id,
      title: examsTable.title,
      subjectId: examsTable.subjectId,
      subjectName: subjectsTable.name,
      programId: examsTable.programId,
      programName: programsTable.name,
      semesterId: examsTable.semesterId,
      yearId: examsTable.yearId,
      durationMinutes: examsTable.durationMinutes,
      totalQuestions: examsTable.totalQuestions,
      isActive: examsTable.isActive,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdAt: examsTable.createdAt,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .leftJoin(programsTable, eq(examsTable.programId, programsTable.id))
    .orderBy(sql`${examsTable.createdAt} DESC`);

  const mcqCounts = await db
    .select({ examId: mcqsTable.examId, cnt: count() })
    .from(mcqsTable)
    .groupBy(mcqsTable.examId);

  const mcqMap: Record<number, number> = {};
  for (const m of mcqCounts) mcqMap[m.examId] = m.cnt;

  res.json(exams.map(e => ({ ...e, mcqCount: mcqMap[e.id] ?? 0 })));
});

// Create exam
router.post("/faculty/exams", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const { title, subjectId, programId, semesterId, yearId, durationMinutes, totalQuestions, isActive, startTime, endTime } = req.body;
  if (!title || !subjectId || !programId || !semesterId) {
    res.status(400).json({ error: "title, subjectId, programId, semesterId required" });
    return;
  }
  const [exam] = await db.insert(examsTable).values({
    title,
    subjectId: Number(subjectId),
    programId: Number(programId),
    semesterId: Number(semesterId),
    yearId: yearId ? Number(yearId) : null,
    durationMinutes: Number(durationMinutes || 30),
    totalQuestions: Number(totalQuestions || 50),
    isActive: isActive !== undefined ? Boolean(isActive) : false,
    startTime: pkTimeToUTC(startTime),
    endTime: pkTimeToUTC(endTime),
  }).returning();
  res.status(201).json({ ...exam, mcqCount: 0 });
});

// Get exam by ID with MCQs
router.get("/faculty/exams/:id", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [exam] = await db
    .select({
      id: examsTable.id,
      title: examsTable.title,
      subjectId: examsTable.subjectId,
      subjectName: subjectsTable.name,
      programId: examsTable.programId,
      programName: programsTable.name,
      semesterId: examsTable.semesterId,
      yearId: examsTable.yearId,
      durationMinutes: examsTable.durationMinutes,
      totalQuestions: examsTable.totalQuestions,
      isActive: examsTable.isActive,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdAt: examsTable.createdAt,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .leftJoin(programsTable, eq(examsTable.programId, programsTable.id))
    .where(eq(examsTable.id, id));

  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const mcqs = await db.select().from(mcqsTable).where(eq(mcqsTable.examId, id)).orderBy(mcqsTable.questionNumber);

  res.json({ exam: { ...exam, mcqCount: mcqs.length }, mcqs });
});

// Update exam
router.put("/faculty/exams/:id", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, durationMinutes, totalQuestions, startTime, endTime } = req.body;
  const [exam] = await db.update(examsTable).set({
    title,
    durationMinutes: Number(durationMinutes),
    totalQuestions: Number(totalQuestions),
    startTime: pkTimeToUTC(startTime),
    endTime: pkTimeToUTC(endTime),
  }).where(eq(examsTable.id, id)).returning();
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json(exam);
});

// Delete exam
router.delete("/faculty/exams/:id", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(mcqsTable).where(eq(mcqsTable.examId, id));
  await db.delete(examsTable).where(eq(examsTable.id, id));
  res.json({ success: true, message: "Deleted" });
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

// Bulk upload MCQs
router.post("/faculty/exams/:id/mcqs/bulk", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { mcqs } = req.body;
  if (!Array.isArray(mcqs) || mcqs.length === 0) {
    res.status(400).json({ error: "mcqs array required" });
    return;
  }
  await db.delete(mcqsTable).where(eq(mcqsTable.examId, id));
  const toInsert = mcqs.map((m: Record<string, unknown>) => ({
    examId: id,
    questionText: String(m.questionText),
    optionA: String(m.optionA),
    optionB: String(m.optionB),
    optionC: String(m.optionC),
    optionD: String(m.optionD),
    correctOption: String(m.correctOption).toUpperCase(),
    questionNumber: Number(m.questionNumber),
  }));
  await db.insert(mcqsTable).values(toInsert);
  res.json({ success: true, message: `${toInsert.length} MCQs uploaded` });
});

// Update single MCQ
router.put("/faculty/mcqs/:id", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { questionText, optionA, optionB, optionC, optionD, correctOption, questionNumber } = req.body;
  const [mcq] = await db.update(mcqsTable).set({
    questionText, optionA, optionB, optionC, optionD,
    correctOption: correctOption?.toUpperCase(),
    questionNumber: Number(questionNumber),
  }).where(eq(mcqsTable.id, id)).returning();
  if (!mcq) { res.status(404).json({ error: "MCQ not found" }); return; }
  res.json(mcq);
});

// Delete single MCQ
router.delete("/faculty/mcqs/:id", requireAuth, requireRole("admin", "faculty"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(mcqsTable).where(eq(mcqsTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

export default router;