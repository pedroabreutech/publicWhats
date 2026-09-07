export function renderEmptyState(root: HTMLElement): void {
  root.innerHTML = '';
  root.className = 'empty-state';
  root.innerHTML = `
    <div>
      <h2>PublicWhats</h2>
      <p>
        Arquivo navegável de conversas de domínio público — busca por conversa,
        links diretos para mensagens e proveniência visível em cada chat.
      </p>
      <div class="empty-actions">
        <a class="btn btn-primary" href="#/c/martha-graeff">Abrir Martha Graeff</a>
        <a class="btn" href="#/c/alexandre-de-moraes">Abrir Alexandre de Moraes</a>
        <a class="btn" href="/export/publicwhats-export.zip">Baixar corpus (.zip)</a>
      </div>
      <p style="margin-top:1.5rem;font-size:0.8rem;color:var(--text-faint);max-width:32rem;margin-left:auto;margin-right:auto;">
        Conteúdo reunido a partir de fontes públicas (vazamentos jornalísticos e
        relatório da PF IPJ-A 3298613/2026). Plataforma independente, sem vínculo
        com as partes. Inspirada na arquitetura do MasterWhats / masterzap.
      </p>
    </div>
  `;
}
