/**
 * Twilio Verify adapter on the WhatsApp channel. Used in PK by default.
 *
 * Same Verify service as SMS; channel is set per-request.
 */

import { sendOtp, verifyOtp } from './phone-otp';

export async function sendWhatsappOtp(phone: string) {
  return sendOtp(phone, 'whatsapp');
}

export async function verifyWhatsappOtp(phone: string, code: string) {
  return verifyOtp(phone, code);
}

/**
 * Hook factory that routes the phoneNumber plugin through WhatsApp
 * instead of SMS. Wire conditionally based on user locale or country
 * at the route handler layer.
 */
export function whatsappOtpSender() {
  return async ({ phoneNumber }: { phoneNumber: string }) => {
    await sendWhatsappOtp(phoneNumber);
  };
}
