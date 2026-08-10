import type { AppRole } from "./auth";
import type { AlertFrequency, CompanyProfile, SavedSearch, TenderRecord, TenderSearchFilters, TenderSourceStatus, TenderStage, TenderWorkflowEntry } from "./tender-types";

export type DatabaseUser = { id: string; username: string; passwordHash: string; role: AppRole; isActive: number };

function db(): D1Database | null {
  return globalThis.__QAZTENDER_ENV?.DB ?? null;
}

export function hasDatabase(): boolean { return db() !== null; }

export async function findUserByUsername(username: string): Promise<DatabaseUser | null> {
  return (await db()?.prepare("SELECT id, username, password_hash AS passwordHash, role, is_active AS isActive FROM users WHERE username = ? LIMIT 1").bind(username).first<DatabaseUser>()) ?? null;
}

export async function listTenderSpecialists() {
  return (await db()?.prepare("SELECT u.id, u.username, u.is_active AS isActive, u.created_at AS createdAt, CASE WHEN p.user_id IS NULL THEN 0 ELSE 1 END AS profileComplete, p.company_name AS companyName FROM users u LEFT JOIN company_profiles p ON p.user_id = u.id ORDER BY u.created_at DESC").all())?.results ?? [];
}

export async function createTenderSpecialist(username: string, passwordHash: string) {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  const id = crypto.randomUUID();
  await binding.prepare("INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, 'tender_specialist', 1, ?, ?)").bind(id, username, passwordHash, now, now).run();
  return { id, username, role: "tender_specialist" as const };
}

export async function companyProfileExists(userId: string): Promise<boolean> {
  return Boolean(await db()?.prepare("SELECT 1 AS present FROM company_profiles WHERE user_id = ? LIMIT 1").bind(userId).first());
}

export async function getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
  const row = await db()?.prepare(`SELECT company_name AS companyName, bin, regions, work_categories AS workCategories, licenses,
    experience_years AS experienceYears, employee_count AS employeeCount, min_budget AS minBudget, max_budget AS maxBudget, updated_at AS updatedAt
    FROM company_profiles WHERE user_id = ? LIMIT 1`).bind(userId).first<{
      companyName: string; bin: string; regions: string; workCategories: string; licenses: string;
      experienceYears: number; employeeCount: number; minBudget: number; maxBudget: number; updatedAt: number;
    }>();
  if (!row) return null;
  try {
    const regions = JSON.parse(row.regions) as unknown;
    const categories = JSON.parse(row.workCategories) as { directions?: unknown; construction?: unknown };
    return {
      companyName: row.companyName,
      bin: row.bin,
      regions: Array.isArray(regions) ? regions.filter((item): item is string => typeof item === "string") : [],
      directions: Array.isArray(categories.directions) ? categories.directions.filter((item): item is string => typeof item === "string") : [],
      constructionTypes: Array.isArray(categories.construction) ? categories.construction.filter((item): item is string => typeof item === "string") : [],
      licenses: row.licenses,
      experienceYears: Number(row.experienceYears), employeeCount: Number(row.employeeCount), minBudget: Number(row.minBudget), maxBudget: Number(row.maxBudget), updatedAt: Number(row.updatedAt),
    };
  } catch { return null; }
}

export async function saveCompanyProfile(userId: string, profile: Record<string, string | number>) {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  await binding.prepare(`INSERT INTO company_profiles (id, user_id, company_name, bin, regions, work_categories, licenses, experience_years, employee_count, min_budget, max_budget, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET company_name=excluded.company_name, bin=excluded.bin, regions=excluded.regions, work_categories=excluded.work_categories, licenses=excluded.licenses, experience_years=excluded.experience_years, employee_count=excluded.employee_count, min_budget=excluded.min_budget, max_budget=excluded.max_budget, updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), userId, profile.companyName, profile.bin, profile.regions, profile.workCategories, profile.licenses, profile.experienceYears, profile.employeeCount, profile.minBudget, profile.maxBudget, now, now).run();
}

export async function listTenders(limit = 500): Promise<TenderRecord[]> {
  const binding = db();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT
      external_id AS externalId, number_anno AS numberAnno, title, buyer,
      customer_bin AS customerBin, region_code AS regionCode, region_name AS regionName,
      subject_type_id AS subjectTypeId, subject_type AS subjectType,
      method_id AS methodId, method_name AS methodName, budget,
      start_date AS startDate, end_date AS endDate, publish_date AS publishDate,
      is_construction_work AS isConstructionWork, status_id AS statusId,
      status_name AS statusName, kato, system_id AS systemId, source_url AS sourceUrl,
      upstream_updated_at AS upstreamUpdatedAt, fetched_at AS fetchedAt, updated_at AS updatedAt
    FROM tenders
    ORDER BY CASE WHEN end_date IS NULL THEN 1 ELSE 0 END, end_date ASC, budget DESC
    LIMIT ?`).bind(Math.min(Math.max(limit, 1), 1000)).all<TenderRecord>();
  return (result.results ?? []).map((row) => ({ ...row, isConstructionWork: Boolean(row.isConstructionWork) }));
}

export async function listTenderWorkflow(ownerKey: string): Promise<TenderWorkflowEntry[]> {
  const binding = db();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT tender_id AS tenderId, is_favorite AS isFavorite, stage, updated_at AS updatedAt
    FROM tender_workflow WHERE owner_key = ? ORDER BY updated_at DESC`).bind(ownerKey).all<TenderWorkflowEntry>();
  return (result.results ?? []).map((row) => ({ ...row, isFavorite: Boolean(row.isFavorite) }));
}

export async function saveTenderWorkflow(ownerKey: string, tenderId: string, isFavorite: boolean, stage: TenderStage): Promise<TenderWorkflowEntry | null> {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const tender = await binding.prepare("SELECT 1 AS present FROM tenders WHERE external_id = ? LIMIT 1").bind(tenderId).first();
  if (!tender) throw new Error("Tender not found");
  const now = Date.now();
  if (!isFavorite && stage === "none") {
    await binding.prepare("DELETE FROM tender_workflow WHERE owner_key = ? AND tender_id = ?").bind(ownerKey, tenderId).run();
    return null;
  }
  await binding.prepare(`INSERT INTO tender_workflow (id, owner_key, tender_id, is_favorite, stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_key, tender_id) DO UPDATE SET is_favorite=excluded.is_favorite, stage=excluded.stage, updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), ownerKey, tenderId, isFavorite ? 1 : 0, stage, now, now).run();
  return { tenderId, isFavorite, stage, updatedAt: now };
}

export async function listSavedSearches(ownerKey: string): Promise<SavedSearch[]> {
  const binding = db();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT id, name, filters, alert_frequency AS alertFrequency, created_at AS createdAt, updated_at AS updatedAt
    FROM saved_searches WHERE owner_key = ? ORDER BY updated_at DESC`).bind(ownerKey).all<Omit<SavedSearch, "filters"> & { filters: string }>();
  return (result.results ?? []).flatMap((row) => {
    try { return [{ ...row, filters: JSON.parse(row.filters) as TenderSearchFilters }]; }
    catch { return []; }
  });
}

export async function saveSavedSearch(ownerKey: string, id: string | null, name: string, filters: TenderSearchFilters, alertFrequency: AlertFrequency): Promise<SavedSearch> {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  const savedId = id || crypto.randomUUID();
  const existing = id ? await binding.prepare("SELECT created_at AS createdAt FROM saved_searches WHERE id = ? AND owner_key = ? LIMIT 1").bind(id, ownerKey).first<{ createdAt: number }>() : null;
  if (id && !existing) throw new Error("Saved search not found");
  const createdAt = existing?.createdAt ?? now;
  await binding.prepare(`INSERT INTO saved_searches (id, owner_key, name, filters, alert_frequency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, filters=excluded.filters, alert_frequency=excluded.alert_frequency, updated_at=excluded.updated_at`)
    .bind(savedId, ownerKey, name, JSON.stringify(filters), alertFrequency, createdAt, now).run();
  return { id: savedId, name, filters, alertFrequency, createdAt, updatedAt: now };
}

export async function deleteSavedSearch(ownerKey: string, id: string): Promise<boolean> {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const result = await binding.prepare("DELETE FROM saved_searches WHERE id = ? AND owner_key = ?").bind(id, ownerKey).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function getTenderSourceStatus(configured: boolean): Promise<TenderSourceStatus> {
  const binding = db();
  if (!binding) {
    return { configured, recordCount: 0, state: configured ? "ready_to_sync" : "waiting_token", lastSyncAt: null, lastSyncStatus: null, lastError: "" };
  }
  const count = await binding.prepare("SELECT COUNT(*) AS count FROM tenders").first<{ count: number }>();
  const run = await binding.prepare(`SELECT status, finished_at AS finishedAt, started_at AS startedAt, error_message AS errorMessage
    FROM tender_sync_runs WHERE status IN ('succeeded', 'failed') ORDER BY started_at DESC LIMIT 1`)
    .first<{ status: "succeeded" | "failed"; finishedAt: number | null; startedAt: number; errorMessage: string }>();
  const recordCount = Number(count?.count ?? 0);
  const state = run?.status === "failed" && recordCount === 0 ? "error" : recordCount > 0 ? "ready" : configured ? "ready_to_sync" : "waiting_token";
  return {
    configured,
    recordCount,
    state,
    lastSyncAt: run ? (run.finishedAt ?? run.startedAt) : null,
    lastSyncStatus: run?.status ?? null,
    lastError: run?.errorMessage ?? "",
  };
}

export async function startTenderSyncRun(): Promise<string> {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const id = crypto.randomUUID();
  await binding.prepare("INSERT INTO tender_sync_runs (id, status, started_at, fetched_count, saved_count, error_message) VALUES (?, 'running', ?, 0, 0, '')")
    .bind(id, Date.now()).run();
  return id;
}

export async function finishTenderSyncRun(id: string, status: "succeeded" | "failed", fetchedCount: number, savedCount: number, errorMessage = "") {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  await binding.prepare("UPDATE tender_sync_runs SET status = ?, finished_at = ?, fetched_count = ?, saved_count = ?, error_message = ? WHERE id = ?")
    .bind(status, Date.now(), fetchedCount, savedCount, errorMessage.slice(0, 500), id).run();
}

export async function upsertTenders(records: TenderRecord[]): Promise<number> {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  if (records.length === 0) return 0;
  const sql = `INSERT INTO tenders (
      external_id, number_anno, title, buyer, customer_bin, region_code, region_name,
      subject_type_id, subject_type, method_id, method_name, budget, start_date, end_date,
      publish_date, is_construction_work, status_id, status_name, kato, system_id, source_url,
      upstream_updated_at, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      number_anno=excluded.number_anno, title=excluded.title, buyer=excluded.buyer,
      customer_bin=excluded.customer_bin, region_code=excluded.region_code, region_name=excluded.region_name,
      subject_type_id=excluded.subject_type_id, subject_type=excluded.subject_type,
      method_id=excluded.method_id, method_name=excluded.method_name, budget=excluded.budget,
      start_date=excluded.start_date, end_date=excluded.end_date, publish_date=excluded.publish_date,
      is_construction_work=excluded.is_construction_work, status_id=excluded.status_id,
      status_name=excluded.status_name, kato=excluded.kato, system_id=excluded.system_id,
      source_url=excluded.source_url, upstream_updated_at=excluded.upstream_updated_at,
      fetched_at=excluded.fetched_at, updated_at=excluded.updated_at`;

  for (let offset = 0; offset < records.length; offset += 60) {
    const statements = records.slice(offset, offset + 60).map((record) => binding.prepare(sql).bind(
      record.externalId, record.numberAnno, record.title, record.buyer, record.customerBin,
      record.regionCode, record.regionName, record.subjectTypeId, record.subjectType,
      record.methodId, record.methodName, record.budget, record.startDate, record.endDate,
      record.publishDate, record.isConstructionWork ? 1 : 0, record.statusId, record.statusName,
      record.kato, record.systemId, record.sourceUrl, record.upstreamUpdatedAt,
      record.fetchedAt, record.updatedAt,
    ));
    await binding.batch(statements);
  }
  return records.length;
}
