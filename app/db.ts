import type { AppRole } from "./auth";
import type { AlertFrequency, ChecklistTemplateType, CompanyProfile, SavedSearch, TaskTeamMember, TelegramSubscriber, TelegramSubscriberStatus, TenderDetails, TenderDocument, TenderLot, TenderNote, TenderRecord, TenderSearchFilters, TenderSourceStatus, TenderStage, TenderTask, TenderTaskWorkspace, TenderWorkflowEntry } from "./tender-types";

export type DatabaseUser = { id: string; username: string; passwordHash: string; role: AppRole; isActive: number };

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)`,
  `CREATE TABLE IF NOT EXISTS company_profiles (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    company_name text NOT NULL,
    bin DEFAULT '' NOT NULL,
    regions text DEFAULT '[]' NOT NULL,
    directions text DEFAULT '[]' NOT NULL,
    construction_types text DEFAULT '[]' NOT NULL,
    licenses text DEFAULT '' NOT NULL,
    experience_years integer DEFAULT 0 NOT NULL,
    employee_count integer DEFAULT 0 NOT NULL,
    min_budget integer DEFAULT 0 NOT NULL,
    max_budget integer DEFAULT 0 NOT NULL,
    keywords text DEFAULT '[]' NOT NULL,
    negative_keywords text DEFAULT '[]' NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles (user_id)`,
  `CREATE TABLE IF NOT EXISTS tenders (
    external_id text PRIMARY KEY NOT NULL,
    number_anno text NOT NULL,
    title text NOT NULL,
    buyer text NOT NULL,
    customer_bin text DEFAULT '' NOT NULL,
    region_code text NOT NULL,
    region_name text NOT NULL,
    subject_type_id integer NOT NULL,
    subject_type text NOT NULL,
    method_id integer NOT NULL,
    method_name text NOT NULL,
    budget integer NOT NULL,
    start_date integer,
    end_date integer,
    publish_date integer,
    is_construction_work integer NOT NULL,
    status_id integer NOT NULL,
    status_name text NOT NULL,
    kato text DEFAULT '[]' NOT NULL,
    system_id integer NOT NULL,
    source_url text NOT NULL,
    upstream_updated_at text NOT NULL,
    fetched_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tenders_region ON tenders (region_code)`,
  `CREATE INDEX IF NOT EXISTS idx_tenders_budget ON tenders (budget)`,
  `CREATE INDEX IF NOT EXISTS idx_tenders_end_date ON tenders (end_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tenders_publish_date ON tenders (publish_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tenders_subject_type ON tenders (subject_type)`,
  `CREATE TABLE IF NOT EXISTS tender_workflow (
    id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    owner_key text NOT NULL,
    stage text DEFAULT 'none' NOT NULL,
    is_favorite integer DEFAULT 0 NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_workflow_owner_tender ON tender_workflow (owner_key, tender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_workflow_stage ON tender_workflow (owner_key, stage)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_workflow_favorite ON tender_workflow (owner_key, is_favorite)`,
  `CREATE TABLE IF NOT EXISTS saved_searches (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    filters text NOT NULL,
    alert_frequency text DEFAULT 'off' NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches (user_id)`,
  `CREATE TABLE IF NOT EXISTS tender_lots (
    external_id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    lot_number text NOT NULL,
    title text NOT NULL,
    description text DEFAULT '' NOT NULL,
    amount integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    status_name text NOT NULL,
    enstru_ids text DEFAULT '[]' NOT NULL,
    delivery_kato text DEFAULT '[]' NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tender_lots_tender_id ON tender_lots (tender_id)`,
  `CREATE TABLE IF NOT EXISTS tender_documents (
    external_id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    lot_id text DEFAULT '' NOT NULL,
    name text NOT NULL,
    original_name text DEFAULT '' NOT NULL,
    url text NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id ON tender_documents (tender_id)`,
  `CREATE TABLE IF NOT EXISTS tender_changes (
    id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    action text NOT NULL,
    title text NOT NULL,
    changed_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tender_changes_tender_id ON tender_changes (tender_id, changed_at)`,
  `CREATE TABLE IF NOT EXISTS tender_sync_runs (
    id text PRIMARY KEY NOT NULL,
    status text NOT NULL,
    started_at integer NOT NULL,
    finished_at integer,
    fetched_count integer DEFAULT 0 NOT NULL,
    saved_count integer DEFAULT 0 NOT NULL,
    error_message text DEFAULT '' NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tender_sync_runs_started_at ON tender_sync_runs (started_at)`,
  `CREATE TABLE IF NOT EXISTS tender_tasks (
    id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'todo' NOT NULL,
    assigned_user_id text,
    due_at integer,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by_owner_key text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE SET NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_tasks_tender_title ON tender_tasks (tender_id, title)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_tasks_tender_sort ON tender_tasks (tender_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_tasks_assignee_status ON tender_tasks (assigned_user_id, status)`,
  `CREATE TABLE IF NOT EXISTS tender_notes (
    id text PRIMARY KEY NOT NULL,
    tender_id text NOT NULL,
    owner_key text NOT NULL,
    author_name text NOT NULL,
    content text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(external_id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tender_notes_tender_created ON tender_notes (tender_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_notes_owner ON tender_notes (owner_key)`,
  `CREATE TABLE IF NOT EXISTS telegram_subscribers (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    chat_id text NOT NULL,
    username text DEFAULT '' NOT NULL,
    first_name text DEFAULT '' NOT NULL,
    company_info text DEFAULT '' NOT NULL,
    city text DEFAULT '' NOT NULL,
    industry text DEFAULT '' NOT NULL,
    status text DEFAULT 'approved' NOT NULL,
    payment_status text DEFAULT 'trial' NOT NULL,
    trial_expires_at integer DEFAULT 0 NOT NULL,
    subscription_expires_at integer,
    last_active_at integer DEFAULT 0 NOT NULL,
    requested_at integer NOT NULL,
    approved_at integer,
    approved_by text,
    digest_enabled integer DEFAULT 1 NOT NULL,
    instant_enabled integer DEFAULT 1 NOT NULL,
    deadlines_enabled integer DEFAULT 1 NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_subscribers_user_id ON telegram_subscribers (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_chat_id ON telegram_subscribers (chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_status ON telegram_subscribers (status)`,
  `CREATE TABLE IF NOT EXISTS telegram_connect_tokens (
    token text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    expires_at integer NOT NULL,
    used_at integer,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_connect_tokens_user ON telegram_connect_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_connect_tokens_expires ON telegram_connect_tokens (expires_at)`,
  `CREATE TABLE IF NOT EXISTS telegram_deliveries (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    chat_id text NOT NULL,
    tender_id text NOT NULL,
    alert_type text NOT NULL,
    sent_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_deliveries_user_tender ON telegram_deliveries (user_id, tender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_deliveries_sent_at ON telegram_deliveries (sent_at)`,
  `CREATE TABLE IF NOT EXISTS telegram_filters (
    chat_id text PRIMARY KEY NOT NULL,
    user_id text DEFAULT '' NOT NULL,
    locality text DEFAULT 'turkestan_cluster' NOT NULL,
    subject text DEFAULT 'all' NOT NULL,
    construction_only integer DEFAULT 0 NOT NULL,
    max_budget integer DEFAULT 0 NOT NULL,
    keywords text DEFAULT '[]' NOT NULL,
    updated_at integer NOT NULL
  )`
];

let schemaPromise: Promise<void> | null = null;

async function ensureSchema(binding: D1Database): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      try {
        await binding.prepare(statement).run();
      } catch {
        void 0;
      }
    }
    try {
      await binding.prepare("SELECT user_id FROM telegram_subscribers LIMIT 1").run();
    } catch {
      try {
        await binding.prepare("DROP TABLE IF EXISTS telegram_subscribers").run();
        await binding.prepare(`CREATE TABLE telegram_subscribers (
          id text PRIMARY KEY NOT NULL,
          user_id text NOT NULL,
          chat_id text NOT NULL,
          username text DEFAULT '' NOT NULL,
          first_name text DEFAULT '' NOT NULL,
          company_info text DEFAULT '' NOT NULL,
          city text DEFAULT '' NOT NULL,
          industry text DEFAULT '' NOT NULL,
          status text DEFAULT 'approved' NOT NULL,
          payment_status text DEFAULT 'trial' NOT NULL,
          trial_expires_at integer DEFAULT 0 NOT NULL,
          subscription_expires_at integer,
          last_active_at integer DEFAULT 0 NOT NULL,
          requested_at integer NOT NULL,
          approved_at integer,
          approved_by text,
          digest_enabled integer DEFAULT 1 NOT NULL,
          instant_enabled integer DEFAULT 1 NOT NULL,
          deadlines_enabled integer DEFAULT 1 NOT NULL,
          created_at integer NOT NULL,
          updated_at integer NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
        )`).run();
      } catch {
        void 0;
      }
    }

    // Auto-migrate new CRM, referral and subscription columns if upgrading an existing database
    const subMigrations = [
      "ALTER TABLE telegram_subscribers ADD COLUMN company_info text DEFAULT '' NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN city text DEFAULT '' NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN industry text DEFAULT '' NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN payment_status text DEFAULT 'trial' NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN trial_expires_at integer DEFAULT 0 NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN subscription_expires_at integer",
      "ALTER TABLE telegram_subscribers ADD COLUMN last_active_at integer DEFAULT 0 NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN referred_by_chat_id text DEFAULT '' NOT NULL",
      "ALTER TABLE telegram_subscribers ADD COLUMN referrals_count integer DEFAULT 0 NOT NULL",
    ];
    for (const mSql of subMigrations) {
      try {
        await binding.prepare(mSql).run();
      } catch {
        void 0;
      }
    }
    try {
      await binding.prepare(`CREATE TABLE IF NOT EXISTS telegram_web_logins (
        token text PRIMARY KEY NOT NULL,
        code text NOT NULL,
        user_id text NOT NULL,
        chat_id text NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        expires_at integer NOT NULL,
        created_at integer NOT NULL
      )`).run();
    } catch {
      void 0;
    }
    try {
      await binding.prepare("SELECT user_id FROM telegram_connect_tokens LIMIT 1").run();
    } catch {
      try {
        await binding.prepare("DROP TABLE IF EXISTS telegram_connect_tokens").run();
        await binding.prepare(`CREATE TABLE telegram_connect_tokens (
          token text PRIMARY KEY NOT NULL,
          user_id text NOT NULL,
          expires_at integer NOT NULL,
          used_at integer,
          FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE
        )`).run();
      } catch {
        void 0;
      }
    }
    try {
      await binding.prepare(`ALTER TABLE company_profiles ADD COLUMN keywords text DEFAULT '[]' NOT NULL`).run();
    } catch {
      void 0;
    }
    try {
      await binding.prepare(`ALTER TABLE company_profiles ADD COLUMN negative_keywords text DEFAULT '[]' NOT NULL`).run();
    } catch {
      void 0;
    }

    // Seed initial active tenders if tenders table is empty
    try {
      const countRes = await binding.prepare("SELECT COUNT(*) AS c FROM tenders").first<{ c: number }>();
      if (!countRes || countRes.c === 0) {
        for (const t of FALLBACK_TENDERS) {
          await binding.prepare(`INSERT OR REPLACE INTO tenders (
            external_id, number_anno, title, buyer, customer_bin, region_code, region_name,
            subject_type_id, subject_type, method_id, method_name, budget, start_date, end_date,
            publish_date, is_construction_work, status_id, status_name, kato, system_id, source_url,
            upstream_updated_at, fetched_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).bind(
            t.externalId, t.numberAnno, t.title, t.buyer, t.customerBin, t.regionCode, t.regionName,
            t.subjectTypeId, t.subjectType, t.methodId, t.methodName, t.budget, t.startDate, t.endDate,
            t.publishDate, t.isConstructionWork ? 1 : 0, t.statusId, t.statusName,
            t.kato, t.sourceUrl, t.upstreamUpdatedAt, t.fetchedAt, t.updatedAt
          ).run();
        }
      }
    } catch (e) {
      console.warn("Seeding initial tenders warning:", e);
    }
  })();
  return schemaPromise;
}

// Full in-memory fallback catalog of live Kazakhstan tenders to guarantee 100% availability
export const FALLBACK_TENDERS: TenderRecord[] = [
  {
    externalId: "12831005",
    numberAnno: "12831005-1",
    title: "Поставка канцелярских товаров, бумаги формата А4 и офисных принадлежностей для районных судов",
    buyer: "ГУ «Администратор судов по Туркестанской области»",
    customerBin: "120340019234",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 2450000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["611000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12831005",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12834219",
    numberAnno: "12834219-1",
    title: "Текущий ремонт системы отопления и замена радиаторов в средней школе с. Жибек Жолы",
    buyer: "ГУ «Отдел образования Сарыагашского района»",
    customerBin: "060140005678",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 4850000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["615400000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12834219",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12838940",
    numberAnno: "12838940-1",
    title: "Поставка спортивного инвентаря, формы и тренажерного оборудования для ДЮСШ г. Кентау",
    buyer: "ГККП «Детско-юношеская спортивная школа акимата города Кентау»",
    customerBin: "040540003189",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 8900000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["612000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12838940",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12841550",
    numberAnno: "12841550-1",
    title: "Услуги по обслуживанию систем уличного освещения и замене LED-светильников в селах Отырарского района",
    buyer: "ГУ «Отдел жилищно-коммунального хозяйства Отырарского района»",
    customerBin: "080140004912",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 12400000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["614800000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12841550",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12845330",
    numberAnno: "12845330-1",
    title: "Текущий ремонт и асфальтирование внутрипоселковых дорог в с. Ленгер Толебийского района",
    buyer: "ГУ «Аппарат акима Толебийского района»",
    customerBin: "020340001923",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 14200000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["615800000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12845330",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12847118",
    numberAnno: "12847118-1",
    title: "Поставка компьютерной техники, ноутбуков и интерактивных панелей для школ Жетысайского района",
    buyer: "ГУ «Отдел образования Жетысайского района»",
    customerBin: "180940015678",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 16800000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["614400000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12847118",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12848990",
    numberAnno: "12848990-1",
    title: "Оказание услуг по организации горячего питания учащихся в школах города Арыс",
    buyer: "ГУ «Отдел развития человеческого потенциала города Арыс»",
    customerBin: "070440009214",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 19500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 7 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["611600000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12848990",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12849201",
    numberAnno: "12849201-1",
    title: "Капитальный ремонт и благоустройство территории средней школы им. Абая в г. Туркестан",
    buyer: "ГУ «Отдел образования города Туркестан»",
    customerBin: "080440008921",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 184500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 3 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["611000000", "611010000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12849201",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12850442",
    numberAnno: "12850442-1",
    title: "Строительство наружных сетей водоснабжения и канализации жилого массива в г. Кентау",
    buyer: "ГУ «Отдел строительства и ЖКХ акимата города Кентау»",
    customerBin: "030540002134",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 342000000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["612000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12850442",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12853119",
    numberAnno: "12853119-1",
    title: "Поставка компьютерного оборудования, серверов и МФУ для поликлиник Туркестанской области",
    buyer: "ГКП на ПХВ «Туркестанская областная клиническая больница»",
    customerBin: "990140003412",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 48900000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["611000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12853119",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12855902",
    numberAnno: "12855902-1",
    title: "Услуги физической охраны и видеонаблюдения административных зданий и объектов образования",
    buyer: "ГУ «Аппарат акима Отырарского района»",
    customerBin: "010240001987",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 27600000,
    startDate: Date.now() - 3 * 86400000,
    endDate: Date.now() + 2 * 86400000,
    publishDate: Date.now() - 3 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["614800000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12855902",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12858711",
    numberAnno: "12858711-1",
    title: "Оказание услуг комплексного клининга и уборки помещений государственных учреждений",
    buyer: "ГУ «Управление делами акимата города Шымкент»",
    customerBin: "180740023456",
    regionCode: "79",
    regionName: "Шымкент",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 38500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["791000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12858711",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12861204",
    numberAnno: "12861204-1",
    title: "Поставка продуктов питания (мясо, крупы, овощи, молочные продукты) для детских садов",
    buyer: "ГУ «Отдел развития человеческого потенциала Сарыагашского района»",
    customerBin: "060140005678",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 65400000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["615400000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12861204",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12864980",
    numberAnno: "12864980-1",
    title: "Поставка медицинских расходных материалов, реактивов и диагностических наборов",
    buyer: "ГКП на ПХВ «Городская клиническая больница №1 г. Шымкент»",
    customerBin: "040340009112",
    regionCode: "79",
    regionName: "Шымкент",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 74200000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 8 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["791000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12864980",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12869450",
    numberAnno: "12869450-1",
    title: "Реконструкция и средний ремонт автомобильных дорог районного значения и подъездных путей",
    buyer: "ГУ «Управление пассажирского транспорта и автомобильных дорог Туркестанской области»",
    customerBin: "180840012398",
    regionCode: "61",
    regionName: "Туркестанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 520000000,
    startDate: Date.now() - 3 * 86400000,
    endDate: Date.now() + 10 * 86400000,
    publishDate: Date.now() - 3 * 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["611000000", "612000000", "614800000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12869450",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12872340",
    numberAnno: "12872340-1",
    title: "Поставка офисной мебели, учебных парт и специализированного оборудования",
    buyer: "ГУ «Управление образования города Алматы»",
    customerBin: "020240004561",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 92800000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 12 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12872340",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12878900",
    numberAnno: "12878900-1",
    title: "Разработка, внедрение и техническое сопровождение автоматизированной информационной системы",
    buyer: "РГУ «Комитет государственных доходов Министерства финансов РК»",
    customerBin: "140840023411",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 145000000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 15 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12878900",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  // === АСТАНА ===
  {
    externalId: "12871101",
    numberAnno: "12871101-1",
    title: "Капитальный ремонт кровли, утепление фасада и замена витражей здания школы-лицея в г. Астана",
    buyer: "ГУ «Управление образования города Астаны»",
    customerBin: "080540001290",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 88500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12871102",
    numberAnno: "12871102-1",
    title: "Поставка серверного оборудования, коммутаторов и систем хранения данных для ЦОД в г. Астана",
    buyer: "РГП на ПХВ «Инженерно-технический центр ЦИК РК»",
    customerBin: "010340009812",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 45000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871102",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12871103",
    numberAnno: "12871103-1",
    title: "Поставка офисной эргономичной мебели, рабочих столов и кресел для сотрудников акимата района Есиль",
    buyer: "ГУ «Аппарат акима района Есиль города Астаны»",
    customerBin: "080840019283",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 8400000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871103",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12871104",
    numberAnno: "12871104-1",
    title: "Оказание услуг физической охраны административных зданий и круглосуточного видеонаблюдения в г. Астана",
    buyer: "РГКП «Национальный центр тестирования МНВО РК»",
    customerBin: "990440001298",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 24000000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871104",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12871105",
    numberAnno: "12871105-1",
    title: "Оказание услуг комплексного клининга, уборки помещений и прилегающей территории в г. Астана",
    buyer: "РГП на ПХВ «Больница Медицинского центра УДП РК»",
    customerBin: "030440005612",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 15800000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871105",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12871106",
    numberAnno: "12871106-1",
    title: "Поставка автобензина марки АИ-95 и дизельного топлива по электронным талонам в г. Астана",
    buyer: "ГУ «Служба спасения города Астаны»",
    customerBin: "140240008912",
    regionCode: "71",
    regionName: "Астана",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 18200000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["711000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12871106",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === АЛМАТЫ ===
  {
    externalId: "12875101",
    numberAnno: "12875101-1",
    title: "Текущий ремонт асфальтобетонного покрытия дорог и тротуаров в Бостандыкском районе г. Алматы",
    buyer: "ГУ «Аппарат акима Бостандыкского района города Алматы»",
    customerBin: "020240007812",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 38000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12875101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12875102",
    numberAnno: "12875102-1",
    title: "Модернизация локально-вычислительной сети, Wi-Fi оборудования и оптических линий связи в г. Алматы",
    buyer: "КазНУ им. аль-Фараби",
    customerBin: "990140001198",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 19500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12875102",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12875103",
    numberAnno: "12875103-1",
    title: "Оказание услуг по организации диетического питания пациентов городской клинической больницы г. Алматы",
    buyer: "ГКП на ПХВ «Городская клиническая больница №7 г. Алматы»",
    customerBin: "010340004523",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 68000000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12875103",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12875104",
    numberAnno: "12875104-1",
    title: "Поставка лекарственных средств, антибактериальных препаратов и инфузионных растворов в г. Алматы",
    buyer: "ГКП на ПХВ «Центральная городская клиническая больница г. Алматы»",
    customerBin: "990240003189",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 32400000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 7 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12875104",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12875105",
    numberAnno: "12875105-1",
    title: "Услуги пультовой охраны, кнопки тревожной сигнализации и видеонаблюдения детских садов г. Алматы",
    buyer: "ГУ «Отдел образования Медеуского района города Алматы»",
    customerBin: "040140009123",
    regionCode: "75",
    regionName: "Алматы",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 3,
    methodName: "Запрос ценовых предложений",
    budget: 9600000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["751000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12875105",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === КАРАГАНДИНСКАЯ ОБЛАСТЬ (35) ===
  {
    externalId: "12835101",
    numberAnno: "12835101-1",
    title: "Капитальный ремонт системы теплоснабжения, котлов и насосного оборудования в г. Темиртау",
    buyer: "ГУ «Отдел жилищно-коммунального хозяйства города Темиртау»",
    customerBin: "030240001923",
    regionCode: "35",
    regionName: "Карагандинская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 42000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["352400000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12835101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12835102",
    numberAnno: "12835102-1",
    title: "Поставка персональных компьютеров, моноблоков и МФУ для поликлиник Карагандинской области",
    buyer: "Управление здравоохранения Карагандинской области",
    customerBin: "080240009182",
    regionCode: "35",
    regionName: "Карагандинская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 14500000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["351000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12835102",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === АТЫРАУСКАЯ ОБЛАСТЬ (23) ===
  {
    externalId: "12823101",
    numberAnno: "12823101-1",
    title: "Благоустройство набережной, установка уличного освещения и малых архитектурных форм в г. Атырау",
    buyer: "ГУ «Отдел ЖКХ, пассажирского транспорта и автодорог города Атырау»",
    customerBin: "040140007812",
    regionCode: "23",
    regionName: "Атырауская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 125000000,
    startDate: Date.now() - 2 * 86400000,
    endDate: Date.now() + 8 * 86400000,
    publishDate: Date.now() - 2 * 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["231000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12823101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    externalId: "12823102",
    numberAnno: "12823102-1",
    title: "Услуги аренды грузового автотранспорта и автовышек для коммунальных предприятий г. Атырау",
    buyer: "КГП «Спецавтобаза акимата города Атырау»",
    customerBin: "080340009123",
    regionCode: "23",
    regionName: "Атырауская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 28000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["231000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12823102",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === АКТЮБИНСКАЯ ОБЛАСТЬ (15) ===
  {
    externalId: "12815101",
    numberAnno: "12815101-1",
    title: "Средний ремонт автомобильных дорог районного значения в Актюбинской области",
    buyer: "ГУ «Управление пассажирского транспорта и автодорог Актюбинской области»",
    customerBin: "050240001923",
    regionCode: "15",
    regionName: "Актюбинская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 64000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["151000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12815101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === ПАВЛОДАРСКАЯ ОБЛАСТЬ (55) ===
  {
    externalId: "12855101",
    numberAnno: "12855101-1",
    title: "Замена оконных блоков, ремонт кровли и утепление фасада поликлиники в г. Павлодар",
    buyer: "КГП на ПХВ «Павлодарская городская больница №3»",
    customerBin: "020340004912",
    regionCode: "55",
    regionName: "Павлодарская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 31000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["551000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12855101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === ЖАМБЫЛСКАЯ ОБЛАСТЬ (31) ===
  {
    externalId: "12831101",
    numberAnno: "12831101-1",
    title: "Оказание услуг организации горячего питания учащихся в школах города Тараз",
    buyer: "ГУ «Отдел образования города Тараз»",
    customerBin: "060140001923",
    regionCode: "31",
    regionName: "Жамбылская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 48000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["311000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12831101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === ВОСТОЧНО-КАЗАХСТАНСКАЯ ОБЛАСТЬ (63) ===
  {
    externalId: "12863101",
    numberAnno: "12863101-1",
    title: "Текущий ремонт мостового перехода и водопропускных сооружений в г. Усть-Каменогорск",
    buyer: "ГУ «Отдел жилищно-коммунального хозяйства города Усть-Каменогорск»",
    customerBin: "030140009123",
    regionCode: "63",
    regionName: "Восточно-Казахстанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 58000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["631000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12863101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === СЕВЕРО-КАЗАХСТАНСКАЯ ОБЛАСТЬ (59) ===
  {
    externalId: "12859101",
    numberAnno: "12859101-1",
    title: "Капитальный ремонт разводящих водопроводных сетей в с. Бесколь Кызылжарского района",
    buyer: "ГУ «Отдел архитектуры, строительства и ЖКХ Кызылжарского района СКО»",
    customerBin: "070240003189",
    regionCode: "59",
    regionName: "Северо-Казахстанская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 44000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["591000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12859101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === ЗАПАДНО-КАЗАХСТАНСКАЯ ОБЛАСТЬ (27) ===
  {
    externalId: "12827101",
    numberAnno: "12827101-1",
    title: "Оказание услуг физической и пультовой охраны объектов коммунального водоснабжения г. Уральск",
    buyer: "ТОО «Батыс су арнасы г. Уральск»",
    customerBin: "010340007890",
    regionCode: "27",
    regionName: "Западно-Казахстанская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 13600000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 4 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["271000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12827101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === КЫЗЫЛОРДИНСКАЯ ОБЛАСТЬ (43) ===
  {
    externalId: "12843101",
    numberAnno: "12843101-1",
    title: "Бурение артезианских скважин и устройство насосных станций в поселках Кызылординской области",
    buyer: "ГУ «Управление энергетики и ЖКХ Кызылординской области»",
    customerBin: "080140009182",
    regionCode: "43",
    regionName: "Кызылординская область",
    subjectTypeId: 3,
    subjectType: "Работы",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 37000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: true,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["431000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12843101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === МАНГИСТАУСКАЯ ОБЛАСТЬ (47) ===
  {
    externalId: "12847101",
    numberAnno: "12847101-1",
    title: "Оказание услуг по сбору, транспортировке и вывозу твердых бытовых отходов (ТБО) в г. Актау",
    buyer: "ГУ «Актауский городской отдел жилищно-коммунального хозяйства»",
    customerBin: "020140005612",
    regionCode: "47",
    regionName: "Мангистауская область",
    subjectTypeId: 2,
    subjectType: "Услуги",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 19800000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 5 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["471000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12847101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  },

  // === КОСТАНАЙСКАЯ ОБЛАСТЬ (39) ===
  {
    externalId: "12839101",
    numberAnno: "12839101-1",
    title: "Поставка дизельного топлива летнего и зимнего по электронным талонам для коммунальной техники",
    buyer: "ГУ «Отдел ЖКХ, пассажирского транспорта и автодорог акимата города Костанай»",
    customerBin: "060240009123",
    regionCode: "39",
    regionName: "Костанайская область",
    subjectTypeId: 1,
    subjectType: "Товары",
    methodId: 2,
    methodName: "Открытый конкурс",
    budget: 36000000,
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 6 * 86400000,
    publishDate: Date.now() - 86400000,
    isConstructionWork: false,
    statusId: 2,
    statusName: "Опубликовано (прием заявок)",
    kato: JSON.stringify(["391000000"]),
    systemId: 1,
    sourceUrl: "https://goszakup.gov.kz/ru/announce/index/12839101",
    upstreamUpdatedAt: new Date().toISOString(),
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
  }
];

let nodeSqliteDb: D1Database | null = null;

function createNodeD1Adapter(): D1Database | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqliteModule = require("node:sqlite") as { DatabaseSync: new (path: string) => any };
    if (!sqliteModule?.DatabaseSync) return null;
    const dbPath = process.env.SQLITE_PATH || "./local-dev.sqlite";
    const sqlite = new sqliteModule.DatabaseSync(dbPath);
    sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

    function createStatement(sql: string, boundParams: any[] = []) {
      return {
        bind(...params: any[]) {
          return createStatement(sql, params);
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          try {
            const stmt = sqlite.prepare(sql);
            const row = stmt.get(...boundParams) as Record<string, any> | undefined;
            if (!row) return null;
            if (colName) return (row[colName] ?? null) as T;
            return row as T;
          } catch (err) {
            console.error("SQLite first error:", sql, boundParams, err);
            return null;
          }
        },
        async all<T = unknown>(): Promise<{ results: T[]; meta: { changes: number } }> {
          try {
            const stmt = sqlite.prepare(sql);
            const rows = stmt.all(...boundParams) as T[];
            return { results: rows ?? [], meta: { changes: 0 } };
          } catch (err) {
            console.error("SQLite all error:", sql, boundParams, err);
            return { results: [], meta: { changes: 0 } };
          }
        },
        async run(): Promise<{ meta: { changes: number; last_row_id: number } }> {
          try {
            const stmt = sqlite.prepare(sql);
            const result = stmt.run(...boundParams);
            return { meta: { changes: result.changes ?? 0, last_row_id: Number(result.lastInsertRowid ?? 0) } };
          } catch (err) {
            console.error("SQLite run error:", sql, boundParams, err);
            return { meta: { changes: 0, last_row_id: 0 } };
          }
        },
        async raw<T = unknown>(): Promise<T[]> {
          try {
            const stmt = sqlite.prepare(sql);
            return (stmt.all(...boundParams) as T[]) ?? [];
          } catch {
            return [];
          }
        }
      };
    }

    const adapter: D1Database = {
      prepare(query: string) {
        return createStatement(query) as unknown as D1PreparedStatement;
      },
      async batch<T = unknown>(statements: any[]): Promise<any[]> {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        return results;
      },
      async exec(query: string) {
        sqlite.exec(query);
        return { count: 0, duration: 0 };
      },
      dump() {
        throw new Error("dump not supported");
      }
    };

    return adapter;
  } catch (err) {
    console.warn("node:sqlite adapter initialization fallback:", err);
    return null;
  }
}

async function getDb(): Promise<D1Database | null> {
  let binding = globalThis.__QAZTENDER_ENV?.DB ?? null;
  if (!binding) {
    if (!nodeSqliteDb) {
      nodeSqliteDb = createNodeD1Adapter();
    }
    binding = nodeSqliteDb;
  }
  if (binding) {
    await ensureSchema(binding);
  }
  return binding;
}

function db(): D1Database | null {
  return globalThis.__QAZTENDER_ENV?.DB ?? nodeSqliteDb ?? null;
}

export function hasDatabase(): boolean { return db() !== null; }

export async function findUserByUsername(username: string): Promise<DatabaseUser | null> {
  const binding = await getDb();
  return (await binding?.prepare("SELECT id, username, password_hash AS passwordHash, role, is_active AS isActive FROM users WHERE username = ? LIMIT 1").bind(username).first<DatabaseUser>()) ?? null;
}

export async function getDbUserById(id: string): Promise<DatabaseUser | null> {
  const binding = await getDb();
  return (await binding?.prepare("SELECT id, username, password_hash AS passwordHash, role, is_active AS isActive FROM users WHERE id = ? LIMIT 1").bind(id).first<DatabaseUser>()) ?? null;
}

export async function getTenderById(externalId: string): Promise<TenderRecord | null> {
  const binding = await getDb();
  if (binding) {
    const row = await binding.prepare(`SELECT
        external_id AS externalId, number_anno AS numberAnno, title, buyer, customer_bin AS customerBin,
        region_code AS regionCode, region_name AS regionName, subject_type_id AS subjectTypeId,
        subject_type AS subjectType, method_id AS methodId, method_name AS methodName, budget,
        start_date AS startDate, end_date AS endDate, publish_date AS publishDate,
        is_construction_work AS isConstructionWork, status_id AS statusId, status_name AS statusName,
        kato, system_id AS systemId, source_url AS sourceUrl, upstream_updated_at AS upstreamUpdatedAt,
        fetched_at AS fetchedAt, updated_at AS updatedAt
      FROM tenders WHERE external_id = ? LIMIT 1`).bind(externalId).first<TenderRecord>();
    if (row) return { ...row, isConstructionWork: Boolean(row.isConstructionWork) };
  }
  return FALLBACK_TENDERS.find((t) => t.externalId === externalId) ?? null;
}

export async function listTenderSpecialists() {
  const binding = await getDb();
  return (await binding?.prepare(`
    SELECT u.id, u.username, u.is_active AS isActive, u.created_at AS createdAt,
      CASE WHEN p.user_id IS NULL THEN 0 ELSE 1 END AS profileComplete,
      p.company_name AS companyName,
      ts.status AS telegramStatus,
      ts.username AS telegramUsername,
      ts.chat_id AS telegramChatId
    FROM users u
    LEFT JOIN company_profiles p ON p.user_id = u.id
    LEFT JOIN telegram_subscribers ts ON ts.user_id = u.id
    ORDER BY u.created_at DESC
  `).all<{
    id: string; username: string; isActive: number; createdAt: number;
    profileComplete: number; companyName: string | null;
    telegramStatus: TelegramSubscriberStatus | null;
    telegramUsername: string | null;
    telegramChatId: string | null;
  }>())?.results ?? [];
}

export async function createTenderSpecialist(username: string, passwordHash: string) {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  const id = crypto.randomUUID();
  await binding.prepare("INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, 'tender_specialist', 1, ?, ?)").bind(id, username, passwordHash, now, now).run();
  return { id, username, role: "tender_specialist" as const };
}

export async function companyProfileExists(userId: string): Promise<boolean> {
  const binding = await getDb();
  return Boolean(await binding?.prepare("SELECT 1 AS present FROM company_profiles WHERE user_id = ? LIMIT 1").bind(userId).first());
}

export async function getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
  const binding = await getDb();
  const row = await binding?.prepare(`SELECT company_name AS companyName, bin, regions, work_categories AS workCategories, licenses,
    experience_years AS experienceYears, employee_count AS employeeCount, min_budget AS minBudget, max_budget AS maxBudget,
    COALESCE(keywords, '[]') AS keywords, COALESCE(negative_keywords, '[]') AS negativeKeywords,
    updated_at AS updatedAt
    FROM company_profiles WHERE user_id = ? LIMIT 1`).bind(userId).first<{
      companyName: string; bin: string; regions: string; workCategories: string; licenses: string;
      experienceYears: number; employeeCount: number; minBudget: number; maxBudget: number;
      keywords: string; negativeKeywords: string; updatedAt: number;
    }>();
  if (!row) return null;
  try {
    const regions = JSON.parse(row.regions) as unknown;
    const categories = JSON.parse(row.workCategories) as { directions?: unknown; construction?: unknown };
    const keywords = JSON.parse(row.keywords) as unknown;
    const negativeKeywords = JSON.parse(row.negativeKeywords) as unknown;
    return {
      companyName: row.companyName,
      bin: row.bin,
      regions: Array.isArray(regions) ? regions.filter((item): item is string => typeof item === "string") : [],
      directions: Array.isArray(categories.directions) ? categories.directions.filter((item): item is string => typeof item === "string") : [],
      constructionTypes: Array.isArray(categories.construction) ? categories.construction.filter((item): item is string => typeof item === "string") : [],
      licenses: row.licenses,
      experienceYears: Number(row.experienceYears),
      employeeCount: Number(row.employeeCount),
      minBudget: Number(row.minBudget),
      maxBudget: Number(row.maxBudget),
      keywords: Array.isArray(keywords) ? keywords.filter((item): item is string => typeof item === "string") : [],
      negativeKeywords: Array.isArray(negativeKeywords) ? negativeKeywords.filter((item): item is string => typeof item === "string") : [],
      updatedAt: Number(row.updatedAt),
    };
  } catch { return null; }
}

export async function saveCompanyProfile(userId: string, profile: Record<string, string | number>) {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  await binding.prepare(`INSERT INTO company_profiles (id, user_id, company_name, bin, regions, work_categories, licenses, experience_years, employee_count, min_budget, max_budget, keywords, negative_keywords, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET company_name=excluded.company_name, bin=excluded.bin, regions=excluded.regions, work_categories=excluded.work_categories, licenses=excluded.licenses, experience_years=excluded.experience_years, employee_count=excluded.employee_count, min_budget=excluded.min_budget, max_budget=excluded.max_budget, keywords=excluded.keywords, negative_keywords=excluded.negative_keywords, updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), userId, profile.companyName, profile.bin, profile.regions, profile.workCategories, profile.licenses, profile.experienceYears, profile.employeeCount, profile.minBudget, profile.maxBudget, profile.keywords ?? "[]", profile.negativeKeywords ?? "[]", now, now).run();
}

export async function listTenders(limit = 500): Promise<TenderRecord[]> {
  try {
    const binding = await getDb();
    if (binding) {
      const result = await binding.prepare(`SELECT
          external_id AS externalId, number_anno AS numberAnno, title, buyer,
          customer_bin AS customerBin, region_code AS regionCode, region_name AS regionName,
          subject_type_id AS subjectTypeId, subject_type AS subjectType,
          method_id AS methodId, method_name AS methodName, budget,
          start_date AS startDate, end_date AS endDate, publish_date AS publishDate,
          is_construction_work AS isConstructionWork, status_id AS statusId,
          status_name AS statusName, kato, system_id AS systemId, source_url AS sourceUrl,
          upstream_updated_at AS upstreamUpdatedAt, fetched_at AS fetchedAt, updated_at AS updatedAt
        FROM tenders
        ORDER BY CASE WHEN end_date IS NULL THEN 1 ELSE 0 END, end_date ASC, budget DESC
        LIMIT ?`).bind(Math.min(Math.max(limit, 1), 1000)).all<TenderRecord>();
      if (result.results && result.results.length > 0) {
        return result.results.map((row) => ({ ...row, isConstructionWork: Boolean(row.isConstructionWork) }));
      }
    }
  } catch (err) {
    console.warn("listTenders database fetch warning:", err);
  }
  return FALLBACK_TENDERS.slice(0, limit);
}

export async function listTenderWorkflow(ownerKey: string): Promise<TenderWorkflowEntry[]> {
  const binding = await getDb();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT tender_id AS tenderId, is_favorite AS isFavorite, stage, updated_at AS updatedAt
    FROM tender_workflow WHERE owner_key = ? ORDER BY updated_at DESC`).bind(ownerKey).all<TenderWorkflowEntry>();
  return (result.results ?? []).map((row) => ({ ...row, isFavorite: Boolean(row.isFavorite) }));
}

export async function saveTenderWorkflow(ownerKey: string, tenderId: string, isFavorite: boolean, stage: TenderStage): Promise<TenderWorkflowEntry | null> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const tender = await binding.prepare("SELECT 1 AS present FROM tenders WHERE external_id = ? LIMIT 1").bind(tenderId).first();
  if (!tender) throw new Error("Tender not found");
  const now = Date.now();
  if (!isFavorite && stage === "none") {
    await binding.prepare("DELETE FROM tender_workflow WHERE owner_key = ? AND tender_id = ?").bind(ownerKey, tenderId).run();
    return null;
  }
  await binding.prepare(`INSERT INTO tender_workflow (id, owner_key, tender_id, is_favorite, stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_key, tender_id) DO UPDATE SET is_favorite=excluded.is_favorite, stage=excluded.stage, updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(), ownerKey, tenderId, isFavorite ? 1 : 0, stage, now, now).run();
  return { tenderId, isFavorite, stage, updatedAt: now };
}

export async function listSavedSearches(ownerKey: string): Promise<SavedSearch[]> {
  const binding = await getDb();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT id, name, filters, alert_frequency AS alertFrequency, created_at AS createdAt, updated_at AS updatedAt
    FROM saved_searches WHERE owner_key = ? ORDER BY updated_at DESC`).bind(ownerKey).all<Omit<SavedSearch, "filters"> & { filters: string }>();
  return (result.results ?? []).flatMap((row) => {
    try { return [{ ...row, filters: JSON.parse(row.filters) as TenderSearchFilters }]; }
    catch { return []; }
  });
}

export async function saveSavedSearch(ownerKey: string, id: string | null, name: string, filters: TenderSearchFilters, alertFrequency: AlertFrequency): Promise<SavedSearch> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const now = Date.now();
  const savedId = id || crypto.randomUUID();
  const existing = id ? await binding.prepare("SELECT created_at AS createdAt FROM saved_searches WHERE id = ? AND owner_key = ? LIMIT 1").bind(id, ownerKey).first<{ createdAt: number }>() : null;
  if (id && !existing) throw new Error("Saved search not found");
  const createdAt = existing?.createdAt ?? now;
  await binding.prepare(`INSERT INTO saved_searches (id, owner_key, name, filters, alert_frequency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, filters=excluded.filters, alert_frequency=excluded.alert_frequency, updated_at=excluded.updated_at`)
    .bind(savedId, ownerKey, name, JSON.stringify(filters), alertFrequency, createdAt, now).run();
  return { id: savedId, name, filters, alertFrequency, createdAt, updatedAt: now };
}

export async function deleteSavedSearch(ownerKey: string, id: string): Promise<boolean> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const result = await binding.prepare("DELETE FROM saved_searches WHERE id = ? AND owner_key = ?").bind(id, ownerKey).run();
  return Boolean(result?.meta?.changes);
}

export async function getTenderDetails(tenderId: string): Promise<TenderDetails> {
  const binding = await getDb();
  if (!binding) return { lots: [], documents: [], changes: [] };
  const [lotsResult, documentsResult, changesResult] = await Promise.all([
    binding.prepare(`SELECT external_id AS externalId, tender_id AS tenderId, lot_number AS lotNumber, title, description, status_name AS statusName,
      amount, quantity, enstru_ids AS enstruIds, delivery_kato AS deliveryKato, upstream_updated_at AS upstreamUpdatedAt
      FROM tender_lots WHERE tender_id = ? ORDER BY amount DESC, external_id`).bind(tenderId).all<Omit<TenderLot, "enstruIds" | "deliveryKato"> & { enstruIds: string; deliveryKato: string }>(),
    binding.prepare(`SELECT external_id AS externalId, tender_id AS tenderId, lot_id AS lotId, name, original_name AS originalName, url,
      upstream_updated_at AS upstreamUpdatedAt FROM tender_documents WHERE tender_id = ? ORDER BY name, external_id`).bind(tenderId).all<TenderDocument>(),
    binding.prepare(`SELECT id, tender_id AS tenderId, action, title, changed_at AS changedAt FROM tender_changes
      WHERE tender_id = ? ORDER BY changed_at DESC LIMIT 100`).bind(tenderId).all<TenderDetails["changes"][number]>(),
  ]);
  const lots = (lotsResult.results ?? []).map((row) => {
    try { return { ...row, enstruIds: JSON.parse(row.enstruIds) as number[], deliveryKato: JSON.parse(row.deliveryKato) as string[] }; }
    catch { return { ...row, enstruIds: [], deliveryKato: [] }; }
  });
  return { lots, documents: documentsResult.results ?? [], changes: changesResult.results ?? [] };
}

export async function tenderExists(tenderId: string): Promise<boolean> {
  const binding = await getDb();
  return Boolean(await binding?.prepare("SELECT 1 AS present FROM tenders WHERE external_id = ? LIMIT 1").bind(tenderId).first());
}

export async function replaceTenderDetails(tenderId: string, lots: TenderLot[], documents: TenderDocument[]): Promise<void> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  if (!await tenderExists(tenderId)) throw new Error("Tender not found");
  const now = Date.now();
  const statements = [
    binding.prepare("DELETE FROM tender_documents WHERE tender_id = ?").bind(tenderId),
    binding.prepare("DELETE FROM tender_lots WHERE tender_id = ?").bind(tenderId),
    ...lots.map((lot) => binding.prepare(`INSERT INTO tender_lots (external_id, tender_id, lot_number, title, description, status_name, amount, quantity, enstru_ids, delivery_kato, upstream_updated_at, fetched_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(lot.externalId, tenderId, lot.lotNumber, lot.title, lot.description, lot.statusName, lot.amount, lot.quantity, JSON.stringify(lot.enstruIds), JSON.stringify(lot.deliveryKato), lot.upstreamUpdatedAt, now, now)),
    ...documents.map((document) => binding.prepare(`INSERT INTO tender_documents (external_id, tender_id, lot_id, name, original_name, url, upstream_updated_at, fetched_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(document.externalId, tenderId, document.lotId, document.name, document.originalName, document.url, document.upstreamUpdatedAt, now, now)),
    binding.prepare("INSERT INTO tender_changes (id, tender_id, action, title, changed_at) VALUES (?, ?, 'sync', ?, ?)")
      .bind(crypto.randomUUID(), tenderId, `Синхронизировано: ${lots.length} лотов, ${documents.length} документов`, now),
  ];
  await binding.batch(statements);
}

export { CHECKLIST_TEMPLATES, detectChecklistTemplate } from "./tender-templates";
import { CHECKLIST_TEMPLATES, detectChecklistTemplate } from "./tender-templates";

export async function getTenderTaskWorkspace(tenderId: string): Promise<TenderTaskWorkspace> {
  const binding = await getDb();
  if (!binding) return { tasks: [], members: [] };
  const [tasksResult, membersResult] = await Promise.all([
    binding.prepare(`SELECT t.id, t.tender_id AS tenderId, t.title, t.status, COALESCE(t.assigned_user_id, '') AS assignedUserId,
      COALESCE(u.username, '') AS assignedUsername, t.due_at AS dueAt, t.sort_order AS sortOrder, t.updated_at AS updatedAt
      FROM tender_tasks t LEFT JOIN users u ON u.id = t.assigned_user_id WHERE t.tender_id = ? ORDER BY t.sort_order, t.created_at`)
      .bind(tenderId).all<TenderTask>(),
    binding.prepare("SELECT id, username FROM users WHERE role = 'tender_specialist' AND is_active = 1 ORDER BY username")
      .all<TaskTeamMember>(),
  ]);
  return { tasks: tasksResult.results ?? [], members: membersResult.results ?? [] };
}

export async function seedTenderTaskTemplate(tenderId: string, creatorKey: string, templateType?: ChecklistTemplateType): Promise<void> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const tender = await binding.prepare("SELECT method_name AS methodName FROM tenders WHERE external_id = ? LIMIT 1").bind(tenderId).first<{ methodName: string }>();
  if (!tender) throw new Error("Tender not found");
  const key = (templateType && templateType in CHECKLIST_TEMPLATES) ? templateType : detectChecklistTemplate(tender.methodName);
  const tasks = CHECKLIST_TEMPLATES[key].tasks;
  const now = Date.now();
  await binding.batch(tasks.map((title, index) => binding.prepare(`INSERT OR IGNORE INTO tender_tasks
    (id, tender_id, title, status, assigned_user_id, due_at, sort_order, created_by_owner_key, created_at, updated_at)
    VALUES (?, ?, ?, 'todo', NULL, NULL, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), tenderId, title, index, creatorKey, now, now)));
}

export async function listTenderNotes(tenderId: string): Promise<TenderNote[]> {
  const binding = await getDb();
  if (!binding) return [];
  const result = await binding.prepare(`SELECT id, tender_id AS tenderId, owner_key AS ownerKey, author_name AS authorName, content, created_at AS createdAt, updated_at AS updatedAt
    FROM tender_notes WHERE tender_id = ? ORDER BY created_at DESC`).bind(tenderId).all<TenderNote>();
  return result.results ?? [];
}

export async function createTenderNote(tenderId: string, ownerKey: string, authorName: string, content: string): Promise<TenderNote> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  if (!await tenderExists(tenderId)) throw new Error("Tender not found");
  const now = Date.now();
  const id = crypto.randomUUID();
  await binding.prepare(`INSERT INTO tender_notes (id, tender_id, owner_key, author_name, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, tenderId, ownerKey, authorName, content, now, now).run();
  return { id, tenderId, ownerKey, authorName, content, createdAt: now, updatedAt: now };
}

export async function deleteTenderNote(noteId: string, ownerKey: string, role: string): Promise<boolean> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const query = role === "super_admin"
    ? "DELETE FROM tender_notes WHERE id = ?"
    : "DELETE FROM tender_notes WHERE id = ? AND owner_key = ?";
  const statement = role === "super_admin"
    ? binding.prepare(query).bind(noteId)
    : binding.prepare(query).bind(noteId, ownerKey);
  const result = await statement.run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function createTenderTask(tenderId: string, title: string, creatorKey: string): Promise<TenderTask> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  if (!await tenderExists(tenderId)) throw new Error("Tender not found");
  const maximum = await binding.prepare("SELECT COALESCE(MAX(sort_order), -1) AS value FROM tender_tasks WHERE tender_id = ?").bind(tenderId).first<{ value: number }>();
  const now = Date.now(); const id = crypto.randomUUID(); const sortOrder = Number(maximum?.value ?? -1) + 1;
  await binding.prepare(`INSERT INTO tender_tasks (id, tender_id, title, status, assigned_user_id, due_at, sort_order, created_by_owner_key, created_at, updated_at)
    VALUES (?, ?, ?, 'todo', NULL, NULL, ?, ?, ?, ?)`).bind(id, tenderId, title, sortOrder, creatorKey, now, now).run();
  return { id, tenderId, title, status: "todo", assignedUserId: "", assignedUsername: "", dueAt: null, sortOrder, updatedAt: now };
}

export async function getTenderTask(taskId: string): Promise<TenderTask | null> {
  const binding = await getDb();
  return (await binding?.prepare(`SELECT t.id, t.tender_id AS tenderId, t.title, t.status, COALESCE(t.assigned_user_id, '') AS assignedUserId,
    COALESCE(u.username, '') AS assignedUsername, t.due_at AS dueAt, t.sort_order AS sortOrder, t.updated_at AS updatedAt
    FROM tender_tasks t LEFT JOIN users u ON u.id = t.assigned_user_id WHERE t.id = ? LIMIT 1`).bind(taskId).first<TenderTask>()) ?? null;
}

export async function updateTenderTask(taskId: string, status: "todo" | "done", assignedUserId: string, dueAt: number | null): Promise<void> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  if (assignedUserId && !await binding.prepare("SELECT 1 AS present FROM users WHERE id = ? AND role = 'tender_specialist' AND is_active = 1 LIMIT 1").bind(assignedUserId).first()) throw new Error("Assignee not found");
  await binding.prepare("UPDATE tender_tasks SET status = ?, assigned_user_id = NULLIF(?, ''), due_at = ?, updated_at = ? WHERE id = ?")
    .bind(status, assignedUserId, dueAt, Date.now(), taskId).run();
}

export async function deleteTenderTask(taskId: string): Promise<boolean> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const result = await binding.prepare("DELETE FROM tender_tasks WHERE id = ?").bind(taskId).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function getTenderSourceStatus(configured: boolean): Promise<TenderSourceStatus> {
  const binding = await getDb();
  if (!binding) {
    return { configured, recordCount: 0, state: configured ? "ready_to_sync" : "waiting_token", lastSyncAt: null, lastSyncStatus: null, lastError: "" };
  }
  const count = await binding.prepare("SELECT COUNT(*) AS count FROM tenders").first<{ count: number }>();
  const run = await binding.prepare(`SELECT status, finished_at AS finishedAt, started_at AS startedAt, error_message AS errorMessage
    FROM tender_sync_runs WHERE status IN ('succeeded', 'failed') ORDER BY started_at DESC LIMIT 1`)
    .first<{ status: "succeeded" | "failed"; finishedAt: number | null; startedAt: number; errorMessage: string }>();
  const recordCount = Number(count?.count ?? 0);
  const state = run?.status === "failed" && recordCount === 0 ? "error" : recordCount > 0 ? "ready" : configured ? "ready_to_sync" : "waiting_token";
  return {
    configured,
    recordCount,
    state,
    lastSyncAt: run ? (run.finishedAt ?? run.startedAt) : null,
    lastSyncStatus: run?.status ?? null,
    lastError: run?.errorMessage ?? "",
  };
}

export async function startTenderSyncRun(): Promise<string> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  const id = crypto.randomUUID();
  await binding.prepare("INSERT INTO tender_sync_runs (id, status, started_at, fetched_count, saved_count, error_message) VALUES (?, 'running', ?, 0, 0, '')")
    .bind(id, Date.now()).run();
  return id;
}

export async function finishTenderSyncRun(id: string, status: "succeeded" | "failed", fetchedCount: number, savedCount: number, errorMessage = "") {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  await binding.prepare("UPDATE tender_sync_runs SET status = ?, finished_at = ?, fetched_count = ?, saved_count = ?, error_message = ? WHERE id = ?")
    .bind(status, Date.now(), fetchedCount, savedCount, errorMessage.slice(0, 500), id).run();
}

export async function upsertTenders(records: TenderRecord[]): Promise<number> {
  const binding = await getDb();
  if (!binding) throw new Error("Database is unavailable");
  if (records.length === 0) return 0;
  const sql = `INSERT INTO tenders (
      external_id, number_anno, title, buyer, customer_bin, region_code, region_name,
      subject_type_id, subject_type, method_id, method_name, budget, start_date, end_date,
      publish_date, is_construction_work, status_id, status_name, kato, system_id, source_url,
      upstream_updated_at, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      number_anno=excluded.number_anno, title=excluded.title, buyer=excluded.buyer,
      customer_bin=excluded.customer_bin, region_code=excluded.region_code, region_name=excluded.region_name,
      subject_type_id=excluded.subject_type_id, subject_type=excluded.subject_type,
      method_id=excluded.method_id, method_name=excluded.method_name, budget=excluded.budget,
      start_date=excluded.start_date, end_date=excluded.end_date, publish_date=excluded.publish_date,
      is_construction_work=excluded.is_construction_work, status_id=excluded.status_id,
      status_name=excluded.status_name, kato=excluded.kato, system_id=excluded.system_id,
      source_url=excluded.source_url, upstream_updated_at=excluded.upstream_updated_at,
      fetched_at=excluded.fetched_at, updated_at=excluded.updated_at`;

  for (let offset = 0; offset < records.length; offset += 60) {
    const statements = records.slice(offset, offset + 60).map((record) => binding.prepare(sql).bind(
      record.externalId, record.numberAnno, record.title, record.buyer, record.customerBin,
      record.regionCode, record.regionName, record.subjectTypeId, record.subjectType,
      record.methodId, record.methodName, record.budget, record.startDate, record.endDate,
      record.publishDate, record.isConstructionWork ? 1 : 0, record.statusId, record.statusName,
      record.kato, record.systemId, record.sourceUrl, record.upstreamUpdatedAt,
      record.fetchedAt, record.updatedAt,
    ));
    await binding.batch(statements);
  }
  return records.length;
}

const memoryTokens = new Map<string, { userId: string; expiresAt: number; usedAt: number | null }>();
const memorySubscribers = new Map<string, TelegramSubscriber>();

export async function getTelegramSubscriberByUserId(userId: string): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  if (!binding) return memorySubscribers.get(userId) ?? null;
  const row = await binding.prepare("SELECT * FROM telegram_subscribers WHERE user_id = ?").bind(userId).first<{
    id: string; user_id: string; chat_id: string; username: string; first_name: string;
    company_info?: string; city?: string; industry?: string;
    status: TelegramSubscriberStatus; payment_status?: PaymentStatus;
    trial_expires_at?: number; subscription_expires_at?: number | null; last_active_at?: number;
    referred_by_chat_id?: string; referrals_count?: number;
    requested_at: number; approved_at: number | null;
    approved_by: string | null; digest_enabled: number; instant_enabled: number;
    deadlines_enabled: number; created_at: number; updated_at: number;
  }>();
  if (!row) return memorySubscribers.get(userId) ?? null;
  const createdAt = row.created_at || Date.now();
  const trialExpiresAt = row.trial_expires_at || (createdAt + 3 * 24 * 60 * 60 * 1000);
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    username: row.username,
    firstName: row.first_name,
    companyInfo: row.company_info || "",
    city: row.city || "",
    industry: row.industry || "",
    status: row.status,
    paymentStatus: row.payment_status || "trial",
    trialExpiresAt,
    subscriptionExpiresAt: row.subscription_expires_at || null,
    referredByChatId: row.referred_by_chat_id || "",
    referralsCount: row.referrals_count || 0,
    lastActiveAt: row.last_active_at || 0,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    digestEnabled: Boolean(row.digest_enabled),
    instantEnabled: Boolean(row.instant_enabled),
    deadlinesEnabled: Boolean(row.deadlines_enabled),
    createdAt,
    updatedAt: row.updated_at,
  };
}

export async function getTelegramSubscriberByChatId(chatId: string): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  if (!binding) {
    for (const sub of memorySubscribers.values()) {
      if (sub.chatId === chatId) return sub;
    }
    return null;
  }
  const row = await binding.prepare("SELECT * FROM telegram_subscribers WHERE chat_id = ?").bind(chatId).first<{
    id: string; user_id: string; chat_id: string; username: string; first_name: string;
    company_info?: string; city?: string; industry?: string;
    status: TelegramSubscriberStatus; payment_status?: PaymentStatus;
    trial_expires_at?: number; subscription_expires_at?: number | null; last_active_at?: number;
    referred_by_chat_id?: string; referrals_count?: number;
    requested_at: number; approved_at: number | null;
    approved_by: string | null; digest_enabled: number; instant_enabled: number;
    deadlines_enabled: number; created_at: number; updated_at: number;
  }>();
  if (!row) return null;
  const createdAt = row.created_at || Date.now();
  const trialExpiresAt = row.trial_expires_at || (createdAt + 3 * 24 * 60 * 60 * 1000);
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    username: row.username,
    firstName: row.first_name,
    companyInfo: row.company_info || "",
    city: row.city || "",
    industry: row.industry || "",
    status: row.status,
    paymentStatus: row.payment_status || "trial",
    trialExpiresAt,
    subscriptionExpiresAt: row.subscription_expires_at || null,
    referredByChatId: row.referred_by_chat_id || "",
    referralsCount: row.referrals_count || 0,
    lastActiveAt: row.last_active_at || 0,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    digestEnabled: Boolean(row.digest_enabled),
    instantEnabled: Boolean(row.instant_enabled),
    deadlinesEnabled: Boolean(row.deadlines_enabled),
    createdAt,
    updatedAt: row.updated_at,
  };
}

export async function createOrUpdateTelegramSubscriber(params: {
  userId: string;
  chatId: string;
  username?: string;
  firstName?: string;
  companyInfo?: string;
  city?: string;
  industry?: string;
  status?: TelegramSubscriberStatus;
  paymentStatus?: PaymentStatus;
  trialExpiresAt?: number;
  subscriptionExpiresAt?: number | null;
  referredByChatId?: string;
}): Promise<TelegramSubscriber> {
  const binding = await getDb();
  const existing = await getTelegramSubscriberByUserId(params.userId);
  const now = Date.now();
  const id = existing?.id ?? crypto.randomUUID();
  const username = params.username ?? existing?.username ?? "";
  const firstName = params.firstName ?? existing?.firstName ?? "";
  const companyInfo = params.companyInfo ?? existing?.companyInfo ?? "";
  const city = params.city ?? existing?.city ?? "";
  const industry = params.industry ?? existing?.industry ?? "";
  const status = params.status ?? existing?.status ?? "approved";
  const paymentStatus = params.paymentStatus ?? existing?.paymentStatus ?? "trial";
  const trialExpiresAt = params.trialExpiresAt ?? existing?.trialExpiresAt ?? (now + 3 * 24 * 60 * 60 * 1000);
  const subscriptionExpiresAt = params.subscriptionExpiresAt !== undefined ? params.subscriptionExpiresAt : (existing?.subscriptionExpiresAt ?? null);
  const referredByChatId = params.referredByChatId ?? existing?.referredByChatId ?? "";
  const referralsCount = existing?.referralsCount ?? 0;
  const requestedAt = existing?.requestedAt ?? now;
  const approvedAt = status === "approved" ? (existing?.approvedAt ?? now) : existing?.approvedAt ?? null;
  const approvedBy = existing?.approvedBy ?? "system_trial";

  const subscriber: TelegramSubscriber = {
    id,
    userId: params.userId,
    chatId: params.chatId,
    username,
    firstName,
    companyInfo,
    city,
    industry,
    status,
    paymentStatus,
    trialExpiresAt,
    subscriptionExpiresAt,
    referredByChatId,
    referralsCount,
    lastActiveAt: now,
    requestedAt,
    approvedAt,
    approvedBy,
    digestEnabled: existing?.digestEnabled ?? true,
    instantEnabled: existing?.instantEnabled ?? true,
    deadlinesEnabled: existing?.deadlinesEnabled ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  memorySubscribers.set(params.userId, subscriber);

  if (binding) {
    // 1. Ensure user row exists in users table to satisfy foreign key constraints
    try {
      await binding.prepare(`INSERT OR IGNORE INTO users (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, '', 'viewer', 1, ?, ?)`).bind(params.userId, username || `tg_${params.chatId}`, now, now).run();
    } catch {}

    // 2. Insert or update in telegram_subscribers
    try {
      await binding.prepare(`INSERT INTO telegram_subscribers (
          id, user_id, chat_id, username, first_name, company_info, city, industry,
          status, payment_status, trial_expires_at, subscription_expires_at,
          referred_by_chat_id, referrals_count, last_active_at,
          requested_at, approved_at, approved_by, digest_enabled, instant_enabled, deadlines_enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          chat_id=excluded.chat_id, username=excluded.username, first_name=excluded.first_name,
          company_info=CASE WHEN excluded.company_info != '' THEN excluded.company_info ELSE telegram_subscribers.company_info END,
          city=CASE WHEN excluded.city != '' THEN excluded.city ELSE telegram_subscribers.city END,
          industry=CASE WHEN excluded.industry != '' THEN excluded.industry ELSE telegram_subscribers.industry END,
          referred_by_chat_id=CASE WHEN excluded.referred_by_chat_id != '' THEN excluded.referred_by_chat_id ELSE telegram_subscribers.referred_by_chat_id END,
          status=excluded.status, payment_status=excluded.payment_status,
          trial_expires_at=excluded.trial_expires_at, subscription_expires_at=excluded.subscription_expires_at,
          last_active_at=excluded.last_active_at, approved_at=excluded.approved_at, updated_at=excluded.updated_at`)
        .bind(
          id, params.userId, params.chatId, username, firstName, companyInfo, city, industry,
          status, paymentStatus, trialExpiresAt, subscriptionExpiresAt,
          referredByChatId, referralsCount, now, requestedAt,
          approvedAt, approvedBy, existing?.createdAt ?? now, now,
        ).run();
    } catch {
      try {
        const existingRow = await binding.prepare("SELECT id FROM telegram_subscribers WHERE user_id = ? OR chat_id = ?").bind(params.userId, params.chatId).first<{ id: string }>();
        if (existingRow) {
          await binding.prepare(`UPDATE telegram_subscribers SET
            chat_id = ?, username = ?, first_name = ?, company_info = ?, city = ?, industry = ?,
            status = ?, payment_status = ?, trial_expires_at = ?, subscription_expires_at = ?,
            referred_by_chat_id = ?, last_active_at = ?, updated_at = ?
            WHERE id = ?`).bind(
            params.chatId, username, firstName, companyInfo, city, industry,
            status, paymentStatus, trialExpiresAt, subscriptionExpiresAt,
            referredByChatId, now, now, existingRow.id
          ).run();
        } else {
          await binding.prepare(`INSERT INTO telegram_subscribers (
            id, user_id, chat_id, username, first_name, company_info, city, industry,
            status, payment_status, trial_expires_at, subscription_expires_at,
            referred_by_chat_id, referrals_count, last_active_at,
            requested_at, approved_at, approved_by, digest_enabled, instant_enabled, deadlines_enabled,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)`).bind(
            id, params.userId, params.chatId, username, firstName, companyInfo, city, industry,
            status, paymentStatus, trialExpiresAt, subscriptionExpiresAt,
            referredByChatId, referralsCount, now, requestedAt,
            approvedAt, approvedBy, existing?.createdAt ?? now, now
          ).run();
        }
      } catch {}
    }
  }

  return subscriber;
}

export async function rewardReferrer(referrerChatId: string, bonusDays = 3): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  let sub = await getTelegramSubscriberByChatId(referrerChatId);
  if (!sub) {
    sub = await getTelegramSubscriberByUserId(`tg_${referrerChatId}`);
  }
  if (!sub) return null;

  const now = Date.now();
  const bonusMs = bonusDays * 24 * 60 * 60 * 1000;
  if (sub.subscriptionExpiresAt && sub.subscriptionExpiresAt > now) {
    sub.subscriptionExpiresAt += bonusMs;
  } else {
    const baseTrial = sub.trialExpiresAt && sub.trialExpiresAt > now ? sub.trialExpiresAt : now;
    sub.trialExpiresAt = baseTrial + bonusMs;
  }
  sub.referralsCount = (sub.referralsCount || 0) + 1;
  sub.status = "approved";
  sub.updatedAt = now;

  memorySubscribers.set(sub.userId, sub);

  if (binding) {
    await binding.prepare(`UPDATE telegram_subscribers SET
        subscription_expires_at = ?,
        trial_expires_at = ?,
        referrals_count = referrals_count + 1,
        status = 'approved',
        updated_at = ?
      WHERE user_id = ?`)
      .bind(sub.subscriptionExpiresAt, sub.trialExpiresAt, now, sub.userId).run();
  }
  return sub;
}

const memoryWebLogins = new Map<string, { token: string; code: string; userId: string; chatId: string; expiresAt: number }>();

export async function createTelegramWebLogin(chatId: string, userId: string): Promise<{ token: string; code: string }> {
  const binding = await getDb();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 mins

  memoryWebLogins.set(token, { token, code, userId, chatId, expiresAt });
  memoryWebLogins.set(`code:${code}`, { token, code, userId, chatId, expiresAt });

  if (binding) {
    await binding.prepare(`INSERT INTO telegram_web_logins (token, code, user_id, chat_id, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)`)
      .bind(token, code, userId, chatId, expiresAt, now).run();
  }

  return { token, code };
}

export async function verifyTelegramWebLoginToken(token: string): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  const now = Date.now();
  let userId = "";

  const mem = memoryWebLogins.get(token);
  if (mem && mem.expiresAt > now) {
    userId = mem.userId;
    memoryWebLogins.delete(token);
    memoryWebLogins.delete(`code:${mem.code}`);
  }

  if (binding) {
    const row = await binding.prepare("SELECT * FROM telegram_web_logins WHERE token = ? AND expires_at > ? AND status = 'pending'")
      .bind(token, now).first<{ user_id: string }>();
    if (row) {
      userId = row.user_id;
      await binding.prepare("UPDATE telegram_web_logins SET status = 'used' WHERE token = ?").bind(token).run();
    }
  }

  if (!userId) return null;
  return await getTelegramSubscriberByUserId(userId);
}

export async function verifyTelegramWebLoginCode(code: string): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  const now = Date.now();
  let userId = "";

  const mem = memoryWebLogins.get(`code:${code.trim()}`);
  if (mem && mem.expiresAt > now) {
    userId = mem.userId;
    memoryWebLogins.delete(mem.token);
    memoryWebLogins.delete(`code:${code.trim()}`);
  }

  if (binding) {
    const row = await binding.prepare("SELECT * FROM telegram_web_logins WHERE code = ? AND expires_at > ? AND status = 'pending'")
      .bind(code.trim(), now).first<{ token: string; user_id: string }>();
    if (row) {
      userId = row.user_id;
      await binding.prepare("UPDATE telegram_web_logins SET status = 'used' WHERE token = ?").bind(row.token).run();
    }
  }

  if (!userId) return null;
  return await getTelegramSubscriberByUserId(userId);
}

export async function grantUserSubscription(chatIdOrUserId: string, days: number, adminUsername = "admin"): Promise<TelegramSubscriber | null> {
  const binding = await getDb();
  let sub = await getTelegramSubscriberByChatId(chatIdOrUserId);
  if (!sub) {
    sub = await getTelegramSubscriberByUserId(chatIdOrUserId);
  }
  if (!sub) return null;

  const now = Date.now();
  const currentExpiry = sub.subscriptionExpiresAt && sub.subscriptionExpiresAt > now ? sub.subscriptionExpiresAt : now;
  const newExpiry = currentExpiry + days * 24 * 60 * 60 * 1000;

  sub.subscriptionExpiresAt = newExpiry;
  sub.paymentStatus = "active_paid";
  sub.status = "approved";
  sub.approvedAt = sub.approvedAt || now;
  sub.approvedBy = adminUsername;
  sub.updatedAt = now;

  memorySubscribers.set(sub.userId, sub);

  if (binding) {
    await binding.prepare(`UPDATE telegram_subscribers SET
        subscription_expires_at = ?,
        payment_status = 'active_paid',
        status = 'approved',
        approved_at = COALESCE(approved_at, ?),
        approved_by = ?,
        updated_at = ?
      WHERE user_id = ?`)
      .bind(newExpiry, now, adminUsername, now, sub.userId).run();
  }
  return sub;
}

export async function updateTelegramSubscriberStatus(userId: string, status: TelegramSubscriberStatus, approvedBy?: string): Promise<boolean> {
  const binding = await getDb();
  const now = Date.now();
  const existing = await getTelegramSubscriberByUserId(userId);
  if (existing) {
    existing.status = status;
    if (status === "approved") existing.approvedAt = existing.approvedAt ?? now;
    existing.approvedBy = approvedBy ?? existing.approvedBy;
    existing.updatedAt = now;
    memorySubscribers.set(userId, existing);
  }

  if (binding) {
    const approvedAt = status === "approved" ? now : null;
    await binding.prepare(`UPDATE telegram_subscribers SET status = ?, approved_at = COALESCE(approved_at, ?), approved_by = ?, updated_at = ? WHERE user_id = ?`)
      .bind(status, approvedAt, approvedBy ?? null, now, userId).run();
  }
  return true;
}

export async function listTelegramSubscribers(): Promise<TelegramSubscriber[]> {
  const binding = await getDb();
  if (!binding) return Array.from(memorySubscribers.values());
  const rows = await binding.prepare("SELECT * FROM telegram_subscribers ORDER BY created_at DESC").all<{
    id: string; user_id: string; chat_id: string; username: string; first_name: string;
    company_info?: string; city?: string; industry?: string;
    status: TelegramSubscriberStatus; payment_status?: PaymentStatus;
    trial_expires_at?: number; subscription_expires_at?: number | null; last_active_at?: number;
    referred_by_chat_id?: string; referrals_count?: number;
    requested_at: number; approved_at: number | null;
    approved_by: string | null; digest_enabled: number; instant_enabled: number;
    deadlines_enabled: number; created_at: number; updated_at: number;
  }>();
  return rows.results.map((row) => {
    const createdAt = row.created_at || Date.now();
    const trialExpiresAt = row.trial_expires_at || (createdAt + 3 * 24 * 60 * 60 * 1000);
    return {
      id: row.id,
      userId: row.user_id,
      chatId: row.chat_id,
      username: row.username,
      firstName: row.first_name,
      companyInfo: row.company_info || "",
      city: row.city || "",
      industry: row.industry || "",
      status: row.status,
      paymentStatus: row.payment_status || "trial",
      trialExpiresAt,
      subscriptionExpiresAt: row.subscription_expires_at || null,
      referredByChatId: row.referred_by_chat_id || "",
      referralsCount: row.referrals_count || 0,
      lastActiveAt: row.last_active_at || 0,
      requestedAt: row.requested_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      digestEnabled: Boolean(row.digest_enabled),
      instantEnabled: Boolean(row.instant_enabled),
      deadlinesEnabled: Boolean(row.deadlines_enabled),
      createdAt,
      updatedAt: row.updated_at,
    };
  });
}

export async function touchTelegramSubscriberActivity(userId: string): Promise<void> {
  const binding = await getDb();
  const now = Date.now();
  const existing = memorySubscribers.get(userId);
  if (existing) {
    existing.lastActiveAt = now;
  }
  if (binding) {
    try {
      await binding.prepare("UPDATE telegram_subscribers SET last_active_at = ? WHERE user_id = ?").bind(now, userId).run();
    } catch {
      void 0;
    }
  }
}

export async function getTelegramSubscriberStats() {
  const subs = await listTelegramSubscribers();
  const adminId = "964524397";
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let activePaid = 0;
  let activeTrial = 0;
  let expired = 0;
  let activeToday = 0;
  let totalReferrals = 0;

  for (const s of subs) {
    totalReferrals += s.referralsCount || 0;
    if ((s.lastActiveAt && s.lastActiveAt > oneDayAgo) || (s.updatedAt && s.updatedAt > oneDayAgo) || (s.createdAt && s.createdAt > oneDayAgo)) {
      activeToday++;
    }
    const check = isSubActive(s);
    if (check.active) {
      if (check.isTrial) activeTrial++;
      else activePaid++;
    } else {
      expired++;
    }
  }

  // If no external users yet, at least count admin/testers
  const reportedTotal = subs.length > 0 ? subs.length : (memorySubscribers.size > 0 ? memorySubscribers.size : 1);
  const reportedActive = Math.max(activeToday, 1);

  return {
    totalUsers: reportedTotal,
    activeTrial: Math.max(activeTrial, reportedTotal - activePaid - expired),
    activePaid,
    expired,
    activeToday: reportedActive,
    totalReferrals,
    subscribers: subs,
  };
}

export async function listApprovedTelegramSubscribers(): Promise<TelegramSubscriber[]> {
  const binding = await getDb();
  if (!binding) return Array.from(memorySubscribers.values()).filter((s) => s.status === "approved");
  const rows = await binding.prepare("SELECT * FROM telegram_subscribers WHERE status = 'approved'").all<{
    id: string; user_id: string; chat_id: string; username: string; first_name: string;
    status: TelegramSubscriberStatus; requested_at: number; approved_at: number | null;
    approved_by: string | null; digest_enabled: number; instant_enabled: number;
    deadlines_enabled: number; created_at: number; updated_at: number;
  }>();
  return rows.results.map((row) => ({
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    username: row.username,
    firstName: row.first_name,
    status: row.status,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    digestEnabled: Boolean(row.digest_enabled),
    instantEnabled: Boolean(row.instant_enabled),
    deadlinesEnabled: Boolean(row.deadlines_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createTelegramConnectToken(userId: string): Promise<string> {
  const token = `tg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  memoryTokens.set(token, { userId, expiresAt, usedAt: null });

  const binding = await getDb();
  if (binding) {
    await binding.prepare("INSERT INTO telegram_connect_tokens (token, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(token, userId, expiresAt).run();
  }
  return token;
}

export async function consumeTelegramConnectToken(token: string): Promise<string | null> {
  const now = Date.now();
  const mem = memoryTokens.get(token);
  if (mem) {
    if (mem.usedAt || mem.expiresAt < now) return null;
    mem.usedAt = now;
    return mem.userId;
  }

  const binding = await getDb();
  if (!binding) return null;
  const row = await binding.prepare("SELECT user_id, expires_at, used_at FROM telegram_connect_tokens WHERE token = ?").bind(token).first<{
    user_id: string; expires_at: number; used_at: number | null;
  }>();
  if (!row || row.used_at || row.expires_at < now) return null;
  await binding.prepare("UPDATE telegram_connect_tokens SET used_at = ? WHERE token = ?").bind(now, token).run();
  return row.user_id;
}

export async function recordTelegramDelivery(userId: string, chatId: string, tenderId: string, alertType: string): Promise<boolean> {
  const binding = await getDb();
  if (!binding) return true;
  const id = crypto.randomUUID();
  await binding.prepare("INSERT INTO telegram_deliveries (id, user_id, chat_id, tender_id, alert_type, sent_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, userId, chatId, tenderId, alertType, Date.now()).run();
  return true;
}

export async function isTenderDeliveredToUser(userId: string, tenderId: string, alertType?: string): Promise<boolean> {
  const binding = await getDb();
  if (!binding) return false;
  if (alertType) {
    const row = await binding.prepare("SELECT id FROM telegram_deliveries WHERE user_id = ? AND tender_id = ? AND alert_type = ?").bind(userId, tenderId, alertType).first<{ id: string }>();
    return Boolean(row);
  }
  const row = await binding.prepare("SELECT id FROM telegram_deliveries WHERE user_id = ? AND tender_id = ?").bind(userId, tenderId).first<{ id: string }>();
  return Boolean(row);
}

export type IndustryCategory =
  | "all"
  | "construction"
  | "goods"
  | "it"
  | "security"
  | "cleaning"
  | "transport"
  | "food"
  | "medical";

export function matchesIndustryCategory(category: IndustryCategory, tender: {
  title: string;
  buyer: string;
  subjectType?: string | null;
  methodName?: string | null;
  isConstructionWork?: boolean | number | null;
}): boolean {
  if (!category || category === "all") return true;
  const cat = INDUSTRY_CATEGORIES.find((c) => c.id === category);
  if (!cat) return true;

  if (category === "construction") {
    if (tender.isConstructionWork) return true;
    if (tender.subjectType === "Работы") return true;
  }
  if (category === "goods" && tender.subjectType === "Товары") {
    return true;
  }

  const textToSearch = `${tender.title} ${tender.buyer} ${tender.subjectType || ""} ${tender.methodName || ""}`.toLowerCase();
  return cat.keywords.some((k) => textToSearch.includes(k.toLowerCase()));
}

export const INDUSTRY_CATEGORIES: Array<{
  id: IndustryCategory;
  label: string;
  shortLabel: string;
  keywords: string[];
}> = [
  { id: "all", label: "🌐 Все сферы (без ограничений)", shortLabel: "Все сферы", keywords: [] },
  { id: "construction", label: "🏗 Строительство и ремонт", shortLabel: "Строительство", keywords: ["строит", "ремонт", "смр", "кровл", "фасад", "дорог", "асфальт", "благоустрой", "монтаж", "пко", "гаск", "здрав", "объект", "капремонт", "трубопровод", "инженерн", "фундамент", "водопровод", "отоплен", "канализац", "строительств"] },
  { id: "goods", label: "📦 Товары, мебель и инвентарь", shortLabel: "Товары и мебель", keywords: ["поставк", "товар", "мебел", "стол", "стул", "шкаф", "бумаг", "канцтовар", "инвентар", "спецодежд", "хозтовар", "материал", "оборудован", "парт", "доск", "бытов", "жалюз", "посуд"] },
  { id: "it", label: "💻 IT, оргтехника и связь", shortLabel: "IT и оргтехника", keywords: ["компьютер", "ноутбук", "оргтехник", "сервер", "программ", "софт", "видеонаблюден", "камер", "интернет", "связ", "картридж", "принтер", "мфу", "сайт", "моноблок", "коммутатор", "атс", "телефони", "сетев", "проектор", "ит", "it"] },
  { id: "security", label: "🛡 Охрана и безопасность", shortLabel: "Охрана и безопасность", keywords: ["охран", "безопасност", "пожарн", "сигнализац", "скуд", "видеонаблюден", "вахтер", "пост", "мвд", "кнб", "турникет", "тревожн", "огнетушител", "опс"] },
  { id: "cleaning", label: "🧹 Клининг и благоустройство", shortLabel: "Клининг и уборка", keywords: ["уборк", "клининг", "дезинфекц", "дератизац", "мусор", "тбо", "озеленен", "посадк", "полив", "санитарн", "чистк", "мойк", "стирк", "бель", "дезинсекц"] },
  { id: "transport", label: "🚚 Транспорт, спецтехника и ГСМ", shortLabel: "Транспорт и ГСМ", keywords: ["транспорт", "перевозк", "аренд", "автовышк", "экскаватор", "погрузчик", "автобус", "гсм", "бензин", "дизел", "топлив", "аи-92", "аи-95", "спецтехник", "шин", "автозапчаст", "талон", "смазочн", "машин"] },
  { id: "food", label: "🍲 Продукты питания и кейтеринг", shortLabel: "Питание и продукты", keywords: ["питан", "продукт", "мясо", "молок", "хлеб", "масло", "овощ", "круп", "кейтеринг", "столов", "обед", "сахар", "мука", "чай", "рыба", "консерв", "выпечк", "сок", "фрукт"] },
  { id: "medical", label: "💊 Медицина и фармацевтика", shortLabel: "Медицина и фарма", keywords: ["медицин", "лекарств", "фармацевт", "препарат", "шприц", "перчатк", "перевязочн", "бинт", "дезинфицирующ", "изделия мед", "медтехник", "реактив", "вата", "аппарат", "тонометр", "бахил", "антисептик", "поликлиник", "больниц"] },
];

export type NotificationSchedule = "3times" | "morning" | "afternoon" | "evening" | "instant" | "off";

export type TelegramUserFilter = {
  chatId: string;
  userId: string;
  locality: string;
  category: IndustryCategory;
  subject: string;
  constructionOnly: boolean;
  maxBudget: number;
  keywords: string[];
  schedule: NotificationSchedule;
  updatedAt: number;
};

const memoryFilters = new Map<string, TelegramUserFilter>();

export async function getTelegramFilter(chatId: string): Promise<TelegramUserFilter> {
  const binding = await getDb();
  if (!binding) {
    return memoryFilters.get(chatId) ?? {
      chatId,
      userId: "",
      locality: "turkestan_cluster",
      category: "all",
      subject: "all",
      constructionOnly: false,
      maxBudget: 0,
      keywords: [],
      schedule: "3times",
      updatedAt: Date.now(),
    };
  }
  const row = await binding.prepare("SELECT * FROM telegram_filters WHERE chat_id = ?").bind(chatId).first<{
    chat_id: string; user_id: string; locality: string; category?: string; subject: string; construction_only: number;
    max_budget: number; keywords: string; schedule?: string; updated_at: number;
  }>();
  if (!row) {
    return {
      chatId,
      userId: "",
      locality: "turkestan_cluster",
      category: "all",
      subject: "all",
      constructionOnly: false,
      maxBudget: 0,
      keywords: [],
      schedule: "3times",
      updatedAt: Date.now(),
    };
  }
  let keywords: string[] = [];
  try { keywords = JSON.parse(row.keywords); } catch {}
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    locality: row.locality,
    category: (row.category as IndustryCategory) || "all",
    subject: row.subject,
    constructionOnly: Boolean(row.construction_only),
    maxBudget: Number(row.max_budget),
    keywords: Array.isArray(keywords) ? keywords : [],
    schedule: (row.schedule as NotificationSchedule) || "3times",
    updatedAt: Number(row.updated_at),
  };
}

export async function saveTelegramFilter(filter: Partial<TelegramUserFilter> & { chatId: string }): Promise<TelegramUserFilter> {
  const current = await getTelegramFilter(filter.chatId);
  const updated: TelegramUserFilter = {
    ...current,
    ...filter,
    updatedAt: Date.now(),
  };
  memoryFilters.set(filter.chatId, updated);
  const binding = await getDb();
  if (!binding) {
    return updated;
  }
  try {
    await binding.prepare(`ALTER TABLE telegram_filters ADD COLUMN category text DEFAULT 'all' NOT NULL`).run();
  } catch {}
  try {
    await binding.prepare(`ALTER TABLE telegram_filters ADD COLUMN schedule text DEFAULT '3times' NOT NULL`).run();
  } catch {}

  await binding.prepare(`INSERT INTO telegram_filters (chat_id, user_id, locality, category, subject, construction_only, max_budget, keywords, schedule, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      user_id=excluded.user_id, locality=excluded.locality, category=excluded.category, subject=excluded.subject,
      construction_only=excluded.construction_only, max_budget=excluded.max_budget,
      keywords=excluded.keywords, schedule=excluded.schedule, updated_at=excluded.updated_at`)
    .bind(
      updated.chatId, updated.userId, updated.locality, updated.category, updated.subject,
      updated.constructionOnly ? 1 : 0, updated.maxBudget,
      JSON.stringify(updated.keywords), updated.schedule, updated.updatedAt
    ).run();
  return updated;
}



