import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  admin?: boolean;
}

const password =
  process.env.CMS_SECRET ||
  process.env.CMS_PASSWORD ||
  'publicwhats-dev-secret-change-me-32chars!!';

export const sessionOptions: SessionOptions = {
  password: password.length >= 32 ? password : password.padEnd(32, '!'),
  cookieName: 'pw_cms',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 14,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.admin) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.CMS_PASSWORD || 'publicwhats';
  return input === expected;
}
