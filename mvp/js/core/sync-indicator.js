/* ============================================================
   core/sync-indicator.js — Nuvem de sincronização (barra superior)
   Elemento no HTML: <button id="sync-indicator">

   Estados (o técnico sempre sabe se a OS subiu para o servidor):
   - ok       nuvem com check      tudo sincronizado
   - busy     setas girando        enviando agora
   - pending  nuvem + contador     N OS na fila (toque para reenviar)
   - offline  nuvem cortada        sem rede, dados salvos no aparelho

   Chamado pelo core/app-state.js a cada mudança na fila.
   Módulo sem dependências — não importa nada do app-state
   (evita import circular).
   ============================================================ */

const ICONES = {
  ok: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><polyline points="9 14 11.5 16.5 15.5 12"/>
       </svg>`,
  busy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
         </svg>`,
  pending: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="12" y1="18.5" x2="12" y2="18.51"/>
            </svg>`,
  offline: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="3" y1="3" x2="21" y2="21"/>
            </svg>`,
};

const estado = { syncing: false, pending: 0 };

/**
 * Atualiza o indicador. Aceita atualização parcial:
 * updateSyncIndicator({ syncing: true }) ou ({ pending: 2 }).
 */
export function updateSyncIndicator(patch = {}) {
  Object.assign(estado, patch);

  const btn = document.getElementById('sync-indicator');
  if (!btn) return;

  let modo, titulo, badge = '';
  if (estado.syncing) {
    modo   = 'busy';
    titulo = 'Sincronizando com o servidor...';
  } else if (!navigator.onLine) {
    modo   = 'offline';
    titulo = 'Sem conexão — os dados estão salvos no aparelho';
  } else if (estado.pending > 0) {
    modo   = 'pending';
    titulo = `${estado.pending} OS aguardando sincronização — toque para reenviar`;
    badge  = `<span class="sync-count">${estado.pending}</span>`;
  } else {
    modo   = 'ok';
    titulo = 'Sincronizado com o servidor';
  }

  btn.className = `icon-btn sync-${modo}`;
  btn.title     = titulo;
  btn.setAttribute('aria-label', titulo);
  btn.innerHTML = ICONES[modo] + badge;
}
