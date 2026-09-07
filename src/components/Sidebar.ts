import type { Conversation } from '../types/message';
import { formatSidebarTime, truncate } from '../lib/format';
import { createAvatarEl } from '../lib/avatar-el';

const OWNER_LABELS: Record<string, string> = {
  DV: 'Daniel Vorcaro',
  'Jair Bolsonaro': 'Jair Bolsonaro',
  Lula: 'Lula',
};

export function renderSidebar(
  root: HTMLElement,
  conversations: Conversation[],
  {
    activeId,
    onSelect,
    onFilter,
  }: {
    activeId: string | null;
    onSelect: (id: string) => void;
    onFilter: (term: string) => void;
  },
): void {
  root.innerHTML = '';
  root.className = 'sidebar';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  header.innerHTML = `
    <div class="brand">
      <div class="brand-name">PublicWhats</div>
    </div>
  `;

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'sidebar-search';
  search.placeholder = 'Filtrar conversas…';
  search.addEventListener('input', () => onFilter(search.value));
  header.appendChild(search);
  root.appendChild(header);

  const list = document.createElement('div');
  list.className = 'sidebar-list';
  list.id = 'sidebar-list';

  const byOwner = new Map<string, Conversation[]>();
  for (const c of conversations) {
    const owner = c.owner || 'Outros';
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner)!.push(c);
  }

  const owners = [...byOwner.keys()].sort((a, b) => {
    if (a === 'DV') return -1;
    if (b === 'DV') return 1;
    return a.localeCompare(b, 'pt-BR');
  });

  for (const owner of owners) {
    const group = document.createElement('div');
    group.className = 'owner-group';
    const label = document.createElement('div');
    label.className = 'owner-label';
    label.textContent = OWNER_LABELS[owner] || owner;
    group.appendChild(label);

    for (const conv of byOwner.get(owner)!) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `conv-item${conv.id === activeId ? ' active' : ''}`;
      btn.dataset.id = conv.id;

      const av = createAvatarEl(conv.id, conv.contact, { photoUrl: conv.avatar });

      const meta = document.createElement('div');
      meta.className = 'conv-meta';
      meta.innerHTML = `
        <div class="conv-name">${escapeHtml(conv.contact)}</div>
        <div class="conv-preview">${escapeHtml(truncate(conv.last_message?.content || `${conv.total_messages} mensagens`, 56))}</div>
      `;

      const time = document.createElement('div');
      time.className = 'conv-time';
      time.textContent = formatSidebarTime(conv.last_message?.timestamp || conv.date_range.end);

      btn.append(av, meta, time);
      btn.addEventListener('click', () => onSelect(conv.id));
      group.appendChild(btn);
    }
    list.appendChild(group);
  }

  root.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = `
    <div>${conversations.length} conversas · corpus público</div>
    <div><a href="/export/publicwhats-export.zip">Baixar export (.zip)</a></div>
  `;
  root.appendChild(footer);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function filterSidebar(term: string): void {
  const q = term.trim().toLowerCase();
  const list = document.getElementById('sidebar-list');
  if (!list) return;
  for (const item of list.querySelectorAll<HTMLElement>('.conv-item')) {
    const name = item.querySelector('.conv-name')?.textContent?.toLowerCase() || '';
    const preview = item.querySelector('.conv-preview')?.textContent?.toLowerCase() || '';
    item.style.display = !q || name.includes(q) || preview.includes(q) ? '' : 'none';
  }
  for (const group of list.querySelectorAll<HTMLElement>('.owner-group')) {
    const visible = [...group.querySelectorAll<HTMLElement>('.conv-item')].some(
      (el) => el.style.display !== 'none',
    );
    group.style.display = visible ? '' : 'none';
  }
}
