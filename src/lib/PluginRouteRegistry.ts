/**
 * Plugin Route Registry
 * ─────────────────────
 * Stores plugin-registered route handlers for delegation via catch-all API route.
 */

export interface RouteHandler {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  handler: (req: Request) => Promise<Response>;
  pluginId: string;
  pathPattern: string; // Original pattern with :param syntax
}

export interface RouteEntry {
  pathPattern: string;
  regex: RegExp; // For matching dynamic paths
  paramNames: string[]; // Extracted parameter names
  handlers: Map<string, RouteHandler>;
}

const GLOBAL_KEY = '__pluginRouteRegistry__';

class PluginRouteRegistry {
  private routes: RouteEntry[] = [];

  register(
    pluginId: string,
    pathPattern: string,
    method: string,
    handler: (req: Request) => Promise<Response>
  ) {
    // Normalize path: remove leading /api/p or /api if present to match catch-all route expectations
    let normalizedPattern = pathPattern;
    if (normalizedPattern.startsWith('/api/p/')) {
      normalizedPattern = normalizedPattern.substring(7);
    } else if (normalizedPattern.startsWith('/api/')) {
      normalizedPattern = normalizedPattern.substring(4);
    }
    if (!normalizedPattern.startsWith('/')) {
      normalizedPattern = '/' + normalizedPattern;
    }

    const { regex, paramNames } = this.pathToRegex(normalizedPattern);

    const entry: RouteEntry = {
      pathPattern: normalizedPattern,
      regex,
      paramNames,
      handlers: new Map([
        [
          method.toUpperCase(),
          {
            method: method.toUpperCase() as any,
            handler,
            pluginId,
            pathPattern: normalizedPattern,
          },
        ],
      ]),
    };

    // Check if we already have this pattern, if so merge handlers
    const existing = this.routes.find((r) => r.pathPattern === normalizedPattern);
    if (existing) {
      existing.handlers.set(method.toUpperCase(), entry.handlers.get(method.toUpperCase())!);
    } else {
      this.routes.push(entry);
    }

    console.log(
      `[PluginRouteRegistry] Registered ${method.toUpperCase()} ${normalizedPattern} for plugin ${pluginId}`
    );
  }

  get(
    path: string,
    method: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    // Ensure path starts with / for matching
    const normalizedPath = path.startsWith('/') ? path : '/' + path;

    for (const entry of this.routes) {
      const match = entry.regex.exec(normalizedPath);
      if (match) {
        const handler = entry.handlers.get(method.toUpperCase());
        if (!handler) continue; // Try next entry if method doesn't match

        // Extract parameters
        const params: Record<string, string> = {};
        entry.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });

        return { handler, params };
      }
    }
    return null;
  }

  private pathToRegex(pattern: string): { regex: RegExp; paramNames: string[] } {
    // Convert :param to named capture groups
    const paramNames: string[] = [];
    let regexPattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    return {
      regex: new RegExp(`^${regexPattern}$`),
      paramNames,
    };
  }

  getAll(): RouteEntry[] {
    return this.routes;
  }
}

export const pluginRouteRegistry: PluginRouteRegistry =
  (globalThis as any)[GLOBAL_KEY] || ((globalThis as any)[GLOBAL_KEY] = new PluginRouteRegistry());
