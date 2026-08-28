'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard } from '@/components/board';
import { CATEGORIES, categoryLeaders, icon, money, slug, total } from '@/lib/config';

export default function Categories() {
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();

  // Every category, always. A category with nobody in it is the easiest
  // crown on the board, which is the whole reason to show it.
  const rows = useMemo(() => {
    const crowns = categoryLeaders(ranked);
    return CATEGORIES.map((name) => ({
      name,
      king: crowns.get(name) || null,
      listed: ranked.filter((l) => l.category === name).length
    })).sort((a, b) => b.listed - a.listed || a.name.localeCompare(b.name));
  }, [ranked]);

  return (
    <Shell onEnter={m.openEntry}>
      <div className="page cats-page">
        <h1>Categories</h1>
        <p>
          Every category has a crown, won on customer boosts rather than budget.
          {' '}{rows.filter((r) => !r.king).length} of {CATEGORIES.length} are still open.
        </p>

        {loading && <div className="loading">LOADING…</div>}
        {error && <div className="errbox">Could not load the board: {error}</div>}

        <div className="cats">
          {rows.map((r) => (
            <div className="cat-card" key={r.name}>
              <Link href={`/c/${slug(r.name)}`} className="cat-card-head">
                <span className="cat-ico">{icon(r.name)}</span>
                <span className="cat-name">{r.name}</span>
              </Link>
              <div className="cat-count">
                {r.listed === 0
                  ? 'No businesses yet'
                  : `${r.listed} ${r.listed === 1 ? 'business' : 'businesses'}`}
              </div>

              {r.king ? (
                <div className="cat-king" onClick={() => m.openBoost(r.king)}>
                  <span className="king-pill">KING</span>
                  <span className="cat-king-name">{r.king.name}</span>
                  <span className="cat-king-meta">
                    {r.king.boost_count} {r.king.boost_count === 1 ? 'boost' : 'boosts'} · {money(total(r.king))}
                  </span>
                </div>
              ) : (
                <button className="cat-empty" onClick={m.openEntry}>
                  {r.listed === 0
                    ? 'No king yet. Be the first.'
                    : 'Listed but unboosted. One boost takes the crown.'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <BidModal mode={m.mode} target={m.targetItem} king={m.targetItem} onClose={m.close} />
    </Shell>
  );
}
