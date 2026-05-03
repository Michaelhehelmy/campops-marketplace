import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Clears the campops_token session cookie.
 */
export async function POST() {
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
