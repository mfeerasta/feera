'use client';

/**
 * Hand-rolled theme toggle. No deps. Three states cycle on click:
 *
 *   auto -> light -> dark -> auto
 *
 * - 'auto' follows prefers-color-scheme.
 * - Choice persists in localStorage.feera-theme.
 * - First-paint flash is prevented by the inline boot script in
 *   apps/web/src/app/layout.tsx; this component only handles changes
 *   after hydration.
 */

import { useEffect, useState, useCallback } from 'react';

type Mode = 'auto' | 'light' | 'dark';
const STORAGE_KEY = 'feera-theme';

function resolve(mode: Mode): 'light' | 'dark' {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function apply(mode: Mode) {
  if (typeof document === 'undefined') return;
  const resolved = resolve(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.dataset.themeChoice = mode;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<Mode>('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== 'undefined'
      ? (window.localStorage.getItem(STORAGE_KEY) as Mode | null)
      : null) ?? 'auto';
    setMode(stored);
    apply(stored);
    setMounted(true);

    // React to system theme changes while in 'auto'.
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const current = (window.localStorage.getItem(STORAGE_KEY) as Mode | null) ?? 'auto';
      if (current === 'auto') apply('auto');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next: Mode = prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore quota / privacy mode errors.
      }
      apply(next);
      return next;
    });
  }, []);

  const resolved = mounted ? resolve(mode) : 'dark';
  const label =
    mode === 'auto'
      ? 'Theme: auto (click to switch to light)'
      : mode === 'light'
        ? 'Theme: light (click to switch to dark)'
        : 'Theme: dark (click to switch to auto)';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className={`feera-motion inline-flex h-9 w-9 items-center justify-center border border-[color:var(--color-border)] text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] ${className}`}
    >
      {/* Sun / moon morph in pure SVG; rotates between states. */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{
          transition: 'transform var(--transition-default)',
          transform: resolved === 'light' ? 'rotate(0deg)' : 'rotate(-40deg)',
        }}
      >
        {resolved === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
      {/* Tiny dot indicator when in 'auto'. */}
      {mode === 'auto' && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -end-0.5 block h-1.5 w-1.5 bg-[color:var(--color-accent)]"
          style={{ position: 'relative', insetInlineEnd: '-7px', insetBlockEnd: '-7px' }}
        />
      )}
    </button>
  );
}
