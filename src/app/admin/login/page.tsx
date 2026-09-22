'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.admin) router.replace('/admin');
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Falha no login');
      return;
    }
    router.replace('/admin');
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1rem' }}>
      <Link href="/" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '2.4rem' }}>
        Painel PublicWhats
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Acesso para jornalistas. Senha padrão em desenvolvimento: <code>publicwhats</code>
      </p>
      <form className="card" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="password">Senha do painel</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
