let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, ms = 2200): void {
  document.querySelector('.toast')?.remove();
  clearTimeout(timer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  timer = setTimeout(() => el.remove(), ms);
}
