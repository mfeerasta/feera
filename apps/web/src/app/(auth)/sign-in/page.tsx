/**
 * Sign-in entry point.
 *
 * Server Component that renders the layout + brand chrome and hands
 * interactive state to the co-located client form. Three options:
 *   - phone OTP (default for PK)
 *   - email magic link (default elsewhere)
 *   - Google + Apple OAuth
 */

import { headers } from 'next/headers';
import Link from 'next/link';
import { SignInForm } from './sign-in-form';
import { peekDevOtp } from '@feera/auth';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const h = await headers();
  const country = h.get('x-country') ?? h.get('cf-ipcountry') ?? 'PK';
  const defaultMode = country === 'PK' ? 'phone' : 'email';
  const isDev =
    params.dev === '1' &&
    (process.env.NODE_ENV !== 'production' ||
      process.env.AUTH_DEV_OTP === '1');

  let devOtpHint: { phone: string; code: string } | null = null;
  if (isDev) {
    const lastPhone = h.get('cookie')?.match(/feera_dev_last_phone=([^;]+)/)?.[1];
    if (lastPhone) {
      const decoded = decodeURIComponent(lastPhone);
      const code = peekDevOtp(decoded);
      if (code) devOtpHint = { phone: decoded, code };
    }
  }

  return (
    <main className="min-h-screen bg-ink-deep text-cream">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight text-cream">
            feera
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1280px] grid-cols-1 px-6 md:grid-cols-2">
        {/* Left — greeting */}
        <section className="flex flex-col justify-center gap-6 py-[107px] pr-0 md:pr-12">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Sign in
          </p>
          <h1 className="font-serif text-6xl leading-none tracking-[-0.02em] text-cream">
            Welcome back.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-cream/70">
            Phone, email, or social. Pick what suits you and we will keep you
            signed in across web and mobile.
          </p>
        </section>

        {/* Right — form */}
        <section className="flex flex-col justify-center py-[107px] md:pl-12">
          <div className="w-full max-w-md">
            <SignInForm defaultMode={defaultMode} />

            <p className="mt-8 text-xs text-cream/40">
              By continuing you agree to our terms and privacy policy.
            </p>

            {isDev && (
              <div className="mt-8 border border-brass/40 px-4 py-3 text-xs text-cream/80">
                <p className="font-medium uppercase tracking-[0.2em] text-brass">
                  Dev OTP mode
                </p>
                <p className="mt-2 text-cream/60">
                  Twilio not configured. Codes log to server stdout and surface
                  here.
                </p>
                {devOtpHint && (
                  <p className="mt-2 font-mono">
                    Last: {devOtpHint.phone} -&gt;{' '}
                    <strong className="text-brass">{devOtpHint.code}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
