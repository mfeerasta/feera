import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { users } from './users';

/* ------------------------------------------------------------------ */
/*  courts_deals (defined first so courts_leads can reference it)     */
/* ------------------------------------------------------------------ */

export const courtsDeals = pgTable(
  'courts_deals',
  {
    id: idColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    projectName: text('project_name').notNull(),
    slug: text('slug').notNull(),
    city: text('city'),
    region: text('region'),
    country: text('country'),
    stage: text('stage').default('lead'),
    source: text('source'),
    sourceDetail: text('source_detail'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    projectType: text('project_type'),
    plannedCourts: integer('planned_courts'),
    projectedCapex: integer('projected_capex'),
    expectedConsultingFee: integer('expected_consulting_fee'),
    expectedHardwareCourts: integer('expected_hardware_courts'),
    hardwareMarginPerCourt: integer('hardware_margin_per_court').default(7000),
    equityOption: boolean('equity_option').default(false),
    equityPct: real('equity_pct'),
    equityCoInvest: integer('equity_co_invest'),
    probability: integer('probability'),
    expectedCloseDate: date('expected_close_date'),
    stageHistory: jsonb('stage_history'),
    notesMd: text('notes_md'),
    archived: boolean('archived').default(false),
  },
  (t) => [uniqueIndex('courts_deals_slug_uq').on(t.slug)],
);

/* ------------------------------------------------------------------ */
/*  courts_leads                                                       */
/* ------------------------------------------------------------------ */

export const courtsLeads = pgTable('courts_leads', {
  id: idColumn(),
  createdAt: createdAtColumn(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  city: text('city'),
  projectStage: text('project_stage'),
  capexRange: text('capex_range'),
  message: text('message'),
  sourcePage: text('source_page'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  referrer: text('referrer'),
  status: text('status').default('new'),
  convertedToDealId: uuid('converted_to_deal_id').references(
    () => courtsDeals.id,
    { onDelete: 'set null' },
  ),
});

/* ------------------------------------------------------------------ */
/*  courts_projects                                                    */
/* ------------------------------------------------------------------ */

export const courtsProjects = pgTable(
  'courts_projects',
  {
    id: idColumn(),
    dealId: uuid('deal_id').references(() => courtsDeals.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    projectName: text('project_name').notNull(),
    slug: text('slug').notNull(),
    city: text('city'),
    region: text('region'),
    country: text('country'),
    totalCapex: integer('total_capex'),
    ourRole: text('our_role'),
    ourEquityPct: real('our_equity_pct'),
    ourPmFeePct: real('our_pm_fee_pct'),
    openingDate: date('opening_date'),
    status: text('status').default('active'),
    healthBudget: text('health_budget').default('green'),
    healthSchedule: text('health_schedule').default('green'),
    healthScope: text('health_scope').default('green'),
    healthDemand: text('health_demand').default('green'),
    nextMilestone: text('next_milestone'),
    nextMilestoneDate: date('next_milestone_date'),
  },
  (t) => [uniqueIndex('courts_projects_slug_uq').on(t.slug)],
);

/* ------------------------------------------------------------------ */
/*  courts_project_documents                                           */
/* ------------------------------------------------------------------ */

export const courtsProjectDocuments = pgTable('courts_project_documents', {
  id: idColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => courtsProjects.id, { onDelete: 'cascade' }),
  docType: text('doc_type'),
  fileUrl: text('file_url').notNull(),
  version: integer('version').default(1),
  uploadedBy: uuid('uploaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  notes: text('notes'),
});

/* ------------------------------------------------------------------ */
/*  courts_project_milestones                                          */
/* ------------------------------------------------------------------ */

export const courtsProjectMilestones = pgTable('courts_project_milestones', {
  id: idColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => courtsProjects.id, { onDelete: 'cascade' }),
  phase: text('phase').notNull(),
  plannedStart: date('planned_start'),
  plannedEnd: date('planned_end'),
  actualStart: date('actual_start'),
  actualEnd: date('actual_end'),
  pctComplete: integer('pct_complete').default(0),
  notes: text('notes'),
});

/* ------------------------------------------------------------------ */
/*  courts_hardware_orders                                             */
/* ------------------------------------------------------------------ */

export const courtsHardwareOrders = pgTable('courts_hardware_orders', {
  id: idColumn(),
  projectId: uuid('project_id').references(() => courtsProjects.id, {
    onDelete: 'set null',
  }),
  vendor: text('vendor'),
  courtsOrdered: integer('courts_ordered'),
  wholesaleUnit: integer('wholesale_unit'),
  sellUnit: integer('sell_unit'),
  marginPerCourt: integer('margin_per_court'),
  totalMargin: integer('total_margin'),
  status: text('status').default('quoted'),
  orderDate: date('order_date'),
  shipDate: date('ship_date'),
  installDate: date('install_date'),
  paidDate: date('paid_date'),
});

/* ------------------------------------------------------------------ */
/*  courts_portfolio_positions                                         */
/* ------------------------------------------------------------------ */

export const courtsPortfolioPositions = pgTable('courts_portfolio_positions', {
  id: idColumn(),
  projectId: uuid('project_id').references(() => courtsProjects.id, {
    onDelete: 'set null',
  }),
  acquiredDate: date('acquired_date'),
  stakePct: real('stake_pct'),
  capitalInvested: integer('capital_invested'),
  latestEbitda: integer('latest_ebitda'),
  ebitdaAsOf: date('ebitda_as_of'),
  lifetimeDistributions: integer('lifetime_distributions').default(0),
  ytdDistributions: integer('ytd_distributions').default(0),
  exitMultiple: real('exit_multiple').default(8.0),
  notes: text('notes'),
});

/* ------------------------------------------------------------------ */
/*  courts_portfolio_distributions                                     */
/* ------------------------------------------------------------------ */

export const courtsPortfolioDistributions = pgTable(
  'courts_portfolio_distributions',
  {
    id: idColumn(),
    positionId: uuid('position_id')
      .notNull()
      .references(() => courtsPortfolioPositions.id, { onDelete: 'cascade' }),
    distributionDate: date('distribution_date').notNull(),
    amount: integer('amount').notNull(),
    notes: text('notes'),
  },
);

/* ------------------------------------------------------------------ */
/*  courts_financial_scenarios                                         */
/* ------------------------------------------------------------------ */

export const courtsFinancialScenarios = pgTable('courts_financial_scenarios', {
  id: idColumn(),
  createdAt: createdAtColumn(),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  assumptions: jsonb('assumptions').notNull(),
  outputs: jsonb('outputs').notNull(),
  notes: text('notes'),
});

/* ------------------------------------------------------------------ */
/*  courts_partners                                                    */
/* ------------------------------------------------------------------ */

export const courtsPartners = pgTable('courts_partners', {
  id: idColumn(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  blurb: text('blurb'),
  displayOrder: integer('display_order').default(0),
  active: boolean('active').default(true),
});

/* ------------------------------------------------------------------ */
/*  courts_activity_log                                                */
/* ------------------------------------------------------------------ */

export const courtsActivityLog = pgTable('courts_activity_log', {
  id: idColumn(),
  createdAt: createdAtColumn(),
  projectId: uuid('project_id').references(() => courtsProjects.id, {
    onDelete: 'set null',
  }),
  dealId: uuid('deal_id').references(() => courtsDeals.id, {
    onDelete: 'set null',
  }),
  userId: uuid('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  details: text('details'),
  metadata: jsonb('metadata'),
});

/* ------------------------------------------------------------------ */
/*  courts_project_financials                                          */
/* ------------------------------------------------------------------ */

export const courtsProjectFinancials = pgTable(
  'courts_project_financials',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => courtsProjects.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    revenue: integer('revenue'),
    ebitda: integer('ebitda'),
    utilizationPct: real('utilization_pct'),
    notes: text('notes'),
  },
  (t) => [
    unique('courts_project_financials_project_year_uq').on(
      t.projectId,
      t.year,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/*  courts_documents_library                                           */
/* ------------------------------------------------------------------ */

export const courtsDocumentsLibrary = pgTable(
  'courts_documents_library',
  {
    id: idColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    category: text('category'),
    contentMd: text('content_md'),
    version: integer('version').default(1),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [uniqueIndex('courts_documents_library_slug_uq').on(t.slug)],
);
