import { NextResponse } from 'next/server';
import {
  getConversationIndexUnified,
  getConversationUnified,
  getDayMessagesUnified,
  getProfileUnified,
  getSearchIndexUnified,
  resolveCase,
} from '@/lib/cms/unified';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ caseId: string; convId: string }> },
) {
  const { caseId, convId } = await ctx.params;
  const c = await resolveCase(caseId);
  if (!c || !c.published) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'meta';
  const date = searchParams.get('date');

  if (view === 'index') {
    return NextResponse.json({ dates: await getConversationIndexUnified(caseId, convId) });
  }
  if (view === 'search') {
    return NextResponse.json(await getSearchIndexUnified(caseId, convId));
  }
  if (view === 'profile') {
    return NextResponse.json({ profile: await getProfileUnified(caseId, convId) });
  }
  if (view === 'day' && date) {
    return NextResponse.json({
      date,
      messages: await getDayMessagesUnified(caseId, convId, date),
    });
  }

  const conversation = await getConversationUnified(caseId, convId);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}
