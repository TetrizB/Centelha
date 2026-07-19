/* ============================================================
   services/supabase-client.js — Conexão com o Supabase + sessão

   EDITE AQUI se trocar de projeto Supabase (URL e chave publicável).
   A chave abaixo é PUBLICÁVEL (anon/publishable) — é segura no
   front-end porque o acesso real é controlado por RLS no banco.

   O script SQL de setup do banco (tabelas, policies, bucket de fotos)
   está em: Centelha/supabase/setup.sql
   ============================================================ */

const SUPABASE_URL = 'https://vpjleuxialhmxuopdzjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F4Gu7ij9MfuRqArsmhbhYA_GFQzPuLQ';

// Cliente único compartilhado por todos os serviços.
// window.supabase vem do CDN carregado no index.html.
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// ── Sessão ──────────────────────────────────────────────────────

/** Retorna a sessão ativa, tentando refresh silencioso se necessário. */
export async function dbGetSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) return session;
  const { data } = await db.auth.refreshSession();
  return data?.session ?? null;
}

export async function dbSignIn(email, password) {
  return db.auth.signInWithPassword({ email, password });
}

export async function dbSignOut() {
  return db.auth.signOut();
}
