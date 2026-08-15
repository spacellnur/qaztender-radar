import { handleTelegramUpdate } from "@/app/telegram";

export async function POST(request: Request) {
  try {
    const update = await request.json() as Parameters<typeof handleTelegramUpdate>[0];
    const result = await handleTelegramUpdate(update);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const stack = error instanceof Error ? error.stack : "";
    console.error("❌ Telegram Webhook Error:", message, stack);
    return Response.json({ error: message, stack }, { status: 500 });
  }
}
