import { describe, it, expect } from 'vitest';
import { signValue, verifySignedValue } from '@/lib/cookie-signing';

describe('cookie-signing', () => {
  it('should sign and verify a value', () => {
    const signed = signValue('admin');
    expect(verifySignedValue(signed)).toBe('admin');
  });

  it('should return null for tampered signature', () => {
    const signed = signValue('admin');
    const tampered = signed.slice(0, -1) + 'x';
    expect(verifySignedValue(tampered)).toBeNull();
  });

  it('should return null for malformed input', () => {
    expect(verifySignedValue('')).toBeNull();
    expect(verifySignedValue('no-dot')).toBeNull();
  });

  it('should return null for empty string after dot', () => {
    expect(verifySignedValue('.')).toBeNull();
  });

  it('should handle empty value', () => {
    const signed = signValue('');
    expect(verifySignedValue(signed)).toBe('');
  });
});
