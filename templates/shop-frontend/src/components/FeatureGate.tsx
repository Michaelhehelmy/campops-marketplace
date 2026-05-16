import React from "react";
import { useFlag } from "@/lib/featureFlags";

interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the named feature flag is enabled.
 * Renders fallback (default: null) when the flag is disabled or still loading.
 *
 * Usage:
 *   <FeatureGate flag="multi_property">
 *     <PropertySwitcher />
 *   </FeatureGate>
 *
 *   <FeatureGate flag="marketplace" fallback={<Navigate to="/" />}>
 *     <MarketplacePage />
 *   </FeatureGate>
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
