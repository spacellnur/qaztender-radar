import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["tender_specialist"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_users_username").on(table.username)]);

export const companyProfiles = sqliteTable("company_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  bin: text("bin").notNull(),
  regions: text("regions").notNull(),
  workCategories: text("work_categories").notNull(),
  licenses: text("licenses").notNull(),
  experienceYears: integer("experience_years").notNull(),
  employeeCount: integer("employee_count").notNull(),
  minBudget: integer("min_budget").notNull(),
  maxBudget: integer("max_budget").notNull(),
  completedAt: integer("completed_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_company_profiles_user_id").on(table.userId)]);
