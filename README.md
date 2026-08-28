# Local Top Spot

A pay-to-rank leaderboard for Charleston-area local businesses. Businesses bid
themselves onto the board; their customers boost them. The top spot wins the
featured panel on next month's printed 9x12 card.

## Layout

| Path | What it is |
| --- | --- |
| `app/page.js` | The public board |
| `app/b/[id]/page.js` | One business's listing |
| `app/c/[slug]/page.js` | A single category board |
| `app/how-it-works/page.js` | The six mechanisms |
| `app/rules/page.js` | The rules |
| `app/api/board/route.js` | Reads the board out of Postgres |
| `lib/db.js` | Connection pool, migrations, and every query |
| `db/schema.sql` | The schema. Applied automatically on first request. |
| `scripts/seed.js` | Sample businesses, so the board is not empty |
| `components/board.js` | `useBoard`, `useBidModal`, `BidModal`, `Row` |
| `components/Shell.js` | Header and footer |
| `lib/config.js` | Rules, towns, categories, helpers, copy |
| `apps-script/Code.gs` | The old Google Sheets backend. No longer used — see below. |

## How it works

- A business bids itself onto the board, minimum `$10`. That bid is the opt-in —
  nothing is printed on the card without it.
- Once listed, anyone can boost that business, minimum `$2`.
- Rank is by total raised: the business's own bid plus all customer boosts.

Full rules live in `RULES_LIST` in `lib/config.js`.

## Running locally

```bash
npm install
export DATABASE_URL=postgresql://localhost:5432/localtopspot
npm run seed     # optional: sample businesses
npm run dev
```

`DATABASE_URL` is the only variable the app needs. The schema applies itself on
the first request, so there is no separate migration step.

### Seeding

```bash
npm run seed            # add the sample businesses (skips ones already listed)
npm run seed -- --wipe  # clear the board first
```

## The data model

Money is stored as **whole cents** (`BIGINT`) and converted to dollars at the
API boundary, which is what `lib/config.js` and the UI have always spoken. No
floats touch a monetary value.

Two things are worth knowing about `lib/db.js`:

**A boost is a single atomic statement.** The bid insert and the running
totals on the listing move together in one `WITH ins AS (INSERT ...) UPDATE`.
There is no read-modify-write, so no lock is needed and concurrent boosts
cannot lose each other. Verified with 50 simultaneous boosts.

**Duplicate Stripe deliveries are handled by a unique index**, not a scan.
`bids.stripe_session` is `UNIQUE`; a redelivered webhook conflicts, updates
nothing, and reports itself as a duplicate.

## Deploying

Deployed on Railway. Two services: `web` (this repo, built by Nixpacks —
`npm run build`, then `npm start`, which binds `$PORT`) and `Postgres`, with a
persistent volume at `/var/lib/postgresql/data`. `web` reaches the database
over Railway's private network via `DATABASE_URL`.

To inspect or hand-edit data, use the Postgres service's data tab in the
Railway dashboard, or connect with `psql` using the same connection string.

## Why not Google Sheets

`apps-script/Code.gs` was the original backend and still works, but it is no
longer wired up. It had three problems Postgres removes outright:

- `addBoost_` read every row, computed the new total in JavaScript, then wrote
  it back — a read-modify-write race, papered over by a `LockService` lock that
  serialized every write in the app for up to 20 seconds.
- `findBySession_` scanned the entire Bids sheet on every write just to catch
  duplicate Stripe deliveries, getting linearly slower forever.
- Apps Script has daily quotas and multi-second cold starts.

The file is kept for reference. Nothing imports it.

## Not wired up yet

**Payments.** The bid modal validates and collects everything needed for an
entry or a boost, but nothing is charged — submitting shows a confirmation
that says so explicitly. To go live you need a Stripe Checkout session route
and a webhook that calls `createListing()` or `addBoost()` from `lib/db.js`,
passing the Stripe session id. Both functions already take `stripe_session`
and are idempotent, so the webhook can be redelivered safely.

**Not yet built:** the random hourly spotlight, the underdog list, and the
dethroned email alerts described in `MECHANISMS`.
