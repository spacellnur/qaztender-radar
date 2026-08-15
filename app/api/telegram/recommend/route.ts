import { readSessionFromRequest } from "@/app/auth";
import { getTenderById } from "@/app/db";
import { sendAdminRecommendation } from "@/app/telegram";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session || session.role !== "super_admin") {
    return Response.json({ error: "Доступ разрешён только главному администратору" }, { status: 403 });
  }

  const body = await request.json() as { targetUserId?: string; tenderId?: string; note?: string };
  const targetUserId = body.targetUserId?.trim();
  const tenderId = body.tenderId?.trim();
  const note = body.note?.trim() || "";

  if (!targetUserId || !tenderId) {
    return Response.json({ error: "Укажите сотрудника и тендер" }, { status: 400 });
  }

  const tender = await getTenderById(tenderId);
  if (!tender) {
    return Response.json({ error: "Тендер не найден" }, { status: 404 });
  }

  try {
    const result = await sendAdminRecommendation(session.username, targetUserId, tender, note);
    if (!result.ok) {
      return Response.json({ error: result.description || "Не удалось отправить рекомендацию" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось отправить рекомендацию" }, { status: 400 });
  }
}
