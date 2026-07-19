-- ============================================================
-- OficinaPRO — Setup do banco Supabase
-- SETUP ÚNICO: execute uma vez no SQL Editor do Supabase
-- (seguro executar múltiplas vezes — tudo é idempotente).
--
-- Após trocar de projeto Supabase, atualize também a URL e a
-- chave em: mvp/js/services/supabase-client.js
-- ============================================================

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
DROP POLICY IF EXISTS "acesso publico"        ON ordens_servico;
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

-- STORAGE — bucket privado para as fotos das OS
-- (tira as fotos do localStorage; resolve a cota de ~5 MB)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-os', 'fotos-os', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "fotos select proprias" ON storage.objects;
DROP POLICY IF EXISTS "fotos insert proprias" ON storage.objects;
DROP POLICY IF EXISTS "fotos update proprias" ON storage.objects;
DROP POLICY IF EXISTS "fotos delete proprias" ON storage.objects;

CREATE POLICY "fotos select proprias" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-os' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos insert proprias" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-os' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos update proprias" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-os' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos delete proprias" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-os' AND (storage.foldername(name))[1] = auth.uid()::text);
