/* ============================================================
   OficinaPRO — supabase.js
   Integração com Supabase (persistência em nuvem)

   Tabela necessária — execute no SQL Editor do Supabase:

   CREATE TABLE ordens_servico (
     id           TEXT PRIMARY KEY,
     numero       INTEGER NOT NULL,
     status       TEXT NOT NULL DEFAULT 'aguardando',
     data_criacao TIMESTAMPTZ NOT NULL,
     dados        JSONB NOT NULL
   );
   ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "acesso publico" ON ordens_servico
     FOR ALL USING (true) WITH CHECK (true);

   ============================================================ */

'use strict';

const SUPABASE_URL = 'https://zfralmwyzpexqunynzfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ghjU1tbRqbdTIWCsuD-PnQ_ZRpk3ZpQ';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Carrega todas as OS do Supabase.
 * Retorna um array de objetos OS ou null em caso de erro.
 */
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

/**
 * Salva (insert ou update) uma OS no Supabase.
 */
async function dbSave(os) {
  const { error } = await db
    .from('ordens_servico')
    .upsert({
      id:           os.id,
      numero:       os.numero,
      status:       os.status,
      data_criacao: os.dataCriacao,
      dados:        os,
    });

  if (error) {
    console.error('[Supabase] Erro ao salvar OS:', error.message);
  }
}
