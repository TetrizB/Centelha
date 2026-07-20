/* ============================================================
   main.js — PONTO DE ENTRADA do app (carregado pelo index.html)

   Responsabilidades:
   1. Expor no window as funções chamadas pelos onclick/oninput
      do HTML (o HTML usa handlers inline; módulos ES são isolados,
      então cada função usada no HTML precisa estar listada aqui).
   2. Inicializar o app (sessão → login ou dashboard).
   3. Registrar o Service Worker (PWA offline/instalável).
   4. Sincronizar OS pendentes quando a rede volta.

   ATENÇÃO: se você criar uma função nova e usá-la em onclick="" no HTML,
      adicione-a ao objeto `globals` abaixo — senão o botão não
      funciona (erro "função is not defined" no console).
   ============================================================ */

import { navigate } from './core/navigation.js';
import { state } from './core/app-state.js';
import { updateSyncIndicator } from './core/sync-indicator.js';
import { initUploadProgress } from './core/upload-progress.js';
import { showToast } from './utils/dom.js';
import { maskCPF } from './utils/masks.js';

import { handleLogin, handleLogout, initApp } from './pages/login.js';
import {
  renderDashboard, dashSearch, dashFilterStatus, dashToggleShowAll, dashFilterAtrasadas,
} from './pages/dashboard.js';
import {
  renderSettings, saveProfileData, switchConfigTab, setAmbiente,
  lookupCEP, handleCEPInput, handleLogoUpload,
} from './pages/configuracoes.js';
import { startNovaOS, nextStep, prevStep } from './pages/nova-os/wizard.js';
import { addItemRow, removeItemRow, updateItemTotal } from './pages/nova-os/itens.js';
import { clickPatternDot, clearPattern } from './pages/nova-os/pattern-lock.js';
import {
  handlePhotoCapture, removePhoto, openPhotoLightbox,
} from './pages/nova-os/fotos.js';
import {
  lookupClienteRecorrente, usarClienteSugerido,
} from './pages/nova-os/cliente-lookup.js';
import {
  openOS, renderOSView, concludeWithoutNFSe, printOS, changeOSStatus,
} from './pages/os-view/os-view.js';
import {
  openSignModal, clearSignature, closeSignModal, confirmSignature,
} from './pages/os-view/assinatura.js';
import {
  openEditOS, closeEditOS, saveEditOS,
  addEditItemRow, removeEditItemRow, updateEditItemTotal,
} from './pages/os-view/editar.js';
import { openNFSe, emitirNFSe, confirmarNumeroNFSe } from './pages/nfse.js';
import { renderLucratividade, exportCSV } from './pages/lucratividade.js';

/** Toque na nuvem da barra superior: tenta reenviar as OS pendentes. */
async function forceSyncPending() {
  if (!state.pendingCount) {
    showToast('Tudo sincronizado com o servidor.', 'success');
    return;
  }
  if (!navigator.onLine) {
    showToast('Sem conexão — os dados serão enviados quando a rede voltar.', 'error');
    return;
  }
  const { synced, lastError } = await state.syncPending();
  if (synced > 0) {
    showToast(`${synced} OS sincronizada(s) com o servidor.`, 'success');
    renderDashboard();
  }
  if (state.pendingCount > 0) {
    showToast(lastError?.message || `${state.pendingCount} OS ainda pendente(s).`, 'error');
  }
}

// ── Funções globais usadas nos onclick/oninput do HTML ──────────
const globals = {
  // Navegação e telas
  navigate, renderDashboard, renderSettings, renderLucratividade,
  // Dashboard: busca e filtros
  dashSearch, dashFilterStatus, dashToggleShowAll, dashFilterAtrasadas,
  // Sincronização manual (nuvem da barra superior)
  forceSyncPending,
  // Login
  handleLogin, handleLogout,
  // Configurações
  saveProfileData, switchConfigTab, setAmbiente,
  lookupCEP, handleCEPInput, handleLogoUpload,
  // Nova OS (wizard)
  startNovaOS, nextStep, prevStep, maskCPF,
  addItemRow, removeItemRow, updateItemTotal,
  clickPatternDot, clearPattern,
  handlePhotoCapture, removePhoto, openPhotoLightbox,
  lookupClienteRecorrente, usarClienteSugerido,
  // Visualização de OS
  openOS, renderOSView, concludeWithoutNFSe, printOS, changeOSStatus,
  openSignModal, clearSignature, closeSignModal, confirmSignature,
  openEditOS, closeEditOS, saveEditOS,
  addEditItemRow, removeEditItemRow, updateEditItemTotal,
  // NFS-e
  openNFSe, emitirNFSe, confirmarNumeroNFSe,
  // Lucratividade
  exportCSV,
};
Object.assign(window, globals);

// ── Sincronização automática quando a rede volta ────────────────
window.addEventListener('online', async () => {
  updateSyncIndicator({});
  if (!state.pendingCount) return;
  const { synced } = await state.syncPending();
  if (synced > 0) {
    showToast(`Conexão restabelecida — ${synced} OS sincronizada(s).`, 'success');
    renderDashboard();
  }
});
window.addEventListener('offline', () => updateSyncIndicator({}));

// ── Registro do Service Worker (PWA offline + instalável) ──────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(() => {}); // falha silenciosa se offline ou bloqueado
  });
}

// ── Inicialização ────────────────────────────────────────────────
initUploadProgress();
updateSyncIndicator({ pending: state.pendingCount });
renderDashboard();
renderLucratividade();
navigate('screen-dashboard');
initApp();
