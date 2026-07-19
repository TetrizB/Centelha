/* ============================================================
   core/navigation.js — Troca de telas (SPA)
   Cada tela é uma <section class="screen" id="screen-..."> no index.html.
   ============================================================ */

export function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
