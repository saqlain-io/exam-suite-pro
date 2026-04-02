import { db, usersTable, programsTable, yearsTable, semestersTable, subjectsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedIfEmpty() {
  try {
    const [{ cnt }] = await db.select({ cnt: count() }).from(usersTable);
    if (cnt > 0) {
      logger.info("Database already seeded, skipping.");
      return;
    }

    logger.info("Database is empty — seeding initial data...");

    // Programs
    const [gbsn, prn] = await db.insert(programsTable).values([
      { name: "General Nursing & Midwifery", code: "GBSN", description: "Bachelor program in nursing and midwifery" },
      { name: "Post-RN Nursing", code: "PRN", description: "Post-registered nurse program" },
    ]).returning();

    // Years
    const years = await db.insert(yearsTable).values([
      { label: "2026", value: 2026 },
      { label: "2027", value: 2027 },
      { label: "2028", value: 2028 },
      { label: "2029", value: 2029 },
      { label: "2030", value: 2030 },
    ]).returning();
    const year2026 = years[0];

    // Semesters
    await db.insert(semestersTable).values([
      { label: "1st Semester", number: 1 },
      { label: "2nd Semester", number: 2 },
      { label: "3rd Semester", number: 3 },
      { label: "4th Semester", number: 4 },
      { label: "5th Semester", number: 5 },
      { label: "6th Semester", number: 6 },
      { label: "7th Semester", number: 7 },
      { label: "8th Semester", number: 8 },
    ]);

    // Users — admin and faculty
    await db.insert(usersTable).values([
      { username: "admin", name: "System Administrator", passwordHash: hashPassword("admin123"), role: "admin" },
      { username: "faculty1", name: "Dr. Sarah Ahmed", passwordHash: hashPassword("faculty123"), role: "faculty" },
      { username: "faculty2", name: "Dr. Imran Khan", passwordHash: hashPassword("faculty123"), role: "faculty" },
    ]);

    // Students in GBSN 2026
    await db.insert(usersTable).values([
      { username: "s2026001", name: "Fatima Malik", passwordHash: hashPassword("student123"), role: "student", programId: gbsn.id, yearId: year2026.id, rollNumber: "GBSN-2026-001" },
      { username: "s2026002", name: "Ayesha Khan", passwordHash: hashPassword("student123"), role: "student", programId: gbsn.id, yearId: year2026.id, rollNumber: "GBSN-2026-002" },
      { username: "s2026003", name: "Zainab Ahmed", passwordHash: hashPassword("student123"), role: "student", programId: gbsn.id, yearId: year2026.id, rollNumber: "GBSN-2026-003" },
      { username: "s2026004", name: "Maryam Hussain", passwordHash: hashPassword("student123"), role: "student", programId: gbsn.id, yearId: year2026.id, rollNumber: "GBSN-2026-004" },
      { username: "s2026005", name: "Sana Iqbal", passwordHash: hashPassword("student123"), role: "student", programId: gbsn.id, yearId: year2026.id, rollNumber: "GBSN-2026-005" },
    ]);

    // Students in PRN 2026
    await db.insert(usersTable).values([
      { username: "p2026001", name: "Nadia Siddiqui", passwordHash: hashPassword("student123"), role: "student", programId: prn.id, yearId: year2026.id, rollNumber: "PRN-2026-001" },
      { username: "p2026002", name: "Rabia Nawaz", passwordHash: hashPassword("student123"), role: "student", programId: prn.id, yearId: year2026.id, rollNumber: "PRN-2026-002" },
    ]);

    logger.info("Database seeded successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to seed database");
  }
}
