#!/usr/bin/env node
/**
 * Seed CMS with the existing static corpus as a published case.
 */
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DATA = join(ROOT, 'public', 'data');
const CMS_ROOT = join(ROOT, 'data', 'cms');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function chunkMessages(messages) {
  const byDate = new Map();
  for (const msg of messages) {
    const date = msg.date || String(msg.timestamp || '').slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(msg);
  }
  const datesSorted = [...byDate.keys()].sort();
  const dates = [];
  const searchIndex = [];
  for (const date of datesSorted) {
    const dayMsgs = byDate.get(date);
    dayMsgs.sort((a, b) => a.id - b.id);
    dates.push({
      date,
      message_count: dayMsgs.length,
      first_message_id: dayMsgs[0].id,
      last_message_id: dayMsgs[dayMsgs.length - 1].id,
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

async function saveConversation(caseId, conversation, messages, profile) {
  const convDir = join(CMS_ROOT, 'cases', caseId, 'conversations', conversation.id);
  await mkdir(convDir, { recursive: true });
  const { dates, byDate, searchIndex } = chunkMessages(messages);
  await writeJson(join(convDir, 'meta.json'), { ...conversation, caseId });
  await writeJson(join(convDir, 'index.json'), { dates });
  await writeJson(join(convDir, 'search-index.json'), searchIndex);
  if (profile) await writeJson(join(convDir, 'profile.json'), profile);
  for (const [date, dayMsgs] of byDate) {
    await writeJson(join(convDir, 'days', `${date}.json`), { date, messages: dayMsgs });
  }
}

async function main() {
  await mkdir(CMS_ROOT, { recursive: true });
  const indexPath = join(CMS_ROOT, 'index.json');
  let index = { version: 1, cases: [] };
  if (await exists(indexPath)) {
    index = JSON.parse(await readFile(indexPath, 'utf8'));
  }
  const caseId = 'arquivo-publico';
  if (index.cases.some((c) => c.id === caseId)) {
    console.log('Caso arquivo-publico já existe — pulando seed.');
    return;
  }

  const now = new Date().toISOString();
  index.cases.push({
    id: caseId,
    slug: caseId,
    title: 'Arquivo público (corpus inicial)',
    description:
      'Conversas já reunidas no PublicWhats: Vorcaro/Banco Master, e materiais adicionais de Bolsonaro e Lula.',
    createdAt: now,
    updatedAt: now,
    published: true,
    builtin: true,
  });
  await writeJson(indexPath, index);
  await mkdir(join(CMS_ROOT, 'cases', caseId, 'conversations'), { recursive: true });
  await writeJson(join(CMS_ROOT, 'cases', caseId, 'meta.json'), index.cases.at(-1));

  const list = JSON.parse(await readFile(join(PUBLIC_DATA, 'conversations.json'), 'utf8'));
  for (const conv of list.conversations || []) {
    const convDir = join(PUBLIC_DATA, conv.id);
    if (!(await exists(convDir))) continue;
    const indexData = JSON.parse(await readFile(join(convDir, 'index.json'), 'utf8'));
    const messages = [];
    for (const d of indexData.dates || []) {
      // static corpus uses {date}.json at conv root (not days/)
      const dayPath = join(convDir, `${d.date}.json`);
      if (!(await exists(dayPath))) continue;
      const day = JSON.parse(await readFile(dayPath, 'utf8'));
      messages.push(...(day.messages || []));
    }
    let profile = null;
    const profilePath = join(convDir, 'profile.json');
    if (await exists(profilePath)) {
      profile = JSON.parse(await readFile(profilePath, 'utf8'));
    }
    await saveConversation(caseId, conv, messages, profile);
    console.log('seeded', conv.id, messages.length);
  }
  console.log('Seed OK →', CMS_ROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
