import type { Conversation, Message } from '../types/message';
import { DataStore } from '../lib/data-store';
import { ScrollLoader } from '../lib/scroll-loader';
import { HashRouter } from '../lib/router';
import { searchIndex } from '../lib/search';
import { debounce } from '../lib/utils';
import {
  OWNER_SENDERS,
  escapeHtml,
  formatDateLong,
  formatTime,
  linkify,
  copyText,
} from '../lib/format';
import { parseAudioTranscript, resolveAudioSrc } from '../lib/media';
import { createAvatarEl } from '../lib/avatar-el';
import { showContextMenu } from './ContextMenu';
import { showToast } from './Toast';

export interface ChatViewHandle {
  destroy: () => void;
  scrollToMessage: (messageId: string | number, date?: string) => Promise<void>;
  scrollToDate: (date: string) => Promise<void>;
}

export async function renderChatView(
  root: HTMLElement,
  store: DataStore,
  conversation: Conversation,
  {
    onBack,
    onOpenProfile,
    initialMessageId,
  }: {
    onBack: () => void;
    onOpenProfile: () => void;
    initialMessageId?: string | null;
  },
): Promise<ChatViewHandle> {
  root.innerHTML = '';
  root.className = 'chat-view';

  const header = document.createElement('header');
  header.className = 'chat-header';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'icon-btn back-btn';
  back.setAttribute('aria-label', 'Voltar');
  back.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  back.addEventListener('click', onBack);

  const av = createAvatarEl(conversation.id, conversation.contact, {
    photoUrl: conversation.avatar,
  });
  av.style.cursor = 'pointer';
  av.addEventListener('click', onOpenProfile);

  const info = document.createElement('div');
  info.className = 'chat-header-info';
  info.innerHTML = `
    <h2>${escapeHtml(conversation.contact)}</h2>
    <div class="chat-header-sub">${conversation.total_messages.toLocaleString('pt-BR')} mensagens · ${formatDateLong(conversation.date_range.start)} — ${formatDateLong(conversation.date_range.end)}</div>
  `;
  info.style.cursor = 'pointer';
  info.addEventListener('click', onOpenProfile);

  const actions = document.createElement('div');
  actions.className = 'chat-header-actions';
  const profileBtn = document.createElement('button');
  profileBtn.type = 'button';
  profileBtn.className = 'icon-btn';
  profileBtn.title = 'Perfil e proveniência';
  profileBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
  profileBtn.addEventListener('click', onOpenProfile);
  actions.appendChild(profileBtn);

  header.append(back, av, info, actions);
  root.appendChild(header);

  const messagesEl = document.createElement('div');
  messagesEl.className = 'chat-messages';
  messagesEl.setAttribute('role', 'log');
  root.appendChild(messagesEl);

  const toolbar = document.createElement('div');
  toolbar.className = 'chat-toolbar';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar nesta conversa…';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.title = 'Ir para data';
  dateInput.min = conversation.date_range.start;
  dateInput.max = conversation.date_range.end;
  toolbar.append(searchInput, dateInput);
  root.appendChild(toolbar);

  const resultsEl = document.createElement('div');
  resultsEl.className = 'search-results';
  resultsEl.hidden = true;
  root.appendChild(resultsEl);

  const dateIndex = await store.getConversationIndex(conversation.id);

  const renderDay = (date: string, messages: Message[]): HTMLElement => {
    const section = document.createElement('section');
    section.className = 'chat-day';
    section.dataset.date = date;

    const divider = document.createElement('div');
    divider.className = 'day-divider';
    divider.innerHTML = `<span>${formatDateLong(date)}</span>`;
    section.appendChild(divider);

    for (const msg of messages) {
      section.appendChild(renderMessage(msg, conversation));
    }
    return section;
  };

  const loader = new ScrollLoader({
    container: messagesEl,
    dateIndex,
    loadMessages: (date) => store.getMessages(conversation.id, date),
    renderDay,
  });

  await loader.init();

  if (initialMessageId) {
    const date = await store.findDateForMessage(conversation.id, initialMessageId);
    if (date) await loader.scrollToMessage(initialMessageId, date);
  }

  // Context menu
  messagesEl.addEventListener('contextmenu', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.chat-msg-row');
    if (!row || row.classList.contains('system')) return;
    e.preventDefault();
    const id = row.dataset.id!;
    const content = row.dataset.content || '';
    showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Copiar texto',
        action: async () => {
          await copyText(content);
          showToast('Texto copiado');
        },
      },
      {
        label: 'Copiar link',
        action: async () => {
          await copyText(HashRouter.messageUrl(conversation.id, id));
          showToast('Link copiado');
        },
      },
      {
        label: 'Detalhes',
        action: () => {
          const cite = row.dataset.cite;
          showToast(cite ? `msg ${id} · ${cite}` : `msg ${id}`);
        },
      },
    ]);
  });

  // Search
  let searchCache = await store.getSearchIndex(conversation.id);
  const runSearch = debounce(() => {
    const q = searchInput.value;
    if (!q.trim()) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      return;
    }
    const hits = searchIndex(searchCache, q, 40);
    resultsEl.innerHTML = '';
    if (hits.length === 0) {
      resultsEl.innerHTML = `<div class="search-hit"><div class="search-hit-meta">Nenhum resultado</div></div>`;
      resultsEl.hidden = false;
      return;
    }
    for (const hit of hits) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-hit';
      btn.innerHTML = `
        <div class="search-hit-meta">${escapeHtml(hit.sender)} · ${hit.date} · #${hit.id}</div>
        <div>${escapeHtml(hit.content)}</div>
      `;
      btn.addEventListener('click', () => {
        resultsEl.hidden = true;
        void loader.scrollToMessage(hit.id, hit.date);
      });
      resultsEl.appendChild(btn);
    }
    resultsEl.hidden = false;
  }, 180);

  searchInput.addEventListener('input', runSearch);
  dateInput.addEventListener('change', () => {
    if (dateInput.value) void loader.scrollToDate(dateInput.value);
  });

  return {
    destroy: () => {
      loader.destroy();
      root.innerHTML = '';
    },
    scrollToMessage: async (messageId, date) => {
      const d = date || (await store.findDateForMessage(conversation.id, messageId));
      if (d) await loader.scrollToMessage(messageId, d);
    },
    scrollToDate: (date) => loader.scrollToDate(date),
  };
}

function renderMessage(msg: Message, conversation: Conversation): HTMLElement {
  const row = document.createElement('div');
  const isSystem = msg.type === 'system' || msg.sender === 'system';
  const isOut = !isSystem && OWNER_SENDERS.has(msg.sender);
  row.className = `chat-msg-row${isOut ? ' out' : ''}${isSystem ? ' system' : ''}`;
  row.dataset.id = String(msg.id);
  row.dataset.content = msg.content || '';
  if (msg.source_page != null) {
    row.dataset.cite = `laudo p. ${msg.source_page}${msg.source_figure != null ? `, fig. ${msg.source_figure}` : ''}`;
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (!isSystem && !isOut && msg.sender !== conversation.contact) {
    const sender = document.createElement('div');
    sender.className = 'bubble-sender';
    sender.textContent = msg.sender;
    bubble.appendChild(sender);
  }

  const body = document.createElement('div');
  body.className = 'bubble-body';

  if (msg.type === 'audio') {
    body.appendChild(renderAudioBody(msg));
  } else if (['image', 'video', 'sticker', 'document'].includes(msg.type)) {
    const ph = document.createElement('div');
    ph.className = 'media-placeholder';
    ph.textContent = `[${msg.type}] ${msg.content || msg.attachment || ''}`.trim();
    body.appendChild(ph);
  } else if (msg.type === 'deleted') {
    body.innerHTML = '<em>Mensagem apagada</em>';
  } else {
    body.innerHTML = linkify(msg.content || '');
  }
  bubble.appendChild(body);

  if (!isSystem) {
    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    let cite = '';
    if (msg.source_page != null) {
      cite = `<span class="source-cite">p.${msg.source_page}${msg.source_figure != null ? `/f.${msg.source_figure}` : ''}</span>`;
    }
    meta.innerHTML = `${cite}<span>${formatTime(msg.time || '')}</span>`;
    bubble.appendChild(meta);
  }

  row.appendChild(bubble);
  return row;
}

function renderAudioBody(msg: Message): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'audio-msg';

  const src = resolveAudioSrc(msg);
  const transcript = parseAudioTranscript(msg.content);

  if (src) {
    const player = document.createElement('audio');
    player.className = 'audio-player';
    player.controls = true;
    player.preload = 'none';
    player.src = src;
    wrap.appendChild(player);
  } else {
    const ph = document.createElement('div');
    ph.className = 'media-placeholder';
    ph.textContent = msg.attachment
      ? `Áudio indisponível (${msg.attachment})`
      : 'Áudio indisponível';
    wrap.appendChild(ph);
  }

  if (transcript) {
    const cap = document.createElement('div');
    cap.className = 'audio-transcript';
    cap.innerHTML = linkify(transcript);
    wrap.appendChild(cap);
  }

  return wrap;
}
