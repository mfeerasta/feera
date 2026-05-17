import Link from 'next/link';
import { getT } from '@/lib/i18n/t';
import { EditionApplyForm } from './edition-apply-form';

/**
 * Edition application form. M2 stub. Real form ships in M7 with review
 * workflow + referral-source lookup + invitation-code validation.
 */
export const metadata = {
  title: 'Apply — Feera Edition',
  description: 'Apply for a Feera Edition membership.',
};

export default async function EditionApplyPage() {
  const t = await getT();
  return (
    <div className="min-h-screen bg-ink-deep text-cream">
      <header className="border-b border-brass/20">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6">
          <Link
            href="/edition"
            className="font-serif text-xl uppercase tracking-[0.4em] text-brass"
          >
            Feera Edition
          </Link>
          <Link
            href="/edition"
            className="text-xs uppercase tracking-[0.25em] text-cream/70 transition-colors hover:text-brass"
          >
            {t('common.back')}
          </Link>
        </div>
      </header>

      <section className="bg-ink-shadow">
        <div className="mx-auto max-w-3xl px-6 py-[120px]">
          <p className="text-xs uppercase tracking-[0.4em] text-brass">
            {t('edition.applyCta')}
          </p>
          <h1 className="mt-8 font-serif text-5xl leading-tight tracking-tight text-cream md:text-6xl">
            {t('edition.applyTitle')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/70">
            {t('edition.applySubtitle')}
          </p>

          <div className="mt-16">
            <EditionApplyForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-brass/15 bg-ink-deep">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-12 text-xs uppercase tracking-[0.2em] text-cream/40">
          <span>{t('footer.copyright')}</span>
          <Link href="/" className="transition-colors hover:text-brass">
            {t('common.back')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
