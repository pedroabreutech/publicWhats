#!/usr/bin/env node
/**
 * Ingest — unpack public export zip into data/raw/conversations/
 * and copy conversations.json + profiles.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT_CONVS = join(RAW, 'conversations');
const OUT_PROFILES = join(ROOT, 'content', 'profiles');
const PUBLIC_EXPORT = join(ROOT, 'public', 'export');
const ZIP_URL = 'https://masterwhats.recomendeme.com.br/export/masterwhats-export.zip';
const INDEX_URL = 'https://masterwhats.recomendeme.com.br/data/conversations.json';

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log(`  skip download (exists): ${dest}`);
    return;
  }
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  mkdirSync(dirname(dest), { recursive: true });
  const file = createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body), file);
}

async function main() {
  mkdirSync(RAW, { recursive: true });
  mkdirSync(OUT_CONVS, { recursive: true });
  mkdirSync(OUT_PROFILES, { recursive: true });
  mkdirSync(PUBLIC_EXPORT, { recursive: true });

  const zipPath = join(RAW, 'masterwhats-export.zip');
  const indexPath = join(RAW, 'conversations.json');

  await download(ZIP_URL, zipPath);
  await download(INDEX_URL, indexPath);

  // Keep a copy of the original zip in public/export for download
  copyFileSync(zipPath, join(PUBLIC_EXPORT, 'arquivozap-export.zip'));

  const buf = readFileSync(zipPath);
  const zip = await JSZip.loadAsync(buf);

  let count = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    // Also mirror md/json into public/export
    if (name.endsWith('.json') || name.endsWith('.md')) {
      const content = await entry.async('nodebuffer');
      const outName = name.replace(/^meses\//, 'meses/').replace(/^masterwhats-/, 'arquivozap-');
      const exportDest = join(PUBLIC_EXPORT, outName);
      mkdirSync(dirname(exportDest), { recursive: true });
      writeFileSync(exportDest, content);
    }

    if (!name.endsWith('.json') || name.startsWith('meses/')) continue;

    const text = await entry.async('string');
    const data = JSON.parse(text);
    const id = data.conversation?.id;
    if (!id) {
      console.warn(`  skip (no conversation.id): ${name}`);
      continue;
    }

    writeFileSync(join(OUT_CONVS, `${id}.json`), JSON.stringify(data, null, 0));
    if (data.profile) {
      writeFileSync(join(OUT_PROFILES, `${id}.json`), JSON.stringify(data.profile, null, 2));
    }
    count++;
    console.log(`  extracted ${id} (${data.messages?.length ?? 0} msgs)`);
  }

  console.log(`Ingest done: ${count} conversations`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
