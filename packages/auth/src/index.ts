/**
 * Public barrel for @feera/auth.
 *
 * Server-only side effects (DB connection, env reads) live in
 * `./server`. Import the client modules only from client code.
 */

export { auth } from './server';
export type { Auth, Session } from './server';

export {
  buildFeeraClaims,
  feeraAdditionalUserFields,
} from './jwt-claims';
export type { FeeraJwtClaims } from './jwt-claims';

export * as authSchema from './schema/auth-tables';

export { sendOtp, verifyOtp, phoneOtpSender } from './plugins/phone-otp';
export {
  sendWhatsappOtp,
  verifyWhatsappOtp,
  whatsappOtpSender,
} from './plugins/whatsapp-otp';
export { sendMagicLinkEmail, magicLinkSender } from './plugins/magic-link';
