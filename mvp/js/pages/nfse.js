/* ============================================================
   pages/nfse.js — Emissão de NFS-e (fluxo semi-manual)
   Tela no HTML: <section id="screen-nfse">
   O app pré-preenche os dados, abre o portal nacional
   (nfse.gov.br) e o usuário confirma o número emitido, que fica
   vinculado à OS.
   ============================================================ */

import { DEMO_CNPJ } from '../config/constants.js';
import { state } from '../core/app-state.js';
import { getProfile } from '../core/profile-store.js';
import { navigate } from '../core/navigation.js';
import { showToast } from '../utils/dom.js';
import { checkProfileComplete, renderSettings } from './configuracoes.js';
import { renderDashboard } from './dashboard.js';
import { getCurrentOSId, setCurrentOSId } from './os-view/os-view.js';

/** Abre a tela de NFS-e pré-preenchida com o perfil e a OS atual. */
export function openNFSe(id) {
  const os = state.getById(id || getCurrentOSId());

  // Prestador — dados do perfil da empresa
  const p = getProfile() || {};

  // Bloqueia se ainda houver dados demo (CNPJ falso de demonstração)
  if (!p.razao_social || p.cnpj_cpf === DEMO_CNPJ) {
    showToast('Atualize os dados da sua empresa antes de emitir a NFS-e.', 'error');
    renderSettings();
    navigate('screen-configuracoes');
    return;
  }
  document.getElementById('nfse-prestador-razao').value = p.razao_social       || '';
  document.getElementById('nfse-prestador-cnpj').value  = p.cnpj_cpf           || '';
  document.getElementById('nfse-prestador-im').value    = p.inscricao_municipal || '';
  document.getElementById('nfse-iss-aliq').value        = (p.aliquota_iss ?? 2).toFixed(1);
  document.getElementById('nfse-municipio').value       = p.cidade              || '';

  // Tomador — dados da OS (se houver OS selecionada)
  if (os) {
    setCurrentOSId(os.id);
    document.getElementById('nfse-tomador-nome').value = os.cliente;
    document.getElementById('nfse-tomador-tel').value  = os.telefone;
    document.getElementById('nfse-servico-desc').value = `${os.tipo} — ${os.marca}: ${os.defeito}`;
    document.getElementById('nfse-valor').value        = (os.valor || 0).toFixed(2);
  }

  document.getElementById('nfse-success').classList.remove('show');
  document.getElementById('nfse-form-inner').style.display = 'block';

  // Garante estado limpo do painel de confirmação a cada abertura
  document.getElementById('nfse-portal-instructions').classList.add('hidden');
  document.getElementById('btn-emitir-nfse').classList.remove('hidden');
  const numInput = document.getElementById('nfse-numero-manual');
  if (numInput) numInput.value = '';

  navigate('screen-nfse');
}

/** Valida os dados e abre o portal nacional para emissão. */
export function emitirNFSe() {
  if (!checkProfileComplete()) return;

  const cnpj  = document.getElementById('nfse-prestador-cnpj').value.trim();
  const valor = parseFloat(document.getElementById('nfse-valor').value) || 0;

  if (!cnpj) {
    showToast('CNPJ/CPF do prestador é obrigatório. Configure em Configurações → Fiscal.', 'error');
    return;
  }
  if (valor <= 0) {
    showToast('Informe o valor total do serviço antes de emitir.', 'error');
    return;
  }

  // Abre o portal federal em nova aba de forma segura
  window.open('https://www.nfse.gov.br', '_blank', 'noopener,noreferrer');

  // Exibe o painel de confirmação manual e oculta o botão principal
  document.getElementById('nfse-portal-instructions').classList.remove('hidden');
  document.getElementById('btn-emitir-nfse').classList.add('hidden');
}

/** Vincula o número da NFS-e emitida no portal à OS e conclui a OS. */
export async function confirmarNumeroNFSe() {
  const numero = document.getElementById('nfse-numero-manual').value.trim();
  if (!numero || !/^\d{1,10}$/.test(numero)) {
    showToast('Informe o número da NFS-e (somente dígitos, máx. 10).', 'error');
    return;
  }

  const nfseNum = `NFS-e Nº ${numero}`;
  const currentOSId = getCurrentOSId();
  const os = state.getById(currentOSId);
  if (os) {
    const { dbError } = await state.update(currentOSId, { nfse: nfseNum, status: 'concluida' });
    if (dbError) showToast('NFS-e salva localmente, mas falha ao sincronizar com o servidor.', 'error');
  }

  // Exibe tela de sucesso
  document.getElementById('nfse-form-inner').style.display = 'none';
  document.getElementById('nfse-emitted-number').textContent = nfseNum;
  document.getElementById('nfse-emitted-os').textContent     = currentOSId || '';
  document.getElementById('nfse-success').classList.add('show');

  // Reseta o painel para a próxima emissão
  document.getElementById('nfse-portal-instructions').classList.add('hidden');
  document.getElementById('btn-emitir-nfse').classList.remove('hidden');
  document.getElementById('nfse-numero-manual').value = '';

  showToast(`${nfseNum} vinculada à ${currentOSId}`, 'success');
  renderDashboard();
}
