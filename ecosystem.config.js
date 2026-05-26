/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'sinaicamps',
      script: 'server.js',
      cwd: '/home/ubuntu/marketplace',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '800M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
      kill_timeout: 30000,
      listen_timeout: 10000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      shutdown_with_message: true,
    },
  ],
};
