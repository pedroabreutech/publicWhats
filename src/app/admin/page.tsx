'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CaseMeta } from '@/lib/cms/types';

export default function AdminHomePage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseMeta[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const auth = await fetch('/api/auth').then((r) => r.json());
    if (!auth.admin) {
      router.replace('/admin/login');
      return;
    }
    const data = await fetch('/api/cases?all=1').then((r) => r.json());
    setCases(data.cases || []);
  }

  useEffect(() => {
    void load();
  }, [router]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, published: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Erro ao criar caso');
      return;
    }
    setTitle('');
    setDescription('');
    setOk(`Caso “${data.case.title}” criado.`);
    await load();
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/admin/login');
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>
            ← Site público
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, margin: '0.4rem 0' }}>
            Painel editorial
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Crie um caso (escândalo) e depois adicione conversas vazadas em JSON.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => void logout()}>
          Sair
        </button>
      </header>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Novo caso</h2>
        <form onSubmit={createCase}>
          <div className="field">
            <label htmlFor="title">Título do caso</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Operação XYZ"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="description">Descrição / contexto</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fontes, período, o que o material revela…"
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="ok">{ok}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Criando…' : 'Criar caso'}
          </button>
        </form>
        <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginBottom: 0 }}>
          Em produção na Vercel, configure <code>CMS_PASSWORD</code> e, para gravar dados
          persistentes, <code>BLOB_READ_WRITE_TOKEN</code>. Localmente os casos ficam em{' '}
          <code>data/cms/</code>.
        </p>
      </section>

      <section>
        <h2>Casos</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {cases.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <strong>{c.title}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {c.description || 'Sem descrição'}
                </div>
                <div style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  {c.builtin ? 'Corpus inicial (somente leitura)' : c.published ? 'Publicado' : 'Rascunho'} · {c.id}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Link className="btn" href={`/c/${c.id}`}>
                  Ver
                </Link>
                {!c.builtin ? (
                  <Link className="btn btn-primary" href={`/admin/cases/${c.id}`}>
                    Conversas
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
