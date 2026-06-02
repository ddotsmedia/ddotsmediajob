/**
 * PM2 process definitions for DdotsMediaJobs (NO Docker).
 * Start:   pm2 start ecosystem.config.js --env production
 * Reload:  pm2 reload ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'ddots-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production', PORT: '3000' },
      error_file: '../../logs/web-error.log',
      out_file: '../../logs/web-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'ddots-worker',
      cwd: './packages/api',
      script: 'node_modules/.bin/tsx',
      args: 'src/worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
      error_file: '../../logs/worker-error.log',
      out_file: '../../logs/worker-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
