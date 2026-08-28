import { ImageResponse } from 'next/og';
import { getBoard, migrate } from '@/lib/db';
import { total, money, categoryLeaders } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INK = '#0b0d10';
const PANEL = '#14181e';
const GOLD = '#f5c451';
const DIM = '#8b95a3';
const TEXT = '#e8ecf1';

const Crown = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M6 44h52l6-30-16 10L32 8 16 24 0 14z" fill={GOLD} />
    <rect x="6" y="49" width="52" height="7" rx="3" fill={GOLD} />
  </svg>
);

export async function GET(req, { params }) {
  const { id } = await params;
  const square = new URL(req.url).searchParams.get('size') === 'square';
  const W = square ? 1080 : 1200;
  const H = square ? 1080 : 630;

  await migrate();
  const listings = await getBoard();
  const listing = listings.find((l) => String(l.id) === String(id));

  if (!listing) return new Response('Not found', { status: 404 });

  const ranked = [...listings].sort((a, b) => total(b) - total(a));
  const isCrown = ranked[0]?.id === listing.id;
  const isCatKing = categoryLeaders(listings).get(listing.category)?.id === listing.id;

  // Every badge says exactly what it measures. A business posts this as an
  // ad, so it must never imply a merit ranking the board does not do.
  const [eyebrow, measure] = isCrown
    ? ['THE CROWN · #1 OVERALL', `Most raised on Local Top Spot · ${money(total(listing))} from own bid and customer boosts`]
    : isCatKing
      ? [`MOST-BACKED ${listing.category.toUpperCase()}`,
         `Ranked by customer boosts on Local Top Spot · ${listing.boost_count} ${listing.boost_count === 1 ? 'customer' : 'customers'} backing`]
      : ['LISTED ON LOCAL TOP SPOT', `${listing.category} · ${money(total(listing))} raised`];

  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H, display: 'flex', flexDirection: 'column',
        background: INK, padding: square ? 72 : 64,
        border: `${square ? 14 : 12}px solid ${PANEL}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Crown size={square ? 62 : 52} />
          <div style={{
            color: GOLD, fontSize: square ? 30 : 26, fontWeight: 800, letterSpacing: 3
          }}>{eyebrow}</div>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center'
        }}>
          <div style={{
            color: TEXT, fontSize: listing.name.length > 26 ? (square ? 78 : 68) : (square ? 104 : 92),
            fontWeight: 800, lineHeight: 1.05, letterSpacing: -2
          }}>{listing.name}</div>
          <div style={{ color: GOLD, fontSize: square ? 40 : 34, marginTop: 20, fontWeight: 700 }}>
            {listing.town}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ height: 2, background: PANEL, display: 'flex' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ color: DIM, fontSize: square ? 25 : 22, maxWidth: W * 0.68, lineHeight: 1.35 }}>
              {measure}
            </div>
            <div style={{ color: DIM, fontSize: square ? 25 : 22, fontWeight: 700, letterSpacing: 2 }}>
              {month}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
