import React from 'react';
import { render } from '@testing-library/react';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';

/**
 * Renders a plugin component within the necessary marketplace providers.
 */
export function renderPlugin(
  ui: React.ReactElement,
  options: {
    plugins?: any[];
    locale?: string;
  } = {}
) {
  const { plugins = [], locale = 'en' } = options;

  return render(
    <PluginRegistryProvider initialRegistry={plugins as any}>{ui}</PluginRegistryProvider>
  );
}

/**
 * Mock for PluginShell to test how components respond to slots.
 */
export function MockPluginShell({ name, props, children }: any) {
  return <div data-testid={`slot-${name}`}>{children}</div>;
}
