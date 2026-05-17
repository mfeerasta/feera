import Link from 'next/link';

interface Props {
  headline: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}

/**
 * Calm flex.one-style empty state. Serif headline, quiet body, optional CTA.
 */
export function EmptyState({ headline, body, ctaHref, ctaLabel }: Props) {
  return (
    <div className="border border-ink-deep/15 bg-paper px-8 py-16 text-center">
      <h2 className="font-serif text-3xl tracking-tight text-ink-deep">
        {headline}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-deep/60">
        {body}
      </p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-8 inline-flex items-center justify-center border border-ink-deep px-6 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
