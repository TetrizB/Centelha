/* ============================================================
   pages/dashboard.js — Tela inicial (painel)
   Tela no HTML: <section id="screen-dashboard">
   Métricas do dia + lista de OS com busca (cliente, telefone,
   IMEI, nº da OS) e filtro por status. Sem busca/filtro ativo,
   mostra as 5 mais recentes com botão "Ver todas".
   ============================================================ */

import { OS_STATUS } from '../config/constants.js';
import { state } from '../core/app-state.js';
import { escHtml } from '../utils/dom.js';
import { formatCurrency, statusBadge } from '../utils/format.js';

const RECENT_LIMIT = 5;

// Estado dos filtros (persiste durante a sessão)
const filtros = { query: '', status: '', showAll: false };

/** Normaliza texto para busca (minúsculas, sem acentos). */
function norm(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Só os dígitos (para comparar telefone/IMEI independente de máscara). */
function digits(str) {
  return String(str || '').replace(/\D/g, '');
}

function matchOS(os, query) {
  const q  = norm(query).trim();
  const qd = digits(query);
  if (!q) return true;
  if (norm(os.id).includes(q))      return true;
  if (norm(os.cliente).includes(q)) return true;
  if (norm(os.marca).includes(q))   return true;
  // Telefone e IMEI comparados só por dígitos (mínimo 3 para evitar ruído)
  if (qd.length >= 3) {
    if (digits(os.telefone).includes(qd)) return true;
    if (digits(os.imei1).includes(qd))    return true;
    if (digits(os.imei2).includes(qd))    return true;
  }
  return false;
}

/** oninput do campo de busca (exposto no window pelo main.js). */
export function dashSearch(value) {
  filtros.query = value;
  renderOSList();
}

/** Clique num chip de status ('' = todas). */
export function dashFilterStatus(status) {
  filtros.status = status;
  renderOSList();
}

/** Alterna entre 5 recentes e lista completa. */
export function dashToggleShowAll() {
  filtros.showAll = !filtros.showAll;
  renderOSList();
}

function renderStatusChips() {
  const wrap = document.getElementById('status-chips');
  if (!wrap) return;
  const chips = [{ value: '', label: 'Todas' }, ...OS_STATUS];
  wrap.innerHTML = chips.map(s => `
    <button type="button" class="status-chip ${filtros.status === s.value ? 'active' : ''}"
            onclick="dashFilterStatus('${s.value}')">${s.label}</button>`).join('');
}

function osItemHTML(os) {
  return `
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
    </div>`;
}

/** Re-renderiza apenas a lista (chips, itens e rodapé), sem tocar nas métricas. */
function renderOSList() {
  renderStatusChips();

  const container = document.getElementById('os-list');
  const footer    = document.getElementById('os-list-footer');
  const todas     = state.getAll();

  if (todas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p>Nenhuma OS registrada ainda.<br>Toque em <strong>Nova OS</strong> para começar.</p>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  const filtradas = todas.filter(os =>
    matchOS(os, filtros.query) && (!filtros.status || os.status === filtros.status)
  );

  if (filtradas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma OS encontrada com esses filtros.<br>
        <span style="font-size:.8rem">Tente outro termo ou toque em "Todas".</span></p>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  // Busca ou filtro ativo → mostra todos os resultados;
  // sem filtro → 5 recentes com botão "Ver todas"
  const filtroAtivo = filtros.query.trim() !== '' || filtros.status !== '';
  const visiveis = (filtroAtivo || filtros.showAll)
    ? filtradas
    : filtradas.slice(0, RECENT_LIMIT);

  container.innerHTML = visiveis.map(osItemHTML).join('');

  if (!filtroAtivo && filtradas.length > RECENT_LIMIT) {
    footer.innerHTML = `
      <button type="button" class="btn btn-ghost" onclick="dashToggleShowAll()">
        ${filtros.showAll ? 'Mostrar menos' : `Ver todas (${filtradas.length})`}
      </button>`;
  } else if (filtroAtivo) {
    footer.innerHTML = `<p style="font-size:.75rem;color:var(--muted)">${filtradas.length} OS encontrada(s)</p>`;
  } else {
    footer.innerHTML = '';
  }
}

export function renderDashboard() {
  const m = state.metrics();

  // Métricas
  document.getElementById('metric-os-hoje').textContent   = m.total;
  // O Intl separa "R$" do valor com espaço não separável ( ) — removido para caber na métrica
  document.getElementById('metric-faturamento').textContent = formatCurrency(m.faturamento).replace(/\s/, '');
  document.getElementById('metric-nfse').textContent      = m.nfsEmitidas;

  renderOSList();
}
