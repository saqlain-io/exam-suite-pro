import { Router, type IRouter } from "express";
import { db, usersTable, programsTable, yearsTable, examsTable, mcqsTable, examAttemptsTable, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// Get programs for student login
router.get("/student/programs", async (_req, res): Promise<void> => {
  const programs = await db.select().from(programsTable).orderBy(programsTable.name);
  res.json(programs);
});

// Get student list for a program/year
router.get("/student/list", async (req, res): Promise<void> => {
  const { programId, yearId } = req.query;
  if (!programId || !yearId) {
    res.status(400).json({ error: "programId and yearId required" });
    return;
  }
  const students = await db
    .select({ id: usersTable.id, name: usersTable.name, rollNumber: usersTable.rollNumber })
    .from(usersTable)
    .where(and(
      eq(usersTable.role, "student"),
      eq(usersTable.programId, Number(programId)),
      eq(usersTable.yearId, Number(yearId)),
    ))
    .orderBy(usersTable.name);
  res.json(students);
});

// Get available exams for student
router.get("/student/available-exams", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const studentId = req.currentUser!.id;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  let exams;
  if (student.programId) {
    exams = await db
      .select({
        id: examsTable.id,
        title: examsTable.title,
        subjectId: examsTable.subjectId,
        subjectName: subjectsTable.name,
        programId: examsTable.programId,
        semesterId: examsTable.semesterId,
        yearId: examsTable.yearId,
        durationMinutes: examsTable.durationMinutes,
        totalQuestions: examsTable.totalQuestions,
        isActive: examsTable.isActive,
        createdAt: examsTable.createdAt,
      })
      .from(examsTable)
      .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
      .where(and(
        eq(examsTable.isActive, true),
        eq(examsTable.programId, student.programId),
      ));
  } else {
    exams = await db
      .select({
        id: examsTable.id,
        title: examsTable.title,
        subjectId: examsTable.subjectId,
        subjectName: subjectsTable.name,
        programId: examsTable.programId,
        semesterId: examsTable.semesterId,
        yearId: examsTable.yearId,
        durationMinutes: examsTable.durationMinutes,
        totalQuestions: examsTable.totalQuestions,
        isActive: examsTable.isActive,
        createdAt: examsTable.createdAt,
      })
      .from(examsTable)
      .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
      .where(eq(examsTable.isActive, true));
  }

  res.json(exams.map(e => ({ ...e, programName: null, mcqCount: null })));
});

export default router;
