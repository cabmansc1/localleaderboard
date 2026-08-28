'use client';

import Link from 'next/link';
import Shell from '@/components/Shell';
import { RULES_LIST } from '@/lib/config';

export default function Rules() {
  return (
    <Shell>
      <div className="page">
        <Link href="/" className="back">← Back to the board</Link>
        <h1>Rules</h1>
        <p>The short version: bid on yourself to enter, then your customers decide.</p>
        <ol className="rules-list">
          {RULES_LIST.map((r) => <li key={r}>{r}</li>)}
        </ol>
      </div>
    </Shell>
  );
}
