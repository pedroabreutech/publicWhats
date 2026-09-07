export type RouteName = 'home' | 'chat';

export interface RouteInfo {
  route: RouteName;
  param: string | null;
  messageId: string | null;
}

type Handler = (param: string | null, messageId: string | null) => void;

/** Hash router: #/  #/c/:id  #/c/:id/m/:msgId */
export class HashRouter {
  private handlers = new Map<RouteName, Handler>();
  private onHashChange = () => {
    const { route, param, messageId } = this.getCurrentRoute();
    this.handlers.get(route)?.(param, messageId);
  };

  on(route: RouteName, handler: Handler): this {
    this.handlers.set(route, handler);
    return this;
  }

  start(): void {
    window.addEventListener('hashchange', this.onHashChange);
    this.onHashChange();
  }

  stop(): void {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  navigate(route: RouteName, param?: string, messageId?: string | number): void {
    if (route === 'home') {
      window.location.hash = '#/';
    } else if (route === 'chat' && param) {
      window.location.hash = messageId
        ? `#/c/${param}/m/${messageId}`
        : `#/c/${param}`;
    }
  }

  getCurrentRoute(): RouteInfo {
    return HashRouter.parseHash(window.location.hash);
  }

  static parseHash(hash: string): RouteInfo {
    const cleaned = hash.replace(/^#\/?/, '');
    if (!cleaned) return { route: 'home', param: null, messageId: null };

    const msgMatch = cleaned.match(/^c\/([^/]+)\/m\/(.+)$/);
    if (msgMatch) return { route: 'chat', param: msgMatch[1], messageId: msgMatch[2] };

    // Legacy MasterWhats-style routes
    const legacyMsg = cleaned.match(/^chat\/([^/]+)\/msg\/(.+)$/);
    if (legacyMsg) return { route: 'chat', param: legacyMsg[1], messageId: legacyMsg[2] };

    const chatMatch = cleaned.match(/^c\/(.+)$/);
    if (chatMatch) return { route: 'chat', param: chatMatch[1], messageId: null };

    const legacyChat = cleaned.match(/^chat\/(.+)$/);
    if (legacyChat) return { route: 'chat', param: legacyChat[1], messageId: null };

    return { route: 'home', param: null, messageId: null };
  }

  static messageUrl(conversationId: string, messageId: number | string): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/c/${conversationId}/m/${messageId}`;
  }
}
