# Oseias Overflow — Documentação Técnica
**Ideia:** OficinaPRO | **Criat** | 2026-03-30 | *Atualizado: 2026-04-06*

---

## Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Interface | HTML5 semântico | Portabilidade máxima, zero build step, funciona offline |
| Estilo | CSS3 puro (custom properties, grid, flexbox) | Mobile-first sem overhead de framework; design system via variáveis |
| Lógica | Vanilla JS ES6+ (classes, async/await, modules inline) | Zero dependências = zero pontos de falha; qualquer dev mantém |
| Câmera | `input[type=file capture="environment"]` + Canvas API | API nativa do browser; funciona em qualquer Android/iOS sem permissão extra |
| Persistência local | localStorage JSON | Offline-first; dados sobrevivem sem rede; fotos ficam apenas locais |
| **Persistência na nuvem** | **Supabase (PostgreSQL + RLS)** | **Multi-dispositivo real; dados por usuário isolados por Row Level Security** |
| **Autenticação** | **Supabase Auth (email/senha)** | **Sessão persistente com refresh automático; rate limiting anti-brute-force no front** |
| **Sync offline** | **Fila de pendentes (PENDING_KEY no localStorage)** | **OS criadas sem rede são reenviadas automaticamente ao reconectar** |
| **PWA** | **Service Worker (Network-First) + manifest.json** | **Instalável no celular via Add to Home Screen; funciona offline como fallback** |
| **Deploy** | **Netlify (publish = "mvp")** | **CD automático; HTTPS nativo; suporte a PWA e Supabase CORS** |
| Fonte | Google Fonts CDN (Inter) | Única dependência visual externa; fallback system-ui definido |
| PDF / Impressão | `window.print()` com CSS @media print | Funcional sem servidor; gera PDF real pelo browser |
| WhatsApp | `https://wa.me/` deep link | Integração zero-config; funcional no smartphone |
| NFS-e | Mock JSON local + feedback visual | Simula resposta da API da Receita Federal sem backend |
| **GPS** | **Nominatim (OpenStreetMap) — real** | **Geolocation API + reverse geocoding gratuito; antes era coordenada fixa** |
| **CEP** | **ViaCEP API** | **Preenchimento automático de endereço da oficina no perfil** |
| Segurança | Content Security Policy (CSP) no HTML | Whitelist explícita de origens permitidas; bloqueia XSS e injeção de scripts |

---

## Arquitetura (Estado Atual)

```
┌─────────────────────────────────────────────────────────────────┐
│                 OficinaPRO (PWA — SPA)                          │
│         index.html + app.js + supabase.js + sw.js               │
│                    Netlify (HTTPS)                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
      ┌────────────┴──────────────────────┐
      │         Tela de Login             │
      │   Supabase Auth (email/senha)     │
      │   Rate limiting: 5 tentativas /   │
      │   30s de bloqueio                 │
      └────────────┬──────────────────────┘
                   │ sessão válida
      ┌────────────┴──────────────────────┐
      │     Router (hash-based)           │
      │  #dashboard / #nova-os /          │
      │  #os/:id / #nfse / #lucro /       │
      │  #configuracoes (onboarding)      │
      └────────────┬──────────────────────┘
                   │
      ┌────────────┴────────────────────────────────┐
      │              State Manager (AppState)        │
      │  ┌─────────────────┐  ┌──────────────────┐  │
      │  │  localStorage   │  │  Supabase         │  │
      │  │  (offline-first)│◄►│  (PostgreSQL RLS) │  │
      │  │  fotos (base64) │  │  dados sem fotos  │  │
      │  └─────────────────┘  └──────────────────┘  │
      │  ┌──────────────────────────────────────┐    │
      │  │  Fila de pendentes (PENDING_KEY)      │    │
      │  │  Auto-sync ao reconectar              │    │
      │  └──────────────────────────────────────┘    │
      └────────────┬────────────────────────────────┘
                   │
      ┌────────────┴────────────────────────────────┐
      │              Módulos de Tela                │
      │  ┌────────────┐  ┌──────────────────────┐   │
      │  │  Dashboard │  │  Wizard Nova OS       │   │
      │  │  (métricas)│  │  Passo 1: Dados       │   │
      │  └────────────┘  │  Passo 2: Fotos+GPS   │   │
      │  ┌────────────┐  │  Passo 3: Confirma    │   │
      │  │ Visualiza  │  └──────────────────────┘   │
      │  │ OS gerada  │  ┌──────────────────────┐   │
      │  └────────────┘  │  Emissão NFS-e        │   │
      │  ┌────────────┐  │  (mock ABRASF)        │   │
      │  │ Lucrativi- │  └──────────────────────┘   │
      │  │ dade       │  ┌──────────────────────┐   │
      │  └────────────┘  │  Configurações /      │   │
      │                  │  Onboarding           │   │
      │                  └──────────────────────┘   │
      └────────────┬────────────────────────────────┘
                   │
      ┌────────────┴────────────────────────────────┐
      │           Serviços Externos                 │
      │  ┌────────────┐  ┌──────────────────────┐   │
      │  │ Canvas API │  │  WhatsApp deep link   │   │
      │  │ (timestamp │  │  wa.me/?text=...      │   │
      │  │  + GPS nas │  └──────────────────────┘   │
      │  │   fotos)   │  ┌──────────────────────┐   │
      │  └────────────┘  │  window.print() / PDF │   │
      │  ┌────────────┐  └──────────────────────┘   │
      │  │ Nominatim  │  ┌──────────────────────┐   │
      │  │ (GPS real) │  │  ViaCEP (CEP → end.) │   │
      │  └────────────┘  └──────────────────────┘   │
      └─────────────────────────────────────────────┘
```

---

## Banco de Dados (Supabase / PostgreSQL)

### Tabela `ordens_servico`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | Gerado pelo Supabase |
| `os_id` | TEXT UNIQUE | Identificador da app (ex.: `OS-2026-0001`) |
| `user_id` | UUID → auth.users | Dono da OS; base do RLS |
| `numero` | INTEGER | Número sequencial da OS |
| `status` | TEXT | `aguardando` / `em_andamento` / `concluida` |
| `data_criacao` | TIMESTAMPTZ | Horário UTC de abertura |
| `dados` | JSONB | Payload completo da OS **sem fotos** |

### Tabela `company_profiles`

Armazena o perfil da oficina por usuário (nome, CNPJ/CPF, endereço, telefone). Usado no onboarding e no preenchimento da NFS-e.

### Row Level Security

```sql
-- Cada usuário vê e altera apenas suas próprias linhas
CREATE POLICY "acesso por usuario" ON ordens_servico
  FOR ALL TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Especificação do MVP

### ✅ REAL no Demo

- Autenticação real com email/senha via Supabase Auth
- Sessão persistente com refresh automático de token
- Câmera traseira do smartphone via `capture="environment"`
- Overlay de data/hora/GPS **real** nas fotos usando Canvas API (Nominatim)
- Preview das fotos capturadas com possibilidade de remover
- Wizard de 3 passos com validação de campos obrigatórios
- Geração de número de OS automático (ex.: OS-2026-0001)
- **Persistência em nuvem no Supabase com RLS por usuário**
- **Sync bidirecional: localStorage ↔ Supabase (merge preservando fotos locais)**
- **Fila de pendentes com reenvio automático quando a rede volta**
- Lista de OSs no dashboard com status colorido (dados reais da nuvem)
- Mini-dashboard com contadores reais
- Envio de mensagem via WhatsApp (deep link funcional no smartphone)
- Impressão/PDF da OS via window.print() com CSS de impressão dedicado
- Tabela de lucratividade com gráfico de barras em CSS puro
- Navegação single-page sem reload (hash router)
- Design mobile-first 100% responsivo
- **PWA instalável: Service Worker + manifest + ícones (Add to Home Screen)**
- **Onboarding na primeira vez: solicita perfil da oficina antes de usar o app**
- **Rate limiting de login: 5 tentativas → bloqueio de 30s**
- **Padrão de desbloqueio 3×3 (assinatura visual do técnico na OS)**
- Preenchimento automático de endereço via **ViaCEP**

### 🟡 Simulado para Demo

- Emissão da NFS-e (mock local que retorna número aleatório após delay de 2s, simulando API ABRASF)
- Assinatura digital do cliente (QR Code mockado + status "Assinado" após 3s)
- Status "Enviado para cliente" após WhatsApp (sem webhook de confirmação)

### 🔵 Roadmap (Pós-Hackathon)

- Integração real com API NFS-e Nacional (ABRASF 2.04 / Receita Federal)
- Assinatura digital com certificado ICP-Brasil via Web Crypto API
- Notificações push quando cliente assina OS (Web Push API)
- OCR automático para placa/modelo via Google Vision API
- Relatórios financeiros mensais com export CSV/XLSX
- Integração ERP (Omie, Bling)
- Multi-tenant: rede de franquias de assistência técnica

---

## O Que Mudou Desde o Hackathon (2026-03-30 → 2026-04-06)

| Item | Status anterior | Status atual |
|---|---|---|
| Persistência | Só localStorage | localStorage + Supabase (PostgreSQL) |
| Autenticação | Nenhuma | Supabase Auth com email/senha |
| Multi-dispositivo | Não | Sim (sync pela nuvem) |
| GPS nas fotos | Coordenada fixa (São Paulo, SP) | Nominatim real (requer HTTPS + permissão) |
| PWA / instalável | Não | Sim (sw.js + manifest.json) |
| Deploy | Local | Netlify (HTTPS) |
| Perfil da oficina | Fixo no código | Supabase `company_profiles` + onboarding |
| Segurança | Nenhuma | CSP no HTML + RLS no banco + rate limiting |

---

## Timeline de Desenvolvimento (48h — Hackathon)

| Hora | Entregável |
|---|---|
| H0–H2 | Setup: index.html base, style.css design system, variáveis CSS |
| H2–H6 | Dashboard + lista de OSs mockadas + mini-métricas |
| H6–H12 | Wizard Nova OS: Passo 1 (formulário validado) + Passo 2 (câmera + Canvas) |
| H12–H16 | Wizard Passo 3 (confirmação) + geração de OS + localStorage |
| H16–H20 | Tela de visualização de OS + link WhatsApp + window.print() |
| H20–H26 | Fluxo NFS-e (formulário pré-preenchido + mock emissão) |
| H26–H32 | Tabela de lucratividade + gráfico CSS puro |
| H32–H38 | Refinamento visual: animações, ícones SVG, polish mobile |
| H38–H44 | Testes no smartphone real (Android + iOS) |
| H44–H48 | Buffer: ajustes de demo, preparação do script de pitch |

---

## Para o Pitch (Marcos usar diretamente)

> "No Brasil, uma oficina técnica foi condenada a pagar R$ 50 mil pelo TJMG por não ter fotografado o aparelho na entrada. Hoje, isso se repete todos os dias. Ao mesmo tempo, desde janeiro de 2026 a NFS-e Nacional é obrigatória para todo prestador de serviço — e a maioria das oficinas ainda emite nota num sistema separado, às vezes horas depois do serviço feito. A OficinaPRO resolve os dois problemas num único fluxo de 3 toques: o técnico fotografa o aparelho com carimbo de data, hora e localização; o sistema gera a ordem de serviço e envia para o cliente assinar pelo celular; e ao concluir, emite a NFS-e Nacional automaticamente com os dados já preenchidos. Tudo isso offline-ready, sem precisar instalar nada — só abre o link no navegador do smartphone. Estamos transformando proteção jurídica e obrigação fiscal em vantagem competitiva para os 800 mil reparadores autônomos que o Brasil tem."

---

*Gerado por Oseias Overflow — Criat Hackathon 2026-03-30 | Atualizado 2026-04-06*
