/* ============================================================
   pages/os-view/assinatura.js — Assinatura digital do cliente
   Modal no HTML: <div id="sign-modal">

   Dois modos, mesmo modal:
   - 'entrada'  → autorização do serviço (grava em os.assinatura)
   - 'retirada' → confirmação de recebimento do aparelho
                  (grava em os.assinaturaRetirada, marca a OS
                   como entregue e registra a data de entrega)

   Trilha de auditoria em ambos: hash SHA-256 do conteúdo da OS,
   GPS, dispositivo e data/hora.
   ============================================================ */

import { state } from '../../core/app-state.js';
import { showToast } from '../../utils/dom.js';
import { formatCurrency } from '../../utils/format.js';
import { getGPSComTimeout } from '../../services/gps-service.js';
import { renderOSView } from './os-view.js';

const MODOS = {
  entrada: {
    titulo: 'Assinatura do Cliente',
    legal:  'Ao assinar, o cliente declara que conferiu os dados da OS, aceita os termos e ' +
            'condições do serviço e autoriza o tratamento dos seus dados para essa finalidade (LGPD).',
  },
  retirada: {
    titulo: 'Assinatura de Retirada',
    legal:  'Ao assinar, o cliente declara que retirou o aparelho descrito nesta OS, ' +
            'conferiu o seu funcionamento e está de acordo com o serviço realizado.',
  },
};

let _signDrawing = false;
let _signHasInk  = false;
let _signOSId    = null;
let _signModo    = 'entrada';
let _signCtx     = null;

export function openSignModal(id, modo = 'entrada') {
  const os = state.getById(id);
  if (!os) return;
  _signOSId = id;
  _signModo = MODOS[modo] ? modo : 'entrada';

  document.getElementById('sign-modal-title').textContent = MODOS[_signModo].titulo;
  document.getElementById('sign-legal-text').textContent  = MODOS[_signModo].legal;
  document.getElementById('sign-modal-info').textContent =
    `${os.id} — ${os.cliente} — ${formatCurrency(os.valor)}`;
  document.getElementById('sign-modal').classList.remove('hidden');

  const canvas = document.getElementById('sign-canvas');
  const rect   = canvas.getBoundingClientRect();
  const dpr    = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;

  _signCtx = canvas.getContext('2d');
  _signCtx.scale(dpr, dpr);
  _signCtx.lineWidth   = 2.2;
  _signCtx.lineCap     = 'round';
  _signCtx.lineJoin    = 'round';
  _signCtx.strokeStyle = '#1a365d';
  _signHasInk = false;

  if (!canvas.dataset.bound) {
    canvas.dataset.bound = '1';
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('pointerdown', e => {
      _signDrawing = true;
      const p = pos(e);
      _signCtx.beginPath();
      _signCtx.moveTo(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (!_signDrawing) return;
      const p = pos(e);
      _signCtx.lineTo(p.x, p.y);
      _signCtx.stroke();
      _signHasInk = true;
      e.preventDefault();
    });
    ['pointerup', 'pointercancel'].forEach(ev =>
      canvas.addEventListener(ev, () => { _signDrawing = false; })
    );
  }
}

export function clearSignature() {
  const canvas = document.getElementById('sign-canvas');
  if (_signCtx) _signCtx.clearRect(0, 0, canvas.width, canvas.height);
  _signHasInk = false;
}

export function closeSignModal() {
  document.getElementById('sign-modal').classList.add('hidden');
  _signDrawing = false;
}

/**
 * Hash SHA-256 do conteúdo essencial da OS no momento da assinatura.
 * Amarra a assinatura ao que foi assinado — elo da cadeia probatória.
 */
async function hashOSContent(os) {
  const core = JSON.stringify({
    id: os.id,
    cliente: os.cliente,
    cpf: os.cpf || '',
    telefone: os.telefone,
    defeito: os.defeito,
    valor: os.valor,
    dataCriacao: os.dataCriacao,
    qtdFotos: (os.fotoPaths?.length || os.fotos?.length || 0),
  });
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(core));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null; // crypto.subtle exige HTTPS/localhost — sem hash, assinatura ainda vale
  }
}

export async function confirmSignature() {
  if (!_signHasInk) {
    showToast('Peça ao cliente para assinar na tela antes de confirmar.', 'error');
    return;
  }
  const os = state.getById(_signOSId);
  if (!os) { closeSignModal(); return; }

  const canvas = document.getElementById('sign-canvas');
  const imagem = canvas.toDataURL('image/png');

  const gps  = await getGPSComTimeout(1500);
  const now  = new Date();
  const hash = await hashOSContent(os);

  const assinatura = {
    status:  'signed',
    hora:    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    dataISO: now.toISOString(),
    imagem,
    auditoria: {
      hash,
      gps: gps.lat !== null ? { lat: gps.lat, lon: gps.lon, local: gps.locStr } : null,
      dispositivo: navigator.userAgent,
      metodo: `assinatura-em-tela-${_signModo}`,
    },
  };

  // Entrada: autoriza o serviço e move para "em reparo".
  // Retirada: confirma a entrega, conclui a OS e registra a data.
  const patch = _signModo === 'retirada'
    ? { assinaturaRetirada: assinatura, status: 'concluida', dataEntrega: now.toISOString() }
    : { assinatura, status: 'andamento' };

  closeSignModal();
  const { dbError } = await state.update(_signOSId, patch);
  renderOSView(_signOSId);

  const okMsg = _signModo === 'retirada'
    ? 'Retirada registrada — OS concluída com trilha de auditoria.'
    : 'Assinatura registrada com trilha de auditoria.';
  showToast(
    dbError ? 'Assinatura registrada localmente, mas falha ao sincronizar com o servidor.' : okMsg,
    dbError ? 'error' : 'success'
  );
}
