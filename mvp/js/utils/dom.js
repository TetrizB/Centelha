/* ============================================================
   utils/dom.js — Helpers de DOM: escape de HTML e toast
   ============================================================ */

/**
 * Escapa caracteres HTML especiais para prevenir XSS.
 * Use sempre que inserir dados do usuário via innerHTML.
 */
export function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Exibe uma notificação temporária no rodapé. type: '' | 'success' | 'error' | 'warning' */
export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}
