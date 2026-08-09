import type { AppRole } from "./auth";

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

export async function saveCompanyProfile(userId: string, profile: Record<string, string | number>) {
  const binding = db();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  await binding.prepare(`INSERT INTO company_profiles (id, user_id, company_name, bin, regions, work_categories, licenses, experience_years, employee_count, min_budget, max_budget, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET company_name=excluded.company_name, bin=excluded.bin, regions=excluded.regions, work_categories=excluded.work_categories, licenses=excluded.licenses, experience_years=excluded.experience_years, employee_count=excluded.employee_count, min_budget=excluded.min_budget, max_budget=excluded.max_budget, updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), userId, profile.companyName, profile.bin, profile.regions, profile.workCategories, profile.licenses, profile.experienceYears, profile.employeeCount, profile.minBudget, profile.maxBudget, now, now).run();
}
