'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RULES, TOWNS, CATEGORIES, total, money } from '@/lib/config';

/* ------------------------------------------------------------------ */
/* useBoard — pulls the board and ranks it                             */
/* ------------------------------------------------------------------ */

export function useBoard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch('/api/board', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        if (!data.ok) throw new Error(data.error || 'Unknown error');
        setListings(data.listings);
        setError(null);
      } catch (err) {
        if (alive) setError(err.message || String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  // Rank is by total raised. Ties break toward whoever got there first.
  const ranked = useMemo(
    () =>
      [...listings].sort(
        (a, b) => total(b) - total(a) || new Date(a.created_at) - new Date(b.created_at)
      ),
    [listings]
  );

  return { ranked, loading, error };
}

/* ------------------------------------------------------------------ */
/* useBidModal — one modal, two modes                                  */
/* ------------------------------------------------------------------ */

export function useBidModal() {
  const [mode, setMode] = useState(null);       // 'entry' | 'boost' | null
  const [targetItem, setTargetItem] = useState(null);

  const openEntry = useCallback(() => { setTargetItem(null); setMode('entry'); }, []);
  const openBoost = useCallback((listing) => { setTargetItem(listing); setMode('boost'); }, []);
  const close = useCallback(() => { setMode(null); setTargetItem(null); }, []);

  // Escape closes, and the page must not scroll behind an open modal.
  useEffect(() => {
    if (!mode) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, close]);

  return { mode, targetItem, openEntry, openBoost, close };
}

/* ------------------------------------------------------------------ */
/* Row — one line of the board                                         */
/* ------------------------------------------------------------------ */

export function Row({ listing, rank, onBoost }) {
  const place = rank + 1;
  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : place === 3 ? '🥉' : null;

  return (
    <div className={`row ${place <= 3 ? 'top' : ''}`} onClick={() => onBoost(listing)}>
      <span className="row-rank">{medal || `#${place}`}</span>
      <span className="row-main">
        <span className="row-name">{listing.name}</span>
        <span className="row-meta">{listing.category} · {listing.town}</span>
      </span>
      <span className="row-nums">
        <span className="row-total">{money(total(listing))}</span>
        <span className="row-boosts">
          <span className="boosted">{listing.boost_count}</span>
          {' '}{listing.boost_count === 1 ? 'boost' : 'boosts'}
        </span>
      </span>
      <span className="row-cta">BOOST →</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BidModal — collects the bid. Payments are not wired yet.            */
/* ------------------------------------------------------------------ */

const EMPTY = {
  name: '', category: CATEGORIES[0], town: TOWNS[0],
  contact_email: '', phone: '', booster_name: '', booster_email: '', amount: ''
};

export function BidModal({ mode, target, king, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [done, setDone] = useState(false);

  const isEntry = mode === 'entry';
  const min = isEntry ? RULES.MIN_ENTRY : RULES.MIN_BOOST;

  // Fresh form every time the modal opens.
  useEffect(() => {
    if (mode) { setForm({ ...EMPTY, amount: String(min) }); setDone(false); }
  }, [mode, min]);

  if (!mode) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const amount = Number(form.amount || 0);

  const problem =
    amount < min ? `Minimum is ${money(min)}.`
    : amount > RULES.MAX_AMOUNT ? `Maximum is ${money(RULES.MAX_AMOUNT)}.`
    : isEntry && !form.name.trim() ? 'Business name is required.'
    : isEntry && !form.contact_email.trim() ? 'Contact email is required.'
    : null;

  // The gap to close if you want the crown. The king cannot dethrone itself.
  const isKing = king && target && String(king.id) === String(target.id);
  const toBeat = !isEntry && king && target && !isKing
    ? total(king) - total(target) + 1
    : null;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div className="modal-done">
            <div className="modal-done-icon">✓</div>
            <h3>Got it — but nothing has been charged.</h3>
            <p>
              Payments are not connected yet, so this bid was not taken and no listing
              was created. Wire up Stripe and this form will run a real checkout.
            </p>
            <button className="btn-gold" onClick={onClose}>CLOSE</button>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <div className="modal-eyebrow">
                {isEntry ? '🏪 GET ON THE BOARD' : '🙌 BOOST THIS BUSINESS'}
              </div>
              <h3>{isEntry ? 'Bid your business onto the board' : target?.name}</h3>
              <p className="modal-sub">
                {isEntry
                  ? `Your own bid is the opt-in. Minimum ${money(RULES.MIN_ENTRY)}. Nothing gets printed on the card without it.`
                  : `Currently ${money(total(target))} raised across ${target?.boost_count} ${target?.boost_count === 1 ? 'boost' : 'boosts'}.`}
              </p>
            </div>

            {!isEntry && isKing && (
              <div className="modal-gap">
                👑 Already the crown. Every boost widens the lead.
              </div>
            )}
            {!isEntry && toBeat > 0 && (
              <div className="modal-gap">
                {money(toBeat)} more takes the crown from <b>{king?.name}</b>
              </div>
            )}

            <div className="modal-body">
              {isEntry ? (
                <>
                  <label>Business name
                    <input value={form.name} onChange={set('name')} placeholder="Palmetto Roofing Co." />
                  </label>
                  <div className="modal-two">
                    <label>Category
                      <select value={form.category} onChange={set('category')}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                    <label>Town
                      <select value={form.town} onChange={set('town')}>
                        {TOWNS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="modal-two">
                    <label>Contact email
                      <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="you@business.com" />
                    </label>
                    <label>Phone <span className="opt">optional</span>
                      <input value={form.phone} onChange={set('phone')} placeholder="(843) 555-0100" />
                    </label>
                  </div>
                </>
              ) : (
                <div className="modal-two">
                  <label>Your name <span className="opt">optional</span>
                    <input value={form.booster_name} onChange={set('booster_name')} placeholder="A happy customer" />
                  </label>
                  <label>Your email <span className="opt">optional</span>
                    <input type="email" value={form.booster_email} onChange={set('booster_email')} placeholder="you@email.com" />
                  </label>
                </div>
              )}

              <label>Amount
                <div className="modal-amt">
                  <span>$</span>
                  <input
                    type="number" inputMode="numeric" min={min} max={RULES.MAX_AMOUNT}
                    value={form.amount} onChange={set('amount')}
                  />
                </div>
              </label>

              <div className="modal-quick">
                {(isEntry ? [10, 25, 50, 100, 250] : [2, 5, 10, 25, 50]).map((v) => (
                  <button
                    key={v}
                    className={`quick ${amount === v ? 'on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, amount: String(v) }))}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              {problem && <div className="modal-problem">{problem}</div>}

              <button className="btn-gold wide" disabled={!!problem} onClick={() => setDone(true)}>
                {isEntry ? `BID ${money(amount)} TO ENTER` : `BOOST ${money(amount)}`}
              </button>

              <p className="modal-fine">
                Payments are not connected yet — submitting will not charge you.
                Bids are final and non-refundable once Stripe is live.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
