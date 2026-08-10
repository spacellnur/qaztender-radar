import { readSessionFromRequest } from "../../../auth";
import { isGoszakupConfigured, synchronizeGoszakupTenders } from "../../../goszakup";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "super_admin") {
    return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  if (!isGoszakupConfigured()) {
    return Response.json({ error: "API-токен госзакупок ещё не настроен" }, { status: 503 });
  }
  try {
    const result = await synchronizeGoszakupTenders();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить тендеры";
    return Response.json({ error: message }, { status: 502 });
  }
}
