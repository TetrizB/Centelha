/* ============================================================
   pages/nova-os/wizard.js — Fluxo do wizard "Nova OS" (3 passos)
   Tela no HTML: <section id="screen-nova-os">
   Passo 1: dados do cliente e aparelho
   Passo 2: vistoria (checklist + padrão 3x3 + fotos)
   Passo 3: itens + revisão final + termos → gera a OS
   ============================================================ */

import { wizard } from './state.js';
import { clearPattern } from './pattern-lock.js';
import { addItemRow, getItensFromTable } from './itens.js';
import { state } from '../../core/app-state.js';
import { navigate } from '../../core/navigation.js';
import { escHtml, showToast } from '../../utils/dom.js';
import { formatCurrency } from '../../utils/format.js';
import { getGPS, resetGPS } from '../../services/gps-service.js';
import { checkProfileComplete } from '../configuracoes.js';
import { renderDashboard } from '../dashboard.js';
import { renderOSView, setCurrentOSId } from '../os-view/os-view.js';

const TOTAL_STEPS = 3;

/** Reseta o wizard e abre a tela (botão "Nova OS" da navegação). */
export function startNovaOS() {
  wizard.data = { fotos: [], condicoes: [], senhaParao: [], itens: [] };
  wizard.step = 1;
  wizard.pattern = [];
  wizard.rowCount = 0;
  resetGPS(); // busca posição fresca a cada nova OS
  document.getElementById('form-nova-os').reset();
  document.getElementById('photo-previews').innerHTML = '';
  document.getElementById('photo-count').textContent = '0';
  document.getElementById('itens-tbody').innerHTML = '';
  document.getElementById('itens-total').textContent = 'R$ 0,00';
  // Reset checkboxes
  document.querySelectorAll('.condicao-cb').forEach(cb => cb.checked = false);
  // Reset pattern
  clearPattern();
  // Limpa a sugestão de cliente recorrente
  const sugestao = document.getElementById('cliente-sugerido');
  if (sugestao) { sugestao.classList.add('hidden'); sugestao.innerHTML = ''; }
  const inputPrevisao = document.getElementById('input-previsao');
  if (inputPrevisao && !inputPrevisao.value) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 3);
    inputPrevisao.value = tomorrow.toISOString().split('T')[0];
  }
  // Adiciona 1 linha vazia na tabela de itens
  addItemRow();
  updateWizardStep();
  navigate('screen-nova-os');
}

function updateWizardStep() {
  const pct = ((wizard.step - 1) / (TOTAL_STEPS - 1)) * 100;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-title').textContent = [
    '', 'Dados do cliente e aparelho', 'Fotos de vistoria', 'Confirmação e geração'
  ][wizard.step];

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    dot.classList.remove('active','done');
    if (i < wizard.step)  dot.classList.add('done');
    if (i === wizard.step) dot.classList.add('active');
  }
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`wizard-step-${wizard.step}`).classList.add('active');

  // Pré-carrega GPS ao entrar no passo 2 para que esteja pronto quando a foto for tirada
  if (wizard.step === 2) getGPS();

  document.getElementById('btn-prev').classList.toggle('hidden', wizard.step === 1);
  const btnNext = document.getElementById('btn-next');
  if (wizard.step < TOTAL_STEPS) {
    btnNext.textContent = 'Próximo →';
    btnNext.className = 'btn btn-secondary';
  } else {
    btnNext.textContent = 'Gerar Ordem de Serviço';
    btnNext.className = 'btn btn-primary btn-lg btn-full';
  }
}

export function nextStep() {
  if (wizard.step === 1 && !validateStep1()) return;
  if (wizard.step === 2 && !validateStep2()) return;
  if (wizard.step === 3 && !validateStep3()) return;

  if (wizard.step === 2) buildSummary();

  if (wizard.step < TOTAL_STEPS) {
    wizard.step++;
    updateWizardStep();
  } else {
    buildSummary(); // garante que itens digitados no passo 3 entram na OS
    generateOS();
  }
}

export function prevStep() {
  if (wizard.step > 1) { wizard.step--; updateWizardStep(); }
}

function validateStep1() {
  const fields = [
    ['input-cliente',  'Nome do cliente é obrigatório'],
    ['input-telefone', 'Telefone é obrigatório'],
    ['input-marca',    'Marca/Modelo é obrigatório'],
    ['input-defeito',  'Descrição do defeito é obrigatória'],
  ];
  for (const [id, msg] of fields) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      showToast(msg, 'error');
      el.focus();
      el.style.borderColor = 'var(--danger)';
      setTimeout(() => el.style.borderColor = '', 2000);
      return false;
    }
  }
  return true;
}

function validateStep2() {
  if (wizard.data.fotos.length === 0) {
    showToast('Adicione pelo menos 1 foto para proteção jurídica', 'error');
    return false;
  }
  return true;
}

function validateStep3() {
  const check = document.getElementById('check-termos');
  if (!check || !check.checked) {
    showToast('Confirme os Termos e Condições para gerar a OS', 'error');
    check && check.scrollIntoView({ behavior: 'smooth' });
    return false;
  }
  return true;
}

/** Coleta tudo dos formulários para wizard.data e monta o resumo do passo 3. */
export function buildSummary() {
  const cliente  = document.getElementById('input-cliente').value;
  const telefone = document.getElementById('input-telefone').value;
  const cpf      = document.getElementById('input-cpf').value;
  const email    = document.getElementById('input-email').value;
  const endereco = document.getElementById('input-endereco').value;
  const cidade   = document.getElementById('input-cidade').value;
  const tipo     = document.getElementById('input-tipo').value;
  const marca    = document.getElementById('input-marca').value;
  const imei1    = document.getElementById('input-imei1').value;
  const imei2    = document.getElementById('input-imei2').value;
  const nfAparelho = document.querySelector('input[name="nf-aparelho"]:checked')?.value || 'nao';
  const garantia   = document.querySelector('input[name="garantia-aparelho"]:checked')?.value || 'nao';
  const defeito  = document.getElementById('input-defeito').value;
  const valor    = parseFloat(document.getElementById('input-valor').value) || 0;
  const previsao = document.getElementById('input-previsao').value;
  const condicoesOutros = document.getElementById('input-condicoes-outros').value;

  // Coleta checkboxes
  const condicoes = Array.from(document.querySelectorAll('.condicao-cb:checked')).map(cb => cb.value);

  // Coleta itens da tabela
  const itens = getItensFromTable();
  const itensTotal = itens.reduce((s, i) => s + i.total, 0);
  const valorFinal = itensTotal > 0 ? itensTotal : valor;

  wizard.data = {
    ...wizard.data,
    cliente, telefone, cpf, email, endereco, cidade,
    tipo, marca, imei1, imei2, nfAparelho, garantia,
    defeito, condicoes, condicoesOutros,
    senhaParao: [...wizard.pattern],
    valor: valorFinal,
    previsao, itens,
  };

  const condicoesStr = condicoes.length
    ? condicoes.join(', ') + (condicoesOutros ? `, ${condicoesOutros}` : '')
    : condicoesOutros || '—';

  const itensHTML = itens.length
    ? itens.map(i => `<div class="summary-row"><span class="summary-key" style="font-size:.75rem">${escHtml(String(i.qtde))}× ${escHtml(i.desc)}</span><span class="summary-val" style="font-size:.78rem">${formatCurrency(i.total)}</span></div>`).join('')
    : '<div class="summary-row"><span class="summary-key">Itens</span><span class="summary-val" style="font-style:italic;opacity:.7">Não informado</span></div>';

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-card">
      <div class="summary-row"><span class="summary-key">Cliente</span><span class="summary-val">${escHtml(cliente)}</span></div>
      <div class="summary-row"><span class="summary-key">Telefone</span><span class="summary-val">${escHtml(telefone)}</span></div>
      ${cpf ? `<div class="summary-row"><span class="summary-key">CPF</span><span class="summary-val">${escHtml(cpf)}</span></div>` : ''}
      ${cidade ? `<div class="summary-row"><span class="summary-key">Cidade</span><span class="summary-val">${escHtml(cidade)}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Aparelho</span><span class="summary-val">${escHtml(tipo)} — ${escHtml(marca)}</span></div>
      ${imei1 ? `<div class="summary-row"><span class="summary-key">IMEI 1</span><span class="summary-val" style="font-size:.78rem">${escHtml(imei1)}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">NF / Garantia</span><span class="summary-val">${nfAparelho === 'sim' ? 'Tem NF' : 'Sem NF'} · ${garantia === 'sim' ? 'Em garantia' : 'Sem garantia'}</span></div>
      <div class="summary-row"><span class="summary-key">Defeito</span><span class="summary-val" style="max-width:65%;font-size:.8rem">${escHtml(defeito)}</span></div>
      <div class="summary-row"><span class="summary-key">Condições</span><span class="summary-val" style="max-width:65%;font-size:.78rem">${escHtml(condicoesStr)}</span></div>
      ${wizard.pattern.length ? `<div class="summary-row"><span class="summary-key">Padrão</span><span class="summary-val" style="letter-spacing:2px">${wizard.pattern.map(Number).join('→')}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Fotos</span><span class="summary-val">${wizard.data.fotos.length} foto(s)</span></div>
      ${itensHTML}
      ${previsao ? `<div class="summary-row"><span class="summary-key">Previsão Saída</span><span class="summary-val">${new Date(previsao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
      <div class="summary-row" style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:8px"><span class="summary-key">Valor Total</span><span class="summary-val big">${formatCurrency(valorFinal)}</span></div>
    </div>`;
}

async function generateOS() {
  if (!checkProfileComplete()) return;
  const { os, dbError, fotoWarn } = await state.create(wizard.data);
  if (dbError) {
    showToast(`${os.id} criada, mas falha ao salvar no servidor. Verifique sua conexão.`, 'error');
  } else if (fotoWarn) {
    showToast(`${os.id} sincronizada, mas as fotos ficaram só no aparelho (armazenamento na nuvem não configurado).`, 'error');
  } else {
    showToast(`${os.id} criada com sucesso!`, 'success');
  }
  renderDashboard();
  setCurrentOSId(os.id);
  renderOSView(os.id);
  navigate('screen-os-view');
}
