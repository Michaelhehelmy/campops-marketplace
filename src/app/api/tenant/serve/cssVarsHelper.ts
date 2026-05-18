/**
 * cssVarsHelper — extracted so the CSS variable generation logic can be
 * unit-tested independently from the full serve route (which requires fs/path).
 */

function parseJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value as Record<string, any>;
}

/**
 * Builds a compact :root{...} CSS block from site branding settings.
 * Returns null if there are no variables to inject.
 */
export function buildCssVarsForTest(property: { settings?: string | null }): string | null {
  if (!property.settings) return null;
  const settings = parseJson(property.settings);
  const branding = settings?.branding ?? {};
  const colors = branding.colors ?? {};
  const typography = branding.typography ?? {};
  const vars: string[] = [];
  if (colors.primary) vars.push(`--color-primary:${colors.primary}`);
  if (colors.secondary) vars.push(`--color-secondary:${colors.secondary}`);
  if (colors.accent) vars.push(`--color-accent:${colors.accent}`);
  if (colors.background) vars.push(`--color-background:${colors.background}`);
  if (colors.surface) vars.push(`--color-surface:${colors.surface}`);
  if (colors.text) vars.push(`--color-text:${colors.text}`);
  if (colors.textMuted) vars.push(`--color-text-muted:${colors.textMuted}`);
  if (typography.headingFont) vars.push(`--font-heading:${typography.headingFont}`);
  if (typography.bodyFont) vars.push(`--font-body:${typography.bodyFont}`);
  if (vars.length === 0) return null;
  return `:root{${vars.join(';')}}`;
}
