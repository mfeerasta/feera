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
 * Hook factory for better-auth's phoneNumber plugin.
 *   phoneNumber({ sendOTP: phoneOtpSender(), ... })
 */
export function phoneOtpSender(cfg: TwilioVerifyConfig = {}) {
  return async ({ phoneNumber }: { phoneNumber: string }) => {
    await sendOtp(phoneNumber, 'sms', cfg);
  };
}
