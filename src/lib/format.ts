const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatSidebarTime(timestamp: string): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    const datePart = timestamp.slice(0, 10);
    return formatDateShort(datePart);
  }
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function linkify(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

/** Simple markdown-ish links [text](url) → <a> */
export function renderInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hues = [160, 185, 205, 25, 45, 280, 320];
  const hue = hues[Math.abs(hash) % hues.length]!;
  return `hsl(${hue} 42% 28%)`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '…';
}

/** Outgoing senders for bubble alignment (owner of the phone) */
export const OWNER_SENDERS = new Set([
  'DV',
  'Daniel Vorcaro',
  'Jair Bolsonaro',
  'Lula',
]);
