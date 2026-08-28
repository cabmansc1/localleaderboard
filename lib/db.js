import { Pool } from 'pg';
import { shortName } from './config.js';
import { readFile } from 'fs/promises';
import path from 'path';

// Money lives in the database as whole cents and crosses the API boundary as
// dollars, because that is what lib/config.js and the UI have always spoken.
const toDollars = (cents) => Number(cents || 0) / 100;
export const toCents = (dollars) => Math.round(Number(dollars || 0) * 100);

let pool;
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

let migrated;
/** Applies db/schema.sql. Idempotent, and only ever runs once per process. */
export function migrate() {
  if (!migrated) {
    migrated = (async () => {
      const sql = await readFile(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
      await getPool().query(sql);
    })().catch((err) => { migrated = undefined; throw err; });
  }
  return migrated;
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

export async function getBoard() {
  const { rows } = await getPool().query(
    `SELECT id, name, category, town, self_bid, boost_total, boost_count, created_at
       FROM listings
      WHERE status = 'live'
      ORDER BY (self_bid + boost_total) DESC, created_at ASC`
  );
  return rows.map((r) => ({
    ...r,
    self_bid: toDollars(r.self_bid),
    boost_total: toDollars(r.boost_total),
    boost_count: Number(r.boost_count),
    created_at: r.created_at.toISOString()
  }));
}

export async function getListing(id) {
  const { rows } = await getPool().query(
    `SELECT id, name, category, town, self_bid, boost_total, boost_count, status
       FROM listings WHERE id = $1 AND status = 'live'`,
    [id]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    ...r,
    self_bid: toDollars(r.self_bid),
    boost_total: toDollars(r.boost_total),
    boost_count: Number(r.boost_count)
  };
}

/**
 * Newest bids first, for the live feed.
 *
 * Emails are never selected, and the name is shortened here rather than in
 * the browser so a full surname never leaves the server in the first place.
 */
export async function getActivity(limit = 12) {
  const n = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const { rows } = await getPool().query(
    `SELECT b.type, b.amount, b.booster_name, b.created_at,
            l.id AS listing_id, l.name AS listing_name, l.category, l.town
       FROM bids b
       JOIN listings l ON l.id = b.listing_id
      WHERE l.status = 'live'
      ORDER BY b.created_at DESC
      LIMIT $1`,
    [n]
  );
  return rows.map((r) => ({
    type: r.type,
    amount: toDollars(r.amount),
    // An entry has no booster; only a boost does.
    booster: r.type === 'boost' ? shortName(r.booster_name) : null,
    listing_id: r.listing_id,
    listing_name: r.listing_name,
    category: r.category,
    town: r.town,
    created_at: r.created_at.toISOString()
  }));
}

/* ------------------------------------------------------------------ */
/* Write — ready for the Stripe webhook to call                        */
/* ------------------------------------------------------------------ */

/**
 * A business bids itself onto the board. This is the opt-in.
 * Returns { listing_id, duplicate } — duplicate when Stripe redelivered.
 */
export async function createListing({
  name, category, town, contact_email = '', phone = '', amount, stripe_session
}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    if (stripe_session) {
      const { rows } = await client.query(
        'SELECT listing_id FROM bids WHERE stripe_session = $1', [stripe_session]
      );
      if (rows.length) {
        await client.query('COMMIT');
        return { listing_id: rows[0].listing_id, duplicate: true };
      }
    }

    const cents = toCents(amount);
    const id = 'L' + Date.now() + Math.floor(Math.random() * 1000);

    await client.query(
      `INSERT INTO listings (id, name, category, town, contact_email, phone, self_bid, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'live')`,
      [id, name, category, town, contact_email, phone, cents]
    );
    await client.query(
      `INSERT INTO bids (listing_id, type, amount, stripe_session)
       VALUES ($1, 'entry', $2, $3)`,
      [id, cents, stripe_session || null]
    );

    await client.query('COMMIT');
    return { listing_id: id, duplicate: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * A customer boosts a business already on the board.
 *
 * One statement: the bid insert and the running totals move together, and a
 * redelivered Stripe session hits the unique index and updates nothing. No
 * read-modify-write, so no lock and no lost update under concurrency.
 */
export async function addBoost({
  listing_id, amount, booster_name = '', booster_email = '', stripe_session
}) {
  const { rows } = await getPool().query(
    `WITH ins AS (
       INSERT INTO bids (listing_id, type, amount, booster_name, booster_email, stripe_session)
       SELECT $1, 'boost', $2, $3, $4, $5
        WHERE EXISTS (SELECT 1 FROM listings WHERE id = $1 AND status = 'live')
       ON CONFLICT (stripe_session) DO NOTHING
       RETURNING listing_id, amount
     )
     UPDATE listings l
        SET boost_total = l.boost_total + ins.amount,
            boost_count = l.boost_count + 1
       FROM ins
      WHERE l.id = ins.listing_id
     RETURNING l.boost_total, l.boost_count`,
    [listing_id, toCents(amount), booster_name, booster_email, stripe_session || null]
  );

  if (!rows.length) {
    // Either the session was already applied, or the listing is not live.
    // Enforces the core rule: you cannot boost what has not entered.
    const { rows: exists } = await getPool().query(
      `SELECT 1 FROM listings WHERE id = $1 AND status = 'live'`, [listing_id]
    );
    if (!exists.length) throw new Error('listing not found');
    return { duplicate: true };
  }

  return {
    duplicate: false,
    boost_total: toDollars(rows[0].boost_total),
    boost_count: Number(rows[0].boost_count)
  };
}
