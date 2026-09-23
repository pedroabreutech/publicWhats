/**
 * Durable JSON storage via Vercel Blob.
 * When BLOB_READ_WRITE_TOKEN is missing, the CMS store uses the local filesystem.
 */
import { put, list, head, del } from '@vercel/blob';

const PREFIX = 'cms/';

export function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function blobPath(key: string): string {
  return `${PREFIX}${key.replace(/^\/+/, '')}`;
}

export async function blobPutJson(key: string, data: unknown): Promise<string> {
  const blob = await put(blobPath(key), JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    // CMS data changes often; avoid month-long stale cache
    cacheControlMaxAge: 60,
  });
  return blob.url;
}

export async function blobGetJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const meta = await head(blobPath(key));
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function blobExists(key: string): Promise<boolean> {
  try {
    await head(blobPath(key));
    return true;
  } catch {
    return false;
  }
}

/** List all blob pathnames under a logical CMS key prefix (no leading cms/). */
export async function blobListKeys(keyPrefix: string): Promise<string[]> {
  const prefix = blobPath(keyPrefix.endsWith('/') ? keyPrefix : `${keyPrefix}/`);
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) {
      if (b.pathname.startsWith(PREFIX)) {
        keys.push(b.pathname.slice(PREFIX.length));
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

/** Delete every blob under a logical CMS key prefix (e.g. cases/foo). */
export async function blobDeletePrefix(keyPrefix: string): Promise<void> {
  const keys = await blobListKeys(keyPrefix);
  // Also remove a blob that matches the prefix exactly (rare for folders).
  const exact = keyPrefix.replace(/\/+$/, '');
  if (await blobExists(exact)) keys.push(exact);
  if (!keys.length) return;
  const pathnames = [...new Set(keys.map((k) => blobPath(k)))];
  // del accepts batches; chunk to stay safe
  const chunkSize = 100;
  for (let i = 0; i < pathnames.length; i += chunkSize) {
    await del(pathnames.slice(i, i + chunkSize));
  }
}
