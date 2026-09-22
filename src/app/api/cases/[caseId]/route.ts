import { NextResponse } from 'next/server';
import { getSession } from '@/lib/cms/auth';
import { updateCase } from '@/lib/cms/store';
import { BUILTIN_CASE_ID, resolveCase } from '@/lib/cms/unified';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;
  const c = await resolveCase(caseId);
  if (!c) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 });
  return NextResponse.json({ case: c });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const session = await getSession();
  if (!session.admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { caseId } = await ctx.params;
  if (caseId === BUILTIN_CASE_ID) {
    return NextResponse.json(
      { error: 'O corpus inicial não pode ser editado por aqui.' },
      { status: 400 },
    );
  }
  const body = await req.json();
  try {
    const meta = await updateCase(caseId, {
      title: body.title,
      description: body.description,
      published: body.published,
    });
    return NextResponse.json({ case: meta });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro' },
      { status: 400 },
    );
  }
}
