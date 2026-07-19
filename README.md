# Centelha — OficinaPRO

Gestão de ordens de serviço para oficinas técnicas (assistências de celular, notebook, eletrônicos). PWA mobile-first: funciona offline, é instalável no celular e sincroniza com a nuvem.

## Estrutura do repositório

```
Centelha/
├── mvp/            ← o app (HTML/CSS/JS puro, sem build) — é o que o Netlify publica
│   └── COMO-EDITAR.md  ← guia de edição do código
├── supabase/
│   └── setup.sql   ← script de setup do banco (tabelas, RLS, storage)
├── docs/           ← materiais de negócio (pitch, slides, guia do piloto)
└── netlify.toml    ← config de deploy (publica a pasta mvp/)
```

## Stack

- **Front-end:** JavaScript puro (módulos ES), sem framework e sem build
- **Backend:** Supabase (auth, PostgreSQL com RLS, Storage para fotos)
- **Deploy:** Netlify (automático a cada push)
- **Offline:** Service Worker network-first + localStorage com fila de sincronização

## Funcionalidades

- Wizard de criação de OS em 3 passos (cliente/aparelho → vistoria com fotos → revisão)
- Fotos com carimbo de data/hora + GPS (proteção jurídica)
- Padrão de desbloqueio 3×3 do aparelho
- Busca de OS (cliente, telefone, IMEI, nº) e filtros por status no painel
- Ciclo de vida completo da OS: em análise → aprovação → peça → reparo → pronto → entregue
- Edição da OS após a entrada (diagnóstico do técnico, itens/peças, previsão)
- Sugestão automática de cliente recorrente pelo telefone
- Assinatura digital de entrada e de retirada, com trilha de auditoria (hash SHA-256, GPS, dispositivo)
- Envio da OS por WhatsApp (registro e aviso de "aparelho pronto") e impressão/PDF em A4
- Emissão de NFS-e via portal nacional (pré-preenchimento + vínculo do número)
- Ranking de lucratividade por serviço + export CSV
- Multi-empresa: cada login vê apenas seus dados (RLS)

## Como rodar localmente

```bash
cd mvp
python -m http.server 8000   # ou: npx serve .
```

Acesse `http://localhost:8000`. Detalhes e receitas de edição em [mvp/COMO-EDITAR.md](mvp/COMO-EDITAR.md).
