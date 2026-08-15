import { readSessionFromRequest } from "@/app/auth";
import { createTelegramConnectToken, getTelegramSubscriberByUserId } from "@/app/db";

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId || `admin:${session.username}`;
  const subscriber = await getTelegramSubscriberByUserId(userId);
  return Response.json({ subscriber });
}

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId || `admin:${session.username}`;
  const token = await createTelegramConnectToken(userId);
  const connectUrl = `https://t.me/QazTendeRadar_bot?start=${token}`;
  return Response.json({ token, connectUrl });
}
