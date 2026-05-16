import { NextRequest, NextResponse } from 'next/server';
import { pluginRouteRegistry } from '@/lib/PluginRouteRegistry';
import { PluginRuntimeService } from '@/lib/PluginRuntimeService';
import { logger } from '@/lib/logger';
import { NotFoundError, errorResponse } from '@/lib/errors';

logger.info('Module loaded');

let pluginsInitialized = false;

/**
 * Catch-all API route for plugin-registered handlers.
 * Delegates requests to plugin route handlers registered via PluginAPI.registerRoute.
 */
async function ensurePluginsInitialized() {
  if (!pluginsInitialized) {
    try {
      await PluginRuntimeService.init();
      pluginsInitialized = true;
      logger.info('Plugins initialized');
    } catch (error) {
      logger.error('Failed to initialize plugins:', error);
    }
  }
}

export async function GET(req: NextRequest, { params }: { params: { plugin: string[] } }) {
  return handleRequest(req, params.plugin, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { plugin: string[] } }) {
  return handleRequest(req, params.plugin, 'POST');
}

export async function PATCH(req: NextRequest, { params }: { params: { plugin: string[] } }) {
  return handleRequest(req, params.plugin, 'PATCH');
}

export async function PUT(req: NextRequest, { params }: { params: { plugin: string[] } }) {
  return handleRequest(req, params.plugin, 'PUT');
}

export async function DELETE(req: NextRequest, { params }: { params: { plugin: string[] } }) {
  return handleRequest(req, params.plugin, 'DELETE');
}

async function handleRequest(req: NextRequest, pathSegments: string[], method: string) {
  // Ensure plugins are initialized before handling requests
  await ensurePluginsInitialized();

  const path = pathSegments.join('/');
  logger.info(`Handling ${method} /${path}`);
  const result = pluginRouteRegistry.get(path, method);

  if (!result) {
    logger.info(`Route not found for ${method} /${path}`);
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
    logger.error(`Error handling ${method} /${path}:`, error);
    if (error.stack) logger.error(error.stack);
    return errorResponse(error);
  }
}
