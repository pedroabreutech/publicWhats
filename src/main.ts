import './styles/app.css';
import { getDataStore } from './lib/data-store';
import { attachAvatars } from './lib/avatar';
import { HashRouter } from './lib/router';
import { filterSidebar, renderSidebar } from './components/Sidebar';
import { renderEmptyState } from './components/EmptyState';
import { renderChatView, type ChatViewHandle } from './components/ChatView';
import { showProfileDrawer } from './components/ProfileDrawer';
import { showToast } from './components/Toast';

async function boot(): Promise<void> {
  const loading = document.getElementById('loading-screen');
  const app = document.getElementById('app');
  if (!app) return;

  const started = Date.now();
  const store = getDataStore();

  try {
    await store.init();
    attachAvatars(store.getConversations());
  } catch (err) {
    console.error(err);
    if (loading) {
      loading.innerHTML = `<div class="loading-content"><p>Falha ao carregar o arquivo. Rode <code>npm run prepare-data</code>.</p></div>`;
    }
    return;
  }

  app.hidden = false;
  app.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const sidebarEl = document.createElement('aside');
  const mainEl = document.createElement('main');
  mainEl.className = 'main-area';
  mainEl.setAttribute('role', 'main');

  shell.append(sidebarEl, mainEl);
  app.appendChild(shell);

  let activeId: string | null = null;
  let chatHandle: ChatViewHandle | null = null;
  let profileHandle: { destroy: () => void } | null = null;
  let conversations = store.getConversations();

  function closeProfile(): void {
    profileHandle?.destroy();
    profileHandle = null;
  }

  function paintSidebar(): void {
    renderSidebar(sidebarEl, conversations, {
      activeId,
      onSelect: (id) => router.navigate('chat', id),
      onFilter: (term) => filterSidebar(term),
    });
  }

  async function openChat(id: string, messageId: string | null): Promise<void> {
    const conv = store.getConversation(id);
    if (!conv) {
      showToast('Conversa não encontrada');
      router.navigate('home');
      return;
    }

    closeProfile();
    chatHandle?.destroy();
    chatHandle = null;
    activeId = id;
    shell.classList.add('chat-open');
    paintSidebar();

    chatHandle = await renderChatView(mainEl, store, conv, {
      initialMessageId: messageId,
      onBack: () => router.navigate('home'),
      onOpenProfile: async () => {
        closeProfile();
        const profile = await store.getProfile(id);
        profileHandle = showProfileDrawer(mainEl, conv, profile, closeProfile);
      },
    });
  }

  function openHome(): void {
    closeProfile();
    chatHandle?.destroy();
    chatHandle = null;
    activeId = null;
    shell.classList.remove('chat-open');
    paintSidebar();
    renderEmptyState(mainEl);
  }

  const router = new HashRouter();
  router
    .on('home', () => openHome())
    .on('chat', (param, messageId) => {
      if (!param) {
        openHome();
        return;
      }
      void openChat(param, messageId);
    });

  paintSidebar();
  router.start();

  const elapsed = Date.now() - started;
  const wait = Math.max(0, 450 - elapsed);
  setTimeout(() => loading?.remove(), wait);
}

void boot();
