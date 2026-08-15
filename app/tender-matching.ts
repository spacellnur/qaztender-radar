import type { CompanyProfile, TenderRecord } from "./tender-types";

export type MatchEvidence = { kind: "positive" | "negative" | "unknown"; label: string };
export type TenderMatch = {
  status: "fits" | "review" | "outside";
  label: string;
  evidence: MatchEvidence[];
  matchedKeywords: string[];
  matchedNegativeKeywords: string[];
};

const directionRules = [
  { direction: "Товары и оборудование", pattern: /товар|оборудован|поставк/i },
  { direction: "Услуги для организаций", pattern: /услуг/i },
  { direction: "IT и связь", pattern: /программ|компьют|сервер|связ|интернет|it\b/i },
  { direction: "Транспорт и логистика", pattern: /транспорт|логист|перевоз/i },
  { direction: "Медицина и фармацевтика", pattern: /медицин|фармацевт|лекарств/i },
  { direction: "Продукты и питание", pattern: /продукт|питан|пищев/i },
];

function stemWord(word: string): string {
  const clean = word.toLowerCase().trim();
  if (clean.length <= 3) return clean;
  return clean.replace(/(?:[аеёиоуыэюяь]+|[ое]м|[ая]м|[ое]й|[ая]х|[ое]в|и[яе]|ын|ін|ді|ты|тер|тар|дер|дар)$/i, "");
}

export function matchesKeyword(text: string, keyword: string): boolean {
  const normText = text.toLowerCase();
  const normKw = keyword.toLowerCase().trim();
  if (!normKw) return false;
  if (normText.includes(normKw)) return true;

  const kwWords = normKw.split(/\s+/).filter(Boolean);
  const textWords = normText.split(/[^a-zA-Zа-яА-ЯёЁәіңғүұқөһ0-9]+/).filter(Boolean);

  return kwWords.length > 0 && kwWords.every((kwWord) => {
    const stem = stemWord(kwWord);
    if (stem.length < 3) return textWords.includes(kwWord);
    return textWords.some((tw) => tw.startsWith(stem) || tw.includes(stem));
  });
}

export function explainTenderMatch(tender: TenderRecord, profile: CompanyProfile): TenderMatch {
  const evidence: MatchEvidence[] = [];
  const searchableText = `${tender.title} ${tender.buyer} ${tender.subjectType} ${tender.methodName}`.toLowerCase();

  // Negative keywords / Stop-words check
  const matchedNegativeKeywords: string[] = [];
  if (Array.isArray(profile.negativeKeywords)) {
    for (const rawWord of profile.negativeKeywords) {
      if (matchesKeyword(searchableText, rawWord)) {
        matchedNegativeKeywords.push(rawWord.trim());
      }
    }
  }

  for (const stopWord of matchedNegativeKeywords) {
    evidence.push({ kind: "negative", label: `Содержит стоп-слово: «${stopWord}»` });
  }

  // Region check
  if (profile.regions.includes(tender.regionName)) {
    evidence.push({ kind: "positive", label: `Регион ${tender.regionName} выбран в профиле` });
  } else {
    evidence.push({ kind: "negative", label: `Регион ${tender.regionName} не выбран в профиле` });
  }

  // Budget check
  if (profile.maxBudget === -1) {
    evidence.push({ kind: "positive", label: "В профиле указан неограниченный бюджет" });
  } else if (profile.maxBudget > 0 && tender.budget <= profile.maxBudget) {
    evidence.push({ kind: "positive", label: "Бюджет тендера не превышает лимит компании" });
  } else if (profile.maxBudget > 0) {
    evidence.push({ kind: "negative", label: "Бюджет тендера выше лимита компании" });
  } else {
    evidence.push({ kind: "unknown", label: "Лимит бюджета компании не указан" });
  }

  // Direction / subject check
  if (tender.isConstructionWork) {
    if (profile.directions.includes("Строительство и ремонт")) {
      evidence.push({ kind: "positive", label: "Строительные работы входят в направления компании" });
    } else {
      evidence.push({ kind: "negative", label: "Строительные работы не выбраны в профиле" });
    }
  } else {
    const rule = directionRules.find((item) => item.pattern.test(searchableText));
    if (!rule) {
      evidence.push({ kind: "unknown", label: "Направление нужно уточнить по лотам и документам" });
    } else if (profile.directions.includes(rule.direction)) {
      evidence.push({ kind: "positive", label: `${rule.direction} входит в направления компании` });
    } else {
      evidence.push({ kind: "negative", label: `${rule.direction} не выбрано в профиле` });
    }
  }

  // Positive keywords check
  const matchedKeywords: string[] = [];
  if (Array.isArray(profile.keywords)) {
    for (const rawWord of profile.keywords) {
      if (matchesKeyword(searchableText, rawWord)) {
        matchedKeywords.push(rawWord.trim());
      }
    }
  }

  for (const kw of matchedKeywords) {
    evidence.push({ kind: "positive", label: `Совпадение по ключевому слову: «${kw}»` });
  }

  if (tender.isConstructionWork) {
    evidence.push({
      kind: "unknown",
      label: profile.licenses ? "Лицензия указана в профиле, но её применимость нужно сверить с документами" : "Требуемую лицензию нужно проверить в документации",
    });
  }

  const positiveCount = evidence.filter((item) => item.kind === "positive").length;
  const hasConflict = evidence.some((item) => item.kind === "negative");

  if (hasConflict) {
    return { status: "outside", label: "Вне профиля", evidence, matchedKeywords, matchedNegativeKeywords };
  }
  if (positiveCount >= 2) {
    return { status: "fits", label: "Подходит по известным данным", evidence, matchedKeywords, matchedNegativeKeywords };
  }
  return { status: "review", label: "Нужно проверить", evidence, matchedKeywords, matchedNegativeKeywords };
}

