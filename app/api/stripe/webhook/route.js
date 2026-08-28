import { getStripe } from '@/lib/stripe';
import { createListing, addBoost, migrate } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe calls this. Nobody else's word is taken for it: the raw body is
 * verified against the signing secret before anything is read out of it.
 *
 * Both handlers are idempotent, so Stripe redelivering an event — which it
 * will — cannot double-charge the board.
 */
export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    return Response.json({ ok: false, error: 'Payments are not configured.' }, { status: 503 });
  }

  // Must be the raw body, byte for byte, or the signature will not verify.
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('[webhook] bad signature:', err.message);
    return Response.json({ ok: false, error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;

  // Only a session that is actually paid may move the board.
  if (session.payment_status !== 'paid') {
    return Response.json({ ok: true, ignored: 'unpaid' });
  }

  const m = session.metadata || {};
  const amount = Number(m.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('[webhook] bad amount in metadata', m);
    return Response.json({ ok: false, error: 'Bad metadata.' }, { status: 400 });
  }

  try {
    await migrate();

    if (m.mode === 'entry') {
      const res = await createListing({
        name: m.name, category: m.category, town: m.town,
        contact_email: m.contact_email || '', phone: m.phone || '',
        amount, stripe_session: session.id
      });
      console.log(`[webhook] entry ${res.listing_id}${res.duplicate ? ' (duplicate)' : ''}`);
      return Response.json({ ok: true, ...res });
    }

    if (m.mode === 'boost') {
      const res = await addBoost({
        listing_id: m.listing_id, amount,
        booster_name: m.booster_name || '', booster_email: m.booster_email || '',
        stripe_session: session.id
      });
      console.log(`[webhook] boost ${m.listing_id}${res.duplicate ? ' (duplicate)' : ''}`);
      return Response.json({ ok: true, ...res });
    }

    return Response.json({ ok: false, error: 'Unknown mode.' }, { status: 400 });
  } catch (err) {
    console.error('[webhook]', err);
    // A 500 tells Stripe to retry, which is what we want for a transient
    // database problem — the handlers are idempotent, so a retry is safe.
    return Response.json({ ok: false, error: 'Could not record the bid.' }, { status: 500 });
  }
}
