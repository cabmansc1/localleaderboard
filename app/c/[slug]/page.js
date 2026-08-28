'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard, Row } from '@/components/board';
import { slug, byBoosts, MIN_BOOSTS_FOR_CROWN } from '@/lib/config';

export default function Category() {
  const params = useParams();
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();

  // The crown here is won on boosts, so the list is ordered by boosts —
  // otherwise the business at the top would not be the one wearing it.
  const inCategory = useMemo(
    () => ranked.filter((l) => slug(l.category) === params.slug).sort(byBoosts),
    [ranked, params.slug]
  );
  const label = inCategory[0]?.category || String(params.slug).replace(/-/g, ' ');
  const crown = inCategory[0]?.boost_count >= MIN_BOOSTS_FOR_CROWN ? inCategory[0] : null;

  return (
    <Shell onEnter={m.openEntry}>
      <div className="page">
        <Link href="/" className="back">← Back to the board</Link>
        <h1 style={{ textTransform: 'capitalize' }}>{label}</h1>
        <p>
          {!inCategory.length
            ? 'Nobody has claimed this category yet.'
            : crown
              ? `${inCategory.length} ${inCategory.length === 1 ? 'business' : 'businesses'} competing. ${crown.name} holds the crown on ${crown.boost_count} customer ${crown.boost_count === 1 ? 'boost' : 'boosts'}.`
              : `${inCategory.length} ${inCategory.length === 1 ? 'business' : 'businesses'} listed, none boosted yet. The first boost takes the crown.`}
        </p>

        {loading && <div className="loading">LOADING…</div>}
        {error && <div className="errbox">Could not load the board: {error}</div>}

        <div className="board" style={{ marginTop: 32 }}>
          {inCategory.map((l, i) => (
            <Row key={l.id} listing={l} rank={i} onBoost={m.openBoost} />
          ))}
          {!inCategory.length && !loading && (
            <div className="empty">That crown is open. Bid yourself in and take it.</div>
          )}
        </div>
      </div>

      <BidModal mode={m.mode} target={m.targetItem} king={crown} onClose={m.close} />
    </Shell>
  );
}
