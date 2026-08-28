import { getStripe, validateBid } from '@/lib/stripe';
import { getListing, migrate } from '@/lib/db';
import { money } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Prefer the origin the request actually came from; fall back to Railway's domain. */
function baseUrl(req) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const host = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (host) return `https://${host}`;
  return 'http://localhost:3000';
}

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { ok: false, error: 'Payments are not configured yet.' },
        { status: 503 }
      );
    }

    await migrate();

    const check = validateBid(await req.json());
    if (!check.ok) return Response.json({ ok: false, error: check.error }, { status: 400 });
    const bid = check.value;

    // A boost may only ever point at a business that has already bid itself
    // on. Checked here so we never take money for a listing that cannot exist.
    let listing = null;
    if (bid.mode === 'boost') {
      listing = await getListing(bid.listing_id);
      if (!listing) {
        return Response.json(
          { ok: false, error: 'That business is not on the board.' },
          { status: 404 }
        );
      }
    }

    const isEntry = bid.mode === 'entry';
    const base = baseUrl(req);

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      // Metadata is the only thing the webhook trusts. For an entry the
      // listing does not exist yet, so everything needed to create it rides
      // along here and is written only once payment actually succeeds.
      metadata: isEntry
        ? {
            mode: 'entry', amount: String(bid.amount), name: bid.name,
            category: bid.category, town: bid.town,
            contact_email: bid.contact_email, phone: bid.phone
          }
        : {
            mode: 'boost', amount: String(bid.amount), listing_id: bid.listing_id,
            booster_name: bid.booster_name, booster_email: bid.booster_email
          },
      customer_email: (isEntry ? bid.contact_email : bid.booster_email) || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: bid.amount * 100,
            product_data: {
              name: isEntry
                ? `Board entry — ${bid.name}`
                : `Boost — ${listing.name}`,
              description: isEntry
                ? `${money(bid.amount)} entry bid for ${bid.name} (${bid.category}, ${bid.town}).`
                : `${money(bid.amount)} customer boost for ${listing.name}.`
            }
          }
        }
      ],
      success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?bid=cancelled`
    });

    return Response.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[checkout]', err);
    return Response.json({ ok: false, error: 'Could not start checkout.' }, { status: 500 });
  }
}
