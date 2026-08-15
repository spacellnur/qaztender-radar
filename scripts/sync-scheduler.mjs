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
const port = process.env.PORT || "3000";
const serverUrl = process.env.SERVER_URL || `http://127.0.0.1:${port}`;

console.log("⏰ Запуск адаптивного смарт-планировщика синхронизации QazTender Radar...");
console.log("⚡ Рабочие часы (08:30 - 19:30): микро-синхронизация каждые 15 минут для мгновенного обнаружения новых лотов");
console.log("🌙 Внерабочие часы (19:30 - 22:00): раз в 60 минут | Ночь (22:00 - 08:30): спящий режим раз в 3 часа");

let lastSyncTime = 0;

async function checkAndSync() {
  const now = Date.now();
  const almatyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
  const hour = almatyDate.getHours();
  const minute = almatyDate.getMinutes();
  const currentMinutesOfDay = hour * 60 + minute;

  // Adaptive interval in milliseconds:
  // - High active working hours (08:30 to 19:30): every 15 minutes
  // - Evening (19:30 to 22:00): every 45 minutes
  // - Night (22:00 to 08:30): every 180 minutes (3 hours)
  let intervalMs = 15 * 60 * 1000;
  if (currentMinutesOfDay >= 8 * 60 + 30 && currentMinutesOfDay <= 19 * 60 + 30) {
    intervalMs = 15 * 60 * 1000; // 15 min during peak procurement hours
  } else if (currentMinutesOfDay > 19 * 60 + 30 && currentMinutesOfDay < 22 * 60) {
    intervalMs = 45 * 60 * 1000; // 45 min in the evening
  } else {
    intervalMs = 180 * 60 * 1000; // 3 hours during night
  }

  if (now - lastSyncTime >= intervalMs) {
    console.log(`[${almatyDate.toLocaleTimeString("ru-RU")}] 🚀 Запуск синхронизации (режим: ${intervalMs / 60000} мин)...`);
    lastSyncTime = now;
    try {
      const res = await fetch(`${serverUrl}/api/cron/sync`, { method: "POST" });
      const data = await res.json();
      console.log(`[${almatyDate.toLocaleTimeString("ru-RU")}] ✅ Синхронизировано:`, data.sync?.saved ?? 0, "тендеров. Дедлайн-алертов отправлено:", data.deadlinesSent ?? 0);
    } catch (err) {
      console.error(`[${almatyDate.toLocaleTimeString("ru-RU")}] ❌ Ошибка выполнения синхронизации:`, err);
    }
  }
}

// Keep-Alive Heartbeat: pings the public Render endpoint every 9 minutes so Render free tier never sleeps
const publicUrl = process.env.PUBLIC_APP_URL || "https://qaztender-radar-xf7n.onrender.com";
setInterval(async () => {
  try {
    const res = await fetch(`${publicUrl}/api/telegram/webhook`);
    console.log(`[Heartbeat] ❤️ Render Keep-Alive status: ${res.status}`);
  } catch (e) {
    console.warn(`[Heartbeat] Keep-Alive ping warning: ${e.message}`);
  }
}, 9 * 60 * 1000);

// Initial sync on start
await checkAndSync();

// Check scheduler loop every 30 seconds
setInterval(checkAndSync, 30 * 1000);


