import { readSessionFromRequest } from "@/app/auth";
import { getTelegramSubscriberByUserId } from "@/app/db";
import { sendTelegramMessage } from "@/app/telegram";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId || `admin:${session.username}`;
  const subscriber = await getTelegramSubscriberByUserId(userId);
  if (!subscriber || subscriber.status !== "approved") {
    return Response.json({ error: "Telegram не подключён или ещё не одобрен администратором" }, { status: 400 });
  }

  const testText = `🔔 <b>Тестовое уведомление от QazTender Radar</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ Связка с вашим аккаунтом (@${session.username}) работает корректно!\n\nВы будете получать самые интересные тендеры и горящие дедлайны.`;
  const result = await sendTelegramMessage(subscriber.chatId, testText);

  if (!result.ok) {
    return Response.json({ error: result.description || "Не удалось отправить сообщение в Telegram" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
