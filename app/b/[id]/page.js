'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard } from '@/components/board';
import { total, money, slug } from '@/lib/config';

export default function Listing() {
  const { id } = useParams();
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();

  const idx = ranked.findIndex((l) => String(l.id) === String(id));
  const listing = idx > -1 ? ranked[idx] : null;
  const king = ranked[0];

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
                <div className="n">{idx === 0 ? 'STATUS' : 'GAP TO THE CROWN'}</div>
                <div className="t">{idx === 0 ? '👑 King' : money(total(king) - total(listing))}</div>
                <div className="d">{idx === 0 ? `Top of ${listing.category} and the board overall.` : `Behind ${king?.name}.`}</div>
              </div>
            </div>

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
