import type { CompanyProfile, TenderRecord } from "./tender-types";

export type MatchEvidence = { kind: "positive" | "negative" | "unknown"; label: string };
export type TenderMatch = { status: "fits" | "review" | "outside"; label: string; evidence: MatchEvidence[] };

const directionRules = [
  { direction: "Товары и оборудование", pattern: /товар|оборудован|поставк/i },
  { direction: "Услуги для организаций", pattern: /услуг/i },
  { direction: "IT и связь", pattern: /программ|компьют|сервер|связ|интернет|it\b/i },
  { direction: "Транспорт и логистика", pattern: /транспорт|логист|перевоз/i },
  { direction: "Медицина и фармацевтика", pattern: /медицин|фармацевт|лекарств/i },
  { direction: "Продукты и питание", pattern: /продукт|питан|пищев/i },
];

export function explainTenderMatch(tender: TenderRecord, profile: CompanyProfile): TenderMatch {
  const evidence: MatchEvidence[] = [];
  if (profile.regions.includes(tender.regionName)) evidence.push({ kind: "positive", label: `Регион ${tender.regionName} выбран в профиле` });
  else evidence.push({ kind: "negative", label: `Регион ${tender.regionName} не выбран в профиле` });

  if (profile.maxBudget === -1) evidence.push({ kind: "positive", label: "В профиле указан неограниченный бюджет" });
  else if (profile.maxBudget > 0 && tender.budget <= profile.maxBudget) evidence.push({ kind: "positive", label: "Бюджет тендера не превышает лимит компании" });
  else if (profile.maxBudget > 0) evidence.push({ kind: "negative", label: "Бюджет тендера выше лимита компании" });
  else evidence.push({ kind: "unknown", label: "Лимит бюджета компании не указан" });

  if (tender.isConstructionWork) {
    if (profile.directions.includes("Строительство и ремонт")) evidence.push({ kind: "positive", label: "Строительные работы входят в направления компании" });
    else evidence.push({ kind: "negative", label: "Строительные работы не выбраны в профиле" });
  } else {
    const searchable = `${tender.subjectType} ${tender.title}`;
    const rule = directionRules.find((item) => item.pattern.test(searchable));
    if (!rule) evidence.push({ kind: "unknown", label: "Направление нужно уточнить по лотам и документам" });
    else if (profile.directions.includes(rule.direction)) evidence.push({ kind: "positive", label: `${rule.direction} входит в направления компании` });
    else evidence.push({ kind: "negative", label: `${rule.direction} не выбрано в профиле` });
  }

  if (tender.isConstructionWork) evidence.push({ kind: "unknown", label: profile.licenses ? "Лицензия указана в профиле, но её применимость нужно сверить с документами" : "Требуемую лицензию нужно проверить в документации" });

  const positiveCount = evidence.filter((item) => item.kind === "positive").length;
  const hasConflict = evidence.some((item) => item.kind === "negative");
  if (hasConflict) return { status: "outside", label: "Вне профиля", evidence };
  if (positiveCount >= 2) return { status: "fits", label: "Подходит по известным данным", evidence };
  return { status: "review", label: "Нужно проверить", evidence };
}
