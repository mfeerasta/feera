#!/usr/bin/env node
/**
 * Seed demo bookings + open-match candidates into the live Neon DB.
 *
 * Creates 6 future bookings across the 4 demo clubs:
 *   - 2 fully-booked (seats_booked = 4) -> dark on calendar
 *   - 3 open-match (seats_booked = 2) -> brass on calendar, surfaces in /play/open
 *   - 1 women-only open match -> filtered by ?pool=women
 *
 * Uses the seeded demo coach users as organizers + invited friends so the
 * roster is real, not synthetic UUIDs.
 *
 * Idempotent. Marker note in `bookings.notes = 'demo-seed-v1'` so re-runs
 * delete + reinsert cleanly.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-bookings.mjs
 */

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

const SEED_MARKER = 'demo-seed-v1';

async function main() {
  console.log('==> clearing prior seed bookings');
  await sql`delete from bookings where notes = ${SEED_MARKER}`;

  const clubs = await sql`
    select c.id as club_id, c.slug, c.city, c.country_code, c.default_currency,
           array_agg(co.id order by co.name) as court_ids
    from clubs c
    join courts co on co.club_id = c.id
    where c.slug in (
      'lahore-padel-club', 'karachi-padel-centre',
      'islamabad-padel-house', 'dubai-padel-plaza'
    )
    group by c.id
    order by c.slug
  `;
  if (clubs.length !== 4) {
    console.error(`expected 4 demo clubs, got ${clubs.length}. Run seed-demo.mjs first.`);
    process.exit(2);
  }

  // Reuse the seeded coach users (Zara/Farhan/Amna/Diego) as organizers + friends.
  const users = await sql`
    select id, display_name, country_code, city
    from users
    where email in (
      'coach.zara.lhe@feera.ai', 'coach.farhan.khi@feera.ai',
      'coach.amna.isb@feera.ai', 'coach.diego.dxb@feera.ai'
    )
    order by display_name
  `;
  if (users.length !== 4) {
    console.error(`expected 4 demo users, got ${users.length}. Run seed-coaches.mjs first.`);
    process.exit(3);
  }

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(18, 0, 0, 0);

  const fixtures = [
    // 2 fully booked.
    { clubIdx: 0, courtIdx: 0, dayOffset: 1, hour: 18, seats: 4, gender: 'open' },
    { clubIdx: 3, courtIdx: 1, dayOffset: 2, hour: 19, seats: 4, gender: 'open' },
    // 3 open match.
    { clubIdx: 0, courtIdx: 1, dayOffset: 1, hour: 20, seats: 2, gender: 'open' },
    { clubIdx: 1, courtIdx: 0, dayOffset: 3, hour: 19, seats: 2, gender: 'mixed' },
    { clubIdx: 2, courtIdx: 0, dayOffset: 4, hour: 18, seats: 1, gender: 'open' },
    // 1 women-only open match.
    { clubIdx: 2, courtIdx: 1, dayOffset: 5, hour: 7, seats: 1, gender: 'women_only' },
  ];

  let created = 0;
  for (const fx of fixtures) {
    const club = clubs[fx.clubIdx];
    const courtId = club.court_ids[fx.courtIdx];
    const organizer = users[fx.clubIdx];

    const start = new Date();
    start.setUTCDate(start.getUTCDate() + fx.dayOffset);
    start.setUTCHours(fx.hour, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + 90);

    const isOpen = fx.seats < 4;

    const [booking] = await sql`
      insert into bookings (
        court_id, organizer_user_id, start_at, end_at,
        total_amount, currency, status, is_open_match,
        seats_booked, gender_preference, max_participants,
        notes
      ) values (
        ${courtId}, ${organizer.id}, ${start.toISOString()}, ${end.toISOString()},
        ${club.default_currency === 'PKR' ? 1500 : 120},
        ${club.default_currency},
        'confirmed', ${isOpen},
        ${fx.seats}, ${fx.gender}, 4,
        ${SEED_MARKER}
      )
      returning id
    `;

    // Organizer always in participants.
    await sql`
      insert into booking_participants (booking_id, user_id, status, payment_status, paid_amount)
      values (${booking.id}, ${organizer.id}, 'accepted', 'paid',
              ${(club.default_currency === 'PKR' ? 1500 : 120) / 4})
    `;

    // If seats > 1, add invited friends from the remaining demo users.
    if (fx.seats > 1) {
      const friends = users.filter((u) => u.id !== organizer.id).slice(0, fx.seats - 1);
      for (const friend of friends) {
        await sql`
          insert into booking_participants (booking_id, user_id, status, payment_status, paid_amount)
          values (${booking.id}, ${friend.id}, 'accepted', 'paid',
                  ${(club.default_currency === 'PKR' ? 1500 : 120) / 4})
        `;
      }
    }

    created += 1;
    console.log(`   booking ${booking.id} (${club.slug}/${fx.gender}, ${fx.seats}/4 seats)`);
  }

  const counts = await sql`
    select
      (select count(*)::int from bookings where notes = ${SEED_MARKER}) as bookings,
      (select count(*)::int from booking_participants p
        join bookings b on b.id = p.booking_id where b.notes = ${SEED_MARKER}) as participants,
      (select count(*)::int from bookings where notes = ${SEED_MARKER} and is_open_match = true) as open_matches
  `;
  console.log(
    `==> seeded: ${counts[0].bookings} bookings, ${counts[0].participants} participants, ${counts[0].open_matches} open matches`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
