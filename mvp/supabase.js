/* ============================================================
   OficinaPRO — supabase.js
   Integração com Supabase: persistência + autenticação

   SQL necessário — execute no SQL Editor do Supabase:

   -- 1. Adiciona coluna de dono na tabela
   ALTER TABLE ordens_servico ADD COLUMN user_id UUID REFERENCES auth.users(id);

   -- 2. Remove a policy aberta anterior
   DROP POLICY IF EXISTS "acesso publico" ON ordens_servico;

   -- 3. Cria policy que isola dados por empresa
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
  return data.map(r => r.dados);
}

async function dbSave(os) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const { error } = await db
    .from('ordens_servico')
    .upsert({
      id:           os.id,
      numero:       os.numero,
      status:       os.status,
      data_criacao: os.dataCriacao,
      user_id:      session.user.id,
      dados:        os,
    });

  if (error) console.error('[Supabase] Erro ao salvar OS:', error.message);
}
