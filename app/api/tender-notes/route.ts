import { readSessionFromRequest, sessionOwnerKey } from "../../auth";
import { createTenderNote, deleteTenderNote, listTenderNotes, tenderExists } from "../../db";

function idFrom(request: Request, name: string): string {
  return new URL(request.url).searchParams.get(name)?.trim() ?? "";
}

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const tenderId = idFrom(request, "tenderId");
  if (!tenderId) return Response.json({ error: "Укажите закупку" }, { status: 400 });
  if (!await tenderExists(tenderId)) return Response.json({ error: "Закупка не найдена" }, { status: 404 });
  const notes = await listTenderNotes(tenderId);
  return Response.json({ notes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenderId = typeof body.tenderId === "string" ? body.tenderId.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!tenderId || !content) return Response.json({ error: "Заполните текст заметки" }, { status: 400 });
  if (content.length > 3000) return Response.json({ error: "Заметка слишком длинная (максимум 3000 символов)" }, { status: 400 });
  if (!await tenderExists(tenderId)) return Response.json({ error: "Закупка не найдена" }, { status: 404 });

  const authorName = session.role === "super_admin" ? `Администратор (${session.username})` : session.username;
  const ownerKey = sessionOwnerKey(session);

  try {
    const note = await createTenderNote(tenderId, ownerKey, authorName, content);
    const notes = await listTenderNotes(tenderId);
    return Response.json({ note, notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Tender not found") return Response.json({ error: "Закупка не найдена" }, { status: 404 });
    return Response.json({ error: "Не удалось сохранить заметку" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const id = idFrom(request, "id");
  const tenderId = idFrom(request, "tenderId");
  if (!id) return Response.json({ error: "Укажите заметку" }, { status: 400 });

  const ownerKey = sessionOwnerKey(session);
  try {
    const deleted = await deleteTenderNote(id, ownerKey, session.role);
    if (!deleted) return Response.json({ error: "Заметка не найдена или нет прав на удаление" }, { status: 404 });
    const notes = tenderId ? await listTenderNotes(tenderId) : [];
    return Response.json({ ok: true, notes });
  } catch {
    return Response.json({ error: "Не удалось удалить заметку" }, { status: 500 });
  }
}
