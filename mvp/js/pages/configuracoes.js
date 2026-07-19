/* ============================================================
   pages/configuracoes.js — Configurações / Perfil da empresa
   Tela no HTML: <section id="screen-configuracoes">
   Também controla o ONBOARDING: enquanto o perfil não está
   completo, o app força o usuário a preencher os dados aqui.
   ============================================================ */

import { getProfile, setProfile } from '../core/profile-store.js';
import { navigate } from '../core/navigation.js';
import { state } from '../core/app-state.js';
import { showToast } from '../utils/dom.js';
import { dbSaveProfile } from '../services/profile-service.js';
import { dbLoadAll } from '../services/os-service.js';
import { buscarCEP } from '../services/cep-service.js';
import { renderDashboard } from './dashboard.js';

// Ambiente de emissão de NFS-e selecionado na aba Fiscal
let configAmbiente = 'homologacao';

/** Coloca o app em modo onboarding e abre a tela de configurações. */
export function enterOnboarding() {
  document.body.classList.add('onboarding-mode');
  document.getElementById('onboarding-badge').classList.remove('hidden');
  document.getElementById('btn-salvar-config').textContent = 'Salvar e Começar →';
  document.getElementById('btn-config-voltar').classList.add('hidden');
  renderSettings();
  navigate('screen-configuracoes');
}

/** Bloqueia ações que exigem perfil completo (gerar OS, emitir NFS-e). */
export function checkProfileComplete() {
  const profile = getProfile();
  if (!profile || !profile.perfil_completo) {
    showToast('Configure os dados da empresa antes de continuar.', 'error');
    enterOnboarding();
    return false;
  }
  return true;
}

export function switchConfigTab(tab) {
  ['empresa', 'endereco', 'os', 'fiscal'].forEach(t => {
    document.getElementById(`ctab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`config-panel-${t}`).classList.toggle('hidden', t !== tab);
  });
}

export function setAmbiente(val) {
  configAmbiente = val;
  document.getElementById('btn-homologacao').classList.toggle('active', val === 'homologacao');
  document.getElementById('btn-producao').classList.toggle('active', val === 'producao');
  document.getElementById('ambiente-hint').textContent = val === 'producao'
    ? 'Atenção — Modo Produção: NFS-e emitidas terão validade fiscal real'
    : 'Use Homologação para testes antes de emitir notas reais';
}

/** Preenche o formulário com o perfil atual (ou vazio). */
export function renderSettings() {
  const p = getProfile() || {};
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  set('cfg-nome-fantasia', p.nome_fantasia);
  set('cfg-razao-social',  p.razao_social);
  set('cfg-cnpj-cpf',      p.cnpj_cpf);
  set('cfg-telefone',      p.telefone);
  set('cfg-cep',           p.cep);
  set('cfg-logradouro',    p.logradouro);
  set('cfg-numero',        p.numero);
  set('cfg-complemento',   p.complemento);
  set('cfg-bairro',        p.bairro);
  set('cfg-cidade',        p.cidade);
  set('cfg-estado',        p.estado);
  set('cfg-termos',        p.termos_garantia);
  set('cfg-observacoes',   p.observacoes_padrao);
  set('cfg-rodape',        p.rodape);
  set('cfg-inscricao-municipal', p.inscricao_municipal);
  set('cfg-iss',           p.aliquota_iss ?? 2.0);
  set('cfg-cert',          p.cert_digital_path);
  set('cfg-serie',         p.nfse_serie || '1');
  set('cfg-nf-num',        p.nfse_numero_inicial || 1);

  const regime = document.getElementById('cfg-regime');
  if (regime) regime.value = p.regime_tributario || 'mei';

  if (p.logo_base64) {
    document.getElementById('logo-preview').src = p.logo_base64;
    document.getElementById('logo-preview').classList.remove('hidden');
    document.getElementById('logo-placeholder').classList.add('hidden');
  } else {
    document.getElementById('logo-preview').classList.add('hidden');
    document.getElementById('logo-placeholder').classList.remove('hidden');
  }

  setAmbiente(p.ambiente_emissao || 'homologacao');
  switchConfigTab('empresa');
}

/** Lê o formulário, valida e salva o perfil no Supabase. */
export async function saveProfileData() {
  const nome_fantasia = document.getElementById('cfg-nome-fantasia').value.trim();
  const razao_social  = document.getElementById('cfg-razao-social').value.trim();
  const cnpj_cpf      = document.getElementById('cfg-cnpj-cpf').value.trim();

  if (!nome_fantasia || !razao_social || !cnpj_cpf) {
    showToast('Preencha os campos obrigatórios: Nome Fantasia, Razão Social e CNPJ/CPF', 'error');
    switchConfigTab('empresa');
    return;
  }

  const logoEl  = document.getElementById('logo-preview');
  const logoB64 = !logoEl.classList.contains('hidden') ? logoEl.src : '';

  const profile = {
    nome_fantasia,
    razao_social,
    cnpj_cpf,
    telefone:            document.getElementById('cfg-telefone').value.trim(),
    logo_base64:         logoB64,
    cep:                 document.getElementById('cfg-cep').value.trim(),
    logradouro:          document.getElementById('cfg-logradouro').value.trim(),
    numero:              document.getElementById('cfg-numero').value.trim(),
    complemento:         document.getElementById('cfg-complemento').value.trim(),
    bairro:              document.getElementById('cfg-bairro').value.trim(),
    cidade:              document.getElementById('cfg-cidade').value.trim(),
    estado:              document.getElementById('cfg-estado').value.trim(),
    termos_garantia:     document.getElementById('cfg-termos').value.trim(),
    observacoes_padrao:  document.getElementById('cfg-observacoes').value.trim(),
    rodape:              document.getElementById('cfg-rodape').value.trim(),
    inscricao_municipal: document.getElementById('cfg-inscricao-municipal').value.trim(),
    regime_tributario:   document.getElementById('cfg-regime').value,
    aliquota_iss:        parseFloat(document.getElementById('cfg-iss').value) || 2.0,
    cert_digital_path:   document.getElementById('cfg-cert').value.trim(),
    ambiente_emissao:    configAmbiente,
    nfse_serie:          document.getElementById('cfg-serie').value.trim() || '1',
    nfse_numero_inicial: parseInt(document.getElementById('cfg-nf-num').value) || 1,
    perfil_completo:     true,
  };

  const btn = document.getElementById('btn-salvar-config');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  const { error } = await dbSaveProfile(profile);

  btn.disabled = false;

  if (error) {
    showToast('Erro ao salvar. Tente novamente.', 'error');
    btn.textContent = document.body.classList.contains('onboarding-mode') ? 'Salvar e Começar →' : 'Salvar Configurações';
    return;
  }

  setProfile(profile);
  showToast('Configurações salvas com sucesso!', 'success');

  if (document.body.classList.contains('onboarding-mode')) {
    document.body.classList.remove('onboarding-mode');
    document.getElementById('onboarding-badge').classList.add('hidden');
    document.getElementById('btn-config-voltar').classList.remove('hidden');
    btn.textContent = 'Salvar Configurações';
    const remoteOS = await dbLoadAll();
    if (remoteOS !== null) state.mergeFromCloud(remoteOS);
    renderDashboard();
    navigate('screen-dashboard');
  } else {
    btn.textContent = 'Salvar Configurações';
  }
}

/** Busca o CEP digitado e preenche os campos de endereço. */
export async function lookupCEP() {
  const cep = document.getElementById('cfg-cep').value.replace(/\D/g, '');
  if (cep.length !== 8) { showToast('CEP inválido.', 'error'); return; }

  const btn = document.getElementById('btn-buscar-cep');
  btn.textContent = '...';
  btn.disabled    = true;

  try {
    const data = await buscarCEP(cep);
    if (data.erro) { showToast('CEP não encontrado.', 'error'); return; }
    document.getElementById('cfg-logradouro').value = data.logradouro || '';
    document.getElementById('cfg-bairro').value     = data.bairro     || '';
    document.getElementById('cfg-cidade').value     = data.localidade || '';
    document.getElementById('cfg-estado').value     = data.uf         || '';
    document.getElementById('cfg-numero').focus();
  } catch { showToast('Erro ao buscar CEP.', 'error'); }
  finally {
    btn.textContent = 'Buscar';
    btn.disabled    = false;
  }
}

/** Máscara 00000-000 + busca automática quando completa 8 dígitos. */
export function handleCEPInput(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
  if (v.replace('-', '').length === 8) lookupCEP();
}

/** Upload do logo: valida formato/tamanho e redimensiona para 300px. */
export function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED.includes(file.type)) {
    showToast('Formato inválido. Use JPG, PNG, WebP ou GIF.', 'error');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) { // 2 MB
    showToast('Imagem muito grande. Máximo 2 MB.', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      document.getElementById('logo-preview').src = canvas.toDataURL('image/png', 0.9);
      document.getElementById('logo-preview').classList.remove('hidden');
      document.getElementById('logo-placeholder').classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}
