import { readSessionFromRequest, sessionOwnerKey } from "../../auth";
import { listTenderWorkflow, saveTenderWorkflow } from "../../db";
import type { TenderStage } from "../../tender-types";

const stages: TenderStage[] = ["none", "reviewing", "participating", "submitted", "won", "lost", "skipped"];

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  return Response.json({ entries: await listTenderWorkflow(sessionOwnerKey(session)) });
}

export async function PUT(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenderId = typeof body.tenderId === "string" ? body.tenderId.trim() : "";
  const isFavorite = body.isFavorite;
  const stage = body.stage;
  if (!tenderId || typeof isFavorite !== "boolean" || typeof stage !== "string" || !stages.includes(stage as TenderStage)) {
    return Response.json({ error: "Проверьте тендер, избранное и этап участия" }, { status: 400 });
  }
  try {
    const entry = await saveTenderWorkflow(sessionOwnerKey(session), tenderId, isFavorite, stage as TenderStage);
    return Response.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить тендер";
    if (message === "Tender not found") return Response.json({ error: "Тендер не найден" }, { status: 404 });
    if (message === "Database is unavailable") return Response.json({ error: "Хранилище временно недоступно" }, { status: 503 });
    return Response.json({ error: "Не удалось сохранить тендер" }, { status: 500 });
  }
}
