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
    const update = await request.json().catch(() => null) as Parameters<typeof handleTelegramUpdate>[0];
    if (update) {
      await handleTelegramUpdate(update).catch((err) => {
        console.error("❌ Telegram update handling error:", err);
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("❌ Telegram Webhook POST Catch:", message);
    return Response.json({ ok: true, error: message });
  }
}


