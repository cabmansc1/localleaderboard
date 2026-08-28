/**
 * Puts sample businesses on the board so there is something to look at
 * before payments are wired up.
 *
 *   npm run seed          add the sample businesses
 *   npm run seed -- --wipe   clear the board first
 *
 * Requires DATABASE_URL. Safe to re-run: it skips names already listed.
 */

import { getPool, migrate, createListing, addBoost } from '../lib/db.js';

const SAMPLE = [
  { name: 'Palmetto Roofing Co.',       category: 'Roofing',          town: 'Mount Pleasant',       self_bid: 250, boosts: [25, 25, 10, 10, 10, 5, 5, 5, 5, 2, 2, 2] },
  { name: 'Charleston Comfort HVAC',    category: 'HVAC',             town: 'West Ashley',          self_bid: 150, boosts: [25, 20, 10, 10, 5, 5, 2] },
  { name: 'Tide & Table',               category: 'Restaurants',      town: 'Downtown Charleston',  self_bid: 100, boosts: [] },
  { name: 'Lowcountry Pressure Kings',  category: 'Pressure Washing', town: 'Summerville',          self_bid: 50,  boosts: [10, 5, 5] },
  { name: 'Daniel Island Dental',       category: 'Dental',           town: 'Daniel Island',        self_bid: 200, boosts: [50, 25, 10, 5] },
  { name: 'Shem Creek Pools',           category: 'Pools',            town: 'Mount Pleasant',       self_bid: 75,  boosts: [10, 10, 2] },
  { name: 'Johns Island Landscaping',   category: 'Landscaping',      town: 'Johns Island',         self_bid: 40,  boosts: [5, 2] },
  { name: 'Goose Creek Auto Works',     category: 'Auto Repair',      town: 'Goose Creek',          self_bid: 60,  boosts: [15, 5, 5, 2] }
];

const pool = getPool();

if (process.argv.includes('--wipe')) {
  await migrate();
  await pool.query('TRUNCATE bids, listings RESTART IDENTITY CASCADE');
  console.log('board cleared');
}

await migrate();

const { rows: existing } = await pool.query('SELECT name FROM listings');
const have = new Set(existing.map((r) => r.name));

let added = 0;
for (const b of SAMPLE) {
  if (have.has(b.name)) { console.log(`skip   ${b.name} (already listed)`); continue; }

  const { listing_id } = await createListing({
    name: b.name, category: b.category, town: b.town,
    contact_email: 'owner@example.com', amount: b.self_bid
  });

  for (const amount of b.boosts) {
    await addBoost({ listing_id, amount, booster_name: 'A local customer' });
  }

  const raised = b.self_bid + b.boosts.reduce((s, n) => s + n, 0);
  console.log(`added  ${b.name} — $${raised} across ${b.boosts.length} boosts`);
  added++;
}

console.log(`\n${added} added, ${SAMPLE.length - added} skipped`);
await pool.end();
