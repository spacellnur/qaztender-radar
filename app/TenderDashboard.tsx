"use client";

import { useMemo, useState } from "react";
import type { TenderRecord, TenderSourceStatus } from "./tender-types";

type Props = {
  username: string;
  role: "super_admin" | "tender_specialist" | "guest";
  tenders: TenderRecord[];
  sourceStatus: TenderSourceStatus;
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

export default function TenderDashboard({ username, role, tenders, sourceStatus }: Props) {
  const [referenceTime] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [subject, setSubject] = useState("all");
  const [budget, setBudget] = useState("all");
  const [deadline, setDeadline] = useState("all");
  const [constructionOnly, setConstructionOnly] = useState(false);
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
    query.trim() || region !== "all" || subject !== "all" || budget !== "all" || deadline !== "all" || constructionOnly || advancedFilterCount,
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
      .filter((tender) => !normalized || `${tender.title} ${tender.buyer} ${tender.customerBin} ${tender.numberAnno}`.toLocaleLowerCase("ru").includes(normalized))
      .filter((tender) => region === "all" || tender.regionCode === region)
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
  }, [tenders, query, region, subject, budget, deadline, constructionOnly, announcementNumber, customer, method, status, amountFrom, amountTo, publishedFrom, publishedTo, endingFrom, endingTo, financialYear, sort, referenceTime]);

  const activeTender = visibleTenders.find((tender) => tender.externalId === activeId) ?? visibleTenders[0] ?? null;
  const totalBudget = visibleTenders.reduce((sum, tender) => sum + tender.budget, 0);
  const copy = sourceCopy(sourceStatus);

  function resetFilters() {
    setQuery("");
    setRegion("all");
    setSubject("all");
    setBudget("all");
    setDeadline("all");
    setConstructionOnly(false);
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
          <div className="filters live-filters">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, заказчик или номер" aria-label="Поиск тендеров" />
            </label>
            <label><span className="sr-only">Регион</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">Все регионы</option>{regions.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label>
            <label><span className="sr-only">Вид закупки</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="all">Все виды закупок</option>{subjectOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className="sr-only">Максимальный бюджет</span><select value={budget} onChange={(event) => setBudget(event.target.value)}><option value="all">Любой бюджет</option><option value="10000000">До 10 млн ₸</option><option value="50000000">До 50 млн ₸</option><option value="100000000">До 100 млн ₸</option><option value="500000000">До 500 млн ₸</option><option value="1000000000">До 1 млрд ₸</option></select></label>
            <label><span className="sr-only">Срок подачи</span><select value={deadline} onChange={(event) => setDeadline(event.target.value)}><option value="all">Любой срок</option><option value="3">До 3 дней</option><option value="7">До 7 дней</option><option value="14">До 14 дней</option><option value="30">До 30 дней</option></select></label>
            <label className="filter-toggle"><input type="checkbox" checked={constructionOnly} onChange={(event) => setConstructionOnly(event.target.checked)} /><span>Только строительные работы</span></label>
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
            <div><p className="section-label">ОФИЦИАЛЬНЫЕ ОБЪЯВЛЕНИЯ</p><h2>{visibleTenders.length} тендеров <span>на {money.format(totalBudget)}</span></h2></div>
            <label className="sort-control"><span>Сначала</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Сортировка"><option value="deadline">ближайший срок</option><option value="published">новые</option><option value="budget">крупные</option></select></label>
          </div>

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
              return (
                <article className={`tender-card live-card ${activeTender?.externalId === tender.externalId ? "active" : ""}`} key={tender.externalId}>
                  <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="official-mark"><span>ГЗ</span><small>официально</small></div>
                  <div className="tender-main">
                    <div className="card-meta"><span>№ {tender.numberAnno}</span><span>{tender.methodName}</span></div>
                    <h3>{tender.title}</h3>
                    <p className="buyer">{tender.buyer}</p>
                    <div className="tags"><span>{tender.regionName}</span><span>{tender.subjectType}</span>{tender.isConstructionWork && <span>СМР</span>}</div>
                    <div className="reason-row factual-row"><span><b>✓</b>{tender.statusName}</span><span><b>↗</b>Обновлено в источнике</span></div>
                  </div>
                  <div className="tender-finance">
                    <small>БЮДЖЕТ</small><strong>{money.format(tender.budget)}</strong>
                    <div className={`deadline ${days !== null && days <= 5 ? "urgent" : ""}`}><small>ДО ПОДАЧИ</small><b>{days === null ? "Не указан" : days < 0 ? "Срок истёк" : `${days} дн.`}</b><span>{tender.endDate ? dateTime.format(tender.endDate) : "Нет даты"}</span></div>
                    <button type="button" onClick={() => setActiveId(tender.externalId)} aria-label={`Открыть ${tender.title}`}>Подробнее <span>↗</span></button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="insight-panel factual-panel" aria-label="Данные выбранного тендера">
          {activeTender ? (
            <>
              <div className="insight-head"><p className="section-label">КАРТОЧКА ОБЪЯВЛЕНИЯ</p><span>ГЗ</span></div>
              <h2>{activeTender.title}</h2><p className="insight-id">№ {activeTender.numberAnno}</p>
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
              <div className="next-step"><span>ОФИЦИАЛЬНЫЙ ИСТОЧНИК</span><p>Проверьте лоты, требования и документы непосредственно на портале перед принятием решения.</p><a href={activeTender.sourceUrl} target="_blank" rel="noreferrer">Открыть на goszakup.gov.kz <span>↗</span></a></div>
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
