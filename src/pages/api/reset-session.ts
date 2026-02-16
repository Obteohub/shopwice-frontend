import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'experimental-edge';

const buildExpiredCookie = (name: string) =>
  `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`;

export default function handler(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieNames = cookieHeader
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter((name) => name);

  const expiredCookies = cookieNames.map((name) => buildExpiredCookie(name));

  const res = NextResponse.json({ ok: true, cleared: cookieNames.length });

  if (expiredCookies.length > 0) {
    // Next.js Edge Runtime handles Set-Cookie via headers
    expiredCookies.forEach(cookie => {
      res.headers.append('Set-Cookie', cookie);
    });
  }

  return res;
}
