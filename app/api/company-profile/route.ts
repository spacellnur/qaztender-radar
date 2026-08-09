import { readSessionFromRequest } from "../../auth";
import { saveCompanyProfile } from "../../db";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "tender_specialist" || !session.userId) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const number = (key: string) => Number(body[key]);
  const profile = { companyName: text("companyName"), bin: text("bin"), regions: text("regions"), workCategories: text("workCategories"), licenses: text("licenses"), experienceYears: number("experienceYears"), employeeCount: number("employeeCount"), minBudget: number("minBudget"), maxBudget: number("maxBudget") };
  let regionCount = 0;
  let directionCount = 0;
  try {
    const parsedRegions = JSON.parse(profile.regions);
    const parsedCategories = JSON.parse(profile.workCategories);
    regionCount = Array.isArray(parsedRegions) ? parsedRegions.length : 0;
    directionCount = Array.isArray(parsedCategories?.directions) ? parsedCategories.directions.length : 0;
  } catch {
    return Response.json({ error: "Не удалось прочитать выбранные регионы и направления" }, { status: 400 });
  }
  const validBin = profile.bin === "" || /^\d{12}$/.test(profile.bin);
  const validOptionalNumbers = Number.isFinite(profile.experienceYears) && profile.experienceYears >= 0 && Number.isFinite(profile.employeeCount) && profile.employeeCount >= 0;
  const validBudget = profile.maxBudget === -1 || profile.maxBudget === 0 || profile.maxBudget > 0;
  if (!profile.companyName || regionCount === 0 || directionCount === 0 || !validBin || !validOptionalNumbers || !validBudget) return Response.json({ error: "Проверьте название, выбранные регионы и направления деятельности" }, { status: 400 });
  await saveCompanyProfile(session.userId, profile);
  return Response.json({ ok: true });
}
