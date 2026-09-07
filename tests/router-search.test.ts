import { describe, expect, it } from 'vitest';
import { HashRouter } from '../src/lib/router';
import { normalize, searchIndex } from '../src/lib/search';

describe('HashRouter', () => {
  it('parses home', () => {
    expect(HashRouter.parseHash('#/')).toEqual({
      route: 'home',
      param: null,
      messageId: null,
    });
  });

  it('parses chat and message', () => {
    expect(HashRouter.parseHash('#/c/martha-graeff/m/42')).toEqual({
      route: 'chat',
      param: 'martha-graeff',
      messageId: '42',
    });
  });

  it('parses legacy masterwhats routes', () => {
    expect(HashRouter.parseHash('#/chat/alexandre-de-moraes/msg/9')).toEqual({
      route: 'chat',
      param: 'alexandre-de-moraes',
      messageId: '9',
    });
  });
});

describe('search', () => {
  it('folds accents', () => {
    expect(normalize('Você')).toBe('voce');
  });

  it('finds normalized matches', () => {
    const hits = searchIndex(
      [
        { id: 1, date: '2024-01-01', sender: 'DV', content: 'Você sabe que tenho gratidão' },
        { id: 2, date: '2024-01-01', sender: 'DV', content: 'outra coisa' },
      ],
      'voce',
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]!.id).toBe(1);
  });
});
