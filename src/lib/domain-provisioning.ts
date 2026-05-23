import { logger } from './logger';

// ─── Configuration ────────────────────────────────────────────────────────

const CF_API = 'https://api.cloudflare.com/client/v4';

function isDryRun(): boolean {
  return !process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ZONE_ID;
}

function cfApiToken(): string {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    if (isDryRun()) return 'dry-run-token';
    throw new Error('CLOUDFLARE_API_TOKEN env var is required');
  }
  return token;
}

function cfZoneId(): string {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) {
    if (isDryRun()) return 'dry-run-zone';
    throw new Error('CLOUDFLARE_ZONE_ID env var is required');
  }
  return zoneId;
}

function serverIp(): string {
  return process.env.SERVER_IP ?? '84.235.239.6';
}

function baseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com';
}

// ─── Cloudflare API ───────────────────────────────────────────────────────

async function cfFetch(method: string, path: string, body?: unknown): Promise<any> {
  if (isDryRun()) {
    logger.info(`[DomainProvisioning] DRY RUN: ${method} ${path}`);
    return {
      success: true,
      result: { id: `dry-${Date.now()}`, name: '', type: '', content: '' },
    };
  }
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfApiToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json;
}

// ─── DNS Record Management ────────────────────────────────────────────────

export async function createDnsRecord(
  type: 'A' | 'CNAME',
  name: string,
  content: string,
  proxied = true
): Promise<{ id: string }> {
  const zoneId = cfZoneId();
  const json = await cfFetch('POST', `/zones/${zoneId}/dns_records`, {
    type,
    name,
    content,
    ttl: 1,
    proxied,
  });
  const id: string = json.result.id;
  logger.info(`[DomainProvisioning] Created DNS ${type} record: ${name} → ${content} (id=${id})`);
  return { id };
}

export async function deleteDnsRecord(recordId: string): Promise<void> {
  const zoneId = cfZoneId();
  await cfFetch('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
  logger.info(`[DomainProvisioning] Deleted DNS record ${recordId}`);
}

export async function listDnsRecords(
  name?: string
): Promise<{ id: string; name: string; type: string; content: string }[]> {
  const zoneId = cfZoneId();
  const params = name ? `?name=${encodeURIComponent(name)}` : '';
  const json = await cfFetch('GET', `/zones/${zoneId}/dns_records${params}`);
  return json.result as any[];
}

// ─── High-level Provisioning Flows ────────────────────────────────────────

export interface ProvisioningResult {
  success: boolean;
  dnsRecordId?: string;
  error?: string;
}

/**
 * Provision a Premium subdomain (slug.BASE_DOMAIN).
 * Creates a CNAME DNS record — wildcard SSL handled by Cloudflare at the edge,
 * catch-all Nginx routes the domain to Next.js.
 */
export async function provisionSubdomain(
  slug: string,
  _siteId: string
): Promise<ProvisioningResult> {
  const hostname = `${slug}.${baseDomain()}`;
  try {
    const existing = await listDnsRecords(hostname);
    if (existing.length > 0) {
      logger.info(`[DomainProvisioning] DNS record already exists for ${hostname}, skipping`);
      return { success: true, dnsRecordId: existing[0].id };
    }
    const record = await createDnsRecord('CNAME', hostname, baseDomain(), true);
    return { success: true, dnsRecordId: record.id };
  } catch (err: any) {
    logger.error(`[DomainProvisioning] Subdomain provisioning failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Provision an Ultimate custom domain.
 * Only creates the Cloudflare DNS A record — SSL and routing are handled by
 * Cloudflare at the edge and the unified catch-all Nginx config.
 */
export async function provisionCustomDomain(
  domain: string,
  _siteId: string
): Promise<ProvisioningResult> {
  const ip = serverIp();

  try {
    const existing = await listDnsRecords(domain);
    if (existing.length > 0) {
      logger.info(`[DomainProvisioning] DNS record already exists for ${domain}, skipping`);
      return { success: true, dnsRecordId: existing[0].id };
    }
    const record = await createDnsRecord('A', domain, ip, true);
    return { success: true, dnsRecordId: record.id };
  } catch (err: any) {
    return { success: false, error: `DNS provisioning failed: ${err.message}` };
  }
}

/**
 * Remove all provisioning for a domain (plan downgrade / deletion).
 * Only cleans up the Cloudflare DNS record.
 */
export async function removeDomainProvisioning(
  domain: string,
  dnsRecordId?: string | null
): Promise<boolean> {
  try {
    if (dnsRecordId) {
      await deleteDnsRecord(dnsRecordId);
    } else {
      const records = await listDnsRecords(domain);
      for (const r of records) {
        if (r.content === serverIp() || r.name === domain) {
          await deleteDnsRecord(r.id);
        }
      }
    }
  } catch (err: any) {
    logger.warn(`[DomainProvisioning] DNS cleanup warning: ${err.message}`);
  }
  return true;
}

export async function removeSubdomainProvisioning(
  slug: string,
  dnsRecordId?: string | null
): Promise<boolean> {
  const hostname = `${slug}.${baseDomain()}`;
  return removeDomainProvisioning(hostname, dnsRecordId);
}
