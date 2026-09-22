import { NextResponse } from 'next/server';
import { getSession } from '@/lib/cms/auth';
import { saveConversationBundle, slugify } from '@/lib/cms/store';
import {
  BUILTIN_CASE_ID,
  listConversationsAdmin,
  listConversationsUnified,
  resolveCase,
} from '@/lib/cms/unified';
import type { ConversationMeta, Message, Profile } from '@/lib/cms/types';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;
  const c = await resolveCase(caseId);
  if (!c) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 });

  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get('admin') === '1';
  if (admin && !session.admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!c.published && !session.admin) {
    return NextResponse.json({ error: 'Caso não publicado' }, { status: 404 });
  }

  const conversations = admin
    ? await listConversationsAdmin(caseId)
    : await listConversationsUnified(caseId);
  return NextResponse.json({ conversations });
}

export async function POST(
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
      { error: 'Não é possível alterar o corpus inicial. Crie um novo caso.' },
      { status: 400 },
    );
  }
  const c = await resolveCase(caseId);
  if (!c || c.builtin) {
    return NextResponse.json({ error: 'Caso inválido' }, { status: 400 });
  }

  const body = await req.json();
  // Accept export format { conversation, messages, profile } or flat fields
  const exportConv = body.conversation || {};
  const messages = (body.messages || []) as Message[];
  const profile = (body.profile || null) as Profile | null;

  const contact = String(body.contact || exportConv.contact || '').trim();
  const owner = String(body.owner || exportConv.owner || 'Outros').trim();
  if (!contact) {
    return NextResponse.json({ error: 'Informe o nome do contato.' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'Envie ao menos uma mensagem no JSON (campo messages).' },
      { status: 400 },
    );
  }

  const id =
    slugify(String(body.id || exportConv.id || contact)) || `conv-${Date.now()}`;

  const conversation: ConversationMeta = {
    id,
    caseId,
    participants: exportConv.participants || [owner, contact],
    contact,
    owner,
    date_range: exportConv.date_range || { start: '', end: '' },
    total_messages: messages.length,
    media_counts: exportConv.media_counts,
    last_message: exportConv.last_message,
    phone: exportConv.phone,
    source: String(body.source || exportConv.source || 'Inserido via painel PublicWhats'),
    note: String(body.note || exportConv.note || ''),
    about: exportConv.about ?? profile?.about ?? null,
    avatar: body.avatar || exportConv.avatar || null,
  };

  try {
    const saved = await saveConversationBundle({
      caseId,
      conversation,
      messages,
      profile,
    });
    return NextResponse.json({ conversation: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao salvar conversa' },
      { status: 500 },
    );
  }
}
