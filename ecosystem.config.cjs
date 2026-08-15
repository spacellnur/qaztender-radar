module.exports = {
  apps: [
    {
      name: "qaztender-web",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      watch: false,
    },
    {
      name: "qaztender-sync",
      script: "scripts/sync-scheduler.mjs",
      env: {
        NODE_ENV: "production",
        SERVER_URL: "http://localhost:3000",
      },
      restart_delay: 5000,
      max_restarts: 20,
      autorestart: true,
      watch: false,
    },
    {
      name: "qaztender-telegram",
      script: "scripts/telegram-poller.mjs",
      env: {
        NODE_ENV: "production",
        SERVER_URL: "http://localhost:3000",
      },
      restart_delay: 5000,
      max_restarts: 20,
      autorestart: true,
      watch: false,
    },
  ],
};
