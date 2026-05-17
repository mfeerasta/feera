'use client';

/**
 * Client interactivity for the sign-in page. Talks to better-auth via
 * the authClient (@feera/auth/client) which already mounts the phone
 * and magic-link plugins.
 */

import { useState } from 'react';
import { authClient } from '@feera/auth/client';

type Mode = 'phone' | 'email' | 'oauth';
type PhaseState = 'idle' | 'sending' | 'verifying' | 'sent' | 'error';

interface Props {
  defaultMode: Mode;
}

const darkInput =
  'feera-motion mt-2 w-full rounded-none border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:border-[color:var(--color-accent)] focus:outline-none disabled:opacity-50';

const ctaBtn =
  'feera-motion w-full inline-flex items-center justify-center rounded-none border border-[color:var(--color-fg)] bg-transparent px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)] disabled:opacity-50 disabled:pointer-events-none';

const oauthBtn =
  'feera-motion w-full inline-flex items-center justify-center rounded-none border border-[color:var(--color-border)] bg-transparent px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)]';

const eyebrow = 'text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]';

export function SignInForm({ defaultMode }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<PhaseState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSendPhone() {
    setPhase('sending');
    setMessage(null);
    try {
      document.cookie = `feera_dev_last_phone=${encodeURIComponent(phone)}; path=/; max-age=900`;
      const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
      if ((res as { error?: unknown }).error) throw new Error('Send failed.');
      setPhase('sent');
      setMessage('Code sent. Check your phone (or the dev banner).');
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  async function handleVerifyPhone() {
    setPhase('verifying');
    setMessage(null);
    try {
      const res = await authClient.phoneNumber.verify({
        phoneNumber: phone,
        code,
      });
      if ((res as { error?: unknown }).error) throw new Error('Invalid code.');
      window.location.href = '/';
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  async function handleSendMagicLink() {
    setPhase('sending');
    setMessage(null);
    try {
      const res = await authClient.signIn.magicLink({
        email,
        callbackURL: '/',
      });
      if ((res as { error?: unknown }).error) throw new Error('Send failed.');
      setPhase('sent');
      setMessage('Link sent. Check your email (or server logs in dev).');
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  async function handleOauth(provider: 'google' | 'apple') {
    setPhase('sending');
    setMessage(null);
    try {
      await authClient.signIn.social({ provider, callbackURL: '/' });
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      {/* Mode tabs as underlined links */}
      <div className="flex gap-8 border-b border-[color:var(--color-border)] pb-3 text-sm">
        {(['phone', 'email', 'oauth'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setPhase('idle');
              setMessage(null);
            }}
            className={`feera-motion relative pb-3 capitalize ${
              mode === m
                ? 'text-[color:var(--color-fg)]'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
            }`}
          >
            {m}
            {mode === m && (
              <span className="absolute -bottom-[13px] left-0 right-0 h-px bg-[color:var(--color-accent)]" />
            )}
          </button>
        ))}
      </div>

      {mode === 'phone' && (
        <div className="space-y-5">
          <label className="block">
            <span className={eyebrow}>Phone (E.164)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+923001234567"
              className={darkInput}
              disabled={phase === 'sent' || phase === 'verifying'}
            />
          </label>
          {phase !== 'sent' && (
            <button
              type="button"
              onClick={handleSendPhone}
              disabled={!phone || phase === 'sending'}
              className={ctaBtn}
            >
              {phase === 'sending' ? 'Sending...' : 'Send code'}
            </button>
          )}
          {phase === 'sent' && (
            <>
              <label className="block">
                <span className={eyebrow}>6-digit code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${darkInput} font-mono tracking-[0.4em]`}
                />
              </label>
              <button
                type="button"
                onClick={handleVerifyPhone}
                disabled={
                  code.length !== 6 || (phase as PhaseState) === 'verifying'
                }
                className={ctaBtn}
              >
                {(phase as PhaseState) === 'verifying'
                  ? 'Verifying...'
                  : 'Verify and sign in'}
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'email' && (
        <div className="space-y-5">
          <label className="block">
            <span className={eyebrow}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={darkInput}
            />
          </label>
          <button
            type="button"
            onClick={handleSendMagicLink}
            disabled={!email || phase === 'sending'}
            className={ctaBtn}
          >
            {phase === 'sending' ? 'Sending...' : 'Send magic link'}
          </button>
        </div>
      )}

      {mode === 'oauth' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOauth('google')}
            className={oauthBtn}
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOauth('apple')}
            className={oauthBtn}
          >
            Continue with Apple
          </button>
        </div>
      )}

      {message && (
        <p
          className={`text-xs ${
            phase === 'error' ? 'text-red-400' : 'text-court'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
