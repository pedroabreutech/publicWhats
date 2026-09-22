import { mkdir, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  CaseMeta,
  CmsIndex,
  ConversationMeta,
  DateIndexEntry,
  Message,
  Profile,
} from './types';

const ROOT = process.cwd();
export const CMS_ROOT = join(ROOT, 'data', 'cms');

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

function normalize(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function chunkMessages(messages: Message[]): {
  dates: DateIndexEntry[];
  byDate: Map<string, Message[]>;
  searchIndex: Array<{ id: number; date: string; sender: string; content: string; _n: string }>;
} {
  const byDate = new Map<string, Message[]>();
  for (const msg of messages) {
    const date = msg.date || String(msg.timestamp || '').slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(msg);
  }
  const datesSorted = [...byDate.keys()].sort();
  const dates: DateIndexEntry[] = [];
  const searchIndex: Array<{ id: number; date: string; sender: string; content: string; _n: string }> = [];
  for (const date of datesSorted) {
    const dayMsgs = byDate.get(date)!;
    dayMsgs.sort((a, b) => a.id - b.id);
    dates.push({
      date,
      message_count: dayMsgs.length,
      first_message_id: dayMsgs[0]!.id,
      last_message_id: dayMsgs[dayMsgs.length - 1]!.id,
    });
    for (const m of dayMsgs) {
      if (m.type === 'system') continue;
      const content = String(m.content || '').slice(0, 120);
      searchIndex.push({
        id: m.id,
        date,
        sender: m.sender,
        content,
        _n: normalize(content),
      });
    }
  }
  return { dates, byDate, searchIndex };
}

export async function ensureCmsRoot(): Promise<void> {
  await mkdir(CMS_ROOT, { recursive: true });
  const indexPath = join(CMS_ROOT, 'index.json');
  if (!(await exists(indexPath))) {
    await writeJson(indexPath, { version: 1, cases: [] } satisfies CmsIndex);
  }
}

export async function getIndex(): Promise<CmsIndex> {
  await ensureCmsRoot();
  return readJson<CmsIndex>(join(CMS_ROOT, 'index.json'), { version: 1, cases: [] });
}

export async function saveIndex(index: CmsIndex): Promise<void> {
  await writeJson(join(CMS_ROOT, 'index.json'), index);
}

export async function listPublishedCases(): Promise<CaseMeta[]> {
  const index = await getIndex();
  return index.cases.filter((c) => c.published).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllCases(): Promise<CaseMeta[]> {
  const index = await getIndex();
  return [...index.cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCase(caseId: string): Promise<CaseMeta | null> {
  const index = await getIndex();
  return index.cases.find((c) => c.id === caseId || c.slug === caseId) || null;
}

export async function createCase(input: {
  title: string;
  description?: string;
  slug?: string;
  published?: boolean;
}): Promise<CaseMeta> {
  const index = await getIndex();
  const now = new Date().toISOString();
  const id = input.slug
    ? slugify(input.slug)
    : slugify(input.title) || `caso-${Date.now()}`;
  if (index.cases.some((c) => c.id === id || c.slug === id)) {
    throw new Error('Já existe um caso com esse identificador.');
  }
  const meta: CaseMeta = {
    id,
    slug: id,
    title: input.title.trim(),
    description: (input.description || '').trim(),
    createdAt: now,
    updatedAt: now,
    published: input.published ?? true,
    builtin: false,
  };
  await mkdir(join(CMS_ROOT, 'cases', id, 'conversations'), { recursive: true });
  await writeJson(join(CMS_ROOT, 'cases', id, 'meta.json'), meta);
  index.cases.push(meta);
  await saveIndex(index);
  return meta;
}

export async function updateCase(
  caseId: string,
  patch: Partial<Pick<CaseMeta, 'title' | 'description' | 'published'>>,
): Promise<CaseMeta> {
  const index = await getIndex();
  const idx = index.cases.findIndex((c) => c.id === caseId);
  if (idx < 0) throw new Error('Caso não encontrado.');
  const current = index.cases[idx]!;
  const updated: CaseMeta = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  index.cases[idx] = updated;
  await saveIndex(index);
  await writeJson(join(CMS_ROOT, 'cases', caseId, 'meta.json'), updated);
  return updated;
}

export async function listConversations(caseId: string): Promise<ConversationMeta[]> {
  const dir = join(CMS_ROOT, 'cases', caseId, 'conversations');
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const out: ConversationMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const meta = await readJson<ConversationMeta | null>(
      join(dir, e.name, 'meta.json'),
      null,
    );
    if (meta) out.push(meta);
  }
  return out.sort((a, b) => (b.last_message?.timestamp || '').localeCompare(a.last_message?.timestamp || ''));
}

export async function getConversation(
  caseId: string,
  convId: string,
): Promise<ConversationMeta | null> {
  return readJson<ConversationMeta | null>(
    join(CMS_ROOT, 'cases', caseId, 'conversations', convId, 'meta.json'),
    null,
  );
}

export async function saveConversationBundle(input: {
  caseId: string;
  conversation: ConversationMeta;
  messages: Message[];
  profile?: Profile | null;
}): Promise<ConversationMeta> {
  const { caseId, messages, profile } = input;
  const conversation = { ...input.conversation, caseId };
  const convDir = join(CMS_ROOT, 'cases', caseId, 'conversations', conversation.id);
  await mkdir(convDir, { recursive: true });

  // normalize message ids/dates
  const normalized = messages.map((m, i) => {
    const date = m.date || String(m.timestamp || '').slice(0, 10);
    const time = m.time || String(m.timestamp || '').slice(11, 19) || '00:00:00';
    return {
      ...m,
      id: typeof m.id === 'number' ? m.id : i + 1,
      date,
      time,
      timestamp: m.timestamp || `${date}T${time}`,
      type: m.type || 'text',
      content: m.content ?? '',
      sender: m.sender || 'desconhecido',
    } satisfies Message;
  });

  if (normalized.length) {
    const dates = normalized.map((m) => m.date).sort();
    conversation.date_range = { start: dates[0]!, end: dates[dates.length - 1]! };
    conversation.total_messages = normalized.length;
    const last = normalized[normalized.length - 1]!;
    conversation.last_message = {
      content: last.content.slice(0, 80),
      timestamp: last.timestamp,
      sender: last.sender,
    };
  } else {
    conversation.total_messages = 0;
    conversation.date_range = conversation.date_range || { start: '', end: '' };
  }

  const { dates, byDate, searchIndex } = chunkMessages(normalized);
  await writeJson(join(convDir, 'meta.json'), conversation);
  await writeJson(join(convDir, 'index.json'), { dates });
  await writeJson(join(convDir, 'search-index.json'), searchIndex);
  if (profile) await writeJson(join(convDir, 'profile.json'), profile);

  for (const [date, dayMsgs] of byDate) {
    await writeJson(join(convDir, 'days', `${date}.json`), { date, messages: dayMsgs });
  }

  const index = await getIndex();
  const c = index.cases.find((x) => x.id === caseId);
  if (c) {
    c.updatedAt = new Date().toISOString();
    await saveIndex(index);
  }
  return conversation;
}

export async function getDayMessages(
  caseId: string,
  convId: string,
  date: string,
): Promise<Message[]> {
  const data = await readJson<{ messages: Message[] }>(
    join(CMS_ROOT, 'cases', caseId, 'conversations', convId, 'days', `${date}.json`),
    { messages: [] },
  );
  return data.messages || [];
}

export async function getConversationIndex(caseId: string, convId: string): Promise<DateIndexEntry[]> {
  const data = await readJson<{ dates: DateIndexEntry[] }>(
    join(CMS_ROOT, 'cases', caseId, 'conversations', convId, 'index.json'),
    { dates: [] },
  );
  return data.dates || [];
}

export async function getSearchIndex(caseId: string, convId: string) {
  return readJson(
    join(CMS_ROOT, 'cases', caseId, 'conversations', convId, 'search-index.json'),
    [],
  );
}

export async function getProfile(caseId: string, convId: string): Promise<Profile | null> {
  return readJson<Profile | null>(
    join(CMS_ROOT, 'cases', caseId, 'conversations', convId, 'profile.json'),
    null,
  );
}

/** Public flat conversation list for a case (viewer sidebar). */
export async function publicConversationsForCase(caseId: string): Promise<ConversationMeta[]> {
  const c = await getCase(caseId);
  if (!c || !c.published) return [];
  return listConversations(caseId);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
