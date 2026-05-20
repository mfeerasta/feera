'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  QUIZ_QUESTION_IDS,
  type AnswerKey,
  type QuestionId,
  type QuizAnswers,
  quizStartingRating,
} from '@/lib/onboarding/skill-quiz';

type Gender = 'm' | 'f' | 'x';
type Visibility = 'public' | 'friends' | 'private';

interface Initial {
  displayName: string;
  city: string;
  gender: string | null;
  genderVisibility: Visibility;
  womenOnlyPoolOptIn: boolean;
}

interface State {
  displayName: string;
  city: string;
  gender: Gender | null;
  genderVisibility: Visibility;
  womenOnlyPoolOptIn: boolean;
  skillQuiz: QuizAnswers;
}

interface QuizCopyOption {
  v: AnswerKey;
  label: string;
}

interface QuizCopyQuestion {
  id: QuestionId;
  title: string;
  options: [QuizCopyOption, QuizCopyOption, QuizCopyOption];
}

const QUIZ_COPY: QuizCopyQuestion[] = [
  {
    id: 'tennisYears',
    title: 'Years playing tennis or another racquet sport?',
    options: [
      { v: 'a', label: 'None' },
      { v: 'b', label: '1 to 3 years' },
      { v: 'c', label: 'More than 3 years' },
    ],
  },
  {
    id: 'padelMonths',
    title: 'How long have you been playing padel?',
    options: [
      { v: 'a', label: 'Less than a month' },
      { v: 'b', label: '1 to 12 months' },
      { v: 'c', label: 'More than a year' },
    ],
  },
  {
    id: 'backWall',
    title: 'Back wall comfort',
    options: [
      { v: 'a', label: 'I avoid using it' },
      { v: 'b', label: 'I hit some shots off it' },
      { v: 'c', label: 'I use it tactically every point' },
    ],
  },
  {
    id: 'attendance',
    title: 'How many matches do you play a month?',
    options: [
      { v: 'a', label: '0 to 1' },
      { v: 'b', label: '2 to 4' },
      { v: 'c', label: '5 or more' },
    ],
  },
  {
    id: 'serve',
    title: 'Service consistency',
    options: [
      { v: 'a', label: 'I often double-fault' },
      { v: 'b', label: 'Mostly in' },
      { v: 'c', label: 'Spin and placement under control' },
    ],
  },
  {
    id: 'lob',
    title: 'Defensive lobbing',
    options: [
      { v: 'a', label: 'Rarely' },
      { v: 'b', label: 'Sometimes' },
      { v: 'c', label: 'Regularly, with intent' },
    ],
  },
  {
    id: 'bandejaVibora',
    title: 'Bandeja or vibora',
    options: [
      { v: 'a', label: 'Neither yet' },
      { v: 'b', label: 'One of them' },
      { v: 'c', label: 'Both, comfortably' },
    ],
  },
  {
    id: 'tournaments',
    title: 'Highest tournament level you have competed in',
    options: [
      { v: 'a', label: 'Never competed' },
      { v: 'b', label: 'Club level' },
      { v: 'c', label: 'Regional or higher' },
    ],
  },
];

const inputCls =
  'h-12 w-full rounded-none border border-ink-deep/30 bg-paper px-4 text-sm text-ink-deep focus:border-court focus:outline-none';
const labelCls = 'text-[10px] uppercase tracking-[0.22em] text-ink-deep/60';
const helpCls = 'mt-2 text-xs leading-relaxed text-ink-deep/55';
const btnPrimary =
  'inline-flex h-12 items-center justify-center border border-ink-deep bg-ink-deep px-6 text-sm text-cream transition-colors duration-150 hover:bg-court hover:border-court disabled:opacity-40 disabled:pointer-events-none';
const btnGhost =
  'inline-flex h-12 items-center justify-center border border-ink-deep/30 bg-transparent px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-ink-deep';

function asGender(g: string | null): Gender | null {
  return g === 'm' || g === 'f' || g === 'x' ? g : null;
}

export function OnboardingForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<State>({
    displayName: initial.displayName,
    city: initial.city,
    gender: asGender(initial.gender),
    genderVisibility: initial.genderVisibility,
    womenOnlyPoolOptIn: initial.womenOnlyPoolOptIn,
    skillQuiz: {},
  });

  const canAdvanceStep1 = form.displayName.trim().length >= 1 && form.city.trim().length >= 1;
  const canAdvanceStep2 = form.gender !== null;
  const quizAnsweredCount = QUIZ_QUESTION_IDS.filter((id) => form.skillQuiz[id]).length;
  const canAdvanceStep3 = quizAnsweredCount === QUIZ_QUESTION_IDS.length;
  const previewRating = quizStartingRating(form.skillQuiz);

  function next() {
    setError(null);
    if (step === 1 && !canAdvanceStep1) {
      setError('Please add your name and city before continuing.');
      return;
    }
    if (step === 2 && !canAdvanceStep2) {
      setError('Pick one option to continue. You can update this later.');
      return;
    }
    if (step === 3 && !canAdvanceStep3) {
      setError('Answer every question so we can place you on the right ladder.');
      return;
    }
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 4));
  }

  function back() {
    setError(null);
    setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));
  }

  async function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/me', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            displayName: form.displayName.trim(),
            city: form.city.trim() === '' ? null : form.city.trim(),
            gender: form.gender,
            genderVisibility: form.genderVisibility,
            // Only persist the women pool opt-in for female players.
            womenOnlyPoolOptIn: form.gender === 'f' ? form.womenOnlyPoolOptIn : false,
            skillQuizAnswers: form.skillQuiz,
            startingRating: previewRating,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          setError(body?.message ?? `Save failed (HTTP ${res.status}).`);
          return;
        }
        router.push('/me');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error.');
      }
    });
  }

  return (
    <div className="space-y-10">
      <ol className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-ink-deep/40">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            className={`flex items-center gap-2 ${
              n === step ? 'text-ink-deep' : n < step ? 'text-court' : ''
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center border ${
                n === step
                  ? 'border-ink-deep'
                  : n < step
                    ? 'border-court text-court'
                    : 'border-ink-deep/30'
              }`}
            >
              {n}
            </span>
            <span>
              {n === 1 ? 'Profile' : n === 2 ? 'Gender' : n === 3 ? 'Level' : 'Privacy'}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={labelCls} htmlFor="ob-name">
              Display name
            </label>
            <input
              id="ob-name"
              type="text"
              className={`${inputCls} mt-2`}
              maxLength={160}
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Aisha K."
              autoFocus
            />
            <p className={helpCls}>
              What other players see on your profile and in match listings.
            </p>
          </div>
          <div>
            <label className={labelCls} htmlFor="ob-city">
              City
            </label>
            <input
              id="ob-city"
              type="text"
              className={`${inputCls} mt-2`}
              maxLength={80}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Lahore"
            />
            <p className={helpCls}>
              Used to surface clubs and open matches near you.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className={labelCls}>Gender</p>
          <p className={helpCls}>
            Used for matchmaking and tournament eligibility. You can change this
            in your profile. We never display your gender unless you choose to.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { v: 'm' as const, label: 'Man' },
              { v: 'f' as const, label: 'Woman' },
              { v: 'x' as const, label: 'Prefer not to say' },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, gender: opt.v }))}
                className={`h-14 border px-4 text-left text-sm ${
                  form.gender === opt.v
                    ? 'border-ink-deep bg-ink-deep text-cream'
                    : 'border-ink-deep/30 bg-paper text-ink-deep hover:border-ink-deep'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <div>
            <p className={labelCls}>Quick level check</p>
            <p className={helpCls}>
              Eight short questions place you on the right ladder. You can play
              your first matches at this level. The system fine-tunes from real
              results from match one onward.
            </p>
          </div>
          <div className="space-y-6">
            {QUIZ_COPY.map((q, idx) => (
              <fieldset key={q.id} className="border border-ink-deep/15 p-4">
                <legend className="px-2 text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                  {idx + 1} / {QUIZ_COPY.length}
                </legend>
                <p className="mb-3 text-sm text-ink-deep">{q.title}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {q.options.map((opt) => {
                    const selected = form.skillQuiz[q.id] === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            skillQuiz: { ...f.skillQuiz, [q.id]: opt.v },
                          }))
                        }
                        className={`min-h-12 border px-3 py-2 text-left text-xs leading-snug ${
                          selected
                            ? 'border-ink-deep bg-ink-deep text-cream'
                            : 'border-ink-deep/25 bg-paper text-ink-deep hover:border-ink-deep'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="border border-court/40 bg-paper p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-court">
              Starting level (preview)
            </p>
            <p className="mt-1 font-serif text-2xl text-ink-deep">
              {previewRating.toFixed(1)}
            </p>
            <p className={`${helpCls} mt-2`}>
              Answered {quizAnsweredCount} of {QUIZ_COPY.length}. We keep
              everyone provisional until they have a few real matches.
            </p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8">
          <div>
            <p className={labelCls}>Who can see your gender?</p>
            <p className={helpCls}>
              You control who sees this on your profile, on club rosters, and in
              match listings. Open matches, level, and reliability are always
              visible to other players, regardless of this setting.
            </p>
            <div className="mt-4 space-y-2">
              {[
                {
                  v: 'public' as const,
                  title: 'Anyone can see',
                  body: 'Players, clubs, and tournament organizers can see your gender.',
                },
                {
                  v: 'friends' as const,
                  title: 'Only your accepted friends see',
                  body: 'Friends you have explicitly added can see it. No one else.',
                },
                {
                  v: 'private' as const,
                  title: 'Only you see',
                  body: 'Hidden from everyone except you. Matchmaking still uses it.',
                },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className={`flex cursor-pointer items-start gap-4 border p-4 ${
                    form.genderVisibility === opt.v
                      ? 'border-ink-deep bg-paper'
                      : 'border-ink-deep/15 bg-paper hover:border-ink-deep/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="vis"
                    value={opt.v}
                    checked={form.genderVisibility === opt.v}
                    onChange={() =>
                      setForm((f) => ({ ...f, genderVisibility: opt.v }))
                    }
                    className="mt-1"
                  />
                  <span className="block">
                    <span className="block text-sm font-medium text-ink-deep">
                      {opt.title}
                    </span>
                    <span className="mt-1 block text-xs text-ink-deep/60">
                      {opt.body}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {form.gender === 'f' && (
            <div className="border border-brass/40 bg-paper p-5">
              <label className="flex cursor-pointer items-start gap-4">
                <input
                  type="checkbox"
                  checked={form.womenOnlyPoolOptIn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, womenOnlyPoolOptIn: e.target.checked }))
                  }
                  className="mt-1"
                />
                <span className="block">
                  <span className="block text-sm font-medium text-ink-deep">
                    Show me in the women only matchmaking pool
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-ink-deep/60">
                    Unlocks women only open matches and a parallel rating that
                    only changes when you play all female games. Turn it off any
                    time in your profile.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="border border-red-500/30 bg-paper px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        {step > 1 ? (
          <button type="button" onClick={back} className={btnGhost} disabled={pending}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            className={btnPrimary}
            disabled={
              pending ||
              (step === 1
                ? !canAdvanceStep1
                : step === 2
                  ? !canAdvanceStep2
                  : !canAdvanceStep3)
            }
          >
            Continue
          </button>
        ) : (
          <button type="button" onClick={submit} className={btnPrimary} disabled={pending}>
            {pending ? 'Saving' : 'Finish setup'}
          </button>
        )}
      </div>
    </div>
  );
}
