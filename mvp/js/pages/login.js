/* ============================================================
   pages/login.js — Autenticação e inicialização pós-login
   Tela no HTML: <div id="login-screen">
   Fluxo: login → carrega perfil → (onboarding se incompleto) →
   carrega OS da nuvem → sincroniza pendências → dashboard.
   ============================================================ */

import { DEMO_CNPJ } from '../config/constants.js';
import { state } from '../core/app-state.js';
import { setProfile, getProfile } from '../core/profile-store.js';
import { navigate } from '../core/navigation.js';
import { showToast } from '../utils/dom.js';
import { dbGetSession, dbSignIn, dbSignOut } from '../services/supabase-client.js';
import { dbLoadAll } from '../services/os-service.js';
import { dbLoadProfile } from '../services/profile-service.js';
import { renderDashboard } from './dashboard.js';
import { enterOnboarding } from './configuracoes.js';

// Rate limiting de tentativas de login (proteção anti-brute-force)
const _login = { attempts: 0, blockedUntil: 0 };

export function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

export function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

export async function handleLogin() {
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

export async function handleLogout() {
  await dbSignOut();
  state.clearLocalData();
  setProfile(null);
  document.body.classList.remove('onboarding-mode');
  showLoginScreen();
}

export async function postLoginSetup() {
  setProfile(await dbLoadProfile());

  // Se o perfil carregado tem o CNPJ demo, trata como sem perfil
  if (getProfile() && getProfile().cnpj_cpf === DEMO_CNPJ) {
    setProfile(null);
  }

  const profile = getProfile();
  if (!profile || !profile.perfil_completo) {
    enterOnboarding();
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
  navigate('screen-dashboard');
}

/** Ponto de entrada: mostra login ou entra direto se já há sessão. */
export async function initApp() {
  const session = await dbGetSession();
  if (!session) { showLoginScreen(); return; }
  showApp();
  await postLoginSetup();
}
