import { registerBuildListener } from './listeners/buildListener';
import { registerDomainProvisioningListener } from './listeners/domainProvisioningListener';

let bootstrapped = false;

export function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerBuildListener();
  registerDomainProvisioningListener();
}
