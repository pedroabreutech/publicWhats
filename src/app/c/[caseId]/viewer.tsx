'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { ConversationMeta, DateIndexEntry, Message } from '@/lib/cms/types';
import styles from './viewer.module.css';

const OWNER_SENDERS = new Set(['DV', 'Daniel Vorcaro', 'Jair Bolsonaro', 'Lula']);

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hues = [160, 185, 205, 25, 45, 280, 320];
  return `hsl(${hues[Math.abs(hash) % hues.length]} 42% 28%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function CaseViewer({
  caseId,
  caseTitle,
  conversations,
}: {
  caseId: string;
  caseTitle: string;
  conversations: ConversationMeta[];
}) {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [filter, setFilter] = useState('');
  const [dateIndex, setDateIndex] = useState<DateIndexEntry[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Message[]>>({});
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<
    Array<{ id: number; date: string; sender: string; content: string }>
  >([]);
  const [searchIndex, setSearchIndex] = useState<
    Array<{ id: number; date: string; sender: string; content: string; _n?: string }>
  >([]);
  const scroller = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.contact.toLowerCase().includes(q) ||
        c.owner.toLowerCase().includes(q) ||
        (c.last_message?.content || '').toLowerCase().includes(q),
    );
  }, [conversations, filter]);

  const byOwner = useMemo(() => {
    const map = new Map<string, ConversationMeta[]>();
    for (const c of filtered) {
      const o = c.owner || 'Outros';
      if (!map.has(o)) map.set(o, []);
      map.get(o)!.push(c);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'DV') return -1;
      if (b[0] === 'DV') return 1;
      return a[0].localeCompare(b[0], 'pt-BR');
    });
  }, [filtered]);

  const loadDay = useCallback(
    async (convId: string, date: string) => {
      const key = `${convId}:${date}`;
      if (loaded[key]) return loaded[key];
      const res = await fetch(
        `/api/cases/${caseId}/conversations/${convId}?view=day&date=${date}`,
      );
      const data = await res.json();
      const messages = (data.messages || []) as Message[];
      setLoaded((prev) => ({ ...prev, [key]: messages }));
      return messages;
    },
    [caseId, loaded],
  );

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const [idxRes, searchRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/conversations/${activeId}?view=index`),
        fetch(`/api/cases/${caseId}/conversations/${activeId}?view=search`),
      ]);
      const idx = await idxRes.json();
      const search = await searchRes.json();
      if (cancelled) return;
      const dates = (idx.dates || []) as DateIndexEntry[];
      setDateIndex(dates);
      setSearchIndex(Array.isArray(search) ? search : []);
      setLoaded({});
      // load last 5 days
      const recent = dates.slice(-5);
      for (const d of recent) {
        await loadDay(activeId, d.date);
      }
      requestAnimationFrame(() => {
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, caseId]);

  useEffect(() => {
    const q = normalize(searchQ.trim());
    if (!q) {
      setSearchHits([]);
      return;
    }
    const hits = [];
    for (const item of searchIndex) {
      const hay = item._n || normalize(item.content);
      if (hay.includes(q)) {
        hits.push(item);
        if (hits.length >= 40) break;
      }
    }
    setSearchHits(hits);
  }, [searchQ, searchIndex]);

  const visibleDays = dateIndex.filter((d) => loaded[`${activeId}:${d.date}`]);

  async function jumpTo(messageId: number, date: string) {
    if (!activeId) return;
    await loadDay(activeId, date);
    setSearchQ('');
    requestAnimationFrame(() => {
      const el = scroller.current?.querySelector(`[data-id="${messageId}"]`);
      el?.scrollIntoView({ block: 'center' });
      el?.classList.add(styles.highlight);
      setTimeout(() => el?.classList.remove(styles.highlight), 1200);
    });
  }

  async function loadOlder() {
    if (!activeId || !dateIndex.length) return;
    const loadedDates = new Set(
      Object.keys(loaded)
        .filter((k) => k.startsWith(`${activeId}:`))
        .map((k) => k.split(':')[1]),
    );
    const older = [...dateIndex].reverse().filter((d) => !loadedDates.has(d.date)).slice(0, 5);
    const prevHeight = scroller.current?.scrollHeight || 0;
    for (const d of older.reverse()) {
      await loadDay(activeId, d.date);
    }
    requestAnimationFrame(() => {
      if (scroller.current) {
        scroller.current.scrollTop += scroller.current.scrollHeight - prevHeight;
      }
    });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sideHead}>
          <Link href="/" className={styles.back}>
            ← Casos
          </Link>
          <h1>{caseTitle}</h1>
          <input
            className={styles.search}
            placeholder="Filtrar conversas…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className={styles.list}>
          {byOwner.map(([owner, items]) => (
            <div key={owner}>
              <div className={styles.owner}>{owner === 'DV' ? 'Daniel Vorcaro' : owner}</div>
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.item} ${c.id === activeId ? styles.active : ''}`}
                  onClick={() => setActiveId(c.id)}
                >
                  <div
                    className={styles.avatar}
                    style={
                      c.avatar
                        ? {
                            backgroundImage: `url(${c.avatar.startsWith('/') || c.avatar.startsWith('http') ? c.avatar : `/assets/avatar-${c.id}.jpg`})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : { background: avatarColor(c.id) }
                    }
                  >
                    {!c.avatar ? initials(c.contact) : null}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.name}>{c.contact}</div>
                    <div className={styles.preview}>
                      {(c.last_message?.content || `${c.total_messages} msgs`).slice(0, 56)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <section className={styles.main}>
        {!active ? (
          <div className={styles.empty}>Selecione uma conversa</div>
        ) : (
          <>
            <header className={styles.chatHead}>
              <div
                className={styles.avatar}
                style={{ background: avatarColor(active.id) }}
              >
                {initials(active.contact)}
              </div>
              <div>
                <h2>{active.contact}</h2>
                <p>
                  {active.total_messages.toLocaleString('pt-BR')} msgs · {active.source || '—'}
                </p>
              </div>
            </header>
            <div className={styles.messages} ref={scroller}>
              <button type="button" className={styles.loadMore} onClick={() => void loadOlder()}>
                Carregar mensagens anteriores
              </button>
              {visibleDays.map((d) => (
                <div key={d.date} className={styles.day}>
                  <div className={styles.dayLabel}>
                    <span>{formatDateLong(d.date)}</span>
                  </div>
                  {(loaded[`${activeId}:${d.date}`] || []).map((msg) => {
                    const system = msg.type === 'system' || msg.sender === 'system';
                    const out = !system && OWNER_SENDERS.has(msg.sender);
                    return (
                      <div
                        key={msg.id}
                        data-id={msg.id}
                        className={`${styles.row} ${out ? styles.out : ''} ${system ? styles.system : ''}`}
                      >
                        <div className={styles.bubble}>
                          {!system && !out && msg.sender !== active.contact ? (
                            <div className={styles.sender}>{msg.sender}</div>
                          ) : null}
                          <div className={styles.body}>
                            {['image', 'video', 'audio', 'document'].includes(msg.type) &&
                            msg.type === 'audio' &&
                            msg.audio_src ? (
                              <audio controls preload="none" src={msg.audio_src} />
                            ) : ['image', 'video', 'audio', 'document'].includes(msg.type) ? (
                              <span className={styles.media}>
                                [{msg.type}] {msg.content || msg.attachment || ''}
                              </span>
                            ) : (
                              msg.content
                            )}
                          </div>
                          {!system ? (
                            <div className={styles.msgMeta}>{(msg.time || '').slice(0, 5)}</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.toolbar}>
              <input
                type="search"
                placeholder="Buscar nesta conversa…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            {searchHits.length > 0 ? (
              <div className={styles.hits}>
                {searchHits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => void jumpTo(h.id, h.date)}
                  >
                    <small>
                      {h.sender} · {h.date} · #{h.id}
                    </small>
                    <div>{h.content}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
