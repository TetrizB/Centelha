/* ============================================================
   utils/masks.js — Máscaras de input (aplicadas via oninput no HTML)
   ============================================================ */

/** Máscara de CPF: 000.000.000-00 */
export function maskCPF(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}
