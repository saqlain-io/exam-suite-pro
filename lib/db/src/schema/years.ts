import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const yearsTable = pgTable("years", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  value: integer("value").notNull(),
});

export const insertYearSchema = createInsertSchema(yearsTable).omit({ id: true });
export type InsertYear = z.infer<typeof insertYearSchema>;
export type Year = typeof yearsTable.$inferSelect;
