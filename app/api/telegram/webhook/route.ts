import { handleTelegramUpdate } from "@/app/telegram";

export async function POST(request: Request) {
  try {
    const update = await request.json() as Parameters<typeof handleTelegramUpdate>[0];
    const result = await handleTelegramUpdate(update);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 });
  }
}
