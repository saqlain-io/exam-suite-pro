import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Bad Request", message: "Username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const token = generateToken(user.id, user.role);
  res.json({
    user: {
      id: user.id, username: user.username, name: user.name,
      role: user.role, programId: user.programId, yearId: user.yearId,
      rollNumber: user.rollNumber, createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/student-login", async (req, res): Promise<void> => {
  const { studentId, programId, yearId } = req.body;
  if (!studentId) {
    res.status(400).json({ error: "Bad Request", message: "studentId required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(studentId)));
  if (!user || user.role !== "student") {
    res.status(401).json({ error: "Unauthorized", message: "Student not found" });
    return;
  }
  // Verify student belongs to this program/year
  if (programId && user.programId !== Number(programId)) {
    res.status(401).json({ error: "Unauthorized", message: "Student not in this program" });
    return;
  }
  if (yearId && user.yearId !== Number(yearId)) {
    res.status(401).json({ error: "Unauthorized", message: "Student not in this year" });
    return;
  }
  const token = generateToken(user.id, user.role);
  res.json({
    user: {
      id: user.id, username: user.username, name: user.name,
      role: user.role, programId: user.programId, yearId: user.yearId,
      rollNumber: user.rollNumber, createdAt: user.createdAt,
    },
    token,
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.currentUser!.id));
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: user.id, username: user.username, name: user.name,
    role: user.role, programId: user.programId, yearId: user.yearId,
    rollNumber: user.rollNumber, createdAt: user.createdAt,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
