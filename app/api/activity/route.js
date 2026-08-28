import { getActivity, migrate } from '@/lib/db';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await migrate();
    const limit = new URL(req.url).searchParams.get('limit');
    return Response.json({ ok: true, activity: await getActivity(limit) });
  } catch (err) {
    console.error('[activity]', err);
    return Response.json({ ok: false, error: err.message || String(err) }, { status: 500 });
  }
}
