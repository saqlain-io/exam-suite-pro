import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mcqsTable = pgTable("mcqs", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: text("correct_option").notNull(), // A | B | C | D
  questionNumber: integer("question_number").notNull(),
});

export const insertMcqSchema = createInsertSchema(mcqsTable).omit({ id: true });
export type InsertMcq = z.infer<typeof insertMcqSchema>;
export type Mcq = typeof mcqsTable.$inferSelect;
