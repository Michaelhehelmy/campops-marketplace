import { NextResponse } from 'next/server';
import { incrementCounter, getMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  incrementCounter('requests_total');
  const metrics = getMetrics();
  return NextResponse.json(metrics);
}
