import { createSession, sessionCookie } from "../../../auth";
import {
  createTelegramWebLogin,
  getDbUserById,
  getTelegramSubscriberByChatId,
  getTelegramSubscriberByUserId,
  verifyTelegramWebLoginCode,
  verifyTelegramWebLoginToken
} from "../../../db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/login?error=missing_token", request.url), 302);
  }

  const subscriber = await verifyTelegramWebLoginToken(token);
  if (!subscriber) {
    return Response.redirect(new URL("/login?error=invalid_or_expired_token", request.url), 302);
  }

  const username = subscriber.username || subscriber.firstName || `tg_${subscriber.chatId}`;
  const sessionToken = await createSession(username, "tender_specialist", subscriber.userId);

  const headers = new Headers();
  headers.set("Set-Cookie", sessionCookie(sessionToken));
  headers.set("Location", new URL("/", request.url).toString());

  return new Response(null, {
    status: 302,
    headers,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { code?: string; action?: string; chatId?: string };

    if (body.action === "create_code" && body.chatId) {
      const sub = await getTelegramSubscriberByChatId(body.chatId);
      if (!sub) {
        return Response.json({ error: "Пользователь не найден" }, { status: 404 });
      }
      const login = await createTelegramWebLogin(sub.chatId, sub.userId);
      return Response.json({ ok: true, code: login.code });
    }

    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code || code.length < 6) {
      return Response.json({ error: "Введите 6-значный код из Telegram-бота" }, { status: 400 });
    }

    const subscriber = await verifyTelegramWebLoginCode(code);
    if (!subscriber) {
      return Response.json({ error: "Неверный или просроченный код. Запросите новый код в боте командой /web" }, { status: 401 });
    }

    const username = subscriber.username || subscriber.firstName || `tg_${subscriber.chatId}`;
    const sessionToken = await createSession(username, "tender_specialist", subscriber.userId);

    return Response.json(
      { ok: true, username, role: "tender_specialist" },
      {
        headers: {
          "Set-Cookie": sessionCookie(sessionToken),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ошибка сервера";
    return Response.json({ error: message }, { status: 500 });
  }
}
