/* ============================================================
   services/profile-service.js — Perfil da empresa no banco
   Tabela: company_profiles (schema em Centelha/supabase/setup.sql)
   ============================================================ */

import { db, dbGetSession } from './supabase-client.js';

export async function dbLoadProfile() {
  const { data, error } = await db
    .from('company_profiles')
    .select('*')
    .maybeSingle();           // não gera erro quando não há linhas

  if (error) console.error('[DB] dbLoadProfile:', error.message);
  return data ?? null;
}

export async function dbSaveProfile(profile) {
  const session = await dbGetSession();
  if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };

  const { error } = await db
    .from('company_profiles')
    .upsert(
      { ...profile, user_id: session.user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }  // garante que nunca cria perfil duplicado
    );

  if (error) console.error('[DB] dbSaveProfile:', error.message);
  return { error: error ?? null };
}
