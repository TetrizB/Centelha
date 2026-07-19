/* ============================================================
   pages/nova-os/pattern-lock.js — Padrão de desbloqueio 3x3
   Registra o padrão de desenho do aparelho do cliente (passo 2).
   ============================================================ */

import { wizard } from './state.js';

export function clickPatternDot(num) {
  if (wizard.pattern.includes(num)) return; // não repete
  wizard.pattern.push(num);
  const dot = document.querySelector(`.pattern-dot[data-num="${num}"]`);
  if (dot) {
    dot.classList.add('selected');
    if (wizard.pattern.length === 1) dot.classList.add('first');
  }
  drawPatternLines();
  document.getElementById('pattern-display').textContent = wizard.pattern.join(' → ');
}

export function clearPattern() {
  wizard.pattern = [];
  document.querySelectorAll('.pattern-dot').forEach(d => d.classList.remove('selected', 'first'));
  const svg = document.getElementById('pattern-svg');
  if (svg) svg.innerHTML = '';
  const display = document.getElementById('pattern-display');
  if (display) display.textContent = '—';
}

function drawPatternLines() {
  const grid = document.getElementById('pattern-grid');
  const svg  = document.getElementById('pattern-svg');
  if (!grid || !svg || wizard.pattern.length < 2) return;
  const gRect = grid.getBoundingClientRect();
  const lines = [];
  for (let i = 0; i < wizard.pattern.length - 1; i++) {
    const a = document.querySelector(`.pattern-dot[data-num="${wizard.pattern[i]}"]`);
    const b = document.querySelector(`.pattern-dot[data-num="${wizard.pattern[i+1]}"]`);
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
