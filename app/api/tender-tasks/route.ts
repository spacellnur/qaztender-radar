import type { ChecklistTemplateType } from "../../tender-types";
import { readSessionFromRequest, sessionOwnerKey } from "../../auth";
import { createTenderTask, deleteTenderTask, getTenderTask, getTenderTaskWorkspace, seedTenderTaskTemplate, tenderExists, updateTenderTask } from "../../db";

function idFrom(request: Request, name: string): string {
  return new URL(request.url).searchParams.get(name)?.trim() ?? "";
}

export async function GET(request: Request) {
  if (!await readSessionFromRequest(request)) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const tenderId = idFrom(request, "tenderId");
  if (!tenderId) return Response.json({ error: "Укажите тендер" }, { status: 400 });
  if (!await tenderExists(tenderId)) return Response.json({ error: "Тендер не найден" }, { status: 404 });
  return Response.json({ workspace: await getTenderTaskWorkspace(tenderId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenderId = typeof body.tenderId === "string" ? body.tenderId.trim() : "";
  const action = body.action;
  if (!tenderId || (action !== "seed" && action !== "create")) return Response.json({ error: "Проверьте тендер и действие" }, { status: 400 });
  try {
    if (action === "seed") {
      const templateType = typeof body.templateType === "string" ? body.templateType as ChecklistTemplateType : undefined;
      await seedTenderTaskTemplate(tenderId, sessionOwnerKey(session), templateType);
    } else {
      const title = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
      if (!title || title.length > 140) return Response.json({ error: "Введите название задачи до 140 символов" }, { status: 400 });
      await createTenderTask(tenderId, title, sessionOwnerKey(session));
    }
    return Response.json({ workspace: await getTenderTaskWorkspace(tenderId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Tender not found") return Response.json({ error: "Тендер не найден" }, { status: 404 });
    if (message === "Database is unavailable") return Response.json({ error: "Хранилище временно недоступно" }, { status: 503 });
    if (message.includes("UNIQUE")) return Response.json({ error: "Такая задача уже существует" }, { status: 409 });
    return Response.json({ error: "Не удалось создать задачи" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = body.status;
  if (!id || (status !== "todo" && status !== "done")) return Response.json({ error: "Проверьте задачу и статус" }, { status: 400 });
  const existing = await getTenderTask(id);
  if (!existing) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  let assignedUserId = existing.assignedUserId;
  let dueAt = existing.dueAt;
  if (session.role === "super_admin") {
    assignedUserId = typeof body.assignedUserId === "string" ? body.assignedUserId.trim() : existing.assignedUserId;
    dueAt = body.dueAt === null ? null : typeof body.dueAt === "number" && Number.isFinite(body.dueAt) ? body.dueAt : existing.dueAt;
  }
  try {
    await updateTenderTask(id, status, assignedUserId, dueAt);
    return Response.json({ workspace: await getTenderTaskWorkspace(existing.tenderId) });
  } catch (error) {
    if (error instanceof Error && error.message === "Assignee not found") return Response.json({ error: "Тендерщик не найден" }, { status: 400 });
    return Response.json({ error: "Не удалось обновить задачу" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const id = idFrom(request, "id");
  if (!id) return Response.json({ error: "Укажите задачу" }, { status: 400 });
  try { return await deleteTenderTask(id) ? Response.json({ ok: true }) : Response.json({ error: "Задача не найдена" }, { status: 404 }); }
  catch { return Response.json({ error: "Не удалось удалить задачу" }, { status: 500 }); }
}

