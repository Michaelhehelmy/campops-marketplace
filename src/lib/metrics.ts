const isEdgeRuntime =
  typeof process === 'undefined' ||
  typeof process.uptime !== 'function' ||
  process.env.NEXT_RUNTIME === 'edge';

let Counter: any, Histogram: any, Registry: any, collectDefaultMetrics: any;
let registryInstance: any;

if (!isEdgeRuntime) {
  const promClient = require('prom-client');
  Counter = promClient.Counter;
  Histogram = promClient.Histogram;
  Registry = promClient.Registry;
  collectDefaultMetrics = promClient.collectDefaultMetrics;
  registryInstance = new Registry();
  collectDefaultMetrics({ register: registryInstance, prefix: 'sinaicamps_node_' });
} else {
  Counter = function () { return { inc() {} }; };
  Histogram = function () { return { observe() {} }; };
  Registry = function () { return { resetMetrics() {} }; };
  registryInstance = null;
}

function makeCounter(opts: any) {
  if (!isEdgeRuntime) {
    try {
      return new (require('prom-client').Counter)({ ...opts, registers: [registryInstance] });
    } catch { /* fall through to no-op */ }
  }
  return { inc() {} };
}

function makeHistogram(opts: any) {
  if (!isEdgeRuntime) {
    try {
      return new (require('prom-client').Histogram)({ ...opts, registers: [registryInstance] });
    } catch { /* fall through to no-op */ }
  }
  return { observe() {} };
}

export const registry = registryInstance;

export const httpRequestsTotal = makeCounter({
  name: 'sinaicamps_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path'],
});

export const httpDurationMs = makeHistogram({
  name: 'sinaicamps_http_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'status', 'path'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
});

export const csrfBlockedTotal = makeCounter({
  name: 'sinaicamps_csrf_blocked_total',
  help: 'Total CSRF-blocked requests',
});

export const rateLimitHitsTotal = makeCounter({
  name: 'sinaicamps_rate_limit_hits_total',
  help: 'Total rate limit rejections',
  labelNames: ['zone'],
});

export const tenantResolveErrorsTotal = makeCounter({
  name: 'sinaicamps_tenant_resolve_errors_total',
  help: 'Tenant resolution failures',
});

export const authFailuresTotal = makeCounter({
  name: 'sinaicamps_auth_failures_total',
  help: 'Authentication failures',
  labelNames: ['reason'],
});

export const dbQueryDurationMs = makeHistogram({
  name: 'sinaicamps_db_query_duration_ms',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

export function incrementCounter(name: string, by = 1) {
  if (isEdgeRuntime) return;
  if (name === 'requests_total') {
    httpRequestsTotal.inc({ method: '', status: '', path: '' }, by);
  } else if (name === 'mutating_requests') {
    httpRequestsTotal.inc({ method: 'MUTATE', status: '', path: '' }, by);
  } else if (name === 'csrf_blocked') {
    csrfBlockedTotal.inc(by);
  }
}

export function recordHistogram(name: string, value: number) {
  if (isEdgeRuntime) return;
  if (name === 'response_time_ms') {
    httpDurationMs.observe({ method: '', status: '', path: '' }, value);
  }
}

export function getMetrics() {
  return {};
}

export function resetMetrics() {
  if (registryInstance) registryInstance.resetMetrics();
}
