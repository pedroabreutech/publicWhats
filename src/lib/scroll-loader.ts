import type { DateIndexEntry, Message } from '../types/message';

const INITIAL_DAYS = 5;
const LOAD_MORE_DAYS = 5;

export class ScrollLoader {
  private container: HTMLElement;
  private dateIndex: DateIndexEntry[];
  private loadMessages: (date: string) => Promise<Message[]>;
  private renderDay: (date: string, messages: Message[]) => HTMLElement;
  private loadedDates = new Set<string>();
  private loading = false;
  private nextIndex: number;
  private observer: IntersectionObserver | null = null;
  private sentinel: HTMLElement | null = null;

  constructor({
    container,
    dateIndex,
    loadMessages,
    renderDay,
  }: {
    container: HTMLElement;
    dateIndex: DateIndexEntry[];
    loadMessages: (date: string) => Promise<Message[]>;
    renderDay: (date: string, messages: Message[]) => HTMLElement;
  }) {
    this.container = container;
    this.dateIndex = dateIndex;
    this.loadMessages = loadMessages;
    this.renderDay = renderDay;
    this.nextIndex = dateIndex.length - 1;
  }

  async init(): Promise<void> {
    this.sentinel = document.createElement('div');
    this.sentinel.className = 'scroll-sentinel';
    this.sentinel.setAttribute('aria-hidden', 'true');
    this.container.prepend(this.sentinel);

    await this.loadBatch(INITIAL_DAYS);
    this.scrollToBottom();

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.loading) {
          void this.loadBatch(LOAD_MORE_DAYS);
        }
      },
      { root: this.container, rootMargin: '200px 0px 0px 0px' },
    );
    this.observer.observe(this.sentinel);
  }

  private async loadBatch(count: number): Promise<void> {
    if (this.loading || this.nextIndex < 0) return;
    this.loading = true;

    const scrollHeightBefore = this.container.scrollHeight;
    const scrollTopBefore = this.container.scrollTop;

    let loaded = 0;
    while (loaded < count && this.nextIndex >= 0) {
      const entry = this.dateIndex[this.nextIndex]!;
      this.nextIndex--;
      if (this.loadedDates.has(entry.date)) continue;

      try {
        const messages = await this.loadMessages(entry.date);
        const dayEl = this.renderDay(entry.date, messages);
        if (this.sentinel?.nextSibling) {
          this.container.insertBefore(dayEl, this.sentinel.nextSibling);
        } else {
          this.container.appendChild(dayEl);
        }
        this.loadedDates.add(entry.date);
        loaded++;
      } catch (err) {
        console.error(`Failed to load day ${entry.date}:`, err);
      }
    }

    if (loaded > 0 && scrollTopBefore > 0) {
      this.container.scrollTop =
        scrollTopBefore + (this.container.scrollHeight - scrollHeightBefore);
    }

    this.loading = false;
    if (this.nextIndex < 0 && this.sentinel) {
      this.observer?.unobserve(this.sentinel);
    }
  }

  scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  async loadDate(date: string): Promise<HTMLElement | null> {
    if (this.loadedDates.has(date)) {
      return this.container.querySelector<HTMLElement>(`[data-date="${date}"]`);
    }
    try {
      const messages = await this.loadMessages(date);
      const dayEl = this.renderDay(date, messages);
      const existing = Array.from(
        this.container.querySelectorAll<HTMLElement>('.chat-day'),
      );
      let inserted = false;
      for (const section of existing) {
        if ((section.dataset.date || '') > date) {
          this.container.insertBefore(dayEl, section);
          inserted = true;
          break;
        }
      }
      if (!inserted) this.container.appendChild(dayEl);
      this.loadedDates.add(date);
      return dayEl;
    } catch (err) {
      console.error(`Failed to load day ${date}:`, err);
      return null;
    }
  }

  async scrollToMessage(
    messageId: string | number,
    date: string,
    highlight = true,
  ): Promise<void> {
    await this.loadDate(date);
    const msgEl = this.container.querySelector(`[data-id="${messageId}"]`);
    if (!msgEl) return;
    msgEl.scrollIntoView({ block: 'center' });
    if (highlight) {
      msgEl.classList.remove('msg-highlight');
      void (msgEl as HTMLElement).offsetHeight;
      msgEl.classList.add('msg-highlight');
      setTimeout(() => msgEl.classList.remove('msg-highlight'), 1500);
    }
  }

  async scrollToDate(date: string): Promise<void> {
    const dayEl = await this.loadDate(date);
    if (!dayEl) return;
    const firstMsg = dayEl.querySelector('.chat-msg-row');
    if (firstMsg) {
      firstMsg.scrollIntoView({ block: 'center' });
      firstMsg.classList.remove('msg-highlight');
      void (firstMsg as HTMLElement).offsetHeight;
      firstMsg.classList.add('msg-highlight');
      setTimeout(() => firstMsg.classList.remove('msg-highlight'), 1500);
    } else {
      dayEl.scrollIntoView({ block: 'center' });
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
