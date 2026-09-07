/**
 * Contact avatar photos available under /assets/avatar-{id}.{ext}
 * Missing contacts fall back to coloured initials.
 */

const AVATAR_FILES: Record<string, string> = {
  'alexandre-de-moraes': '/assets/avatar-alexandre-de-moraes.jpg',
  'ana-matos-mkt': '/assets/avatar-ana-matos-mkt.jpg',
  'ciro-soares': '/assets/avatar-ciro-soares.jpg',
  'diretor-paulo-sergio-bacen': '/assets/avatar-diretor-paulo-sergio-bacen.jpg',
  'dv-self': '/assets/avatar-dv.webp',
  'eduardo-bolsonaro': '/assets/avatar-eduardo-bolsonaro.jpg',
  'fabiano-zettel': '/assets/avatar-fabiano-zettel.jpg',
  'fabio-faria': '/assets/avatar-fabio-faria.jpg',
  'geraldo-brazil-journal': '/assets/avatar-geraldo-brazil-journal.jpg',
  'jair-bolsonaro': '/assets/avatar-jair-bolsonaro.webp',
  'jaques-wagner': '/assets/avatar-jaques-wagner.jpg',
  'leo-palhares': '/assets/avatar-leo-palhares.jpg',
  'leo-serrano': '/assets/avatar-leo-serrano.jpg',
  'lindbergh-farias': '/assets/avatar-lindbergh-farias.jpg',
  'luiz-renno': '/assets/avatar-luiz-renno.jpg',
  'marcio-conjur': '/assets/avatar-marcio-conjur.jpg',
  'marcos-prime': '/assets/avatar-marcos-prime.jpg',
  'martha-graeff': '/assets/avatar-martha-graeff.jpeg',
  'meyer-nigri': '/assets/avatar-meyer-nigri.jpg',
  'dilma-rousseff': '/assets/avatar-dilma-rousseff.jpg',
  'roberto-teixeira': '/assets/avatar-roberto-teixeira.jpg',
  'silas-malafaia': '/assets/avatar-silas-malafaia.jpg',
  'stella-vorcaro': '/assets/avatar-stella-vorcaro.jpg',
  'thatiane-prime': '/assets/avatar-thatiane-prime.jpg',
  'vivi-moraes': '/assets/avatar-vivi-moraes.jpg',
};

export function avatarUrl(conversationId: string): string | null {
  return AVATAR_FILES[conversationId] || null;
}

export function attachAvatars<T extends { id: string; avatar?: string }>(
  conversations: T[],
): T[] {
  for (const c of conversations) {
    const url = avatarUrl(c.id);
    if (url) c.avatar = url;
  }
  return conversations;
}
