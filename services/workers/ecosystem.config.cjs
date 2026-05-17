/**
 * PM2 process definition for the Feera background workers on Hetzner Falkenstein.
 * Launch with: `pm2 start ecosystem.config.cjs` from this directory.
 * One-off jobs: `pm2 exec feera-workers -- run rating-recalculation`.
 */
module.exports = {
  apps: [
    {
      name: 'feera-workers',
      script: 'dist/index.js',
      args: 'scheduler',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/var/log/feera/workers.out.log',
      error_file: '/var/log/feera/workers.err.log',
      merge_logs: true,
      time: false,
    },
  ],
};
