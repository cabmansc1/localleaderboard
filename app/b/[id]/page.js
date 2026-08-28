'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard } from '@/components/board';
import { total, money, slug, categoryLeaders } from '@/lib/config';

export default function Listing() {
  const { id } = useParams();
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();

  const idx = ranked.findIndex((l) => String(l.id) === String(id));
  const listing = idx > -1 ? ranked[idx] : null;
  const king = ranked[0];
  const catKing = listing ? categoryLeaders(ranked).get(listing.category) : null;
  const holdsCategory = catKing?.id === listing?.id;

  return (
    <Shell onEnter={m.openEntry}>
      <div className="page">
        <Link href="/" className="back">← Back to the board</Link>

        {loading && <div className="loading">LOADING…</div>}
        {error && <div className="errbox">Could not load the board: {error}</div>}

        {!loading && !listing && (
          <div className="empty">That listing is not on the board.</div>
        )}

        {listing && (
          <>
            <h1>{listing.name}</h1>
            <p>
              #{idx + 1} overall · {listing.category} · {listing.town}
            </p>

            <div className="prize-grid" style={{ marginTop: 32 }}>
              <div className="prize-item">
                <div className="n">TOTAL RAISED</div>
                <div className="t">{money(total(listing))}</div>
                <div className="d">{money(listing.self_bid)} own bid + {money(listing.boost_total)} from customers</div>
              </div>
              <div className="prize-item">
                <div className="n">CUSTOMER BOOSTS</div>
                <div className="t">{listing.boost_count}</div>
                <div className="d">{listing.boost_count === 0 ? 'Nobody has boosted yet. Be first.' : 'People who put money behind this business.'}</div>
              </div>
              <div className="prize-item">
                <div className="n">{listing.category.toUpperCase()} CROWN</div>
                <div className="t">
                  {holdsCategory ? 'Held' : catKing ? `${catKing.boost_count - listing.boost_count + 1} boosts away` : 'Open'}
                </div>
                <div className="d">
                  {holdsCategory
                    ? 'Most customer boosts in this category. Won on backing, not budget.'
                    : catKing
                      ? `${catKing.name} holds it on ${catKing.boost_count} ${catKing.boost_count === 1 ? 'boost' : 'boosts'}.`
                      : 'Nobody in this category has a boost yet. The first one takes the crown.'}
                </div>
              </div>
            </div>

            <section className="badge-block">
              <p className="eyebrow"><span className="tag">🏅</span> Share this</p>
              <div className="badge-row">
                <img className="badge-img" src={`/api/badge/${listing.id}`} alt={`${listing.name} badge`} />
                <div className="badge-side">
                  <h3>
                    {idx === 0 ? 'The Crown badge' : holdsCategory ? 'Most-Backed badge' : 'Listing badge'}
                  </h3>
                  <p>
                    {holdsCategory || idx === 0
                      ? 'Post it anywhere. It states exactly what it measures and carries the month, so it stays true — and has to be defended next month.'
                      : 'Take the category crown on customer boosts and this becomes a Most-Backed badge.'}
                  </p>
                  <div className="badge-links">
                    <a href={`/api/badge/${listing.id}`} download={`${slug(listing.name)}-badge.png`}>
                      <button className="btn-gold">DOWNLOAD · WIDE</button>
                    </a>
                    <a href={`/api/badge/${listing.id}?size=square`} download={`${slug(listing.name)}-badge-square.png`}>
                      <button className="btn-ghost">SQUARE</button>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <div className="king-foot">
              <p>Think this business deserves the crown?</p>
              <button className="btn-gold" onClick={() => m.openBoost(listing)}>BOOST THIS BUSINESS</button>
              <Link href={`/c/${slug(listing.category)}`}>
                <button className="btn-ghost">ALL {listing.category.toUpperCase()}</button>
              </Link>
            </div>
          </>
        )}
      </div>

      <BidModal mode={m.mode} target={m.targetItem} king={king} onClose={m.close} />
    </Shell>
  );
}
