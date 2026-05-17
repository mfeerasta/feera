#!/usr/bin/env node
/**
 * Seed 4 demo verified coaches tied to the 4 demo clubs already in the live DB.
 * Idempotent: matches users by email and coach rows by user_id.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-coaches.mjs
 */

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', max: 1 });

const baseWeekly = {
  mon: [{ start: '07:00', end: '11:00' }, { start: '16:00', end: '21:00' }],
  tue: [{ start: '07:00', end: '11:00' }, { start: '16:00', end: '21:00' }],
  wed: [{ start: '16:00', end: '21:00' }],
  thu: [{ start: '07:00', end: '11:00' }, { start: '16:00', end: '21:00' }],
  fri: [{ start: '07:00', end: '11:00' }],
  sat: [{ start: '08:00', end: '14:00' }],
};

const coaches = [
  {
    email: 'coach.zara.lhe@feera.ai',
    displayName: 'Zara Khan',
    locale: 'en',
    country: 'PK',
    city: 'Lahore',
    clubSlug: 'lahore-padel-club',
    bio: 'Twelve years coaching mixed-level players in Lahore. I focus on footwork, smashing technique, and tournament prep for ambitious club players.',
    languages: ['English', 'Urdu', 'Punjabi'],
    specialties: ['Beginner technique', 'Tournament prep', 'Junior development'],
    certifications: [
      { title: 'WPT Level 2 Coach', issuer: 'World Padel Tour Academy', year: 2022 },
    ],
    yearsExperience: 12,
    hourlyRate: 3500,
    hourlyRateMax: 5000,
    currency: 'PKR',
    introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    responseTime: 6,
    rating: 4.7,
    ratingCount: 34,
  },
  {
    email: 'coach.farhan.khi@feera.ai',
    displayName: 'Farhan Ali',
    locale: 'en',
    country: 'PK',
    city: 'Karachi',
    clubSlug: 'karachi-padel-centre',
    bio: 'Ex-national tennis player turned padel obsessive. I teach the racket-skills crossover and build steady, defensive baselines for amateurs moving from tennis.',
    languages: ['English', 'Urdu'],
    specialties: ['Tennis crossover', 'Defensive play', 'Beginner technique'],
    certifications: [
      { title: 'FIP Level 1', issuer: 'International Padel Federation', year: 2023 },
    ],
    yearsExperience: 8,
    hourlyRate: 3000,
    hourlyRateMax: null,
    currency: 'PKR',
    introVideoUrl: null,
    responseTime: 12,
    rating: 4.5,
    ratingCount: 21,
  },
  {
    email: 'coach.amna.isb@feera.ai',
    displayName: 'Amna Iqbal',
    locale: 'en',
    country: 'PK',
    city: 'Islamabad',
    clubSlug: 'islamabad-padel-house',
    bio: 'Women-only coaching specialist. I run morning clinics for beginners and structured progressions for intermediate women players ready for mixed competition.',
    languages: ['English', 'Urdu'],
    specialties: ['Women only coaching', 'Beginner technique', 'Group clinics'],
    certifications: [
      { title: 'WPT Level 1 Coach', issuer: 'World Padel Tour Academy', year: 2024 },
    ],
    yearsExperience: 5,
    hourlyRate: 2500,
    hourlyRateMax: 3500,
    currency: 'PKR',
    introVideoUrl: null,
    responseTime: 4,
    rating: 4.9,
    ratingCount: 18,
  },
  {
    email: 'coach.diego.dxb@feera.ai',
    displayName: 'Diego Martinez',
    locale: 'en',
    country: 'AE',
    city: 'Dubai',
    clubSlug: 'dubai-padel-plaza',
    bio: 'Spanish PPA-certified coach based in Al Quoz. Twenty years on professional courts. I coach competitive doubles, smash and bandeja, and pre-tournament tapering.',
    languages: ['English', 'Spanish', 'Portuguese'],
    specialties: ['Tournament prep', 'Doubles strategy', 'Advanced technique'],
    certifications: [
      { title: 'PPA Master Coach', issuer: 'Professional Padel Association', year: 2018 },
      { title: 'FIP Level 3', issuer: 'International Padel Federation', year: 2021 },
    ],
    yearsExperience: 20,
    hourlyRate: 350,
    hourlyRateMax: 500,
    currency: 'AED',
    introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    responseTime: 2,
    rating: 4.8,
    ratingCount: 47,
  },
];

async function main() {
  for (const c of coaches) {
    console.log(`==> coach ${c.email}`);
    // 1. Ensure user.
    const [user] = await sql`
      insert into users (email, display_name, locale, country_code, city, is_verified_coach)
      values (${c.email}, ${c.displayName}, ${c.locale}, ${c.country}, ${c.city}, true)
      on conflict (email) do update set
        display_name = excluded.display_name,
        country_code = excluded.country_code,
        city = excluded.city,
        is_verified_coach = true
      returning id
    `;

    // 2. Resolve club id by slug.
    const [club] = await sql`
      select id from clubs where slug = ${c.clubSlug} limit 1
    `;

    // 3. Upsert coach row.
    const existing = await sql`
      select id from coaches where user_id = ${user.id} limit 1
    `;
    if (existing.length === 0) {
      await sql`
        insert into coaches (
          user_id, primary_club_id, bio, languages, specialties,
          certifications, years_experience, hourly_rate, hourly_rate_max,
          currency, weekly_availability, intro_video_url,
          response_time_avg_hours, is_edition_endorsed, accepts_women_only,
          accepts_juniors, is_accepting_bookings, is_verified_by_feera,
          average_rating, rating_count
        )
        values (
          ${user.id}, ${club?.id ?? null}, ${c.bio},
          ${sql.json(c.languages)}, ${sql.json(c.specialties)},
          ${sql.json(c.certifications)}, ${c.yearsExperience},
          ${c.hourlyRate}, ${c.hourlyRateMax},
          ${c.currency}, ${sql.json(baseWeekly)}, ${c.introVideoUrl},
          ${c.responseTime}, false, true,
          true, true, true,
          ${c.rating}, ${c.ratingCount}
        )
      `;
      console.log(`   inserted coach row for ${c.displayName}`);
    } else {
      await sql`
        update coaches set
          primary_club_id = ${club?.id ?? null},
          bio = ${c.bio},
          languages = ${sql.json(c.languages)},
          specialties = ${sql.json(c.specialties)},
          certifications = ${sql.json(c.certifications)},
          years_experience = ${c.yearsExperience},
          hourly_rate = ${c.hourlyRate},
          hourly_rate_max = ${c.hourlyRateMax},
          currency = ${c.currency},
          weekly_availability = ${sql.json(baseWeekly)},
          intro_video_url = ${c.introVideoUrl},
          response_time_avg_hours = ${c.responseTime},
          is_verified_by_feera = true,
          average_rating = ${c.rating},
          rating_count = ${c.ratingCount}
        where user_id = ${user.id}
      `;
      console.log(`   refreshed coach row for ${c.displayName}`);
    }
  }

  const counts = await sql`
    select
      (select count(*)::int from coaches) as coaches,
      (select count(*)::int from coaches where is_verified_by_feera) as verified
  `;
  console.log(
    `==> seeded: ${counts[0].coaches} coaches total, ${counts[0].verified} verified.`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
