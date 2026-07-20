/* ============================================================
   pages/nova-os/fotos.js — Fotos de vistoria (passo 2)
   Captura da câmera/galeria, redimensiona para 1280px, carimba
   data/hora + GPS na imagem (prova jurídica) e gera os previews.
   ============================================================ */

import { wizard } from './state.js';
import { showToast } from '../../utils/dom.js';
import { getGPSComTimeout } from '../../services/gps-service.js';

const MAX_FOTOS = 5;
const JPEG_QUALITY = 0.75;   // qualidade da compressão (0 a 1)
const MAX_LARGURA = 1280;    // px — fotos maiores são redimensionadas

export async function handlePhotoCapture(input) {
  const files = Array.from(input.files);
  if (!files.length) return;

  const remaining = MAX_FOTOS - wizard.data.fotos.length;
  if (remaining <= 0) { showToast(`Limite de ${MAX_FOTOS} fotos atingido.`, 'error'); return; }
  const toProcess = files.slice(0, remaining);

  // Mostra feedback imediato para o usuário
  showToast(`Processando ${toProcess.length} foto(s)...`, '');

  // Usa GPS já em cache (pré-carregado ao entrar no passo 2).
  // Se ainda não chegou, aguarda no máximo 1 segundo — nunca bloqueia a foto.
  const gps = await getGPSComTimeout(1000);

  let processadas = 0;
  for (const file of toProcess) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const stamped = await stampTimestamp(dataUrl, gps);
      wizard.data.fotos.push(stamped);
      // Metadados estruturados da captura (exibidos no documento da OS)
      wizard.data.fotoMeta = wizard.data.fotoMeta || [];
      wizard.data.fotoMeta.push({
        quando: new Date().toISOString(),
        local:  gps.lat !== null ? gps.locStr : null,
        lat:    gps.lat,
        lon:    gps.lon,
      });
      processadas++;
      // Atualiza preview progressivamente (foto a foto)
      renderPhotoPreviews();
      document.getElementById('photo-count').textContent = wizard.data.fotos.length;
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

/** Redimensiona e carimba data/hora + localização na foto. */
function stampTimestamp(dataUrl, gps) {
  return new Promise((res) => {
    const img = new Image();

    // Garante que a Promise sempre resolve mesmo se o canvas falhar
    img.onerror = () => res(dataUrl);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > MAX_LARGURA) { h = Math.round(h * MAX_LARGURA / w); w = MAX_LARGURA; }
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

        res(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (e) {
        console.error('[stamp] Falha ao carimbar foto, usando original:', e);
        res(dataUrl); // retorna a foto sem carimbo em vez de bloquear
      }
    };

    img.src = dataUrl;
  });
}

export function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  container.innerHTML = wizard.data.fotos.map((src, i) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Foto ${i+1}" loading="lazy">
      <button class="photo-remove" onclick="removePhoto(${i})" title="Remover foto">✕</button>
    </div>`).join('');
}

export function removePhoto(idx) {
  wizard.data.fotos.splice(idx, 1);
  if (wizard.data.fotoMeta) wizard.data.fotoMeta.splice(idx, 1);
  renderPhotoPreviews();
  document.getElementById('photo-count').textContent = wizard.data.fotos.length;
}

// ── Lightbox com zoom ──────────────────────────────────────────
// Pinça (2 dedos), duplo toque e roda do mouse — para inspecionar
// o detalhe do arranhão que justifica a foto de vistoria.

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;

/** Amplia uma foto em tela cheia com zoom (usado também na visualização da OS). */
export function openPhotoLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close" title="Fechar">✕</button>
    <img src="${src}" alt="Foto ampliada" draggable="false">
    <p class="lightbox-hint">Pince ou dê um toque duplo para ampliar</p>`;
  const img = overlay.querySelector('img');
  const close = () => overlay.remove();
  overlay.querySelector('.lightbox-close').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  // Estado do zoom/arraste
  let escala = 1, tx = 0, ty = 0;
  const ponteiros = new Map();          // pointerId -> {x, y}
  let distInicial = 0, escalaInicial = 1;
  let ultimoToque = 0;

  const aplicar = () => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${escala})`;
    img.style.cursor = escala > 1 ? 'grab' : 'zoom-in';
  };
  const limitar = () => {
    escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, escala));
    if (escala === 1) { tx = 0; ty = 0; }
  };
  const distancia = () => {
    const [a, b] = [...ponteiros.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  img.addEventListener('pointerdown', e => {
    e.preventDefault();
    img.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 2) {
      distInicial   = distancia();
      escalaInicial = escala;
    }
    // Duplo toque: alterna entre 1x e 2.5x
    if (ponteiros.size === 1) {
      const agora = Date.now();
      if (agora - ultimoToque < 300) {
        escala = escala > 1 ? 1 : 2.5;
        limitar(); aplicar();
      }
      ultimoToque = agora;
    }
  });

  img.addEventListener('pointermove', e => {
    if (!ponteiros.has(e.pointerId)) return;
    const anterior = ponteiros.get(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ponteiros.size === 2 && distInicial > 0) {
      // Pinça: escala proporcional à abertura dos dedos
      escala = escalaInicial * (distancia() / distInicial);
      limitar(); aplicar();
    } else if (ponteiros.size === 1 && escala > 1) {
      // Arraste com um dedo quando ampliado
      tx += e.clientX - anterior.x;
      ty += e.clientY - anterior.y;
      aplicar();
    }
  });

  ['pointerup', 'pointercancel'].forEach(ev =>
    img.addEventListener(ev, e => {
      ponteiros.delete(e.pointerId);
      if (ponteiros.size < 2) distInicial = 0;
    })
  );

  // Roda do mouse (desktop)
  overlay.addEventListener('wheel', e => {
    e.preventDefault();
    escala *= e.deltaY < 0 ? 1.15 : 0.87;
    limitar(); aplicar();
  }, { passive: false });

  aplicar();
}
