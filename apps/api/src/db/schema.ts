import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase UID; never a password.
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studySets = pgTable("study_sets", {
  id: uuid("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("study_sets_owner_updated_idx").on(table.ownerId, table.updatedAt),
  index("study_sets_visibility_updated_idx").on(table.visibility, table.updatedAt),
  check("study_sets_visibility_check", sql`${table.visibility} IN ('private', 'public')`),
]);

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey(),
  setId: uuid("set_id").notNull().references(() => studySets.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  definition: text("definition").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("cards_set_position_idx").on(table.setId, table.position)]);
