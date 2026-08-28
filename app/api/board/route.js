// Reads the board from the Apps Script web app.
// This runs server side so SHEETS_URL never reaches the browser and we
// sidestep CORS on the script.google.com redirect.

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const NUMERIC = ['self_bid', 'boost_total', 'boost_count'];

export async function GET() {
  const url = process.env.SHEETS_URL;

  if (!url) {
    return Response.json(
      { ok: false, error: 'SHEETS_URL is not set' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `Sheets responded ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.ok) {
      return Response.json(
        { ok: false, error: data.error || 'Sheets returned not ok' },
        { status: 502 }
      );
    }

    // Sheets hands back whatever the cell held. Force the shape the UI expects.
    const listings = (data.listings || []).map((l) => {
      const out = { ...l, id: String(l.id), name: String(l.name || '') };
      NUMERIC.forEach((k) => { out[k] = Number(l[k] || 0); });
      return out;
    });

    return Response.json({ ok: true, listings });
  } catch (err) {
    return Response.json(
      { ok: false, error: err.message || String(err) },
      { status: 502 }
    );
  }
}
