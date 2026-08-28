import Stripe from 'stripe';
import { RULES, CATEGORIES, TOWNS } from '@/lib/config';

let stripe;
export function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

/**
 * Validates a bid server side.
 *
 * The browser picks the amount, so the browser is not trusted with it: the
 * floor, the ceiling, and the category and town allowlists are all enforced
 * here, before a Checkout session is ever created. Returns { ok, error, value }.
 */
export function validateBid(body) {
  const isEntry = body.mode === 'entry';
  if (!isEntry && body.mode !== 'boost') return { ok: false, error: 'Unknown bid type.' };

  const amount = Number(body.amount);
  const min = isEntry ? RULES.MIN_ENTRY : RULES.MIN_BOOST;

  if (!Number.isFinite(amount)) return { ok: false, error: 'Amount must be a number.' };
  if (!Number.isInteger(amount)) return { ok: false, error: 'Amount must be whole dollars.' };
  if (amount < min) return { ok: false, error: `Minimum is $${min}.` };
  if (amount > RULES.MAX_AMOUNT) return { ok: false, error: `Maximum is $${RULES.MAX_AMOUNT}.` };

  if (isEntry) {
    const name = String(body.name || '').trim();
    const email = String(body.contact_email || '').trim();

    if (!name) return { ok: false, error: 'Business name is required.' };
    if (name.length > 120) return { ok: false, error: 'Business name is too long.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'A valid contact email is required.' };
    // Category and town are printed on the card, so they may only ever be
    // values we already publish. Never a free-text string from the browser.
    if (!CATEGORIES.includes(body.category)) return { ok: false, error: 'Unknown category.' };
    if (!TOWNS.includes(body.town)) return { ok: false, error: 'Unknown town.' };

    return {
      ok: true,
      value: {
        mode: 'entry', amount, name, category: body.category, town: body.town,
        contact_email: email, phone: String(body.phone || '').trim().slice(0, 40)
      }
    };
  }

  const listing_id = String(body.listing_id || '').trim();
  if (!listing_id) return { ok: false, error: 'Which business are you boosting?' };

  const email = String(body.booster_email || '').trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'That email does not look right.' };
  }

  return {
    ok: true,
    value: {
      mode: 'boost', amount, listing_id,
      booster_name: String(body.booster_name || '').trim().slice(0, 80),
      booster_email: email
    }
  };
}
