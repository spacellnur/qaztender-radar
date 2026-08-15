import { spawn } from "node:child_process";

console.log("🚀 Запуск QazTender Radar на Render.com...");

// 1. Start web server
const webProcess = spawn("npx", ["vinext", "start"], {
  stdio: "inherit",
  env: { ...process.env, PORT: process.env.PORT || "3000" },
  shell: true,
});

webProcess.on("error", (err) => {
  console.error("❌ Ошибка запуска веб-сервера:", err);
});

// 2. Start adaptive sync scheduler after 10 seconds (once web server is ready)
setTimeout(() => {
  console.log("⏰ Запуск фонового смарт-планировщика синхронизации...");
  const syncProcess = spawn("node", ["scripts/sync-scheduler.mjs"], {
    stdio: "inherit",
    env: { ...process.env, SERVER_URL: `http://localhost:${process.env.PORT || "3000"}` },
    shell: true,
  });

  syncProcess.on("error", (err) => {
    console.error("❌ Ошибка планировщика синхронизации:", err);
  });
}, 10000);

process.on("SIGTERM", () => {
  console.log("🛑 Получен сигнал завершения SIGTERM...");
  process.exit(0);
});
