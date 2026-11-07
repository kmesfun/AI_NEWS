import { fetchStocks } from '@/lib/stocks';

export const runtime = 'nodejs';
// Don't statically cache this route — quotes must stay fresh
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchStocks();
  return Response.json(
    { updatedAt: new Date().toISOString(), data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
