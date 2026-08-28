import { getBoard, migrate } from '@/lib/db';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await migrate();
    return Response.json({ ok: true, listings: await getBoard() });
  } catch (err) {
    console.error('[board]', err);
    return Response.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
