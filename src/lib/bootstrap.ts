import { logger } from './logger';
import { registerBuildListener } from './listeners/buildListener';
import { registerDomainProvisioningListener } from './listeners/domainProvisioningListener';

let bootstrapped = false;

export function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerBuildListener();
  registerDomainProvisioningListener();

  // Safeguard against plugin crashes bringing down the server (PH2-002).
  // Log instead of crashing so the process stays alive for other requests.
  process.on('unhandledRejection', (reason) => {
    logger.error('[bootstrap] Unhandled rejection caught:', reason);
  });
}
