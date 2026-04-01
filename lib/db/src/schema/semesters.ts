import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const semestersTable = pgTable("semesters", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  label: text("label").notNull(),
});

export const insertSemesterSchema = createInsertSchema(semestersTable).omit({ id: true });
export type InsertSemester = z.infer<typeof insertSemesterSchema>;
export type Semester = typeof semestersTable.$inferSelect;
