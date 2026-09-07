import { describe, expect, it } from 'vitest';
import { DataStore } from '../src/lib/data-store';
import type { Message } from '../src/types/message';

describe('DataStore', () => {
  it('loads conversations and day chunks via fetcher', async () => {
    const messages: Message[] = [
      {
        id: 1,
        timestamp: '2024-02-10T11:00:00',
        date: '2024-02-10',
        time: '11:00:00',
        sender: 'DV',
        content: 'oi',
        type: 'text',
      },
    ];

    const store = new DataStore({
      fetcher: async (url) => {
        if (url.endsWith('/conversations.json')) {
          return {
            conversations: [
              {
                id: 'demo',
                participants: ['DV', 'X'],
                contact: 'X',
                owner: 'DV',
                date_range: { start: '2024-02-10', end: '2024-02-10' },
                total_messages: 1,
              },
            ],
          };
        }
        if (url.endsWith('/demo/index.json')) {
          return {
            dates: [
              {
                date: '2024-02-10',
                message_count: 1,
                first_message_id: 1,
                last_message_id: 1,
              },
            ],
          };
        }
        if (url.endsWith('/demo/2024-02-10.json')) {
          return { messages };
        }
        throw new Error(url);
      },
    });

    await store.init();
    expect(store.getConversations()).toHaveLength(1);
    expect(await store.findDateForMessage('demo', 1)).toBe('2024-02-10');
    expect(await store.getMessages('demo', '2024-02-10')).toEqual(messages);
    // cache hit
    expect(await store.getMessages('demo', '2024-02-10')).toEqual(messages);
  });
});
