export type AppRole = "super_admin" | "tender_specialist" | "guest";

export type AppSession = {
  userId?: string;
  username: string;
  role: AppRole;
  expiresAt: number;
};

type RuntimeEnv = {
  DB?: D1Database;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
};

declare global {
  var __QAZTENDER_ENV: RuntimeEnv | undefined;
}

export const SESSION_COOKIE = "qaztender_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function runtimeEnv(): RuntimeEnv {
  return globalThis.__QAZTENDER_ENV ?? process.env;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  if (!password) return false;
  const parts = encodedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000) return false;

  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(parts[2]), iterations },
    baseKey,
    decodeBase64(parts[3]).length * 8,
  ));
  return constantTimeEqual(derived, decodeBase64(parts[3]));
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const env = runtimeEnv();
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH) return false;
  const usernameMatches = constantTimeEqual(encoder.encode(username), encoder.encode(env.ADMIN_USERNAME));
  return usernameMatches && await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, baseKey, 256));
  return `pbkdf2_sha256$${iterations}$${btoa(String.fromCharCode(...salt))}$${btoa(String.fromCharCode(...derived))}`;
}

export async function createSession(username: string, role: AppRole, userId?: string): Promise<string> {
  const secret = runtimeEnv().SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const session: AppSession = {
    userId,
    username,
    role,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  };
  const payload = encodeBase64Url(encoder.encode(JSON.stringify(session)));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function readSessionToken(token: string | undefined): Promise<AppSession | null> {
  const secret = runtimeEnv().SESSION_SECRET;
  if (!secret || !token) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expectedSignature = await signature(payload, secret);
  if (!constantTimeEqual(encoder.encode(suppliedSignature), encoder.encode(expectedSignature))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(decodeBase64(payload))) as AppSession;
    const roles: AppRole[] = ["super_admin", "tender_specialist", "guest"];
    if (!session.username || !roles.includes(session.role) || session.expiresAt <= Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function readSessionFromRequest(request: Request): Promise<AppSession | null> {
  return readSessionToken(cookieValue(request.headers.get("cookie"), SESSION_COOKIE));
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
