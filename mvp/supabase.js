/* ============================================================
   OficinaPRO — supabase.js  (reescrito)
   ============================================================

   SETUP ÚNICO — execute uma vez no SQL Editor do Supabase:
   ────────────────────────────────────────────────────────────

   -- Adiciona colunas necessárias (seguro executar múltiplas vezes)
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS os_id        TEXT;
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id);
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS numero       INTEGER;
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS status       TEXT;
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ;
   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS dados        JSONB;

   -- Índice único em os_id (nosso identificador de app, ex: "OS-2026-0001")
   CREATE UNIQUE INDEX IF NOT EXISTS idx_os_os_id ON ordens_servico(os_id);

   -- Migra linhas antigas que tinham o id dentro do JSON
   UPDATE ordens_servico
   SET os_id = dados->>'id'
   WHERE os_id IS NULL AND dados->>'id' IS NOT NULL;

   -- Corrige linhas com user_id nulo (bug de versões anteriores)
   UPDATE ordens_servico
   SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
   WHERE user_id IS NULL;

   -- Remove TODAS as policies antigas
   DROP POLICY IF EXISTS "acesso publico"       ON ordens_servico;
   DROP POLICY IF EXISTS "empresa ve so suas OS" ON ordens_servico;
   DROP POLICY IF EXISTS "select proprios"       ON ordens_servico;
   DROP POLICY IF EXISTS "insert proprios"       ON ordens_servico;
   DROP POLICY IF EXISTS "update proprios"       ON ordens_servico;
   DROP POLICY IF EXISTS "delete proprios"       ON ordens_servico;
   DROP POLICY IF EXISTS "rw proprios"           ON ordens_servico;

   -- Habilita RLS e cria UMA policy limpa
   ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "acesso por usuario" ON ordens_servico
     FOR ALL TO authenticated
     USING     (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   -- Mesma coisa para perfis de empresa
   ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

   DROP POLICY IF EXISTS "perfil por usuario" ON company_profiles;

   CREATE POLICY "perfil por usuario" ON company_profiles
     FOR ALL TO authenticated
     USING     (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   ============================================================ */

'use strict';

const SUPABASE_URL = 'https://zfralmwyzpexqunynzfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ghjU1tbRqbdTIWCsuD-PnQ_ZRpk3ZpQ';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ── Sessão ──────────────────────────────────────────────────────
// Retorna a sessão ativa, tentando refresh silencioso se necessário.
async function _session() {
  const { data: { session } } = await db.auth.getSession();
  if (session) return session;
  const { data } = await db.auth.refreshSession();
  return data?.session ?? null;
}

async function dbGetSession()            { return _session(); }
async function dbSignIn(email, password) { return db.auth.signInWithPassword({ email, password }); }
async function dbSignOut()               { return db.auth.signOut(); }

// ── Ordens de Serviço ───────────────────────────────────────────

async function dbLoadAll() {
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

async function dbSave(os) {
  const session = await _session();
  if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };

  // Fotos em base64 não vão ao servidor — preservadas só no localStorage
  const { fotos: _dropped, ...dadosSemFotos } = os;

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
  return { error: error ?? null };
}

// ── Perfil da Empresa ───────────────────────────────────────────

async function dbLoadProfile() {
  const { data, error } = await db
    .from('company_profiles')
    .select('*')
    .maybeSingle();           // não gera erro quando não há linhas

  if (error) console.error('[DB] dbLoadProfile:', error.message);
  return data ?? null;
}

async function dbSaveProfile(profile) {
  const session = await _session();
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
