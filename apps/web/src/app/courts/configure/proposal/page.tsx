'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';
import {
  type ConfigState,
  type PricingResult,
  calculatePricing,
  formatCurrency,
} from '../pricing-engine';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function locationLabel(location: ConfigState['location']): string {
  return location === 'detroit' ? 'Detroit, Michigan' : 'Windsor, Ontario';
}

function environmentLabel(env: ConfigState['environment']): string {
  const labels: Record<ConfigState['environment'], string> = {
    outdoor: 'Outdoor',
    'indoor-existing': 'Indoor (existing building)',
    'indoor-new-build': 'Indoor (new steel building)',
    'air-dome': 'Air dome',
  };
  return labels[env];
}

function ProposalContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');

  const { config, result } = useMemo(() => {
    if (!dataParam) return { config: null, result: null };
    try {
      const decoded = atob(dataParam);
      const parsed = JSON.parse(decoded) as ConfigState;
      return { config: parsed, result: calculatePricing(parsed) };
    } catch (_e) {
      return { config: null, result: null };
    }
  }, [dataParam]);

  useEffect(() => {
    if (!config || !result) return;
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [config, result]);

  if (!config || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl">No proposal data</h1>
          <p className="mt-2 text-sm text-gray-500">
            Return to the configurator to generate a proposal.
          </p>
        </div>
      </div>
    );
  }

  const cur = result.currency;

  return (
    <div className="proposal-page">
      <style>{printStyles}</style>

      {/* Letterhead */}
      <header className="proposal-header">
        <div className="letterhead">
          <div className="logo-block">
            <h1 className="logo-text">feera</h1>
            <p className="logo-sub">Courts</p>
          </div>
          <div className="contact-block">
            <p>courts@feera.ai</p>
            <p>feera.ai/courts</p>
          </div>
        </div>
      </header>

      {/* Title block */}
      <section className="title-block">
        <h2 className="proposal-title">Padel Facility Cost Estimate</h2>
        <div className="meta-row">
          <div className="meta-item">
            <span className="meta-label">Date</span>
            <span className="meta-value">{formatDate()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Location</span>
            <span className="meta-value">{locationLabel(config.location)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Currency</span>
            <span className="meta-value">{cur}</span>
          </div>
        </div>
      </section>

      {/* Configuration summary */}
      <section className="config-summary">
        <h3 className="section-title">Configuration Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Court type</span>
            <span className="summary-value">{config.courtType}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Number of courts</span>
            <span className="summary-value">{config.courtCount}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Environment</span>
            <span className="summary-value">{environmentLabel(config.environment)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Supplier tier</span>
            <span className="summary-value">{config.supplierTier}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Surface</span>
            <span className="summary-value">{config.turfGrade} ({config.turfColor})</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Lighting</span>
            <span className="summary-value">{config.lightingClass}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Glass</span>
            <span className="summary-value">{config.glassUpgrade}</span>
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="line-items">
        <h3 className="section-title">Cost Breakdown</h3>
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-item">Item</th>
              <th className="col-qty">Qty</th>
              <th className="col-unit">Unit Cost</th>
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.lineItems
              .filter((i) => i.total > 0)
              .map((item, idx) => (
                <tr key={idx}>
                  <td className="col-item">
                    {item.item}
                    {item.note && <span className="item-note"> ({item.note})</span>}
                  </td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-unit">{formatCurrency(item.unitCost, cur)}</td>
                  <td className="col-total">{formatCurrency(item.total, cur)}</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="subtotal-row">
              <td colSpan={3}>Subtotal</td>
              <td className="col-total">{formatCurrency(result.subtotal, cur)}</td>
            </tr>
            <tr className="tax-row">
              <td colSpan={3}>{result.taxLabel}</td>
              <td className="col-total">{formatCurrency(result.taxAmount, cur)}</td>
            </tr>
            <tr className="grand-total-row">
              <td colSpan={3}>Grand Total</td>
              <td className="col-total">{formatCurrency(result.grandTotal, cur)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Monthly operations */}
      <section className="monthly-ops">
        <h3 className="section-title">Estimated Monthly Operating Costs</h3>
        <table className="ops-table">
          <tbody>
            {(
              [
                ['Facility lease', result.monthlyOps.lease],
                ['Staff wages', result.monthlyOps.staff],
                ['Utilities', result.monthlyOps.utilities],
                ['Insurance', result.monthlyOps.insurance],
                ['Software', result.monthlyOps.software],
                ['Maintenance', result.monthlyOps.maintenance],
                ['Marketing', result.monthlyOps.marketing],
              ] as const
            ).map(([label, cost]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="col-total">{formatCurrency(cost, cur)}/mo</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ops-total-row">
              <td>Total Monthly</td>
              <td className="col-total">{formatCurrency(result.monthlyOps.total, cur)}/mo</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ROI projection */}
      <section className="roi-section">
        <h3 className="section-title">Revenue and ROI Projection</h3>
        <div className="roi-grid">
          <div className="roi-item">
            <span className="roi-label">Year 1 Revenue</span>
            <span className="roi-value">{formatCurrency(result.roi.year1Revenue, cur)}</span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Year 1 EBITDA</span>
            <span className={`roi-value ${result.roi.year1Ebitda < 0 ? 'negative' : ''}`}>
              {formatCurrency(result.roi.year1Ebitda, cur)}
            </span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Year 3 Revenue</span>
            <span className="roi-value">{formatCurrency(result.roi.year3Revenue, cur)}</span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Year 3 EBITDA</span>
            <span className={`roi-value ${result.roi.year3Ebitda < 0 ? 'negative' : ''}`}>
              {formatCurrency(result.roi.year3Ebitda, cur)}
            </span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Revenue per court per day</span>
            <span className="roi-value">{formatCurrency(result.roi.revenuePerCourtPerDay, cur)}</span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Operational breakeven</span>
            <span className="roi-value">~{result.roi.breakEvenMonths} months</span>
          </div>
          <div className="roi-item">
            <span className="roi-label">Capital payback</span>
            <span className="roi-value">~{result.roi.paybackMonths} months</span>
          </div>
        </div>
      </section>

      {/* Notes */}
      {result.notes.length > 0 && (
        <section className="notes-section">
          <h3 className="section-title">Notes</h3>
          <ul className="notes-list">
            {result.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <footer className="proposal-footer">
        <p>
          This estimate is for planning purposes. Final pricing subject to site
          assessment and supplier quotation. Contact courts@feera.ai for a
          detailed proposal.
        </p>
        <p className="footer-brand">Feera Courts</p>
      </footer>
    </div>
  );
}

const printStyles = `
  @page {
    margin: 0.75in;
    size: letter;
  }

  .proposal-page {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    background: #fff;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Letterhead */
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 24px;
    border-bottom: 2px solid #437E5B;
    margin-bottom: 32px;
  }
  .logo-text {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 32px;
    font-weight: normal;
    letter-spacing: -0.02em;
    color: #437E5B;
    margin: 0;
    line-height: 1;
  }
  .logo-sub {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: #437E5B;
    margin: 4px 0 0;
  }
  .contact-block {
    text-align: right;
    font-size: 11px;
    color: #666;
    line-height: 1.6;
  }

  /* Title */
  .title-block {
    margin-bottom: 32px;
  }
  .proposal-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    font-weight: normal;
    margin: 0 0 16px;
    letter-spacing: -0.01em;
  }
  .meta-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .meta-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #999;
  }
  .meta-value {
    font-size: 13px;
  }

  /* Section titles */
  .section-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 16px;
    font-weight: normal;
    margin: 0 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
    letter-spacing: -0.01em;
  }

  /* Config summary */
  .config-summary {
    margin-bottom: 32px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 24px;
  }
  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 0;
  }
  .summary-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #999;
  }
  .summary-value {
    font-size: 13px;
    text-transform: capitalize;
  }

  /* Line items table */
  .line-items {
    margin-bottom: 32px;
    page-break-inside: avoid;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  .items-table th {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #999;
    border-bottom: 1px solid #ddd;
    padding: 6px 8px;
    text-align: left;
  }
  .items-table td {
    padding: 8px;
    border-bottom: 1px solid #eee;
    font-size: 12px;
  }
  .col-qty, .col-unit, .col-total {
    text-align: right;
    white-space: nowrap;
  }
  .items-table th.col-qty,
  .items-table th.col-unit,
  .items-table th.col-total {
    text-align: right;
  }
  .item-note {
    font-size: 10px;
    color: #437E5B;
  }
  .subtotal-row td {
    border-top: 1px solid #ccc;
    font-weight: 600;
    padding-top: 10px;
  }
  .tax-row td {
    color: #666;
    font-size: 12px;
  }
  .grand-total-row td {
    border-top: 2px solid #437E5B;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px;
    color: #437E5B;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  /* Monthly ops */
  .monthly-ops {
    margin-bottom: 32px;
    page-break-before: auto;
  }
  .ops-table {
    width: 100%;
    border-collapse: collapse;
    max-width: 500px;
  }
  .ops-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
    font-size: 12px;
  }
  .ops-total-row td {
    border-top: 1px solid #ccc;
    font-weight: 600;
    padding-top: 10px;
    font-size: 14px;
    color: #437E5B;
  }

  /* ROI */
  .roi-section {
    margin-bottom: 32px;
    page-break-inside: avoid;
  }
  .roi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px 24px;
  }
  .roi-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
  }
  .roi-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #999;
  }
  .roi-value {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 16px;
    color: #437E5B;
  }
  .roi-value.negative {
    color: #dc2626;
  }

  /* Notes */
  .notes-section {
    margin-bottom: 32px;
  }
  .notes-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .notes-list li {
    font-size: 11px;
    color: #437E5B;
    padding: 4px 0;
    padding-left: 12px;
    position: relative;
  }
  .notes-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 4px;
    height: 4px;
    background: #437E5B;
    border-radius: 50%;
  }

  /* Footer */
  .proposal-footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
  }
  .proposal-footer p {
    font-size: 10px;
    color: #999;
    margin: 0 0 8px;
    line-height: 1.6;
  }
  .footer-brand {
    font-size: 11px !important;
    color: #437E5B !important;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  /* Print overrides */
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
    .proposal-page {
      padding: 0;
      max-width: none;
    }
    .line-items {
      page-break-inside: auto;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .roi-section {
      page-break-before: auto;
    }
    .proposal-footer {
      page-break-inside: avoid;
    }
  }

  /* Screen-only: nice centering */
  @media screen {
    body {
      background: #f5f5f5;
    }
    .proposal-page {
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      margin: 24px auto;
      border-radius: 2px;
    }
  }
`;

export default function ProposalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-500">Loading proposal...</p>
        </div>
      }
    >
      <ProposalContent />
    </Suspense>
  );
}
