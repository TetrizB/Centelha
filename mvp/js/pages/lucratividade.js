/* ============================================================
   pages/lucratividade.js — Ranking de faturamento + export CSV
   Tela no HTML: <section id="screen-lucro">
   Agrega o faturamento real das OS por serviço e monta o
   gráfico de barras, a tabela de ranking e o insight.
   ============================================================ */

import { state } from '../core/app-state.js';
import { escHtml, showToast } from '../utils/dom.js';
import { formatCurrency, formatDateShort } from '../utils/format.js';

export function renderLucratividade() {
  const todasOS = state.getAll();
  const medals  = ['1º', '2º', '3º'];

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

/** Exporta todas as OS em CSV (compatível com Excel, separador ;). */
export function exportCSV() {
  const all = state.getAll();
  if (!all.length) {
    showToast('Nenhuma OS para exportar ainda.', 'error');
    return;
  }

  const esc    = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['OS','Data','Cliente','Telefone','CPF','Aparelho','Marca/Modelo','Defeito','Status','Valor (R$)','NFS-e','Assinada'];
  const rows   = all.map(o => [
    o.id,
    formatDateShort(o.dataCriacao),
    o.cliente,
    o.telefone,
    o.cpf || '',
    o.tipo || '',
    o.marca || '',
    o.defeito || '',
    o.status,
    (o.valor || 0).toFixed(2).replace('.', ','),
    o.nfse || '',
    o.assinatura?.status === 'signed' ? 'Sim' : 'Não',
  ].map(esc).join(';'));

  // BOM UTF-8 para o Excel abrir acentos corretamente
  const csv  = '﻿' + [header.map(esc).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `oficinapro-relatorio-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Relatório com ${all.length} OS exportado.`, 'success');
}
