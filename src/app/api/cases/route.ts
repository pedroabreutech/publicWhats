import { NextResponse } from 'next/server';
import { getSession } from '@/lib/cms/auth';
import { createCase } from '@/lib/cms/store';
import { listCasesForAdmin, listCasesForPublic } from '@/lib/cms/unified';
import { z } from 'zod';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === '1';
  if (all) {
    const session = await getSession();
    if (!session.admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ cases: await listCasesForAdmin() });
  }
  return NextResponse.json({ cases: await listCasesForPublic() });
}

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const meta = await createCase(parsed.data);
    return NextResponse.json({ case: meta });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao criar caso' },
      { status: 400 },
    );
  }
}
