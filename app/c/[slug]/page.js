'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard, Row } from '@/components/board';
import { slug } from '@/lib/config';

export default function Category() {
  const params = useParams();
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();

  const inCategory = ranked.filter((l) => slug(l.category) === params.slug);
  const label = inCategory[0]?.category || String(params.slug).replace(/-/g, ' ');

  return (
    <Shell onEnter={m.openEntry}>
      <div className="page">
        <Link href="/" className="back">← Back to the board</Link>
        <h1 style={{ textTransform: 'capitalize' }}>{label}</h1>
        <p>
          {inCategory.length
            ? `${inCategory.length} ${inCategory.length === 1 ? 'business' : 'businesses'} competing. Top of this list is the King of ${label}.`
            : 'Nobody has claimed this category yet.'}
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

      <BidModal mode={m.mode} target={m.targetItem} king={inCategory[0]} onClose={m.close} />
    </Shell>
  );
}
