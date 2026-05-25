/* ------------------------------------------------------------------ */
/*  Feera Courts Financial Model: Pure Calculation Engine              */
/*  No React. No side effects. Just math.                              */
/* ------------------------------------------------------------------ */

export interface Assumptions {
  consultingY1: number;
  consultingY2: number;
  consultingY3: number;
  avgEngagementFee: number;
  hardwareCourtsY1: number;
  hardwareCourtsY2: number;
  hardwareCourtsY3: number;
  hardwareMarginPerCourt: number;
  equityStakesByY3: number;
  stabilizedClubEbitda: number;
  avgStakePct: number;
  exitMultiple: number;
  opexRate: number;
  taxRate: number;
  distributionPolicy: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  consultingY1: 3,
  consultingY2: 6,
  consultingY3: 9,
  avgEngagementFee: 55_000,
  hardwareCourtsY1: 8,
  hardwareCourtsY2: 18,
  hardwareCourtsY3: 28,
  hardwareMarginPerCourt: 7_000,
  equityStakesByY3: 2,
  stabilizedClubEbitda: 320_000,
  avgStakePct: 10,
  exitMultiple: 8.0,
  opexRate: 40,
  taxRate: 25,
  distributionPolicy: 30,
};

/* ------------------------------------------------------------------ */
/*  P&L                                                                */
/* ------------------------------------------------------------------ */

export interface YearPnL {
  consultingRevenue: number;
  hardwareMargin: number;
  equityIncome: number;
  totalRevenue: number;
  opex: number;
  ebitda: number;
  tax: number;
  netIncome: number;
  ebitdaMarginPct: number;
}

export interface PnLResult {
  y1: YearPnL;
  y2: YearPnL;
  y3: YearPnL;
}

function calcYear(
  engagements: number,
  fee: number,
  courts: number,
  marginPerCourt: number,
  equityIncome: number,
  opexRate: number,
  taxRate: number,
): YearPnL {
  const consultingRevenue = engagements * fee;
  const hardwareMargin = courts * marginPerCourt;
  const totalRevenue = consultingRevenue + hardwareMargin + equityIncome;
  const opex = totalRevenue * (opexRate / 100);
  const ebitda = totalRevenue - opex;
  const tax = Math.max(0, ebitda * (taxRate / 100));
  const netIncome = ebitda - tax;
  const ebitdaMarginPct = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;

  return {
    consultingRevenue,
    hardwareMargin,
    equityIncome,
    totalRevenue,
    opex,
    ebitda,
    tax,
    netIncome,
    ebitdaMarginPct,
  };
}

export function calculatePnL(a: Assumptions): PnLResult {
  const equityIncomeY3 =
    a.equityStakesByY3 *
    a.stabilizedClubEbitda *
    (a.avgStakePct / 100) *
    (a.distributionPolicy / 100);

  return {
    y1: calcYear(
      a.consultingY1, a.avgEngagementFee,
      a.hardwareCourtsY1, a.hardwareMarginPerCourt,
      0, a.opexRate, a.taxRate,
    ),
    y2: calcYear(
      a.consultingY2, a.avgEngagementFee,
      a.hardwareCourtsY2, a.hardwareMarginPerCourt,
      0, a.opexRate, a.taxRate,
    ),
    y3: calcYear(
      a.consultingY3, a.avgEngagementFee,
      a.hardwareCourtsY3, a.hardwareMarginPerCourt,
      equityIncomeY3, a.opexRate, a.taxRate,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Capital Deployment                                                 */
/* ------------------------------------------------------------------ */

export interface YearCapital {
  setup: number;
  coInvest: number;
  total: number;
  cumulative: number;
}

export interface CapitalResult {
  y1: YearCapital;
  y2: YearCapital;
  y3: YearCapital;
}

export function calculateCapital(a: Assumptions): CapitalResult {
  const totalCoInvest = a.equityStakesByY3 * 150_000;
  // Spread co-invest: 40% Y1, 40% Y2, 20% Y3
  const coInvestY1 = Math.round(totalCoInvest * 0.4);
  const coInvestY2 = Math.round(totalCoInvest * 0.4);
  const coInvestY3 = totalCoInvest - coInvestY1 - coInvestY2;

  const setupY1 = 50_000;
  const setupY2 = 20_000;
  const setupY3 = 10_000;

  const totalY1 = setupY1 + coInvestY1;
  const totalY2 = setupY2 + coInvestY2;
  const totalY3 = setupY3 + coInvestY3;

  return {
    y1: { setup: setupY1, coInvest: coInvestY1, total: totalY1, cumulative: totalY1 },
    y2: { setup: setupY2, coInvest: coInvestY2, total: totalY2, cumulative: totalY1 + totalY2 },
    y3: { setup: setupY3, coInvest: coInvestY3, total: totalY3, cumulative: totalY1 + totalY2 + totalY3 },
  };
}

/* ------------------------------------------------------------------ */
/*  Cash Position                                                      */
/* ------------------------------------------------------------------ */

export interface YearCash {
  cashFlow: number;
  cumulativeCash: number;
}

export interface CashResult {
  y1: YearCash;
  y2: YearCash;
  y3: YearCash;
}

export function calculateCash(pnl: PnLResult, capital: CapitalResult): CashResult {
  const cfY1 = pnl.y1.netIncome - capital.y1.total;
  const cfY2 = pnl.y2.netIncome - capital.y2.total;
  const cfY3 = pnl.y3.netIncome - capital.y3.total;

  return {
    y1: { cashFlow: cfY1, cumulativeCash: cfY1 },
    y2: { cashFlow: cfY2, cumulativeCash: cfY1 + cfY2 },
    y3: { cashFlow: cfY3, cumulativeCash: cfY1 + cfY2 + cfY3 },
  };
}

/* ------------------------------------------------------------------ */
/*  Sensitivity Table                                                  */
/* ------------------------------------------------------------------ */

export const SENSITIVITY_ENGAGEMENTS = [2, 3, 4, 5, 6, 7, 8, 9];
export const SENSITIVITY_FEES = [35_000, 45_000, 55_000, 65_000, 75_000];

export function calculateSensitivity(a: Assumptions): number[][] {
  return SENSITIVITY_ENGAGEMENTS.map((eng) =>
    SENSITIVITY_FEES.map((fee) => {
      const tweaked: Assumptions = { ...a, consultingY3: eng, avgEngagementFee: fee };
      const pnl = calculatePnL(tweaked);
      return pnl.y3.ebitda;
    }),
  );
}

/* ------------------------------------------------------------------ */
/*  Sweden Stress Test                                                 */
/* ------------------------------------------------------------------ */

export interface StressScenario {
  label: string;
  factor: number;
  y3Revenue: number;
  y3Ebitda: number;
  y3MarginPct: number;
  verdict: 'Pass' | 'Fail';
}

export function calculateStressTest(a: Assumptions): StressScenario[] {
  const factors = [
    { label: 'Base case', factor: 1.0 },
    { label: 'Mild slowdown (-25%)', factor: 0.75 },
    { label: 'Moderate (-50%)', factor: 0.50 },
    { label: 'Severe (-75%)', factor: 0.25 },
  ];

  return factors.map(({ label, factor }) => {
    const tweaked: Assumptions = {
      ...a,
      consultingY1: Math.round(a.consultingY1 * factor),
      consultingY2: Math.round(a.consultingY2 * factor),
      consultingY3: Math.round(a.consultingY3 * factor),
      hardwareCourtsY1: Math.round(a.hardwareCourtsY1 * factor),
      hardwareCourtsY2: Math.round(a.hardwareCourtsY2 * factor),
      hardwareCourtsY3: Math.round(a.hardwareCourtsY3 * factor),
    };
    const pnl = calculatePnL(tweaked);
    return {
      label,
      factor,
      y3Revenue: pnl.y3.totalRevenue,
      y3Ebitda: pnl.y3.ebitda,
      y3MarginPct: pnl.y3.ebitdaMarginPct,
      verdict: pnl.y3.ebitda > 0 ? ('Pass' as const) : ('Fail' as const),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

export function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}
