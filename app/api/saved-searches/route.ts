import { readSessionFromRequest, sessionOwnerKey } from "../../auth";
import { deleteSavedSearch, listSavedSearches, saveSavedSearch } from "../../db";
import type { AlertFrequency, TenderSearchFilters } from "../../tender-types";

const frequencies: AlertFrequency[] = ["off", "instant", "daily"];
const stringKeys: Array<Exclude<keyof TenderSearchFilters, "constructionOnly">> = [
  "query", "region", "subject", "budget", "deadline", "announcementNumber", "customer", "method", "status",
  "amountFrom", "amountTo", "publishedFrom", "publishedTo", "endingFrom", "endingTo", "financialYear", "sort",
];

function parseFilters(value: unknown): TenderSearchFilters | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.constructionOnly !== "boolean" || stringKeys.some((key) => typeof input[key] !== "string")) return null;
  return Object.fromEntries([...stringKeys.map((key) => [key, String(input[key]).slice(0, 200)]), ["constructionOnly", input.constructionOnly]]) as TenderSearchFilters;
}

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  return Response.json({ searches: await listSavedSearches(sessionOwnerKey(session)) });
}

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const alertFrequency = body.alertFrequency;
  const filters = parseFilters(body.filters);
  if (!name || name.length > 60 || typeof alertFrequency !== "string" || !frequencies.includes(alertFrequency as AlertFrequency) || !filters) {
    return Response.json({ error: "Проверьте название, фильтры и частоту уведомлений" }, { status: 400 });
  }
  try {
    const search = await saveSavedSearch(sessionOwnerKey(session), id, name, filters, alertFrequency as AlertFrequency);
    return Response.json({ search });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Saved search not found") return Response.json({ error: "Сохранённый поиск не найден" }, { status: 404 });
    if (message === "Database is unavailable") return Response.json({ error: "Хранилище временно недоступно" }, { status: 503 });
    if (message.includes("UNIQUE")) return Response.json({ error: "Поиск с таким названием уже существует" }, { status: 409 });
    return Response.json({ error: "Не удалось сохранить поиск" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return Response.json({ error: "Укажите сохранённый поиск" }, { status: 400 });
  try {
    const deleted = await deleteSavedSearch(sessionOwnerKey(session), id);
    return deleted ? Response.json({ ok: true }) : Response.json({ error: "Сохранённый поиск не найден" }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === "Database is unavailable") return Response.json({ error: "Хранилище временно недоступно" }, { status: 503 });
    return Response.json({ error: "Не удалось удалить поиск" }, { status: 500 });
  }
}
