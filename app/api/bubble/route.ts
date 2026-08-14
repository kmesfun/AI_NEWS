import { getNews } from '@/lib/feeds';
import { getBubbleData } from '@/lib/bubble';

export const runtime = 'nodejs';

export async function GET() {
  const news = await getNews();
  const data = getBubbleData(news);
  return Response.json({ updatedAt: new Date().toISOString(), data });
}
