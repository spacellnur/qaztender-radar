import { finishTenderSyncRun, replaceTenderDetails, startTenderSyncRun, upsertTenders } from "./db";
import type { TenderDocument, TenderLot, TenderRecord } from "./tender-types";

const GOSZAKUP_GRAPHQL_URL = "https://ows.goszakup.gov.kz/v3/graphql";
const PAGE_SIZE = 200;
const MAX_PAGES_PER_SYNC = 3;

const ANNOUNCEMENTS_QUERY = `
  query RecentAnnouncements($filter: TrdBuyFiltersInput, $limit: Int, $after: Int) {
    TrdBuy(filter: $filter, limit: $limit, after: $after) {
      id
      numberAnno
      nameRu
      totalSum
      refTradeMethodsId
      refSubjectTypeId
      customerBin
      customerNameRu
      refBuyStatusId
      startDate
      endDate
      publishDate
      isConstructionWork
      lastUpdateDate
      kato
      systemId
      indexDate
      RefTradeMethods { nameRu }
      RefSubjectType { nameRu }
      RefBuyStatus { nameRu }
    }
  }
`;

const TENDER_DETAILS_QUERY = `
  query TenderDetails($filter: LotsFiltersInput, $limit: Int) {
    Lots(filter: $filter, limit: $limit) {
      id lotNumber refLotStatusId lastUpdateDate count amount nameRu descriptionRu trdBuyId enstruList plnPointKatoList systemId indexDate
      RefLotsStatus { nameRu }
      Files { id filePath originalName objectId nameRu indexDate systemId }
    }
  }
`;

type ApiAnnouncement = {
  id?: number;
  numberAnno?: string | null;
  nameRu?: string | null;
  totalSum?: number | null;
  refTradeMethodsId?: number | null;
  refSubjectTypeId?: number | null;
  customerBin?: string | null;
  customerNameRu?: string | null;
  refBuyStatusId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  publishDate?: string | null;
  isConstructionWork?: number | null;
  lastUpdateDate?: string | null;
  kato?: string[] | null;
  systemId?: number | null;
  indexDate?: string | null;
  RefTradeMethods?: { nameRu?: string | null } | null;
  RefSubjectType?: { nameRu?: string | null } | null;
  RefBuyStatus?: { nameRu?: string | null } | null;
};

type GraphqlResponse = {
  data?: { TrdBuy?: ApiAnnouncement[] | null };
  errors?: Array<{ message?: string }>;
};

type ApiLot = {
  id?: number; lotNumber?: string | null; lastUpdateDate?: string | null; count?: number | null; amount?: number | null;
  nameRu?: string | null; descriptionRu?: string | null; trdBuyId?: number | null; enstruList?: number[] | null;
  plnPointKatoList?: string[] | null; indexDate?: string | null; RefLotsStatus?: { nameRu?: string | null } | null;
  Files?: Array<{ id?: number; filePath?: string | null; originalName?: string | null; objectId?: number | null; nameRu?: string | null; indexDate?: string | null }> | null;
};

const regionNames: Record<string, string> = {
  "10": "Абайская область", "11": "Акмолинская область", "15": "Актюбинская область",
  "19": "Алматинская область", "23": "Атырауская область", "27": "Западно-Казахстанская область",
  "31": "Жамбылская область", "33": "Жетысуская область", "35": "Карагандинская область",
  "39": "Костанайская область", "43": "Кызылординская область", "47": "Мангистауская область",
  "55": "Павлодарская область", "59": "Северо-Казахстанская область", "61": "Туркестанская область",
  "62": "Улытауская область", "63": "Восточно-Казахстанская область", "71": "Астана",
  "75": "Алматы", "79": "Шымкент",
};

function runtimeToken(): string {
  return (globalThis.__QAZTENDER_ENV?.GOSZAKUP_API_TOKEN ?? process.env.GOSZAKUP_API_TOKEN ?? "").trim();
}

export function isGoszakupConfigured(): boolean {
  return runtimeToken().length > 0;
}

function parseOfficialDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const timestamp = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}+05:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function regionFromKato(kato: string[]): { code: string; name: string } {
  const code = kato.find((item) => /^\d{2}/.test(item))?.slice(0, 2) ?? "";
  return { code, name: regionNames[code] ?? "Регион не указан" };
}

export function normalizeAnnouncement(item: ApiAnnouncement, now = Date.now()): TenderRecord | null {
  if (!Number.isSafeInteger(item.id) || !item.id) return null;
  const kato = Array.isArray(item.kato) ? item.kato.filter((value): value is string => typeof value === "string") : [];
  const region = regionFromKato(kato);
  const externalId = String(item.id);
  return {
    externalId,
    numberAnno: item.numberAnno?.trim() || externalId,
    title: item.nameRu?.trim() || "Закупка без наименования",
    buyer: item.customerNameRu?.trim() || "Заказчик не указан",
    customerBin: item.customerBin?.trim() || "",
    regionCode: region.code,
    regionName: region.name,
    subjectTypeId: Number(item.refSubjectTypeId ?? 0),
    subjectType: item.RefSubjectType?.nameRu?.trim() || "Не указан",
    methodId: Number(item.refTradeMethodsId ?? 0),
    methodName: item.RefTradeMethods?.nameRu?.trim() || "Не указан",
    budget: Math.max(0, Math.round(Number(item.totalSum ?? 0))),
    startDate: parseOfficialDate(item.startDate),
    endDate: parseOfficialDate(item.endDate),
    publishDate: parseOfficialDate(item.publishDate),
    isConstructionWork: Number(item.isConstructionWork ?? 0) === 1,
    statusId: Number(item.refBuyStatusId ?? 0),
    statusName: item.RefBuyStatus?.nameRu?.trim() || "Не указан",
    kato: JSON.stringify(kato),
    systemId: Number(item.systemId ?? 3),
    sourceUrl: `https://www.goszakup.gov.kz/ru/announce/index/${externalId}`,
    upstreamUpdatedAt: item.lastUpdateDate?.trim() || item.indexDate?.trim() || "",
    fetchedAt: now,
    updatedAt: now,
  };
}

async function fetchPage(token: string, after: number | null): Promise<ApiAnnouncement[]> {
  const response = await fetch(GOSZAKUP_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: ANNOUNCEMENTS_QUERY,
      variables: { filter: { finYear: new Date().getUTCFullYear() }, limit: PAGE_SIZE, after },
    }),
  });
  if (!response.ok) throw new Error(`Госзакупы вернули HTTP ${response.status}`);
  const payload = await response.json() as GraphqlResponse;
  if (payload.errors?.length) throw new Error("Госзакупы отклонили GraphQL-запрос");
  if (!Array.isArray(payload.data?.TrdBuy)) throw new Error("Госзакупы вернули неожиданный формат данных");
  return payload.data.TrdBuy;
}

export async function synchronizeGoszakupTenders(): Promise<{ fetched: number; saved: number }> {
  const token = runtimeToken();
  if (!token) throw new Error("API-токен ещё не настроен");
  const runId = await startTenderSyncRun();
  let fetched = 0;
  try {
    const normalized = new Map<string, TenderRecord>();
    let after: number | null = null;
    for (let page = 0; page < MAX_PAGES_PER_SYNC; page += 1) {
      const items = await fetchPage(token, after);
      fetched += items.length;
      const now = Date.now();
      for (const item of items) {
        const record = normalizeAnnouncement(item, now);
        if (record) normalized.set(record.externalId, record);
      }
      if (items.length < PAGE_SIZE) break;
      const lastId = items.at(-1)?.id;
      if (!Number.isSafeInteger(lastId) || lastId === after) break;
      after = lastId ?? null;
    }
    const saved = await upsertTenders([...normalized.values()]);
    await finishTenderSyncRun(runId, "succeeded", fetched, saved);
    return { fetched, saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка синхронизации";
    await finishTenderSyncRun(runId, "failed", fetched, 0, message);
    throw new Error(message);
  }
}

export async function synchronizeGoszakupTenderDetails(tenderId: string): Promise<{ lots: number; documents: number }> {
  const token = runtimeToken();
  if (!token) throw new Error("API-токен ещё не настроен");
  const numericId = Number(tenderId);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) throw new Error("Некорректный идентификатор тендера");
  const response = await fetch(GOSZAKUP_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: TENDER_DETAILS_QUERY, variables: { filter: { trdBuyId: [numericId] }, limit: 200 } }),
  });
  if (!response.ok) throw new Error(`Госзакупы вернули HTTP ${response.status}`);
  const payload = await response.json() as { data?: { Lots?: ApiLot[] | null }; errors?: Array<{ message?: string }> };
  if (payload.errors?.length) throw new Error("Госзакупы отклонили запрос деталей");
  if (!Array.isArray(payload.data?.Lots)) throw new Error("Госзакупы вернули неожиданный формат деталей");
  const lots: TenderLot[] = [];
  const documents: TenderDocument[] = [];
  for (const item of payload.data.Lots) {
    if (!Number.isSafeInteger(item.id) || !item.id) continue;
    const lotId = String(item.id);
    lots.push({
      externalId: lotId, tenderId, lotNumber: item.lotNumber?.trim() || lotId, title: item.nameRu?.trim() || "Лот без наименования",
      description: item.descriptionRu?.trim() || "", statusName: item.RefLotsStatus?.nameRu?.trim() || "Не указан",
      amount: Math.max(0, Number(item.amount ?? 0)), quantity: Math.max(0, Number(item.count ?? 0)),
      enstruIds: Array.isArray(item.enstruList) ? item.enstruList.filter(Number.isSafeInteger) : [],
      deliveryKato: Array.isArray(item.plnPointKatoList) ? item.plnPointKatoList.filter((value): value is string => typeof value === "string") : [],
      upstreamUpdatedAt: item.lastUpdateDate?.trim() || item.indexDate?.trim() || "",
    });
    for (const file of item.Files ?? []) {
      if (!Number.isSafeInteger(file.id) || !file.id) continue;
      const rawPath = file.filePath?.trim() || "";
      let url = rawPath;
      try { if (rawPath) url = new URL(rawPath, "https://ows.goszakup.gov.kz").toString(); } catch { url = ""; }
      documents.push({ externalId: String(file.id), tenderId, lotId, name: file.nameRu?.trim() || file.originalName?.trim() || "Документ лота", originalName: file.originalName?.trim() || "", url, upstreamUpdatedAt: file.indexDate?.trim() || "" });
    }
  }
  await replaceTenderDetails(tenderId, lots, documents);
  return { lots: lots.length, documents: documents.length };
}
