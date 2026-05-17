'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  parseLatLngFromMapsUrl,
  slugify,
} from '@/lib/api/onboard-schemas';
import { uploadFilePublic } from '@/lib/storage/client';

type Draft = {
  // step 1
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string;
  logoUrl: string;
  defaultCurrency: string;
  // step 2
  lat: string;
  lng: string;
  mapsUrl: string;
  // step 3
  hasIndoor: boolean;
  hasOutdoor: boolean;
  hasClimateControl: boolean;
  hasPanoramic: boolean;
  hasPrayerRoom: boolean;
  hasShowerFacilities: boolean;
  hasParking: boolean;
  hasFoodService: boolean;
  hasWomenOnlyHours: boolean;
  // step 4
  courtName: string;
  courtSurface: string;
  courtIsIndoor: boolean;
  offPeakPrice: string;
  peakPrice: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
};

const EMPTY: Draft = {
  name: '',
  slug: '',
  countryCode: 'PK',
  city: '',
  address: '',
  phone: '',
  email: '',
  websiteUrl: '',
  logoUrl: '',
  defaultCurrency: 'PKR',
  lat: '',
  lng: '',
  mapsUrl: '',
  hasIndoor: false,
  hasOutdoor: true,
  hasClimateControl: false,
  hasPanoramic: false,
  hasPrayerRoom: false,
  hasShowerFacilities: true,
  hasParking: false,
  hasFoodService: false,
  hasWomenOnlyHours: false,
  courtName: 'Court 1',
  courtSurface: 'artificial_grass',
  courtIsIndoor: false,
  offPeakPrice: '',
  peakPrice: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
};

const STORAGE_KEY = 'feera.club-onboard.v1';
const TOTAL_STEPS = 4;

const AMENITIES: Array<{
  key: keyof Pick<
    Draft,
    | 'hasIndoor'
    | 'hasOutdoor'
    | 'hasClimateControl'
    | 'hasPanoramic'
    | 'hasPrayerRoom'
    | 'hasShowerFacilities'
    | 'hasParking'
    | 'hasFoodService'
    | 'hasWomenOnlyHours'
  >;
  label: string;
}> = [
  { key: 'hasIndoor', label: 'Indoor courts' },
  { key: 'hasOutdoor', label: 'Outdoor courts' },
  { key: 'hasClimateControl', label: 'Climate control' },
  { key: 'hasPanoramic', label: 'Panoramic glass' },
  { key: 'hasPrayerRoom', label: 'Prayer room' },
  { key: 'hasShowerFacilities', label: 'Showers' },
  { key: 'hasParking', label: 'Parking' },
  { key: 'hasFoodService', label: 'Food service' },
  { key: 'hasWomenOnlyHours', label: 'Women only hours' },
];

export function OnboardForm() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    clubSlug: string;
    ownerSignInUrl: string;
  } | null>(null);

  // Hydrate from sessionStorage on mount, persist on every change.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft> & { step?: number };
        setDraft({ ...EMPTY, ...parsed });
        if (parsed.step && parsed.step >= 1 && parsed.step <= TOTAL_STEPS) {
          setStep(parsed.step);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...draft, step }),
      );
    } catch {
      /* sessionStorage may be disabled in private mode */
    }
  }, [draft, step]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && (!prev.slug || prev.slug === slugify(prev.name))) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function paste(url: string) {
    update('mapsUrl', url);
    const parsed = parseLatLngFromMapsUrl(url);
    if (parsed) {
      update('lat', String(parsed.lat));
      update('lng', String(parsed.lng));
    }
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!draft.name.trim()) return 'Club name is required.';
      if (!draft.slug.trim()) return 'Slug is required.';
      if (!/^[a-z0-9-]+$/u.test(draft.slug))
        return 'Slug must be lowercase letters, numbers, and hyphens.';
      if (!/^[A-Z]{2}$/u.test(draft.countryCode.toUpperCase()))
        return 'Country code must be 2 letters (ISO 3166-1 alpha-2).';
      if (!draft.city.trim()) return 'City is required.';
      if (!/^[A-Z]{3}$/u.test(draft.defaultCurrency.toUpperCase()))
        return 'Currency must be a 3-letter ISO code.';
    }
    if (current === 2) {
      const latN = Number(draft.lat);
      const lngN = Number(draft.lng);
      if (!Number.isFinite(latN) || latN < -90 || latN > 90)
        return 'Latitude must be between -90 and 90.';
      if (!Number.isFinite(lngN) || lngN < -180 || lngN > 180)
        return 'Longitude must be between -180 and 180.';
    }
    if (current === 4) {
      if (!draft.courtName.trim()) return 'Court name is required.';
      const off = Number(draft.offPeakPrice);
      const peak = Number(draft.peakPrice);
      if (!Number.isFinite(off) || off < 0)
        return 'Off-peak price must be a non-negative number.';
      if (!Number.isFinite(peak) || peak < 0)
        return 'Peak price must be a non-negative number.';
      if (!draft.ownerName.trim()) return 'Owner name is required.';
      if (!/^\+[1-9]\d{6,14}$/u.test(draft.ownerPhone))
        return 'Owner phone must be E.164 format, e.g. +923001234567.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(draft.ownerEmail))
        return 'Owner email is required.';
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    const err = validateStep(4);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        countryCode: draft.countryCode.toUpperCase(),
        city: draft.city.trim(),
        address: draft.address.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        websiteUrl: draft.websiteUrl.trim() || undefined,
        logoUrl: draft.logoUrl.trim() || undefined,
        defaultCurrency: draft.defaultCurrency.toUpperCase(),
        lat: Number(draft.lat),
        lng: Number(draft.lng),
        hasIndoor: draft.hasIndoor,
        hasOutdoor: draft.hasOutdoor,
        hasClimateControl: draft.hasClimateControl,
        hasPanoramic: draft.hasPanoramic,
        hasPrayerRoom: draft.hasPrayerRoom,
        hasShowerFacilities: draft.hasShowerFacilities,
        hasParking: draft.hasParking,
        hasFoodService: draft.hasFoodService,
        hasWomenOnlyHours: draft.hasWomenOnlyHours,
        court: {
          name: draft.courtName.trim(),
          surface: draft.courtSurface,
          isIndoor: draft.courtIsIndoor,
        },
        pricing: {
          offPeakPrice: Number(draft.offPeakPrice),
          peakPrice: Number(draft.peakPrice),
        },
        owner: {
          displayName: draft.ownerName.trim(),
          phone: draft.ownerPhone.trim(),
          email: draft.ownerEmail.trim(),
        },
      };

      const res = await fetch('/api/v1/clubs/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as
        | { data: { clubSlug: string; ownerSignInUrl: string } }
        | { error: string; message: string };
      if (!res.ok || 'error' in json) {
        setError(
          'message' in json ? json.message : 'Submission failed. Try again.',
        );
        return;
      }
      setResult(json.data);
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    } catch (e) {
      setError((e as Error).message ?? 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  const progressPct = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  if (result) {
    return (
      <div className="border border-ink-deep/15 bg-paper p-10">
        <p className="text-xs uppercase tracking-[0.25em] text-court">
          Submitted
        </p>
        <h2 className="mt-4 font-serif text-3xl tracking-tight">
          Welcome to Feera.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-deep/70">
          Your club listing is in the queue for review. We email you the
          moment it goes live, usually within one business day.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-deep/70">
          In the meantime, you can sign in to set up additional courts and
          tune your pricing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={result.ownerSignInUrl}>
            <Button variant="inverted" size="md">
              Sign in to your club
            </Button>
          </a>
          <a href={`/clubs/${result.clubSlug}`}>
            <Button variant="ghost" size="md" className="text-ink-deep">
              Preview public listing
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-ink-deep/60">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-3 h-px w-full bg-ink-deep/10">
          <div
            className="h-px bg-court transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-6 border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="border border-ink-deep/15 bg-paper p-8">
        {step === 1 ? <Step1 draft={draft} update={update} /> : null}
        {step === 2 ? (
          <Step2 draft={draft} update={update} paste={paste} />
        ) : null}
        {step === 3 ? <Step3 draft={draft} update={update} /> : null}
        {step === 4 ? <Step4 draft={draft} update={update} /> : null}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="md"
          onClick={back}
          disabled={step === 1 || submitting}
          className="text-ink-deep"
        >
          Back
        </Button>
        {step < TOTAL_STEPS ? (
          <Button variant="inverted" size="md" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button
            variant="inverted"
            size="md"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Submitting' : 'Submit listing'}
          </Button>
        )}
      </div>
    </div>
  );
}

type StepProps = {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-ink-deep/50">{hint}</p> : null}
    </div>
  );
}

function Step1({ draft, update }: StepProps) {
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const r = await uploadFilePublic(file, 'club-logo');
      update('logoUrl', r.url);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Club logo" hint="Square PNG or JPG, up to 2 MB. Optional.">
          <div className="flex items-center gap-4">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.logoUrl}
                alt="Club logo preview"
                className="h-16 w-16 border border-ink-deep/20 object-cover"
                width={64}
                height={64}
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-16 w-16 border border-ink-deep/15 bg-cream"
              />
            )}
            <div className="grid gap-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogo}
                disabled={logoUploading}
                className="text-sm text-ink-deep"
                aria-label="Club logo file"
              />
              {logoUploading ? (
                <p className="text-xs text-ink-deep/60">Uploading.</p>
              ) : logoError ? (
                <p className="text-xs text-red-600">{logoError}</p>
              ) : draft.logoUrl ? (
                <button
                  type="button"
                  onClick={() => update('logoUrl', '')}
                  className="text-xs text-ink-deep/60 underline-offset-2 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Club name">
          <Input
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Lahore Padel Club"
            autoComplete="organization"
          />
        </Field>
      </div>
      <Field label="Slug" hint="Used in your feera.ai URL.">
        <Input
          value={draft.slug}
          onChange={(e) =>
            update('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))
          }
          placeholder="lahore-padel-club"
        />
      </Field>
      <Field label="Country (ISO-2)">
        <Input
          value={draft.countryCode}
          onChange={(e) => update('countryCode', e.target.value.toUpperCase().slice(0, 2))}
          placeholder="PK"
          maxLength={2}
        />
      </Field>
      <Field label="City">
        <Input
          value={draft.city}
          onChange={(e) => update('city', e.target.value)}
          placeholder="Lahore"
        />
      </Field>
      <Field label="Default currency (ISO-3)">
        <Input
          value={draft.defaultCurrency}
          onChange={(e) =>
            update('defaultCurrency', e.target.value.toUpperCase().slice(0, 3))
          }
          placeholder="PKR"
          maxLength={3}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Address">
          <Input
            value={draft.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="123 Main Boulevard, Gulberg"
          />
        </Field>
      </div>
      <Field label="Club phone">
        <Input
          value={draft.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="+924235880000"
          inputMode="tel"
        />
      </Field>
      <Field label="Club email">
        <Input
          type="email"
          value={draft.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="hello@yourclub.com"
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Website" hint="Optional.">
          <Input
            type="url"
            value={draft.websiteUrl}
            onChange={(e) => update('websiteUrl', e.target.value)}
            placeholder="https://yourclub.com"
          />
        </Field>
      </div>
    </div>
  );
}

function Step2({
  draft,
  update,
  paste,
}: StepProps & { paste: (url: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <Field
        label="Paste Google Maps URL"
        hint="We extract the coordinates automatically. Or enter them by hand below."
      >
        <Input
          value={draft.mapsUrl}
          onChange={(e) => paste(e.target.value)}
          placeholder="https://maps.google.com/?q=31.5204,74.3587"
        />
      </Field>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Latitude">
          <Input
            value={draft.lat}
            onChange={(e) => update('lat', e.target.value)}
            placeholder="31.5204"
            inputMode="decimal"
          />
        </Field>
        <Field label="Longitude">
          <Input
            value={draft.lng}
            onChange={(e) => update('lng', e.target.value)}
            placeholder="74.3587"
            inputMode="decimal"
          />
        </Field>
      </div>
      <div className="border border-ink-deep/10 bg-cream px-4 py-3 text-xs text-ink-deep/60">
        Preview: {draft.city || 'City'}, {draft.countryCode || 'XX'}
        {draft.lat && draft.lng ? ` at ${draft.lat}, ${draft.lng}` : ''}
      </div>
    </div>
  );
}

function Step3({ draft, update }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {AMENITIES.map((a) => (
        <label
          key={a.key}
          className="flex cursor-pointer items-center gap-3 border border-ink-deep/15 px-4 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court"
        >
          <input
            type="checkbox"
            checked={draft[a.key] as boolean}
            onChange={(e) => update(a.key, e.target.checked)}
            className="h-4 w-4 accent-court"
          />
          {a.label}
        </label>
      ))}
    </div>
  );
}

function Step4({ draft, update }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <p className="font-serif text-xl tracking-tight text-ink-deep">
          First court
        </p>
        <p className="mt-1 text-xs text-ink-deep/60">
          You can add more courts and refine pricing after sign-in.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Court name">
          <Input
            value={draft.courtName}
            onChange={(e) => update('courtName', e.target.value)}
            placeholder="Court 1"
          />
        </Field>
        <Field label="Surface">
          <select
            value={draft.courtSurface}
            onChange={(e) => update('courtSurface', e.target.value)}
            className="h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus-visible:border-court focus-visible:outline-none"
          >
            <option value="artificial_grass">Artificial grass</option>
            <option value="hard_court">Hard court</option>
            <option value="acrylic">Acrylic</option>
            <option value="concrete">Concrete</option>
          </select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 border border-ink-deep/15 px-4 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court">
        <input
          type="checkbox"
          checked={draft.courtIsIndoor}
          onChange={(e) => update('courtIsIndoor', e.target.checked)}
          className="h-4 w-4 accent-court"
        />
        Indoor court
      </label>

      <div className="mt-2">
        <p className="font-serif text-xl tracking-tight text-ink-deep">
          Default pricing
        </p>
        <p className="mt-1 text-xs text-ink-deep/60">
          One off-peak slot and one peak slot per day. Refine later.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label={`Off-peak price (${draft.defaultCurrency || 'XXX'})`}
          hint="09:00 to 17:00"
        >
          <Input
            value={draft.offPeakPrice}
            onChange={(e) => update('offPeakPrice', e.target.value)}
            placeholder="3500"
            inputMode="decimal"
          />
        </Field>
        <Field
          label={`Peak price (${draft.defaultCurrency || 'XXX'})`}
          hint="17:00 to 22:00"
        >
          <Input
            value={draft.peakPrice}
            onChange={(e) => update('peakPrice', e.target.value)}
            placeholder="5500"
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="mt-2">
        <p className="font-serif text-xl tracking-tight text-ink-deep">
          Owner contact
        </p>
        <p className="mt-1 text-xs text-ink-deep/60">
          We send the sign-in link to this email.
        </p>
      </div>
      <Field label="Owner name">
        <Input
          value={draft.ownerName}
          onChange={(e) => update('ownerName', e.target.value)}
          placeholder="Full name"
          autoComplete="name"
        />
      </Field>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Owner phone (E.164)">
          <Input
            value={draft.ownerPhone}
            onChange={(e) => update('ownerPhone', e.target.value)}
            placeholder="+923001234567"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Owner email">
          <Input
            type="email"
            value={draft.ownerEmail}
            onChange={(e) => update('ownerEmail', e.target.value)}
            placeholder="you@yourclub.com"
            autoComplete="email"
          />
        </Field>
      </div>
    </div>
  );
}
