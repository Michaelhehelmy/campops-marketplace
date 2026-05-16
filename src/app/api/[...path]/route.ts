import { NextRequest, NextResponse } from 'next/server';
import { pluginRouteRegistry } from '@/lib/PluginRouteRegistry';
import { PluginRuntimeService } from '@/lib/PluginRuntimeService';
import { logger } from '@/lib/logger';
import {
  NotFoundError,
  ValidationError,
  AuthError,
  ForbiddenError,
  errorResponse,
} from '@/lib/errors';
import { apiRateLimiter } from '@/lib/rateLimit';

/**
 * Catch-all API route for plugin-registered handlers.
 * Delegates requests to plugin route handlers registered via PluginAPI.registerRoute.
 */
async function ensurePluginsInitialized() {
  try {
    await PluginRuntimeService.init();
  } catch (error) {
    logger.error('Failed to initialize plugins:', error);
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'POST');
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'PATCH');
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'PUT');
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'DELETE');
}

async function handleRequest(req: NextRequest, pathSegments: string[], method: string) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
  try {
    const rateInfo = apiRateLimiter.check(ip);
    // Rate limit headers will be set on the response below
  } catch (err) {
    return errorResponse(err);
  }

  // Ensure plugins are initialized before handling requests
  await ensurePluginsInitialized();

  const path = pathSegments.join('/');
  const result = pluginRouteRegistry.get(path, method);

  if (!result) {
    return errorResponse(new NotFoundError('Route not found'));
  }

  const { handler, params } = result;

  try {
    // Convert NextRequest to standard Request for plugin handlers
    const url = new URL(req.url);
    const body = await req.text();
    const standardRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: body || undefined,
    });

    // Inject params into the request URL for dynamic routes
    const urlWithParams = new URL(req.url);
    Object.entries(params).forEach(([key, value]) => {
      urlWithParams.searchParams.set(`:${key}`, value);
    });

    const response = await handler.handler(standardRequest);
    return response;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(new ValidationError('Validation error', error.errors));
    }

    if (error instanceof AuthError || error instanceof ForbiddenError) {
      return errorResponse(error);
    }

    if (
      error.message &&
      (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))
    ) {
      const isUnauthorized = error.message.includes('Unauthorized');
      return errorResponse(
        isUnauthorized ? new AuthError(error.message) : new ForbiddenError(error.message)
      );
    }

    logger.error(`Error handling ${method} /${path}:`, error);
    return errorResponse(error);
  }
}
