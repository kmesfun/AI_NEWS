import { getStocks } from '@/lib/stocks';

export const runtime = 'nodejs';

export async function GET() {
  const data = await getStocks();
  return Response.json({ updatedAt: new Date().toISOString(), data });
}
