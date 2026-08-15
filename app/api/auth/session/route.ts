import { readSessionFromRequest } from "../../../auth";
import { getTelegramSubscriberByChatId, getTelegramSubscriberByUserId } from "../../../db";

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });

  let subscription = null;
  if (session.role === "super_admin") {
    subscription = {
      active: true,
      isTrial: false,
      daysLeft: 9999,
      expiresStr: "Бессрочно (Администратор)",
      status: "active_paid",
      companyInfo: "Администрация платформы",
      referralsCount: 0,
    };
  } else if (session.userId) {
    const sub = await getTelegramSubscriberByUserId(session.userId);
    if (sub) {
      const now = Date.now();
      const subExpires = sub.subscriptionExpiresAt || 0;
      const trialExpires = sub.trialExpiresAt || (sub.createdAt + 3 * 24 * 60 * 60 * 1000);
      const isPaid = subExpires > now;
      const isTrial = !isPaid && trialExpires > now;
      const active = isPaid || isTrial;
      const expiry = isPaid ? subExpires : trialExpires;
      const daysLeft = Math.max(0, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
      const expiresStr = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Almaty" }).format(expiry);

      subscription = {
        active,
        isTrial,
        daysLeft,
        expiresStr,
        status: isPaid ? "active_paid" : (isTrial ? "trial" : "expired"),
        companyInfo: sub.companyInfo || "",
        city: sub.city || "",
        industry: sub.industry || "",
        referralsCount: sub.referralsCount || 0,
        chatId: sub.chatId,
      };
    }
  }

  return Response.json({
    authenticated: true,
    username: session.username,
    role: session.role,
    userId: session.userId,
    subscription,
  });
}

