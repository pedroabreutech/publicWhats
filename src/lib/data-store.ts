import type { Conversation, DateIndexEntry, Message, Profile, SearchHit } from '../types/message';

class LRUCache<T> {
  private maxSize: number;
  private map = new Map<string, T>();

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

type Fetcher = (url: string) => Promise<unknown>;

export class DataStore {
  private basePath: string;
  private fetcher: Fetcher;
  private conversations: Conversation[] | null = null;
  private indexes = new Map<string, DateIndexEntry[]>();
  private profiles = new Map<string, Profile>();
  private cache: LRUCache<Message[]>;
  private pending = new Map<string, Promise<Message[]>>();

  constructor({
    cacheSize = 30,
    basePath = '/data',
    fetcher,
  }: {
    cacheSize?: number;
    basePath?: string;
    fetcher?: Fetcher;
  } = {}) {
    this.basePath = basePath;
    this.fetcher =
      fetcher ||
      ((url) =>
        fetch(url).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
          return r.json();
        }));
    this.cache = new LRUCache(cacheSize);
  }

  async init(): Promise<void> {
    if (this.conversations) return;
    const data = (await this.fetcher(`${this.basePath}/conversations.json`)) as {
      conversations: Conversation[];
    };
    this.conversations = data.conversations || [];
  }

  getConversations(): Conversation[] {
    return this.conversations || [];
  }

  getConversationsByOwner(): Map<string, Conversation[]> {
    const map = new Map<string, Conversation[]>();
    for (const c of this.getConversations()) {
      const owner = c.owner || 'Outros';
      if (!map.has(owner)) map.set(owner, []);
      map.get(owner)!.push(c);
    }
    return map;
  }

  getConversation(id: string): Conversation | undefined {
    return this.getConversations().find((c) => c.id === id);
  }

  async getConversationIndex(conversationId: string): Promise<DateIndexEntry[]> {
    if (this.indexes.has(conversationId)) return this.indexes.get(conversationId)!;
    const data = (await this.fetcher(
      `${this.basePath}/${conversationId}/index.json`,
    )) as { dates: DateIndexEntry[] };
    const dates = data.dates || [];
    this.indexes.set(conversationId, dates);
    return dates;
  }

  async getProfile(conversationId: string): Promise<Profile | null> {
    if (this.profiles.has(conversationId)) return this.profiles.get(conversationId)!;
    try {
      const data = (await this.fetcher(
        `${this.basePath}/${conversationId}/profile.json`,
      )) as Profile;
      this.profiles.set(conversationId, data);
      return data;
    } catch {
      return null;
    }
  }

  async findDateForMessage(
    conversationId: string,
    messageId: number | string,
  ): Promise<string | null> {
    const dates = await this.getConversationIndex(conversationId);
    const id = Number(messageId);
    for (const entry of dates) {
      if (id >= entry.first_message_id && id <= entry.last_message_id) {
        return entry.date;
      }
    }
    return null;
  }

  async getMessages(conversationId: string, date: string): Promise<Message[]> {
    const cacheKey = `${conversationId}/${date}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (this.pending.has(cacheKey)) return this.pending.get(cacheKey)!;

    const promise = this.fetcher(`${this.basePath}/${conversationId}/${date}.json`)
      .then((data) => {
        const messages = ((data as { messages: Message[] }).messages || []) as Message[];
        this.cache.set(cacheKey, messages);
        this.pending.delete(cacheKey);
        return messages;
      })
      .catch((err) => {
        this.pending.delete(cacheKey);
        throw err;
      });

    this.pending.set(cacheKey, promise);
    return promise;
  }

  async getSearchIndex(conversationId: string): Promise<SearchHit[]> {
    const data = (await this.fetcher(
      `${this.basePath}/${conversationId}/search-index.json`,
    )) as SearchHit[];
    return data || [];
  }

  clearCache(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

let instance: DataStore | null = null;

export function getDataStore(options?: ConstructorParameters<typeof DataStore>[0]): DataStore {
  if (!instance) instance = new DataStore(options);
  return instance;
}

export function resetDataStore(): void {
  instance = null;
}
