# COMO EDITAR O OFICINAPRO

Guia rápido para encontrar e editar cada parte do app. **Não é preciso instalar nada** — o app é HTML/CSS/JavaScript puro, sem build. Salvou o arquivo, atualizou o navegador, pronto.

## Mapa de pastas

```
mvp/
├── index.html            <- TODAS as telas do app (HTML). Cada tela é uma
│                            <section class="screen" id="screen-...">
├── COMO-EDITAR.md        <- este guia
├── manifest.json         <- nome/ícone/cores do app instalado (PWA)
├── sw.js                 <- cache offline (ver regra 1 abaixo)
│
├── assets/icons/         <- ícone do app
│
├── css/                  <- estilos, na MESMA ordem em que carregam no index.html
│   ├── base.css          <- CORES, fontes, sombras (variáveis :root)
│   ├── layout.css        <- barra superior, navegação inferior, estrutura
│   ├── components.css    <- cards, botões, badges, busca/filtros, lista de OS
│   ├── shared.css        <- toast, resumo, estado vazio, chip
│   ├── print.css         <- layout da OS impressa/PDF
│   ├── overrides.css     <- responsivo (tablet/desktop), utilitários (.hidden, .mt-8)
│   └── pages/            <- um arquivo por tela (nova-os, os-view, login...)
│
└── js/
    ├── main.js           <- PONTO DE ENTRADA. Liga tudo e expõe as funções
    │                        usadas nos onclick="" do HTML (ver regra 2)
    ├── config/
    │   └── constants.js  <- constantes, incl. OS_STATUS (ciclo de vida da OS)
    ├── core/
    │   ├── app-state.js  <- estado das OS: localStorage + sincronização + métricas
    │   ├── profile-store.js <- perfil da empresa em memória
    │   ├── navigation.js <- troca de telas
    │   ├── sync-indicator.js <- nuvem de sincronização da barra superior
    │   └── upload-progress.js <- aviso "Enviando foto X de Y..."
    ├── services/         <- CONEXÕES EXTERNAS (backend)
    │   ├── supabase-client.js <- URL e chave do Supabase (edite ao trocar de projeto)
    │   ├── os-service.js      <- salvar/carregar OS no banco
    │   ├── fotos-service.js   <- fotos no Supabase Storage
    │   ├── profile-service.js <- perfil da empresa no banco
    │   ├── cep-service.js     <- busca de CEP (ViaCEP)
    │   └── gps-service.js     <- GPS + nome da cidade (Nominatim)
    ├── utils/            <- formatação (moeda/data/status), máscaras, toast, escHtml
    └── pages/            <- UMA PASTA/ARQUIVO POR TELA
        ├── login.js          <- login, logout e fluxo pós-login
        ├── dashboard.js      <- painel: métricas, busca, filtros por status
        ├── configuracoes.js  <- perfil da empresa + onboarding
        ├── nfse.js           <- emissão de NFS-e
        ├── lucratividade.js  <- ranking de faturamento + export CSV
        ├── nova-os/          <- wizard de criação de OS
        │   ├── wizard.js         <- fluxo dos 3 passos, validações, resumo
        │   ├── itens.js          <- tabela de itens/peças
        │   ├── pattern-lock.js   <- padrão de desbloqueio 3x3
        │   ├── fotos.js          <- câmera, carimbo de data/GPS na foto
        │   ├── cliente-lookup.js <- sugestão de cliente recorrente (pelo telefone)
        │   └── state.js          <- dados compartilhados do wizard
        └── os-view/
            ├── os-view.js    <- documento da OS, status, WhatsApp, imprimir
            ├── editar.js     <- modal de edição (diagnóstico, itens, previsão)
            └── assinatura.js <- assinaturas de entrada e de retirada
```

## Ciclo de vida da OS (status)

Definido em `js/config/constants.js` (`OS_STATUS`):

| Status (valor no banco) | Rótulo | Como chega nele |
|---|---|---|
| `aguardando` | Em análise | ao criar a OS |
| `aprovacao` | Aguardando aprovação | manual (seletor na tela da OS) |
| `pecas` | Aguardando peça | manual |
| `andamento` | Em reparo | assinatura de entrada, ou manual |
| `pronto` | Pronto p/ retirada | manual — libera os botões "avisar cliente" e "registrar retirada" |
| `concluida` | Entregue | assinatura de retirada, NFS-e ou "concluir sem NFS-e" |

Para adicionar um status: inclua a linha em `OS_STATUS`, crie a classe de cor
do badge em `css/components.css` e pronto — filtros, seletor e badges se
atualizam sozinhos. Nunca renomeie os valores existentes (estão gravados no banco).

## Receitas rápidas ("quero mudar X, edito onde?")

| Quero mudar... | Edite |
|---|---|
| Cores, fonte do app | `css/base.css` (bloco `:root`) |
| Texto/campos de uma tela | `index.html` (procure `id="screen-..."`) |
| Comportamento de uma tela | `js/pages/<tela>.js` |
| Projeto Supabase (URL/chave) | `js/services/supabase-client.js` + rode `../supabase/setup.sql` no SQL Editor |
| Mensagens de WhatsApp (registro e "pronto") | `js/pages/os-view/os-view.js` (funções `msgRegistroOS` e `msgAparelhoPronto`) |
| Campos da busca do painel | `js/pages/dashboard.js` (função `matchOS`) |
| Campos editáveis da OS | `js/pages/os-view/editar.js` + modal `edit-modal` no `index.html` |
| Texto legal das assinaturas | `js/pages/os-view/assinatura.js` (objeto `MODOS`) |
| Termos e condições padrão | `js/pages/os-view/os-view.js` (seção "Termos") — ou pelo próprio app em Configurações |
| Limite de fotos / qualidade JPEG | `js/pages/nova-os/fotos.js` (constantes `MAX_FOTOS`, `JPEG_QUALITY`) |
| Regra de "OS atrasada" | `js/core/app-state.js` (função `isOSAtrasada`) |
| Ícones/estados da nuvem de sincronização | `js/core/sync-indicator.js` |
| Zoom máximo do lightbox de fotos | `js/pages/nova-os/fotos.js` (constante `ZOOM_MAX`) |
| Layout da OS impressa/PDF | `css/print.css` |
| Colunas do relatório CSV | `js/pages/lucratividade.js` (função `exportCSV`) |
| Nome/ícone do app instalado | `manifest.json` + `assets/icons/icon.svg` |

## 3 regras de ouro

1. **Criou/renomeou um arquivo CSS ou JS?**
   Atualize a lista `APP_SHELL` no `sw.js` **e aumente a versão** do `CACHE_NAME` (`v7` -> `v8`). Sem isso, os celulares continuam usando a versão antiga em cache.

2. **Criou uma função nova e usou em `onclick=""` no HTML?**
   Adicione-a ao objeto `globals` no `js/main.js`. Os módulos ES são isolados — sem isso o botão dá erro "function is not defined".

3. **Não reordene os `<link>` de CSS no `index.html`.**
   A ordem de carregamento define qual regra vence.

## Padrão visual

Interface sem emojis: texto puro e ícones SVG inline (como os já usados nos
botões). Símbolos tipográficos discretos são aceitos (setas, "✕" de fechar).

## Como testar localmente

Abra um terminal na pasta `mvp/` e rode um servidor local (módulos ES não funcionam abrindo o arquivo direto com `file://`):

```bash
# se tiver Python instalado:
python -m http.server 8000
# ou com Node:
npx serve .
```

Depois acesse `http://localhost:8000`. Dica: no DevTools (F12) -> aba *Application* -> *Service Workers* -> marque **"Update on reload"** para não brigar com o cache durante o desenvolvimento.

## Deploy

O Netlify publica automaticamente a pasta `mvp/` (configurado em `../netlify.toml`) a cada push no repositório. Não há etapa de build.

## Banco de dados (Supabase)

- Schema, políticas de segurança (RLS) e bucket de fotos: `../supabase/setup.sql` — executar uma vez no SQL Editor do Supabase ao criar/trocar de projeto.
- A chave no `supabase-client.js` é a **publicável** (segura no front-end); a segurança real vem das políticas RLS por usuário.
- Campos novos da OS (diagnóstico, assinatura de retirada, data de entrega) são gravados dentro do JSON `dados` — não exigem migração de schema.
