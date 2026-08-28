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
| `app/api/checkout/route.js` | Validates a bid and opens a Stripe Checkout session |
| `app/api/stripe/webhook/route.js` | Records the bid once Stripe confirms payment |
| `app/thanks/page.js` | Where Stripe returns after a successful payment |
| `lib/stripe.js` | Stripe client and server-side bid validation |
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

### Two crowns, two games

| | Won on | What it is | Reward |
| --- | --- | --- | --- |
| **The Crown** | Total raised | An auction | The featured panel |
| **Category crown** | Customer boosts | A popularity contest | Category strip, email mention, social post, badge |

A business with budget competes for the Crown. A business with loyal regulars
competes for its category and can win it having spent almost nothing. Both have
a reason to enter.

A business with zero boosts holds no category crown no matter what it bid
(`MIN_BOOSTS_FOR_CROWN`), so a category can sit uncrowned.

The homepage lists **all** of `CATEGORIES`, not just the crowned ones. An open
crown is the most persuasive thing on the page for a business in a quiet
category, so those cards say "Crown open — one boost takes it" and link
through to the empty category board.

### Live feed

`/api/activity` returns the newest bids joined to their listings, rendered as
"Betty W. boosted Boba Fusion" on the homepage and polled every 20s.

Booster emails are never selected, and names are shortened to a first name and
an initial **in `getActivity()`**, not in the browser — so a full surname never
leaves the server. The boost form labels the name field "shown on the live
feed" and the email field "never shown", because people are typing into a
public wall and should know it.

### Badges

`/api/badge/[id]` renders a PNG for any listing — wide (1200x630) or
`?size=square` (1080x1080) — offered for download on the listing page.

Badges are worded to state exactly what they measure: "Most-Backed Roofing …
Ranked by customer boosts … 11 customers backing … AUGUST 2026". A business
posts one as advertising, so it must never imply a merit ranking the board does
not perform — never "Best" or "Voted #1". Ranking category crowns on boosts is
what makes the honest wording also the compelling one. The month is on the
badge so the claim stays true and has to be defended.

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

## Payments

Money never moves on the browser's say-so. The flow is:

1. The modal posts the bid to `/api/checkout`.
2. `validateBid()` in `lib/stripe.js` re-checks everything server side — the
   `$10` entry floor, the `$2` boost floor, the `$5000` ceiling, whole dollars
   only, and category and town against the published allowlists. A boost is
   additionally checked against a real, live listing.
3. Only then is a Stripe Checkout session created, with the bid's details in
   `metadata`. For an entry, **no listing is written yet** — it exists only
   after payment.
4. Stripe charges the customer and calls `/api/stripe/webhook`.
5. The webhook verifies the raw body against the signing secret, ignores
   anything that is not a paid `checkout.session.completed`, and calls
   `createListing()` or `addBoost()` with the Stripe session id.

Because `bids.stripe_session` is `UNIQUE`, a redelivered webhook — which
Stripe will send — updates nothing and reports itself as a duplicate. The
webhook returns 500 on a database error so Stripe retries, which is safe
precisely because the handlers are idempotent.

### Going live

Set both variables on the `web` service:

| Variable | Where it comes from |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks, after adding the endpoint |

The webhook endpoint is `https://<your-domain>/api/stripe/webhook`, subscribed
to `checkout.session.completed`.

Until both are set, `/api/checkout` returns a 503 and the modal says payments
are not configured. Nothing else on the site is affected.

Test with Stripe's test keys and card `4242 4242 4242 4242` first.

### Managed Payments

Stripe enables Managed Payments by default, which rejects a line item with no
product tax code and would add sales tax on top of the bid. The Checkout
session opts out with `managed_payments: { enabled: false }`, so a bid is
exactly what the bidder is charged: $50 bid, $50 taken, $50 credited to the
board. If sales tax should be collected, set a `tax_code` on `product_data`
instead of using that flag — choosing the code is a tax decision.


## Not yet built

The random hourly spotlight, the underdog list, and the dethroned email alerts
described in `MECHANISMS`.
