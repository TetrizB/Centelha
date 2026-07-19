/* ============================================================
   pages/nova-os/itens.js — Tabela de itens/peças/mão de obra
   Tabela dinâmica do passo 3 do wizard (tbody #itens-tbody).
   ============================================================ */

import { wizard } from './state.js';
import { formatCurrency } from '../../utils/format.js';
import { buildSummary } from './wizard.js';

export function addItemRow() {
  const tbody = document.getElementById('itens-tbody');
  const idx = wizard.rowCount++;
  const tr = document.createElement('tr');
  tr.id = `item-row-${idx}`;
  tr.style.borderBottom = '1px solid #e2e8f0';
  tr.innerHTML = `
    <td style="padding:4px 6px">
      <input class="item-input" type="number" min="1" value="1" style="width:44px;text-align:center"
             oninput="updateItemTotal(${idx})">
    </td>
    <td style="padding:4px 6px">
      <input class="item-input" type="text" placeholder="Ex: Troca de tela, Mão de obra..." style="min-width:120px"
             oninput="updateItemTotal(${idx})">
    </td>
    <td style="padding:4px 6px">
      <input class="item-input" type="number" min="0" step="0.01" placeholder="0,00" style="width:80px;text-align:right"
             oninput="updateItemTotal(${idx})">
    </td>
    <td style="padding:4px 6px;text-align:right;font-weight:700;color:var(--primary)" id="item-total-${idx}">R$ 0,00</td>
    <td style="padding:4px 6px;text-align:center">
      <button type="button" class="item-remove-btn" onclick="removeItemRow(${idx})" title="Remover linha">✕</button>
    </td>`;
  tbody.appendChild(tr);
}

export function removeItemRow(idx) {
  const row = document.getElementById(`item-row-${idx}`);
  if (row) row.remove();
  recalcItensTotal();
}

export function updateItemTotal(idx) {
  const row = document.getElementById(`item-row-${idx}`);
  if (!row) return;
  const inputs = row.querySelectorAll('input');
  const qtde = parseFloat(inputs[0].value) || 0;
  const unit = parseFloat(inputs[2].value) || 0;
  const total = qtde * unit;
  document.getElementById(`item-total-${idx}`).textContent = formatCurrency(total);
  recalcItensTotal();
}

function recalcItensTotal() {
  let sum = 0;
  document.querySelectorAll('[id^="item-total-"]').forEach(el => {
    const val = parseFloat(el.textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    sum += val;
  });
  document.getElementById('itens-total').textContent = formatCurrency(sum);

  // A tabela de itens fica no mesmo passo da Revisão Final —
  // qualquer mudança nos itens precisa refletir no resumo na hora.
  if (wizard.step === 3) buildSummary();
}

/** Lê as linhas preenchidas da tabela. Linhas sem descrição são ignoradas. */
export function getItensFromTable() {
  const rows = document.querySelectorAll('#itens-tbody tr');
  const itens = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qtde = parseFloat(inputs[0]?.value) || 0;
    const desc = inputs[1]?.value?.trim() || '';
    const unit = parseFloat(inputs[2]?.value) || 0;
    if (desc) itens.push({ qtde, desc, unit, total: qtde * unit });
  });
  return itens;
}
