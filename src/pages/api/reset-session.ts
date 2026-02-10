import type { NextApiRequest, NextApiResponse } from 'next';

const buildExpiredCookie = (name: string) =>
  `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookieHeader = req.headers.cookie || '';
  const cookieNames = cookieHeader
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter((name) => name);

  const expiredCookies = cookieNames.map((name) => buildExpiredCookie(name));

  if (expiredCookies.length > 0) {
    res.setHeader('Set-Cookie', expiredCookies);
  }

  res.status(200).json({ ok: true, cleared: cookieNames.length });
}
