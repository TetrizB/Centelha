/* ============================================================
   services/fotos-service.js — Fotos das OS no Supabase Storage
   Sobe fotos base64 para o bucket privado 'fotos-os' e resolve
   URLs assinadas (válidas por 1h) para exibição.
   ============================================================ */

import { db, dbGetSession } from './supabase-client.js';

const FOTOS_BUCKET = 'fotos-os';

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  const bin  = atob(b64);
  const arr  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Notifica a interface sobre o andamento do upload (ver core/upload-progress.js)
function emitirProgresso(detail) {
  window.dispatchEvent(new CustomEvent('fotos-upload', { detail }));
}

/** Sobe fotos base64 para o Storage. Retorna { paths, error }. */
export async function dbUploadFotos(osId, fotosBase64) {
  const session = await dbGetSession();
  if (!session) return { paths: null, error: { message: 'Sessão expirada. Faça login novamente.' } };

  const total = fotosBase64.length;
  emitirProgresso({ fase: 'inicio', total });

  const paths = [];
  try {
    for (let i = 0; i < total; i++) {
      emitirProgresso({ fase: 'progresso', atual: i + 1, total });
      const path = `${session.user.id}/${osId}/${Date.now()}-${i}.jpg`;
      const { error } = await db.storage
        .from(FOTOS_BUCKET)
        .upload(path, dataUrlToBlob(fotosBase64[i]), { contentType: 'image/jpeg', upsert: true });
      if (error) {
        console.error('[Storage] upload:', error.message);
        return { paths: null, error };
      }
      paths.push(path);
    }
    return { paths, error: null };
  } finally {
    emitirProgresso({ fase: 'fim' });
  }
}

/** URLs assinadas (válidas por 1h) para exibir fotos guardadas no Storage. */
export async function dbGetFotoUrls(paths) {
  if (!paths?.length) return [];
  const { data, error } = await db.storage.from(FOTOS_BUCKET).createSignedUrls(paths, 3600);
  if (error) {
    console.error('[Storage] signedUrls:', error.message);
    return [];
  }
  return data.map(d => d.signedUrl).filter(Boolean);
}

// Cache de URLs assinadas da sessão: path -> URL (válida 1h)
const fotoUrlCache = new Map();

/** Resolve as URLs de exibição das fotos de uma OS, usando cache. */
export async function resolveFotoUrls(os) {
  if (!os.fotoPaths?.length) return [];
  const missing = os.fotoPaths.filter(p => !fotoUrlCache.has(p));
  if (missing.length) {
    const urls = await dbGetFotoUrls(missing);
    missing.forEach((p, i) => { if (urls[i]) fotoUrlCache.set(p, urls[i]); });
  }
  return os.fotoPaths.map(p => fotoUrlCache.get(p)).filter(Boolean);
}
