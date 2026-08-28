'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';

function Thanks() {
  return (
    <div className="page">
      <div className="modal-done" style={{ textAlign: 'center' }}>
        <div className="modal-done-icon">✓</div>
        <h1>You are in.</h1>
        <p style={{ maxWidth: 460, margin: '14px auto 0' }}>
          Payment went through. The board updates the moment Stripe confirms it,
          which is usually a few seconds — refresh if you do not see it yet.
        </p>
        <div className="king-foot" style={{ justifyContent: 'center', borderTop: 0 }}>
          <Link href="/"><button className="btn-gold">SEE THE BOARD</button></Link>
        </div>
      </div>
    </div>
  );
}

export default function ThanksPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="loading">LOADING…</div>}>
        <Thanks />
      </Suspense>
    </Shell>
  );
}
