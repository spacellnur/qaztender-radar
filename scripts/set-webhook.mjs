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
const token = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "8719115205:AAFO6sZ6p0HN_IKFFpnDGp97fTYQ6hxTpoM";
const domain = process.argv[2] || process.env.PUBLIC_URL;

if (!domain) {
  console.error("❌ Укажите публичный HTTPS-адрес вашего сервера.");
  console.log("👉 Использование: node scripts/set-webhook.mjs https://qaztender.kz");
  process.exit(1);
}

const webhookUrl = `${domain.replace(/\/+$/, "")}/api/telegram/webhook`;

async function setWebhook() {
  console.log(`🔄 Установка Telegram Webhook на адрес: ${webhookUrl}...`);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log("✅ Webhook успешно установлен в Telegram!");
      console.log(`ℹ️ Ответ Telegram: ${data.description}`);
    } else {
      console.error("❌ Ошибка установки webhook:", data.description);
    }
  } catch (err) {
    console.error("❌ Сетевая ошибка:", err.message);
  }
}

setWebhook();
