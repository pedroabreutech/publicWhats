#!/usr/bin/env node
/**
 * Chunk — split each conversation into per-date JSON + search index
 * under public/data/{id}/.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_CONVS = join(ROOT, 'data', 'raw', 'conversations');
const INDEX_SRC = join(ROOT, 'data', 'raw', 'conversations.json');
const PUBLIC_DATA = join(ROOT, 'public', 'data');
const PROFILES = join(ROOT, 'content', 'profiles');

function normalizeForSearch(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function chunkConversation(id, messages) {
  const byDate = new Map();
  for (const msg of messages) {
    const date = msg.date || String(msg.timestamp || '').slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(msg);
  }

  const dates = [...byDate.keys()].sort();
  const outDir = join(PUBLIC_DATA, id);
  mkdirSync(outDir, { recursive: true });

  const index = [];
  const searchIndex = [];

  for (const date of dates) {
    const dayMsgs = byDate.get(date);
    dayMsgs.sort((a, b) => a.id - b.id);
    writeFileSync(
      join(outDir, `${date}.json`),
      JSON.stringify({ date, messages: dayMsgs }),
    );
    index.push({
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
        _n: normalizeForSearch(content),
      });
    }
  }

  writeFileSync(join(outDir, 'index.json'), JSON.stringify({ dates: index }));
  writeFileSync(join(outDir, 'search-index.json'), JSON.stringify(searchIndex));

  // Attach profile if available
  const profilePath = join(PROFILES, `${id}.json`);
  if (existsSync(profilePath)) {
    writeFileSync(join(outDir, 'profile.json'), readFileSync(profilePath));
  }

  return { days: dates.length, messages: messages.length };
}

function main() {
  if (!existsSync(RAW_CONVS)) {
    console.error('Run npm run ingest first');
    process.exit(1);
  }

  mkdirSync(PUBLIC_DATA, { recursive: true });

  const indexData = JSON.parse(readFileSync(INDEX_SRC, 'utf8'));
  const conversations = indexData.conversations || [];

  // Enrich conversations with profile about snippet if present
  for (const conv of conversations) {
    const profilePath = join(PROFILES, `${conv.id}.json`);
    if (existsSync(profilePath)) {
      const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
      conv.about = profile.about || null;
    }
  }

  writeFileSync(
    join(PUBLIC_DATA, 'conversations.json'),
    JSON.stringify({ conversations, format_version: 1, site: 'ArquivoZap' }, null, 2),
  );

  const files = readdirSync(RAW_CONVS).filter((f) => f.endsWith('.json'));
  let totalMsgs = 0;
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(RAW_CONVS, file), 'utf8'));
    const id = data.conversation?.id || file.replace(/\.json$/, '');
    const messages = data.messages || [];
    const stats = chunkConversation(id, messages);
    totalMsgs += stats.messages;
    console.log(`  ${id}: ${stats.messages} msgs / ${stats.days} days`);
  }

  console.log(`Chunk done: ${files.length} conversations, ${totalMsgs} messages`);
}

main();
