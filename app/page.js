'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { BidModal, useBidModal, useBoard, Row } from '@/components/board';
import { RULES, TOWNS, total, money, slug } from '@/lib/config';

export default function Home() {
  const { ranked, loading, error } = useBoard();
  const m = useBidModal();
  const [town, setTown] = useState('All towns');

  const king = ranked[0];
  const shown = useMemo(
    () => ranked.filter((l) => town === 'All towns' || l.town === town),
    [ranked, town]
  );
  const categoryKings = useMemo(() => {
    const seen = new Set();
    return ranked.filter((l) => (seen.has(l.category) ? false : (seen.add(l.category), true))).slice(0, 6);
  }, [ranked]);
  const trending = useMemo(
    () => [...ranked].sort((a, b) => b.boost_count - a.boost_count).slice(0, 5),
    [ranked]
  );

  return (
    <Shell onEnter={m.openEntry}>
      <div className="wrap">
        <div className="hero">
          <h1>WHO OWNS<br />THE <em>LOWCOUNTRY?</em></h1>
          <p>
            Charleston businesses bid themselves onto the board. Their customers boost them from
            ${RULES.MIN_BOOST}. Top spot wins the featured panel on next month card.
          </p>
          <button className="hero-input" onClick={m.openEntry}>
            <span className="hero-input-icon">🏪</span>
            <span className="hero-input-text">Your business name…</span>
            <span className="hero-input-go">GET ON THE BOARD</span>
          </button>
          <div className="ticker">
            <span>Enter from <b>${RULES.MIN_ENTRY}</b></span><span className="dot">·</span>
            <span>Boost from <b>${RULES.MIN_BOOST}</b></span><span className="dot">·</span>
            <span><b>{ranked.length}</b> businesses</span><span className="dot">·</span>
            <span><b>{ranked.reduce((s, l) => s + l.boost_count, 0)}</b> boosts</span>
          </div>
        </div>

        {error && (
          <div className="errbox">Could not load the board: {error}<br />Check SHEETS_URL in your environment variables.</div>
        )}
        {loading && <div className="loading">LOADING THE BOARD…</div>}

        {trending.length > 0 && (
          <section>
            <p className="eyebrow"><span className="tag">🔥</span> Most support right now</p>
            <div className="chips">
              {trending.map((l) => (
                <div className="chip" key={l.id} onClick={() => m.openBoost(l)}>
                  {l.name} <span>{l.boost_count} boosts</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {king && (
          <section>
            <div className="king">
              <div className="king-label">👑 THE CROWN · #1 OVERALL</div>
              <div className="king-row">
                <div>
                  <h2 className="king-name">{king.name}</h2>
                  <div className="king-meta">
                    King of {king.category} · {king.town} · {money(king.self_bid)} own bid
                  </div>
                </div>
                <div className="king-bid">
                  <div className="amt">{king.boost_count}</div>
                  <div className="cap">
                    {king.boost_count === 1 ? 'CUSTOMER' : 'CUSTOMERS'} BOOSTING · {money(total(king))} TOTAL
                  </div>
                </div>
              </div>
              <div className="king-foot">
                <p>Think your business can take this?</p>
                <button className="btn-gold" onClick={m.openEntry}>GET ON THE BOARD →</button>
                <Link href={`/b/${king.id}`}><button className="btn-ghost">SEE LISTING</button></Link>
              </div>
            </div>

            <div className="chasing">
              {ranked.slice(1, 3).map((l, i) => (
                <div className="chase" key={l.id} onClick={() => m.openBoost(l)}>
                  <span className="rk">#{i + 2}</span>
                  <span>
                    <span className="nm">{l.name}</span>
                    <div className="bh">{money(total(king) - total(l))} behind · tap to boost</div>
                  </span>
                  <span className="amt"><span className="boosted">{l.boost_count}</span> · {money(total(l))}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="prize">
          <p className="eyebrow">The crown is not just pixels</p>
          <div className="prize">
            <h3>Every bidder gets a spot. The crown gets the best one.</h3>
            <p>Bids buy print placement on next month 9x12 card, not a badge. Nobody who bids walks away empty.</p>
            <div className="prize-grid">
              <div className="prize-item">
                <div className="n">👑 #1 · THE CROWN</div>
                <div className="t">Featured panel</div>
                <div className="d">Premium position on the card, top of the deals email, first in your category. Roughly 10,000 mailboxes.</div>
              </div>
              <div className="prize-item">
                <div className="n">#2 – #3 · RUNNERS UP</div>
                <div className="t">Standard panel</div>
                <div className="d">Your bid applies as credit toward a standard panel on the same card. You pay the difference.</div>
              </div>
              <div className="prize-item">
                <div className="n">#4 AND BELOW</div>
                <div className="t">Rolls over</div>
                <div className="d">Your bid carries to next month at full value, or take a digital placement now.</div>
              </div>
            </div>
            <div className="rule-note">
              HOW ENTRY WORKS: a business bids itself onto the board to enter, minimum ${RULES.MIN_ENTRY}.
              That bid is the opt-in. Only then can customers boost it. No business is ever printed on the
              card without bidding for itself first. <Link href="/rules">Full rules</Link>
            </div>
          </div>
        </section>

        {categoryKings.length > 0 && (
          <section id="categories">
            <h2 className="sec">Every category has a king</h2>
            <p className="sec-sub">Tap through to the full category board.</p>
            <div className="cat-grid">
              {categoryKings.map((l) => (
                <Link className="cat" key={l.id} href={`/c/${slug(l.category)}`}>
                  <div className="cn">{l.category}</div>
                  <div className="kn">{l.name}</div>
                  <div className="kt">{l.town}</div>
                  <div className="kb">
                    <span className="boosted">{l.boost_count} boosts</span> · {money(total(l))} to beat
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="board">
          <h2 className="sec">The board</h2>
          <p className="sec-sub">Ranked by total raised. Filter by town to see who owns your neighborhood.</p>
          <div className="towns">
            {['All towns', ...TOWNS].map((t) => (
              <button key={t} className={`town ${t === town ? 'on' : ''}`} onClick={() => setTown(t)}>{t}</button>
            ))}
          </div>
          <div className="board">
            {shown.map((l, i) => <Row key={l.id} listing={l} rank={i} onBoost={m.openBoost} />)}
            {!shown.length && !loading && (
              <div className="empty">No business has bid itself onto {town} yet. That crown is open.</div>
            )}
          </div>
        </section>
      </div>

      <BidModal mode={m.mode} target={m.targetItem} king={king} onClose={m.close} />
    </Shell>
  );
}
