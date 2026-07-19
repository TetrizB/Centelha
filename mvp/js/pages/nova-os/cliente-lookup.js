/* ============================================================
   pages/nova-os/cliente-lookup.js — Cliente recorrente
   Ao digitar o telefone no passo 1 do wizard, procura o mesmo
   número nas OS anteriores e oferece preencher os dados do
   cliente com um toque. Container no HTML: #cliente-sugerido.
   ============================================================ */

import { state } from '../../core/app-state.js';
import { escHtml, showToast } from '../../utils/dom.js';

const MIN_DIGITOS = 8; // só busca com o número quase completo

// Última sugestão encontrada (aplicada pelo botão "Usar dados")
let _sugestao = null;

/** oninput do campo de telefone (exposto no window pelo main.js). */
export function lookupClienteRecorrente(input) {
  const box = document.getElementById('cliente-sugerido');
  if (!box) return;

  const digitados = String(input.value || '').replace(/\D/g, '');
  if (digitados.length < MIN_DIGITOS) {
    _sugestao = null;
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  // getAll() retorna da mais recente para a mais antiga —
  // a primeira encontrada já é a OS mais recente desse cliente
  const anterior = state.getAll().find(os =>
    String(os.telefone || '').replace(/\D/g, '').includes(digitados)
  );

  // Não sugere se o nome já está preenchido com outro cliente
  const nomeAtual = document.getElementById('input-cliente').value.trim();
  if (!anterior || (nomeAtual && nomeAtual !== anterior.cliente)) {
    _sugestao = null;
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  _sugestao = anterior;
  box.className = 'cliente-sugerido-box';
  box.innerHTML = `
    <span>Cliente já atendido: <strong>${escHtml(anterior.cliente)}</strong></span>
    <button type="button" class="btn btn-secondary" style="padding:6px 12px;font-size:.75rem"
            onclick="usarClienteSugerido()">Usar dados</button>`;
}

/** Preenche o formulário com os dados da última OS do cliente. */
export function usarClienteSugerido() {
  if (!_sugestao) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  };
  set('input-cliente',  _sugestao.cliente);
  set('input-telefone', _sugestao.telefone);
  set('input-cpf',      _sugestao.cpf);
  set('input-email',    _sugestao.email);
  set('input-endereco', _sugestao.endereco);
  set('input-cidade',   _sugestao.cidade);

  const box = document.getElementById('cliente-sugerido');
  box.classList.add('hidden');
  box.innerHTML = '';
  showToast(`Dados de ${_sugestao.cliente} preenchidos.`, 'success');
  _sugestao = null;
}
