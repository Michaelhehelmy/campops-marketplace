import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('metrics', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports counters and histograms', async () => {
    const mod = await import('../metrics');
    expect(mod.httpRequestsTotal).toBeDefined();
    expect(mod.httpDurationMs).toBeDefined();
    expect(mod.csrfBlockedTotal).toBeDefined();
    expect(mod.rateLimitHitsTotal).toBeDefined();
    expect(mod.tenantResolveErrorsTotal).toBeDefined();
    expect(mod.authFailuresTotal).toBeDefined();
    expect(mod.dbQueryDurationMs).toBeDefined();
    expect(mod.registry).toBeDefined();
  });

  it('incrementCounter handles known names', async () => {
    const mod = await import('../metrics');
    const incSpy = vi.spyOn(mod.httpRequestsTotal, 'inc');
    mod.incrementCounter('requests_total');
    expect(incSpy).toHaveBeenCalledWith({ method: '', status: '', path: '' }, 1);
  });

  it('incrementCounter handles mutating_requests', async () => {
    const mod = await import('../metrics');
    const incSpy = vi.spyOn(mod.httpRequestsTotal, 'inc');
    mod.incrementCounter('mutating_requests');
    expect(incSpy).toHaveBeenCalledWith({ method: 'MUTATE', status: '', path: '' }, 1);
  });

  it('incrementCounter handles csrf_blocked', async () => {
    const mod = await import('../metrics');
    const incSpy = vi.spyOn(mod.csrfBlockedTotal, 'inc');
    mod.incrementCounter('csrf_blocked');
    expect(incSpy).toHaveBeenCalledWith(1);
  });

  it('incrementCounter ignores unknown names', async () => {
    const mod = await import('../metrics');
    const incSpy = vi.spyOn(mod.httpRequestsTotal, 'inc');
    mod.incrementCounter('unknown_metric', 1);
    expect(incSpy).not.toHaveBeenCalled();
  });

  it('recordHistogram handles response_time_ms', async () => {
    const mod = await import('../metrics');
    const obsSpy = vi.spyOn(mod.httpDurationMs, 'observe');
    mod.recordHistogram('response_time_ms', 150);
    expect(obsSpy).toHaveBeenCalledWith({ method: '', status: '', path: '' }, 150);
  });

  it('recordHistogram ignores unknown names', async () => {
    const mod = await import('../metrics');
    const obsSpy = vi.spyOn(mod.httpDurationMs, 'observe');
    mod.recordHistogram('unknown', 1);
    expect(obsSpy).not.toHaveBeenCalled();
  });

  it('getMetrics returns empty object', async () => {
    const mod = await import('../metrics');
    expect(mod.getMetrics()).toEqual({});
  });

  it('resetMetrics does not throw', async () => {
    const mod = await import('../metrics');
    expect(() => mod.resetMetrics()).not.toThrow();
  });

  it('incrementCounter does not throw in edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const mod = await import('../metrics');
    expect(() => mod.incrementCounter('requests_total')).not.toThrow();
    vi.unstubAllEnvs();
  });

  it('recordHistogram does not throw in edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const mod = await import('../metrics');
    expect(() => mod.recordHistogram('response_time_ms', 100)).not.toThrow();
    vi.unstubAllEnvs();
  });
});
