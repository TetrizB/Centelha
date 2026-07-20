/* ============================================================
   core/upload-progress.js — Progresso do envio de fotos
   Elemento no HTML: <div id="upload-progress">

   Escuta os eventos 'fotos-upload' disparados pelo
   services/fotos-service.js e mostra um aviso fixo
   ("Enviando foto 2 de 5...") durante o upload — o momento
   mais demorado do fluxo em conexões lentas.
   ============================================================ */

export function initUploadProgress() {
  const el = document.getElementById('upload-progress');
  if (!el) return;

  window.addEventListener('fotos-upload', e => {
    const { fase, atual, total } = e.detail || {};
    if (fase === 'fim') {
      el.classList.add('hidden');
      return;
    }
    el.textContent = fase === 'progresso'
      ? `Enviando foto ${atual} de ${total}...`
      : `Enviando ${total} foto(s)...`;
    el.classList.remove('hidden');
  });
}
