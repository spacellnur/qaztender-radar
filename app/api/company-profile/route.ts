import { readSessionFromRequest } from "../../auth";
import { saveCompanyProfile } from "../../db";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "tender_specialist" || !session.userId) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const number = (key: string) => Number(body[key]);
  
  let keywordsStr = "[]";
  let negativeKeywordsStr = "[]";
  if (typeof body.keywords === "string") {
    try {
      const parsed = JSON.parse(body.keywords);
      keywordsStr = JSON.stringify(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string" && Boolean(k.trim())).map((k) => k.trim().slice(0, 50)).slice(0, 50) : []);
    } catch {
      keywordsStr = JSON.stringify(body.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 50));
    }
  } else if (Array.isArray(body.keywords)) {
    keywordsStr = JSON.stringify(body.keywords.filter((k): k is string => typeof k === "string" && Boolean(k.trim())).map((k) => k.trim().slice(0, 50)).slice(0, 50));
  }

  if (typeof body.negativeKeywords === "string") {
    try {
      const parsed = JSON.parse(body.negativeKeywords);
      negativeKeywordsStr = JSON.stringify(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string" && Boolean(k.trim())).map((k) => k.trim().slice(0, 50)).slice(0, 50) : []);
    } catch {
      negativeKeywordsStr = JSON.stringify(body.negativeKeywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 50));
    }
  } else if (Array.isArray(body.negativeKeywords)) {
    negativeKeywordsStr = JSON.stringify(body.negativeKeywords.filter((k): k is string => typeof k === "string" && Boolean(k.trim())).map((k) => k.trim().slice(0, 50)).slice(0, 50));
  }

  const profile = {
    companyName: text("companyName"),
    bin: text("bin"),
    regions: text("regions"),
    workCategories: text("workCategories"),
    licenses: text("licenses"),
    experienceYears: number("experienceYears"),
    employeeCount: number("employeeCount"),
    minBudget: number("minBudget"),
    maxBudget: number("maxBudget"),
    keywords: keywordsStr,
    negativeKeywords: negativeKeywordsStr,
  };
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
