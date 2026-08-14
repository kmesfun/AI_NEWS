import { getEarnings } from '@/lib/earnings';

export const runtime = 'nodejs';

export async function GET() {
  const data = await getEarnings();
  return Response.json({ updatedAt: new Date().toISOString(), data });
}
