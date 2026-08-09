"use client";

import { useMemo, useState } from "react";

type Tender = {
  id: string;
  title: string;
  buyer: string;
  region: string;
  category: string;
  method: string;
  budget: number;
  deadline: string;
  daysLeft: number;
  score: number;
  reasons: string[];
  risks: string[];
  status: "recommended" | "review" | "risk";
};

const tenders: Tender[] = [
  {
    id: "17388421-1",
    title: "Капитальный ремонт здания общеобразовательной школы № 17",
    buyer: "Отдел образования города Кызылорда",
    region: "Кызылординская область",
    category: "Капитальный ремонт",
    method: "Открытый конкурс",
    budget: 184_300_000,
    deadline: "18 августа, 18:00",
    daysLeft: 8,
    score: 91,
    reasons: ["Профиль работ совпадает", "Реалистичный бюджет", "Домашний регион"],
    risks: ["Нужен подтверждённый опыт за 5 лет"],
    status: "recommended",
  },
  {
    id: "17391706-2",
    title: "Строительство наружных сетей водоснабжения жилого массива",
    buyer: "Управление строительства Туркестанской области",
    region: "Туркестанская область",
    category: "Инженерные сети",
    method: "Конкурс с рейтингово-балльной системой",
    budget: 327_800_000,
    deadline: "21 августа, 09:00",
    daysLeft: 11,
    score: 84,
    reasons: ["Подходящий масштаб", "Достаточный срок подачи", "Низкая удалённость"],
    risks: ["Проверить наличие спецтехники", "Обеспечение заявки 3%"],
    status: "recommended",
  },
  {
    id: "17390214-1",
    title: "Благоустройство территории центрального парка",
    buyer: "Аппарат акима города Аральск",
    region: "Кызылординская область",
    category: "Благоустройство",
    method: "Открытый конкурс",
    budget: 96_450_000,
    deadline: "15 августа, 12:00",
    daysLeft: 5,
    score: 78,
    reasons: ["Домашний регион", "Умеренный бюджет", "Есть похожие работы"],
    risks: ["Сжатый срок подготовки", "Сезонные ограничения"],
    status: "review",
  },
  {
    id: "17374109-3",
    title: "Текущий ремонт кровли районной больницы",
    buyer: "Управление здравоохранения Актюбинской области",
    region: "Актюбинская область",
    category: "Капитальный ремонт",
    method: "Запрос ценовых предложений",
    budget: 41_600_000,
    deadline: "13 августа, 10:00",
    daysLeft: 3,
    score: 67,
    reasons: ["Понятный объём работ", "Невысокая финансовая нагрузка"],
    risks: ["Мало времени на расчёт", "Удалённый объект", "Вероятен ценовой демпинг"],
    status: "review",
  },
  {
    id: "17368854-1",
    title: "Реконструкция автомобильной дороги районного значения",
    buyer: "Управление пассажирского транспорта Алматинской области",
    region: "Алматинская область",
    category: "Дорожные работы",
    method: "Открытый конкурс",
    budget: 1_240_000_000,
    deadline: "29 августа, 17:30",
    daysLeft: 19,
    score: 52,
    reasons: ["Достаточный срок подачи", "Крупный контракт"],
    risks: ["Бюджет выше целевого", "Нужна дорожная лицензия", "Высокая логистическая нагрузка"],
    status: "risk",
  },
];

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const regions = ["Все регионы", ...Array.from(new Set(tenders.map((tender) => tender.region)))];
const categories = ["Все работы", ...Array.from(new Set(tenders.map((tender) => tender.category)))];

function scoreLabel(score: number) {
  if (score >= 80) return "Стоит рассмотреть";
  if (score >= 65) return "Нужна проверка";
  return "Высокий риск";
}

export default function TenderDashboard({ username, role }: { username: string; role: "super_admin" | "tender_specialist" | "guest" }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("Все регионы");
  const [category, setCategory] = useState("Все работы");
  const [sort, setSort] = useState("score");
  const [activeId, setActiveId] = useState(tenders[0].id);

  const visibleTenders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return tenders
      .filter((tender) =>
        !normalized ||
        `${tender.title} ${tender.buyer} ${tender.id}`.toLocaleLowerCase("ru").includes(normalized),
      )
      .filter((tender) => region === "Все регионы" || tender.region === region)
      .filter((tender) => category === "Все работы" || tender.category === category)
      .sort((a, b) => {
        if (sort === "budget") return b.budget - a.budget;
        if (sort === "deadline") return a.daysLeft - b.daysLeft;
        return b.score - a.score;
      });
  }, [query, region, category, sort]);

  const activeTender =
    visibleTenders.find((tender) => tender.id === activeId) ?? visibleTenders[0] ?? null;
  const totalBudget = visibleTenders.reduce((sum, tender) => sum + tender.budget, 0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="QazTender Radar — на главную">
          <span className="brand-mark">QT</span>
          <span>
            <strong>QazTender</strong>
            <small>RADAR</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="demo-pill"><span aria-hidden="true" /> Демо-данные</span>
          <div className="account-block">
            {role === "super_admin" && <a className="team-link" href="/admin/users">Команда</a>}
            <div className="profile-button" title={username}>
              <span>ГА</span>
              <span className="profile-copy"><strong>{role === "super_admin" ? "Главный администратор" : "Тендерщик"}</strong><small>{username}</small></span>
            </div>
            <button className="logout-button" type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }}>Выйти</button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">РАДАР ВОЗМОЖНОСТЕЙ · КАЗАХСТАН</p>
          <h1>Тендеры, которые<br /><em>стоят вашего времени.</em></h1>
          <p className="hero-copy">
            Система отсеивает шум, объясняет соответствие и поднимает наверх закупки,
            которые ближе к возможностям строительной компании.
          </p>
        </div>
        <div className="hero-metric" aria-label="Главный результат">
          <span className="metric-kicker">Лучшее совпадение сегодня</span>
          <strong>91<span>/100</span></strong>
          <p>Капремонт школы · Кызылорда</p>
          <div className="metric-line"><span style={{ width: "91%" }} /></div>
        </div>
      </section>

      <section className="notice" aria-label="Статус данных">
        <span className="notice-icon">i</span>
        <p><strong>Рабочий прототип.</strong> Сейчас показаны демонстрационные закупки. После подключения профиля компании и официального API рейтинг будет рассчитываться по реальным лицензиям, опыту и ограничениям.</p>
        <button type="button">Что будет подключено <span aria-hidden="true">→</span></button>
      </section>

      <section className="workspace">
        <div className="feed-panel">
          <div className="filters">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по тендерам, заказчикам и номерам"
                aria-label="Поиск тендеров"
              />
            </label>
            <label>
              <span className="sr-only">Регион</span>
              <select value={region} onChange={(event) => setRegion(event.target.value)}>
                {regions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Категория работ</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="feed-heading">
            <div>
              <p className="section-label">ПОДХОДЯЩИЕ ЗАКУПКИ</p>
              <h2>{visibleTenders.length} тендеров <span>на {money.format(totalBudget)}</span></h2>
            </div>
            <label className="sort-control">
              <span>Сначала</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Сортировка">
                <option value="score">лучшие</option>
                <option value="budget">крупные</option>
                <option value="deadline">срочные</option>
              </select>
            </label>
          </div>

          <div className="tender-list" aria-live="polite">
            {visibleTenders.length === 0 ? (
              <div className="empty-state">
                <span>⌕</span><h3>Ничего не найдено</h3><p>Измените запрос или сбросьте фильтры.</p>
                <button type="button" onClick={() => { setQuery(""); setRegion("Все регионы"); setCategory("Все работы"); }}>Сбросить фильтры</button>
              </div>
            ) : visibleTenders.map((tender, index) => (
              <article
                className={`tender-card ${activeTender?.id === tender.id ? "active" : ""}`}
                key={tender.id}
              >
                <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="score-block">
                  <div className={`score-ring ${tender.status}`} style={{ "--score": `${tender.score * 3.6}deg` } as React.CSSProperties}>
                    <span>{tender.score}</span>
                  </div>
                  <small>{scoreLabel(tender.score)}</small>
                </div>
                <div className="tender-main">
                  <div className="card-meta"><span>№ {tender.id}</span><span>{tender.method}</span></div>
                  <h3>{tender.title}</h3>
                  <p className="buyer">{tender.buyer}</p>
                  <div className="tags"><span>{tender.region}</span><span>{tender.category}</span></div>
                  <div className="reason-row">
                    {tender.reasons.slice(0, 2).map((reason) => <span key={reason}><b>✓</b>{reason}</span>)}
                    <span className="risk-chip"><b>!</b>{tender.risks.length} {tender.risks.length === 1 ? "риск" : "риска"}</span>
                  </div>
                </div>
                <div className="tender-finance">
                  <small>БЮДЖЕТ</small>
                  <strong>{money.format(tender.budget)}</strong>
                  <div className={`deadline ${tender.daysLeft <= 5 ? "urgent" : ""}`}>
                    <small>ДО ПОДАЧИ</small>
                    <b>{tender.daysLeft} дн.</b>
                    <span>{tender.deadline}</span>
                  </div>
                  <button type="button" onClick={() => setActiveId(tender.id)} aria-label={`Открыть ${tender.title}`}>Подробнее <span>↗</span></button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="insight-panel" aria-label="Разбор выбранного тендера">
          {activeTender ? (
            <>
              <div className="insight-head">
                <p className="section-label">ПОЧЕМУ В РЕЙТИНГЕ</p>
                <span>{activeTender.score}/100</span>
              </div>
              <h2>{activeTender.title}</h2>
              <p className="insight-id">№ {activeTender.id}</p>

              <div className="breakdown">
                {[
                  ["Профиль работ", Math.min(96, activeTender.score + 3)],
                  ["Регион и логистика", Math.max(46, activeTender.score - 4)],
                  ["Бюджет и нагрузка", Math.max(38, activeTender.score - 9)],
                  ["Срок подготовки", Math.max(32, 100 - activeTender.daysLeft * 2)],
                ].map(([label, value]) => (
                  <div className="breakdown-row" key={String(label)}>
                    <div><span>{label}</span><b>{value}</b></div>
                    <div className="bar"><span style={{ width: `${value}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="insight-section positive">
                <h3><span>✓</span> Сильные стороны</h3>
                <ul>{activeTender.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
              <div className="insight-section warning">
                <h3><span>!</span> Что проверить</h3>
                <ul>{activeTender.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
              </div>
              <div className="next-step">
                <span>СЛЕДУЮЩИЙ ШАГ</span>
                <p>Сверить лицензию и подтверждённый опыт с конкурсной документацией.</p>
                <button type="button">Открыть чек-лист <span>→</span></button>
              </div>
            </>
          ) : <p>Выберите тендер для разбора.</p>}
        </aside>
      </section>

      <footer>
        <div><strong>QazTender Radar</strong><span>Помогаем выбирать, а не обещаем победу.</span></div>
        <p>Рейтинг является аналитической подсказкой. Финальное решение принимает компания после проверки документации.</p>
      </footer>
    </main>
  );
}
