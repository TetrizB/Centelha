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

// Renova o token quando falta menos que isto para expirar (evita gravar
// com um JWT vencido, o que faz o servidor rejeitar com auth.uid() nulo).
const RENOVAR_ANTES_MS = 60000; // 60 segundos

/**
 * Retorna a sessão ativa e VÁLIDA, renovando o token se necessário.
 * getSession() devolve a sessão salva mesmo com o token já expirado —
 * por isso conferimos a expiração e renovamos antes de usar.
 */
export async function dbGetSession() {
  const { data: { session } } = await db.auth.getSession();

  // Sem sessão salva: última tentativa via refresh
  if (!session) {
    const { data } = await db.auth.refreshSession();
    return data?.session ?? null;
  }

  // Token expirado (ou quase): renova antes de devolver.
  // Se o refresh falhar (ex.: offline), mantém a sessão atual — a gravação
  // falha naturalmente e a OS vai para a fila de reenvio.
  const expiraEmMs = (session.expires_at ?? 0) * 1000 - Date.now();
  if (expiraEmMs < RENOVAR_ANTES_MS) {
    const { data } = await db.auth.refreshSession();
    return data?.session ?? session;
  }

  return session;
}

export async function dbSignIn(email, password) {
  return db.auth.signInWithPassword({ email, password });
}

export async function dbSignOut() {
  return db.auth.signOut();
}
