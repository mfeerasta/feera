import type { CheckoutInput, PaymentProvider, PaymentProviderName } from './types.js';

/**
 * Picks the right provider per user country + currency + explicit preference.
 *
 * Default routing per ADR-0003 / spec:
 *   PK + PKR  -> raast > jazzcash > easypaisa > stripe (card fallback)
 *   UAE + AED -> stripe (Apple Pay default)
 *   all other -> stripe
 *
 * Adapters that throw NotImplemented (the Phase-1 stubs) are skipped automatically.
 */

export type PaymentRouterOptions = Readonly<{
  providers: ReadonlyMap<PaymentProviderName, PaymentProvider>;
}>;

export class PaymentRouter {
  constructor(private readonly opts: PaymentRouterOptions) {}

  pickProviderChain(input: CheckoutInput): readonly PaymentProvider[] {
    const country = input.payerCountryCode;
    const currency = input.currency;

    const chain: PaymentProviderName[] =
      country === 'PK' && currency === 'PKR'
        ? ['raast', 'jazzcash', 'easypaisa', 'stripe']
        : ['stripe'];

    const out: PaymentProvider[] = [];
    for (const name of chain) {
      const p = this.opts.providers.get(name);
      if (p && p.supportedCountries.includes(country) && p.supportedCurrencies.includes(currency)) {
        out.push(p);
      }
    }
    if (out.length === 0) {
      throw new Error(`No payment provider routes ${country}/${currency}`);
    }
    return out;
  }

  /** Try providers in order, fall through on `NotImplemented` only. Real failures bubble. */
  async createCheckout(input: CheckoutInput) {
    const chain = this.pickProviderChain(input);
    let lastErr: unknown;
    for (const p of chain) {
      try {
        return await p.createCheckout(input);
      } catch (err) {
        if (err instanceof NotImplemented) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw new Error(
      `All providers in chain returned NotImplemented for ${input.payerCountryCode}/${input.currency}: ${String(lastErr)}`,
    );
  }
}

export class NotImplemented extends Error {
  constructor(provider: PaymentProviderName) {
    super(`Payment provider not implemented in Phase 1: ${provider}`);
    this.name = 'NotImplemented';
  }
}
