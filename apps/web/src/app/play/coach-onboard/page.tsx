import { CoachOnboardForm } from './coach-onboard-form';

export default function CoachOnboardPage() {
  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Become a coach
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight">
            Apply to be listed.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Fill the four steps below. Our team reviews verification within 48 hours.
            You stay invisible to players until verification is approved.
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[920px] px-6 py-12">
          <CoachOnboardForm />
        </div>
      </section>
    </>
  );
}
