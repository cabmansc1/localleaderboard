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
| `app/api/board/route.js` | Server-side read of the Google Sheet |
| `components/board.js` | `useBoard`, `useBidModal`, `BidModal`, `Row` |
| `components/Shell.js` | Header and footer |
| `lib/config.js` | Rules, towns, categories, helpers, copy |
| `apps-script/Code.gs` | Google Sheets backend (Apps Script web app) |

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in SHEETS_URL
npm run dev
```

The board is read through `/api/board`, which calls `SHEETS_URL` server side.
That keeps the Apps Script URL out of the browser and avoids CORS on the
`script.google.com` redirect. Without `SHEETS_URL` set, the site still builds
and runs — it just shows the "could not load the board" notice.

## How it works

- A business bids itself onto the board, minimum `$10`. That bid is the opt-in —
  nothing is printed on the card without it.
- Once listed, anyone can boost that business, minimum `$2`.
- Rank is by total raised: the business's own bid plus all customer boosts.

Full rules live in `RULES_LIST` in `lib/config.js`.

## Backend setup

1. Create a Google Sheet, then open **Extensions → Apps Script**.
2. Paste in `apps-script/Code.gs`.
3. Set `SECRET` to a long random string.
4. Run `setupSheets()` once — it builds the `Listings` and `Bids` tabs.
5. **Deploy → New deployment → Web app**, execute as *me*, access *anyone*.
6. Copy the `/exec` URL and the secret into your environment (see `.env.example`).

Writes are only ever made by the Stripe webhook, never the browser, and are
guarded by a shared secret plus a script lock. Stripe session IDs are recorded
so duplicate webhook deliveries are ignored.

## Deploying

Deployed on Railway from this repo. Railway builds with Nixpacks
(`npm run build`, then `npm start`), and `npm start` binds `$PORT`, which
Railway sets. The one variable you must set is `SHEETS_URL`.

## Not wired up yet

**Payments.** The bid modal validates and collects everything needed for an
entry or a boost, but nothing is charged — submitting shows a confirmation
that says so explicitly. To go live you need a Stripe Checkout session route
and a webhook that POSTs `action: 'entry'` or `action: 'boost'` to the Apps
Script `doPost` with the shared secret. `Code.gs` is already built for this:
it validates the secret, serializes writes with a script lock, and ignores
duplicate Stripe session IDs.

**Not yet built:** the random hourly spotlight, the underdog list, and the
dethroned email alerts described in `MECHANISMS`.
