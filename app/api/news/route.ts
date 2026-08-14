import { getNews } from '@/lib/feeds';

export const runtime = 'nodejs';

export async function GET() {
  const data = await getNews();
  return Response.json({ updatedAt: new Date().toISOString(), data });
}
