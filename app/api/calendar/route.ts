import { getCalendar } from '@/lib/calendar';

export async function GET() {
  return Response.json({ updatedAt: new Date().toISOString(), data: getCalendar() });
}
