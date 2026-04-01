import { Router, type IRouter } from "express";
import { db, examAttemptsTable, examsTable, subjectsTable, programsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/results/my", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const studentId = req.currentUser!.id;

  const results = await db
    .select({
      id: examAttemptsTable.id,
      studentId: examAttemptsTable.studentId,
      studentName: usersTable.name,
      rollNumber: usersTable.rollNumber,
      examId: examAttemptsTable.examId,
      examTitle: examsTable.title,
      subjectName: subjectsTable.name,
      programName: programsTable.name,
      score: examAttemptsTable.score,
      totalQuestions: examsTable.totalQuestions,
      submissionReason: examAttemptsTable.submissionReason,
      submittedAt: examAttemptsTable.submittedAt,
    })
    .from(examAttemptsTable)
    .leftJoin(usersTable, eq(examAttemptsTable.studentId, usersTable.id))
    .leftJoin(examsTable, eq(examAttemptsTable.examId, examsTable.id))
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .leftJoin(programsTable, eq(examsTable.programId, programsTable.id))
    .where(eq(examAttemptsTable.studentId, studentId))
    .orderBy(sql`${examAttemptsTable.submittedAt} DESC`);

  res.json(results.map(r => ({
    ...r,
    percentage: r.score != null && r.totalQuestions ? parseFloat(((r.score / r.totalQuestions) * 100).toFixed(1)) : 0,
  })));
});

export default router;
