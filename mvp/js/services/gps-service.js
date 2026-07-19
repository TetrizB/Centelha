/* ============================================================
   services/gps-service.js — Geolocalização + geocodificação reversa
   Usa o GPS do aparelho e o Nominatim (OpenStreetMap, gratuito,
   sem chave) para transformar coordenadas em "Cidade, UF".
   ============================================================ */

// Cache da sessão: { lat, lon, locStr } — reutilizado entre fotos da mesma OS
let gpsCache = null;

/** Limpa o cache para buscar posição fresca (ex.: ao iniciar nova OS). */
export function resetGPS() {
  gpsCache = null;
}

/**
 * Retorna { lat, lon, locStr } com a localização atual.
 * Usa cache da sessão para não pedir permissão a cada foto.
 * Nunca lança exceção — retorna locStr de fallback em caso de erro.
 */
export async function getGPS() {
  if (gpsCache) return gpsCache;

  if (!navigator.geolocation) {
    gpsCache = { lat: null, lon: null, locStr: 'Localização indisponível' };
    return gpsCache;
  }

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      });
    });

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Geocodificação reversa via Nominatim
    let locStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (r.ok) {
        const data = await r.json();
        const a = data.address || {};
        const cidade = a.city || a.town || a.village || a.county || '';
        const estado = a.state_code || a.state || '';
        locStr = cidade && estado ? `${cidade}, ${estado}` : (cidade || locStr);
      }
    } catch (_) { /* usa coordenadas brutas se Nominatim falhar */ }

    gpsCache = { lat, lon, locStr };
    return gpsCache;
  } catch (err) {
    const msg = err.code === 1 ? 'GPS negado pelo usuário' : 'GPS indisponível';
    gpsCache = { lat: null, lon: null, locStr: msg };
    return gpsCache;
  }
}

/**
 * getGPS() com tempo máximo de espera — nunca bloqueia a ação do usuário.
 * Se o GPS já está em cache, resolve na hora.
 */
export function getGPSComTimeout(ms) {
  const fallback = new Promise(r =>
    setTimeout(() => r({ lat: null, lon: null, locStr: 'GPS indisponível' }), ms));
  return Promise.race([getGPS(), fallback]);
}
