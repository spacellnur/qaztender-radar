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
        const now = Date.now();
        const d1 = now + 2 * 86400000;
        const d2 = now + 4 * 86400000;
        const d3 = now + 6 * 86400000;
        const d4 = now + 8 * 86400000;
        const d5 = now + 10 * 86400000;
        const d6 = now + 12 * 86400000;
        const d7 = now + 14 * 86400000;
        const d8 = now + 18 * 86400000;

        const initialTenders = [
          {
            id: "12849201",
            anno: "12849201-1",
            title: "Капитальный ремонт и благоустройство территории средней школы им. Абая в г. Туркестан",
            buyer: "ГУ «Отдел образования города Туркестан»",
            bin: "080440008921",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 3,
            subjType: "Работы",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 184500000,
            start: now - 86400000,
            end: d1,
            pub: now - 86400000,
            isConstr: 1,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["611000000", "611010000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12849201",
          },
          {
            id: "12850442",
            anno: "12850442-1",
            title: "Строительство наружных сетей водоснабжения и канализации жилого массива в г. Кентау",
            buyer: "ГУ «Отдел строительства и ЖКХ акимата города Кентау»",
            bin: "030540002134",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 3,
            subjType: "Работы",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 342000000,
            start: now - 2 * 86400000,
            end: d2,
            pub: now - 2 * 86400000,
            isConstr: 1,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["612000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12850442",
          },
          {
            id: "12853119",
            anno: "12853119-1",
            title: "Поставка компьютерного оборудования, серверов и МФУ для поликлиник Туркестанской области",
            buyer: "ГКП на ПХВ «Туркестанская областная клиническая больница»",
            bin: "990140003412",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 1,
            subjType: "Товары",
            mId: 3,
            mName: "Запрос ценовых предложений",
            budget: 48900000,
            start: now - 86400000,
            end: d3,
            pub: now - 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["611000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12853119",
          },
          {
            id: "12855902",
            anno: "12855902-1",
            title: "Услуги физической охраны и видеонаблюдения административных зданий и объектов образования",
            buyer: "ГУ «Аппарат акима Отырарского района»",
            bin: "010240001987",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 2,
            subjType: "Услуги",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 27600000,
            start: now - 3 * 86400000,
            end: d2,
            pub: now - 3 * 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["614800000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12855902",
          },
          {
            id: "12858711",
            anno: "12858711-1",
            title: "Оказание услуг комплексного клининга и уборки помещений государственных учреждений",
            buyer: "ГУ «Управление делами акимата города Шымкент»",
            bin: "180740023456",
            regCode: "79",
            regName: "Шымкент",
            subjId: 2,
            subjType: "Услуги",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 38500000,
            start: now - 86400000,
            end: d4,
            pub: now - 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["791000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12858711",
          },
          {
            id: "12861204",
            anno: "12861204-1",
            title: "Поставка продуктов питания (мясо, крупы, овощи, молочные продукты) для детских садов",
            buyer: "ГУ «Отдел развития человеческого потенциала Сарыагашского района»",
            bin: "060140005678",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 1,
            subjType: "Товары",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 65400000,
            start: now - 2 * 86400000,
            end: d3,
            pub: now - 2 * 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["615400000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12861204",
          },
          {
            id: "12864980",
            anno: "12864980-1",
            title: "Поставка медицинских расходных материалов, реактивов и диагностических наборов",
            buyer: "ГКП на ПХВ «Городская клиническая больница №1 г. Шымкент»",
            bin: "040340009112",
            regCode: "79",
            regName: "Шымкент",
            subjId: 1,
            subjType: "Товары",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 74200000,
            start: now - 86400000,
            end: d5,
            pub: now - 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["791000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12864980",
          },
          {
            id: "12869450",
            anno: "12869450-1",
            title: "Реконструкция и средний ремонт автомобильных дорог районного значения и подъездных путей",
            buyer: "ГУ «Управление пассажирского транспорта и автомобильных дорог Туркестанской области»",
            bin: "180840012398",
            regCode: "61",
            regName: "Туркестанская область",
            subjId: 3,
            subjType: "Работы",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 520000000,
            start: now - 3 * 86400000,
            end: d6,
            pub: now - 3 * 86400000,
            isConstr: 1,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["611000000", "612000000", "614800000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12869450",
          },
          {
            id: "12872340",
            anno: "12872340-1",
            title: "Поставка офисной мебели, учебных парт и специализированного оборудования",
            buyer: "ГУ «Управление образования города Алматы»",
            bin: "020240004561",
            regCode: "75",
            regName: "Алматы",
            subjId: 1,
            subjType: "Товары",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 92800000,
            start: now - 86400000,
            end: d7,
            pub: now - 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["751000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12872340",
          },
          {
            id: "12878900",
            anno: "12878900-1",
            title: "Разработка, внедрение и техническое сопровождение автоматизированной информационной системы",
            buyer: "РГУ «Комитет государственных доходов Министерства финансов РК»",
            bin: "140840023411",
            regCode: "71",
            regName: "Астана",
            subjId: 2,
            subjType: "Услуги",
            mId: 2,
            mName: "Открытый конкурс",
            budget: 145000000,
            start: now - 2 * 86400000,
            end: d8,
            pub: now - 2 * 86400000,
            isConstr: 0,
            sId: 2,
            sName: "Опубликовано (прием заявок)",
            kato: JSON.stringify(["711000000"]),
            url: "https://goszakup.gov.kz/ru/announce/index/12878900",
          }
        ];

        for (const t of initialTenders) {
          await binding.prepare(`INSERT OR REPLACE INTO tenders (
            external_id, number_anno, title, buyer, customer_bin, region_code, region_name,
            subject_type_id, subject_type, method_id, method_name, budget, start_date, end_date,
            publish_date, is_construction_work, status_id, status_name, kato, system_id, source_url,
            upstream_updated_at, fetched_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).bind(
            t.id, t.anno, t.title, t.buyer, t.bin, t.regCode, t.regName, t.subjId, t.subjType,
            t.mId, t.mName, t.budget, t.start, t.end, t.pub, t.isConstr, t.sId, t.sName,
            t.kato, t.url, new Date().toISOString(), now, now
          ).run();
        }
      }
    } catch (e) {
      console.warn("Seeding initial tenders warning:", e);
    }
  })();
  return schemaPromise;
}

async function getDb(): Promise<D1Database | null> {
  const binding = globalThis.__QAZTENDER_ENV?.DB ?? null;
  if (binding) {
    await ensureSchema(binding);
  }
  return binding;
}

function db(): D1Database | null {
  return globalThis.__QAZTENDER_ENV?.DB ?? null;
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
  if (!binding) return null;
  return (await binding.prepare(`SELECT
      external_id AS externalId, number_anno AS numberAnno, title, buyer, customer_bin AS customerBin,
      region_code AS regionCode, region_name AS regionName, subject_type_id AS subjectTypeId,
      subject_type AS subjectType, method_id AS methodId, method_name AS methodName, budget,
      start_date AS startDate, end_date AS endDate, publish_date AS publishDate,
      is_construction_work AS isConstructionWork, status_id AS statusId, status_name AS statusName,
      kato, system_id AS systemId, source_url AS sourceUrl, upstream_updated_at AS upstreamUpdatedAt,
      fetched_at AS fetchedAt, updated_at AS updatedAt
    FROM tenders WHERE external_id = ? LIMIT 1`).bind(externalId).first<TenderRecord>()) ?? null;
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
  const binding = await getDb();
  if (!binding) return [];
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
  return (result.results ?? []).map((row) => ({ ...row, isConstructionWork: Boolean(row.isConstructionWork) }));
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
  const nonAdmin = subs.filter((s) => s.chatId !== adminId);
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let activePaid = 0;
  let activeTrial = 0;
  let expired = 0;
  let activeToday = 0;
  let totalReferrals = 0;

  for (const s of nonAdmin) {
    totalReferrals += s.referralsCount || 0;
    if (s.lastActiveAt && s.lastActiveAt > oneDayAgo) {
      activeToday++;
    }
    const subExpires = s.subscriptionExpiresAt || 0;
    const trialExpires = s.trialExpiresAt || (s.createdAt + 3 * 24 * 60 * 60 * 1000);
    if (subExpires > now) {
      activePaid++;
    } else if (trialExpires > now) {
      activeTrial++;
    } else {
      expired++;
    }
  }

  return {
    totalUsers: nonAdmin.length,
    activeTrial,
    activePaid,
    expired,
    activeToday,
    totalReferrals,
    subscribers: nonAdmin,
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

export const INDUSTRY_CATEGORIES: Array<{
  id: IndustryCategory;
  label: string;
  shortLabel: string;
  keywords: string[];
}> = [
  { id: "all", label: "🌐 Все сферы (без ограничений)", shortLabel: "Все сферы", keywords: [] },
  { id: "construction", label: "🏗 Строительство и ремонт", shortLabel: "Строительство", keywords: ["строит", "ремонт", "смр", "кровл", "фасад", "дорог", "асфальт", "благоустрой", "монтаж", "пко", "гаск", "здрав", "объект", "капремонт", "трубопровод", "инженерн", "фундамент"] },
  { id: "goods", label: "📦 Товары, мебель и инвентарь", shortLabel: "Товары и мебель", keywords: ["поставк", "товар", "мебел", "стол", "стул", "шкаф", "бумаг", "канцтовар", "инвентар", "спецодежд", "хозтовар", "материал", "оборудован"] },
  { id: "it", label: "💻 IT, оргтехника и связь", shortLabel: "IT и оргтехника", keywords: ["компьютер", "ноутбук", "оргтехник", "сервер", "программ", "софт", "видеонаблюден", "камер", "интернет", "связ", "картридж", "принтер", "мфу", "сайт", "моноблок", "коммутатор"] },
  { id: "security", label: "🛡 Охрана и безопасность", shortLabel: "Охрана и безопасность", keywords: ["охран", "безопасност", "пожарн", "сигнализац", "скуд", "видеонаблюден", "вахтер", "пост", "мвд"] },
  { id: "cleaning", label: "🧹 Клининг и благоустройство", shortLabel: "Клининг и уборка", keywords: ["уборк", "клининг", "дезинфекц", "мусор", "тбо", "озеленен", "посадк", "полив", "санитарн", "чистк", "мойк"] },
  { id: "transport", label: "🚚 Транспорт, спецтехника и ГСМ", shortLabel: "Транспорт и ГСМ", keywords: ["транспорт", "перевозк", "аренд", "автовышк", "экскаватор", "погрузчик", "автобус", "гсм", "бензин", "дизел", "топлив", "аи-92", "аи-95", "спецтехник"] },
  { id: "food", label: "🍲 Продукты питания и кейтеринг", shortLabel: "Питание и продукты", keywords: ["питан", "продукт", "мясо", "молок", "хлеб", "масло", "овощ", "круп", "кейтеринг", "столов", "обед", "сахар", "мука"] },
  { id: "medical", label: "💊 Медицина и фармацевтика", shortLabel: "Медицина и фарма", keywords: ["медицин", "лекарств", "фармацевт", "препарат", "шприц", "перчатк", "перевязочн", "бинт", "дезинфицирующ", "изделия мед", "медтехник"] },
];

export type TelegramUserFilter = {
  chatId: string;
  userId: string;
  locality: string;
  category: IndustryCategory;
  subject: string;
  constructionOnly: boolean;
  maxBudget: number;
  keywords: string[];
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
      updatedAt: Date.now(),
    };
  }
  const row = await binding.prepare("SELECT * FROM telegram_filters WHERE chat_id = ?").bind(chatId).first<{
    chat_id: string; user_id: string; locality: string; category?: string; subject: string; construction_only: number;
    max_budget: number; keywords: string; updated_at: number;
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
  const binding = await getDb();
  if (!binding) {
    memoryFilters.set(filter.chatId, updated);
    return updated;
  }
  try {
    await binding.prepare(`ALTER TABLE telegram_filters ADD COLUMN category text DEFAULT 'all' NOT NULL`).run();
  } catch {}

  await binding.prepare(`INSERT INTO telegram_filters (chat_id, user_id, locality, category, subject, construction_only, max_budget, keywords, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      user_id=excluded.user_id, locality=excluded.locality, category=excluded.category, subject=excluded.subject,
      construction_only=excluded.construction_only, max_budget=excluded.max_budget,
      keywords=excluded.keywords, updated_at=excluded.updated_at`)
    .bind(
      updated.chatId, updated.userId, updated.locality, updated.category, updated.subject,
      updated.constructionOnly ? 1 : 0, updated.maxBudget,
      JSON.stringify(updated.keywords), updated.updatedAt
    ).run();
  return updated;
}



