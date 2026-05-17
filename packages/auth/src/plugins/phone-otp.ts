/**
 * Twilio Verify adapter for phone-number SMS OTP.
 *
 * Used by better-auth's phoneNumber plugin via its `sendOTP` hook.
 * We do not store codes ourselves; Twilio Verify owns the TTL,
 * retry, and brute-force guards.
 *
 * Env required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID
 */

import twilio from 'twilio';

type Channel = 'sms' | 'whatsapp';

interface TwilioVerifyConfig {
  accountSid?: string;
  authToken?: string;
  serviceSid?: string;
}

function getClient(cfg: TwilioVerifyConfig = {}) {
  const accountSid = cfg.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = cfg.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = cfg.serviceSid ?? process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    throw new Error(
      '[auth/phone-otp] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are required.',
    );
  }
  return { client: twilio(accountSid, authToken), serviceSid };
}

export async function sendOtp(
  phone: string,
  channel: Channel = 'sms',
  cfg: TwilioVerifyConfig = {},
): Promise<{ sid: string; status: string }> {
  const { client, serviceSid } = getClient(cfg);
  const verification = await client.verify.v2
    .services(serviceSid)
    .verifications.create({ to: phone, channel });
  return { sid: verification.sid, status: verification.status };
}

export async function verifyOtp(
  phone: string,
  code: string,
  cfg: TwilioVerifyConfig = {},
): Promise<{ valid: boolean; status: string }> {
  const { client, serviceSid } = getClient(cfg);
  const check = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to: phone, code });
  return { valid: check.status === 'approved', status: check.status };
}

/**
 * Dev-fallback OTP store. Codes live in-process and expire after 10 minutes.
 * Used ONLY when Twilio env vars are absent AND we are in non-prod or
 * AUTH_DEV_OTP=1. See docs/runbooks/auth.md for the security trade-off.
 */
const devOtpStore = new Map<string, { code: string; expiresAt: number }>();

function devOtpEnabled(): boolean {
  if (process.env.AUTH_DEV_OTP === '1') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

function twilioConfigured(cfg: TwilioVerifyConfig): boolean {
  const accountSid = cfg.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = cfg.authToken ?? process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = cfg.serviceSid ?? process.env.TWILIO_VERIFY_SERVICE_SID;
  return Boolean(accountSid && authToken && serviceSid);
}

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Read the most recent dev OTP for a phone (used by the sign-in page banner
 * when `?dev=1` is present). Returns null if no live code exists.
 */
export function peekDevOtp(phone: string): string | null {
  const entry = devOtpStore.get(phone);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    devOtpStore.delete(phone);
    return null;
  }
  return entry.code;
}

/**
 * Hook factory for better-auth's phoneNumber plugin.
 *   phoneNumber({ sendOTP: phoneOtpSender(), ... })
 *
 * Falls back to in-process dev OTP storage when Twilio env vars are not
 * configured and dev fallback is enabled.
 */
export function phoneOtpSender(cfg: TwilioVerifyConfig = {}) {
  return async ({ phoneNumber }: { phoneNumber: string }) => {
    if (!twilioConfigured(cfg)) {
      if (!devOtpEnabled()) {
        throw new Error(
          '[auth/phone-otp] Twilio env vars missing and dev fallback disabled.',
        );
      }
      const code = genCode();
      devOtpStore.set(phoneNumber, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      console.log(
        `[auth/phone-otp:DEV] OTP for ${phoneNumber} = ${code} (expires in 10m)`,
      );
      return;
    }
    await sendOtp(phoneNumber, 'sms', cfg);
  };
}

/**
 * Verifies an OTP. Dev fallback returns true if the stored code matches.
 */
export async function verifyOtpFallback(
  phone: string,
  code: string,
  cfg: TwilioVerifyConfig = {},
): Promise<{ valid: boolean; status: string }> {
  if (!twilioConfigured(cfg)) {
    if (!devOtpEnabled()) {
      return { valid: false, status: 'twilio_not_configured' };
    }
    const entry = devOtpStore.get(phone);
    if (!entry) return { valid: false, status: 'no_code' };
    if (Date.now() > entry.expiresAt) {
      devOtpStore.delete(phone);
      return { valid: false, status: 'expired' };
    }
    if (entry.code !== code) return { valid: false, status: 'mismatch' };
    devOtpStore.delete(phone);
    return { valid: true, status: 'approved' };
  }
  return verifyOtp(phone, code, cfg);
}
