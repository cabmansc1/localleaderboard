# Local Top Spot

A pay-to-rank leaderboard for Charleston-area local businesses. Businesses bid
themselves onto the board; their customers boost them. The top spot wins the
featured panel on next month's printed 9x12 card.

## Layout

| Path | What it is |
| --- | --- |
| `app/page.js` | Next.js app-router home page — the public board |
| `lib/config.js` | Rules, towns, categories, formatting helpers, copy |
| `apps-script/Code.gs` | Google Sheets backend (Apps Script web app) |

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

## Not yet in this repo

`app/page.js` imports `@/components/Shell` and `@/components/board`
(`BidModal`, `useBidModal`, `useBoard`, `Row`), which are not committed here
yet. The Next.js scaffolding (`package.json`, `next.config.js`, `jsconfig.json`
with the `@/*` path alias) is also still to be added.
