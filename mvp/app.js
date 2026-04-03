/* ============================================================
   OficinaPRO — app.js
   Vanilla JS ES6+ | Zero dependências externas
   ============================================================ */

'use strict';

// ── Constantes ────────────────────────────────────────────────
const STORAGE_KEY  = 'oficina_pro_os';
const PENDING_KEY  = 'oficina_pro_pending';

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

const DEMO_CNPJ = '12.345.678/0001-99';

// ── State Manager ──────────────────────────────────────────────
class AppState {
  constructor() {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const MOCK_IDS = ['OS-2026-0001', 'OS-2026-0002', 'OS-2026-0003'];
    this._os = stored.filter(os => !MOCK_IDS.includes(os.id));
    if (this._os.length !== stored.length) this._save();
    this._pending = new Set(JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'));
  }

  _save()        { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._os)); }
  _savePending() { localStorage.setItem(PENDING_KEY, JSON.stringify([...this._pending])); }

  getAll()    { return [...this._os].reverse(); }
  getById(id) { return this._os.find(os => os.id === id); }

  getNextNum() {
    const nums = this._os.map(o => o.numero || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }

  async create(data) {
    const num = this.getNextNum();
    const os  = {
      ...data,
      numero:      num,
      id:          `OS-2026-${String(num).padStart(4,'0')}`,
      dataCriacao: new Date().toISOString(),
      status:      'aguardando',
      nfse:        null,
      assinatura:  { status: 'pending', hora: null },
    };
    this._os.push(os);
    this._save();
    const { error } = await dbSave(os);
    if (error) {
      this._pending.add(os.id);
      this._savePending();
      return { os, dbError: true };
    }
    return { os };
  }

  async update(id, patch) {
    const idx = this._os.findIndex(os => os.id === id);
    if (idx === -1) return { dbError: false };
    this._os[idx] = { ...this._os[idx], ...patch };
    this._save();
    const { error } = await dbSave(this._os[idx]);
    if (error) {
      this._pending.add(id);
      this._savePending();
      return { os: this._os[idx], dbError: true };
    }
    this._pending.delete(id);
    this._savePending();
    return { os: this._os[idx] };
  }

  // Merge com dados da nuvem preservando fotos locais (não enviadas ao servidor)
  mergeFromCloud(remoteOS) {
    const localMap  = new Map(this._os.map(o => [o.id, o]));
    const remoteIds = new Set(remoteOS.map(o => o.id));

    const merged = remoteOS.map(remote => {
      const local = localMap.get(remote.id);
      return (local?.fotos?.length && !remote.fotos?.length)
        ? { ...remote, fotos: local.fotos }
        : remote;
    });

    const localOnly = this._os.filter(o => !remoteIds.has(o.id));
    this._os = [...merged, ...localOnly];
    this._save();
  }

  // Reenvia OS pendentes ao Supabase
  async syncPending() {
    if (!this._pending.size) return { synced: 0, lastError: null };
    let synced = 0, lastError = null;
    for (const id of [...this._pending]) {
      const os = this._os.find(o => o.id === id);
      if (!os) { this._pending.delete(id); continue; }
      const { error } = await dbSave(os);
      if (!error) { this._pending.delete(id); synced++; }
      else lastError = error;
    }
    this._savePending();
    return { synced, lastError };
  }

  get pendingCount() { return this._pending.size; }

  metrics() {
    const hoje = new Date().toDateString();
    const osHoje      = this._os.filter(o => new Date(o.dataCriacao).toDateString() === hoje);
    const faturamento = osHoje.filter(o => o.status === 'concluida').reduce((a, o) => a + (o.valor || 0), 0);
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

// Rate limiting de tentativas de login (proteção anti-brute-force)
const _login = { attempts: 0, blockedUntil: 0 };

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function handleLogin() {
  const now = Date.now();
  if (_login.blockedUntil > now) {
    const secs = Math.ceil((_login.blockedUntil - now) / 1000);
    const errEl = document.getElementById('login-error');
    errEl.textContent = `Muitas tentativas. Aguarde ${secs}s antes de tentar novamente.`;
    errEl.classList.remove('hidden');
    return;
  }

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
    _login.attempts++;
    if (_login.attempts >= 5) {
      _login.blockedUntil = Date.now() + 30000; // bloqueia 30s
      _login.attempts     = 0;
      errEl.textContent = 'Conta bloqueada temporariamente por 30 segundos. Tente novamente em seguida.';
    } else {
      errEl.textContent = `Email ou senha incorretos. (${5 - _login.attempts} tentativa(s) restante(s))`;
    }
    errEl.classList.remove('hidden');
    return;
  }

  _login.attempts     = 0;
  _login.blockedUntil = 0;
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

  // Se o perfil carregado tem o CNPJ demo, trata como sem perfil
  if (currentProfile && currentProfile.cnpj_cpf === DEMO_CNPJ) {
    currentProfile = null;
  }

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

  const { synced, lastError } = await state.syncPending();
  if (synced > 0) showToast(`${synced} OS sincronizada(s) com o servidor.`, 'success');
  if (state.pendingCount > 0) {
    const msg = lastError?.message || `${state.pendingCount} OS não sincronizada(s).`;
    showToast(`Falha ao sincronizar: ${msg}`, 'error');
  }

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

// ── GPS state ────────────────────────────────────────────────────
let _gpsCache = null; // { lat, lon, cidade } — reutilizado entre fotos da mesma OS

// ── Utils ──────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML especiais para prevenir XSS.
 * Use sempre que inserir dados do usuário via innerHTML.
 */
function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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
    <div class="os-item" onclick="openOS('${escHtml(os.id)}')">
      <div class="os-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a365d" stroke-width="1.8">
          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="os-info">
        <div class="os-number">${escHtml(os.id)}</div>
        <div class="os-client">${escHtml(os.cliente)}</div>
        <div class="os-device">${escHtml(os.tipo)} — ${escHtml(os.marca)}</div>
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
  _gpsCache = null; // reseta GPS para buscar posição fresca a cada nova OS
  document.getElementById('form-nova-os').reset();
  document.getElementById('photo-previews').innerHTML = '';
  document.getElementById('photo-count').textContent = '0';
  document.getElementById('itens-tbody').innerHTML = '';
  document.getElementById('itens-total').textContent = 'R$ 0,00';
  // Reset checkboxes
  document.querySelectorAll('.condicao-cb').forEach(cb => cb.checked = false);
  // Reset pattern
  clearPattern();
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

  // Pré-carrega GPS ao entrar no passo 2 para que esteja pronto quando a foto for tirada
  if (currentStep === 2 && !_gpsCache) getGPS();

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
      <div class="summary-row"><span class="summary-key">NF / Garantia</span><span class="summary-val">${nfAparelho === 'sim' ? '✅ Tem NF' : 'Sem NF'} · ${garantia === 'sim' ? '✅ Em garantia' : 'Sem garantia'}</span></div>
      <div class="summary-row"><span class="summary-key">Defeito</span><span class="summary-val" style="max-width:65%;font-size:.8rem">${escHtml(defeito)}</span></div>
      <div class="summary-row"><span class="summary-key">Condições</span><span class="summary-val" style="max-width:65%;font-size:.78rem">${escHtml(condicoesStr)}</span></div>
      ${patternSequence.length ? `<div class="summary-row"><span class="summary-key">Padrão</span><span class="summary-val" style="letter-spacing:2px">${patternSequence.map(Number).join('→')}</span></div>` : ''}
      <div class="summary-row"><span class="summary-key">Fotos</span><span class="summary-val">${wizardData.fotos.length} foto(s)</span></div>
      ${itensHTML}
      ${previsao ? `<div class="summary-row"><span class="summary-key">Previsão Saída</span><span class="summary-val">${new Date(previsao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
      <div class="summary-row" style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:8px"><span class="summary-key">Valor Total</span><span class="summary-val big">${formatCurrency(valorFinal)}</span></div>
    </div>`;
}

async function generateOS() {
  if (!checkProfileComplete()) return;
  const { os, dbError } = await state.create(wizardData);
  if (dbError) {
    showToast(`${os.id} criada, mas falha ao salvar no servidor. Verifique sua conexão.`, 'error');
  } else {
    showToast(`${os.id} criada com sucesso!`, 'success');
  }
  renderDashboard();
  currentOSId = os.id;
  renderOSView(os.id);
  navigate('screen-os-view');
}

// ── GPS ────────────────────────────────────────────────────────

/**
 * Retorna { lat, lon, locStr } com a localização atual.
 * Usa cache da sessão para não pedir permissão a cada foto.
 * Nunca lança exceção — retorna locStr de fallback em caso de erro.
 */
async function getGPS() {
  if (_gpsCache) return _gpsCache;

  if (!navigator.geolocation) {
    _gpsCache = { lat: null, lon: null, locStr: 'Localização indisponível' };
    return _gpsCache;
  }

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      });
    });

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Geocodificação reversa via Nominatim (OpenStreetMap, gratuito, sem chave)
    let locStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (r.ok) {
        const data = await r.json();
        const a = data.address || {};
        const cidade = a.city || a.town || a.village || a.county || '';
        const estado = a.state_code || a.state || '';
        locStr = cidade && estado ? `${cidade}, ${estado}` : (cidade || locStr);
      }
    } catch (_) { /* usa coordenadas brutas se Nominatim falhar */ }

    _gpsCache = { lat, lon, locStr };
    return _gpsCache;
  } catch (err) {
    const msg = err.code === 1 ? 'GPS negado pelo usuário' : 'GPS indisponível';
    _gpsCache = { lat: null, lon: null, locStr: msg };
    return _gpsCache;
  }
}

// ── Câmera & Canvas Timestamp ──────────────────────────────────
async function handlePhotoCapture(input) {
  const files = Array.from(input.files);
  if (!files.length) return;

  const remaining = 5 - wizardData.fotos.length;
  if (remaining <= 0) { showToast('Limite de 5 fotos atingido.', 'error'); return; }
  const toProcess = files.slice(0, remaining);

  // Mostra feedback imediato para o usuário
  showToast(`Processando ${toProcess.length} foto(s)...`, '');

  // Usa GPS já em cache (pré-carregado ao entrar no passo 2).
  // Se ainda não chegou, aguarda no máximo 1 segundo — nunca bloqueia a foto.
  let gps;
  if (_gpsCache) {
    gps = _gpsCache;
  } else {
    const timeout = new Promise(r => setTimeout(() => r({ lat: null, lon: null, locStr: 'GPS indisponivel' }), 1000));
    gps = await Promise.race([getGPS(), timeout]);
  }

  let processadas = 0;
  for (const file of toProcess) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const stamped = await stampTimestamp(dataUrl, gps);
      wizardData.fotos.push(stamped);
      processadas++;
      // Atualiza preview progressivamente (foto a foto)
      renderPhotoPreviews();
      document.getElementById('photo-count').textContent = wizardData.fotos.length;
    } catch (e) {
      console.error('Erro ao processar foto:', e);
    }
  }

  input.value = ''; // permite reutilizar o input

  if (processadas === 0) {
    showToast('Não foi possível processar a(s) foto(s). Tente novamente.', 'error');
    return;
  }

  const locLabel = gps.lat !== null ? `GPS: ${gps.locStr}` : 'sem GPS';
  showToast(`${processadas} foto(s) adicionada(s) — ${locLabel}`, 'success');
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function stampTimestamp(dataUrl, gps) {
  return new Promise((res) => {
    const img = new Image();

    // Garante que a Promise sempre resolve mesmo se o canvas falhar
    img.onerror = () => res(dataUrl);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const MAX = 1280;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Timestamp + GPS
        const now      = new Date();
        const dateStr  = now.toLocaleDateString('pt-BR');
        const timeStr  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const locStr   = (gps && gps.locStr) ? gps.locStr : 'GPS indisponivel';
        const coordStr = (gps && gps.lat !== null) ? `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}` : null;

        const fontSize = Math.max(12, Math.round(w / 40));
        ctx.font       = `bold ${fontSize}px Arial, sans-serif`;
        const lines    = [
          `Data: ${dateStr} ${timeStr}`,
          `Local: ${locStr}`,
          ...(coordStr ? [`GPS: ${coordStr}`] : []),
        ];
        const padding  = 10;
        const lineH    = fontSize + 6;
        const boxH     = lines.length * lineH + padding * 2;
        const boxW     = lines.reduce((mx, l) => Math.max(mx, ctx.measureText(l).width), 0) + padding * 2;

        // Caixa semitransparente — usa fillRect como fallback seguro para todos os browsers
        const bx = padding;
        const by = h - boxH - padding;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, by, boxW, boxH, 6);
        } else {
          ctx.rect(bx, by, boxW, boxH);
        }
        ctx.fill();

        // Texto branco
        ctx.fillStyle = '#ffffff';
        lines.forEach((line, i) => {
          ctx.fillText(line, bx + padding, by + padding + fontSize + i * lineH);
        });

        res(canvas.toDataURL('image/jpeg', 0.88));
      } catch (e) {
        console.error('[stamp] Falha ao carimbar foto, usando original:', e);
        res(dataUrl); // retorna a foto sem carimbo em vez de bloquear
      }
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

function openPhotoLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<button class="lightbox-close" title="Fechar">✕</button><img src="${src}" alt="Foto ampliada">`;
  const close = () => overlay.remove();
  overlay.querySelector('.lightbox-close').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
}

// ── Visualização de OS ─────────────────────────────────────────
function renderOSView(id) {
  const os = state.getById(id);
  if (!os) return;

  const photoHTML = os.fotos && os.fotos.length
    ? `<div class="photo-grid">${os.fotos.map((src, i) => `<div class="photo-thumb"><img src="${src}" alt="Foto ${i+1}" loading="lazy" onclick="openPhotoLightbox(this.src)"></div>`).join('')}</div>`
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
          <div class="os-field-row"><span class="os-field-label">Nome</span><span class="os-field-value">${escHtml(os.cliente)}</span></div>
          <div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${escHtml(os.telefone)}</span></div>
          ${os.cpf ? `<div class="os-field-row"><span class="os-field-label">CPF</span><span class="os-field-value">${escHtml(os.cpf)}</span></div>` : ''}
          ${os.email ? `<div class="os-field-row"><span class="os-field-label">E-mail</span><span class="os-field-value">${escHtml(os.email)}</span></div>` : ''}
          ${os.endereco ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.8rem">${escHtml(os.endereco)}${os.cidade ? ' — ' + escHtml(os.cidade) : ''}</span></div>` : ''}
        </div>

        <div class="os-doc-section">
          <h4>📱 Aparelho</h4>
          <div class="os-field-row"><span class="os-field-label">Tipo</span><span class="os-field-value">${escHtml(os.tipo || '—')}</span></div>
          <div class="os-field-row"><span class="os-field-label">Marca/Modelo</span><span class="os-field-value">${escHtml(os.marca)}</span></div>
          ${os.imei1 ? `<div class="os-field-row"><span class="os-field-label">IMEI 1</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${escHtml(os.imei1)}</span></div>` : ''}
          ${os.imei2 ? `<div class="os-field-row"><span class="os-field-label">IMEI 2</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${escHtml(os.imei2)}</span></div>` : ''}
          <div class="os-field-row">
            <span class="os-field-label">Nota Fiscal</span>
            <span class="os-field-value">${os.nfAparelho === 'sim' ? '✅ Possui' : '❌ Não possui'}</span>
          </div>
          <div class="os-field-row">
            <span class="os-field-label">Garantia</span>
            <span class="os-field-value">${os.garantia === 'sim' ? '✅ Em garantia' : '❌ Fora da garantia'}</span>
          </div>
          <div class="os-field-row"><span class="os-field-label">Defeito</span><span class="os-field-value" style="font-size:.78rem">${escHtml(os.defeito)}</span></div>
          ${(os.condicoes && os.condicoes.length) ? `<div class="os-field-row"><span class="os-field-label">Condições</span><span class="os-field-value" style="font-size:.78rem">${escHtml(os.condicoes.join(', '))}${os.condicoesOutros ? ', ' + escHtml(os.condicoesOutros) : ''}</span></div>` : ''}
          ${(os.senhaParao && os.senhaParao.length) ? `<div class="os-field-row"><span class="os-field-label">Padrão</span><span class="os-field-value" style="letter-spacing:2px;font-weight:700">${os.senhaParao.map(Number).join('→')}</span></div>` : ''}
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
            <tbody>${os.itens.map(i => `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:4px 6px">${escHtml(String(i.qtde))}</td><td style="padding:4px 6px">${escHtml(i.desc)}</td><td style="padding:4px 6px;text-align:right">${formatCurrency(i.unit)}</td><td style="padding:4px 6px;text-align:right;font-weight:700">${formatCurrency(i.total)}</td></tr>`).join('')}</tbody>
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
          ${currentProfile?.logo_base64 ? `<img src="${escHtml(currentProfile.logo_base64)}" alt="Logo" style="max-height:48px;margin-bottom:8px;border-radius:4px">` : ''}
          <div class="os-field-row"><span class="os-field-label">Empresa</span><span class="os-field-value" style="font-size:.78rem">${escHtml(currentProfile?.razao_social || '—')}</span></div>
          ${currentProfile?.nome_fantasia && currentProfile.nome_fantasia !== currentProfile.razao_social ? `<div class="os-field-row"><span class="os-field-label">Nome Fantasia</span><span class="os-field-value" style="font-size:.78rem">${escHtml(currentProfile.nome_fantasia)}</span></div>` : ''}
          <div class="os-field-row"><span class="os-field-label">CNPJ/CPF</span><span class="os-field-value">${escHtml(currentProfile?.cnpj_cpf || '—')}</span></div>
          ${currentProfile?.logradouro ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.75rem">${escHtml(currentProfile.logradouro)}${currentProfile.numero ? ', ' + escHtml(currentProfile.numero) : ''}${currentProfile.bairro ? ' — ' + escHtml(currentProfile.bairro) : ''}${currentProfile.cidade ? ', ' + escHtml(currentProfile.cidade) + '/' + escHtml(currentProfile.estado) : ''}</span></div>` : ''}
          ${currentProfile?.telefone ? `<div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${escHtml(currentProfile.telefone)}</span></div>` : ''}
        </div>

        <div class="os-doc-section" style="background:#fafbfc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0">
          <h4 style="font-size:.78rem;margin-bottom:6px;opacity:.8">⚖️ Termos e Condições</h4>
          ${currentProfile?.termos_garantia
            ? `<p style="font-size:.7rem;color:var(--muted);white-space:pre-line">${escHtml(currentProfile.termos_garantia)}</p>`
            : `<ol style="padding-left:14px;display:flex;flex-direction:column;gap:3px">
                <li style="font-size:.7rem;color:var(--muted)">Garantia de 90 dias para os serviços realizados.</li>
                <li style="font-size:.7rem;color:var(--muted)">Garantia de peças válida somente contra defeitos de fabricação.</li>
                <li style="font-size:.7rem;color:var(--muted)">Não cobertura de defeitos por mau uso, quedas ou desgaste.</li>
                <li style="font-size:.7rem;color:var(--muted)">Aparelho testado antecipadamente na entrada e saída.</li>
                <li style="font-size:.7rem;color:var(--muted)">Mercadorias não retiradas em 60 dias poderão ser vendidas para cobrir custos.</li>
               </ol>`}
          ${currentProfile?.observacoes_padrao ? `<p style="font-size:.7rem;color:var(--muted);margin-top:6px;white-space:pre-line">${escHtml(currentProfile.observacoes_padrao)}</p>` : ''}
          ${currentProfile?.rodape ? `<p style="font-size:.72rem;color:var(--muted);margin-top:8px;text-align:center;font-style:italic">${escHtml(currentProfile.rodape)}</p>` : ''}
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
  setTimeout(async () => {
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const { dbError } = await state.update(id, { assinatura: { status: 'signed', hora }, status: 'andamento' });
    renderOSView(id);
    if (dbError) {
      showToast('Assinatura registrada localmente, mas falha ao sincronizar com o servidor.', 'error');
    } else {
      showToast('Cliente assinou a OS digitalmente!', 'success');
    }
  }, 3000);
}

function printOS() {
  window.print();
}

// ── NFS-e ──────────────────────────────────────────────────────
function openNFSe(id) {
  const os = state.getById(id || currentOSId);

  // Prestador — dados do perfil da empresa
  const p = currentProfile || {};

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
    currentOSId = os.id;
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

function emitirNFSe() {
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

async function confirmarNumeroNFSe() {
  const numero = document.getElementById('nfse-numero-manual').value.trim();
  if (!numero || !/^\d{1,10}$/.test(numero)) {
    showToast('Informe o número da NFS-e (somente dígitos, máx. 10).', 'error');
    return;
  }

  const nfseNum = `NFS-e Nº ${numero}`;
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

// ── Lucratividade ──────────────────────────────────────────────
function renderLucratividade() {
  const todasOS = state.getAll();
  const medals  = ['🥇','🥈','🥉'];

  if (todasOS.length === 0) {
    document.getElementById('bar-chart').innerHTML =
      '<p style="text-align:center;padding:32px 16px;color:var(--muted)">Crie ordens de serviço para ver o ranking de faturamento.</p>';
    document.getElementById('lucro-tbody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">Sem dados ainda.</td></tr>';
    const ins = document.getElementById('lucro-insight');
    if (ins) ins.textContent = 'Registre ordens de serviço para ver insights de faturamento real.';
    return;
  }

  // Agrega faturamento por descrição de serviço (tabela de itens) ou por tipo de aparelho
  const map = {};
  for (const os of todasOS) {
    if (os.itens && os.itens.length > 0) {
      for (const item of os.itens) {
        if (!item.desc || (item.total || 0) <= 0) continue;
        const key = item.desc.trim();
        if (!map[key]) map[key] = { servico: key, faturado: 0, count: 0 };
        map[key].faturado += item.total;
        map[key].count++;
      }
    } else if ((os.valor || 0) > 0) {
      // Usa o defeito/serviço descrito pelo técnico, truncado a 50 chars
      const raw = (os.defeito || os.tipo || 'Outros').trim();
      const key = raw.length > 50 ? raw.substring(0, 47) + '...' : raw;
      if (!map[key]) map[key] = { servico: key, faturado: 0, count: 0 };
      map[key].faturado += os.valor;
      map[key].count++;
    }
  }

  const data = Object.values(map)
    .filter(d => d.faturado > 0)
    .sort((a, b) => b.faturado - a.faturado);

  if (data.length === 0) {
    document.getElementById('bar-chart').innerHTML =
      '<p style="text-align:center;padding:32px 16px;color:var(--muted)">Nenhum serviço com valor registrado ainda.</p>';
    document.getElementById('lucro-tbody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">Sem serviços com valor.</td></tr>';
    return;
  }

  const maxFaturado = data[0].faturado;
  const totalGeral  = data.reduce((s, d) => s + d.faturado, 0);

  // Tabela
  const tbodyRows = data.map((d, i) => `
    <tr class="${i === 0 ? 'top-1' : ''}">
      <td><span class="rank-medal">${medals[i] || i + 1}</span></td>
      <td style="font-weight:600">${escHtml(d.servico)}</td>
      <td style="text-align:center">${d.count}</td>
      <td style="color:var(--success);font-weight:700">${formatCurrency(d.faturado)}</td>
      <td><span class="badge ${i < 3 ? 'badge-done' : i < 6 ? 'badge-progress' : 'badge-waiting'}">${Math.round((d.faturado / totalGeral) * 100)}%</span></td>
    </tr>`).join('');
  document.getElementById('lucro-tbody').innerHTML = tbodyRows;

  // Gráfico de barras
  const barRows = data.slice(0, 7).map(d => {
    const pct = Math.round((d.faturado / maxFaturado) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label" title="${escHtml(d.servico)}">${escHtml(d.servico)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"><span>${formatCurrency(d.faturado)}</span></div>
        </div>
      </div>`;
  }).join('');
  document.getElementById('bar-chart').innerHTML = barRows;

  // Insight dinâmico
  const ins = document.getElementById('lucro-insight');
  if (ins) {
    const top = data[0];
    ins.textContent = `${top.servico} lidera com ${formatCurrency(top.faturado)} (${Math.round((top.faturado / totalGeral) * 100)}% do total de ${formatCurrency(totalGeral)}). Priorize este serviço para maximizar o faturamento.`;
  }
}

// ── Inicialização ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  renderLucratividade();
  navigate('screen-dashboard');
});
