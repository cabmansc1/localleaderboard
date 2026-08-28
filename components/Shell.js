'use client';

import Link from 'next/link';

export default function Shell({ children, onEnter }) {
  return (
    <>
      <header className="nav">
        <Link href="/" className="brand">
          <span className="brand-mark">👑</span>
          <span className="brand-text">LOCAL <em>TOP SPOT</em></span>
        </Link>
        <nav className="nav-links">
          <Link href="/#board">Board</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/rules">Rules</Link>
        </nav>
        {onEnter && (
          <button className="nav-cta" onClick={onEnter}>GET ON THE BOARD</button>
        )}
      </header>

      <main>{children}</main>

      <footer className="foot">
        <div className="foot-in">
          <div className="foot-brand">👑 LOCAL <em>TOP SPOT</em></div>
          <p>
            Charleston businesses bid themselves onto the board. Their customers
            boost them. The crown wins the featured panel on next month card.
          </p>
          <nav className="foot-links">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/rules">Rules</Link>
            <Link href="/#board">The board</Link>
          </nav>
          <div className="foot-fine">
            © {new Date().getFullYear()} Local Top Spot · Lowcountry, South Carolina
          </div>
        </div>
      </footer>
    </>
  );
}
