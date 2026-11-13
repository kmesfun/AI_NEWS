import { getCalendar, getIpoPipeline, IPO_PIPELINE_AS_OF } from '@/lib/calendar';

export async function GET() {
  return Response.json({
    updatedAt: new Date().toISOString(),
    data: getCalendar(),
    ipoPipeline: getIpoPipeline(),
    ipoPipelineAsOf: IPO_PIPELINE_AS_OF,
  });
}
