import { mkdir, readFile, writeFile, readdir, access, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  CaseMeta,
  CmsIndex,
  ConversationMeta,
  DateIndexEntry,
  Message,
  Profile,
} from './types';
import {
  blobEnabled,
  blobExists,
  blobDeletePrefix,
  blobGetJson,
  blobListKeys,
  blobPutJson,
} from './blob';

const ROOT = process.cwd();
export const CMS_ROOT = join(ROOT, 'data', 'cms');

function useBlob(): boolean {
  return blobEnabled();
}

function assertWritable(): void {
  if (process.env.VERCEL && !blobEnabled()) {
    throw new Error(
      'Na Vercel o filesystem não persiste. Configure BLOB_READ_WRITE_TOKEN (Vercel Blob) para criar/editar casos.',
    );
  }
}

async function fsExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readCmsJson<T>(key: string, fallback: T): Promise<T> {
  if (useBlob()) return blobGetJson<T>(key, fallback);
  try {
    const raw = await readFile(join(CMS_ROOT, key), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeCmsJson(key: string, data: unknown): Promise<void> {
  assertWritable();
  if (useBlob()) {
    await blobPutJson(key, data);
    return;
  }
  const path = join(CMS_ROOT, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

async function cmsKeyExists(key: string): Promise<boolean> {
  if (useBlob()) return blobExists(key);
  return fsExists(join(CMS_ROOT, key));
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
  const searchIndex: Array<{
    id: number;
    date: string;
    sender: string;
    content: string;
    _n: string;
  }> = [];
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
  if (useBlob()) {
    if (!(await blobExists('index.json'))) {
      await blobPutJson('index.json', { version: 1, cases: [] } satisfies CmsIndex);
    }
    return;
  }
  await mkdir(CMS_ROOT, { recursive: true });
  if (!(await fsExists(join(CMS_ROOT, 'index.json')))) {
    await writeCmsJson('index.json', { version: 1, cases: [] } satisfies CmsIndex);
  }
}

export async function getIndex(): Promise<CmsIndex> {
  await ensureCmsRoot();
  return readCmsJson<CmsIndex>('index.json', { version: 1, cases: [] });
}

export async function saveIndex(index: CmsIndex): Promise<void> {
  await writeCmsJson('index.json', index);
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
  await writeCmsJson(`cases/${id}/meta.json`, meta);
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
  await writeCmsJson(`cases/${caseId}/meta.json`, updated);
  return updated;
}

export async function deleteCase(caseId: string): Promise<void> {
  assertWritable();
  const index = await getIndex();
  const idx = index.cases.findIndex((c) => c.id === caseId || c.slug === caseId);
  if (idx < 0) throw new Error('Caso não encontrado.');
  const meta = index.cases[idx]!;
  if (meta.builtin) {
    throw new Error('O corpus inicial não pode ser excluído.');
  }
  const id = meta.id;
  index.cases.splice(idx, 1);
  await saveIndex(index);

  if (useBlob()) {
    await blobDeletePrefix(`cases/${id}`);
    return;
  }
  const dir = join(CMS_ROOT, 'cases', id);
  if (await fsExists(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function listConversations(caseId: string): Promise<ConversationMeta[]> {
  const out: ConversationMeta[] = [];

  if (useBlob()) {
    const keys = await blobListKeys(`cases/${caseId}/conversations`);
    const metaKeys = keys.filter((k) => /\/conversations\/[^/]+\/meta\.json$/.test(k));
    for (const key of metaKeys) {
      const meta = await readCmsJson<ConversationMeta | null>(key, null);
      if (meta) out.push(meta);
    }
  } else {
    const dir = join(CMS_ROOT, 'cases', caseId, 'conversations');
    if (!(await fsExists(dir))) return [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const meta = await readCmsJson<ConversationMeta | null>(
        `cases/${caseId}/conversations/${e.name}/meta.json`,
        null,
      );
      if (meta) out.push(meta);
    }
  }

  return out.sort((a, b) =>
    (b.last_message?.timestamp || '').localeCompare(a.last_message?.timestamp || ''),
  );
}

export async function getConversation(
  caseId: string,
  convId: string,
): Promise<ConversationMeta | null> {
  return readCmsJson<ConversationMeta | null>(
    `cases/${caseId}/conversations/${convId}/meta.json`,
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
  const base = `cases/${caseId}/conversations/${conversation.id}`;

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

  const writes: Array<Promise<void>> = [
    writeCmsJson(`${base}/meta.json`, conversation),
    writeCmsJson(`${base}/index.json`, { dates }),
    writeCmsJson(`${base}/search-index.json`, searchIndex),
  ];
  if (profile) writes.push(writeCmsJson(`${base}/profile.json`, profile));
  for (const [date, dayMsgs] of byDate) {
    writes.push(writeCmsJson(`${base}/days/${date}.json`, { date, messages: dayMsgs }));
  }
  await Promise.all(writes);

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
  const data = await readCmsJson<{ messages: Message[] }>(
    `cases/${caseId}/conversations/${convId}/days/${date}.json`,
    { messages: [] },
  );
  return data.messages || [];
}

export async function getConversationIndex(
  caseId: string,
  convId: string,
): Promise<DateIndexEntry[]> {
  const data = await readCmsJson<{ dates: DateIndexEntry[] }>(
    `cases/${caseId}/conversations/${convId}/index.json`,
    { dates: [] },
  );
  return data.dates || [];
}

export async function getSearchIndex(caseId: string, convId: string) {
  return readCmsJson(
    `cases/${caseId}/conversations/${convId}/search-index.json`,
    [],
  );
}

export async function getProfile(caseId: string, convId: string): Promise<Profile | null> {
  if (!(await cmsKeyExists(`cases/${caseId}/conversations/${convId}/profile.json`))) {
    return null;
  }
  return readCmsJson<Profile | null>(
    `cases/${caseId}/conversations/${convId}/profile.json`,
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
