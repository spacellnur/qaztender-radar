import assert from "node:assert/strict";
import test from "node:test";

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

test("anonymous visitors see login and cannot open the dashboard", async () => {
  const state = await loadWorker();
  const dashboard = await request(state, "/", { headers: { accept: "text/html" }, redirect: "manual" });
  assert.match(String(dashboard.status), /^30[2378]$/);
  assert.equal(new URL(dashboard.headers.get("location"), "http://localhost").pathname, "/login");

  const login = await request(state, "/login", { headers: { accept: "text/html" } });
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.match(html, /Вход в систему/);
  assert.match(html, /Защищённая рабочая область/);
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
  assert.deepEqual(await response.json(), { error: "Неверный логин или пароль" });
});

test("administrator can sign in, open dashboard, and sign out", async () => {
  const state = await loadWorker();
  const login = await request(state, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /qaztender_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const cookie = setCookie.split(";")[0];

  const dashboard = await request(state, "/", { headers: { accept: "text/html", cookie } });
  assert.equal(dashboard.status, 200);
  const html = await dashboard.text();
  assert.match(html, /Главный администратор/);
  assert.match(html, /Демо-данные/);

  const logout = await request(state, "/api/auth/logout", { method: "POST", headers: { cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});
