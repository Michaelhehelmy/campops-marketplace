import { describe, it, expect } from 'vitest';
import { PlanGate, PlanAccessError } from '../PlanGate';
import type { SiteLike } from '../PlanGate';
import type { PluginRecord } from '../PluginLoader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const site = (plan: string): SiteLike => ({ id: `site-${plan}`, plan });

const plugin = (planRequirement: string): Pick<PluginRecord, 'planRequirement'> => ({
  planRequirement,
});

const theme = (planRequirement?: string) => ({ planRequirement });

// ---------------------------------------------------------------------------
// PlanGate.allows()
// ---------------------------------------------------------------------------

describe('PlanGate.allows()', () => {
  it('basic allows basic', () => expect(PlanGate.allows(site('basic'), 'basic')).toBe(true));
  it('premium allows basic', () => expect(PlanGate.allows(site('premium'), 'basic')).toBe(true));
  it('premium allows premium', () =>
    expect(PlanGate.allows(site('premium'), 'premium')).toBe(true));
  it('ultimate allows all tiers', () => {
    expect(PlanGate.allows(site('ultimate'), 'basic')).toBe(true);
    expect(PlanGate.allows(site('ultimate'), 'premium')).toBe(true);
    expect(PlanGate.allows(site('ultimate'), 'ultimate')).toBe(true);
  });
  it('basic does NOT allow premium', () =>
    expect(PlanGate.allows(site('basic'), 'premium')).toBe(false));
  it('basic does NOT allow ultimate', () =>
    expect(PlanGate.allows(site('basic'), 'ultimate')).toBe(false));
  it('premium does NOT allow ultimate', () =>
    expect(PlanGate.allows(site('premium'), 'ultimate')).toBe(false));
  it('unknown plan does NOT allow basic', () =>
    expect(PlanGate.allows(site('unknown'), 'basic')).toBe(false));
});

// ---------------------------------------------------------------------------
// PlanGate.check()
// ---------------------------------------------------------------------------

describe('PlanGate.check()', () => {
  it('does not throw when site plan satisfies requirement', () => {
    expect(() => PlanGate.check(site('premium'), 'basic')).not.toThrow();
    expect(() => PlanGate.check(site('ultimate'), 'ultimate')).not.toThrow();
  });

  it('throws PlanAccessError when plan is insufficient', () => {
    expect(() => PlanGate.check(site('basic'), 'premium')).toThrow(PlanAccessError);
  });

  it('PlanAccessError contains correct siteId, sitePlan, requiredPlan', () => {
    let caught: PlanAccessError | null = null;
    try {
      PlanGate.check(site('basic'), 'ultimate');
    } catch (err: any) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    expect(caught!.siteId).toBe('site-basic');
    expect(caught!.sitePlan).toBe('basic');
    expect(caught!.requiredPlan).toBe('ultimate');
    expect(caught!.message).toContain('upgrade');
  });
});

// ---------------------------------------------------------------------------
// PlanGate.canUsePlugin()
// ---------------------------------------------------------------------------

describe('PlanGate.canUsePlugin()', () => {
  it('basic site can use basic plugin', () =>
    expect(PlanGate.canUsePlugin(site('basic'), plugin('basic'))).toBe(true));

  it('basic site cannot use premium plugin', () =>
    expect(PlanGate.canUsePlugin(site('basic'), plugin('premium'))).toBe(false));

  it('premium site can use premium plugin', () =>
    expect(PlanGate.canUsePlugin(site('premium'), plugin('premium'))).toBe(true));

  it('premium site cannot use ultimate plugin', () =>
    expect(PlanGate.canUsePlugin(site('premium'), plugin('ultimate'))).toBe(false));

  it('ultimate site can use all plugins', () => {
    expect(PlanGate.canUsePlugin(site('ultimate'), plugin('basic'))).toBe(true);
    expect(PlanGate.canUsePlugin(site('ultimate'), plugin('premium'))).toBe(true);
    expect(PlanGate.canUsePlugin(site('ultimate'), plugin('ultimate'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PlanGate.canUseTheme()
// ---------------------------------------------------------------------------

describe('PlanGate.canUseTheme()', () => {
  it('basic site can use a theme with no plan_requirement (defaults to basic)', () =>
    expect(PlanGate.canUseTheme(site('basic'), theme())).toBe(true));

  it('basic site can use a basic theme', () =>
    expect(PlanGate.canUseTheme(site('basic'), theme('basic'))).toBe(true));

  it('basic site cannot use a premium theme', () =>
    expect(PlanGate.canUseTheme(site('basic'), theme('premium'))).toBe(false));

  it('ultimate site can use any theme', () => {
    expect(PlanGate.canUseTheme(site('ultimate'), theme('basic'))).toBe(true);
    expect(PlanGate.canUseTheme(site('ultimate'), theme('premium'))).toBe(true);
    expect(PlanGate.canUseTheme(site('ultimate'), theme('ultimate'))).toBe(true);
  });
});
