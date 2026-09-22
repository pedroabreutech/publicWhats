import { NextResponse } from 'next/server';
import { getSession, checkPassword } from '@/lib/cms/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }
  const session = await getSession();
  session.admin = true;
  await session.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ admin: !!session.admin });
}
