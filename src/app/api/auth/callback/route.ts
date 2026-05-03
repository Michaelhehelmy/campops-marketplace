import { NextResponse } from "next/server";

/**
 * POST /api/auth/callback
 * Receives a JWT from client-side login/registration and sets it as
 * a httpOnly cookie so subsequent SSR requests can read the session.
 */
export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: null }));

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("campops_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("campops_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
