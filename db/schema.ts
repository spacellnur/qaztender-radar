import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const tenders = sqliteTable("tenders", {
  externalId: text("external_id").primaryKey(),
  numberAnno: text("number_anno").notNull(),
  title: text("title").notNull(),
  buyer: text("buyer").notNull(),
  customerBin: text("customer_bin").notNull().default(""),
  regionCode: text("region_code").notNull().default(""),
  regionName: text("region_name").notNull().default("Регион не указан"),
  subjectTypeId: integer("subject_type_id").notNull().default(0),
  subjectType: text("subject_type").notNull().default("Не указан"),
  methodId: integer("method_id").notNull().default(0),
  methodName: text("method_name").notNull().default("Не указан"),
  budget: integer("budget").notNull().default(0),
  startDate: integer("start_date"),
  endDate: integer("end_date"),
  publishDate: integer("publish_date"),
  isConstructionWork: integer("is_construction_work", { mode: "boolean" }).notNull().default(false),
  statusId: integer("status_id").notNull().default(0),
  statusName: text("status_name").notNull().default("Не указан"),
  kato: text("kato").notNull().default("[]"),
  systemId: integer("system_id").notNull().default(3),
  sourceUrl: text("source_url").notNull(),
  upstreamUpdatedAt: text("upstream_updated_at").notNull().default(""),
  fetchedAt: integer("fetched_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_tenders_region_end_date").on(table.regionCode, table.endDate),
  index("idx_tenders_end_date").on(table.endDate),
  index("idx_tenders_budget").on(table.budget),
  index("idx_tenders_upstream_updated_at").on(table.upstreamUpdatedAt),
]);

export const tenderWorkflow = sqliteTable("tender_workflow", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  stage: text("stage", { enum: ["none", "reviewing", "participating", "submitted", "won", "lost", "skipped"] }).notNull().default("none"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_tender_workflow_owner_tender").on(table.ownerKey, table.tenderId),
  index("idx_tender_workflow_owner_stage").on(table.ownerKey, table.stage),
]);

export const tenderSyncRuns = sqliteTable("tender_sync_runs", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["running", "succeeded", "failed"] }).notNull(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  fetchedCount: integer("fetched_count").notNull().default(0),
  savedCount: integer("saved_count").notNull().default(0),
  errorMessage: text("error_message").notNull().default(""),
}, (table) => [index("idx_tender_sync_runs_started_at").on(table.startedAt)]);
