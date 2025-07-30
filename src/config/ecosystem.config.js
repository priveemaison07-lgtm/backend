module.exports = {
  apps: [
    {
      name: 'dating-app-api',
      script: 'dist/main.js', // or 'npm run start:prod'
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PM2_USAGE: true,
      },
      env_development: {
        NODE_ENV: 'production',
        PORT: 3000,
        PM2_USAGE: true,
      },
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/error.log',
      out_file: './logs/combined.log',
      merge_logs: true,
      // Auto restart configuration
      watch: false,
      ignore_watch: ['node_modules', 'logs'],

      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 8000,

      // Health monitoring
      max_restarts: 10,
      min_uptime: '10s',

      // Environment variables for clustering
      node_args: '--max-old-space-size=2048',
    },
  ],
};
