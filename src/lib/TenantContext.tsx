'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  plan: string;
  branding?: any;
  settings?: any;
}

interface TenantContextValue {
  tenant: TenantInfo | null;
  isTenantDomain: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isTenantDomain: false,
});

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantInfo | null;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ tenant, isTenantDomain: tenant !== null }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
