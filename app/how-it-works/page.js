'use client';

import Link from 'next/link';
import Shell from '@/components/Shell';
import { MECHANISMS } from '@/lib/config';

export default function HowItWorks() {
  return (
    <Shell>
      <div className="page">
        <Link href="/" className="back">← Back to the board</Link>
        <h1>How it works</h1>
        <p>Six mechanisms decide who owns the Lowcountry.</p>
        <div className="mech-grid">
          {MECHANISMS.map(([icon, title, body]) => (
            <div className="mech" key={title}>
              <div className="mech-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
