'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type Assumptions,
  type StressScenario,
  DEFAULT_ASSUMPTIONS,
  calculatePnL,
  calculateCapital,
  calculateCash,
  calculateSensitivity,
  calculateStressTest,
  formatCurrency,
  formatPct,
  SENSITIVITY_ENGAGEMENTS,
  SENSITIVITY_FEES,
} from './calc-engine';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SavedScenario {
  id: string;
  name: string;
  assumptions: Assumptions;
  outputs: Record<string, unknown>;
  createdAt: string;
}

interface FinancialModelProps {
  initialScenarios: SavedScenario[];
}

/* ------------------------------------------------------------------ */
/*  Assumption field metadata                                          */
/* ------------------------------------------------------------------ */

interface FieldDef {
  key: keyof Assumptions;
  label: string;
  prefix?: string;
  suffix?: string;
  step?: number;
}

const FIELDS: FieldDef[] = [
  { key: 'consultingY1', label: 'Consulting engagements Y1' },
  { key: 'consultingY2', label: 'Consulting engagements Y2' },
  { key: 'consultingY3', label: 'Consulting engagements Y3' },
  { key: 'avgEngagementFee', label: 'Avg engagement fee', prefix: '$' },
  { key: 'hardwareCourtsY1', label: 'Hardware courts Y1' },
  { key: 'hardwareCourtsY2', label: 'Hardware courts Y2' },
  { key: 'hardwareCourtsY3', label: 'Hardware courts Y3' },
  { key: 'hardwareMarginPerCourt', label: 'Hardware margin/court', prefix: '$' },
  { key: 'equityStakesByY3', label: 'Equity stakes by Y3' },
  { key: 'stabilizedClubEbitda', label: 'Stabilized club EBITDA', prefix: '$' },
  { key: 'avgStakePct', label: 'Avg stake %', suffix: '%' },
  { key: 'exitMultiple', label: 'Exit multiple', suffix: 'x', step: 0.5 },
  { key: 'opexRate', label: 'Opex rate', suffix: '%' },
  { key: 'taxRate', label: 'Tax rate', suffix: '%' },
  { key: 'distributionPolicy', label: 'Distribution policy', suffix: '%' },
];

/* ------------------------------------------------------------------ */
/*  Editable number input with formatted display                       */
/* ------------------------------------------------------------------ */

function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = useMemo(() => {
    const formatted = Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const parts: string[] = [];
    if (prefix) parts.push(prefix);
    parts.push(formatted);
    if (suffix) parts.push(suffix);
    return parts.join('');
  }, [value, prefix, suffix]);

  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
        {label}
      </label>
      {focused ? (
        <Input
          ref={inputRef}
          type="number"
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          onBlur={() => setFocused(false)}
          className="h-9 text-sm tabular-nums"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setFocused(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="flex h-9 w-full items-center border border-[color:var(--color-border)] bg-transparent px-4 text-start text-sm tabular-nums text-[color:var(--color-fg)] hover:border-court"
        >
          {display}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table helpers                                                      */
/* ------------------------------------------------------------------ */

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-start text-[10px] uppercase tracking-[0.2em] text-ink-deep/50 font-normal ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  highlight,
  className = '',
}: {
  children: React.ReactNode;
  highlight?: 'green' | 'red' | 'amber';
  className?: string;
}) {
  const color =
    highlight === 'green'
      ? 'text-court font-medium'
      : highlight === 'red'
        ? 'text-red-500 font-medium'
        : highlight === 'amber'
          ? 'text-amber-600 font-medium'
          : '';
  return (
    <td className={`px-4 py-2.5 text-sm tabular-nums ${color} ${className}`}>
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function FinancialModel({ initialScenarios }: FinancialModelProps) {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(initialScenarios);
  const [scenarioName, setScenarioName] = useState('');
  const [saving, setSaving] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);

  const update = useCallback(
    (key: keyof Assumptions, value: number) =>
      setAssumptions((prev) => ({ ...prev, [key]: value })),
    [],
  );

  // All derived calculations, recalculated only when assumptions change
  const pnl = useMemo(() => calculatePnL(assumptions), [assumptions]);
  const capital = useMemo(() => calculateCapital(assumptions), [assumptions]);
  const cash = useMemo(() => calculateCash(pnl, capital), [pnl, capital]);
  const sensitivity = useMemo(() => calculateSensitivity(assumptions), [assumptions]);
  const stress = useMemo(() => calculateStressTest(assumptions), [assumptions]);

  const compareScenario = useMemo(
    () => scenarios.find((s) => s.id === compareId) ?? null,
    [scenarios, compareId],
  );
  const comparePnl = useMemo(
    () => (compareScenario ? calculatePnL(compareScenario.assumptions) : null),
    [compareScenario],
  );

  /* Save scenario */
  const handleSave = async () => {
    if (!scenarioName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/courts/financials/scenarios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: scenarioName.trim(),
          assumptions,
          outputs: {
            y3Ebitda: pnl.y3.ebitda,
            y3NetIncome: pnl.y3.netIncome,
            y3Revenue: pnl.y3.totalRevenue,
            y3MarginPct: pnl.y3.ebitdaMarginPct,
            cumulativeCash: cash.y3.cumulativeCash,
          },
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setScenarios((prev) => [data, ...prev]);
        setScenarioName('');
      }
    } finally {
      setSaving(false);
    }
  };

  const loadScenario = (s: SavedScenario) => {
    setAssumptions(s.assumptions);
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-8">
      {/* A. Global Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Global assumptions</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {FIELDS.map((f) => (
              <NumberInput
                key={f.key}
                label={f.label}
                value={assumptions[f.key]}
                onChange={(v) => update(f.key, v)}
                prefix={f.prefix}
                suffix={f.suffix}
                step={f.step}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* B. 3-Year P&L */}
      <Card>
        <CardHeader>
          <CardTitle>3-year P&L</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>Metric</Th>
                <Th>Y1</Th>
                <Th>Y2</Th>
                <Th>Y3</Th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Consulting revenue', 'consultingRevenue', false],
                ['Hardware margin', 'hardwareMargin', false],
                ['Equity income', 'equityIncome', false],
                ['Total revenue', 'totalRevenue', false],
                ['Opex', 'opex', false],
                ['EBITDA', 'ebitda', true],
                ['Tax', 'tax', false],
                ['Net income', 'netIncome', true],
              ] as const).map(([label, key, highlight]) => (
                <tr key={key} className="border-b border-[color:var(--color-border)] last:border-b-0">
                  <Td className={highlight ? 'font-medium' : ''}>{label}</Td>
                  {(['y1', 'y2', 'y3'] as const).map((yr) => (
                    <Td
                      key={yr}
                      highlight={
                        highlight
                          ? pnl[yr][key] >= 0 ? 'green' : 'red'
                          : undefined
                      }
                    >
                      {formatCurrency(pnl[yr][key])}
                    </Td>
                  ))}
                </tr>
              ))}
              <tr>
                <Td>EBITDA margin</Td>
                {(['y1', 'y2', 'y3'] as const).map((yr) => (
                  <Td key={yr}>{formatPct(pnl[yr].ebitdaMarginPct)}</Td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* C. Capital Deployment */}
      <Card>
        <CardHeader>
          <CardTitle>Capital deployment</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>Item</Th>
                <Th>Y1</Th>
                <Th>Y2</Th>
                <Th>Y3</Th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Setup costs', 'setup'],
                ['Co-invest capital', 'coInvest'],
                ['Total deployed', 'total'],
                ['Cumulative', 'cumulative'],
              ] as const).map(([label, key]) => (
                <tr key={key} className="border-b border-[color:var(--color-border)] last:border-b-0">
                  <Td className={key === 'cumulative' ? 'font-medium' : ''}>{label}</Td>
                  {(['y1', 'y2', 'y3'] as const).map((yr) => (
                    <Td key={yr}>{formatCurrency(capital[yr][key])}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* D. Cumulative Cash Position */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative cash position</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>Year</Th>
                <Th>Net income</Th>
                <Th>Capital deployed</Th>
                <Th>Cash flow</Th>
                <Th>Cumulative cash</Th>
              </tr>
            </thead>
            <tbody>
              {(['y1', 'y2', 'y3'] as const).map((yr, i) => (
                <tr key={yr} className="border-b border-[color:var(--color-border)] last:border-b-0">
                  <Td>Y{i + 1}</Td>
                  <Td>{formatCurrency(pnl[yr].netIncome)}</Td>
                  <Td>{formatCurrency(capital[yr].total)}</Td>
                  <Td highlight={cash[yr].cashFlow >= 0 ? 'green' : 'red'}>
                    {formatCurrency(cash[yr].cashFlow)}
                  </Td>
                  <Td highlight={cash[yr].cumulativeCash >= 0 ? 'green' : 'red'}>
                    {formatCurrency(cash[yr].cumulativeCash)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* E. Sensitivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity: Y3 EBITDA by engagement count and fee size</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>Engagements</Th>
                {SENSITIVITY_FEES.map((fee) => (
                  <Th key={fee}>{formatCurrency(fee)}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row, ri) => (
                <tr key={SENSITIVITY_ENGAGEMENTS[ri]} className="border-b border-[color:var(--color-border)] last:border-b-0">
                  <Td className="font-medium">{SENSITIVITY_ENGAGEMENTS[ri]}</Td>
                  {row.map((val, ci) => {
                    const color: 'green' | 'amber' | 'red' =
                      val > 300_000 ? 'green' : val >= 100_000 ? 'amber' : 'red';
                    return (
                      <Td key={SENSITIVITY_FEES[ci]} highlight={color}>
                        {formatCurrency(val)}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* F. Sweden Stress Test */}
      <Card>
        <CardHeader>
          <CardTitle>Sweden stress test</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>Scenario</Th>
                <Th>Y3 Revenue</Th>
                <Th>Y3 EBITDA</Th>
                <Th>Margin</Th>
                <Th>Verdict</Th>
              </tr>
            </thead>
            <tbody>
              {stress.map((s: StressScenario) => (
                <tr key={s.label} className="border-b border-[color:var(--color-border)] last:border-b-0">
                  <Td>{s.label}</Td>
                  <Td>{formatCurrency(s.y3Revenue)}</Td>
                  <Td highlight={s.y3Ebitda >= 0 ? 'green' : 'red'}>
                    {formatCurrency(s.y3Ebitda)}
                  </Td>
                  <Td>{formatPct(s.y3MarginPct)}</Td>
                  <Td highlight={s.verdict === 'Pass' ? 'green' : 'red'}>
                    {s.verdict}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* G. Save Scenario */}
      <Card>
        <CardHeader>
          <CardTitle>Save and compare scenarios</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                Scenario name
              </label>
              <Input
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Conservative Q3"
                className="h-9"
              />
            </div>
            <Button
              variant="inverted"
              size="sm"
              onClick={handleSave}
              disabled={saving || !scenarioName.trim()}
            >
              {saving ? 'Saving...' : 'Save scenario'}
            </Button>
          </div>

          {scenarios.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                Saved scenarios
              </p>
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border border-[color:var(--color-border)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 text-xs text-ink-deep/50">
                        {new Date(s.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' / Y3 EBITDA: '}
                        {formatCurrency(
                          (s.outputs as Record<string, number>)?.y3Ebitda ??
                            calculatePnL(s.assumptions).y3.ebitda,
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadScenario(s)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCompareId(compareId === s.id ? null : s.id)
                        }
                      >
                        {compareId === s.id ? 'Hide' : 'Compare'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison view */}
          {compareScenario && comparePnl && (
            <div className="mt-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                Comparing: current vs &quot;{compareScenario.name}&quot;
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)]">
                      <Th>Metric (Y3)</Th>
                      <Th>Current</Th>
                      <Th>Saved</Th>
                      <Th>Delta</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ['Revenue', pnl.y3.totalRevenue, comparePnl.y3.totalRevenue],
                      ['EBITDA', pnl.y3.ebitda, comparePnl.y3.ebitda],
                      ['Net income', pnl.y3.netIncome, comparePnl.y3.netIncome],
                      ['EBITDA margin', pnl.y3.ebitdaMarginPct, comparePnl.y3.ebitdaMarginPct],
                    ] as const).map(([label, current, saved]) => {
                      const delta = current - saved;
                      const isPct = label === 'EBITDA margin';
                      return (
                        <tr key={label} className="border-b border-[color:var(--color-border)] last:border-b-0">
                          <Td>{label}</Td>
                          <Td>{isPct ? formatPct(current) : formatCurrency(current)}</Td>
                          <Td>{isPct ? formatPct(saved) : formatCurrency(saved)}</Td>
                          <Td highlight={delta > 0 ? 'green' : delta < 0 ? 'red' : undefined}>
                            {isPct
                              ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}pp`
                              : `${delta > 0 ? '+' : ''}${formatCurrency(delta)}`}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
