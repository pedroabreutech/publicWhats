/**
 * Optional durable storage for Vercel via Blob.
 * When BLOB_READ_WRITE_TOKEN is missing, callers use local filesystem store.
 */
import { put, list } from '@vercel/blob';

export function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function blobPutJson(pathname: string, data: unknown): Promise<string> {
  const blob = await put(pathname, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function blobGetJson<T>(pathname: string, fallback: T): Promise<T> {
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const hit = blobs.find((b) => b.pathname === pathname);
  if (!hit) return fallback;
  const res = await fetch(hit.url, { cache: 'no-store' });
  if (!res.ok) return fallback;
  return (await res.json()) as T;
}
