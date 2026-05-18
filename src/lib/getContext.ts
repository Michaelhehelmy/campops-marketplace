import { RequestContext, type RequestContextData } from './RequestContext';

/**
 * Typed error thrown when code that requires a request context is called
 * outside of a RequestContext.run() scope (e.g. at module init time).
 */
export class NoRequestContextError extends Error {
  constructor() {
    super(
      'getContext() called outside a RequestContext scope. ' +
        'Ensure RequestContext.run() wraps this code path.'
    );
    this.name = 'NoRequestContextError';
  }
}

/**
 * getContext — retrieve the current request context.
 * Throws NoRequestContextError if called outside a RequestContext.run() scope.
 *
 * Use this in route handlers and server components that always run inside
 * a bootstrapped request. Prefer RequestContext.current() where null is acceptable.
 */
export function getContext(): RequestContextData {
  const ctx = RequestContext.current();
  if (!ctx) throw new NoRequestContextError();
  return ctx;
}
