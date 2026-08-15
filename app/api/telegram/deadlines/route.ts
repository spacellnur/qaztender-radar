import { readSessionFromRequest } from "@/app/auth";
import { checkAndSendDeadlineAlerts } from "@/app/telegram";

export async function POST(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndSendDeadlineAlerts();
    return Response.json({ ok: true, delivered: result.delivered });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to check deadlines" }, { status: 500 });
  }
}
