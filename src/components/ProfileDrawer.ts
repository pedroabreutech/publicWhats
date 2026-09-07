import type { Conversation, Profile } from '../types/message';
import { escapeHtml, renderInlineMarkdown } from '../lib/format';
import { createAvatarEl } from '../lib/avatar-el';

export function showProfileDrawer(
  host: HTMLElement,
  conversation: Conversation,
  profile: Profile | null,
  onClose: () => void,
): { destroy: () => void } {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.addEventListener('click', onClose);

  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Perfil e proveniência');

  const header = document.createElement('div');
  header.className = 'drawer-header';
  const titleEl = document.createElement('h3');
  titleEl.textContent = 'Perfil';
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'icon-btn';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>`;
  closeBtn.addEventListener('click', onClose);
  header.appendChild(closeBtn);
  drawer.appendChild(header);

  const body = document.createElement('div');
  body.className = 'drawer-body';

  const av = createAvatarEl(conversation.id, conversation.contact, {
    size: 72,
    photoUrl: conversation.avatar,
  });
  av.style.margin = '0 auto 1rem';
  body.appendChild(av);

  const name = document.createElement('h2');
  name.style.textAlign = 'center';
  name.style.margin = '0 0 0.25rem';
  name.style.fontSize = '1.25rem';
  name.textContent = conversation.contact;
  body.appendChild(name);

  if (profile?.about) {
    const about = document.createElement('p');
    about.style.textAlign = 'center';
    about.style.color = 'var(--text-faint)';
    about.textContent = profile.about;
    body.appendChild(about);
  }

  appendHeading(body, 'Proveniência');
  const prov = document.createElement('div');
  prov.className = 'provenance';
  const doc = conversation.source_document;
  prov.innerHTML = `
    <div><strong>Fonte:</strong> ${escapeHtml(conversation.source || 'Não informada')}</div>
    ${conversation.note ? `<div style="margin-top:0.5rem">${escapeHtml(conversation.note)}</div>` : ''}
    ${doc?.sha256 ? `<div style="margin-top:0.5rem"><strong>SHA-256:</strong><br><code>${escapeHtml(doc.sha256)}</code></div>` : ''}
    ${doc?.url ? `<div style="margin-top:0.5rem"><a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">Documento-fonte</a></div>` : ''}
    <div style="margin-top:0.5rem"><strong>Mensagens:</strong> ${conversation.total_messages.toLocaleString('pt-BR')}</div>
    <div><strong>Período:</strong> ${conversation.date_range.start} → ${conversation.date_range.end}</div>
  `;
  body.appendChild(prov);

  if (profile?.sections?.length) {
    for (const section of profile.sections) {
      appendHeading(body, section.title);
      for (const p of section.paragraphs || []) {
        const para = document.createElement('p');
        para.innerHTML = renderInlineMarkdown(p);
        body.appendChild(para);
      }
    }
  }

  if (profile?.sources?.length) {
    appendHeading(body, 'Fontes');
    const ul = document.createElement('ul');
    ul.style.paddingLeft = '1.1rem';
    ul.style.color = 'var(--text-muted)';
    for (const s of profile.sources) {
      const li = document.createElement('li');
      if (typeof s === 'string') {
        li.innerHTML = `<a href="${escapeHtml(s)}" target="_blank" rel="noopener">${escapeHtml(s)}</a>`;
      } else {
        li.innerHTML = `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`;
      }
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  appendHeading(body, 'Exportar');
  const exportP = document.createElement('p');
  exportP.innerHTML = `
    <a href="/export/arquivozap-${conversation.id}.json">JSON</a> ·
    <a href="/export/arquivozap-${conversation.id}.md">Markdown</a>
  `;
  body.appendChild(exportP);

  drawer.appendChild(body);
  host.append(backdrop, drawer);

  return {
    destroy: () => {
      backdrop.remove();
      drawer.remove();
    },
  };
}

function appendHeading(parent: HTMLElement, text: string): void {
  const h = document.createElement('h4');
  h.textContent = text;
  parent.appendChild(h);
}
