#!/usr/bin/env node
/**
 * Seed the Courts business tables with realistic dev data. Idempotent via
 * ON CONFLICT DO UPDATE.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-courts.mjs
 */

import postgres from 'postgres';
import crypto from 'node:crypto';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

/* ------------------------------------------------------------------ */
/*  Partners                                                           */
/* ------------------------------------------------------------------ */

const PARTNERS = [
  {
    name: 'Padel Galis',
    category: 'court-manufacturer',
    blurb: 'Premium European manufacturer. Official Feera Courts dealership partner for the Great Lakes region.',
    displayOrder: 1,
  },
  {
    name: 'Mondo',
    category: 'court-manufacturer',
    blurb: 'Italian sports surface leader. PREMIER SUPERCOURT X3 turf system.',
    displayOrder: 2,
  },
  {
    name: 'MejorSet',
    category: 'court-manufacturer',
    blurb: 'Official FIP court supplier. Florida Building Code certified. ASTM E1300 glass.',
    displayOrder: 3,
  },
  {
    name: 'Bounce Padel Courts',
    category: 'court-manufacturer',
    blurb: 'Canadian manufacturer based in Orillia, Ontario. Domestic sourcing advantage.',
    displayOrder: 4,
  },
  {
    name: 'Playtomic',
    category: 'booking-tech',
    blurb: 'Largest padel booking network globally. Dynamic pricing and player matching.',
    displayOrder: 5,
  },
  {
    name: 'CBRE',
    category: 'real-estate',
    blurb: 'Brad Collins, Windsor office. Commercial real estate advisory for the corridor.',
    displayOrder: 6,
  },
  {
    name: 'Miller Canfield',
    category: 'legal-tax',
    blurb: 'Cross-border legal practice. Michigan and Ontario corporate, tax, and real estate.',
    displayOrder: 7,
  },
  {
    name: 'Feera',
    category: 'booking-tech',
    blurb: 'Sister product. Shared demand data and player insights across the platform.',
    displayOrder: 8,
  },
];

/* ------------------------------------------------------------------ */
/*  Pipeline deals                                                     */
/* ------------------------------------------------------------------ */

const DEALS = [
  {
    projectName: 'Riverside Padel Club',
    slug: 'riverside-padel-club',
    city: 'Windsor',
    stage: 'qualified',
    plannedCourts: 4,
    projectedCapex: 860000,
    expectedConsultingFee: 35000,
    probability: 60,
  },
  {
    projectName: 'Troy Athletic Center',
    slug: 'troy-athletic-center',
    city: 'Troy',
    stage: 'proposal-sent',
    plannedCourts: 6,
    projectedCapex: 1500000,
    expectedConsultingFee: 75000,
    equityOption: true,
    equityPct: 10,
    probability: 45,
  },
  {
    projectName: 'Dearborn Heights Racquet',
    slug: 'dearborn-heights-racquet',
    city: 'Dearborn Heights',
    stage: 'lead',
    plannedCourts: 4,
    projectedCapex: 700000,
    expectedConsultingFee: 35000,
    probability: 20,
  },
  {
    projectName: 'Ann Arbor Padel Co',
    slug: 'ann-arbor-padel-co',
    city: 'Ann Arbor',
    stage: 'engaged',
    plannedCourts: 8,
    projectedCapex: 2200000,
    expectedConsultingFee: 150000,
    equityOption: true,
    equityPct: 12,
    probability: 80,
  },
  {
    projectName: 'Tecumseh Sports Complex',
    slug: 'tecumseh-sports-complex',
    city: 'Tecumseh',
    stage: 'lead',
    plannedCourts: 3,
    projectedCapex: 500000,
    expectedConsultingFee: 35000,
    probability: 15,
  },
];

/* ------------------------------------------------------------------ */
/*  Projects (placeholders for portfolio positions)                    */
/* ------------------------------------------------------------------ */

const PROJECTS = [
  {
    projectName: 'Project Alpha',
    slug: 'project-alpha',
    city: 'Windsor',
    totalCapex: 900000,
    status: 'active',
    ourRole: 'consulting + equity',
    ourEquityPct: 10,
  },
  {
    projectName: 'Project Beta',
    slug: 'project-beta',
    city: 'Troy',
    totalCapex: 1400000,
    status: 'active',
    ourRole: 'owners-rep + equity',
    ourEquityPct: 8,
  },
];

/* ------------------------------------------------------------------ */
/*  Portfolio positions (keyed to projects above by index)             */
/* ------------------------------------------------------------------ */

const POSITIONS = [
  {
    projectSlug: 'project-alpha',
    stakePct: 10,
    capitalInvested: 150000,
    latestEbitda: 320000,
    ebitdaAsOf: '2026-03-31',
    lifetimeDistributions: 32000,
    ytdDistributions: 32000,
    exitMultiple: 8.0,
  },
  {
    projectSlug: 'project-beta',
    stakePct: 8,
    capitalInvested: 120000,
    latestEbitda: 280000,
    ebitdaAsOf: '2026-03-31',
    lifetimeDistributions: 22400,
    ytdDistributions: 22400,
    exitMultiple: 8.0,
  },
];

/* ------------------------------------------------------------------ */
/*  Financial scenario                                                 */
/* ------------------------------------------------------------------ */

const SCENARIO = {
  name: 'Hybrid Base Case Y3',
  assumptions: {
    consultingY1: 3,
    consultingY2: 6,
    consultingY3: 9,
    avgFee: 55000,
    hardwareY1: 8,
    hardwareY2: 18,
    hardwareY3: 28,
    hardwareMargin: 7000,
    equityStakes: 2,
    stabilizedEbitda: 320000,
    avgStakePct: 10,
    exitMultiple: 8,
    opexRate: 40,
    taxRate: 25,
    distributionPolicy: 30,
  },
  outputs: {
    y3Revenue: 930000,
    y3Ebitda: 558000,
    y3Margin: 60,
    cumulativeCash: 712000,
    paperEquity: 307200,
  },
};

/* ------------------------------------------------------------------ */
/*  Documents library                                                  */
/* ------------------------------------------------------------------ */

const DOCUMENTS = [
  { title: 'Standard Engagement Letter', slug: 'standard-engagement-letter', category: 'template', displayOrder: 1 },
  { title: 'Standard NDA', slug: 'standard-nda', category: 'template', displayOrder: 2 },
  { title: "Owner's Rep Agreement", slug: 'owners-rep-agreement', category: 'template', displayOrder: 3 },
  { title: 'Court Vendor RFP Template', slug: 'court-vendor-rfp-template', category: 'template', displayOrder: 4 },
  { title: 'Feasibility Model Framework', slug: 'feasibility-model-framework', category: 'guide', displayOrder: 5 },
  { title: 'Sweden Stress Test Methodology', slug: 'sweden-stress-test-methodology', category: 'guide', displayOrder: 6 },
  { title: 'Site Visit Checklist', slug: 'site-visit-checklist', category: 'guide', displayOrder: 7 },
  { title: 'Lease Term Sheet Template', slug: 'lease-term-sheet-template', category: 'guide', displayOrder: 8 },
  { title: 'Sample Feasibility Report (Redacted)', slug: 'sample-feasibility-report-redacted', category: 'reference', displayOrder: 9 },
  { title: 'Opening Day Playbook', slug: 'opening-day-playbook', category: 'reference', displayOrder: 10 },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('==> seeding courts partners');
  let count = 0;
  for (const p of PARTNERS) {
    // No unique constraint on name, so check-then-upsert manually
    const existing = await sql`
      select id from courts_partners where name = ${p.name} limit 1
    `;
    if (existing.length > 0) {
      await sql`
        update courts_partners
        set category = ${p.category}, blurb = ${p.blurb}, display_order = ${p.displayOrder}
        where id = ${existing[0].id}
      `;
    } else {
      await sql`
        insert into courts_partners (id, name, category, blurb, display_order, active)
        values (${crypto.randomUUID()}, ${p.name}, ${p.category}, ${p.blurb}, ${p.displayOrder}, true)
      `;
    }
    count += 1;
  }
  console.log(`    ${count} partner rows upserted`);

  console.log('==> seeding courts deals');
  count = 0;
  for (const d of DEALS) {
    const res = await sql`
      insert into courts_deals (
        id, project_name, slug, city, stage,
        planned_courts, projected_capex, expected_consulting_fee,
        equity_option, equity_pct, probability
      ) values (
        ${crypto.randomUUID()}, ${d.projectName}, ${d.slug}, ${d.city}, ${d.stage},
        ${d.plannedCourts}, ${d.projectedCapex}, ${d.expectedConsultingFee},
        ${d.equityOption ?? false}, ${d.equityPct ?? null}, ${d.probability}
      )
      on conflict (slug) do update set
        stage = excluded.stage,
        planned_courts = excluded.planned_courts,
        projected_capex = excluded.projected_capex,
        expected_consulting_fee = excluded.expected_consulting_fee,
        equity_option = excluded.equity_option,
        equity_pct = excluded.equity_pct,
        probability = excluded.probability
      returning id
    `;
    if (res.length > 0) count += 1;
  }
  console.log(`    ${count} deal rows upserted`);

  console.log('==> seeding courts projects (for portfolio)');
  const projectIds = {};
  for (const proj of PROJECTS) {
    const res = await sql`
      insert into courts_projects (
        id, project_name, slug, city, total_capex, status, our_role, our_equity_pct
      ) values (
        ${crypto.randomUUID()}, ${proj.projectName}, ${proj.slug}, ${proj.city},
        ${proj.totalCapex}, ${proj.status}, ${proj.ourRole}, ${proj.ourEquityPct}
      )
      on conflict (slug) do update set
        total_capex = excluded.total_capex,
        status = excluded.status,
        our_role = excluded.our_role,
        our_equity_pct = excluded.our_equity_pct
      returning id
    `;
    if (res.length > 0) projectIds[proj.slug] = res[0].id;
  }
  console.log(`    ${Object.keys(projectIds).length} project rows upserted`);

  console.log('==> seeding portfolio positions');
  count = 0;
  for (const pos of POSITIONS) {
    const projectId = projectIds[pos.projectSlug];
    if (!projectId) {
      console.warn(`    WARNING: no project id for ${pos.projectSlug}, skipping`);
      continue;
    }
    // Check by project_id to make reruns idempotent
    const existing = await sql`
      select id from courts_portfolio_positions where project_id = ${projectId} limit 1
    `;
    if (existing.length > 0) {
      await sql`
        update courts_portfolio_positions
        set stake_pct = ${pos.stakePct}, capital_invested = ${pos.capitalInvested},
            latest_ebitda = ${pos.latestEbitda}, ebitda_as_of = ${pos.ebitdaAsOf},
            lifetime_distributions = ${pos.lifetimeDistributions},
            ytd_distributions = ${pos.ytdDistributions}, exit_multiple = ${pos.exitMultiple}
        where id = ${existing[0].id}
      `;
    } else {
      await sql`
        insert into courts_portfolio_positions (
          id, project_id, stake_pct, capital_invested,
          latest_ebitda, ebitda_as_of, lifetime_distributions,
          ytd_distributions, exit_multiple
        ) values (
          ${crypto.randomUUID()}, ${projectId}, ${pos.stakePct}, ${pos.capitalInvested},
          ${pos.latestEbitda}, ${pos.ebitdaAsOf}, ${pos.lifetimeDistributions},
          ${pos.ytdDistributions}, ${pos.exitMultiple}
        )
      `;
    }
    count += 1;
  }
  console.log(`    ${count} portfolio position rows upserted`);

  console.log('==> seeding financial scenario');
  const existingScenario = await sql`
    select id from courts_financial_scenarios where name = ${SCENARIO.name} limit 1
  `;
  if (existingScenario.length > 0) {
    await sql`
      update courts_financial_scenarios
      set assumptions = ${JSON.stringify(SCENARIO.assumptions)},
          outputs = ${JSON.stringify(SCENARIO.outputs)}
      where id = ${existingScenario[0].id}
    `;
    console.log('    1 scenario row updated');
  } else {
    await sql`
      insert into courts_financial_scenarios (id, name, assumptions, outputs)
      values (
        ${crypto.randomUUID()},
        ${SCENARIO.name},
        ${JSON.stringify(SCENARIO.assumptions)},
        ${JSON.stringify(SCENARIO.outputs)}
      )
    `;
    console.log('    1 scenario row inserted');
  }

  console.log('==> seeding documents library');
  count = 0;
  for (const doc of DOCUMENTS) {
    const contentMd = `# ${doc.title}\n\nPlaceholder content for the ${doc.category}: ${doc.title}. Replace with real content.`;
    const res = await sql`
      insert into courts_documents_library (id, title, slug, category, content_md, version)
      values (${crypto.randomUUID()}, ${doc.title}, ${doc.slug}, ${doc.category}, ${contentMd}, 1)
      on conflict (slug) do update set
        title = excluded.title,
        category = excluded.category,
        updated_at = now()
      returning id
    `;
    if (res.length > 0) count += 1;
  }
  console.log(`    ${count} document rows upserted`);

  // Summary
  const partnerCount = await sql`select count(*)::int n from courts_partners`;
  const dealCount = await sql`select count(*)::int n from courts_deals`;
  const projectCount = await sql`select count(*)::int n from courts_projects`;
  const posCount = await sql`select count(*)::int n from courts_portfolio_positions`;
  const scenarioCount = await sql`select count(*)::int n from courts_financial_scenarios`;
  const docCount = await sql`select count(*)::int n from courts_documents_library`;

  console.log('\n==> Courts seed complete');
  console.log(`    Partners:    ${partnerCount[0].n}`);
  console.log(`    Deals:       ${dealCount[0].n}`);
  console.log(`    Projects:    ${projectCount[0].n}`);
  console.log(`    Positions:   ${posCount[0].n}`);
  console.log(`    Scenarios:   ${scenarioCount[0].n}`);
  console.log(`    Documents:   ${docCount[0].n}`);

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
