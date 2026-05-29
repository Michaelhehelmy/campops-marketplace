import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody, validateQuery } from '../validate';

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

const querySchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().min(0),
});

describe('validateBody', () => {
  it('returns parsed data for valid JSON body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'John', age: 30 }),
      headers: { 'content-type': 'application/json' },
    });
    const [data, error] = await validateBody(req, testSchema);
    expect(data).toEqual({ name: 'John', age: 30 });
    expect(error).toBeNull();
  });

  it('returns 400 for invalid body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -1 }),
      headers: { 'content-type': 'application/json' },
    });
    const [data, error] = await validateBody(req, testSchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
    const body = await error!.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: '{invalid json}',
      headers: { 'content-type': 'application/json' },
    });
    const [data, error] = await validateBody(req, testSchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
    const body = await error!.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 400 for missing body', async () => {
    const req = new Request('http://localhost', { method: 'POST' });
    const [data, error] = await validateBody(req, testSchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
  });
});

describe('validateQuery', () => {
  it('returns parsed data for valid query params', () => {
    const params = new URLSearchParams({ name: 'John', age: '30' });
    const [data, error] = validateQuery(params, querySchema);
    expect(data).toEqual({ name: 'John', age: 30 });
    expect(error).toBeNull();
  });

  it('returns 400 for invalid query params', () => {
    const params = new URLSearchParams({ name: '', age: '-1' });
    const [data, error] = validateQuery(params, querySchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
  });

  it('returns 400 for missing required fields', () => {
    const params = new URLSearchParams({});
    const [data, error] = validateQuery(params, querySchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
  });

  it('returns 400 for wrong type', () => {
    const params = new URLSearchParams({ name: 'John', age: 'not-a-number' });
    const [data, error] = validateQuery(params, querySchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
  });
});
