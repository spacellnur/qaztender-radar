"use client";

import { useEffect, useMemo, useState } from "react";
import type { AlertFrequency, ChecklistTemplateType, CompanyProfile, SavedSearch, TenderDetails, TenderNote, TenderRecord, TenderSearchFilters, TenderSourceStatus, TenderStage, TenderTask, TenderTaskWorkspace, TenderWorkflowEntry } from "./tender-types";
import { explainTenderMatch } from "./tender-matching";
import { CHECKLIST_TEMPLATES, detectChecklistTemplate } from "./tender-templates";

type Props = {
  username: string;
  role: "super_admin" | "tender_specialist" | "guest";
  tenders: TenderRecord[];
  sourceStatus: TenderSourceStatus;
  initialWorkflow: TenderWorkflowEntry[];
  initialSavedSearches: SavedSearch[];
  companyProfile: CompanyProfile | null;
};

type WorkspaceView = "all" | "favorites" | Exclude<TenderStage, "none" | "skipped">;
type DetailTab = "overview" | "lots" | "documents" | "history" | "tasks" | "notes";
type FeedMode = "list" | "deadlines";

const emptyDetails: TenderDetails = { lots: [], documents: [], changes: [] };
const emptyTaskWorkspace: TenderTaskWorkspace = { tasks: [], members: [] };

const stageLabels: Record<TenderStage, string> = {
  none: "Не выбрано",
  reviewing: "Изучаем",
  participating: "Участвуем",
  submitted: "Заявка подана",
  won: "Выиграли",
  lost: "Проиграли",
  skipped: "Скрыто",
};

const workspaceViews: Array<{ value: WorkspaceView; label: string }> = [
  { value: "all", label: "Все тендеры" },
  { value: "favorites", label: "Избранные" },
  { value: "reviewing", label: "Изучаем" },
  { value: "participating", label: "Участвуем" },
  { value: "submitted", label: "Заявка подана" },
  { value: "won", label: "Выиграли" },
  { value: "lost", label: "Проиграли" },
  { value: "skipped", label: "Скрытые" },
];

const alertLabels: Record<AlertFrequency, string> = {
  off: "Без уведомлений",
  instant: "Сразу о новых",
  daily: "Ежедневная сводка",
};

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Almaty",
});

const regions = [
  ["10", "Абайская область"], ["11", "Акмолинская область"], ["15", "Актюбинская область"],
  ["19", "Алматинская область"], ["23", "Атырауская область"], ["27", "Западно-Казахстанская область"],
  ["31", "Жамбылская область"], ["33", "Жетысуская область"], ["35", "Карагандинская область"],
  ["39", "Костанайская область"], ["43", "Кызылординская область"], ["47", "Мангистауская область"],
  ["55", "Павлодарская область"], ["59", "Северо-Казахстанская область"], ["61", "Туркестанская область"],
  ["62", "Улытауская область"], ["63", "Восточно-Казахстанская область"], ["71", "Астана"],
  ["75", "Алматы"], ["79", "Шымкент"],
] as const;

export const localities = [
  { value: "all", label: "Все населённые пункты / сёла", keywords: [] as string[] },
  { value: "turkestan_cluster", label: "🎯 Туркестан и окрестности (Туркестан, Кентау, Шаулдер, Карнак, Икан)", keywords: ["туркестан", "түркістан", "кентау", "кент", "карнак", "қарнақ", "икан", "иқан", "шаульдер", "шауілдір", "отырар", "сауран", "шорнак"] },
  { value: "turkestan_city", label: "г. Туркестан (только город)", keywords: ["туркестан", "түркістан"] },
  { value: "kentau", label: "г. Кентау и посёлки", keywords: ["кентау", "кент", "ащысай", "байылдыр"] },
  { value: "otyrar", label: "Отырарский р-н / с. Шаулдер", keywords: ["отырар", "шаульдер", "шауілдір", "темир"] },
  { value: "sauran", label: "Сауранский р-н / с. Шорнак, с. Икан", keywords: ["сауран", "шорнак", "икан", "иқан", "карнак", "қарнақ"] },
  { value: "saryagash", label: "Сарыагашский р-н / г. Сарыагаш", keywords: ["сарыагаш", "сарыағаш"] },
  { value: "shymkent", label: "г. Шымкент", keywords: ["шымкент", "шимкент"] },
  { value: "almaty", label: "г. Алматы", keywords: ["алматы"] },
  { value: "astana", label: "г. Астана", keywords: ["астана", "нур-султан"] },
  { value: "taraz", label: "г. Тараз", keywords: ["тараз", "жамбыл"] },
  { value: "kyzylorda", label: "г. Кызылорда", keywords: ["кызылорда", "қызылорда"] },
  { value: "aktau", label: "г. Актау", keywords: ["актау", "ақтау"] },
  { value: "atyrau", label: "г. Атырау", keywords: ["атырау"] },
  { value: "aktobe", label: "г. Актобе", keywords: ["актобе", "ақтөбе"] },
  { value: "karaganda", label: "г. Караганда", keywords: ["караганда", "қарағанды"] },
  { value: "kaskelen", label: "г. Каскелен / Карасайский р-н", keywords: ["каскелен", "қаскелең", "карасай", "шамалган"] },
  { value: "talgar", label: "г. Талгар / Талгарский р-н", keywords: ["талгар", "талғар", "бесагаш"] },
  { value: "konaev", label: "г. Конаев", keywords: ["конаев", "қонаев", "капшагай"] },
  { value: "semey", label: "г. Семей", keywords: ["семей", "семипалатинск"] },
  { value: "ust_kamenogorsk", label: "г. Усть-Каменогорск", keywords: ["усть-каменогорск", "өскемен"] },
  { value: "pavlodar", label: "г. Павлодар", keywords: ["павлодар"] },
  { value: "kostanay", label: "г. Костанай", keywords: ["костанай", "қостанай"] },
  { value: "petropavlovsk", label: "г. Петропавловск", keywords: ["петропавловск", "петропавл"] },
  { value: "kokshetau", label: "г. Кокшетау", keywords: ["кокшетау", "көкшетау"] },
  { value: "uralsk", label: "г. Уральск", keywords: ["уральск", "орал"] },
];

function remainingDays(endDate: number | null, now: number): number | null {
  if (!endDate) return null;
  return Math.ceil((endDate - now) / 86_400_000);
}

function optionalAmount(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function startOfKazakhstanDate(value: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(`${value}T00:00:00+05:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function endOfKazakhstanDate(value: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(`${value}T23:59:59.999+05:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function yearInKazakhstan(timestamp: number | null): number | null {
  if (!timestamp) return null;
  return new Date(timestamp + 5 * 60 * 60 * 1000).getUTCFullYear();
}

function taskDateValue(timestamp: number | null): string {
  if (!timestamp) return "";
  return new Date(timestamp + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function sourceCopy(status: TenderSourceStatus) {
  if (status.state === "waiting_token") return {
    label: "Ожидается API-токен",
    title: "Подключение подготовлено",
    body: "Мы ждём первичный токен от оператора. После его добавления главный администратор запустит первую загрузку без изменения сайта.",
  };
  if (status.state === "ready_to_sync") return {
    label: "Готово к загрузке",
    title: "Токен подключён",
    body: "Источник настроен. Запустите первую синхронизацию, чтобы получить официальные объявления.",
  };
  if (status.state === "error") return {
    label: "Источник требует внимания",
    title: "Последняя загрузка не завершилась",
    body: status.lastError || "Сохранённые данные не удалены. Повторите синхронизацию позже.",
  };
  return {
    label: "Официальные данные",
    title: "Госзакупы подключены",
    body: `В базе ${status.recordCount} объявлений. Фильтры работают по сохранённым данным и не передают токен в браузер.`,
  };
}

export default function TenderDashboard({ username, role, tenders, sourceStatus, initialWorkflow, initialSavedSearches, companyProfile }: Props) {
  const [referenceTime] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [locality, setLocality] = useState("all");
  const [subject, setSubject] = useState("all");
  const [budget, setBudget] = useState("all");
  const [deadline, setDeadline] = useState("all");
  const [constructionOnly, setConstructionOnly] = useState(false);
  const [excludeStopWords, setExcludeStopWords] = useState(true);
  const [onlyFitsProfile, setOnlyFitsProfile] = useState(false);
  const [announcementNumber, setAnnouncementNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");
  const [endingFrom, setEndingFrom] = useState("");
  const [endingTo, setEndingTo] = useState("");
  const [financialYear, setFinancialYear] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [activeId, setActiveId] = useState(tenders[0]?.externalId ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("all");
  const [workflow, setWorkflow] = useState<Record<string, TenderWorkflowEntry>>(() => Object.fromEntries(initialWorkflow.map((entry) => [entry.tenderId, entry])));
  const [savingTenderId, setSavingTenderId] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [newAlertFrequency, setNewAlertFrequency] = useState<AlertFrequency>("off");
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedSearchMessage, setSavedSearchMessage] = useState("");
  const [feedMode, setFeedMode] = useState<FeedMode>("list");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [tenderDetails, setTenderDetails] = useState<TenderDetails>(emptyDetails);
  const [detailsLoading, setDetailsLoading] = useState(tenders.length > 0);
  const [detailsMessage, setDetailsMessage] = useState("");
  const [detailsRefresh, setDetailsRefresh] = useState(0);
  const [syncingDetails, setSyncingDetails] = useState(false);
  const [taskWorkspace, setTaskWorkspace] = useState<TenderTaskWorkspace>(emptyTaskWorkspace);
  const [taskMessage, setTaskMessage] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [updatingTask, setUpdatingTask] = useState(false);
  const [manualTemplate, setManualTemplate] = useState<ChecklistTemplateType | null>(null);
  const [notes, setNotes] = useState<TenderNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [telegramSub, setTelegramSub] = useState<{ status: string; username: string; firstName: string } | null>(null);
  const [telegramActionMsg, setTelegramActionMsg] = useState("");
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [showRecommendBox, setShowRecommendBox] = useState(false);
  const [recommendUserId, setRecommendUserId] = useState("");
  const [recommendNote, setRecommendNote] = useState("");
  const [recommendSending, setRecommendSending] = useState(false);
  const [recommendResult, setRecommendResult] = useState("");

  useEffect(() => {
    fetch("/api/telegram/status")
      .then((res) => res.json())
      .then((data: { subscriber?: { status: string; username: string; firstName: string } }) => {
        if (data.subscriber) {
          setTelegramSub(data.subscriber);
        }
      })
      .catch(() => {});
  }, []);

  async function connectTelegram() {
    setTelegramConnecting(true);
    setTelegramActionMsg("");
    try {
      const res = await fetch("/api/telegram/status", { method: "POST" });
      const data = await res.json() as { connectUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось создать ссылку для подключения");
      if (data.connectUrl) {
        window.open(data.connectUrl, "_blank");
        setTelegramActionMsg("Открываем Telegram... Нажмите кнопку Start в боте.");
      }
    } catch (e) {
      setTelegramActionMsg(e instanceof Error ? e.message : "Ошибка подключения");
    } finally {
      setTelegramConnecting(false);
    }
  }

  async function sendTestTelegram() {
    setTelegramActionMsg("Отправляем тестовое уведомление...");
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      setTelegramActionMsg("Тестовое уведомление успешно отправлено в ваш Telegram!");
    } catch (e) {
      setTelegramActionMsg(e instanceof Error ? e.message : "Не удалось отправить");
    }
  }

  async function submitRecommendation() {
    if (!recommendUserId || !activeId) return;
    setRecommendSending(true);
    setRecommendResult("");
    try {
      const res = await fetch("/api/telegram/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: recommendUserId,
          tenderId: activeId,
          note: recommendNote,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось отправить рекомендацию");
      setRecommendResult("Тендер успешно отправлен сотруднику в Telegram!");
      setRecommendNote("");
    } catch (e) {
      setRecommendResult(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setRecommendSending(false);
    }
  }

  const subjectOptions = useMemo(
    () => Array.from(new Set(tenders.map((tender) => tender.subjectType).filter((value) => value && value !== "Не указан"))).sort(),
    [tenders],
  );

  const methodOptions = useMemo(
    () => Array.from(new Set(tenders.map((tender) => tender.methodName).filter((value) => value && value !== "Не указан"))).sort(),
    [tenders],
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(tenders.map((tender) => tender.statusName).filter((value) => value && value !== "Не указан"))).sort(),
    [tenders],
  );

  const financialYearOptions = useMemo(
    () => Array.from(new Set(tenders.map((tender) => yearInKazakhstan(tender.publishDate ?? tender.endDate)).filter((value): value is number => value !== null))).sort((left, right) => right - left),
    [tenders],
  );

  const advancedFilterCount = [
    announcementNumber.trim(), customer.trim(), method !== "all", status !== "all",
    amountFrom.trim(), amountTo.trim(), publishedFrom, publishedTo, endingFrom, endingTo,
    financialYear !== "all",
  ].filter(Boolean).length;

  const hasAnyFilter = Boolean(
    query.trim() || region !== "all" || locality !== "all" || subject !== "all" || budget !== "all" || deadline !== "all" || constructionOnly || onlyFitsProfile || !excludeStopWords || advancedFilterCount,
  );

  const visibleTenders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    const normalizedAnnouncement = announcementNumber.trim().toLocaleLowerCase("ru");
    const normalizedCustomer = customer.trim().toLocaleLowerCase("ru");
    const minimumAmount = optionalAmount(amountFrom);
    const maximumAmount = optionalAmount(amountTo);
    const publicationStart = startOfKazakhstanDate(publishedFrom);
    const publicationEnd = endOfKazakhstanDate(publishedTo);
    const endingStart = startOfKazakhstanDate(endingFrom);
    const endingEnd = endOfKazakhstanDate(endingTo);
    return tenders
      .filter((tender) => {
        const stage = workflow[tender.externalId]?.stage ?? "none";
        if (workspaceView === "all") return stage !== "skipped";
        if (workspaceView === "favorites") return Boolean(workflow[tender.externalId]?.isFavorite);
        return stage === workspaceView;
      })
      .filter((tender) => {
        if (!companyProfile) return true;
        if (excludeStopWords && companyProfile.negativeKeywords && companyProfile.negativeKeywords.length > 0) {
          const match = explainTenderMatch(tender, companyProfile);
          if (match.matchedNegativeKeywords.length > 0) return false;
        }
        if (onlyFitsProfile) {
          const match = explainTenderMatch(tender, companyProfile);
          if (match.status !== "fits") return false;
        }
        return true;
      })
      .filter((tender) => !normalized || `${tender.title} ${tender.buyer} ${tender.customerBin} ${tender.numberAnno}`.toLocaleLowerCase("ru").includes(normalized))
      .filter((tender) => region === "all" || tender.regionCode === region)
      .filter((tender) => {
        if (locality === "all") return true;
        const loc = localities.find((l) => l.value === locality);
        if (!loc || !loc.keywords || loc.keywords.length === 0) return true;
        const text = `${tender.title} ${tender.buyer} ${tender.regionName} ${tender.kato}`.toLowerCase();
        return loc.keywords.some((k) => text.includes(k));
      })
      .filter((tender) => subject === "all" || tender.subjectType === subject)
      .filter((tender) => budget === "all" || tender.budget <= Number(budget))
      .filter((tender) => !constructionOnly || tender.isConstructionWork)
      .filter((tender) => deadline === "all" || Boolean(tender.endDate && tender.endDate >= referenceTime && tender.endDate <= referenceTime + Number(deadline) * 86_400_000))
      .filter((tender) => !normalizedAnnouncement || tender.numberAnno.toLocaleLowerCase("ru").includes(normalizedAnnouncement))
      .filter((tender) => !normalizedCustomer || `${tender.buyer} ${tender.customerBin}`.toLocaleLowerCase("ru").includes(normalizedCustomer))
      .filter((tender) => method === "all" || tender.methodName === method)
      .filter((tender) => status === "all" || tender.statusName === status)
      .filter((tender) => minimumAmount === null || tender.budget >= minimumAmount)
      .filter((tender) => maximumAmount === null || tender.budget <= maximumAmount)
      .filter((tender) => publicationStart === null || Boolean(tender.publishDate && tender.publishDate >= publicationStart))
      .filter((tender) => publicationEnd === null || Boolean(tender.publishDate && tender.publishDate <= publicationEnd))
      .filter((tender) => endingStart === null || Boolean(tender.endDate && tender.endDate >= endingStart))
      .filter((tender) => endingEnd === null || Boolean(tender.endDate && tender.endDate <= endingEnd))
      .filter((tender) => financialYear === "all" || yearInKazakhstan(tender.publishDate ?? tender.endDate) === Number(financialYear))
      .sort((left, right) => {
        if (sort === "budget") return right.budget - left.budget;
        if (sort === "published") return (right.publishDate ?? 0) - (left.publishDate ?? 0);
        return (left.endDate ?? Number.MAX_SAFE_INTEGER) - (right.endDate ?? Number.MAX_SAFE_INTEGER);
      });
  }, [tenders, query, region, locality, subject, budget, deadline, constructionOnly, excludeStopWords, onlyFitsProfile, companyProfile, announcementNumber, customer, method, status, amountFrom, amountTo, publishedFrom, publishedTo, endingFrom, endingTo, financialYear, sort, referenceTime, workspaceView, workflow]);

  const activeTender = visibleTenders.find((tender) => tender.externalId === activeId) ?? visibleTenders[0] ?? null;
  const activeMatch = activeTender && companyProfile ? explainTenderMatch(activeTender, companyProfile) : null;
  const selectedTemplate = manualTemplate ?? (activeTender ? detectChecklistTemplate(activeTender.methodName) : "standard");
  const totalBudget = visibleTenders.reduce((sum, tender) => sum + tender.budget, 0);
  const copy = sourceCopy(sourceStatus);

  const deadlineGroups = useMemo(() => {
    const today: TenderRecord[] = [];
    const urgent3d: TenderRecord[] = [];
    const thisWeek: TenderRecord[] = [];
    const later: TenderRecord[] = [];
    const expired: TenderRecord[] = [];

    for (const tender of visibleTenders) {
      const days = remainingDays(tender.endDate, referenceTime);
      if (days === null || days < 0) {
        expired.push(tender);
      } else if (days <= 1) {
        today.push(tender);
      } else if (days <= 3) {
        urgent3d.push(tender);
      } else if (days <= 7) {
        thisWeek.push(tender);
      } else {
        later.push(tender);
      }
    }

    return [
      { id: "today", title: "Горят: сегодня и завтра", count: today.length, items: today, badge: "urgency-critical", icon: "🔥" },
      { id: "3days", title: "Срочные (до 3 дней)", count: urgent3d.length, items: urgent3d, badge: "urgency-high", icon: "⚡" },
      { id: "week", title: "На этой неделе (до 7 дней)", count: thisWeek.length, items: thisWeek, badge: "urgency-medium", icon: "📅" },
      { id: "later", title: "Более 7 дней в запасе", count: later.length, items: later, badge: "urgency-low", icon: "⏳" },
      { id: "expired", title: "Срок истёк или не указан", count: expired.length, items: expired, badge: "urgency-none", icon: "⚪" },
    ].filter((group) => group.count > 0);
  }, [visibleTenders, referenceTime]);

  useEffect(() => {
    if (!activeTender) return;
    const controller = new AbortController();
    fetch(`/api/tender-details?tenderId=${encodeURIComponent(activeTender.externalId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { details?: TenderDetails; error?: string };
        if (!response.ok || !result.details) throw new Error(result.error || "Не удалось загрузить детали");
        setTenderDetails(result.details);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setDetailsMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [activeTender, detailsRefresh]);

  useEffect(() => {
    if (!activeTender) return;
    const controller = new AbortController();
    fetch(`/api/tender-tasks?tenderId=${encodeURIComponent(activeTender.externalId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { workspace?: TenderTaskWorkspace; error?: string };
        if (!response.ok || !result.workspace) throw new Error(result.error || "Не удалось загрузить рабочий план");
        setTaskWorkspace(result.workspace);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setTaskMessage(error.message); });
    return () => controller.abort();
  }, [activeTender]);

  useEffect(() => {
    if (!activeTender) return;
    const controller = new AbortController();
    fetch(`/api/tender-notes?tenderId=${encodeURIComponent(activeTender.externalId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { notes?: TenderNote[]; error?: string };
        if (!response.ok || !result.notes) throw new Error(result.error || "Не удалось загрузить заметки");
        setNotes(result.notes);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setNoteMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setNotesLoading(false); });
    return () => controller.abort();
  }, [activeTender]);

  function selectTender(tenderId: string) {
    setActiveId(tenderId); setManualTemplate(null); setDetailTab("overview"); setTenderDetails(emptyDetails); setDetailsLoading(true); setDetailsMessage(""); setTaskWorkspace(emptyTaskWorkspace); setTaskMessage(""); setNotes([]); setNoteMessage("");
  }

  async function taskRequest(method: "POST" | "PUT" | "DELETE", body?: Record<string, unknown>, id?: string) {
    if (!activeTender) return false;
    setUpdatingTask(true); setTaskMessage("");
    try {
      const url = id ? `/api/tender-tasks?id=${encodeURIComponent(id)}` : "/api/tender-tasks";
      const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json() as { workspace?: TenderTaskWorkspace; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось обновить рабочий план");
      if (result.workspace) setTaskWorkspace(result.workspace);
      else if (method === "DELETE") setTaskWorkspace((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
      return true;
    } catch (error) { setTaskMessage(error instanceof Error ? error.message : "Не удалось обновить рабочий план"); return false; }
    finally { setUpdatingTask(false); }
  }

  async function createTask() {
    if (!activeTender || !newTaskTitle.trim()) { setTaskMessage("Введите название задачи"); return; }
    if (await taskRequest("POST", { tenderId: activeTender.externalId, action: "create", title: newTaskTitle })) setNewTaskTitle("");
  }

  function updateTask(task: TenderTask, change: Partial<Pick<TenderTask, "status" | "assignedUserId" | "dueAt">>) {
    return taskRequest("PUT", { id: task.id, status: change.status ?? task.status, assignedUserId: change.assignedUserId ?? task.assignedUserId, dueAt: change.dueAt === undefined ? task.dueAt : change.dueAt });
  }

  async function createNote() {
    if (!activeTender || !newNoteContent.trim()) { setNoteMessage("Введите текст заметки"); return; }
    setSavingNote(true); setNoteMessage("");
    try {
      const response = await fetch("/api/tender-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenderId: activeTender.externalId, content: newNoteContent.trim() }),
      });
      const result = await response.json() as { note?: TenderNote; notes?: TenderNote[]; error?: string };
      if (!response.ok || !result.notes) throw new Error(result.error || "Не удалось сохранить заметку");
      setNotes(result.notes);
      setNewNoteContent("");
      setNoteMessage("Заметка сохранена");
    } catch (error) { setNoteMessage(error instanceof Error ? error.message : "Не удалось сохранить заметку"); }
    finally { setSavingNote(false); }
  }

  async function removeNote(id: string) {
    if (!activeTender) return;
    setSavingNote(true); setNoteMessage("");
    try {
      const response = await fetch(`/api/tender-notes?id=${encodeURIComponent(id)}&tenderId=${encodeURIComponent(activeTender.externalId)}`, { method: "DELETE" });
      const result = await response.json() as { notes?: TenderNote[]; error?: string };
      if (!response.ok || !result.notes) throw new Error(result.error || "Не удалось удалить заметку");
      setNotes(result.notes);
      setNoteMessage("Заметка удалена");
    } catch (error) { setNoteMessage(error instanceof Error ? error.message : "Не удалось удалить заметку"); }
    finally { setSavingNote(false); }
  }

  async function synchronizeDetails() {
    if (!activeTender) return;
    setSyncingDetails(true); setDetailsMessage("");
    try {
      const response = await fetch(`/api/tender-details?tenderId=${encodeURIComponent(activeTender.externalId)}`, { method: "POST" });
      const result = await response.json() as { lots?: number; documents?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить детали");
      setDetailsMessage(`Загружено: ${result.lots ?? 0} лотов, ${result.documents ?? 0} документов`);
      setDetailsRefresh((value) => value + 1);
    } catch (error) { setDetailsMessage(error instanceof Error ? error.message : "Не удалось загрузить детали"); }
    finally { setSyncingDetails(false); }
  }

  function currentFilters(): TenderSearchFilters {
    return { query, region, locality, subject, budget, deadline, constructionOnly, announcementNumber, customer, method, status, amountFrom, amountTo, publishedFrom, publishedTo, endingFrom, endingTo, financialYear, sort };
  }

  function applySavedSearch(search: SavedSearch) {
    const filters = search.filters;
    setQuery(filters.query); setRegion(filters.region); setLocality(filters.locality || "all"); setSubject(filters.subject); setBudget(filters.budget); setDeadline(filters.deadline);
    setConstructionOnly(filters.constructionOnly); setAnnouncementNumber(filters.announcementNumber); setCustomer(filters.customer);
    setMethod(filters.method); setStatus(filters.status); setAmountFrom(filters.amountFrom); setAmountTo(filters.amountTo);
    setPublishedFrom(filters.publishedFrom); setPublishedTo(filters.publishedTo); setEndingFrom(filters.endingFrom); setEndingTo(filters.endingTo);
    setFinancialYear(filters.financialYear); setSort(filters.sort); setWorkspaceView("all"); setSavedSearchMessage(`Поиск «${search.name}» применён`);
  }

  async function persistSavedSearch(search: Pick<SavedSearch, "id" | "name" | "filters" | "alertFrequency">) {
    setSavingSearch(true); setSavedSearchMessage("");
    try {
      const response = await fetch("/api/saved-searches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(search) });
      const result = await response.json() as { search?: SavedSearch; error?: string };
      if (!response.ok || !result.search) throw new Error(result.error || "Не удалось сохранить поиск");
      setSavedSearches((current) => [result.search!, ...current.filter((item) => item.id !== result.search!.id)]);
      setSavedSearchMessage(`Поиск «${result.search.name}» сохранён`);
      return true;
    } catch (error) {
      setSavedSearchMessage(error instanceof Error ? error.message : "Не удалось сохранить поиск");
      return false;
    } finally { setSavingSearch(false); }
  }

  async function createSavedSearch() {
    const name = savedSearchName.trim();
    if (!name) { setSavedSearchMessage("Введите название поиска"); return; }
    const saved = await persistSavedSearch({ id: "", name, filters: currentFilters(), alertFrequency: newAlertFrequency });
    if (saved) { setSavedSearchName(""); setNewAlertFrequency("off"); }
  }

  async function removeSavedSearch(id: string) {
    setSavingSearch(true); setSavedSearchMessage("");
    try {
      const response = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось удалить поиск");
      setSavedSearches((current) => current.filter((item) => item.id !== id));
      setSavedSearchMessage("Сохранённый поиск удалён");
    } catch (error) { setSavedSearchMessage(error instanceof Error ? error.message : "Не удалось удалить поиск"); }
    finally { setSavingSearch(false); }
  }

  function workspaceCount(view: WorkspaceView) {
    if (view === "all") return tenders.length;
    if (view === "favorites") return tenders.filter((tender) => workflow[tender.externalId]?.isFavorite).length;
    return tenders.filter((tender) => workflow[tender.externalId]?.stage === view).length;
  }

  async function updateWorkflow(tenderId: string, change: Partial<Pick<TenderWorkflowEntry, "isFavorite" | "stage">>) {
    const previous = workflow[tenderId] ?? { tenderId, isFavorite: false, stage: "none" as TenderStage, updatedAt: 0 };
    const next = { ...previous, ...change };
    setWorkflow((current) => ({ ...current, [tenderId]: next }));
    setSavingTenderId(tenderId);
    setWorkflowError("");
    try {
      const response = await fetch("/api/tender-workflow", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenderId, isFavorite: next.isFavorite, stage: next.stage }),
      });
      const result = await response.json() as { entry?: TenderWorkflowEntry | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить тендер");
      setWorkflow((current) => {
        const updated = { ...current };
        if (result.entry) updated[tenderId] = result.entry;
        else delete updated[tenderId];
        return updated;
      });
    } catch (error) {
      setWorkflow((current) => {
        const updated = { ...current };
        if (previous.updatedAt) updated[tenderId] = previous;
        else delete updated[tenderId];
        return updated;
      });
      setWorkflowError(error instanceof Error ? error.message : "Не удалось сохранить тендер");
    } finally {
      setSavingTenderId("");
    }
  }

  function workspaceCount(view: WorkspaceView) {
    if (view === "all") return tenders.filter((tender) => (workflow[tender.externalId]?.stage ?? "none") !== "skipped").length;
    if (view === "favorites") return tenders.filter((tender) => workflow[tender.externalId]?.isFavorite).length;
    return tenders.filter((tender) => (workflow[tender.externalId]?.stage ?? "none") === view).length;
  }

  function resetFilters() {
    setQuery("");
    setRegion("all");
    setLocality("all");
    setSubject("all");
    setBudget("all");
    setDeadline("all");
    setConstructionOnly(false);
    setExcludeStopWords(true);
    setOnlyFitsProfile(false);
    setAnnouncementNumber("");
    setCustomer("");
    setMethod("all");
    setStatus("all");
    setAmountFrom("");
    setAmountTo("");
    setPublishedFrom("");
    setPublishedTo("");
    setEndingFrom("");
    setEndingTo("");
    setFinancialYear("all");
  }

  async function synchronize() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const response = await fetch("/api/tenders/sync", { method: "POST" });
      const result = await response.json() as { error?: string; fetched?: number; saved?: number };
      if (!response.ok) throw new Error(result.error || "Не удалось обновить тендеры");
      setSyncMessage(`Получено: ${result.fetched ?? 0}. Сохранено: ${result.saved ?? 0}.`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Не удалось обновить тендеры");
      setSyncing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="QazTender Radar — на главную">
          <span className="brand-mark radar-logo-mark" aria-hidden="true"><span className="radar-sweep" /></span>
          <span><strong>QazTender</strong><small>RADAR</small></span>
        </a>
        <div className="topbar-actions">
          <span className={`demo-pill source-pill ${sourceStatus.state}`}><span aria-hidden="true" />{copy.label}</span>
          <div className="account-block">
            {role === "super_admin" && <a className="team-link" href="/admin/users">Команда</a>}
            {role === "tender_specialist" && <a className="team-link" href="/profile/company">Профиль компании</a>}
            <div className="profile-button" title={username}>
              <span>{role === "super_admin" ? "ГА" : "Т"}</span>
              <span className="profile-copy"><strong>{role === "super_admin" ? "Главный администратор" : "Тендерщик"}</strong><small>{username}</small></span>
            </div>
            <button className="logout-button" type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }}>Выйти</button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">РАДАР ГОСУДАРСТВЕННЫХ ЗАКУПОК · КАЗАХСТАН</p>
          <h1>Реальные тендеры.<br /><em>Без ручного поиска.</em></h1>
          <p className="hero-copy">Официальные объявления сохраняются на сервере, а вы отбираете их по региону, виду закупки, бюджету и сроку подачи.</p>
        </div>
        <div className="hero-metric" aria-label="Состояние базы тендеров">
          <span className="metric-kicker">Объявлений в базе</span>
          <strong>{sourceStatus.recordCount}<span> записей</span></strong>
          <p>{sourceStatus.lastSyncAt ? `Обновлено ${dateTime.format(sourceStatus.lastSyncAt)}` : "Первая загрузка ещё не запускалась"}</p>
          <div className="metric-line"><span style={{ width: sourceStatus.recordCount ? "100%" : "8%" }} /></div>
        </div>
      </section>

      <section className={`notice source-notice ${sourceStatus.state}`} aria-label="Статус источника данных">
        <span className="notice-icon">i</span>
        <p><strong>{copy.title}.</strong> {copy.body}{syncMessage && <><br /><span className="sync-message">{syncMessage}</span></>}</p>
        {role === "super_admin" && (
          <button className="sync-button" type="button" disabled={!sourceStatus.configured || syncing} onClick={synchronize}>
            {syncing ? "Загружаем…" : sourceStatus.configured ? "Синхронизировать" : "Ожидается токен"}
          </button>
        )}
      </section>

      <section className="workspace live-workspace">
        <div className="feed-panel">
          <nav className="workspace-tabs" aria-label="Работа с тендерами">
            {workspaceViews.map((view) => <button type="button" className={workspaceView === view.value ? "active" : ""} onClick={() => setWorkspaceView(view.value)} key={view.value}>{view.label}<span>{workspaceCount(view.value)}</span></button>)}
          </nav>
          {workflowError && <p className="workflow-error" role="alert">{workflowError}</p>}
          <details className="saved-searches-panel">
            <summary><span>Мои поиски</span><small>{savedSearches.length ? `${savedSearches.length} сохранено` : "Сохраните нужные фильтры"}</small></summary>
            <div className="saved-searches-body">
              <div className="save-search-form">
                <label><span>Название подборки</span><input value={savedSearchName} maxLength={60} onChange={(event) => setSavedSearchName(event.target.value)} placeholder="Например, Стройка в Туркестане" /></label>
                <label><span>Проверять новые тендеры</span><select value={newAlertFrequency} onChange={(event) => setNewAlertFrequency(event.target.value as AlertFrequency)}>{Object.entries(alertLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <button type="button" disabled={savingSearch} onClick={createSavedSearch}>Сохранить текущие фильтры</button>
              </div>
              <p className="notification-note">Частота уже сохранится. Доставка уведомлений заработает после подключения официального источника и канала Telegram или email.</p>
              {savedSearchMessage && <p className="saved-search-message" role="status">{savedSearchMessage}</p>}
              <div className="telegram-widget-box">
                <div className="tg-widget-header">
                  <span className="tg-icon">✈</span>
                  <div>
                    <strong>Telegram-уведомления</strong>
                    <p>{telegramSub?.status === "approved" ? `Подключено: @${telegramSub.username || telegramSub.firstName || "Пользователь"} (Одобрено)` : telegramSub?.status === "pending" ? "⏳ Заявка ожидает одобрения администратора" : "Получайте интересные тендеры прямо в мессенджер"}</p>
                  </div>
                </div>
                {telegramActionMsg && <p className="tg-action-msg">{telegramActionMsg}</p>}
                <div className="tg-widget-actions">
                  {(!telegramSub || telegramSub.status === "rejected" || telegramSub.status === "paused") && (
                    <button type="button" className="tg-connect-btn" disabled={telegramConnecting} onClick={connectTelegram}>
                      {telegramConnecting ? "Генерируем ссылку…" : "Запросить подключение Telegram"}
                    </button>
                  )}
                  {telegramSub?.status === "pending" && (
                    <span className="tg-pending-badge">⏳ Ожидает одобрения главным администратором в Telegram</span>
                  )}
                  {telegramSub?.status === "approved" && (
                    <div className="tg-connected-actions">
                      <button type="button" className="tg-test-btn" onClick={sendTestTelegram}>Отправить тест в Telegram</button>
                      <button type="button" className="tg-reconnect-btn" onClick={connectTelegram}>Переподключить</button>
                    </div>
                  )}
                </div>
              </div>
              {savedSearches.length > 0 && <div className="saved-search-list">{savedSearches.map((search) => <article key={search.id}>
                <div><strong>{search.name}</strong><small>{alertLabels[search.alertFrequency]}</small></div>
                <label><span className="sr-only">Частота уведомлений для {search.name}</span><select value={search.alertFrequency} disabled={savingSearch} onChange={(event) => persistSavedSearch({ ...search, alertFrequency: event.target.value as AlertFrequency })}>{Object.entries(alertLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <button type="button" disabled={savingSearch} onClick={() => applySavedSearch(search)}>Применить</button>
                <button className="delete-search" type="button" disabled={savingSearch} onClick={() => removeSavedSearch(search.id)} aria-label={`Удалить поиск ${search.name}`}>×</button>
              </article>)}</div>}
            </div>
          </details>
          <div className="filters live-filters">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, заказчик или номер" aria-label="Поиск тендеров" />
            </label>
            <label><span className="sr-only">Регион</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">Все регионы</option>{regions.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label>
            <label className="locality-filter-select"><span className="sr-only">Город / Район / Село</span><select value={locality} onChange={(event) => setLocality(event.target.value)}>{localities.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            <label><span className="sr-only">Вид закупки</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">Все виды закупок</option>{subjectOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className="sr-only">Максимальный бюджет</span><select value={budget} onChange={(event) => setBudget(event.target.value)}><option value="all">Любой бюджет</option><option value="10000000">До 10 млн ₸</option><option value="50000000">До 50 млн ₸</option><option value="100000000">До 100 млн ₸</option><option value="500000000">До 500 млн ₸</option><option value="1000000000">До 1 млрд ₸</option></select></label>
            <label><span className="sr-only">Срок подачи</span><select value={deadline} onChange={(event) => setDeadline(event.target.value)}><option value="all">Любой срок</option><option value="3">До 3 дней</option><option value="7">До 7 дней</option><option value="14">До 14 дней</option><option value="30">До 30 дней</option></select></label>
            <label className="filter-toggle"><input type="checkbox" checked={constructionOnly} onChange={(event) => setConstructionOnly(event.target.checked)} /><span>Только строительные работы</span></label>
            {companyProfile && (
              <>
                <label className="filter-toggle">
                  <input type="checkbox" checked={excludeStopWords} onChange={(event) => setExcludeStopWords(event.target.checked)} />
                  <span>Исключать стоп-слова {companyProfile.negativeKeywords?.length ? `(${companyProfile.negativeKeywords.length})` : ""}</span>
                </label>
                <label className="filter-toggle">
                  <input type="checkbox" checked={onlyFitsProfile} onChange={(event) => setOnlyFitsProfile(event.target.checked)} />
                  <span>Только подходящие</span>
                </label>
              </>
            )}
            <details className="advanced-filters">
              <summary>
                <span>Расширенный поиск</span>
                <small>{advancedFilterCount ? `Активно: ${advancedFilterCount}` : "Номер, заказчик, сумма и даты"}</small>
              </summary>
              <div className="advanced-filter-grid">
                <label><span>Номер объявления</span><input value={announcementNumber} onChange={(event) => setAnnouncementNumber(event.target.value)} placeholder="Например, 15123456-1" /></label>
                <label><span>Заказчик или БИН</span><input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Название или 12 цифр" /></label>
                <label><span>Способ закупки</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="all">Все способы</option>{methodOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Все статусы</option>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Сумма от, ₸</span><input type="number" min="0" inputMode="decimal" value={amountFrom} onChange={(event) => setAmountFrom(event.target.value)} placeholder="0" /></label>
                <label><span>Сумма до, ₸</span><input type="number" min="0" inputMode="decimal" value={amountTo} onChange={(event) => setAmountTo(event.target.value)} placeholder="Без ограничения" /></label>
                <label><span>Опубликовано с</span><input type="date" value={publishedFrom} onChange={(event) => setPublishedFrom(event.target.value)} /></label>
                <label><span>Опубликовано по</span><input type="date" value={publishedTo} onChange={(event) => setPublishedTo(event.target.value)} /></label>
                <label><span>Приём заявок заканчивается с</span><input type="date" value={endingFrom} onChange={(event) => setEndingFrom(event.target.value)} /></label>
                <label><span>Приём заявок заканчивается по</span><input type="date" value={endingTo} onChange={(event) => setEndingTo(event.target.value)} /></label>
                <label><span>Финансовый год</span><select value={financialYear} onChange={(event) => setFinancialYear(event.target.value)}><option value="all">Все годы</option>{financialYearOptions.map((year) => <option value={year} key={year}>{year}</option>)}</select></label>
              </div>
            </details>
            <div className="filter-actions">
              <span>Результаты обновляются сразу</span>
              <button type="button" onClick={resetFilters} disabled={!hasAnyFilter}>Сбросить все фильтры</button>
            </div>
          </div>

          <div className="feed-heading">
            <div>
              <p className="section-label">ОФИЦИАЛЬНЫЕ ОБЪЯВЛЕНИЯ</p>
              <h2>{visibleTenders.length} тендеров <span>на {money.format(totalBudget)}</span></h2>
            </div>
            <div className="feed-heading-controls">
              <div className="view-mode-switch" role="group" aria-label="Режим отображения">
                <button type="button" className={feedMode === "list" ? "active" : ""} onClick={() => setFeedMode("list")}>Список</button>
                <button type="button" className={feedMode === "deadlines" ? "active" : ""} onClick={() => setFeedMode("deadlines")}>📅 Календарь дедлайнов</button>
              </div>
              <label className="sort-control">
                <span>Сначала</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Сортировка">
                  <option value="deadline">ближайший срок</option>
                  <option value="published">новые</option>
                  <option value="budget">крупные</option>
                </select>
              </label>
            </div>
          </div>

          {feedMode === "deadlines" ? (
            <div className="deadlines-timeline" aria-live="polite">
              {visibleTenders.length === 0 ? (
                <div className="empty-state data-empty">
                  <span aria-hidden="true">◎</span>
                  <h3>{tenders.length === 0 ? copy.title : "По этим условиям ничего не найдено"}</h3>
                  <p>{tenders.length === 0 ? copy.body : "Измените параметры поиска или сбросьте фильтры."}</p>
                  {tenders.length > 0 && <button type="button" onClick={resetFilters}>Сбросить фильтры</button>}
                </div>
              ) : (
                deadlineGroups.map((group) => (
                  <section className={`deadline-group ${group.badge}`} key={group.id}>
                    <header className="deadline-group-header">
                      <span className="group-icon">{group.icon}</span>
                      <h3>{group.title}</h3>
                      <span className="group-count">{group.count}</span>
                    </header>
                    <div className="deadline-cards-grid">
                      {group.items.map((tender) => {
                        const days = remainingDays(tender.endDate, referenceTime);
                        const currentStage = workflow[tender.externalId]?.stage ?? "none";
                        const isFav = workflow[tender.externalId]?.isFavorite;
                        return (
                          <article className={`deadline-card ${activeTender?.externalId === tender.externalId ? "active" : ""}`} key={tender.externalId}>
                            <div className="deadline-card-top">
                              <span className="deadline-card-anno">№ {tender.numberAnno}</span>
                              <span className="deadline-card-badge">{days === null ? "Бессрочно" : days < 0 ? "Срок истёк" : days === 0 ? "Сегодня!" : `${days} дн.`}</span>
                            </div>
                            <h4>{tender.title}</h4>
                            <p className="deadline-card-buyer">{tender.buyer}</p>
                            <div className="deadline-card-footer">
                              <div className="deadline-card-budget">
                                <small>Бюджет</small>
                                <strong>{money.format(tender.budget)}</strong>
                              </div>
                              <div className="deadline-card-date">
                                <small>Дедлайн</small>
                                <span>{tender.endDate ? dateTime.format(tender.endDate) : "Не указано"}</span>
                              </div>
                            </div>
                            <div className="deadline-card-status">
                              <span className="stage-pill">{stageLabels[currentStage]}</span>
                              {isFav && <span className="fav-star" title="В избранном">★</span>}
                              {currentStage === "skipped" ? (
                                <button type="button" className="unhide-mini-btn" disabled={savingTenderId === tender.externalId} onClick={() => updateWorkflow(tender.externalId, { stage: "none" })} title="Восстановить в ленту">Вернуть</button>
                              ) : (
                                <button type="button" className="hide-mini-btn" disabled={savingTenderId === tender.externalId} onClick={() => updateWorkflow(tender.externalId, { stage: "skipped" })} title="Скрыть закупку">Скрыть</button>
                              )}
                              <button type="button" className="deadline-card-btn" onClick={() => selectTender(tender.externalId)}>Подробнее ↗</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          ) : (
            <div className="tender-list" aria-live="polite">
              {visibleTenders.length === 0 ? (
                <div className="empty-state data-empty">
                  <span aria-hidden="true">◎</span>
                  <h3>{tenders.length === 0 ? copy.title : "По этим условиям ничего не найдено"}</h3>
                  <p>{tenders.length === 0 ? copy.body : "Измените параметры поиска или сбросьте фильтры."}</p>
                  {tenders.length > 0 && <button type="button" onClick={resetFilters}>Сбросить фильтры</button>}
                </div>
              ) : visibleTenders.map((tender, index) => {
                const days = remainingDays(tender.endDate, referenceTime);
                const match = companyProfile ? explainTenderMatch(tender, companyProfile) : null;
                const stage = workflow[tender.externalId]?.stage ?? "none";
                return (
                  <article className={`tender-card live-card ${activeTender?.externalId === tender.externalId ? "active" : ""}`} key={tender.externalId}>
                    <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                    <div className="official-mark"><span>ГЗ</span><small>официально</small></div>
                    <div className="tender-main">
                      <div className="card-meta">
                        <span>№ {tender.numberAnno}</span>
                        <span>{tender.methodName}</span>
                        <div className="card-meta-actions">
                          {stage === "skipped" ? (
                            <button className="unhide-button" type="button" disabled={savingTenderId === tender.externalId} onClick={() => updateWorkflow(tender.externalId, { stage: "none" })} title="Восстановить в ленту">Вернуть</button>
                          ) : (
                            <button className="hide-button" type="button" disabled={savingTenderId === tender.externalId} onClick={() => updateWorkflow(tender.externalId, { stage: "skipped" })} title="Скрыть из ленты">Скрыть</button>
                          )}
                          <button className={`favorite-button ${workflow[tender.externalId]?.isFavorite ? "active" : ""}`} type="button" disabled={savingTenderId === tender.externalId} onClick={() => updateWorkflow(tender.externalId, { isFavorite: !workflow[tender.externalId]?.isFavorite })} aria-label={workflow[tender.externalId]?.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}>★</button>
                        </div>
                      </div>
                      <h3>{tender.title}</h3>
                      <p className="buyer">{tender.buyer}</p>
                      <div className="tags">
                        <span>{tender.regionName}</span>
                        <span>{tender.subjectType}</span>
                        {tender.isConstructionWork && <span>СМР</span>}
                        {stage !== "none" && <span className="stage-chip">{stageLabels[stage]}</span>}
                        {match && <span className={`match-chip ${match.status}`}>{match.label}</span>}
                        {match?.matchedKeywords?.map((kw) => <span className="keyword-chip positive" key={kw}>🎯 {kw}</span>)}
                        {match?.matchedNegativeKeywords?.map((neg) => <span className="keyword-chip negative" key={neg}>⛔ {neg}</span>)}
                      </div>
                      <div className="reason-row factual-row"><span><b>✓</b>{tender.statusName}</span><span><b>↗</b>Обновлено в источнике</span></div>
                    </div>
                    <div className="tender-finance">
                      <small>БЮДЖЕТ</small><strong>{money.format(tender.budget)}</strong>
                      <div className={`deadline ${days !== null && days <= 5 ? "urgent" : ""}`}><small>ДО ПОДАЧИ</small><b>{days === null ? "Не указан" : days < 0 ? "Срок истёк" : `${days} дн.`}</b><span>{tender.endDate ? dateTime.format(tender.endDate) : "Нет даты"}</span></div>
                      <button type="button" onClick={() => selectTender(tender.externalId)} aria-label={`Открыть ${tender.title}`}>Подробнее <span>↗</span></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="insight-panel factual-panel" aria-label="Данные выбранного тендера">
          {activeTender ? (
            <>
              <div className="insight-head"><p className="section-label">КАРТОЧКА ОБЪЯВЛЕНИЯ</p><span>ГЗ</span></div>
              <h2>{activeTender.title}</h2><p className="insight-id">№ {activeTender.numberAnno}</p>
              <div className="workflow-control">
                <label><span>Этап участия</span><select value={workflow[activeTender.externalId]?.stage ?? "none"} disabled={savingTenderId === activeTender.externalId} onChange={(event) => updateWorkflow(activeTender.externalId, { stage: event.target.value as TenderStage })}>{Object.entries(stageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <button className={workflow[activeTender.externalId]?.isFavorite ? "active" : ""} type="button" disabled={savingTenderId === activeTender.externalId} onClick={() => updateWorkflow(activeTender.externalId, { isFavorite: !workflow[activeTender.externalId]?.isFavorite })}><span aria-hidden="true">★</span>{workflow[activeTender.externalId]?.isFavorite ? "В избранном" : "В избранное"}</button>
                {role === "super_admin" && (
                  <button type="button" className={`recommend-btn ${showRecommendBox ? "active" : ""}`} onClick={() => setShowRecommendBox(!showRecommendBox)}>
                    📢 В Telegram сотруднику
                  </button>
                )}
              </div>
              {showRecommendBox && (
                <div className="recommend-modal-box">
                  <h4>Рекомендовать закупку сотруднику в Telegram</h4>
                  <label>
                    <span>Сотрудник</span>
                    <select value={recommendUserId} onChange={(e) => setRecommendUserId(e.target.value)}>
                      <option value="">Выберите сотрудника</option>
                      {taskWorkspace.members.map((m) => <option value={m.id} key={m.id}>{m.username}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Комментарий к закупке</span>
                    <textarea value={recommendNote} maxLength={300} onChange={(e) => setRecommendNote(e.target.value)} placeholder="Например: обрати внимание, отличный лот под нашу лицензию" />
                  </label>
                  {recommendResult && <p className="recommend-result">{recommendResult}</p>}
                  <div className="recommend-actions">
                    <button type="button" className="btn-send-recommend" disabled={recommendSending || !recommendUserId} onClick={submitRecommendation}>
                      {recommendSending ? "Отправляем…" : "Отправить в Telegram"}
                    </button>
                    <button type="button" className="btn-cancel-recommend" onClick={() => setShowRecommendBox(false)}>Закрыть</button>
                  </div>
                </div>
              )}
              <nav className="detail-tabs" aria-label="Разделы объявления">
                {([
                  ['overview', 'Обзор'],
                  ['lots', `Лоты ${tenderDetails.lots.length || ''}`],
                  ['documents', `Документы ${tenderDetails.documents.length || ''}`],
                  ['history', 'История'],
                  ['tasks', `Чек-лист ${taskWorkspace.tasks.length || ''}`],
                  ['notes', `Заметки ${notes.length || ''}`],
                ] as Array<[DetailTab, string]>).map(([value, label]) => (
                  <button type="button" className={detailTab === value ? "active" : ""} onClick={() => setDetailTab(value)} key={value}>{label}</button>
                ))}
              </nav>
              {detailsMessage && <p className="detail-message" role="status">{detailsMessage}</p>}
              {detailTab === "overview" && <>{activeMatch && <section className={`match-explanation ${activeMatch.status}`}>
                <div><span>СООТВЕТСТВИЕ ПРОФИЛЮ</span><strong>{activeMatch.label}</strong></div>
                <ul>{activeMatch.evidence.map((item) => <li className={item.kind} key={item.label}><span aria-hidden="true">{item.kind === "positive" ? "✓" : item.kind === "negative" ? "×" : "?"}</span>{item.label}</li>)}</ul>
                {activeMatch.matchedKeywords.length > 0 && (
                  <div className="match-keyword-group">
                    <span className="group-title">Совпадения по ключевым словам:</span>
                    <div className="keyword-tags">{activeMatch.matchedKeywords.map((k) => <span className="keyword-tag positive" key={k}>🎯 {k}</span>)}</div>
                  </div>
                )}
                {activeMatch.matchedNegativeKeywords.length > 0 && (
                  <div className="match-keyword-group">
                    <span className="group-title">Обнаружены стоп-слова:</span>
                    <div className="keyword-tags">{activeMatch.matchedNegativeKeywords.map((k) => <span className="keyword-tag negative" key={k}>⛔ {k}</span>)}</div>
                  </div>
                )}
                <p>Оценка основана только на известных полях объявления. Проверьте лоты, лицензии и документы на официальном портале.</p>
              </section>}
              <dl className="tender-facts">
                <div><dt>Заказчик</dt><dd>{activeTender.buyer}</dd></div>
                <div><dt>Регион</dt><dd>{activeTender.regionName}</dd></div>
                <div><dt>Вид закупки</dt><dd>{activeTender.subjectType}</dd></div>
                <div><dt>Способ</dt><dd>{activeTender.methodName}</dd></div>
                <div><dt>Статус</dt><dd>{activeTender.statusName}</dd></div>
                <div><dt>Опубликовано</dt><dd>{activeTender.publishDate ? dateTime.format(activeTender.publishDate) : "Не указано"}</dd></div>
                <div><dt>Окончание приёма</dt><dd>{activeTender.endDate ? dateTime.format(activeTender.endDate) : "Не указано"}</dd></div>
                <div><dt>Бюджет</dt><dd>{money.format(activeTender.budget)}</dd></div>
              </dl>
              <div className="next-step"><span>ОФИЦИАЛЬНЫЙ ИСТОЧНИК</span><p>Проверьте лоты, требования и документы непосредственно на портале перед принятием решения.</p><a href={activeTender.sourceUrl} target="_blank" rel="noreferrer">Открыть на goszakup.gov.kz <span>↗</span></a></div></>}
              {detailTab === "lots" && <div className="detail-content">{detailsLoading ? <p>Загружаем лоты…</p> : tenderDetails.lots.length ? tenderDetails.lots.map((lot) => <article className="lot-item" key={lot.externalId}><div><small>ЛОТ № {lot.lotNumber}</small><strong>{lot.title}</strong></div><b>{money.format(lot.amount)}</b><p>{lot.description || "Описание не указано"}</p><dl><div><dt>Статус</dt><dd>{lot.statusName}</dd></div><div><dt>Количество</dt><dd>{lot.quantity || "Не указано"}</dd></div><div><dt>ЕНС ТРУ</dt><dd>{lot.enstruIds.length ? lot.enstruIds.join(", ") : "Не указано"}</dd></div><div><dt>Место поставки</dt><dd>{lot.deliveryKato.length ? lot.deliveryKato.join(", ") : "Не указано"}</dd></div></dl></article>) : <div className="detail-empty"><strong>Лоты ещё не загружены</strong><p>{sourceStatus.configured ? "Запустите загрузку официальных деталей объявления." : "После добавления API-токена здесь появятся официальные лоты, ЕНС ТРУ и места поставки."}</p>{role === "super_admin" && <button type="button" disabled={!sourceStatus.configured || syncingDetails} onClick={synchronizeDetails}>{syncingDetails ? "Загружаем…" : sourceStatus.configured ? "Загрузить детали" : "Ожидается токен"}</button>}</div>}</div>}
              {detailTab === "documents" && <div className="detail-content">{detailsLoading ? <p>Загружаем документы…</p> : tenderDetails.documents.length ? <div className="document-list">{tenderDetails.documents.map((document) => <article key={document.externalId}><div><strong>{document.name}</strong><small>{document.originalName || `Документ лота ${document.lotId}`}</small></div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer">Открыть ↗</a> : <span>Ссылка не указана</span>}</article>)}</div> : <div className="detail-empty"><strong>Документы ещё не загружены</strong><p>Файлы будут показаны только после получения их из официального API. Здесь нет демонстрационных документов.</p></div>}</div>}
              {detailTab === "history" && <div className="detail-content">{detailsLoading ? <p>Загружаем историю…</p> : tenderDetails.changes.length ? <ol className="change-list">{tenderDetails.changes.map((change) => <li key={change.id}><span>{dateTime.format(change.changedAt)}</span><strong>{change.title}</strong></li>)}</ol> : <div className="detail-empty"><strong>История пока пуста</strong><p>После первой синхронизации здесь появятся подтверждённые события обновления.</p></div>}</div>}
              {detailTab === "tasks" && <div className="detail-content task-workspace">
                <div className="task-progress">
                  <div><span>ГОТОВНОСТЬ К ПОДАЧЕ</span><strong>{taskWorkspace.tasks.filter((task) => task.status === "done").length} из {taskWorkspace.tasks.length}</strong></div>
                  <div><span style={{ width: `${taskWorkspace.tasks.length ? taskWorkspace.tasks.filter((task) => task.status === "done").length / taskWorkspace.tasks.length * 100 : 0}%` }} /></div>
                </div>
                {taskMessage && <p className="task-message" role="status">{taskMessage}</p>}
                <div className="template-selector-box">
                  <div className="template-selector-header">
                    <span className="template-title-label">Шаблон чек-листа:</span>
                    <select value={selectedTemplate} disabled={updatingTask} onChange={(event) => setManualTemplate(event.target.value as ChecklistTemplateType)}>
                      {Object.entries(CHECKLIST_TEMPLATES).map(([type, info]) => (
                        <option value={type} key={type}>
                          {info.name} {detectChecklistTemplate(activeTender.methodName) === type ? "★ (Рекомендуется)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="template-desc">{CHECKLIST_TEMPLATES[selectedTemplate]?.description}</p>
                  <button type="button" className="template-apply-btn" disabled={updatingTask} onClick={() => taskRequest("POST", { tenderId: activeTender.externalId, action: "seed", templateType: selectedTemplate })}>
                    {taskWorkspace.tasks.length === 0 ? "Применить шаблон чек-листа" : "Перезаполнить по шаблону"}
                  </button>
                </div>
                {taskWorkspace.tasks.length ? <div className="task-list">{taskWorkspace.tasks.map((task) => {
                  return <article className={task.status === "done" ? "done" : ""} key={task.id}>
                    <label className="task-check"><input type="checkbox" checked={task.status === "done"} disabled={updatingTask} onChange={(event) => updateTask(task, { status: event.target.checked ? "done" : "todo" })} /><span>{task.title}</span></label>
                    {role === "super_admin" ? <><select value={task.assignedUserId} disabled={updatingTask} onChange={(event) => updateTask(task, { assignedUserId: event.target.value })} aria-label={`Ответственный за ${task.title}`}><option value="">Не назначен</option>{taskWorkspace.members.map((member) => <option value={member.id} key={member.id}>{member.username}</option>)}</select><input type="date" value={taskDateValue(task.dueAt)} disabled={updatingTask} onChange={(event) => updateTask(task, { dueAt: event.target.value ? Date.parse(`${event.target.value}T00:00:00+05:00`) : null })} aria-label={`Срок задачи ${task.title}`} /><button className="task-delete" type="button" disabled={updatingTask} onClick={() => taskRequest("DELETE", undefined, task.id)} aria-label={`Удалить задачу ${task.title}`}>×</button></> : <div className="task-assignment"><span>{task.assignedUsername || "Не назначено"}</span><small>{task.dueAt ? `до ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeZone: "Asia/Almaty" }).format(task.dueAt)}` : "без срока"}</small></div>}
                  </article>;
                })}</div> : null}
                <div className="new-task-form">
                  <input value={newTaskTitle} maxLength={140} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="Добавить свой шаг в чек-лист..." aria-label="Название новой задачи" />
                  <button type="button" disabled={updatingTask} onClick={createTask}>Добавить</button>
                </div>
                <p className="future-capability">Чек-лист помогает подготовить полный пакет документов в строгом соответствии с процедурами законодательства РК о государственных закупках.</p>
              </div>}
              {detailTab === "notes" && <div className="detail-content notes-workspace">
                <div className="notes-box-header">
                  <p className="section-label">РАБОЧИЕ ЗАМЕТКИ И РАСЧЁТЫ</p>
                  <p className="notes-subtitle">Внутренние заметки видны только вашей команде (расчёт себестоимости, контакты поставщиков, риски по техспецификации).</p>
                </div>
                {noteMessage && <p className="note-status-message" role="status">{noteMessage}</p>}
                <div className="new-note-box">
                  <textarea
                    value={newNoteContent}
                    onChange={(event) => setNewNoteContent(event.target.value)}
                    placeholder="Запишите расчет цены, маржинальность, контакты субподрядчика или примечания по лоту..."
                    rows={4}
                    maxLength={3000}
                  />
                  <div className="new-note-actions">
                    <span className="char-count">{newNoteContent.length} / 3000</span>
                    <button type="button" className="save-note-btn" disabled={savingNote || !newNoteContent.trim()} onClick={createNote}>
                      {savingNote ? "Сохранение…" : "Сохранить заметку"}
                    </button>
                  </div>
                </div>
                {notesLoading ? (
                  <p className="notes-loading">Загружаем заметки…</p>
                ) : notes.length > 0 ? (
                  <div className="notes-list">
                    {notes.map((note) => (
                      <article className="note-card" key={note.id}>
                        <header className="note-card-header">
                          <div className="note-author">
                            <span className="author-avatar">{note.authorName.charAt(0).toUpperCase()}</span>
                            <strong>{note.authorName}</strong>
                          </div>
                          <div className="note-meta">
                            <time>{dateTime.format(note.createdAt)}</time>
                            <button type="button" className="delete-note-btn" title="Удалить заметку" onClick={() => removeNote(note.id)}>×</button>
                          </div>
                        </header>
                        <div className="note-body">{note.content}</div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="detail-empty">
                    <strong>Заметок пока нет</strong>
                    <p>Сохраняйте здесь расчёты и важные детали перед подачей заявки.</p>
                  </div>
                )}
              </div>}
            </>
          ) : (
            <div className="panel-waiting"><span>QT</span><h2>Карточка появится после загрузки</h2><p>Здесь будут только фактические сведения из официального объявления — без выдуманных оценок и рисков.</p></div>
          )}
        </aside>
      </section>

      <footer><div><strong>QazTender Radar</strong><span>Источник: goszakup.gov.kz</span></div><p>Сервис помогает отбирать объявления, но не заменяет проверку конкурсной документации и юридических требований.</p></footer>
    </main>
  );
}
