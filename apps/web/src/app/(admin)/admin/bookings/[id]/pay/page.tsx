'use client';

import { useEffect, useMemo, useState } from 'react';
import { use as usePromise } from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

// Minimal pay-page stub. M will wire the real organizer / participant context
// from the bookings detail page in M3 polish.

type IntentResponse = {
  data: {
    paymentId: string;
    providerTransactionId: string;
    clientSecret: string;
    status: 'pending' | 'requires_action' | 'succeeded';
  };
};

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripeJs(): Promise<StripeJs | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

async function createIntent(
  bookingId: string,
  payerUserId: string,
  amountMinor: number,
  currency: string,
): Promise<IntentResponse> {
  const res = await fetch('/api/v1/payments/intent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-feera-dev-admin': '1',
    },
    body: JSON.stringify({ bookingId, payerUserId, amountMinor, currency }),
  });
  if (!res.ok) throw new Error(`intent failed: ${res.status}`);
  return res.json();
}

function CheckoutForm() {
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
      confirmParams: {
        return_url: window.location.href,
      },
    });
    if (error) setErr(error.message ?? 'Payment failed.');
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <PaymentElement />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Confirming...' : 'Pay'}
      </button>
    </form>
  );
}

export default function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = usePromise(params);

  // Stub controls so M can poke this page directly during M3 polish.
  const [payerUserId, setPayerUserId] = useState('');
  const [amountMinor, setAmountMinor] = useState(50000);
  const [currency, setCurrency] = useState('PKR');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stripeJs = useMemo(() => getStripeJs(), []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setErr('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set. Cannot mount Stripe.');
    }
  }, []);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const out = await createIntent(bookingId, payerUserId, amountMinor, currency);
      setClientSecret(out.data.clientSecret);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Pay for booking {bookingId}</h1>

      {!clientSecret ? (
        <div className="space-y-3 max-w-md">
          <label className="block text-sm">
            Payer user id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={payerUserId}
              onChange={(e) => setPayerUserId(e.target.value)}
              placeholder="uuid"
            />
          </label>
          <label className="block text-sm">
            Amount (minor units)
            <input
              type="number"
              className="mt-1 w-full rounded border px-2 py-1"
              value={amountMinor}
              onChange={(e) => setAmountMinor(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            Currency
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </label>
          <button
            type="button"
            disabled={loading || !payerUserId}
            onClick={start}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Creating intent...' : 'Start payment'}
          </button>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      ) : (
        <Elements stripe={stripeJs} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      )}
    </main>
  );
}
