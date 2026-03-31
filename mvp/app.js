/* ============================================================
   OficinaPRO — app.js
   Vanilla JS ES6+ | Zero dependências externas
   ============================================================ */

'use strict';

// ── Constantes ────────────────────────────────────────────────
const STORAGE_KEY  = 'oficina_pro_os';
const CONFIG_KEY   = 'oficina_pro_config';

const DEVICE_TYPES = ['Celular','Notebook','Tablet','Eletrodoméstico','TV','Câmera','Videogame','Outro'];

const SERVICES_NFSE = [
  { code: '14.01', desc: 'Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto' },
  { code: '14.02', desc: 'Assistência técnica' },
  { code: '14.03', desc: 'Recondicionamento de motores (exceto peças e partes empregadas, que ficam sujeitas ao ICMS)' },
  { code: '14.04', desc: 'Recauchutagem ou regeneração de pneus' },
  { code: '14.05', desc: 'Restauração, recondicionamento, acondicionamento, pintura, beneficiamento, lavagem, secagem, tingimento, galvanoplastia, anodização, corte, recorte, polimento, plastificação e congêneres, de objetos quaisquer' },
  { code: '14.06', desc: 'Instalação e montagem de aparelhos, máquinas e equipamentos, inclusive montagem industrial, prestados ao usuário final' },
];

const LUCRO_DATA = [
  { servico: 'Troca de tela',         preco: 280, tempo: 1.5, margem: 130 },
  { servico: 'Troca de bateria',      preco: 120, tempo: 0.5, margem: 175 },
  { servico: 'Conector de carga',     preco: 90,  tempo: 0.5, margem: 140 },
  { servico: 'Formatação/Software',   preco: 80,  tempo: 0.75,margem: 98  },
  { servico: 'Troca de câmera',       preco: 180, tempo: 1.0, margem: 130 },
  { servico: 'Reparo de placa mãe',   preco: 350, tempo: 3.0, margem: 95  },
  { servico: 'Troca de teclado NB',   preco: 150, tempo: 1.0, margem: 110 },
  { servico: 'Limpeza interna',       preco: 70,  tempo: 0.5, margem: 105 },
  { servico: 'Troca de alto-falante', preco: 100, tempo: 0.75,margem: 98  },
  { servico: 'Desbloqueio/IMEI',      preco: 60,  tempo: 0.25,margem: 185 },
];

// Oficina prestadora (dados fixos para demo)
const OFICINA = {
  razao:   'TechFix Assistência Técnica LTDA',
  cnpj:    '12.345.678/0001-99',
  im:      '1234567',
  endereco:'Rua das Ferramentas, 123 — São Paulo/SP',
  telefone:'(11) 99999-0000',
};

// ── State Manager ──────────────────────────────────────────────
class AppState {
  constructor() {
    this._os     = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    this._config = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') || OFICINA;

    // OS mockadas para demo (inseridas apenas se o storage estiver vazio)
    if (this._os.length === 0) this._seedMockData();
  }

  _seedMockData() {
    const mock = [
      {
        id: 'OS-2026-0001', numero: 1,
        cliente: 'Carlos Eduardo Silva', telefone: '(11) 98765-4321',
        tipo: 'Celular', marca: 'Samsung Galaxy S22',
        defeito: 'Tela quebrada — mancha de pressão no canto inferior',
        valor: 280, status: 'concluida',
        dataCriacao: new Date(Date.now() - 86400000 * 2).toISOString(),
        fotos: [], nfse: 'NFS-e Nº 000121',
        assinatura: { status: 'signed', hora: '10:42' },
      },
      {
        id: 'OS-2026-0002', numero: 2,
        cliente: 'Ana Paula Rodrigues', telefone: '(11) 91234-5678',
        tipo: 'Notebook', marca: 'Dell Inspiron 15',
        defeito: 'Não liga — provável falha na bateria ou conector de carga',
        valor: 150, status: 'andamento',
        dataCriacao: new Date(Date.now() - 3600000).toISOString(),
        fotos: [], nfse: null,
        assinatura: { status: 'signed', hora: '09:15' },
      },
      {
        id: 'OS-2026-0003', numero: 3,
        cliente: 'Roberto Fernandes', telefone: '(21) 99887-6655',
        tipo: 'Tablet', marca: 'iPad 9ª geração',
        defeito: 'Botão home não responde, tela com riscos',
        valor: 200, status: 'aguardando',
        dataCriacao: new Date(Date.now() - 900000).toISOString(),
        fotos: [], nfse: null,
        assinatura: { status: 'pending', hora: null },
      },
    ];
    mock.forEach(os => this._os.push(os));
    this._save();
  }

  _save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._os)); }

  getAll()      { return [...this._os].reverse(); }
  getById(id)   { return this._os.find(os => os.id === id); }

  getNextNum() {
    const nums = this._os.map(o => o.numero || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }

  create(data) {
    const num = this.getNextNum();
    const os  = {
      ...data,
      numero:       num,
      id:           `OS-2026-${String(num).padStart(4,'0')}`,
      dataCriacao:  new Date().toISOString(),
      status:       'aguardando',
      nfse:         null,
      assinatura:   { status: 'pending', hora: null },
    };
    this._os.push(os);
    this._save();
    if (typeof dbSave === 'function') dbSave(os).catch(e => console.error('[sync] Falha ao salvar OS:', e));
    return os;
  }

  update(id, patch) {
    const idx = this._os.findIndex(os => os.id === id);
    if (idx === -1) return;
    this._os[idx] = { ...this._os[idx], ...patch };
    this._save();
    if (typeof dbSave === 'function') dbSave(this._os[idx]).catch(e => console.error('[sync] Falha ao atualizar OS:', e));
    return this._os[idx];
  }

  mergeFromCloud(remoteOS) {
    // Substitui o estado local pelo dado vindo do Supabase
    this._os = remoteOS;
    this._save();
  }

  // Mini-dashboard metrics
  metrics() {
    const hoje = new Date().toDateString();
    const osHoje = this._os.filter(o => new Date(o.dataCriacao).toDateString() === hoje);
    const faturamento = osHoje.filter(o => o.status === 'concluida').reduce((acc, o) => acc + (o.valor || 0), 0);
    const nfsEmitidas = this._os.filter(o => o.nfse !== null).length;
    return { total: osHoje.length, faturamento, nfsEmitidas };
  }
}

// ── Instância global do state ───────────────────────────────────
const state = new AppState();

// ── Perfil da empresa (multi-tenant) ───────────────────────────
let currentProfile  = null;
let configAmbiente  = 'homologacao';

// ── Auth & Init ─────────────────────────────────────────────────

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');
  btn.disabled    = true;
  btn.textContent = 'Entrando...';

  const { error } = await dbSignIn(email, password);

  btn.disabled    = false;
  btn.textContent = 'Entrar';

  if (error) {
    errEl.textContent = 'Email ou senha incorretos.';
    errEl.classList.remove('hidden');
    return;
  }

  showApp();
  await postLoginSetup();
}

async function handleLogout() {
  await dbSignOut();
  localStorage.removeItem('oficina_pro_os');
  state._os      = [];
  currentProfile = null;
  document.body.classList.remove('onboarding-mode');
  showLoginScreen();
}

async function postLoginSetup() {
  currentProfile = await dbLoadProfile();

  if (!currentProfile || !currentProfile.perfil_completo) {
    document.body.classList.add('onboarding-mode');
    document.getElementById('onboarding-badge').classList.remove('hidden');
    document.getElementById('btn-salvar-config').textContent = 'Salvar e Começar →';
    document.getElementById('btn-config-voltar').classList.add('hidden');
    renderSettings();
    navigate('screen-configuracoes');
    return;
  }

  const remoteOS = await dbLoadAll();
  if (remoteOS !== null) state.mergeFromCloud(remoteOS);
  renderDashboard();
}

async function initApp() {
  const session = await dbGetSession();
  if (!session) { showLoginScreen(); return; }
  showApp();
  await postLoginSetup();
}

initApp();

// ── Wizard state ────────────────────────────────────────────────
let wizardData = { fotos: [], condicoes: [], senhaParao: [], itens: [] };
let currentStep = 1;
let currentOSId = null; // OS sendo visualizada
let patternSequence = []; // dots selecionados no padrão 3x3
let itemRowCount = 0;

// ── Utils ──────────────────────────────────────────────────────
function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
function formatDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}
function statusBadge(status) {
  const map = {
    aguardando: ['badge-waiting',  '⏳ Aguardando'],
    andamento:  ['badge-progress', '🔧 Em andamento'],
    concluida:  ['badge-done',     '✅ Concluída'],
  };
  const [cls, label] = map[status] || ['badge-waiting', status];
  return `<span class="badge ${cls}">${label}</span>`;
}
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Navegação ──────────────────────────────────────────────────
function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Configurações / Perfil ─────────────────────────────────────

function checkProfileComplete() {
  if (!currentProfile || !currentProfile.perfil_completo) {
    showToast('Configure os dados da empresa antes de continuar.', 'error');
    document.body.classList.add('onboarding-mode');
    document.getElementById('onboarding-badge').classList.remove('hidden');
    document.getElementById('btn-salvar-config').textContent = 'Salvar e Começar →';
    document.getElementById('btn-config-voltar').classList.add('hidden');
    renderSettings();
    navigate('screen-configuracoes');
    return false;
  }
  return true;
}

function switchConfigTab(tab) {
  ['empresa', 'endereco', 'os', 'fiscal'].forEach(t => {
    document.getElementById(`ctab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`config-panel-${t}`).classList.toggle('hidden', t !== tab);
  });
}

function setAmbiente(val) {
  configAmbiente = val;
  document.getElementById('btn-homologacao').classList.toggle('active', val === 'homologacao');
  document.getElementById('btn-producao').classList.toggle('active', val === 'producao');
  document.getElementById('ambiente-hint').textContent = val === 'producao'
    ? '⚠️ Modo Produção: NFS-e emitidas terão validade fiscal real'
    : 'Use Homologação para testes antes de emitir notas reais';
}

function renderSettings() {
  const p = currentProfile || {};
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

async function saveProfileData() {
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

  currentProfile = profile;
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

async function lookupCEP() {
  const cep = document.getElementById('cfg-cep').value.replace(/\D/g, '');
  if (cep.length !== 8) { showToast('CEP inválido.', 'error'); return; }

  const btn = document.getElementById('btn-buscar-cep');
  btn.textContent = '...';
  btn.disabled    = true;

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
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

function handleCEPInput(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
  if (v.replace('-', '').length === 8) lookupCEP();
}

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
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

// ── Dashboard ──────────────────────────────────────────────────
function renderDashboard() {
  const m    = state.metrics();
  const list = state.getAll().slice(0, 5);

  // Métricas
  document.getElementById('metric-os-hoje').textContent   = m.total;
  document.getElementById('metric-faturamento').textContent = formatCurrency(m.faturamento).replace('R$\u00a0', 'R$');
  document.getElementById('metric-nfse').textContent      = m.nfsEmitidas;

  // Lista de OSs
  const container = document.getElementById('os-list');
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p>Nenhuma OS registrada ainda.<br>Toque em <strong>Nova OS</strong> para começar.</p>
      </div>`;
    return;
  }
  container.innerHTML = list.map(os => `
    <div class="os-item" onclick="openOS('${os.id}')">
      <div class="os-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a365d" stroke-width="1.8">
          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="os-info">
        <div class="os-number">${os.id}</div>
        <div class="os-client">${os.cliente}</div>
        <div class="os-device">${os.tipo} — ${os.marca}</div>
      </div>
      <div class="os-meta">
        <div class="os-value">${formatCurrency(os.valor)}</div>
        <div class="mt-4">${statusBadge(os.status)}</div>
      </div>
    </div>`).join('');
}

function openOS(id) {
  currentOSId = id;
  renderOSView(id);
  navigate('screen-os-view');
}

// ── Wizard — Nova OS ───────────────────────────────────────────
function startNovaOS() {
  wizardData = { fotos: [], condicoes: [], senhaParao: [], itens: [] };
  currentStep = 1;
  patternSequence = [];
  itemRowCount = 0;
  document.getElementById('form-nova-os').reset();
  document.getElementById('photo-previews').innerHTML = '';
  document.getElementById('photo-count').textContent = '0';
  document.getElementById('itens-tbody').innerHTML = '';
  document.getElementById('itens-total').textContent = 'R$ 0,00';
  // Reset checkboxes
  document.querySelectorAll('.condicao-cb').forEach(cb => cb.checked = false);
  // Reset pattern
  clearPattern();
  // Preenchimento da data de entrada (hoje)
  const today = new Date().toISOString().split('T')[0];
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

// ── Máscara CPF ────────────────────────────────────────────────
function maskCPF(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}

// ── Itens / Tabela ────────────────────────────────────────────
function addItemRow() {
  const tbody = document.getElementById('itens-tbody');
  const idx = itemRowCount++;
  const tr = document.createElement('tr');
  tr.id = `item-row-${idx}`;
  tr.style.borderBottom = '1px solid #e2e8f0';
  tr.innerHTML = `
    <td style="padding:4px 6px">
      <input class="item-input" type="number" min="1" value="1" style="width:44px;text-align:center"
             oninput="updateItemTotal(${idx})">
    </td>
    <td style="padding:4px 6px">
      <input class="item-input" type="text" placeholder="Ex: Troca de tela, Mão de obra..." style="min-width:120px">
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

function removeItemRow(idx) {
  const row = document.getElementById(`item-row-${idx}`);
  if (row) row.remove();
  recalcItensTotal();
}

function updateItemTotal(idx) {
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
}

function getItensFromTable() {
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

// ── Pattern Lock ────────────────────────────────────────────────
function clickPatternDot(num) {
  if (patternSequence.includes(num)) return; // não repete
  patternSequence.push(num);
  const dot = document.querySelector(`.pattern-dot[data-num="${num}"]`);
  if (dot) {
    dot.classList.add('selected');
    if (patternSequence.length === 1) dot.classList.add('first');
  }
  drawPatternLines();
  document.getElementById('pattern-display').textContent = patternSequence.join(' → ');
}

function clearPattern() {
  patternSequence = [];
  document.querySelectorAll('.pattern-dot').forEach(d => d.classList.remove('selected', 'first'));
  const svg = document.getElementById('pattern-svg');
  if (svg) svg.innerHTML = '';
  const display = document.getElementById('pattern-display');
  if (display) display.textContent = '—';
}

function drawPatternLines() {
  const grid = document.getElementById('pattern-grid');
  const svg  = document.getElementById('pattern-svg');
  if (!grid || !svg || patternSequence.length < 2) return;
  const gRect = grid.getBoundingClientRect();
  const lines = [];
  for (let i = 0; i < patternSequence.length - 1; i++) {
    const a = document.querySelector(`.pattern-dot[data-num="${patternSequence[i]}"]`);
    const b = document.querySelector(`.pattern-dot[data-num="${patternSequence[i+1]}"]`);
    if (!a || !b) continue;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x1 = ra.left - gRect.left + ra.width / 2;
    const y1 = ra.top  - gRect.top  + ra.height / 2;
    const x2 = rb.left - gRect.left + rb.width / 2;
    const y2 = rb.top  - gRect.top  + rb.height / 2;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a365d" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`);
  }
  svg.innerHTML = lines.join('');
}

function updateWizardStep() {
  const total = 3;
  const pct   = ((currentStep - 1) / (total - 1)) * 100;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-title').textContent = [
    '', 'Dados do cliente e aparelho', 'Fotos de vistoria', 'Confirmação e geração'
  ][currentStep];

  for (let i = 1; i <= total; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    dot.classList.remove('active','done');
    if (i < currentStep)  dot.classList.add('done');
    if (i === currentStep) dot.classList.add('active');
  }
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`wizard-step-${currentStep}`).classList.add('active');

  document.getElementById('btn-prev').classList.toggle('hidden', currentStep === 1);
  const btnNext = document.getElementById('btn-next');
  if (currentStep < total) {
    btnNext.textContent = 'Próximo →';
    btnNext.className = 'btn btn-secondary';
  } else {
    btnNext.textContent = '✅ Gerar Ordem de Serviço';
    btnNext.className = 'btn btn-primary btn-lg btn-full';
  }
}

function nextStep() {
  if (currentStep === 1 && !validateStep1()) return;
  if (currentStep === 2 && !validateStep2()) return;
  if (currentStep === 3 && !validateStep3()) return;

  if (currentStep === 2) buildSummary();

  if (currentStep < 3) {
    currentStep++;
    updateWizardStep();
  } else {
    generateOS();
  }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; updateWizardStep(); }
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

function validateStep3() {
  const check = document.getElementById('check-termos');
  if (!check || !check.checked) {
    showToast('Confirme os Termos e Condições para gerar a OS', 'error');
    check && check.scrollIntoView({ behavior: 'smooth' });
    return false;
  }
  return true;
}

function validateStep2() {
  if (wizardData.fotos.length === 0) {
    showToast('Adicione pelo menos 1 foto para proteção jurídica', 'error');
    return false;
  }
  return true;
}

function buildSummary() {
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

  wizardData = {
    ...wizardData,
    cliente, telefone, cpf, email, endereco, cidade,
    tipo, marca, imei1, imei2, nfAparelho, garantia,
    defeito, condicoes, condicoesOutros,
    senhaParao: [...patternSequence],
    valor: valorFinal,
    previsao, itens,
  };

  const condicoesStr = condicoes.length
    ? condicoes.join(', ') + (condicoesOutros ? `, ${condicoesOutros}` : '')
    : condicoesOutros || '—';

  const itensHTML = itens.length
    ? itens.map(i => `<div class="summary-row"><span class="summary-key" style="font-size:.75rem">${i.qtde}× ${i.desc}</span><span class="summary-val" style="font-size:.78rem">${formatCurrency(i.total)}</span></div>`).join('')
    : '<div class="summary-row"><span class="summary-key">Itens</span><span class="summary-val" style="font-style:italic;opacity:.7">Não informado</span></div>';

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-card">
      <div class="summary-row"><span class="summary-key">Cliente</span><span class="summary-val">${cliente}</span></div>
      <div class="summary-row"><span class="summary-key">Telefone</span><span class="summary-val">${telefone}</span></div>
      ${cpf ? `<div class="summary-row"><span class="summary-key">CPF</span><span class="summary-val">${cpf}</span></div>` : ''}
      ${cidade ? `<div class="summary-row"><span class="summary-key">Cidade</span><span class="summary-val">${cidade}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Aparelho</span><span class="summary-val">${tipo} — ${marca}</span></div>
      ${imei1 ? `<div class="summary-row"><span class="summary-key">IMEI 1</span><span class="summary-val" style="font-size:.78rem">${imei1}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">NF / Garantia</span><span class="summary-val">${nfAparelho === 'sim' ? '✅ Tem NF' : 'Sem NF'} · ${garantia === 'sim' ? '✅ Em garantia' : 'Sem garantia'}</span></div>
      <div class="summary-row"><span class="summary-key">Defeito</span><span class="summary-val" style="max-width:65%;font-size:.8rem">${defeito}</span></div>
      <div class="summary-row"><span class="summary-key">Condições</span><span class="summary-val" style="max-width:65%;font-size:.78rem">${condicoesStr}</span></div>
      ${patternSequence.length ? `<div class="summary-row"><span class="summary-key">Padrão</span><span class="summary-val" style="letter-spacing:2px">${patternSequence.join('→')}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Fotos</span><span class="summary-val">${wizardData.fotos.length} foto(s)</span></div>
      ${itensHTML}
      ${previsao ? `<div class="summary-row"><span class="summary-key">Previsão Saída</span><span class="summary-val">${new Date(previsao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
      <div class="summary-row" style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:8px"><span class="summary-key">Valor Total</span><span class="summary-val big">${formatCurrency(valorFinal)}</span></div>
    </div>`;
}

function generateOS() {
  if (!checkProfileComplete()) return;
  const os = state.create(wizardData);
  showToast(`${os.id} criada com sucesso!`, 'success');
  renderDashboard();
  currentOSId = os.id;
  renderOSView(os.id);
  navigate('screen-os-view');
}

// ── Câmera & Canvas Timestamp ──────────────────────────────────
async function handlePhotoCapture(input) {
  const files = Array.from(input.files);
  if (!files.length) return;

  const remaining = 5 - wizardData.fotos.length;
  const toProcess = files.slice(0, remaining);

  for (const file of toProcess) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const stamped = await stampTimestamp(dataUrl);
      wizardData.fotos.push(stamped);
    } catch (e) {
      console.error('Erro ao processar foto:', e);
    }
  }

  input.value = ''; // permite reutilizar o input
  renderPhotoPreviews();
  document.getElementById('photo-count').textContent = wizardData.fotos.length;
  showToast(`${toProcess.length} foto(s) adicionada(s) com carimbo de data/hora`, 'success');
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function stampTimestamp(dataUrl) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1280;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Timestamp
      const now      = new Date();
      const dateStr  = now.toLocaleDateString('pt-BR');
      const timeStr  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const locStr   = 'São Paulo, SP'; // GPS simulado

      const fontSize = Math.max(12, Math.round(w / 40));
      ctx.font       = `bold ${fontSize}px Inter, sans-serif`;
      const lines    = [`📅 ${dateStr} ${timeStr}`, `📍 ${locStr}`];
      const padding  = 10;
      const lineH    = fontSize + 6;
      const boxH     = lines.length * lineH + padding * 2;
      const boxW     = lines.reduce((mx, l) => Math.max(mx, ctx.measureText(l).width), 0) + padding * 2;

      // Caixa semitransparente na parte inferior
      const bx = padding;
      const by = h - boxH - padding;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();

      // Texto branco
      ctx.fillStyle = '#ffffff';
      lines.forEach((line, i) => {
        ctx.fillText(line, bx + padding, by + padding + fontSize + i * lineH);
      });

      res(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = dataUrl;
  });
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  container.innerHTML = wizardData.fotos.map((src, i) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Foto ${i+1}" loading="lazy">
      <button class="photo-remove" onclick="removePhoto(${i})" title="Remover foto">✕</button>
    </div>`).join('');
}

function removePhoto(idx) {
  wizardData.fotos.splice(idx, 1);
  renderPhotoPreviews();
  document.getElementById('photo-count').textContent = wizardData.fotos.length;
}

// ── Visualização de OS ─────────────────────────────────────────
function renderOSView(id) {
  const os = state.getById(id);
  if (!os) return;

  const photoHTML = os.fotos && os.fotos.length
    ? `<div class="photo-grid">${os.fotos.map((src, i) => `<div class="photo-thumb"><img src="${src}" alt="Foto ${i+1}" loading="lazy"></div>`).join('')}</div>`
    : `<p class="text-muted" style="font-size:.8rem;font-style:italic">Sem fotos registradas.</p>`;

  const signHTML = os.assinatura?.status === 'signed'
    ? `<div class="sign-status signed">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Assinado digitalmente às ${os.assinatura.hora}
       </div>`
    : `<div class="sign-status pending" id="sign-status-${os.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Aguardando assinatura do cliente
       </div>`;

  const nfseHTML = os.nfse
    ? `<span class="badge badge-nfse">✅ ${os.nfse}</span>`
    : `<span class="badge badge-waiting">Pendente</span>`;

  const concludeBtn = os.status !== 'concluida'
    ? `<button class="btn btn-success btn-full mt-16" onclick="openNFSe('${os.id}')">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
         Concluir e Emitir NFS-e
       </button>`
    : '';

  const condicoesStr = os.condicoes && os.condicoes.length
    ? os.condicoes.join(', ') + (os.condicoesOutros ? ', ' + os.condicoesOutros : '')
    : '';
  const wppMsg = encodeURIComponent(
    `Olá ${os.cliente}! Sua OS *${os.id}* foi criada.\n` +
    `🔧 Aparelho: ${os.tipo ? os.tipo + ' — ' : ''}${os.marca}\n` +
    `⚠️ Defeito: ${os.defeito}\n` +
    (condicoesStr ? `📋 Condições na entrada: ${condicoesStr}\n` : '') +
    (os.imei1 ? `📱 IMEI: ${os.imei1}\n` : '') +
    `💰 Valor estimado: ${formatCurrency(os.valor)}\n` +
    (os.previsao ? `📅 Previsão de entrega: ${new Date(os.previsao + 'T12:00:00').toLocaleDateString('pt-BR')}\n` : '') +
    `\n` +
    `✅ *Para assinar a OS digitalmente, responda: CONFIRMO*\n` +
    `Ao confirmar, você aceita os termos e condições da ${currentProfile?.razao_social || 'nossa empresa'}.`
  );
  const wppUrl = `https://wa.me/55${os.telefone.replace(/\D/g,'')}?text=${wppMsg}`;

  document.getElementById('os-view-content').innerHTML = `
    <div class="os-document">
      <div class="os-doc-header">
        <div>
          <div style="font-size:.72rem;opacity:.7;text-transform:uppercase;letter-spacing:.5px">Ordem de Serviço</div>
          <div class="os-num">${os.id}</div>
          <div style="font-size:.78rem;opacity:.8;margin-top:4px">${formatDate(os.dataCriacao)}</div>
        </div>
        <div style="text-align:right">
          <div>${statusBadge(os.status)}</div>
          <div style="margin-top:8px">${nfseHTML}</div>
        </div>
      </div>
      <div class="os-doc-body">

        <div class="os-doc-section">
          <h4>👤 Dados do Cliente</h4>
          <div class="os-field-row"><span class="os-field-label">Nome</span><span class="os-field-value">${os.cliente}</span></div>
          <div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${os.telefone}</span></div>
          ${os.cpf ? `<div class="os-field-row"><span class="os-field-label">CPF</span><span class="os-field-value">${os.cpf}</span></div>` : ''}
          ${os.email ? `<div class="os-field-row"><span class="os-field-label">E-mail</span><span class="os-field-value">${os.email}</span></div>` : ''}
          ${os.endereco ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.8rem">${os.endereco}${os.cidade ? ' — ' + os.cidade : ''}</span></div>` : ''}
        </div>

        <div class="os-doc-section">
          <h4>📱 Aparelho</h4>
          <div class="os-field-row"><span class="os-field-label">Tipo</span><span class="os-field-value">${os.tipo || '—'}</span></div>
          <div class="os-field-row"><span class="os-field-label">Marca/Modelo</span><span class="os-field-value">${os.marca}</span></div>
          ${os.imei1 ? `<div class="os-field-row"><span class="os-field-label">IMEI 1</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${os.imei1}</span></div>` : ''}
          ${os.imei2 ? `<div class="os-field-row"><span class="os-field-label">IMEI 2</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${os.imei2}</span></div>` : ''}
          <div class="os-field-row">
            <span class="os-field-label">Nota Fiscal</span>
            <span class="os-field-value">${os.nfAparelho === 'sim' ? '✅ Possui' : '❌ Não possui'}</span>
          </div>
          <div class="os-field-row">
            <span class="os-field-label">Garantia</span>
            <span class="os-field-value">${os.garantia === 'sim' ? '✅ Em garantia' : '❌ Fora da garantia'}</span>
          </div>
          <div class="os-field-row"><span class="os-field-label">Defeito</span><span class="os-field-value" style="font-size:.78rem">${os.defeito}</span></div>
          ${(os.condicoes && os.condicoes.length) ? `<div class="os-field-row"><span class="os-field-label">Condições</span><span class="os-field-value" style="font-size:.78rem">${os.condicoes.join(', ')}${os.condicoesOutros ? ', ' + os.condicoesOutros : ''}</span></div>` : ''}
          ${(os.senhaParao && os.senhaParao.length) ? `<div class="os-field-row"><span class="os-field-label">Padrão</span><span class="os-field-value" style="letter-spacing:2px;font-weight:700">${os.senhaParao.join('→')}</span></div>` : ''}
          ${os.previsao ? `<div class="os-field-row"><span class="os-field-label">Previsão Saída</span><span class="os-field-value">${new Date(os.previsao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
        </div>

        ${(os.itens && os.itens.length) ? `
        <div class="os-doc-section">
          <h4>🔧 Itens / Serviços</h4>
          <table style="width:100%;border-collapse:collapse;font-size:.78rem;margin-top:4px">
            <thead><tr style="background:#f0f4f8">
              <th style="padding:4px 6px;text-align:left">Qtde</th>
              <th style="padding:4px 6px;text-align:left">Descrição</th>
              <th style="padding:4px 6px;text-align:right">Unit.</th>
              <th style="padding:4px 6px;text-align:right">Total</th>
            </tr></thead>
            <tbody>${os.itens.map(i => `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:4px 6px">${i.qtde}</td><td style="padding:4px 6px">${i.desc}</td><td style="padding:4px 6px;text-align:right">${formatCurrency(i.unit)}</td><td style="padding:4px 6px;text-align:right;font-weight:700">${formatCurrency(i.total)}</td></tr>`).join('')}</tbody>
          </table>
        </div>` : ''}

        <div class="os-doc-section">
          <div class="os-field-row" style="margin-top:2px"><span class="os-field-label">Valor Total</span><span class="os-field-value" style="color:var(--primary);font-size:1.1rem;font-weight:900">${formatCurrency(os.valor)}</span></div>
        </div>

        <div class="os-doc-section">
          <h4>📸 Registro fotográfico (${os.fotos ? os.fotos.length : 0} foto(s))</h4>
          ${photoHTML}
        </div>

        <div class="os-doc-section">
          <h4>✍️ Assinatura digital</h4>
          ${signHTML}
        </div>

        <div class="os-doc-section">
          <h4>🏢 Prestador</h4>
          ${currentProfile?.logo_base64 ? `<img src="${currentProfile.logo_base64}" alt="Logo" style="max-height:48px;margin-bottom:8px;border-radius:4px">` : ''}
          <div class="os-field-row"><span class="os-field-label">Empresa</span><span class="os-field-value" style="font-size:.78rem">${currentProfile?.razao_social || '—'}</span></div>
          ${currentProfile?.nome_fantasia && currentProfile.nome_fantasia !== currentProfile.razao_social ? `<div class="os-field-row"><span class="os-field-label">Nome Fantasia</span><span class="os-field-value" style="font-size:.78rem">${currentProfile.nome_fantasia}</span></div>` : ''}
          <div class="os-field-row"><span class="os-field-label">CNPJ/CPF</span><span class="os-field-value">${currentProfile?.cnpj_cpf || '—'}</span></div>
          ${currentProfile?.logradouro ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.75rem">${currentProfile.logradouro}${currentProfile.numero ? ', ' + currentProfile.numero : ''}${currentProfile.bairro ? ' — ' + currentProfile.bairro : ''}${currentProfile.cidade ? ', ' + currentProfile.cidade + '/' + currentProfile.estado : ''}</span></div>` : ''}
          ${currentProfile?.telefone ? `<div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${currentProfile.telefone}</span></div>` : ''}
        </div>

        <div class="os-doc-section" style="background:#fafbfc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0">
          <h4 style="font-size:.78rem;margin-bottom:6px;opacity:.8">⚖️ Termos e Condições</h4>
          ${currentProfile?.termos_garantia
            ? `<p style="font-size:.7rem;color:var(--muted);white-space:pre-line">${currentProfile.termos_garantia}</p>`
            : `<ol style="padding-left:14px;display:flex;flex-direction:column;gap:3px">
                <li style="font-size:.7rem;color:var(--muted)">Garantia de 90 dias para os serviços realizados.</li>
                <li style="font-size:.7rem;color:var(--muted)">Garantia de peças válida somente contra defeitos de fabricação.</li>
                <li style="font-size:.7rem;color:var(--muted)">Não cobertura de defeitos por mau uso, quedas ou desgaste.</li>
                <li style="font-size:.7rem;color:var(--muted)">Aparelho testado antecipadamente na entrada e saída.</li>
                <li style="font-size:.7rem;color:var(--muted)">Mercadorias não retiradas em 60 dias poderão ser vendidas para cobrir custos.</li>
               </ol>`}
          ${currentProfile?.observacoes_padrao ? `<p style="font-size:.7rem;color:var(--muted);margin-top:6px;white-space:pre-line">${currentProfile.observacoes_padrao}</p>` : ''}
          ${currentProfile?.rodape ? `<p style="font-size:.72rem;color:var(--muted);margin-top:8px;text-align:center;font-style:italic">${currentProfile.rodape}</p>` : ''}
        </div>

      </div>
    </div>

    <div class="action-row mt-16">
      <a href="${wppUrl}" target="_blank" class="btn btn-primary" onclick="simulateSign('${os.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        WhatsApp
      </a>
      <button class="btn btn-outline" onclick="printOS()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        PDF/Imprimir
      </button>
    </div>
    ${concludeBtn}
    <button class="btn btn-ghost btn-full mt-8" onclick="navigate('screen-dashboard'); renderDashboard()">← Voltar ao painel</button>
  `;
}

function simulateSign(id) {
  // Simula assinatura após 3s (mock: cliente respondeu pelo WhatsApp)
  setTimeout(() => {
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    state.update(id, { assinatura: { status: 'signed', hora }, status: 'andamento' });
    renderOSView(id);
    showToast('Cliente assinou a OS digitalmente!', 'success');
  }, 3000);
}

function printOS() {
  window.print();
}

// ── NFS-e ──────────────────────────────────────────────────────
function openNFSe(id) {
  const os = state.getById(id || currentOSId);
  if (!os) return;
  currentOSId = os.id;

  // Prestador — dados do perfil da empresa
  const p = currentProfile || {};
  document.getElementById('nfse-prestador-razao').value = p.razao_social  || '';
  document.getElementById('nfse-prestador-cnpj').value  = p.cnpj_cpf      || '';
  document.getElementById('nfse-prestador-im').value    = p.inscricao_municipal || '';
  document.getElementById('nfse-iss-aliq').value        = (p.aliquota_iss ?? 2).toFixed(1);
  document.getElementById('nfse-municipio').value       = p.cidade         || '';

  // Tomador — dados da OS
  document.getElementById('nfse-tomador-nome').value    = os.cliente;
  document.getElementById('nfse-tomador-tel').value     = os.telefone;
  document.getElementById('nfse-servico-desc').value    = `${os.tipo} — ${os.marca}: ${os.defeito}`;
  document.getElementById('nfse-valor').value           = (os.valor || 0).toFixed(2);

  document.getElementById('nfse-success').classList.remove('show');
  document.getElementById('nfse-form-inner').style.display = 'block';

  navigate('screen-nfse');
}

async function emitirNFSe() {
  if (!checkProfileComplete()) return;
  const btn = document.getElementById('btn-emitir-nfse');
  btn.innerHTML = '<span class="spinner"></span> Enviando para ABRASF...';
  btn.disabled = true;

  // Simula delay de API (1.8s)
  await sleep(1000);
  btn.innerHTML = '<span class="spinner"></span> Autenticando certificado...';
  await sleep(800);

  const nfseNum = `NFS-e Nº ${String(Math.floor(100000 + Math.random() * 900000)).substring(0,6)}`;
  const os = state.getById(currentOSId);
  if (os) {
    state.update(currentOSId, { nfse: nfseNum, status: 'concluida' });
  }

  // Exibe sucesso
  document.getElementById('nfse-form-inner').style.display = 'none';
  document.getElementById('nfse-emitted-number').textContent = nfseNum;
  document.getElementById('nfse-emitted-os').textContent     = currentOSId || '';
  document.getElementById('nfse-success').classList.add('show');
  btn.disabled = false;
  btn.innerHTML = 'Emitir NFS-e';

  showToast(`${nfseNum} vinculada à ${currentOSId}`, 'success');
  renderDashboard();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Lucratividade ──────────────────────────────────────────────
function renderLucratividade() {
  // Calcula margem/hora e ordena
  const data = LUCRO_DATA.map(d => ({
    ...d,
    margemHora: Math.round(d.preco * (d.margem / 100) / d.tempo),
  })).sort((a, b) => b.margemHora - a.margemHora);

  const maxMargem = data[0].margemHora;
  const medals = ['🥇','🥈','🥉'];

  // Tabela
  const tbodyRows = data.map((d, i) => `
    <tr class="${i === 0 ? 'top-1' : ''}">
      <td><span class="rank-medal">${medals[i] || i+1}</span></td>
      <td style="font-weight:600">${d.servico}</td>
      <td>${formatCurrency(d.preco)}</td>
      <td>${d.tempo}h</td>
      <td style="color:var(--success);font-weight:700">${formatCurrency(d.margemHora)}/h</td>
      <td><span class="badge ${i < 3 ? 'badge-done' : i < 6 ? 'badge-progress' : 'badge-waiting'}">${d.margem}%</span></td>
    </tr>`).join('');
  document.getElementById('lucro-tbody').innerHTML = tbodyRows;

  // Gráfico de barras CSS
  const barRows = data.slice(0, 7).map(d => {
    const pct = Math.round((d.margemHora / maxMargem) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label" title="${d.servico}">${d.servico}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"><span>${formatCurrency(d.margemHora)}</span></div>
        </div>
      </div>`;
  }).join('');
  document.getElementById('bar-chart').innerHTML = barRows;
}

// ── Inicialização ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  renderLucratividade();
  navigate('screen-dashboard');
});
