import { planSatisfies } from './PluginLoader';
import type { PluginRecord } from './PluginLoader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteLike {
  id: string;
  plan: string;
}

export interface ThemeLike {
  planRequirement?: string;
}

// ---------------------------------------------------------------------------
// PlanGate
// ---------------------------------------------------------------------------

/**
 * PlanGate — centralised plan-based access control.
 *
 * Uses the same PLAN_ORDER (basic < premium < ultimate) as PluginLoader.
 * All methods are pure functions with no side-effects; errors are communicated
 * via thrown PlanAccessError or boolean return values.
 *
 * Usage:
 *   PlanGate.check(site, 'premium')            // throws if plan insufficient
 *   PlanGate.allows(site, 'ultimate')          // returns boolean
 *   PlanGate.canUsePlugin(site, pluginRecord)  // returns boolean
 *   PlanGate.canUseTheme(site, themeManifest)  // returns boolean
 */
export class PlanGate {
  /**
   * Returns true if the site's plan meets or exceeds the required plan.
   */
  static allows(site: SiteLike, required: string): boolean {
    return planSatisfies(site.plan, required);
  }

  /**
   * Throws PlanAccessError if the site's plan is insufficient.
   * Use this as a guard inside API handlers and server actions.
   */
  static check(site: SiteLike, required: string): void {
    if (!planSatisfies(site.plan, required)) {
      throw new PlanAccessError(site.id, site.plan, required);
    }
  }

  /**
   * Returns true if the site can activate/use a plugin based on its
   * plan_requirement field.
   */
  static canUsePlugin(site: SiteLike, plugin: Pick<PluginRecord, 'planRequirement'>): boolean {
    return planSatisfies(site.plan, plugin.planRequirement);
  }

  /**
   * Returns true if the site can activate/use a theme based on its
   * plan_requirement field.
   */
  static canUseTheme(site: SiteLike, theme: ThemeLike): boolean {
    return planSatisfies(site.plan, theme.planRequirement ?? 'basic');
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class PlanAccessError extends Error {
  public readonly siteId: string;
  public readonly sitePlan: string;
  public readonly requiredPlan: string;

  constructor(siteId: string, sitePlan: string, requiredPlan: string) {
    super(
      `Site "${siteId}" is on plan "${sitePlan}" but "${requiredPlan}" is required. ` +
        `Please upgrade your plan to access this feature.`
    );
    this.name = 'PlanAccessError';
    this.siteId = siteId;
    this.sitePlan = sitePlan;
    this.requiredPlan = requiredPlan;
  }
}
