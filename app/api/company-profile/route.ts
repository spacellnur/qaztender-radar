import { readSessionFromRequest } from "../../auth";
import { saveCompanyProfile } from "../../db";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "tender_specialist" || !session.userId) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const number = (key: string) => Number(body[key]);
  const profile = { companyName: text("companyName"), bin: text("bin"), regions: text("regions"), workCategories: text("workCategories"), licenses: text("licenses"), experienceYears: number("experienceYears"), employeeCount: number("employeeCount"), minBudget: number("minBudget"), maxBudget: number("maxBudget") };
  if (!profile.companyName || !/^\d{12}$/.test(profile.bin) || !profile.regions || !profile.workCategories || !profile.licenses || !Number.isFinite(profile.experienceYears) || !Number.isFinite(profile.employeeCount) || profile.minBudget < 0 || profile.maxBudget <= profile.minBudget) return Response.json({ error: "Проверьте обязательные поля и диапазон бюджета" }, { status: 400 });
  await saveCompanyProfile(session.userId, profile);
  return Response.json({ ok: true });
}
