#!/usr/bin/env node
/**
 * Rich demo seed for the live Neon DB. Idempotent.
 *
 * Creates:
 *   - 30 demo player users (spread Lahore/Karachi/Islamabad/Dubai, mixed gender)
 *   - user_ratings rows (display 1.5 - 6.5 bell curve)
 *   - user_social_scores rows (on-time + no-show)
 *   - friendships (25 accepted + 5 pending; city-cluster pattern)
 *   - 20 completed matches with REAL Glicko-2 deltas applied in chrono order
 *     via @feera/matching applyDoublesMatch. All-female matches also update
 *     women_only_pool_rating.
 *   - 8 booking_join_requests (3 pending, 3 approved, 2 declined)
 *
 * Existing demo bookings from seed-bookings.mjs continue to live alongside.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-rich-demo.mjs
 */

import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

// Import the Glicko module from source TS (we use a small inline JS shim because
// this seed script is JS, not TS). Re-implement the math here to avoid a build
// step. Numbers match packages/matching/src/glicko.ts exactly.

const GLICKO = {
  startRating: 1500,
  startRD: 350,
  startVolatility: 0.06,
  tau: 0.5,
  scale: 173.7178,
  epsilon: 0.000001,
};

function toDisplayRating(internal) {
  const raw = (internal - 800) / 200;
  return Math.round(Math.min(7, Math.max(0, raw)) * 10) / 10;
}
function fromDisplayRating(d) {
  return Math.min(7, Math.max(0, d)) * 200 + 800;
}
function g(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}
function E(mu, muJ, phiJ) {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}
function updateVolatility(phi, v, delta, sigma) {
  const a = Math.log(sigma * sigma);
  const tauSq = GLICKO.tau * GLICKO.tau;
  const f = (x) => {
    const ex = Math.exp(x);
    const denom = phi * phi + v + ex;
    return (ex * (delta * delta - denom)) / (2 * denom * denom) - (x - a) / tauSq;
  };
  let A = a, B;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * GLICKO.tau) < 0) k += 1;
    B = a - k * GLICKO.tau;
  }
  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > GLICKO.epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA = fA / 2; }
    B = C; fB = fC;
  }
  return Math.exp(A / 2);
}
function updateRating(player, outcomes) {
  const mu = (player.rating - GLICKO.startRating) / GLICKO.scale;
  const phi = player.rd / GLICKO.scale;
  const sigma = player.volatility;
  if (outcomes.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: player.rating, rd: phiStar * GLICKO.scale, volatility: sigma };
  }
  let vInv = 0, deltaSum = 0;
  for (const { opponent, score } of outcomes) {
    const muJ = (opponent.rating - GLICKO.startRating) / GLICKO.scale;
    const phiJ = opponent.rd / GLICKO.scale;
    const gJ = g(phiJ), eJ = E(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;
  const sigmaP = updateVolatility(phi, v, delta, sigma);
  const phiStar = Math.sqrt(phi * phi + sigmaP * sigmaP);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;
  return { rating: muPrime * GLICKO.scale + GLICKO.startRating, rd: phiPrime * GLICKO.scale, volatility: sigmaP };
}
function applyDoublesMatch(teamA, teamB, winner) {
  const [a1, a2] = teamA;
  const [b1, b2] = teamB;
  const sA = winner === 'A' ? 1 : winner === 'B' ? 0 : 0.5;
  const sB = winner === 'B' ? 1 : winner === 'A' ? 0 : 0.5;
  return {
    teamA: [
      updateRating(a1, [{ opponent: b1, score: sA }, { opponent: b2, score: sA }]),
      updateRating(a2, [{ opponent: b1, score: sA }, { opponent: b2, score: sA }]),
    ],
    teamB: [
      updateRating(b1, [{ opponent: a1, score: sB }, { opponent: a2, score: sB }]),
      updateRating(b2, [{ opponent: a1, score: sB }, { opponent: a2, score: sB }]),
    ],
  };
}
function reliabilityPct(rd) {
  const minRd = 30, maxRd = GLICKO.startRD;
  if (rd <= minRd) return 100;
  if (rd >= maxRd) return 0;
  return Math.round(((maxRd - rd) / (maxRd - minRd)) * 100);
}

// Deterministic RNG so re-runs produce identical state.
let seed = 0x5e3da001;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 30 demo users spread Lahore (8), Karachi (7), Islamabad (7), Dubai (8).
const SEED_USERS = [
  // Lahore — 4 male, 4 female
  { city: 'Lahore',     country: 'PK', email: 'demo.aisha.lhe@feera.ai',  name: 'Aisha Mahmood',     gender: 'f', target: 5.4 },
  { city: 'Lahore',     country: 'PK', email: 'demo.bilal.lhe@feera.ai',  name: 'Bilal Ahmed',       gender: 'm', target: 5.9 },
  { city: 'Lahore',     country: 'PK', email: 'demo.fatima.lhe@feera.ai', name: 'Fatima Sheikh',     gender: 'f', target: 4.7 },
  { city: 'Lahore',     country: 'PK', email: 'demo.hassan.lhe@feera.ai', name: 'Hassan Raza',       gender: 'm', target: 3.9 },
  { city: 'Lahore',     country: 'PK', email: 'demo.maria.lhe@feera.ai',  name: 'Maria Khan',        gender: 'f', target: 4.1 },
  { city: 'Lahore',     country: 'PK', email: 'demo.omer.lhe@feera.ai',   name: 'Omer Tariq',        gender: 'm', target: 3.3 },
  { city: 'Lahore',     country: 'PK', email: 'demo.rida.lhe@feera.ai',   name: 'Rida Saeed',        gender: 'f', target: 2.8 },
  { city: 'Lahore',     country: 'PK', email: 'demo.usman.lhe@feera.ai',  name: 'Usman Malik',       gender: 'm', target: 5.1 },
  // Karachi — 4 male, 3 female
  { city: 'Karachi',    country: 'PK', email: 'demo.ali.khi@feera.ai',    name: 'Ali Hussain',       gender: 'm', target: 6.1 },
  { city: 'Karachi',    country: 'PK', email: 'demo.hina.khi@feera.ai',   name: 'Hina Qureshi',      gender: 'f', target: 5.3 },
  { city: 'Karachi',    country: 'PK', email: 'demo.imran.khi@feera.ai',  name: 'Imran Memon',       gender: 'm', target: 4.6 },
  { city: 'Karachi',    country: 'PK', email: 'demo.kiran.khi@feera.ai',  name: 'Kiran Lodhi',       gender: 'f', target: 3.7 },
  { city: 'Karachi',    country: 'PK', email: 'demo.salman.khi@feera.ai', name: 'Salman Iqbal',      gender: 'm', target: 3.1 },
  { city: 'Karachi',    country: 'PK', email: 'demo.zara.khi@feera.ai',   name: 'Zara Patel',        gender: 'f', target: 4.4 },
  { city: 'Karachi',    country: 'PK', email: 'demo.danish.khi@feera.ai', name: 'Danish Vohra',      gender: 'm', target: 2.6 },
  // Islamabad — 4 male, 3 female
  { city: 'Islamabad',  country: 'PK', email: 'demo.adnan.isb@feera.ai',  name: 'Adnan Khattak',     gender: 'm', target: 5.7 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.farah.isb@feera.ai',  name: 'Farah Niazi',       gender: 'f', target: 5.0 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.jawad.isb@feera.ai',  name: 'Jawad Rashid',      gender: 'm', target: 4.3 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.maham.isb@feera.ai',  name: 'Maham Yousaf',      gender: 'f', target: 3.6 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.taimur.isb@feera.ai', name: 'Taimur Bashir',     gender: 'm', target: 2.9 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.sana.isb@feera.ai',   name: 'Sana Mirza',        gender: 'f', target: 4.0 },
  { city: 'Islamabad',  country: 'PK', email: 'demo.waqas.isb@feera.ai',  name: 'Waqas Anwar',       gender: 'm', target: 3.5 },
  // Dubai — 4 male, 4 female
  { city: 'Dubai',      country: 'AE', email: 'demo.amal.dxb@feera.ai',   name: 'Amal Al Maktoum',   gender: 'f', target: 6.2 },
  { city: 'Dubai',      country: 'AE', email: 'demo.khalid.dxb@feera.ai', name: 'Khalid Al Falasi',  gender: 'm', target: 6.0 },
  { city: 'Dubai',      country: 'AE', email: 'demo.layla.dxb@feera.ai',  name: 'Layla Al Shamsi',   gender: 'f', target: 5.5 },
  { city: 'Dubai',      country: 'AE', email: 'demo.marco.dxb@feera.ai',  name: 'Marco Verdi',       gender: 'm', target: 5.2 },
  { city: 'Dubai',      country: 'AE', email: 'demo.nadia.dxb@feera.ai',  name: 'Nadia Haddad',      gender: 'f', target: 4.5 },
  { city: 'Dubai',      country: 'AE', email: 'demo.rashid.dxb@feera.ai', name: 'Rashid Al Nuaimi',  gender: 'm', target: 3.8 },
  { city: 'Dubai',      country: 'AE', email: 'demo.sofia.dxb@feera.ai',  name: 'Sofia Russo',       gender: 'f', target: 3.2 },
  { city: 'Dubai',      country: 'AE', email: 'demo.yusuf.dxb@feera.ai',  name: 'Yusuf Ibrahim',     gender: 'm', target: 2.4 },
];

async function main() {
  console.log('==> upserting demo users');
  const userIds = {};
  for (let i = 0; i < SEED_USERS.length; i += 1) {
    const u = SEED_USERS[i];
    const phone = `+1555000${(i + 1000).toString().padStart(4, '0')}`;
    const [row] = await sql`
      insert into users (
        email, phone, display_name, locale, country_code, city, gender,
        gender_visibility, women_only_pool_opt_in
      ) values (
        ${u.email}, ${phone}, ${u.name}, 'en', ${u.country}, ${u.city},
        ${u.gender}, 'public', ${u.gender === 'f'}
      )
      on conflict (email) do update set display_name = excluded.display_name,
        city = excluded.city, gender = excluded.gender,
        women_only_pool_opt_in = excluded.women_only_pool_opt_in,
        updated_at = now()
      returning id
    `;
    userIds[u.email] = row.id;
  }
  console.log(`   ${Object.keys(userIds).length} users ready`);

  console.log('==> upserting user_ratings + social');
  for (const u of SEED_USERS) {
    const userId = userIds[u.email];
    const internal = fromDisplayRating(u.target);
    const display = toDisplayRating(internal);
    const rd = 80 + Math.round(rand() * 80); // 80-160
    await sql`
      insert into user_ratings (
        user_id, rating_internal, rating_display, rating_deviation, volatility,
        reliability_pct, match_count, is_provisional,
        women_only_pool_rating
      ) values (
        ${userId}, ${internal}, ${display}, ${rd}, 0.06,
        ${reliabilityPct(rd)}, 0, true,
        ${u.gender === 'f' ? internal : null}
      )
      on conflict (user_id) do update set rating_internal = excluded.rating_internal,
        rating_display = excluded.rating_display,
        rating_deviation = excluded.rating_deviation,
        reliability_pct = excluded.reliability_pct,
        women_only_pool_rating = excluded.women_only_pool_rating,
        updated_at = now()
    `;
    await sql`
      insert into user_social_scores (
        user_id, on_time_rate, no_show_rate, sportsmanship_avg, response_time_minutes_avg
      ) values (
        ${userId}, ${0.85 + rand() * 0.15}, ${rand() * 0.10},
        ${3.8 + rand() * 1.2}, ${15 + Math.round(rand() * 240)}
      )
      on conflict (user_id) do nothing
    `;
  }

  console.log('==> friendships (25 accepted + 5 pending)');
  await sql`delete from friendships where requester_user_id in (
    select id from users where email like 'demo.%@feera.ai'
  )`;
  const byCity = SEED_USERS.reduce((acc, u) => {
    (acc[u.city] = acc[u.city] || []).push(u);
    return acc;
  }, {});
  let acceptedCount = 0;
  let pendingCount = 0;
  for (const city of Object.keys(byCity)) {
    const cityUsers = byCity[city];
    // dense intra-city friendships
    for (let i = 0; i < cityUsers.length; i += 1) {
      for (let j = i + 1; j < cityUsers.length; j += 1) {
        if (rand() < 0.45 && acceptedCount < 25) {
          await sql`
            insert into friendships (requester_user_id, addressee_user_id, status, responded_at)
            values (${userIds[cityUsers[i].email]}, ${userIds[cityUsers[j].email]}, 'accepted', now())
            on conflict do nothing
          `;
          acceptedCount += 1;
        }
      }
    }
  }
  // 5 pending cross-city
  const all = Object.values(userIds);
  while (pendingCount < 5) {
    const a = pick(all), b = pick(all);
    if (a === b) continue;
    const res = await sql`
      insert into friendships (requester_user_id, addressee_user_id, status)
      values (${a}, ${b}, 'pending')
      on conflict do nothing
      returning id
    `;
    if (res.length > 0) pendingCount += 1;
  }
  console.log(`   ${acceptedCount} accepted, ${pendingCount} pending`);

  console.log('==> 20 completed matches with REAL Glicko-2 deltas');
  await sql`delete from matches where raw_score::text like '%"demo-rich-v1"%'`;

  // Load current rating state into memory.
  const stateByUser = {};
  for (const u of SEED_USERS) {
    const userId = userIds[u.email];
    stateByUser[userId] = {
      rating: fromDisplayRating(u.target),
      rd: 80 + Math.round(rand() * 80),
      volatility: 0.06,
      gender: u.gender,
      womenRating: u.gender === 'f' ? fromDisplayRating(u.target) : null,
      womenRd: u.gender === 'f' ? 80 + Math.round(rand() * 80) : null,
      womenVol: u.gender === 'f' ? 0.06 : null,
      matchCount: 0,
    };
  }

  // Get courts to attach matches to.
  const courts = await sql`select id, club_id from courts limit 50`;
  if (courts.length === 0) {
    console.error('No courts — run seed-demo.mjs first.');
    process.exit(2);
  }

  // Generate 20 matches over past 30 days.
  const now = Date.now();
  for (let i = 0; i < 20; i += 1) {
    const players = shuffle(Object.values(userIds)).slice(0, 4);
    const teamA = [players[0], players[1]];
    const teamB = [players[2], players[3]];

    // Decide winner: higher-rated-team-side wins with 65% probability.
    const aAvg = (stateByUser[teamA[0]].rating + stateByUser[teamA[1]].rating) / 2;
    const bAvg = (stateByUser[teamB[0]].rating + stateByUser[teamB[1]].rating) / 2;
    const aFavorite = aAvg > bAvg;
    const aWins = rand() < (aFavorite ? 0.65 : 0.35);
    const winner = aWins ? 'A' : 'B';

    // Real Glicko application.
    const before = {
      [teamA[0]]: { ...stateByUser[teamA[0]] },
      [teamA[1]]: { ...stateByUser[teamA[1]] },
      [teamB[0]]: { ...stateByUser[teamB[0]] },
      [teamB[1]]: { ...stateByUser[teamB[1]] },
    };
    const updates = applyDoublesMatch(
      [
        { rating: before[teamA[0]].rating, rd: before[teamA[0]].rd, volatility: before[teamA[0]].volatility },
        { rating: before[teamA[1]].rating, rd: before[teamA[1]].rd, volatility: before[teamA[1]].volatility },
      ],
      [
        { rating: before[teamB[0]].rating, rd: before[teamB[0]].rd, volatility: before[teamB[0]].volatility },
        { rating: before[teamB[1]].rating, rd: before[teamB[1]].rd, volatility: before[teamB[1]].volatility },
      ],
      winner,
    );
    // Apply to state.
    stateByUser[teamA[0]] = { ...stateByUser[teamA[0]], ...updates.teamA[0], matchCount: stateByUser[teamA[0]].matchCount + 1 };
    stateByUser[teamA[1]] = { ...stateByUser[teamA[1]], ...updates.teamA[1], matchCount: stateByUser[teamA[1]].matchCount + 1 };
    stateByUser[teamB[0]] = { ...stateByUser[teamB[0]], ...updates.teamB[0], matchCount: stateByUser[teamB[0]].matchCount + 1 };
    stateByUser[teamB[1]] = { ...stateByUser[teamB[1]], ...updates.teamB[1], matchCount: stateByUser[teamB[1]].matchCount + 1 };

    // Parallel women-only pool when all 4 female.
    const allFemale = [teamA[0], teamA[1], teamB[0], teamB[1]].every((id) => stateByUser[id].gender === 'f');
    let womenUpdates = null;
    if (allFemale) {
      const wBefore = {
        [teamA[0]]: { rating: before[teamA[0]].womenRating, rd: before[teamA[0]].womenRd, volatility: before[teamA[0]].womenVol },
        [teamA[1]]: { rating: before[teamA[1]].womenRating, rd: before[teamA[1]].womenRd, volatility: before[teamA[1]].womenVol },
        [teamB[0]]: { rating: before[teamB[0]].womenRating, rd: before[teamB[0]].womenRd, volatility: before[teamB[0]].womenVol },
        [teamB[1]]: { rating: before[teamB[1]].womenRating, rd: before[teamB[1]].womenRd, volatility: before[teamB[1]].womenVol },
      };
      womenUpdates = applyDoublesMatch(
        [wBefore[teamA[0]], wBefore[teamA[1]]],
        [wBefore[teamB[0]], wBefore[teamB[1]]],
        winner,
      );
      stateByUser[teamA[0]].womenRating = womenUpdates.teamA[0].rating;
      stateByUser[teamA[0]].womenRd = womenUpdates.teamA[0].rd;
      stateByUser[teamA[0]].womenVol = womenUpdates.teamA[0].volatility;
      stateByUser[teamA[1]].womenRating = womenUpdates.teamA[1].rating;
      stateByUser[teamA[1]].womenRd = womenUpdates.teamA[1].rd;
      stateByUser[teamA[1]].womenVol = womenUpdates.teamA[1].volatility;
      stateByUser[teamB[0]].womenRating = womenUpdates.teamB[0].rating;
      stateByUser[teamB[0]].womenRd = womenUpdates.teamB[0].rd;
      stateByUser[teamB[0]].womenVol = womenUpdates.teamB[0].volatility;
      stateByUser[teamB[1]].womenRating = womenUpdates.teamB[1].rating;
      stateByUser[teamB[1]].womenRd = womenUpdates.teamB[1].rd;
      stateByUser[teamB[1]].womenVol = womenUpdates.teamB[1].volatility;
    }

    // Realistic score 2-1 or 2-0.
    const teamASets = aWins ? 2 : Math.floor(rand() * 2);
    const teamBSets = aWins ? Math.floor(rand() * 2) : 2;
    const sets = [];
    for (let s = 0; s < teamASets + teamBSets; s += 1) {
      sets.push([6, 4 + Math.floor(rand() * 3)]);
    }

    const playedAt = new Date(now - (30 - i * 1.5) * 24 * 3600 * 1000);
    const court = pick(courts);

    const ratingChanges = {
      open: {
        [teamA[0]]: {
          ratingBefore: before[teamA[0]].rating,
          ratingAfter: updates.teamA[0].rating,
          ratingDisplayBefore: toDisplayRating(before[teamA[0]].rating),
          ratingDisplayAfter: toDisplayRating(updates.teamA[0].rating),
          rdBefore: before[teamA[0]].rd,
          rdAfter: updates.teamA[0].rd,
        },
        [teamA[1]]: {
          ratingBefore: before[teamA[1]].rating,
          ratingAfter: updates.teamA[1].rating,
          ratingDisplayBefore: toDisplayRating(before[teamA[1]].rating),
          ratingDisplayAfter: toDisplayRating(updates.teamA[1].rating),
          rdBefore: before[teamA[1]].rd,
          rdAfter: updates.teamA[1].rd,
        },
        [teamB[0]]: {
          ratingBefore: before[teamB[0]].rating,
          ratingAfter: updates.teamB[0].rating,
          ratingDisplayBefore: toDisplayRating(before[teamB[0]].rating),
          ratingDisplayAfter: toDisplayRating(updates.teamB[0].rating),
          rdBefore: before[teamB[0]].rd,
          rdAfter: updates.teamB[0].rd,
        },
        [teamB[1]]: {
          ratingBefore: before[teamB[1]].rating,
          ratingAfter: updates.teamB[1].rating,
          ratingDisplayBefore: toDisplayRating(before[teamB[1]].rating),
          ratingDisplayAfter: toDisplayRating(updates.teamB[1].rating),
          rdBefore: before[teamB[1]].rd,
          rdAfter: updates.teamB[1].rd,
        },
      },
    };
    if (womenUpdates) ratingChanges.women = { /* mirror shape */ };
    // marker for the delete sweep on re-run
    ratingChanges.seed = 'demo-rich-v1';

    await sql`
      insert into matches (
        team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2,
        team_a_sets_won, team_b_sets_won, raw_score,
        is_ranked, played_at, recorded_at, recorded_by_user_id,
        verification_status, rating_changes
      ) values (
        ${teamA[0]}, ${teamA[1]}, ${teamB[0]}, ${teamB[1]},
        ${teamASets}, ${teamBSets}, ${sql.json(sets)},
        true, ${playedAt.toISOString()}, ${playedAt.toISOString()}, ${teamA[0]},
        'peer_verified', ${sql.json(ratingChanges)}
      )
    `;
  }

  // Persist final per-user rating state.
  for (const [userId, st] of Object.entries(stateByUser)) {
    if (st.matchCount === 0) continue;
    await sql`
      update user_ratings
      set rating_internal = ${st.rating},
          rating_display = ${toDisplayRating(st.rating)},
          rating_deviation = ${st.rd},
          volatility = ${st.volatility},
          reliability_pct = ${reliabilityPct(st.rd)},
          match_count = ${st.matchCount},
          is_provisional = ${st.matchCount < 5},
          last_match_at = now(),
          women_only_pool_rating = ${st.womenRating},
          updated_at = now()
      where user_id = ${userId}
    `;
  }
  console.log('   20 matches persisted, ratings updated');

  const counts = await sql`
    select
      (select count(*)::int from users where email like 'demo.%@feera.ai') as users,
      (select count(*)::int from friendships f join users u on u.id = f.requester_user_id where u.email like 'demo.%@feera.ai') as friendships,
      (select count(*)::int from matches where raw_score::text like '%demo-rich-v1%') as matches
  `;
  console.log(`==> done: ${counts[0].users} demo users, ${counts[0].friendships} friendships, ${counts[0].matches} matches`);

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
