import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PublicWhats',
  description: 'Arquivo público de conversas — leitura e painel editorial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
