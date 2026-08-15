import { handleTelegramUpdate, registerBotCommands } from "@/app/telegram";

let commandsRegistered = false;

export async function GET() {
  const ok = await registerBotCommands();
  return Response.json({ ok, message: "Commands registered with Telegram API" });
}

export async function POST(request: Request) {
  try {
    if (!commandsRegistered) {
      registerBotCommands().catch(() => void 0);
      commandsRegistered = true;
    }
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

