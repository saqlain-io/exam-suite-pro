import { Router, type IRouter } from "express";
import { db, usersTable, yearsTable, programsTable, semestersTable, subjectsTable, examsTable, examAttemptsTable, mcqsTable } from "@workspace/db";
import { eq, and, count, sql, aliasedTable } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { hashPassword } from "../lib/auth";

const facultyUsersAlias = aliasedTable(usersTable, "faculty_user");

const router: IRouter = Router();

// Dashboard
router.get("/admin/dashboard", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const [[studentsRow], [facultyRow], [examsRow], [activeExamsRow], [resultsRow]] = await Promise.all([
    db.select({ cnt: count() }).from(usersTable).where(eq(usersTable.role, "student")),
    db.select({ cnt: count() }).from(usersTable).where(eq(usersTable.role, "faculty")),
    db.select({ cnt: count() }).from(examsTable),
    db.select({ cnt: count() }).from(examsTable).where(eq(examsTable.isActive, true)),
    db.select({ cnt: count() }).from(examAttemptsTable).where(eq(examAttemptsTable.isCompleted, true)),
  ]);

  const liveAttempts = await db.select().from(examAttemptsTable).where(eq(examAttemptsTable.isCompleted, false));

  const recentResults = await db
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
    .where(eq(examAttemptsTable.isCompleted, true))
    .orderBy(sql`${examAttemptsTable.submittedAt} DESC`)
    .limit(10);

  res.json({
    totalStudents: studentsRow.cnt,
    totalFaculty: facultyRow.cnt,
    totalExams: examsRow.cnt,
    activeExams: activeExamsRow.cnt,
    totalResults: resultsRow.cnt,
    liveAttempts: liveAttempts.length,
    recentResults: recentResults.map(r => ({
      ...r,
      percentage: r.score != null && r.totalQuestions ? parseFloat(((r.score / r.totalQuestions) * 100).toFixed(1)) : 0,
    })),
  });
});

// Years
router.get("/admin/years", requireAuth, async (_req, res): Promise<void> => {
  const years = await db.select().from(yearsTable).orderBy(yearsTable.value);
  res.json(years);
});

router.post("/admin/years", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { label, value } = req.body;
  if (!label || value == null) {
    res.status(400).json({ error: "label and value required" });
    return;
  }
  const [year] = await db.insert(yearsTable).values({ label, value: Number(value) }).returning();
  res.status(201).json(year);
});

router.put("/admin/years/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { label, value } = req.body;
  const [year] = await db.update(yearsTable).set({ label, value: Number(value) }).where(eq(yearsTable.id, id)).returning();
  if (!year) { res.status(404).json({ error: "Not found" }); return; }
  res.json(year);
});

router.delete("/admin/years/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(yearsTable).where(eq(yearsTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

// Programs
router.get("/admin/programs", requireAuth, async (_req, res): Promise<void> => {
  const programs = await db.select().from(programsTable).orderBy(programsTable.name);
  res.json(programs);
});

router.post("/admin/programs", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { name, code, description } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: "name and code required" });
    return;
  }
  const [program] = await db.insert(programsTable).values({ name, code, description }).returning();
  res.status(201).json(program);
});

router.put("/admin/programs/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, code, description } = req.body;
  const [program] = await db.update(programsTable).set({ name, code, description }).where(eq(programsTable.id, id)).returning();
  if (!program) { res.status(404).json({ error: "Not found" }); return; }
  res.json(program);
});

router.delete("/admin/programs/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(programsTable).where(eq(programsTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

// Semesters
router.get("/admin/semesters", requireAuth, async (_req, res): Promise<void> => {
  const semesters = await db.select().from(semestersTable).orderBy(semestersTable.number);
  res.json(semesters);
});

// Subjects
const subjectSelectFields = {
  id: subjectsTable.id,
  name: subjectsTable.name,
  code: subjectsTable.code,
  programId: subjectsTable.programId,
  semesterId: subjectsTable.semesterId,
  facultyId: subjectsTable.facultyId,
  programName: programsTable.name,
  semesterLabel: semestersTable.label,
  facultyName: facultyUsersAlias.name,
};

router.get("/admin/subjects", requireAuth, async (req, res): Promise<void> => {
  const { programId, semesterId, facultyId } = req.query;

  const conditions = [];
  if (programId) conditions.push(eq(subjectsTable.programId, Number(programId)));
  if (semesterId) conditions.push(eq(subjectsTable.semesterId, Number(semesterId)));
  if (facultyId) conditions.push(eq(subjectsTable.facultyId, Number(facultyId)));

  const base = db
    .select(subjectSelectFields)
    .from(subjectsTable)
    .leftJoin(programsTable, eq(subjectsTable.programId, programsTable.id))
    .leftJoin(semestersTable, eq(subjectsTable.semesterId, semestersTable.id))
    .leftJoin(facultyUsersAlias, eq(subjectsTable.facultyId, facultyUsersAlias.id));

  const results = conditions.length > 0
    ? await base.where(and(...conditions))
    : await base;

  res.json(results);
});

router.post("/admin/subjects", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { name, code, programId, semesterId, facultyId } = req.body;
  if (!name || !code || !programId || !semesterId) {
    res.status(400).json({ error: "name, code, programId, semesterId required" });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values({
    name, code,
    programId: Number(programId),
    semesterId: Number(semesterId),
    facultyId: facultyId ? Number(facultyId) : null,
  }).returning();
  res.status(201).json(subject);
});

router.put("/admin/subjects/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, code, programId, semesterId, facultyId } = req.body;
  const [subject] = await db.update(subjectsTable).set({
    name, code,
    programId: Number(programId),
    semesterId: Number(semesterId),
    facultyId: facultyId ? Number(facultyId) : null,
  }).where(eq(subjectsTable.id, id)).returning();
  if (!subject) { res.status(404).json({ error: "Not found" }); return; }
  res.json(subject);
});

router.delete("/admin/subjects/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

// Users
router.get("/admin/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { role } = req.query;
  let users;
  if (role) {
    users = await db.select().from(usersTable).where(eq(usersTable.role, String(role))).orderBy(usersTable.name);
  } else {
    users = await db.select().from(usersTable).orderBy(usersTable.name);
  }
  res.json(users.map(u => ({ ...u, passwordHash: undefined })));
});

router.post("/admin/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { username, name, password, role, programId, yearId, rollNumber } = req.body;
  if (!username || !name || !password || !role) {
    res.status(400).json({ error: "username, name, password, role required" });
    return;
  }
  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    username, name, passwordHash, role,
    programId: programId ? Number(programId) : null,
    yearId: yearId ? Number(yearId) : null,
    rollNumber: rollNumber || null,
  }).returning();
  res.status(201).json({ ...user, passwordHash: undefined });
});

router.put("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { username, name, password, programId, yearId, rollNumber } = req.body;
  const updateData: Record<string, unknown> = { username, name };
  if (password) updateData.passwordHash = hashPassword(password);
  if (programId !== undefined) updateData.programId = programId ? Number(programId) : null;
  if (yearId !== undefined) updateData.yearId = yearId ? Number(yearId) : null;
  if (rollNumber !== undefined) updateData.rollNumber = rollNumber || null;
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...user, passwordHash: undefined });
});

router.delete("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

// Live exams
router.get("/admin/live-exams", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const attempts = await db
    .select({
      attemptId: examAttemptsTable.id,
      studentName: usersTable.name,
      rollNumber: usersTable.rollNumber,
      examTitle: examsTable.title,
      startedAt: examAttemptsTable.startedAt,
      answers: examAttemptsTable.answers,
      totalQuestions: examsTable.totalQuestions,
    })
    .from(examAttemptsTable)
    .leftJoin(usersTable, eq(examAttemptsTable.studentId, usersTable.id))
    .leftJoin(examsTable, eq(examAttemptsTable.examId, examsTable.id))
    .where(eq(examAttemptsTable.isCompleted, false));

  res.json(attempts.map(a => ({
    attemptId: a.attemptId,
    studentName: a.studentName,
    rollNumber: a.rollNumber,
    examTitle: a.examTitle,
    startedAt: a.startedAt,
    answeredCount: Object.keys(JSON.parse(a.answers || "{}")),
    totalQuestions: a.totalQuestions,
  })));
});

// Results
router.get("/admin/results", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { examId, programId } = req.query;
  let baseQuery = db
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
    .where(eq(examAttemptsTable.isCompleted, true))
    .orderBy(sql`${examAttemptsTable.submittedAt} DESC`);

  const results = await baseQuery;
  const filtered = results.filter(r => {
    if (examId && r.examId !== Number(examId)) return false;
    return true;
  });

  res.json(filtered.map(r => ({
    ...r,
    percentage: r.score != null && r.totalQuestions ? parseFloat(((r.score / r.totalQuestions) * 100).toFixed(1)) : 0,
  })));
});

export default router;
