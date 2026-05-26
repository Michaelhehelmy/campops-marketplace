import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const expectedToken = process.env.METRICS_TOKEN;

  if (expectedToken && token !== expectedToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const metrics = await registry.metrics();
  return new NextResponse(metrics, {
    status: 200,
    headers: { 'Content-Type': registry.contentType },
  });
}
