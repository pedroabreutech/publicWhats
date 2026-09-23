'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ConversationMeta, Message } from '@/lib/cms/types';

type DraftSide = 'contact' | 'owner';
type DraftType = 'text' | 'audio' | 'system';

type DraftMessage = {
  key: string;
  side: DraftSide;
  date: string;
  time: string;
  content: string;
  type: DraftType;
};

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function bumpTime(time: string, minutes = 1): string {
  const [hRaw, mRaw] = time.split(':');
  let h = Number(hRaw) || 0;
  let m = (Number(mRaw) || 0) + minutes;
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function newDraft(from?: DraftMessage | null): DraftMessage {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    side: from?.side === 'contact' ? 'owner' : 'contact',
    date: from?.date || todayDate(),
    time: from ? bumpTime(from.time) : nowTime(),
    content: '',
    type: 'text',
  };
}

function toApiMessages(
  drafts: DraftMessage[],
  contact: string,
  owner: string,
): Message[] {
  return drafts
    .filter((d) => d.content.trim() || d.type === 'system')
    .map((d, i) => {
      const time = d.time.length === 5 ? `${d.time}:00` : d.time || '00:00:00';
      const date = d.date || todayDate();
      const sender =
        d.type === 'system'
          ? 'system'
          : d.side === 'contact'
            ? contact
            : owner || 'Dono do aparelho';
      return {
        id: i + 1,
        date,
        time,
        timestamp: `${date}T${time}`,
        sender,
        content: d.content.trim(),
        type: d.type,
      } satisfies Message;
    });
}

export default function AdminCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [caseTitle, setCaseTitle] = useState(caseId);
  const [contact, setContact] = useState('');
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState<DraftMessage[]>(() => [newDraft()]);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const filledCount = useMemo(
    () => drafts.filter((d) => d.content.trim() || d.type === 'system').length,
    [drafts],
  );

  async function load() {
    const auth = await fetch('/api/auth').then((r) => r.json());
    if (!auth.admin) {
      router.replace('/admin/login');
      return;
    }
    const c = await fetch(`/api/cases/${caseId}`).then((r) => r.json());
    if (c.case) setCaseTitle(c.case.title);
    const data = await fetch(`/api/cases/${caseId}/conversations?admin=1`).then((r) =>
      r.json(),
    );
    setConversations(data.conversations || []);
  }

  useEffect(() => {
    void load();
  }, [caseId, router]);

  function updateDraft(key: string, patch: Partial<DraftMessage>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, newDraft(prev[prev.length - 1] || null)]);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => {
      if (prev.length <= 1) {
        return [newDraft()];
      }
      return prev.filter((d) => d.key !== key);
    });
  }

  function moveDraft(key: string, dir: -1 | 1) {
    setDrafts((prev) => {
      const i = prev.findIndex((d) => d.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  function resetForm() {
    setContact('');
    setOwner('');
    setSource('');
    setNote('');
    setDrafts([newDraft()]);
    setJsonText('');
  }

  async function onFile(file: File) {
    const text = await file.text();
    setJsonText(text);
    setShowJson(true);
    try {
      const parsed = JSON.parse(text);
      if (parsed.conversation?.contact) setContact(parsed.conversation.contact);
      if (parsed.conversation?.owner) setOwner(parsed.conversation.owner);
      if (parsed.conversation?.source) setSource(parsed.conversation.source);
      if (parsed.conversation?.note) setNote(parsed.conversation.note);
      if (Array.isArray(parsed.messages) && parsed.messages.length) {
        const ownerName = String(parsed.conversation?.owner || owner || '').trim();
        const contactName = String(parsed.conversation?.contact || contact || '').trim();
        setDrafts(
          parsed.messages.map((m: Message, idx: number) => {
            const sender = String(m.sender || '');
            const side: DraftSide =
              ownerName && sender === ownerName
                ? 'owner'
                : contactName && sender === contactName
                  ? 'contact'
                  : idx % 2 === 0
                    ? 'contact'
                    : 'owner';
            return {
              key: `${Date.now()}-${idx}`,
              side,
              date: m.date || String(m.timestamp || '').slice(0, 10) || todayDate(),
              time: (m.time || String(m.timestamp || '').slice(11, 16) || nowTime()).slice(0, 5),
              content: String(m.content || ''),
              type: (m.type as DraftType) || 'text',
            } satisfies DraftMessage;
          }),
        );
      }
    } catch {
      // keep raw text for advanced fix
    }
  }

  async function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');

    const contactName = contact.trim();
    const ownerName = owner.trim();
    if (!contactName) {
      setLoading(false);
      setError('Informe o nome do contato (quem aparece na conversa).');
      return;
    }
    if (!ownerName) {
      setLoading(false);
      setError('Informe o dono do aparelho (de quem é o WhatsApp).');
      return;
    }

    const messages = toApiMessages(drafts, contactName, ownerName);
    if (!messages.length) {
      setLoading(false);
      setError('Digite ao menos uma mensagem.');
      return;
    }

    const res = await fetch(`/api/cases/${caseId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: contactName,
        owner: ownerName,
        source: source.trim() || 'Digitado no painel PublicWhats',
        note: note.trim(),
        messages,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Erro ao salvar conversa');
      return;
    }
    setOk(
      `Conversa “${data.conversation.contact}” salva (${data.conversation.total_messages} msgs).`,
    );
    resetForm();
    await load();
  }

  async function submitJson(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      setLoading(false);
      setError('JSON inválido. Cole um arquivo .json válido.');
      return;
    }
    if (contact) {
      payload.contact = contact;
      if (payload.conversation && typeof payload.conversation === 'object') {
        (payload.conversation as Record<string, unknown>).contact = contact;
      }
    }
    if (owner) {
      payload.owner = owner;
      if (payload.conversation && typeof payload.conversation === 'object') {
        (payload.conversation as Record<string, unknown>).owner = owner;
      }
    }
    if (source) payload.source = source;
    if (note) payload.note = note;

    const res = await fetch(`/api/cases/${caseId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Erro ao importar');
      return;
    }
    setOk(
      `Conversa “${data.conversation.contact}” importada (${data.conversation.total_messages} msgs).`,
    );
    resetForm();
    setShowJson(false);
    await load();
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <Link href="/admin" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>
        ← Painel
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>{caseTitle}</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Digite as mensagens a partir dos prints ou anotações. Não é necessário criar arquivo JSON.
      </p>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Digitar conversa</h2>
        <form onSubmit={submitTyped}>
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="contact">Nome do contato *</label>
              <input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Ex.: Silas Malafaia"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="owner">Dono do aparelho *</label>
              <input
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Ex.: DV, Jair Bolsonaro, Lula…"
                required
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="source">Fonte / proveniência</label>
              <input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ex.: print enviado pela redação"
              />
            </div>
            <div className="field">
              <label htmlFor="note">Nota editorial</label>
              <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="msg-editor-head">
            <h3 style={{ margin: 0 }}>Mensagens ({filledCount})</h3>
            <button type="button" className="btn" onClick={addDraft}>
              + Adicionar mensagem
            </button>
          </div>
          <p className="hint">
            Escolha quem falou, preencha data/hora e o texto. A próxima mensagem já sugere
            horário um minuto depois.
          </p>

          <div className="msg-list">
            {drafts.map((d, index) => (
              <div key={d.key} className="msg-row card">
                <div className="msg-row-top">
                  <span className="msg-index">#{index + 1}</span>
                  <div className="sender-toggle" role="group" aria-label="Quem enviou">
                    <button
                      type="button"
                      className={d.side === 'contact' ? 'chip chip-active' : 'chip'}
                      onClick={() => updateDraft(d.key, { side: 'contact', type: 'text' })}
                    >
                      {contact.trim() || 'Contato'}
                    </button>
                    <button
                      type="button"
                      className={d.side === 'owner' ? 'chip chip-active' : 'chip'}
                      onClick={() => updateDraft(d.key, { side: 'owner', type: 'text' })}
                    >
                      {owner.trim() || 'Dono do aparelho'}
                    </button>
                  </div>
                  <select
                    className="type-select"
                    value={d.type}
                    onChange={(e) =>
                      updateDraft(d.key, { type: e.target.value as DraftType })
                    }
                    aria-label="Tipo da mensagem"
                  >
                    <option value="text">Texto</option>
                    <option value="audio">Áudio</option>
                    <option value="system">Sistema</option>
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label htmlFor={`date-${d.key}`}>Data</label>
                    <input
                      id={`date-${d.key}`}
                      type="date"
                      value={d.date}
                      onChange={(e) => updateDraft(d.key, { date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label htmlFor={`time-${d.key}`}>Hora</label>
                    <input
                      id={`time-${d.key}`}
                      type="time"
                      value={d.time}
                      onChange={(e) => updateDraft(d.key, { time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <label htmlFor={`content-${d.key}`}>Texto da mensagem</label>
                  <textarea
                    id={`content-${d.key}`}
                    rows={3}
                    value={d.content}
                    onChange={(e) => updateDraft(d.key, { content: e.target.value })}
                    placeholder="Digite exatamente o que aparece no print…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        addDraft();
                      }
                    }}
                  />
                </div>

                <div className="msg-row-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={index === 0}
                    onClick={() => moveDraft(d.key, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={index === drafts.length - 1}
                    onClick={() => moveDraft(d.key, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeDraft(d.key)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="button" className="btn" onClick={addDraft}>
              + Adicionar mensagem
            </button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar conversa'}
            </button>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Dica: Ctrl/Cmd + Enter no texto adiciona a próxima mensagem.
          </p>
        </form>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setShowJson((v) => !v)}
          aria-expanded={showJson}
        >
          {showJson ? '▾' : '▸'} Importar JSON (avançado)
        </button>
        {showJson ? (
          <form onSubmit={submitJson} style={{ marginTop: '1rem' }}>
            <p className="hint">
              Para quem já tem export no formato{' '}
              <code>{`{ conversation, messages, profile? }`}</code>.
            </p>
            <div className="field">
              <label htmlFor="file">Arquivo JSON</label>
              <input
                id="file"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="json">JSON</label>
              <textarea
                id="json"
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Cole aqui o JSON…"
                required
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Importando…' : 'Importar JSON'}
            </button>
          </form>
        ) : null}
      </section>

      {error ? <p className="error">{error}</p> : null}
      {ok ? <p className="ok">{ok}</p> : null}

      <section>
        <h2>Conversas neste caso ({conversations.length})</h2>
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {conversations.map((c) => (
            <div key={c.id} className="card">
              <strong>{c.contact}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {c.owner} · {c.total_messages} msgs · {c.source || 'sem fonte'}
              </div>
            </div>
          ))}
          {conversations.length === 0 ? (
            <p style={{ color: 'var(--text-faint)' }}>Nenhuma conversa ainda.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
