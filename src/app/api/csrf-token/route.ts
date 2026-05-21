import { NextResponse } from 'next/server';

export async function GET() {
  const token = globalThis.crypto.randomUUID();
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set('x-csrf-token', token, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
