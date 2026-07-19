/* ============================================================
   services/os-service.js — Ordens de Serviço no banco (Supabase)
   Tabela: ordens_servico (schema em Centelha/supabase/setup.sql)
   ============================================================ */

import { db, dbGetSession } from './supabase-client.js';
import { dbUploadFotos } from './fotos-service.js';

/** Carrega todas as OS do usuário logado (RLS filtra por user_id). */
export async function dbLoadAll() {
  const { data, error } = await db
    .from('ordens_servico')
    .select('dados')
    .order('numero', { ascending: true });

  if (error) {
    console.error('[DB] dbLoadAll:', error.message);
    return null;
  }
  return data.map(r => r.dados).filter(Boolean);
}

/**
 * Salva/atualiza uma OS no banco.
 * Fotos base64 sobem para o Storage; só os paths vão ao banco.
 * Se o upload falhar (ex.: bucket não configurado), a OS é salva
 * mesmo assim — as fotos ficam no aparelho e serão reenviadas depois.
 */
export async function dbSave(os) {
  const session = await dbGetSession();
  if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };

  let fotoPaths = os.fotoPaths || [];
  let fotoError = null;
  if (os.fotos?.length) {
    const { paths, error: upErr } = await dbUploadFotos(os.id, os.fotos);
    if (upErr) fotoError = upErr;
    else fotoPaths = [...fotoPaths, ...paths];
  }

  const { fotos: _dropped, ...dadosSemFotos } = os;
  dadosSemFotos.fotoPaths = fotoPaths;

  const { error } = await db
    .from('ordens_servico')
    .upsert(
      {
        os_id:        os.id,
        user_id:      session.user.id,
        numero:       os.numero,
        status:       os.status,
        data_criacao: os.dataCriacao,
        dados:        dadosSemFotos,
      },
      { onConflict: 'os_id' }   // usa nossa coluna de texto, não o UUID
    );

  if (error) console.error('[DB] dbSave:', error.message);
  return { error: error ?? null, fotoPaths, fotoError };
}
