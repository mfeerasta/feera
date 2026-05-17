'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFilePrivate } from '@/lib/storage/client';

type Step = 'profile' | 'pricing' | 'schedule' | 'verification';

const DAYS: Array<{ key: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'; label: string }> = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const inputCls =
  'h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';
const labelCls = 'text-[10px] uppercase tracking-[0.2em] text-ink-deep/60';
const btnPrimary =
  'inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50';
const btnGhost =
  'inline-flex h-11 items-center justify-center border border-ink-deep/30 px-6 text-sm text-ink-deep/70 transition-colors duration-150 hover:border-ink-deep hover:text-ink-deep';

interface Cert {
  title: string;
  issuer: string;
  year: string;
}

interface Doc {
  kind: 'certification' | 'id' | 'insurance' | 'other';
  url: string;
  label: string;
}

interface DayWindow {
  start: string;
  end: string;
}

export function CoachOnboardForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('profile');

  // Profile
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('English, Urdu');
  const [specialties, setSpecialties] = useState('Beginner technique, Tournament prep');
  const [yearsExperience, setYearsExperience] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');

  // Pricing
  const [hourlyRate, setHourlyRate] = useState('2500');
  const [hourlyRateMax, setHourlyRateMax] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [responseTime, setResponseTime] = useState('24');

  // Schedule: weekday -> windows
  const [schedule, setSchedule] = useState<Record<string, DayWindow[]>>({
    mon: [{ start: '17:00', end: '21:00' }],
    tue: [{ start: '17:00', end: '21:00' }],
    wed: [{ start: '17:00', end: '21:00' }],
    thu: [{ start: '17:00', end: '21:00' }],
    fri: [{ start: '17:00', end: '21:00' }],
  });

  // Verification
  const [certs, setCerts] = useState<Cert[]>([{ title: '', issuer: '', year: '' }]);
  const [docs, setDocs] = useState<Doc[]>([{ kind: 'certification', url: '', label: '' }]);

  const [phase, setPhase] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);

  function addWindow(day: string) {
    setSchedule((s) => ({
      ...s,
      [day]: [...(s[day] ?? []), { start: '09:00', end: '12:00' }],
    }));
  }
  function removeWindow(day: string, idx: number) {
    setSchedule((s) => ({
      ...s,
      [day]: (s[day] ?? []).filter((_, i) => i !== idx),
    }));
  }
  function updateWindow(day: string, idx: number, key: 'start' | 'end', value: string) {
    setSchedule((s) => ({
      ...s,
      [day]: (s[day] ?? []).map((w, i) => (i === idx ? { ...w, [key]: value } : w)),
    }));
  }

  function next() {
    if (step === 'profile') setStep('pricing');
    else if (step === 'pricing') setStep('schedule');
    else if (step === 'schedule') setStep('verification');
  }
  function back() {
    if (step === 'pricing') setStep('profile');
    else if (step === 'schedule') setStep('pricing');
    else if (step === 'verification') setStep('schedule');
  }

  async function submit() {
    setPhase('submitting');
    setMessage(null);
    try {
      const weeklyAvailability: Record<string, DayWindow[]> = {};
      for (const [day, windows] of Object.entries(schedule)) {
        const cleaned = windows.filter((w) => w.start && w.end);
        if (cleaned.length > 0) weeklyAvailability[day] = cleaned;
      }
      const body: Record<string, unknown> = {
        bio: bio.trim(),
        languages: languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        certifications: certs
          .filter((c) => c.title.trim() && c.issuer.trim())
          .map((c) => ({
            title: c.title.trim(),
            issuer: c.issuer.trim(),
            ...(c.year ? { year: Number(c.year) } : {}),
          })),
        hourlyRate: Number(hourlyRate),
        currency,
        responseTimeAvgHours: Number(responseTime),
        weeklyAvailability,
      };
      if (yearsExperience) body.yearsExperience = Number(yearsExperience);
      if (hourlyRateMax) body.hourlyRateMax = Number(hourlyRateMax);
      if (introVideoUrl) body.introVideoUrl = introVideoUrl.trim();

      const res = await fetch('/api/v1/coaches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? `Submission failed (HTTP ${res.status}).`);
      }
      const j = (await res.json()) as {
        data: { userId: string };
      };
      const uid = j.data.userId;
      setCoachUserId(uid);

      const cleanDocs = docs.filter((d) => d.url.trim());
      if (cleanDocs.length > 0) {
        await fetch(`/api/v1/coaches/${uid}/verification`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            documents: cleanDocs.map((d) => ({
              kind: d.kind,
              url: d.url.trim(),
              ...(d.label.trim() ? { label: d.label.trim() } : {}),
            })),
          }),
        });
      }
      setPhase('done');
      setMessage('Application received. Redirecting to your profile.');
      setTimeout(() => router.push(`/play/coaches/${uid}`), 800);
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  const stepIdx = ['profile', 'pricing', 'schedule', 'verification'].indexOf(step);

  return (
    <div className="border border-ink-deep/15 bg-paper p-8">
      <ol className="mb-8 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
        {['Profile', 'Pricing', 'Schedule', 'Verification'].map((s, i) => (
          <li
            key={s}
            className={`border px-3 py-1.5 ${
              i === stepIdx
                ? 'border-court text-court'
                : i < stepIdx
                  ? 'border-ink-deep text-ink-deep'
                  : 'border-ink-deep/20'
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 'profile' && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Bio (40 to 2000 characters)</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              className={`${inputCls} h-auto py-3`}
              placeholder="Tell players how you coach, who you work best with, and what to expect."
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Languages (comma separated)</span>
            <input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              className={inputCls}
              placeholder="English, Urdu"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Specialties (comma separated)</span>
            <input
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              className={inputCls}
              placeholder="Beginner technique, Tournament prep, Junior development"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Years of experience</span>
              <input
                type="number"
                min="0"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className={inputCls}
                placeholder="optional"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Intro video URL (YouTube or Vimeo)</span>
              <input
                type="url"
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                className={inputCls}
                placeholder="https://"
              />
            </label>
          </div>
        </div>
      )}

      {step === 'pricing' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Hourly rate</span>
              <input
                type="number"
                min="1"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Hourly rate ceiling (optional)</span>
              <input
                type="number"
                min="1"
                value={hourlyRateMax}
                onChange={(e) => setHourlyRateMax(e.target.value)}
                className={inputCls}
                placeholder="for premium sessions"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputCls}
              >
                <option value="PKR">PKR</option>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SAR">SAR</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Typical response time (hours)</span>
            <input
              type="number"
              min="1"
              max="168"
              value={responseTime}
              onChange={(e) => setResponseTime(e.target.value)}
              className={inputCls}
            />
          </label>
          <p className="text-xs text-ink-deep/60">
            Sessions are priced at hourly rate times duration. A 90 minute lesson at
            PKR 2500/hr costs PKR 3750.
          </p>
        </div>
      )}

      {step === 'schedule' && (
        <div className="flex flex-col gap-5">
          <p className="text-xs text-ink-deep/60">
            Add the time windows you can teach each day. Players see 30 minute
            slots inside these windows. Times are stored as 24h, local to the
            client.
          </p>
          {DAYS.map((d) => (
            <div key={d.key} className="border border-ink-deep/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-ink-deep">{d.label}</span>
                <button
                  type="button"
                  onClick={() => addWindow(d.key)}
                  className="text-xs text-court underline-offset-4 hover:underline"
                >
                  Add window
                </button>
              </div>
              {(schedule[d.key] ?? []).length === 0 ? (
                <p className="mt-2 text-xs text-ink-deep/50">No availability.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {(schedule[d.key] ?? []).map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={w.start}
                        onChange={(e) => updateWindow(d.key, idx, 'start', e.target.value)}
                        className={`${inputCls} w-32`}
                      />
                      <span className="text-xs text-ink-deep/50">to</span>
                      <input
                        type="time"
                        value={w.end}
                        onChange={(e) => updateWindow(d.key, idx, 'end', e.target.value)}
                        className={`${inputCls} w-32`}
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(d.key, idx)}
                        className="text-xs text-ink-deep/50 underline-offset-4 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === 'verification' && (
        <div className="flex flex-col gap-5">
          <div>
            <p className={labelCls}>Certifications</p>
            <div className="mt-2 flex flex-col gap-3">
              {certs.map((c, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Title"
                    value={c.title}
                    onChange={(e) =>
                      setCerts((cs) =>
                        cs.map((row, j) => (j === i ? { ...row, title: e.target.value } : row)),
                      )
                    }
                    className={inputCls}
                  />
                  <input
                    placeholder="Issuer"
                    value={c.issuer}
                    onChange={(e) =>
                      setCerts((cs) =>
                        cs.map((row, j) => (j === i ? { ...row, issuer: e.target.value } : row)),
                      )
                    }
                    className={inputCls}
                  />
                  <input
                    placeholder="Year"
                    value={c.year}
                    onChange={(e) =>
                      setCerts((cs) =>
                        cs.map((row, j) => (j === i ? { ...row, year: e.target.value } : row)),
                      )
                    }
                    className={inputCls}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCerts((cs) => [...cs, { title: '', issuer: '', year: '' }])
                }
                className="text-xs text-court underline-offset-4 hover:underline"
              >
                Add another certification
              </button>
            </div>
          </div>

          <div>
            <p className={labelCls}>Verification documents</p>
            <p className="mt-1 text-xs text-ink-deep/60">
              Upload a PDF or photo for each document. Files land in the private
              Feera bucket; only Feera verifiers and you can see them.
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {docs.map((d, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr_180px] gap-2">
                  <select
                    value={d.kind}
                    onChange={(e) =>
                      setDocs((ds) =>
                        ds.map((row, j) =>
                          j === i ? { ...row, kind: e.target.value as Doc['kind'] } : row,
                        ),
                      )
                    }
                    className={inputCls}
                  >
                    <option value="certification">Certification</option>
                    <option value="id">Government ID</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const r = await uploadFilePrivate(file, 'verification-doc');
                          setDocs((ds) =>
                            ds.map((row, j) =>
                              j === i ? { ...row, url: r.key } : row,
                            ),
                          );
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'Upload failed.');
                        } finally {
                          e.target.value = '';
                        }
                      }}
                      className="text-sm text-ink-deep"
                      aria-label={`Upload ${d.kind} document`}
                    />
                    {d.url ? (
                      <span className="truncate text-[10px] text-ink-deep/50" title={d.url}>
                        stored: {d.url}
                      </span>
                    ) : null}
                  </div>
                  <input
                    placeholder="Label (optional)"
                    value={d.label}
                    onChange={(e) =>
                      setDocs((ds) =>
                        ds.map((row, j) => (j === i ? { ...row, label: e.target.value } : row)),
                      )
                    }
                    className={inputCls}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDocs((ds) => [...ds, { kind: 'certification', url: '', label: '' }])
                }
                className="text-xs text-court underline-offset-4 hover:underline"
              >
                Add another document
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        {step !== 'profile' ? (
          <button type="button" onClick={back} className={btnGhost}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step !== 'verification' ? (
          <button type="button" onClick={next} className={btnPrimary}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={phase === 'submitting' || phase === 'done'}
            className={btnPrimary}
          >
            {phase === 'submitting' ? 'Submitting...' : phase === 'done' ? 'Submitted' : 'Submit application'}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`mt-4 text-xs ${phase === 'error' ? 'text-red-600' : 'text-court'}`}
        >
          {message}
        </p>
      )}
      {coachUserId && phase === 'done' && (
        <p className="mt-2 text-xs text-ink-deep/60">
          Your coach ID: {coachUserId}
        </p>
      )}
    </div>
  );
}
