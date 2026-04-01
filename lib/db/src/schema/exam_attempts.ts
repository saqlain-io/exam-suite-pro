import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examAttemptsTable = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  examId: integer("exam_id").notNull(),
  shuffleMap: text("shuffle_map").notNull().default("{}"), // JSON: { questionId: shuffledOptions[] }
  questionOrder: text("question_order").notNull().default("[]"), // JSON: ordered question IDs
  answers: text("answers").notNull().default("{}"), // JSON: { questionId: selectedOption }
  isCompleted: boolean("is_completed").notNull().default(false),
  submissionReason: text("submission_reason"), // manual | timeout | tab_switch
  score: integer("score"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const insertExamAttemptSchema = createInsertSchema(examAttemptsTable).omit({ id: true, startedAt: true });
export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;
export type ExamAttempt = typeof examAttemptsTable.$inferSelect;
