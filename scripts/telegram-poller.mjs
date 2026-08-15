import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const env = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        env[match[1]] = (match[2] || "").trim();
      }
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not found in .env.local");
  process.exit(1);
}

console.log("🤖 Запуск локального Telegram Poller для @QazTendeRadar_bot...");

// Clear webhook so getUpdates works
try {
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  console.log("✓ Webhook сброшен для локального поллинга.");
} catch (err) {
  console.error("Failed to delete webhook:", err);
}

let offset = 0;

async function poll() {
  while (true) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`);
      if (!response.ok) {
        console.error("Error from Telegram API:", response.status, response.statusText);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      const data = await response.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          console.log(`[Telegram Update #${update.update_id}]`, update.message?.text || update.callback_query?.data || "update received");

          try {
            const webhookRes = await fetch(`${serverUrl}/api/telegram/webhook`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(update),
            });
            const resData = await webhookRes.json().catch(() => ({}));
            console.log(`[Webhook Response] status ${webhookRes.status}:`, resData);
          } catch (hookErr) {
            console.error("Failed to forward update to webhook endpoint:", hookErr.message);
          }
        }
      }
    } catch (err) {
      console.error("Polling error:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

poll();
