import type { SearchHit } from '../types/message';

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchIndex(
  index: SearchHit[],
  query: string,
  limit = 50,
): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: SearchHit[] = [];
  for (const item of index) {
    const hay = (item as SearchHit & { _n?: string })._n || normalize(item.content);
    if (hay.includes(q)) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }
  return results;
}
