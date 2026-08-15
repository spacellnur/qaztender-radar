import { hashPassword, readSessionFromRequest } from "../../../auth";
import {
  createTenderSpecialist,
  getTelegramSubscriberStats,
  grantUserSubscription,
  listTenderSpecialists,
  updateTelegramSubscriberStatus
} from "../../../db";
import type { TelegramSubscriberStatus } from "../../../tender-types";

async function requireAdmin(request: Request) {
  const session = await readSessionFromRequest(request);
  return session?.role === "super_admin" ? session : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const users = await listTenderSpecialists();
  const stats = await getTelegramSubscriberStats();
  return Response.json({ users, stats });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z0-9._-]{4,40}$/.test(username) || password.length < 10) return Response.json({ error: "Логин: 4–40 латинских символов. Пароль: минимум 10 символов." }, { status: 400 });
  try {
    return Response.json({ user: await createTenderSpecialist(username, await hashPassword(password)) }, { status: 201 });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return Response.json({ error: "Такой логин уже существует" }, { status: 409 });
    return Response.json({ error: "Не удалось создать пользователя" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { userId?: string; chatId?: string; status?: string; grantDays?: number };

  if (body.grantDays && (body.chatId || body.userId)) {
    const target = body.chatId || body.userId || "";
    const updated = await grantUserSubscription(target, Number(body.grantDays), admin.username);
    return Response.json({ ok: true, subscriber: updated });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const status = typeof body.status === "string" ? body.status as TelegramSubscriberStatus : null;
  if (!userId || !status || !["pending", "approved", "rejected", "paused"].includes(status)) {
    return Response.json({ error: "Некорректные параметры" }, { status: 400 });
  }
  await updateTelegramSubscriberStatus(userId, status, admin.username);
  return Response.json({ ok: true });
}


