import { readSessionFromRequest } from "../../auth";
import { getTenderDetails, tenderExists } from "../../db";
import { isGoszakupConfigured, synchronizeGoszakupTenderDetails } from "../../goszakup";

function tenderIdFrom(request: Request): string {
  return new URL(request.url).searchParams.get("tenderId")?.trim() ?? "";
}

export async function GET(request: Request) {
  if (!await readSessionFromRequest(request)) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const tenderId = tenderIdFrom(request);
  if (!tenderId) return Response.json({ error: "Укажите тендер" }, { status: 400 });
  if (!await tenderExists(tenderId)) return Response.json({ error: "Тендер не найден" }, { status: 404 });
  return Response.json({ details: await getTenderDetails(tenderId), configured: isGoszakupConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "super_admin") return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const tenderId = tenderIdFrom(request);
  if (!tenderId) return Response.json({ error: "Укажите тендер" }, { status: 400 });
  if (!await tenderExists(tenderId)) return Response.json({ error: "Тендер не найден" }, { status: 404 });
  if (!isGoszakupConfigured()) return Response.json({ error: "API-токен Госзакупок ещё не настроен" }, { status: 503 });
  try {
    const result = await synchronizeGoszakupTenderDetails(tenderId);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось загрузить детали" }, { status: 502 });
  }
}
