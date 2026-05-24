'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  type ConfigState,
  type PricingResult,
  calculatePricing,
  defaultConfig,
  formatCurrency,
} from './pricing-engine';

const STEPS = [
  'Location',
  'Courts',
  'Surface and glass',
  'Lighting',
  'Amenities',
  'Technology',
  'Summary',
] as const;

type Step = (typeof STEPS)[number];

function SelectCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 border p-4 text-start transition-colors duration-150 ${
        selected
          ? 'border-court bg-court/10 text-[color:var(--color-fg)]'
          : 'border-[color:var(--color-border)] text-[color:var(--color-fg)] hover:border-court/50'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {description && (
        <span className="text-xs text-[color:var(--color-fg-muted)]">
          {description}
        </span>
      )}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  cost,
  currency,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  cost?: number;
  currency?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between border-b border-[color:var(--color-border)] py-3">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-3">
        {cost !== undefined && currency && (
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {cost === 0 ? 'Included' : `+${formatCurrency(cost, currency)}`}
          </span>
        )}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[#437E5B]"
        />
      </span>
    </label>
  );
}

function PricingSidebar({
  result,
  step,
}: {
  result: PricingResult;
  step: Step;
}) {
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of result.lineItems) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.total);
    }
    return [...map.entries()].filter(([, v]) => v > 0);
  }, [result.lineItems]);

  return (
    <div className="sticky top-6 flex flex-col gap-6 border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-6">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
        Estimated total
      </p>
      <p className="font-serif text-4xl tracking-tight text-court">
        {formatCurrency(result.grandTotal, result.currency)}
      </p>
      <p className="text-xs text-[color:var(--color-fg-muted)]">
        {result.taxLabel}: {formatCurrency(result.taxAmount, result.currency)}
      </p>

      <div className="flex flex-col gap-0">
        {categories.map(([cat, total]) => (
          <div
            key={cat}
            className="flex items-baseline justify-between border-b border-[color:var(--color-border)] py-2"
          >
            <span className="text-xs text-[color:var(--color-fg-muted)]">
              {cat}
            </span>
            <span className="text-xs">
              {formatCurrency(total, result.currency)}
            </span>
          </div>
        ))}
      </div>

      {step === 'Summary' && (
        <>
          <div className="border-t border-[color:var(--color-border)] pt-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
              Monthly operations
            </p>
            <p className="mt-1 font-serif text-2xl text-[color:var(--color-fg)]">
              {formatCurrency(result.monthlyOps.total, result.currency)}/mo
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
              Projected Y1 revenue
            </p>
            <p className="mt-1 font-serif text-2xl text-court">
              {formatCurrency(result.roi.year1Revenue, result.currency)}
            </p>
          </div>
        </>
      )}

      {result.notes.length > 0 && (
        <div className="flex flex-col gap-1">
          {result.notes.map((note) => (
            <p
              key={note}
              className="text-[10px] leading-relaxed text-court"
            >
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Configurator() {
  const [config, setConfig] = useState<ConfigState>(defaultConfig);
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx] as Step;

  const result = useMemo(() => calculatePricing(config), [config]);

  function patch(partial: Partial<ConfigState>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  function patchAmenities(partial: Partial<ConfigState['amenities']>) {
    setConfig((prev) => ({
      ...prev,
      amenities: { ...prev.amenities, ...partial },
    }));
  }

  function patchTech(partial: Partial<ConfigState['technology']>) {
    setConfig((prev) => ({
      ...prev,
      technology: { ...prev.technology, ...partial },
    }));
  }

  function patchSustainability(
    partial: Partial<ConfigState['sustainability']>,
  ) {
    setConfig((prev) => ({
      ...prev,
      sustainability: { ...prev.sustainability, ...partial },
    }));
  }

  const cur = result.currency;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      {/* Main panel */}
      <div className="flex flex-col gap-8">
        {/* Step indicators */}
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStepIdx(i)}
              className={`px-3 py-1 text-xs transition-colors duration-150 ${
                i === stepIdx
                  ? 'bg-court text-cream'
                  : i < stepIdx
                    ? 'bg-court/20 text-court'
                    : 'bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {step === 'Location' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Where are you building?
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Pricing, taxes, import duties, and climate requirements differ
                significantly between these two markets.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectCard
                  label="Detroit, Michigan"
                  description="USD pricing. 6% sales tax. 25% steel import duty. Strong union labor market. Zmash competition."
                  selected={config.location === 'detroit'}
                  onClick={() => patch({ location: 'detroit' })}
                />
                <SelectCard
                  label="Windsor, Ontario"
                  description="CAD pricing. 13% HST. CETA: 0% duty on EU courts. Lower property tax. Blue ocean market."
                  selected={config.location === 'windsor'}
                  onClick={() => patch({ location: 'windsor' })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Sales tax
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {config.location === 'detroit' ? '6%' : '13% HST'}
                  </p>
                </div>
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    EU court duty
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {config.location === 'detroit' ? '10% + 25% steel' : '0% (CETA)'}
                  </p>
                </div>
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Property tax rate
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {config.location === 'detroit' ? '8.22%' : '4.79%'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'Courts' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Court configuration
              </h2>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Number of courts
                </p>
                <div className="mt-3 flex gap-3">
                  {[2, 4, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patch({ courtCount: n })}
                      className={`h-12 w-12 border text-sm transition-colors duration-150 ${
                        config.courtCount === n
                          ? 'border-court bg-court text-cream'
                          : 'border-[color:var(--color-border)] hover:border-court'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Court type
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="Full Panoramic"
                    description="All-glass, no pillars. Tournament grade. Best visibility."
                    selected={config.courtType === 'panoramic'}
                    onClick={() => patch({ courtType: 'panoramic' })}
                  />
                  <SelectCard
                    label="Semi-Panoramic"
                    description="Glass back walls, corner posts. Best value for commercial."
                    selected={config.courtType === 'semi-panoramic'}
                    onClick={() => patch({ courtType: 'semi-panoramic' })}
                  />
                  <SelectCard
                    label="Standard Classic"
                    description="Posts between panels. Most robust. Budget-friendly."
                    selected={config.courtType === 'standard'}
                    onClick={() => patch({ courtType: 'standard' })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Environment
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SelectCard
                    label="Outdoor"
                    description="Lowest cost. Seasonal in northern climates."
                    selected={config.environment === 'outdoor'}
                    onClick={() => patch({ environment: 'outdoor' })}
                  />
                  <SelectCard
                    label="Indoor (existing building)"
                    description="Convert warehouse/retail. HVAC and ceiling work needed."
                    selected={config.environment === 'indoor-existing'}
                    onClick={() => patch({ environment: 'indoor-existing' })}
                  />
                  <SelectCard
                    label="Indoor (new steel building)"
                    description="Ground-up steel frame. Highest cost, best long-term."
                    selected={config.environment === 'indoor-new-build'}
                    onClick={() => patch({ environment: 'indoor-new-build' })}
                  />
                  <SelectCard
                    label="Air dome"
                    description="Textile membrane. Seasonal or permanent. Good for Canada."
                    selected={config.environment === 'air-dome'}
                    onClick={() => patch({ environment: 'air-dome' })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Supplier tier
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="European premium"
                    description="MejorSet, Manzasport, Portico. FIP-certified. 10-year warranty."
                    selected={config.supplierTier === 'european'}
                    onClick={() => patch({ supplierTier: 'european' })}
                  />
                  <SelectCard
                    label="North American"
                    description="Absolute Padel (PA). No import risk. US-based service."
                    selected={config.supplierTier === 'north-american'}
                    onClick={() => patch({ supplierTier: 'north-american' })}
                  />
                  <SelectCard
                    label="Factory-direct (Asia)"
                    description="30-40% savings. Requires QC inspection. Best for 4+ courts."
                    selected={config.supplierTier === 'factory-direct'}
                    onClick={() => patch({ supplierTier: 'factory-direct' })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'Surface and glass' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Playing surface and glass
              </h2>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Turf grade
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="Fibrillated"
                    description="Budget option. Good for recreational play. Included in base."
                    selected={config.turfGrade === 'fibrillated'}
                    onClick={() => patch({ turfGrade: 'fibrillated' })}
                  />
                  <SelectCard
                    label="Monofilament"
                    description={`Premium feel. Better ball control. +${formatCurrency(3500, cur)}/court`}
                    selected={config.turfGrade === 'monofilament'}
                    onClick={() => patch({ turfGrade: 'monofilament' })}
                  />
                  <SelectCard
                    label="Textured premium"
                    description={`Mondo-grade. 50% less sand. Top tier. +${formatCurrency(9000, cur)}/court`}
                    selected={config.turfGrade === 'textured-premium'}
                    onClick={() => patch({ turfGrade: 'textured-premium' })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Turf color
                </p>
                <div className="mt-3 flex gap-3">
                  {(
                    [
                      ['blue', '#1e40af'],
                      ['green', '#15803d'],
                      ['red', '#b91c1c'],
                      ['terracotta', '#c2410c'],
                    ] as const
                  ).map(([color, hex]) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => patch({ turfColor: color })}
                      className={`flex h-12 w-12 items-center justify-center border transition-colors duration-150 ${
                        config.turfColor === color
                          ? 'border-court ring-2 ring-court'
                          : 'border-[color:var(--color-border)]'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Glass upgrade
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SelectCard
                    label="Standard tempered"
                    description="10-12mm tempered safety glass. FIP compliant. Included."
                    selected={config.glassUpgrade === 'standard'}
                    onClick={() => patch({ glassUpgrade: 'standard' })}
                  />
                  <SelectCard
                    label="Laminated safety"
                    description={`2x6mm + PVB interlayer. Holds if cracked. +${formatCurrency(5000, cur)}/court`}
                    selected={config.glassUpgrade === 'laminated'}
                    onClick={() => patch({ glassUpgrade: 'laminated' })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'Lighting' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Lighting class
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                All options use LED fixtures with instant-on, 50,000+ hour
                lifespan, and 50-75% energy savings over halogen.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectCard
                  label="Recreational (200 lux)"
                  description={`EN 12193 Class III. Casual play. ${formatCurrency(2800, cur)}/court`}
                  selected={config.lightingClass === 'recreational'}
                  onClick={() => patch({ lightingClass: 'recreational' })}
                />
                <SelectCard
                  label="Club (300 lux)"
                  description={`Class II. Most commercial clubs. ${formatCurrency(5000, cur)}/court`}
                  selected={config.lightingClass === 'club'}
                  onClick={() => patch({ lightingClass: 'club' })}
                />
                <SelectCard
                  label="Competition (500 lux)"
                  description={`Class I. Tournaments and leagues. ${formatCurrency(8000, cur)}/court`}
                  selected={config.lightingClass === 'competition'}
                  onClick={() => patch({ lightingClass: 'competition' })}
                />
                <SelectCard
                  label="Broadcast (1000 lux)"
                  description={`TV and streaming. Pro venues. ${formatCurrency(15000, cur)}/court`}
                  selected={config.lightingClass === 'broadcast'}
                  onClick={() => patch({ lightingClass: 'broadcast' })}
                />
              </div>
            </div>
          )}

          {step === 'Amenities' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Facility amenities
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                These are facility-wide costs (not per court).
              </p>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Locker rooms
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="None"
                    selected={config.amenities.lockerRooms === 'none'}
                    onClick={() => patchAmenities({ lockerRooms: 'none' })}
                  />
                  <SelectCard
                    label="Basic"
                    description={formatCurrency(45000, cur)}
                    selected={config.amenities.lockerRooms === 'basic'}
                    onClick={() => patchAmenities({ lockerRooms: 'basic' })}
                  />
                  <SelectCard
                    label="Premium"
                    description={formatCurrency(95000, cur)}
                    selected={config.amenities.lockerRooms === 'premium'}
                    onClick={() => patchAmenities({ lockerRooms: 'premium' })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Clubhouse
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="None"
                    selected={config.amenities.clubhouse === 'none'}
                    onClick={() => patchAmenities({ clubhouse: 'none' })}
                  />
                  <SelectCard
                    label="Basic"
                    description={formatCurrency(35000, cur)}
                    selected={config.amenities.clubhouse === 'basic'}
                    onClick={() => patchAmenities({ clubhouse: 'basic' })}
                  />
                  <SelectCard
                    label="Premium"
                    description={formatCurrency(80000, cur)}
                    selected={config.amenities.clubhouse === 'premium'}
                    onClick={() => patchAmenities({ clubhouse: 'premium' })}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <Toggle
                  label="Pro shop"
                  checked={config.amenities.proShop}
                  onChange={(v) => patchAmenities({ proShop: v })}
                  cost={28000}
                  currency={cur}
                />
                <Toggle
                  label="Bar, cafe, and food service"
                  checked={config.amenities.barCafe}
                  onChange={(v) => patchAmenities({ barCafe: v })}
                  cost={85000}
                  currency={cur}
                />
                <Toggle
                  label="Viewing gallery (per court)"
                  checked={config.amenities.viewingGallery}
                  onChange={(v) => patchAmenities({ viewingGallery: v })}
                  cost={15000}
                  currency={cur}
                />
                <Toggle
                  label="Reception and check-in"
                  checked={config.amenities.reception}
                  onChange={(v) => patchAmenities({ reception: v })}
                  cost={18000}
                  currency={cur}
                />
                <Toggle
                  label="Coaching room"
                  checked={config.amenities.coachingRoom}
                  onChange={(v) => patchAmenities({ coachingRoom: v })}
                  cost={12000}
                  currency={cur}
                />
                <Toggle
                  label="Kids play area"
                  checked={config.amenities.kidsArea}
                  onChange={(v) => patchAmenities({ kidsArea: v })}
                  cost={12000}
                  currency={cur}
                />
              </div>
            </div>
          )}

          {step === 'Technology' && (
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl tracking-tight">
                Technology and sustainability
              </h2>
              <div className="flex flex-col">
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Technology
                </p>
                <Toggle
                  label="Feera booking platform"
                  checked={true}
                  onChange={() => {}}
                  cost={0}
                  currency={cur}
                />
                <Toggle
                  label="Access control (app-based entry)"
                  checked={config.technology.accessControl}
                  onChange={(v) => patchTech({ accessControl: v })}
                  cost={5000 + 1200 * config.courtCount}
                  currency={cur}
                />
                <Toggle
                  label="Wi-Fi infrastructure"
                  checked={config.technology.wifi}
                  onChange={(v) => patchTech({ wifi: v })}
                  cost={6000}
                  currency={cur}
                />
                <Toggle
                  label="Digital signage (4 screens)"
                  checked={config.technology.digitalSignage}
                  onChange={(v) => patchTech({ digitalSignage: v })}
                  cost={10000}
                  currency={cur}
                />
                <Toggle
                  label="Ball machines"
                  checked={config.technology.ballMachines}
                  onChange={(v) => patchTech({ ballMachines: v })}
                  cost={2500 * config.courtCount}
                  currency={cur}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Camera system
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="None"
                    selected={config.technology.cameraSystem === 'none'}
                    onClick={() => patchTech({ cameraSystem: 'none' })}
                  />
                  <SelectCard
                    label="Basic (AI highlights)"
                    description={`${formatCurrency(1650, cur)}/court`}
                    selected={config.technology.cameraSystem === 'basic'}
                    onClick={() => patchTech({ cameraSystem: 'basic' })}
                  />
                  <SelectCard
                    label="Pro (multi-angle, analytics)"
                    description={`${formatCurrency(10000, cur)}/court`}
                    selected={config.technology.cameraSystem === 'pro'}
                    onClick={() => patchTech({ cameraSystem: 'pro' })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Scoreboards
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectCard
                    label="None"
                    selected={config.technology.scoreboards === 'none'}
                    onClick={() => patchTech({ scoreboards: 'none' })}
                  />
                  <SelectCard
                    label="Basic LED"
                    description={`${formatCurrency(500, cur)}/court`}
                    selected={config.technology.scoreboards === 'basic'}
                    onClick={() => patchTech({ scoreboards: 'basic' })}
                  />
                  <SelectCard
                    label="Pro digital"
                    description={`${formatCurrency(3000, cur)}/court`}
                    selected={config.technology.scoreboards === 'pro'}
                    onClick={() => patchTech({ scoreboards: 'pro' })}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-court">
                  Sustainability
                </p>
                <Toggle
                  label="Solar canopy (per court roof)"
                  checked={config.sustainability.solarCanopy}
                  onChange={(v) => patchSustainability({ solarCanopy: v })}
                  cost={100000 * config.courtCount}
                  currency={cur}
                />
                <Toggle
                  label="Rainwater harvesting"
                  checked={config.sustainability.rainwaterHarvesting}
                  onChange={(v) =>
                    patchSustainability({ rainwaterHarvesting: v })
                  }
                  cost={6000}
                  currency={cur}
                />
              </div>
            </div>
          )}

          {step === 'Summary' && (
            <div className="flex flex-col gap-8">
              <h2 className="font-serif text-3xl tracking-tight">
                Your facility estimate
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                {config.courtCount} {config.courtType} courts,{' '}
                {config.environment.replace(/-/g, ' ')},{' '}
                {config.location === 'detroit'
                  ? 'Detroit, Michigan'
                  : 'Windsor, Ontario'}
                . {config.supplierTier} supplier tier.
              </p>

              {/* Line items */}
              <div className="flex flex-col">
                <div className="grid grid-cols-[1fr_80px_100px_100px] border-b border-[color:var(--color-border)] py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                  <span>Item</span>
                  <span className="text-end">Qty</span>
                  <span className="text-end">Unit</span>
                  <span className="text-end">Total</span>
                </div>
                {result.lineItems
                  .filter((i) => i.total > 0)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_80px_100px_100px] border-b border-[color:var(--color-border)] py-3 text-sm"
                    >
                      <span>
                        {item.item}
                        {item.note && (
                          <span className="ms-2 text-[10px] text-court">
                            {item.note}
                          </span>
                        )}
                      </span>
                      <span className="text-end text-[color:var(--color-fg-muted)]">
                        {item.quantity}
                      </span>
                      <span className="text-end text-[color:var(--color-fg-muted)]">
                        {formatCurrency(item.unitCost, cur)}
                      </span>
                      <span className="text-end">
                        {formatCurrency(item.total, cur)}
                      </span>
                    </div>
                  ))}
                <div className="grid grid-cols-[1fr_80px_100px_100px] border-b border-[color:var(--color-border)] py-3 text-sm">
                  <span className="font-medium">Subtotal</span>
                  <span />
                  <span />
                  <span className="text-end font-medium">
                    {formatCurrency(result.subtotal, cur)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_80px_100px_100px] border-b border-[color:var(--color-border)] py-3 text-sm">
                  <span className="text-[color:var(--color-fg-muted)]">
                    {result.taxLabel}
                  </span>
                  <span />
                  <span />
                  <span className="text-end text-[color:var(--color-fg-muted)]">
                    {formatCurrency(result.taxAmount, cur)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_80px_100px_100px] py-4 text-sm">
                  <span className="font-serif text-xl text-court">Total</span>
                  <span />
                  <span />
                  <span className="text-end font-serif text-xl text-court">
                    {formatCurrency(result.grandTotal, cur)}
                  </span>
                </div>
              </div>

              {/* Monthly ops */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  Estimated monthly operating costs
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-0 md:grid-cols-2">
                  {[
                    ['Facility lease', result.monthlyOps.lease],
                    ['Staff wages', result.monthlyOps.staff],
                    ['Utilities', result.monthlyOps.utilities],
                    ['Insurance', result.monthlyOps.insurance],
                    ['Software', result.monthlyOps.software],
                    ['Maintenance', result.monthlyOps.maintenance],
                    ['Marketing', result.monthlyOps.marketing],
                  ].map(([label, cost]) => (
                    <div
                      key={label as string}
                      className="flex items-baseline justify-between border-b border-[color:var(--color-border)] px-2 py-3"
                    >
                      <span className="text-sm">{label as string}</span>
                      <span className="text-sm text-[color:var(--color-fg-muted)]">
                        {formatCurrency(cost as number, cur)}/mo
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-baseline justify-between px-2">
                  <span className="font-medium">Total monthly</span>
                  <span className="font-serif text-lg text-court">
                    {formatCurrency(result.monthlyOps.total, cur)}/mo
                  </span>
                </div>
              </div>

              {/* ROI */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-court">
                  Revenue projection
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
                  {[
                    ['Y1 Revenue', result.roi.year1Revenue],
                    ['Y1 EBITDA', result.roi.year1Ebitda],
                    ['Y3 Revenue', result.roi.year3Revenue],
                    ['Y3 EBITDA', result.roi.year3Ebitda],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                        {label as string}
                      </p>
                      <p
                        className={`mt-1 font-serif text-xl ${(val as number) < 0 ? 'text-red-500' : 'text-court'}`}
                      >
                        {formatCurrency(val as number, cur)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Revenue per court per day
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatCurrency(result.roi.revenuePerCourtPerDay, cur)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Operational breakeven
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      ~{result.roi.breakEvenMonths} months
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Capital payback
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      ~{result.roi.paybackMonths} months
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/courts#quote"
                  className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
                >
                  Request detailed proposal
                </Link>
                <button
                  type="button"
                  onClick={() => setStepIdx(0)}
                  className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-border)] px-6 py-3 text-sm text-[color:var(--color-fg-muted)] hover:border-court hover:text-court"
                >
                  Reconfigure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-6">
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="feera-motion text-sm text-[color:var(--color-fg-muted)] hover:text-court disabled:opacity-30"
          >
            Previous
          </button>
          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIdx((i) => i + 1)}
              className="feera-motion inline-flex items-center justify-center border border-court px-6 py-3 text-sm text-court hover:bg-court hover:text-cream"
            >
              Next: {STEPS[stepIdx + 1] ?? ''}
            </button>
          ) : null}
        </div>
      </div>

      {/* Pricing sidebar (desktop) */}
      <div className="hidden lg:block">
        <PricingSidebar result={result} step={step} />
      </div>

      {/* Pricing bar (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-6 py-4 lg:hidden">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
            Estimated total
          </p>
          <p className="font-serif text-2xl text-court">
            {formatCurrency(result.grandTotal, result.currency)}
          </p>
        </div>
        {stepIdx < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStepIdx((i) => i + 1)}
            className="feera-motion border border-court bg-court px-4 py-2 text-sm text-cream"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
