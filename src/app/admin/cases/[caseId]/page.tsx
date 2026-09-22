'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ConversationMeta } from '@/lib/cms/types';

export default function AdminCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [caseTitle, setCaseTitle] = useState(caseId);
  const [contact, setContact] = useState('');
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const auth = await fetch('/api/auth').then((r) => r.json());
    if (!auth.admin) {
      router.replace('/admin/login');
      return;
    }
    const c = await fetch(`/api/cases/${caseId}`).then((r) => r.json());
    if (c.case) setCaseTitle(c.case.title);
    const data = await fetch(`/api/cases/${caseId}/conversations?admin=1`).then((r) => r.json());
    setConversations(data.conversations || []);
  }

  useEffect(() => {
    void load();
  }, [caseId, router]);

  async function onFile(file: File) {
    const text = await file.text();
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.conversation?.contact) setContact(parsed.conversation.contact);
      if (parsed.conversation?.owner) setOwner(parsed.conversation.owner);
      if (parsed.conversation?.source) setSource(parsed.conversation.source);
      if (parsed.conversation?.note) setNote(parsed.conversation.note);
    } catch {
      // keep raw text for user to fix
    }
  }

  async function submit(e: React.FormEvent) {
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
    // merge form overrides
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
    setOk(`Conversa “${data.conversation.contact}” importada (${data.conversation.total_messages} msgs).`);
    setJsonText('');
    await load();
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <Link href="/admin" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>
        ← Painel
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>{caseTitle}</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Envie um JSON no formato de export do PublicWhats/MasterWhats (
        <code>{`{ conversation, messages, profile? }`}</code>) ou um objeto com{' '}
        <code>messages</code> + contato.
      </p>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Adicionar conversa</h2>
        <form onSubmit={submit}>
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
            <label htmlFor="contact">Nome do contato</label>
            <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="owner">Dono do aparelho / bloco</label>
            <input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Ex.: DV, Jair Bolsonaro, Lula…"
            />
          </div>
          <div className="field">
            <label htmlFor="source">Fonte / proveniência</label>
            <input id="source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="note">Nota editorial</label>
            <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="json">JSON das mensagens</label>
            <textarea
              id="json"
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Cole aqui o JSON…'
              required
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="ok">{ok}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Importando…' : 'Importar conversa'}
          </button>
        </form>
      </section>

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
