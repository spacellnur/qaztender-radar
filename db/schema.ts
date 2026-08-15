import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  keywords: text("keywords").notNull().default("[]"),
  negativeKeywords: text("negative_keywords").notNull().default("[]"),
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

export const savedSearches = sqliteTable("saved_searches", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull(),
  name: text("name").notNull(),
  filters: text("filters").notNull(),
  alertFrequency: text("alert_frequency", { enum: ["off", "instant", "daily"] }).notNull().default("off"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_saved_searches_owner_name").on(table.ownerKey, table.name),
  index("idx_saved_searches_owner_updated_at").on(table.ownerKey, table.updatedAt),
]);

export const tenderLots = sqliteTable("tender_lots", {
  externalId: text("external_id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  lotNumber: text("lot_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  statusName: text("status_name").notNull().default("Не указан"),
  amount: real("amount").notNull().default(0),
  quantity: real("quantity").notNull().default(0),
  enstruIds: text("enstru_ids").notNull().default("[]"),
  deliveryKato: text("delivery_kato").notNull().default("[]"),
  upstreamUpdatedAt: text("upstream_updated_at").notNull().default(""),
  fetchedAt: integer("fetched_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_tender_lots_tender_id").on(table.tenderId)]);

export const tenderDocuments = sqliteTable("tender_documents", {
  externalId: text("external_id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  lotId: text("lot_id").notNull().default(""),
  name: text("name").notNull(),
  originalName: text("original_name").notNull().default(""),
  url: text("url").notNull().default(""),
  upstreamUpdatedAt: text("upstream_updated_at").notNull().default(""),
  fetchedAt: integer("fetched_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_tender_documents_tender_id").on(table.tenderId)]);

export const tenderChanges = sqliteTable("tender_changes", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  action: text("action", { enum: ["sync", "update", "delete"] }).notNull(),
  title: text("title").notNull(),
  changedAt: integer("changed_at").notNull(),
}, (table) => [index("idx_tender_changes_tender_changed_at").on(table.tenderId, table.changedAt)]);

export const tenderTasks = sqliteTable("tender_tasks", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["todo", "done"] }).notNull().default("todo"),
  assignedUserId: text("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  dueAt: integer("due_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdByOwnerKey: text("created_by_owner_key").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_tender_tasks_tender_title").on(table.tenderId, table.title),
  index("idx_tender_tasks_tender_sort").on(table.tenderId, table.sortOrder),
  index("idx_tender_tasks_assignee_status").on(table.assignedUserId, table.status),
]);

export const tenderNotes = sqliteTable("tender_notes", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.externalId, { onDelete: "cascade" }),
  ownerKey: text("owner_key").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_tender_notes_tender_created").on(table.tenderId, table.createdAt),
  index("idx_tender_notes_owner").on(table.ownerKey),
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

export const telegramSubscribers = sqliteTable("telegram_subscribers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(),
  username: text("username").notNull().default(""),
  firstName: text("first_name").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "rejected", "paused"] }).notNull().default("pending"),
  requestedAt: integer("requested_at").notNull(),
  approvedAt: integer("approved_at"),
  approvedBy: text("approved_by"),
  digestEnabled: integer("digest_enabled", { mode: "boolean" }).notNull().default(true),
  instantEnabled: integer("instant_enabled", { mode: "boolean" }).notNull().default(true),
  deadlinesEnabled: integer("deadlines_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_telegram_subscribers_user_id").on(table.userId),
  index("idx_telegram_subscribers_chat_id").on(table.chatId),
  index("idx_telegram_subscribers_status").on(table.status),
]);

export const telegramConnectTokens = sqliteTable("telegram_connect_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
}, (table) => [
  index("idx_telegram_connect_tokens_user").on(table.userId),
  index("idx_telegram_connect_tokens_expires").on(table.expiresAt),
]);

export const telegramDeliveries = sqliteTable("telegram_deliveries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  chatId: text("chat_id").notNull(),
  tenderId: text("tender_id").notNull(),
  alertType: text("alert_type").notNull(),
  sentAt: integer("sent_at").notNull(),
}, (table) => [
  index("idx_telegram_deliveries_user_tender").on(table.userId, table.tenderId),
  index("idx_telegram_deliveries_sent_at").on(table.sentAt),
]);


