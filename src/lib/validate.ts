import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<[T, null] | [null, NextResponse]> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (result.success) {
      return [result.data, null];
    }
    return [
      null,
      NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: (result.error as any).issues,
        },
        { status: 400 }
      ),
    ];
  } catch {
    return [
      null,
      NextResponse.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 }),
    ];
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): [T, null] | [null, NextResponse] {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  if (result.success) {
    return [result.data, null];
  }
  return [
    null,
    NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: (result.error as any).issues,
      },
      { status: 400 }
    ),
  ];
}
