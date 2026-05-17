#!/usr/bin/env node
/**
 * Seed demo clubs + courts + pricing into the live Neon DB.
 *
 * Idempotent: every row uses `ON CONFLICT DO NOTHING` on a stable slug or name pair.
 * Safe to re-run.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-demo.mjs
 */

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

const clubs = [
  {
    name: 'Lahore Padel Club',
    slug: 'lahore-padel-club',
    city: 'Lahore',
    country: 'PK',
    currency: 'PKR',
    address: 'DHA Phase 5, Lahore',
    lat: 31.4748,
    lng: 74.4029,
    indoor: true,
    outdoor: true,
    shower: true,
    parking: true,
  },
  {
    name: 'Karachi Padel Centre',
    slug: 'karachi-padel-centre',
    city: 'Karachi',
    country: 'PK',
    currency: 'PKR',
    address: 'Clifton Block 8, Karachi',
    lat: 24.8138,
    lng: 67.0286,
    indoor: false,
    outdoor: true,
    shower: true,
    parking: true,
  },
  {
    name: 'Islamabad Padel House',
    slug: 'islamabad-padel-house',
    city: 'Islamabad',
    country: 'PK',
    currency: 'PKR',
    address: 'F-7 Markaz, Islamabad',
    lat: 33.7174,
    lng: 73.0686,
    indoor: true,
    outdoor: false,
    shower: true,
    parking: true,
  },
  {
    name: 'Dubai Padel Plaza',
    slug: 'dubai-padel-plaza',
    city: 'Dubai',
    country: 'AE',
    currency: 'AED',
    address: 'Al Quoz, Dubai',
    lat: 25.1404,
    lng: 55.2226,
    indoor: true,
    outdoor: true,
    shower: true,
    parking: true,
  },
];

async function main() {
  for (const c of clubs) {
    console.log(`==> club ${c.slug}`);
    const [club] = await sql`
      insert into clubs (
        name, slug, country_code, city, address, lat, lng,
        has_indoor, has_outdoor, has_shower_facilities, has_parking,
        default_currency, is_active
      ) values (
        ${c.name}, ${c.slug}, ${c.country}, ${c.city}, ${c.address}, ${c.lat}, ${c.lng},
        ${c.indoor}, ${c.outdoor}, ${c.shower}, ${c.parking},
        ${c.currency}, true
      )
      on conflict (slug) do update set updated_at = now()
      returning id, slug
    `;

    // Two courts per club.
    for (const courtName of ['Court 1', 'Court 2']) {
      const [court] = await sql`
        insert into courts (club_id, name, surface, is_indoor, is_active)
        select ${club.id}, ${courtName}, 'artificial_grass', ${c.indoor}, true
        where not exists (
          select 1 from courts where club_id = ${club.id} and name = ${courtName}
        )
        returning id, name
      `;
      if (!court) {
        console.log(`   court ${courtName} already present`);
        continue;
      }

      // 7-day pricing: peak (18:00-22:00) and off-peak (06:00-18:00).
      // PKR clubs default 1500/slot peak, 800/slot off-peak.
      // AED clubs default 120 peak, 80 off-peak.
      const peak = c.currency === 'PKR' ? 1500 : 120;
      const off = c.currency === 'PKR' ? 800 : 80;
      for (let dow = 0; dow < 7; dow += 1) {
        await sql`
          insert into court_pricing_rules (
            court_id, day_of_week, start_time, end_time, price_per_slot, currency, is_peak
          ) values
            (${court.id}, ${dow}, '06:00', '18:00', ${off}, ${c.currency}, false),
            (${court.id}, ${dow}, '18:00', '22:00', ${peak}, ${c.currency}, true)
          on conflict do nothing
        `;
      }
      console.log(`   court ${court.name} seeded with pricing`);
    }
  }

  const counts = await sql`
    select
      (select count(*)::int from clubs) as clubs,
      (select count(*)::int from courts) as courts,
      (select count(*)::int from court_pricing_rules) as pricing_rules
  `;
  console.log(`==> seeded: ${counts[0].clubs} clubs, ${counts[0].courts} courts, ${counts[0].pricing_rules} pricing rules`);

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
