import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConversationMeta, DateIndexEntry, Message, Profile } from './types';
import * as store from './store';

const PUBLIC_DATA = join(process.cwd(), 'public', 'data');
export const BUILTIN_CASE_ID = 'arquivo-publico';

export const BUILTIN_CASE = {
  id: BUILTIN_CASE_ID,
  slug: BUILTIN_CASE_ID,
  title: 'Arquivo público (corpus inicial)',
  description:
    'Conversas já reunidas no PublicWhats: Vorcaro/Banco Master, e materiais de Bolsonaro e Lula.',
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
  published: true,
  builtin: true,
};

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function listCasesForPublic() {
  const cms = await store.listPublishedCases();
  return [BUILTIN_CASE, ...cms.filter((c) => c.id !== BUILTIN_CASE_ID)];
}

export async function listCasesForAdmin() {
  const cms = await store.listAllCases();
  return [BUILTIN_CASE, ...cms.filter((c) => c.id !== BUILTIN_CASE_ID)];
}

export async function resolveCase(caseId: string) {
  if (caseId === BUILTIN_CASE_ID || caseId === BUILTIN_CASE.slug) return BUILTIN_CASE;
  return store.getCase(caseId);
}

export async function listConversationsUnified(caseId: string): Promise<ConversationMeta[]> {
  if (caseId === BUILTIN_CASE_ID) {
    const data = await readJson<{ conversations: ConversationMeta[] }>(
      join(PUBLIC_DATA, 'conversations.json'),
      { conversations: [] },
    );
    return (data.conversations || []).map((c) => ({ ...c, caseId: BUILTIN_CASE_ID }));
  }
  const c = await store.getCase(caseId);
  if (!c || !c.published) {
    // admin may still want unpublished — callers check
  }
  return store.listConversations(caseId);
}

export async function listConversationsAdmin(caseId: string): Promise<ConversationMeta[]> {
  if (caseId === BUILTIN_CASE_ID) return listConversationsUnified(caseId);
  return store.listConversations(caseId);
}

export async function getConversationIndexUnified(
  caseId: string,
  convId: string,
): Promise<DateIndexEntry[]> {
  if (caseId === BUILTIN_CASE_ID) {
    const data = await readJson<{ dates: DateIndexEntry[] }>(
      join(PUBLIC_DATA, convId, 'index.json'),
      { dates: [] },
    );
    return data.dates || [];
  }
  return store.getConversationIndex(caseId, convId);
}

export async function getDayMessagesUnified(
  caseId: string,
  convId: string,
  date: string,
): Promise<Message[]> {
  if (caseId === BUILTIN_CASE_ID) {
    const data = await readJson<{ messages: Message[] }>(
      join(PUBLIC_DATA, convId, `${date}.json`),
      { messages: [] },
    );
    return data.messages || [];
  }
  return store.getDayMessages(caseId, convId, date);
}

export async function getSearchIndexUnified(caseId: string, convId: string) {
  if (caseId === BUILTIN_CASE_ID) {
    return readJson(join(PUBLIC_DATA, convId, 'search-index.json'), []);
  }
  return store.getSearchIndex(caseId, convId);
}

export async function getProfileUnified(caseId: string, convId: string): Promise<Profile | null> {
  if (caseId === BUILTIN_CASE_ID) {
    if (!(await exists(join(PUBLIC_DATA, convId, 'profile.json')))) return null;
    return readJson<Profile | null>(join(PUBLIC_DATA, convId, 'profile.json'), null);
  }
  return store.getProfile(caseId, convId);
}

export async function getConversationUnified(caseId: string, convId: string) {
  if (caseId === BUILTIN_CASE_ID) {
    const all = await listConversationsUnified(caseId);
    return all.find((c) => c.id === convId) || null;
  }
  return store.getConversation(caseId, convId);
}
