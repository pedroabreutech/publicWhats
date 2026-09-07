import { avatarColor, initials } from './format';
import { avatarUrl } from './avatar';

/** Build an avatar element: photo if available, else coloured initials. */
export function createAvatarEl(
  conversationId: string,
  name: string,
  opts: { size?: number; className?: string; photoUrl?: string | null } = {},
): HTMLElement {
  const el = document.createElement('div');
  el.className = opts.className || 'avatar';
  if (opts.size) {
    el.style.width = `${opts.size}px`;
    el.style.height = `${opts.size}px`;
    el.style.fontSize = `${Math.round(opts.size * 0.32)}px`;
  }

  const src = opts.photoUrl ?? avatarUrl(conversationId);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.remove();
      el.style.background = avatarColor(conversationId);
      el.textContent = initials(name);
    });
    el.appendChild(img);
  } else {
    el.style.background = avatarColor(conversationId);
    el.textContent = initials(name);
  }
  return el;
}
