import assert from "node:assert/strict";
import test from "node:test";
import { explainTenderMatch } from "../app/tender-matching.ts";

const username = "test-admin";
const password = "correct-test-password";
const encoder = new TextEncoder();

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function passwordHash() {
  const salt = encoder.encode("fixed-test-salt");
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256,
  );
  return `pbkdf2_sha256$100000$${base64(salt)}$${base64(new Uint8Array(derived))}`;
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD_HASH: await passwordHash(),
    SESSION_SECRET: "test-session-secret-that-is-long-enough-for-tests",
  };
  const context = { waitUntil() {}, passThroughOnException() {} };
  return { worker, env, context };
}

async function request(workerState, path, init = {}) {
  return workerState.worker.fetch(new Request(`http://localhost${path}`, init), workerState.env, workerState.context);
}

async function adminCookie(state) {
  const login = await request(state, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200);
  return (login.headers.get("set-cookie") ?? "").split(";")[0];
}

test("anonymous visitors see login and cannot open the dashboard", async () => {
  const state = await loadWorker();
  const dashboard = await request(state, "/", { headers: { accept: "text/html" }, redirect: "manual" });
  assert.match(String(dashboard.status), /^30[2378]$/);
  assert.equal(new URL(dashboard.headers.get("location"), "http://localhost").pathname, "/login");

  const login = await request(state, "/login", { headers: { accept: "text/html" } });
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.doesNotMatch(html, /correct-test-password/);
});

test("invalid credentials are rejected without a session", async () => {
  const state = await loadWorker();
  const response = await request(state, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "wrong" }),
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("administrator sees the token-waiting dashboard and can sign out", async () => {
  const state = await loadWorker();
  const cookie = await adminCookie(state);
  assert.match(cookie, /^qaztender_session=/);

  const dashboard = await request(state, "/", { headers: { accept: "text/html", cookie } });
  assert.equal(dashboard.status, 200);
  const html = await dashboard.text();
  assert.match(html, /Главный администратор/);
  assert.match(html, /Ожидается API-токен/);
  assert.match(html, /Все регионы/);
  assert.match(html, /Туркестанская область/);
  assert.match(html, /Расширенный поиск/);
  assert.match(html, /Номер объявления/);
  assert.match(html, /Заказчик или БИН/);
  assert.match(html, /Сбросить все фильтры/);
  assert.match(html, /Избранные/);
  assert.match(html, /Участвуем/);
  assert.match(html, /Заявка подана/);
  assert.match(html, /Мои поиски/);
  assert.match(html, /Сохранить текущие фильтры/);
  assert.match(html, /Telegram или email/);
  assert.doesNotMatch(html, /Демо-данные/);

  const sync = await request(state, "/api/tenders/sync", { method: "POST", headers: { cookie } });
  assert.equal(sync.status, 503);
  assert.deepEqual(await sync.json(), { error: "API-токен госзакупок ещё не настроен" });

  const logout = await request(state, "/api/auth/logout", { method: "POST", headers: { cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});

test("anonymous visitors cannot start tender synchronization", async () => {
  const state = await loadWorker();
  const response = await request(state, "/api/tenders/sync", { method: "POST" });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Доступ запрещён" });
});

test("tender workflow endpoints require authentication", async () => {
  const state = await loadWorker();
  const getResponse = await request(state, "/api/tender-workflow");
  assert.equal(getResponse.status, 403);
  const putResponse = await request(state, "/api/tender-workflow", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenderId: "123", isFavorite: true, stage: "reviewing" }),
  });
  assert.equal(putResponse.status, 403);
});

test("tender workflow rejects unsupported stages before database access", async () => {
  const state = await loadWorker();
  const cookie = await adminCookie(state);
  const response = await request(state, "/api/tender-workflow", {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ tenderId: "123", isFavorite: true, stage: "maybe" }),
  });
  assert.equal(response.status, 400);
});

test("saved search endpoints require authentication", async () => {
  const state = await loadWorker();
  assert.equal((await request(state, "/api/saved-searches")).status, 403);
  assert.equal((await request(state, "/api/saved-searches", { method: "POST" })).status, 403);
  assert.equal((await request(state, "/api/saved-searches?id=example", { method: "DELETE" })).status, 403);
});

test("saved searches reject malformed alert settings before database access", async () => {
  const state = await loadWorker();
  const cookie = await adminCookie(state);
  const response = await request(state, "/api/saved-searches", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name: "Туркестан", alertFrequency: "sometimes", filters: {} }),
  });
  assert.equal(response.status, 400);
});

test("company profile editing is restricted to tender specialists", async () => {
  const state = await loadWorker();
  const cookie = await adminCookie(state);
  const page = await request(state, "/profile/company", { headers: { accept: "text/html", cookie }, redirect: "manual" });
  assert.match(String(page.status), /^30[2378]$/);
  assert.equal(new URL(page.headers.get("location"), "http://localhost").pathname, "/");
  const anonymousWrite = await request(state, "/api/company-profile", { method: "POST" });
  assert.equal(anonymousWrite.status, 403);
});

test("tender matching explains facts without inventing a win probability", () => {
  const tender = {
    externalId: "t-1", numberAnno: "1", title: "Капитальный ремонт школы", buyer: "Заказчик", customerBin: "",
    regionCode: "61", regionName: "Туркестанская область", subjectTypeId: 0, subjectType: "Работа", methodId: 0,
    methodName: "Конкурс", budget: 90_000_000, startDate: null, endDate: null, publishDate: null, isConstructionWork: true,
    statusId: 0, statusName: "Опубликовано", kato: "[]", systemId: 3, sourceUrl: "https://example.test", upstreamUpdatedAt: "", fetchedAt: 0, updatedAt: 0,
  };
  const profile = {
    companyName: "Компания", bin: "", regions: ["Туркестанская область"], directions: ["Строительство и ремонт"],
    constructionTypes: ["Капитальный ремонт"], licenses: "СМР II категории", experienceYears: 0, employeeCount: 0,
    minBudget: 0, maxBudget: 100_000_000, updatedAt: 0,
  };
  const match = explainTenderMatch(tender, profile);
  assert.equal(match.status, "fits");
  assert.equal(match.label, "Подходит по известным данным");
  assert.ok(match.evidence.some((item) => item.kind === "unknown" && /применимость/.test(item.label)));
  assert.doesNotMatch(JSON.stringify(match), /вероятност|шанс побед/i);

  const outside = explainTenderMatch({ ...tender, budget: 150_000_000 }, profile);
  assert.equal(outside.status, "outside");
  assert.ok(outside.evidence.some((item) => item.kind === "negative" && /выше лимита/.test(item.label)));
});
