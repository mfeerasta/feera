'use client';

import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Deal {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string | null;
  plannedCourts: number | null;
}

interface Milestone {
  id: string;
  phase: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  pctComplete: number | null;
  notes: string | null;
}

interface ProjectDocument {
  id: string;
  docType: string | null;
  fileUrl: string;
  version: number | null;
  uploadedAt: string | null;
  notes: string | null;
}

interface HardwareOrder {
  id: string;
  vendor: string | null;
  courtsOrdered: number | null;
  wholesaleUnit: number | null;
  sellUnit: number | null;
  marginPerCourt: number | null;
  totalMargin: number | null;
  status: string | null;
  orderDate: string | null;
  shipDate: string | null;
  installDate: string | null;
}

interface Financial {
  id: string;
  year: number;
  revenue: number | null;
  ebitda: number | null;
  utilizationPct: number | null;
  notes: string | null;
}

interface PortfolioPosition {
  id: string;
  stakePct: number | null;
  capitalInvested: number | null;
  latestEbitda: number | null;
  lifetimeDistributions: number | null;
  exitMultiple: number | null;
}

interface ActivityEntry {
  id: string;
  createdAt: string;
  action: string;
  details: string | null;
  userId: string | null;
}

export interface ProjectData {
  id: string;
  slug: string;
  projectName: string;
  city: string | null;
  region: string | null;
  country: string | null;
  totalCapex: number | null;
  ourRole: string | null;
  ourEquityPct: number | null;
  ourPmFeePct: number | null;
  openingDate: string | null;
  status: string | null;
  healthBudget: string | null;
  healthSchedule: string | null;
  healthScope: string | null;
  healthDemand: string | null;
  nextMilestone: string | null;
  nextMilestoneDate: string | null;
  deal: Deal | null;
  milestones: Milestone[];
  documents: ProjectDocument[];
  hardwareOrders: HardwareOrder[];
  financials: Financial[];
  portfolioPositions: PortfolioPosition[];
  activity: ActivityEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(cents: number | null): string {
  if (cents == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents);
}

function healthColor(v: string | null): string {
  if (v === 'green') return 'bg-green-500';
  if (v === 'amber') return 'bg-amber-500';
  if (v === 'red') return 'bg-red-500';
  return 'bg-gray-300';
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '-';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'today';
  return `${diff}d`;
}

function milestoneColor(m: Milestone): string {
  if (m.pctComplete === 100) return 'border-green-500 bg-green-500/10';
  if (m.actualStart && m.plannedEnd) {
    const end = new Date(m.plannedEnd);
    if (new Date() > end && (m.pctComplete ?? 0) < 100)
      return 'border-red-500 bg-red-500/10';
  }
  if (m.actualStart) return 'border-court bg-court/10';
  return 'border-gray-300 bg-gray-50';
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const TABS = [
  'Overview',
  'Financial Model',
  'Build Timeline',
  'Demand Signal',
  'Hardware',
  'Equity',
  'Documents',
  'Activity',
] as const;

type Tab = (typeof TABS)[number];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface Props {
  project: ProjectData;
}

export function ProjectTabs({ project }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const hasEquity = project.portfolioPositions.length > 0;

  // Filter visible tabs: hide Equity tab label if no position, but still allow rendering
  const visibleTabs = TABS;

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-8 flex gap-0 overflow-x-auto border-b border-[color:var(--color-border)]">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'feera-motion shrink-0 px-5 py-3 text-sm transition-colors',
              activeTab === tab
                ? 'border-b-2 border-court text-court'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && <OverviewTab project={project} />}
      {activeTab === 'Financial Model' && <FinancialModelTab project={project} />}
      {activeTab === 'Build Timeline' && <BuildTimelineTab milestones={project.milestones} />}
      {activeTab === 'Demand Signal' && <DemandSignalTab project={project} />}
      {activeTab === 'Hardware' && <HardwareTab orders={project.hardwareOrders} />}
      {activeTab === 'Equity' && <EquityTab position={hasEquity ? (project.portfolioPositions[0] ?? null) : null} />}
      {activeTab === 'Documents' && <DocumentsTab documents={project.documents} />}
      {activeTab === 'Activity' && <ActivityTab entries={project.activity} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Overview                                                    */
/* ------------------------------------------------------------------ */

function OverviewTab({ project }: { project: ProjectData }) {
  const healthItems = [
    { label: 'Budget', value: project.healthBudget },
    { label: 'Schedule', value: project.healthSchedule },
    { label: 'Scope', value: project.healthScope },
    { label: 'Demand', value: project.healthDemand },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Health indicators */}
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Health
          </p>
          <div className="mt-4 flex gap-6">
            {healthItems.map((h) => (
              <div key={h.label} className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${healthColor(h.value)}`}
                />
                <span className="text-sm">{h.label}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Next milestone */}
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Next Milestone
          </p>
          {project.nextMilestone ? (
            <div className="mt-4">
              <p className="text-sm font-medium">{project.nextMilestone}</p>
              {project.nextMilestoneDate && (
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  {project.nextMilestoneDate} ({daysUntil(project.nextMilestoneDate)})
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
              No milestone set.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Tombstone */}
      <Card className="lg:col-span-2">
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Project Details
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="Project" value={project.projectName} />
            <Detail
              label="City"
              value={
                project.city
                  ? `${project.city}${project.country ? `, ${project.country}` : ''}`
                  : '-'
              }
            />
            <Detail label="Total Capex" value={fmt(project.totalCapex)} />
            <Detail label="Our Role" value={project.ourRole ?? '-'} />
            <Detail
              label="Equity %"
              value={project.ourEquityPct != null ? `${project.ourEquityPct}%` : '-'}
            />
            <Detail
              label="PM Fee %"
              value={project.ourPmFeePct != null ? `${project.ourPmFeePct}%` : '-'}
            />
            <Detail label="Opening Date" value={project.openingDate ?? '-'} />
            <Detail label="Status" value={project.status ?? 'active'} />
          </div>
        </CardBody>
      </Card>

      {/* Key contacts */}
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Key Contacts
          </p>
          {project.deal ? (
            <div className="mt-4 space-y-2 text-sm">
              {project.deal.contactName && (
                <p>{project.deal.contactName}</p>
              )}
              {project.deal.contactEmail && (
                <p className="text-[color:var(--color-fg-muted)]">
                  {project.deal.contactEmail}
                </p>
              )}
              {project.deal.contactPhone && (
                <p className="text-[color:var(--color-fg-muted)]">
                  {project.deal.contactPhone}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
              No linked deal.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Quick stats */}
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Quick Stats
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Detail
              label="Courts"
              value={
                project.deal?.plannedCourts != null
                  ? String(project.deal.plannedCourts)
                  : '-'
              }
            />
            <Detail
              label="Days to Opening"
              value={daysUntil(project.openingDate)}
            />
            <Detail
              label="Deal Source"
              value={project.deal?.source ?? '-'}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Financial Model                                             */
/* ------------------------------------------------------------------ */

function FinancialModelTab({ project }: { project: ProjectData }) {
  const financials = project.financials;

  return (
    <div>
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Financial Model
          </p>
          <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
            Financial model will be embedded here in Phase 7.
          </p>
        </CardBody>
      </Card>

      {financials.length > 0 && (
        <div className="mt-6">
          <Table>
            <THead>
              <TR>
                <TH>Year</TH>
                <TH>Revenue</TH>
                <TH>EBITDA</TH>
                <TH>Utilization %</TH>
                <TH>Notes</TH>
              </TR>
            </THead>
            <TBody>
              {financials.map((f) => (
                <TR key={f.id}>
                  <TD>{f.year}</TD>
                  <TD>{fmt(f.revenue)}</TD>
                  <TD>{fmt(f.ebitda)}</TD>
                  <TD>
                    {f.utilizationPct != null
                      ? `${f.utilizationPct}%`
                      : '-'}
                  </TD>
                  <TD className="text-xs text-[color:var(--color-fg-muted)]">
                    {f.notes ?? '-'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Build Timeline                                              */
/* ------------------------------------------------------------------ */

function BuildTimelineTab({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No milestones added yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {milestones.map((m, i) => (
        <div
          key={m.id}
          className="flex gap-4"
        >
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <div
              className={`h-4 w-4 rounded-full border-2 ${milestoneColor(m)}`}
            />
            {i < milestones.length - 1 && (
              <div className="w-px flex-1 bg-[color:var(--color-border)]" />
            )}
          </div>

          {/* Milestone card */}
          <Card className="mb-2 flex-1">
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{m.phase}</p>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-[color:var(--color-fg-muted)]">
                    {m.plannedStart && (
                      <span>Plan: {m.plannedStart} to {m.plannedEnd ?? '?'}</span>
                    )}
                    {m.actualStart && (
                      <span>
                        Actual: {m.actualStart}
                        {m.actualEnd ? ` to ${m.actualEnd}` : ' (ongoing)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-sm font-medium">
                    {m.pctComplete ?? 0}%
                  </span>
                  <div className="mt-1 h-1.5 w-24 bg-gray-200">
                    <div
                      className="h-full bg-court"
                      style={{ width: `${m.pctComplete ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
              {m.notes && (
                <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
                  {m.notes}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Demand Signal                                               */
/* ------------------------------------------------------------------ */

function DemandSignalTab({ project }: { project: ProjectData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Demand Signal from the Feera App
          </p>
          <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
            This page will pull live data from the Feera app database: active
            users within 5/10/15km, sessions booked, nearby facility
            utilization, player density heatmap.
          </p>
          <div className="mt-6 border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-800">
              Insufficient Feera signal in this catchment. Falling back to
              census and SFIA benchmarks.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Project Location
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Detail label="City" value={project.city ?? '-'} />
            <Detail label="Region" value={project.region ?? '-'} />
            <Detail label="Country" value={project.country ?? '-'} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: Hardware                                                    */
/* ------------------------------------------------------------------ */

function HardwareTab({ orders }: { orders: HardwareOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No hardware orders yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  const totalMargin = orders.reduce(
    (sum, o) => sum + (o.totalMargin ?? 0),
    0,
  );

  return (
    <div>
      <Table>
        <THead>
          <TR>
            <TH>Vendor</TH>
            <TH>Courts</TH>
            <TH>Wholesale/Unit</TH>
            <TH>Sell/Unit</TH>
            <TH>Margin/Court</TH>
            <TH>Total Margin</TH>
            <TH>Status</TH>
            <TH>Order Date</TH>
          </TR>
        </THead>
        <TBody>
          {orders.map((o) => (
            <TR key={o.id}>
              <TD>{o.vendor ?? '-'}</TD>
              <TD>{o.courtsOrdered ?? '-'}</TD>
              <TD>{fmt(o.wholesaleUnit)}</TD>
              <TD>{fmt(o.sellUnit)}</TD>
              <TD>{fmt(o.marginPerCourt)}</TD>
              <TD>{fmt(o.totalMargin)}</TD>
              <TD>
                <span className="text-xs uppercase tracking-wider">
                  {o.status ?? '-'}
                </span>
              </TD>
              <TD>{o.orderDate ?? '-'}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <div className="mt-4 border-t border-[color:var(--color-border)] pt-4 text-end">
        <span className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Total Margin:
        </span>{' '}
        <span className="font-serif text-lg">{fmt(totalMargin)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: Equity                                                      */
/* ------------------------------------------------------------------ */

function EquityTab({ position }: { position: PortfolioPosition | null }) {
  if (!position) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No equity position in this project.
          </p>
        </CardBody>
      </Card>
    );
  }

  const impliedValue =
    position.latestEbitda != null &&
    position.exitMultiple != null &&
    position.stakePct != null
      ? Math.round(
          position.latestEbitda *
            position.exitMultiple *
            (position.stakePct / 100),
        )
      : null;

  return (
    <Card>
      <CardBody>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Equity Position
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail
            label="Stake %"
            value={
              position.stakePct != null ? `${position.stakePct}%` : '-'
            }
          />
          <Detail label="Capital Invested" value={fmt(position.capitalInvested)} />
          <Detail label="Latest EBITDA" value={fmt(position.latestEbitda)} />
          <Detail
            label="Distributions Received"
            value={fmt(position.lifetimeDistributions)}
          />
          <Detail
            label={`Implied Paper Value (${position.exitMultiple ?? 8}x EBITDA)`}
            value={fmt(impliedValue)}
          />
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 7: Documents                                                   */
/* ------------------------------------------------------------------ */

function DocumentsTab({ documents }: { documents: ProjectDocument[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No documents uploaded yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Type</TH>
          <TH>File</TH>
          <TH>Version</TH>
          <TH>Uploaded</TH>
          <TH>Notes</TH>
        </TR>
      </THead>
      <TBody>
        {documents.map((d) => (
          <TR key={d.id}>
            <TD>
              <span className="text-xs uppercase tracking-wider">
                {d.docType ?? '-'}
              </span>
            </TD>
            <TD>
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-court hover:text-court/80"
              >
                {d.fileUrl.split('/').pop() ?? 'Download'}
              </a>
            </TD>
            <TD>{d.version ?? 1}</TD>
            <TD>
              {d.uploadedAt
                ? new Date(d.uploadedAt).toLocaleDateString()
                : '-'}
            </TD>
            <TD className="text-xs text-[color:var(--color-fg-muted)]">
              {d.notes ?? '-'}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 8: Activity                                                    */
/* ------------------------------------------------------------------ */

function ActivityTab({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No activity recorded yet.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <Card key={e.id}>
          <CardBody className="flex items-start gap-4">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-court" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{e.action}</span>
                <span className="text-xs text-[color:var(--color-fg-muted)]">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
              {e.details && (
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  {e.details}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
