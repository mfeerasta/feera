/**
 * PM2 process definition for the Feera background workers on Hetzner Falkenstein.
 * Launch with: `pm2 start ecosystem.config.cjs` from this directory.
 * One-off jobs: `pm2 exec feera-workers -- run rating-recalculation`.
 *
 * Env vars consumed by the worker process:
 *   DATABASE_URL / DATABASE_URL_POOLED  - Neon (aws-eu-central-1)
 *   SENTRY_DSN                          - error reporting
 *   TWILIO_ACCOUNT_SID                  - Twilio API client
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID        - optional, preferred over TWILIO_SMS_FROM
 *   TWILIO_SMS_FROM                     - fallback E.164 sender if no messaging service
 *   TWILIO_WHATSAPP_FROM                - WhatsApp sender (E.164)
 *   RESEND_API_KEY                      - email
 *   EMAIL_FROM                          - e.g. "Feera <hello@feera.ai>"
 *   EXPO_ACCESS_TOKEN                   - Expo Push (required in production)
 *   ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY - reserved for M7 web push
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
      // The PM2 host should pull these from Doppler / .env at boot.
      env_required: [
        'DATABASE_URL_POOLED',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_FROM',
        'TWILIO_SMS_FROM',
        'RESEND_API_KEY',
        'EMAIL_FROM',
        'EXPO_ACCESS_TOKEN',
        'SENTRY_DSN',
      ],
      out_file: '/var/log/feera/workers.out.log',
      error_file: '/var/log/feera/workers.err.log',
      merge_logs: true,
      time: false,
    },
  ],
};
