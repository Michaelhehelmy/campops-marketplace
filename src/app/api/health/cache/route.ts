import { cacheHealthCheck } from '@/lib/cache';

export async function GET() {
  const health = await cacheHealthCheck();
  return Response.json(health);
}
