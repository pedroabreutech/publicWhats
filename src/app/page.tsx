import Link from 'next/link';
import { listCasesForPublic } from '@/lib/cms/unified';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cases = await listCasesForPublic();

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Arquivo editorial</p>
          <h1 className={styles.title}>PublicWhats</h1>
          <p className={styles.lead}>
            Navegue pelos casos publicados. Jornalistas podem adicionar novos escândalos e
            conversas pelo painel — sem Git ou terminal.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin">
          Abrir painel
        </Link>
      </header>

      <section className={styles.grid}>
        {cases.map((c) => (
          <Link key={c.id} href={`/c/${c.id}`} className={styles.card}>
            <h2>{c.title}</h2>
            <p>{c.description || 'Sem descrição.'}</p>
            {c.builtin ? <span className={styles.badge}>Corpus inicial</span> : null}
          </Link>
        ))}
      </section>
    </main>
  );
}
