/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'sinaicamps',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      kill_timeout: 10000,
      listen_timeout: 30000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
