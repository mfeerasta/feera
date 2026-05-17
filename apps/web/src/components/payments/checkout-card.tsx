'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Phase 1 checkout card.
 *
 * Renders a flex.one-skinned panel with four payment-method tabs:
 *   - Card (live Stripe Elements)
 *   - Apple Pay  (live, via Stripe-managed wallet button)
 *   - Google Pay (live, via Stripe-managed wallet button)
 *   - Raast QR   (coming soon in Pakistan, static copy)
 *
 * The card variant mounts Stripe Elements with the platform's hairline theme.
 * Wallet tabs reuse the same PaymentElement; Stripe surfaces Apple/Google Pay
 * inline when the user's browser supports them. Raast tab renders only copy.
 *
 * Caller owns minting the PaymentIntent via /api/v1/payments/intent and passes
 * back the clientSecret; this component never talks to that endpoint directly.
 */

export type CheckoutMethod = 'card' | 'apple_pay' | 'google_pay' | 'raast';

interface CheckoutCardProps {
  bookingId: string;
  payerUserId: string;
  amountMinor: number;
  currency: string;
  /** Where to send the user after a successful confirmation. */
  returnUrl: string;
  /** When supplied, organizer label shows this many seats in the summary. */
  seats?: number;
  perSeatMinor?: number;
  /** Inverted skin: dark surface on a light page. Default is `auto`. */
  surface?: 'auto' | 'dark' | 'light';
}

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripeJs(): Promise<StripeJs | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

interface CreateIntentInput {
  bookingId: string;
  payerUserId: string;
  amountMinor: number;
  currency: string;
}

async function createIntent(
  input: CreateIntentInput,
): Promise<{ clientSecret: string }> {
  const res = await fetch('/api/v1/payments/intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Could not start payment (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as { data: { clientSecret: string } };
  return { clientSecret: json.data.clientSecret };
}

function formatAmount(minor: number, currency: string): string {
  // Currency-aware. Falls back gracefully for unknown codes.
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(0)} ${currency}`;
  }
}

function MethodTab({
  active,
  label,
  caption,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  caption?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'feera-motion flex-1 border-b-2 px-4 py-3 text-left disabled:opacity-50',
        active
          ? 'border-[color:var(--color-accent)] text-[color:var(--color-fg)]'
          : 'border-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]',
      )}
    >
      <span className="block text-sm tracking-wide">{label}</span>
      {caption && (
        <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {caption}
        </span>
      )}
    </button>
  );
}

function StripeCheckout({
  returnUrl,
}: {
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) {
      setErr(error.message ?? 'Payment did not complete. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: 'auto' },
        }}
      />
      {err && (
        <p className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {err}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={!stripe || submitting}
        className="w-full"
      >
        {submitting ? 'Confirming...' : 'Confirm payment'}
      </Button>
    </form>
  );
}

function RaastComingSoon() {
  return (
    <div className="space-y-3 border border-[color:var(--color-border)] bg-[color:var(--color-bg-fold)] px-6 py-8 text-sm text-[color:var(--color-fg-muted)]">
      <p className="font-serif text-lg tracking-tight text-[color:var(--color-fg)]">
        Raast QR is coming soon.
      </p>
      <p>
        We are integrating Raast for direct, fee-free bank transfers across
        Pakistan. Until it goes live, please complete payment by card. The full
        seat amount will reach your club regardless of method.
      </p>
    </div>
  );
}

export function CheckoutCard(props: CheckoutCardProps) {
  const {
    bookingId,
    payerUserId,
    amountMinor,
    currency,
    returnUrl,
    seats,
    perSeatMinor,
  } = props;

  const [method, setMethod] = useState<CheckoutMethod>('card');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stripeJs = useMemo(() => getStripeJs(), []);
  const stripeAvailable = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  useEffect(() => {
    let cancelled = false;
    if (method === 'raast') return;
    if (clientSecret) return;
    if (!stripeAvailable) {
      setErr(
        'Online payments are not yet enabled on this environment. Ask the club to confirm your seat manually.',
      );
      return;
    }
    setLoading(true);
    setErr(null);
    createIntent({ bookingId, payerUserId, amountMinor, currency })
      .then((out) => {
        if (!cancelled) setClientSecret(out.clientSecret);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, payerUserId, amountMinor, currency, stripeAvailable, method, clientSecret]);

  const surface = props.surface ?? 'auto';
  const wrapperDataTheme =
    surface === 'auto' ? undefined : surface === 'dark' ? 'dark' : 'light';

  return (
    <div
      data-theme={wrapperDataTheme}
      className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]"
    >
      <header className="flex items-baseline justify-between border-b border-[color:var(--color-border)] px-6 py-5">
        <div>
          <span className="block text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            You pay
          </span>
          <p className="mt-1 font-serif text-3xl tracking-tight text-[color:var(--color-fg)]">
            {formatAmount(amountMinor, currency)}
          </p>
          {typeof seats === 'number' && typeof perSeatMinor === 'number' && (
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              {seats} seat{seats === 1 ? '' : 's'} at{' '}
              {formatAmount(perSeatMinor, currency)} each
            </p>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Secure checkout
        </span>
      </header>

      <nav className="flex border-b border-[color:var(--color-border)]">
        <MethodTab
          active={method === 'card'}
          label="Card"
          onClick={() => setMethod('card')}
        />
        <MethodTab
          active={method === 'apple_pay'}
          label="Apple Pay"
          caption="via Stripe"
          onClick={() => setMethod('apple_pay')}
        />
        <MethodTab
          active={method === 'google_pay'}
          label="Google Pay"
          caption="via Stripe"
          onClick={() => setMethod('google_pay')}
        />
        <MethodTab
          active={method === 'raast'}
          label="Raast QR"
          caption="Coming soon"
          onClick={() => setMethod('raast')}
        />
      </nav>

      <div className="px-6 py-6">
        {method === 'raast' ? (
          <RaastComingSoon />
        ) : err ? (
          <p className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
            {err}
          </p>
        ) : loading || !clientSecret ? (
          <div className="flex items-center justify-center py-10">
            <span className="feera-loading text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
              Preparing secure checkout
            </span>
          </div>
        ) : (
          <Elements
            stripe={stripeJs}
            options={{
              clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: '#437E5B',
                  colorBackground: 'transparent',
                  colorText: 'currentColor',
                  colorDanger: '#dc2626',
                  borderRadius: '0px',
                  fontFamily: 'inherit',
                },
                rules: {
                  '.Input': {
                    border: '1px solid currentColor',
                    boxShadow: 'none',
                  },
                  '.Tab': {
                    border: '1px solid currentColor',
                    boxShadow: 'none',
                  },
                },
              },
            }}
          >
            <StripeCheckout returnUrl={returnUrl} />
          </Elements>
        )}
      </div>

      <footer className="border-t border-[color:var(--color-border)] px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
        Payments processed by Stripe. Your card details never reach Feera servers.
      </footer>
    </div>
  );
}
