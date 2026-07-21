/* ============================================================
   pages/os-view/os-view.js — Visualização da Ordem de Serviço
   Tela no HTML: <section id="screen-os-view">
   Renderiza o documento completo da OS e as ações:
   - seletor de status (ciclo de vida da bancada)
   - WhatsApp (registro da OS e aviso de "pronto p/ retirada")
   - editar OS (diagnóstico/itens), imprimir/PDF
   - assinaturas de entrada e de retirada
   - concluir com ou sem NFS-e
   ============================================================ */

import { OS_STATUS } from '../../config/constants.js';
import { state } from '../../core/app-state.js';
import { getProfile } from '../../core/profile-store.js';
import { navigate } from '../../core/navigation.js';
import { escHtml, showToast } from '../../utils/dom.js';
import { formatCurrency, formatDate, statusBadge, statusLabel } from '../../utils/format.js';
import { resolveFotoUrls } from '../../services/fotos-service.js';

// OS atualmente aberta (compartilhada com a tela de NFS-e)
let currentOSId = null;

export function getCurrentOSId()   { return currentOSId; }
export function setCurrentOSId(id) { currentOSId = id; }

/** Abre uma OS a partir da lista do dashboard. */
export function openOS(id) {
  currentOSId = id;
  renderOSView(id);
  navigate('screen-os-view');
}

/** Troca o status pelo seletor e sincroniza. */
export async function changeOSStatus(id, novoStatus) {
  const os = state.getById(id);
  if (!os || os.status === novoStatus) return;
  const { dbError } = await state.update(id, { status: novoStatus });
  renderOSView(id);
  showToast(
    dbError
      ? `Status alterado para "${statusLabel(novoStatus)}" (falha ao sincronizar).`
      : `Status alterado para "${statusLabel(novoStatus)}".`,
    dbError ? 'error' : 'success'
  );
}

// ── Mensagens de WhatsApp (texto profissional, sem emojis) ─────

function wppLink(telefone, texto) {
  return `https://wa.me/55${String(telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

function msgRegistroOS(os, perfil) {
  const condicoesStr = os.condicoes?.length
    ? os.condicoes.join(', ') + (os.condicoesOutros ? ', ' + os.condicoesOutros : '')
    : '';
  return (
    `Olá, ${os.cliente}. Sua ordem de serviço *${os.id}* foi registrada.\n\n` +
    `Aparelho: ${os.tipo ? os.tipo + ' — ' : ''}${os.marca}\n` +
    `Defeito relatado: ${os.defeito}\n` +
    (condicoesStr ? `Condições na entrada: ${condicoesStr}\n` : '') +
    (os.imei1 ? `IMEI: ${os.imei1}\n` : '') +
    `Valor estimado: ${formatCurrency(os.valor)}\n` +
    (os.previsao ? `Previsão de entrega: ${new Date(os.previsao + 'T12:00:00').toLocaleDateString('pt-BR')}\n` : '') +
    `\nGuarde este número para acompanhar o seu reparo.\n` +
    `${perfil?.razao_social || 'Atenciosamente'}. Em caso de dúvida, responda esta mensagem.`
  );
}

function msgAparelhoPronto(os, perfil) {
  return (
    `Olá, ${os.cliente}. Seu aparelho está pronto para retirada.\n\n` +
    `OS: *${os.id}*\n` +
    `Aparelho: ${os.tipo ? os.tipo + ' — ' : ''}${os.marca}\n` +
    (os.diagnostico ? `Serviço realizado: ${os.diagnostico}\n` : '') +
    `Valor total: ${formatCurrency(os.valor)}\n` +
    `\nAguardamos você para a retirada.\n` +
    `${perfil?.razao_social || ''}`.trim()
  );
}

// ── Renderização do documento ──────────────────────────────────

// Se a imagem falhar ao carregar (link expirado, falha momentânea de rede,
// bloqueio de CSP), troca o ícone quebrado por um aviso explicativo em vez
// de deixar o "ícone de imagem quebrada" cru para o técnico.
function fotoThumb(src, i) {
  return `<div class="photo-thumb"><img src="${src}" alt="Foto ${i + 1}" loading="lazy"
    onclick="openPhotoLightbox(this.src)"
    onerror="this.closest('.photo-thumb').innerHTML='<p class=&quot;foto-erro&quot;>Foto indisponível no momento</p>'"
  ></div>`;
}

function buildPhotoHTML(os) {
  if (os.fotos && os.fotos.length) {
    return `<div class="photo-grid">${os.fotos.map(fotoThumb).join('')}</div>`;
  }
  if (os.fotoPaths && os.fotoPaths.length) {
    // Fotos no Supabase Storage — resolve URLs assinadas de forma assíncrona
    resolveFotoUrls(os).then(urls => {
      const grid = document.getElementById('photo-grid-remote');
      if (!grid) return;
      grid.innerHTML = urls.length
        ? urls.map(fotoThumb).join('')
        : '<p class="text-muted" style="font-size:.8rem;font-style:italic">Fotos indisponíveis offline.</p>';
    });
    return `<div class="photo-grid" id="photo-grid-remote"><p class="text-muted" style="font-size:.8rem;font-style:italic">Carregando fotos…</p></div>`;
  }
  return `<p class="text-muted" style="font-size:.8rem;font-style:italic">Sem fotos registradas.</p>`;
}

/**
 * Nota de evidência sob a grade de fotos: onde e quando as fotos
 * foram registradas (o carimbo também está gravado em cada imagem).
 */
function buildFotoEvidenciaNota(os) {
  if (!(os.fotos?.length || os.fotoPaths?.length)) return '';
  const meta = os.fotoMeta?.[0];
  const local = meta?.local ? ` em ${escHtml(meta.local)}` : '';
  const quando = meta?.quando ? ` — ${formatDate(meta.quando)}` : '';
  return `<p class="foto-evidencia-nota">
    Fotos de vistoria registradas${local}${quando}.
    Cada imagem possui carimbo de data, hora e coordenadas GPS gravado de forma
    permanente, comprovando o estado do aparelho no momento da entrada.
  </p>`;
}

/** Bloco de uma assinatura registrada (entrada ou retirada). */
function signedBlockHTML(a, titulo) {
  return `
    <div class="sign-status signed">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      ${titulo} ${a.dataISO ? 'em ' + formatDate(a.dataISO) : 'às ' + escHtml(a.hora || '')}
    </div>
    ${a.imagem ? `<img src="${a.imagem}" alt="Assinatura do cliente" class="sign-image">` : ''}
    ${a.auditoria ? `<div class="sign-audit">
      ${a.auditoria.hash ? `<div>Hash SHA-256: <code>${escHtml(a.auditoria.hash.substring(0, 20))}…</code></div>` : ''}
      ${a.auditoria.gps ? `<div>Local da assinatura: ${escHtml(a.auditoria.gps.local || `${a.auditoria.gps.lat}, ${a.auditoria.gps.lon}`)}</div>` : ''}
      <div>Método: assinatura em tela com aceite dos termos</div>
    </div>` : ''}`;
}

export function renderOSView(id) {
  const os = state.getById(id);
  if (!os) return;
  const currentProfile = getProfile();

  const photoHTML = buildPhotoHTML(os);

  // Assinatura de entrada (autorização do serviço)
  const a = os.assinatura;
  const signHTML = a?.status === 'signed'
    ? signedBlockHTML(a, 'Assinado digitalmente')
    : `<div class="sign-status pending" id="sign-status-${os.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Aguardando assinatura do cliente
       </div>
       <button class="btn btn-secondary btn-full mt-8" onclick="openSignModal('${escHtml(os.id)}', 'entrada')">
         Colher assinatura do cliente
       </button>`;

  // Assinatura de retirada (cliente recebeu o aparelho)
  const ar = os.assinaturaRetirada;
  const retiradaSectionHTML = ar?.status === 'signed'
    ? `<div class="os-doc-section">
         <h4>Assinatura de retirada</h4>
         ${signedBlockHTML(ar, 'Retirada confirmada')}
       </div>`
    : '';

  const nfseHTML = os.nfse
    ? `<span class="badge badge-nfse">${os.nfse}</span>`
    : `<span class="badge badge-waiting">NFS-e pendente</span>`;

  // Seletor de status (ciclo de vida da OS)
  const statusOptions = OS_STATUS.map(s =>
    `<option value="${s.value}" ${os.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('');
  const statusControl = `
    <div class="os-status-control">
      <label for="os-status-select">Status</label>
      <select id="os-status-select" onchange="changeOSStatus('${escHtml(os.id)}', this.value)">
        ${statusOptions}
      </select>
    </div>`;

  // Ações contextuais quando o aparelho está pronto para retirada
  const prontoBlock = os.status === 'pronto'
    ? `<a href="${wppLink(os.telefone, msgAparelhoPronto(os, currentProfile))}" target="_blank" rel="noopener"
          class="btn btn-success btn-full mt-8">
         Avisar cliente: aparelho pronto (WhatsApp)
       </a>
       ${!ar ? `<button class="btn btn-secondary btn-full mt-8" onclick="openSignModal('${escHtml(os.id)}', 'retirada')">
         Registrar retirada com assinatura
       </button>` : ''}`
    : '';

  const concludeBtn = os.status !== 'concluida'
    ? `<button class="btn btn-success btn-full mt-16" onclick="openNFSe('${os.id}')">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
         Concluir e Emitir NFS-e
       </button>
       <button class="btn btn-outline btn-full mt-8" onclick="concludeWithoutNFSe('${os.id}')">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
         Concluir sem NFS-e
       </button>`
    : '';

  const wppUrl = wppLink(os.telefone, msgRegistroOS(os, currentProfile));

  document.getElementById('os-view-content').innerHTML = `
    <div class="os-document">
      <div class="os-doc-header">
        <div>
          ${currentProfile?.nome_fantasia ? `<div class="os-doc-empresa">${escHtml(currentProfile.nome_fantasia)}</div>` : ''}
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
          <h4>Dados do Cliente</h4>
          <div class="os-field-row"><span class="os-field-label">Nome</span><span class="os-field-value">${escHtml(os.cliente)}</span></div>
          <div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${escHtml(os.telefone)}</span></div>
          ${os.cpf ? `<div class="os-field-row"><span class="os-field-label">CPF</span><span class="os-field-value">${escHtml(os.cpf)}</span></div>` : ''}
          ${os.email ? `<div class="os-field-row"><span class="os-field-label">E-mail</span><span class="os-field-value">${escHtml(os.email)}</span></div>` : ''}
          ${os.endereco ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.8rem">${escHtml(os.endereco)}${os.cidade ? ' — ' + escHtml(os.cidade) : ''}</span></div>` : ''}
        </div>

        <div class="os-doc-section">
          <h4>Aparelho</h4>
          <div class="os-field-row"><span class="os-field-label">Tipo</span><span class="os-field-value">${escHtml(os.tipo || '—')}</span></div>
          <div class="os-field-row"><span class="os-field-label">Marca/Modelo</span><span class="os-field-value">${escHtml(os.marca)}</span></div>
          ${os.imei1 ? `<div class="os-field-row"><span class="os-field-label">IMEI 1</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${escHtml(os.imei1)}</span></div>` : ''}
          ${os.imei2 ? `<div class="os-field-row"><span class="os-field-label">IMEI 2</span><span class="os-field-value" style="font-size:.78rem;letter-spacing:.5px">${escHtml(os.imei2)}</span></div>` : ''}
          <div class="os-field-row">
            <span class="os-field-label">Nota Fiscal</span>
            <span class="os-field-value">${os.nfAparelho === 'sim' ? 'Possui' : 'Não possui'}</span>
          </div>
          <div class="os-field-row">
            <span class="os-field-label">Garantia</span>
            <span class="os-field-value">${os.garantia === 'sim' ? 'Em garantia' : 'Fora da garantia'}</span>
          </div>
          <div class="os-field-row"><span class="os-field-label">Defeito</span><span class="os-field-value" style="font-size:.78rem">${escHtml(os.defeito)}</span></div>
          ${(os.condicoes && os.condicoes.length) ? `<div class="os-field-row"><span class="os-field-label">Condições</span><span class="os-field-value" style="font-size:.78rem">${escHtml(os.condicoes.join(', '))}${os.condicoesOutros ? ', ' + escHtml(os.condicoesOutros) : ''}</span></div>` : ''}
          ${(os.senhaParao && os.senhaParao.length) ? `<div class="os-field-row"><span class="os-field-label">Padrão</span><span class="os-field-value" style="letter-spacing:2px;font-weight:700">${os.senhaParao.map(Number).join('-')}</span></div>` : ''}
          ${os.previsao ? `<div class="os-field-row"><span class="os-field-label">Previsão Saída</span><span class="os-field-value">${new Date(os.previsao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
          ${os.dataEntrega ? `<div class="os-field-row"><span class="os-field-label">Entregue em</span><span class="os-field-value">${formatDate(os.dataEntrega)}</span></div>` : ''}
        </div>

        ${os.diagnostico ? `
        <div class="os-doc-section">
          <h4>Diagnóstico do técnico</h4>
          <p style="font-size:.8rem;color:var(--text-light);white-space:pre-line">${escHtml(os.diagnostico)}</p>
        </div>` : ''}

        ${(os.itens && os.itens.length) ? `
        <div class="os-doc-section">
          <h4>Itens / Serviços</h4>
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
          <h4>Registro fotográfico (${(os.fotos?.length || os.fotoPaths?.length || 0)} foto(s))</h4>
          ${photoHTML}
          ${buildFotoEvidenciaNota(os)}
        </div>

        <div class="os-doc-section">
          <h4>Assinatura de entrada</h4>
          ${signHTML}
        </div>

        ${retiradaSectionHTML}

        <div class="os-doc-section">
          <h4>Prestador</h4>
          ${currentProfile?.logo_base64 ? `<img src="${escHtml(currentProfile.logo_base64)}" alt="Logo" style="max-height:48px;margin-bottom:8px;border-radius:4px">` : ''}
          <div class="os-field-row"><span class="os-field-label">Empresa</span><span class="os-field-value" style="font-size:.78rem">${escHtml(currentProfile?.razao_social || '—')}</span></div>
          ${currentProfile?.nome_fantasia && currentProfile.nome_fantasia !== currentProfile.razao_social ? `<div class="os-field-row"><span class="os-field-label">Nome Fantasia</span><span class="os-field-value" style="font-size:.78rem">${escHtml(currentProfile.nome_fantasia)}</span></div>` : ''}
          <div class="os-field-row"><span class="os-field-label">CNPJ/CPF</span><span class="os-field-value">${escHtml(currentProfile?.cnpj_cpf || '—')}</span></div>
          ${currentProfile?.logradouro ? `<div class="os-field-row"><span class="os-field-label">Endereço</span><span class="os-field-value" style="font-size:.75rem">${escHtml(currentProfile.logradouro)}${currentProfile.numero ? ', ' + escHtml(currentProfile.numero) : ''}${currentProfile.bairro ? ' — ' + escHtml(currentProfile.bairro) : ''}${currentProfile.cidade ? ', ' + escHtml(currentProfile.cidade) + '/' + escHtml(currentProfile.estado) : ''}</span></div>` : ''}
          ${currentProfile?.telefone ? `<div class="os-field-row"><span class="os-field-label">Telefone</span><span class="os-field-value">${escHtml(currentProfile.telefone)}</span></div>` : ''}
        </div>

        <div class="os-doc-section" style="background:#fafbfc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0">
          <h4 style="font-size:.78rem;margin-bottom:6px;opacity:.8">Termos e Condições</h4>
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

    ${statusControl}

    <div class="action-row mt-8">
      <a href="${wppUrl}" target="_blank" rel="noopener" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        WhatsApp
      </a>
      <button class="btn btn-outline" onclick="printOS()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        PDF/Imprimir
      </button>
    </div>
    <button class="btn btn-outline btn-full mt-8" onclick="openEditOS('${escHtml(os.id)}')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      Editar OS
    </button>
    ${prontoBlock}
    ${concludeBtn}
    <button class="btn btn-ghost btn-full mt-8" onclick="navigate('screen-dashboard'); renderDashboard()">← Voltar ao painel</button>
  `;
}

export async function concludeWithoutNFSe(id) {
  if (!confirm('Concluir esta OS sem emitir NFS-e?')) return;
  const { dbError } = await state.update(id, { status: 'concluida' });
  renderOSView(id);
  showToast(dbError ? 'OS concluída (falha ao sincronizar)' : 'OS concluída com sucesso!', dbError ? 'warning' : 'success');
}

export function printOS() {
  window.print();
}
