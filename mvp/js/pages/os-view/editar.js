/* ============================================================
   pages/os-view/editar.js — Edição de uma OS existente
   Modal no HTML: <div id="edit-modal">

   O técnico pode complementar a OS depois da entrada do aparelho:
   - diagnóstico / observações técnicas
   - itens, peças e mão de obra (recalcula o valor total)
   - valor manual (usado apenas quando não há itens)
   - previsão de saída

   Os dados jurídicos da entrada (fotos, defeito relatado,
   assinatura) não são editáveis — são a prova do estado inicial.
   ============================================================ */

import { state } from '../../core/app-state.js';
import { escHtml, showToast } from '../../utils/dom.js';
import { formatCurrency } from '../../utils/format.js';
import { renderOSView } from './os-view.js';

let _editOSId = null;
let _rowSeq   = 0; // gera ids únicos para as linhas da tabela

export function openEditOS(id) {
  const os = state.getById(id);
  if (!os) return;
  _editOSId = id;

  document.getElementById('edit-modal-info').textContent = `${os.id} — ${os.cliente}`;
  document.getElementById('edit-diagnostico').value = os.diagnostico || '';
  document.getElementById('edit-valor').value       = os.valor ? String(os.valor) : '';
  document.getElementById('edit-previsao').value    = os.previsao || '';

  // Monta a tabela com os itens atuais (ou uma linha vazia)
  document.getElementById('edit-itens-tbody').innerHTML = '';
  _rowSeq = 0;
  const itens = os.itens && os.itens.length ? os.itens : [null];
  itens.forEach(item => addEditItemRow(item));
  recalcEditTotal();

  document.getElementById('edit-modal').classList.remove('hidden');
}

export function closeEditOS() {
  document.getElementById('edit-modal').classList.add('hidden');
  _editOSId = null;
}

/** Adiciona uma linha na tabela do modal ({ qtde, desc, unit } ou vazia). */
export function addEditItemRow(item = null) {
  const tbody = document.getElementById('edit-itens-tbody');
  const idx = _rowSeq++;
  const tr = document.createElement('tr');
  tr.id = `edit-item-row-${idx}`;
  tr.style.borderBottom = '1px solid #e2e8f0';
  tr.innerHTML = `
    <td style="padding:4px 4px">
      <input class="item-input" type="number" min="1" value="${item ? escHtml(String(item.qtde)) : '1'}"
             style="width:44px;text-align:center" oninput="updateEditItemTotal(${idx})">
    </td>
    <td style="padding:4px 4px">
      <input class="item-input" type="text" placeholder="Ex: Troca de tela..." style="min-width:110px"
             value="${item ? escHtml(item.desc) : ''}" oninput="updateEditItemTotal(${idx})">
    </td>
    <td style="padding:4px 4px">
      <input class="item-input" type="number" min="0" step="0.01" placeholder="0,00"
             style="width:76px;text-align:right" value="${item ? escHtml(String(item.unit)) : ''}"
             oninput="updateEditItemTotal(${idx})">
    </td>
    <td style="padding:4px 4px;text-align:right;font-weight:700;color:var(--primary)" id="edit-item-total-${idx}">
      ${item ? formatCurrency(item.qtde * item.unit) : 'R$ 0,00'}
    </td>
    <td style="padding:4px 4px;text-align:center">
      <button type="button" class="item-remove-btn" onclick="removeEditItemRow(${idx})" title="Remover linha">✕</button>
    </td>`;
  tbody.appendChild(tr);
}

export function removeEditItemRow(idx) {
  document.getElementById(`edit-item-row-${idx}`)?.remove();
  recalcEditTotal();
}

export function updateEditItemTotal(idx) {
  const row = document.getElementById(`edit-item-row-${idx}`);
  if (!row) return;
  const inputs = row.querySelectorAll('input');
  const total = (parseFloat(inputs[0].value) || 0) * (parseFloat(inputs[2].value) || 0);
  document.getElementById(`edit-item-total-${idx}`).textContent = formatCurrency(total);
  recalcEditTotal();
}

function getEditItens() {
  const itens = [];
  document.querySelectorAll('#edit-itens-tbody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qtde = parseFloat(inputs[0]?.value) || 0;
    const desc = inputs[1]?.value?.trim() || '';
    const unit = parseFloat(inputs[2]?.value) || 0;
    if (desc) itens.push({ qtde, desc, unit, total: qtde * unit });
  });
  return itens;
}

function recalcEditTotal() {
  const soma = getEditItens().reduce((s, i) => s + i.total, 0);
  document.getElementById('edit-itens-total').textContent = formatCurrency(soma);
}

export async function saveEditOS() {
  const os = state.getById(_editOSId);
  if (!os) { closeEditOS(); return; }

  const itens      = getEditItens();
  const itensTotal = itens.reduce((s, i) => s + i.total, 0);
  const valorManual = parseFloat(document.getElementById('edit-valor').value) || 0;

  const patch = {
    diagnostico: document.getElementById('edit-diagnostico').value.trim(),
    previsao:    document.getElementById('edit-previsao').value,
    itens,
    // Com itens na tabela, o valor é a soma deles; sem itens, vale o manual
    valor: itensTotal > 0 ? itensTotal : valorManual,
  };

  const btn = document.getElementById('btn-salvar-edicao');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  const { dbError } = await state.update(_editOSId, patch);

  btn.disabled    = false;
  btn.textContent = 'Salvar alterações';

  closeEditOS();
  renderOSView(os.id);
  showToast(
    dbError ? 'Alterações salvas localmente, mas falha ao sincronizar.' : 'OS atualizada com sucesso.',
    dbError ? 'error' : 'success'
  );
}
