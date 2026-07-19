/* ============================================================
   utils/format.js — Formatação de moeda, datas e badge de status
   ============================================================ */

import { OS_STATUS } from '../config/constants.js';

export function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

/** Rótulo legível de um status (fallback: o próprio valor). */
export function statusLabel(status) {
  return OS_STATUS.find(s => s.value === status)?.label || status;
}

/** Retorna o HTML do badge de status de uma OS. */
export function statusBadge(status) {
  const s = OS_STATUS.find(x => x.value === status);
  return `<span class="badge ${s?.badge || 'badge-waiting'}">${s?.label || status}</span>`;
}
