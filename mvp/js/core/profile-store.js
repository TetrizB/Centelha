/* ============================================================
   core/profile-store.js — Perfil da empresa em memória (multi-tenant)
   Fonte da verdade durante a sessão. Carregado do Supabase no login
   (js/pages/login.js) e salvo pela tela de configurações.
   ============================================================ */

let currentProfile = null;

/** Perfil da empresa logada, ou null se ainda não configurado. */
export function getProfile() {
  return currentProfile;
}

export function setProfile(profile) {
  currentProfile = profile;
}
