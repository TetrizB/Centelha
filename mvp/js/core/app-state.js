/* ============================================================
   core/app-state.js — Estado das Ordens de Serviço

   Fonte da verdade local (localStorage) com sincronização para o
   Supabase. Estratégia offline-first:
     1. Toda criação/edição grava primeiro no localStorage.
     2. Em seguida tenta salvar no servidor (dbSave).
     3. Se falhar, a OS entra na fila de pendências e é reenviada
        quando a rede voltar (syncPending, chamado em main.js).
   ============================================================ */

import { STORAGE_KEY, PENDING_KEY } from '../config/constants.js';
import { dbSave } from '../services/os-service.js';
import { showToast } from '../utils/dom.js';

class AppState {
  constructor() {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const MOCK_IDS = ['OS-2026-0001', 'OS-2026-0002', 'OS-2026-0003'];
    this._os = stored.filter(os => !MOCK_IDS.includes(os.id));
    if (this._os.length !== stored.length) this._save();
    this._pending = new Set(JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'));
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._os));
    } catch (e) {
      console.error('[Storage] Falha ao gravar localmente:', e);
      showToast('Memória local cheia. Os dados serão mantidos no servidor — verifique sua conexão.', 'error');
    }
  }

  _savePending() {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify([...this._pending]));
    } catch (e) {
      console.error('[Storage] Falha ao gravar fila de pendências:', e);
    }
  }

  getAll()    { return [...this._os].reverse(); }
  getById(id) { return this._os.find(os => os.id === id); }

  getNextNum() {
    const nums = this._os.map(o => o.numero || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }

  async create(data) {
    const num = this.getNextNum();
    const os  = {
      ...data,
      numero:      num,
      id:          `OS-2026-${String(num).padStart(4,'0')}`,
      dataCriacao: new Date().toISOString(),
      status:      'aguardando',
      nfse:        null,
      assinatura:  { status: 'pending', hora: null },
    };
    this._os.push(os);
    this._save();
    const { error, fotoPaths, fotoError } = await dbSave(os);
    if (error) {
      this._pending.add(os.id);
      this._savePending();
      return { os, dbError: true };
    }
    if (fotoError) {
      // OS salva no servidor; fotos ficam locais e na fila para reenvio
      this._pending.add(os.id);
      this._savePending();
      return { os: this.getById(os.id), fotoWarn: true };
    }
    this._afterCloudSave(os.id, fotoPaths);
    return { os: this.getById(os.id) };
  }

  async update(id, patch) {
    const idx = this._os.findIndex(os => os.id === id);
    if (idx === -1) return { dbError: false };
    this._os[idx] = { ...this._os[idx], ...patch };
    this._save();
    const { error, fotoPaths, fotoError } = await dbSave(this._os[idx]);
    if (error) {
      this._pending.add(id);
      this._savePending();
      return { os: this._os[idx], dbError: true };
    }
    if (fotoError) {
      this._pending.add(id);
      this._savePending();
      return { os: this.getById(id), fotoWarn: true };
    }
    this._pending.delete(id);
    this._savePending();
    this._afterCloudSave(id, fotoPaths);
    return { os: this.getById(id) };
  }

  // Após upload bem-sucedido, troca as fotos base64 pelos paths do Storage
  // — é isso que tira as fotos do localStorage e resolve a cota de ~5 MB.
  _afterCloudSave(id, fotoPaths) {
    if (!fotoPaths?.length) return;
    const idx = this._os.findIndex(os => os.id === id);
    if (idx === -1) return;
    this._os[idx] = { ...this._os[idx], fotos: [], fotoPaths };
    this._save();
  }

  // Merge com dados da nuvem preservando fotos locais (não enviadas ao servidor)
  mergeFromCloud(remoteOS) {
    const localMap  = new Map(this._os.map(o => [o.id, o]));
    const remoteIds = new Set(remoteOS.map(o => o.id));

    const merged = remoteOS.map(remote => {
      const local = localMap.get(remote.id);
      // Preserva fotos base64 locais só se ainda não foram enviadas ao Storage
      return (local?.fotos?.length && !remote.fotoPaths?.length && !remote.fotos?.length)
        ? { ...remote, fotos: local.fotos }
        : remote;
    });

    const localOnly = this._os.filter(o => !remoteIds.has(o.id));
    this._os = [...merged, ...localOnly];
    this._save();
  }

  // Reenvia OS pendentes ao Supabase
  async syncPending() {
    if (!this._pending.size) return { synced: 0, lastError: null };
    let synced = 0, lastError = null;
    for (const id of [...this._pending]) {
      const os = this._os.find(o => o.id === id);
      if (!os) { this._pending.delete(id); continue; }
      const { error, fotoPaths, fotoError } = await dbSave(os);
      if (error) { lastError = error; continue; }
      if (fotoError) { lastError = fotoError; continue; } // OS salva; fotos tentam de novo depois
      this._pending.delete(id);
      this._afterCloudSave(id, fotoPaths);
      synced++;
    }
    this._savePending();
    return { synced, lastError };
  }

  get pendingCount() { return this._pending.size; }

  /** Limpa os dados locais no logout (os dados continuam no servidor). */
  clearLocalData() {
    this._os = [];
    this._pending = new Set();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PENDING_KEY);
  }

  metrics() {
    const hoje = new Date().toDateString();
    const osHoje      = this._os.filter(o => new Date(o.dataCriacao).toDateString() === hoje);
    const faturamento = osHoje.filter(o => o.status === 'concluida').reduce((a, o) => a + (o.valor || 0), 0);
    const nfsEmitidas = this._os.filter(o => o.nfse !== null).length;
    return { total: osHoje.length, faturamento, nfsEmitidas };
  }
}

// Instância única compartilhada por todo o app
export const state = new AppState();
