import { createHmac } from 'crypto';

const COOKIE_SECRET = process.env.COOKIE_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET || 'fallback-dev-only';

export function signValue(value: string): string {
  const sig = createHmac('sha256', COOKIE_SECRET)
    .update(value)
    .digest('base64url');
  return `${value}.${sig}`;
}

export function verifySignedValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.substring(0, lastDot);
  const expectedSigned = signValue(value);
  if (signed !== expectedSigned) return null;
  return value;
}
