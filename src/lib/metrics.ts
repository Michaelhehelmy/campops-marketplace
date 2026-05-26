import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'sinaicamps_node_' });

export const httpRequestsTotal = new Counter({
  name: 'sinaicamps_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path'],
  registers: [registry],
});

export const httpDurationMs = new Histogram({
  name: 'sinaicamps_http_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'status', 'path'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const csrfBlockedTotal = new Counter({
  name: 'sinaicamps_csrf_blocked_total',
  help: 'Total CSRF-blocked requests',
  registers: [registry],
});

export const rateLimitHitsTotal = new Counter({
  name: 'sinaicamps_rate_limit_hits_total',
  help: 'Total rate limit rejections',
  labelNames: ['zone'],
  registers: [registry],
});

export const tenantResolveErrorsTotal = new Counter({
  name: 'sinaicamps_tenant_resolve_errors_total',
  help: 'Tenant resolution failures',
  registers: [registry],
});

export const authFailuresTotal = new Counter({
  name: 'sinaicamps_auth_failures_total',
  help: 'Authentication failures',
  labelNames: ['reason'],
  registers: [registry],
});

export const dbQueryDurationMs = new Histogram({
  name: 'sinaicamps_db_query_duration_ms',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [registry],
});

export function incrementCounter(name: string, by = 1) {
  if (name === 'requests_total') {
    httpRequestsTotal.inc({ method: '', status: '', path: '' }, by);
  } else if (name === 'mutating_requests') {
    httpRequestsTotal.inc({ method: 'MUTATE', status: '', path: '' }, by);
  } else if (name === 'csrf_blocked') {
    csrfBlockedTotal.inc(by);
  }
}

export function recordHistogram(name: string, value: number) {
  if (name === 'response_time_ms') {
    httpDurationMs.observe({ method: '', status: '', path: '' }, value);
  }
}

export function getMetrics() {
  return {};
}

export function resetMetrics() {
  registry.resetMetrics();
}
