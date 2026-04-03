/* ============================================================
   OficinaPRO — supabase.js
   Integração com Supabase: persistência + autenticação

   SQL necessário — execute no SQL Editor do Supabase:

   -- 1. Adiciona coluna de dono na tabela (se ainda não existir)
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

   -- 2. Garante que id (texto) é único para o upsert funcionar corretamente
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS id TEXT;
   ALTER TABLE ordens_servico ADD CONSTRAINT IF NOT EXISTS ordens_servico_id_unique UNIQUE (id);

   -- 3. Remove a policy aberta anterior
   DROP POLICY IF EXISTS "acesso publico" ON ordens_servico;

   -- 4. Cria policy que isola dados por empresa
   CREATE POLICY "empresa ve so suas OS" ON ordens_servico
     FOR ALL
     USING  (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   ============================================================ */

'use strict';

const SUPABASE_URL = 'https://zfralmwyzpexqunynzfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ghjU1tbRqbdTIWCsuD-PnQ_ZRpk3ZpQ';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth ────────────────────────────────────────────────────────

async function dbGetSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function dbSignIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function dbSignOut() {
  await db.auth.signOut();
}

// ── Dados ───────────────────────────────────────────────────────

async function dbLoadAll() {
  const { data, error } = await db
    .from('ordens_servico')
    .select('dados')
    .order('numero', { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar OS:', error.message);
    return null;
  }
  return data.map(r => r.dados).filter(Boolean);
}

// ── Perfil da Empresa ───────────────────────────────────────────

async function dbLoadProfile() {
  const { data, error } = await db
    .from('company_profiles')
    .select('*')
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] Erro ao carregar perfil:', error.message);
  }
  return data || null;
}

async function dbSaveProfile(profile) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return { error: 'Sem sessão' };
  const { error } = await db
    .from('company_profiles')
    .upsert({ ...profile, user_id: session.user.id, updated_at: new Date().toISOString() });
  return { error };
}

// ── Dados ───────────────────────────────────────────────────────

async function dbSave(os, attempt = 1) {
  // Tenta renovar a sessão antes de salvar (evita falhas por token expirado)
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    // Tenta refresh silencioso antes de desistir
    const { data: refreshed } = await db.auth.refreshSession();
    if (!refreshed?.session) return { error: 'Sem sessão ativa' };
  }

  const uid = session?.user?.id || (await db.auth.getSession()).data.session?.user?.id;

  const { error } = await db
    .from('ordens_servico')
    .upsert({
      id:           os.id,
      numero:       os.numero,
      status:       os.status,
      data_criacao: os.dataCriacao,
      user_id:      uid,
      dados:        os,
    }, { onConflict: 'id' });

  if (error) {
    console.error(`[Supabase] Erro ao salvar OS (tentativa ${attempt}):`, error.message);
    // Retry automático uma vez para erros transitórios de rede
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 1500));
      return dbSave(os, attempt + 1);
    }
  }
  return { error: error || null };
}
