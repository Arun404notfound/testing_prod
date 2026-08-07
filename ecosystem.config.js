// PM2 process config for production. Single instance only — the app uses
// SQLite via better-sqlite3, which is a single-writer database; running
// multiple Node instances against the same file risks "database is locked"
// errors under concurrent writes.
module.exports = {
  apps: [
    {
      name: "timespro",
      cwd: __dirname,
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
