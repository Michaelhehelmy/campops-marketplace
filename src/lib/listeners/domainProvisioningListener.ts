import { addAction, Hooks } from '../hooks';
import { getSqlite } from '../db';
import { logger } from '../logger';
import { provisionSubdomain, provisionCustomDomain } from '../domain-provisioning';

export function registerDomainProvisioningListener(): () => void {
  return addAction(Hooks.CORE_SITE_PLAN_UPGRADED, async (payload: unknown) => {
    const { siteId, previousPlan, newPlan, subdomain, customDomain } = (payload ?? {}) as {
      siteId?: string;
      previousPlan?: string | null;
      newPlan?: string;
      actorId?: string;
      subdomain?: string | null;
      customDomain?: string | null;
    };

    if (!siteId || !newPlan) return;

    try {
      const db = getSqlite();
      const property = db
        .prepare(
          `SELECT id, plan, settings, slug FROM properties WHERE id = ? AND is_active = true`
        )
        .get(siteId) as any;

      if (!property) {
        logger.warn(`[DomainProvisioning] Property ${siteId} not found — skipping`);
        return;
      }

      if (newPlan === 'premium' && subdomain) {
        logger.info(`[DomainProvisioning] Provisioning subdomain "${subdomain}" for ${siteId}`);

        const result = await provisionSubdomain(subdomain, siteId);

        if (result.success) {
          const settings = (() => {
            if (!property.settings) return {};
            if (typeof property.settings === 'string') {
              try {
                return JSON.parse(property.settings);
              } catch {
                return {};
              }
            }
            return property.settings;
          })();

          const updatedSettings = {
            ...settings,
            ...(result.dnsRecordId ? { dnsRecordId: result.dnsRecordId } : {}),
          };

          db.prepare(
            `UPDATE properties SET subdomain = ?, settings = ?, domain_verified = 1 WHERE id = ?`
          ).run(subdomain, JSON.stringify(updatedSettings), siteId);

          logger.info(`[DomainProvisioning] Subdomain "${subdomain}" provisioned for ${siteId}`);
        } else {
          logger.error(
            `[DomainProvisioning] Subdomain provisioning failed for ${siteId}: ${result.error}`
          );
        }
      } else if (newPlan === 'ultimate' && customDomain) {
        logger.info(
          `[DomainProvisioning] Provisioning custom domain "${customDomain}" for ${siteId}`
        );

        const result = await provisionCustomDomain(customDomain, siteId);

        if (result.success) {
          const settings = (() => {
            if (!property.settings) return {};
            if (typeof property.settings === 'string') {
              try {
                return JSON.parse(property.settings);
              } catch {
                return {};
              }
            }
            return property.settings;
          })();

          const updatedSettings = {
            ...settings,
            customDomain,
            customDomainVerified: true,
            ...(result.dnsRecordId ? { dnsRecordId: result.dnsRecordId } : {}),
          };

          db.prepare(
            `UPDATE properties SET custom_domain = ?, settings = ?, domain_verified = 1 WHERE id = ?`
          ).run(customDomain, JSON.stringify(updatedSettings), siteId);

          logger.info(
            `[DomainProvisioning] Custom domain "${customDomain}" provisioned for ${siteId}`
          );
        } else {
          logger.error(
            `[DomainProvisioning] Custom domain provisioning failed for ${siteId}: ${result.error}`
          );
        }
      }
    } catch (err: any) {
      logger.error(`[DomainProvisioning] Error for site ${siteId}:`, err.message);
    }
  });
}
