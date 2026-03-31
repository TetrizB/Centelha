# Oseias Overflow — Documentação Técnica
**Ideia:** OficinaPRO | **Criat** | 2026-03-30

---

## Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Interface | HTML5 semântico | Portabilidade máxima, zero build step, funciona offline |
| Estilo | CSS3 puro (custom properties, grid, flexbox) | Mobile-first sem overhead de framework; design system via variáveis |
| Lógica | Vanilla JS ES6+ (classes, async/await, modules inline) | Zero dependências = zero pontos de falha; qualquer dev mantém |
| Câmera | `input[type=file capture="environment"]` + Canvas API | API nativa do browser; funciona em qualquer Android/iOS sem permissão extra |
| Persistência | localStorage JSON | Offline-first; não requer backend para o demo |
| Fonte | Google Fonts CDN (Inter) | Única dependência externa; fallback system-ui definido |
| PDF / Impressão | `window.print()` com CSS @media print | Funcional no demo sem servidor; gera PDF real pelo browser |
| WhatsApp | `https://wa.me/` deep link | Integração zero-config; funcional no smartphone |
| NFS-e | Mock JSON local + feedback visual | Simula resposta da API da Receita Federal sem backend |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    OficinaPRO (SPA)                         │
│                    index.html + app.js                      │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴─────────────┐
    │     Router (hash-based)   │
    │  #dashboard / #nova-os /  │
    │  #os/:id / #nfse / #lucro │
    └────────────┬─────────────┘
                 │
    ┌────────────┴──────────────────────────────┐
    │              State Manager                 │
    │  (classe AppState — singleton)             │
    │  ┌──────────┐  ┌────────┐  ┌───────────┐  │
    │  │  OSStore │  │ Config │  │  NFSeLog  │  │
    │  │(localStorage)│       │  │           │  │
    │  └──────────┘  └────────┘  └───────────┘  │
    └────────────┬──────────────────────────────┘
                 │
    ┌────────────┴──────────────────────────────┐
    │              Módulos de Tela               │
    │  ┌──────────────┐  ┌────────────────────┐  │
    │  │  Dashboard   │  │  Wizard Nova OS    │  │
    │  │  (métricas)  │  │  Passo 1: Dados    │  │
    │  └──────────────┘  │  Passo 2: Fotos    │  │
    │  ┌──────────────┐  │  Passo 3: Confirma │  │
    │  │  Visualiza   │  └────────────────────┘  │
    │  │  OS gerada   │  ┌────────────────────┐  │
    │  └──────────────┘  │  Emissão NFS-e     │  │
    │  ┌──────────────┐  │  (mock API)        │  │
    │  │  Lucratividade│  └────────────────────┘  │
    │  │  (ranking)   │                           │
    │  └──────────────┘                           │
    └───────────────────────────────────────────┘
                 │
    ┌────────────┴──────────────────────────────┐
    │           Serviços Externos               │
    │  ┌────────────┐  ┌──────────────────────┐ │
    │  │ Canvas API │  │  WhatsApp deep link   │ │
    │  │ (timestamp │  │  wa.me/?text=...      │ │
    │  │  nas fotos)│  └──────────────────────┘ │
    │  └────────────┘  ┌──────────────────────┐ │
    │                  │  window.print()       │ │
    │                  │  (PDF da OS)          │ │
    │                  └──────────────────────┘ │
    └───────────────────────────────────────────┘
```

---

## Especificação do MVP

### ✅ REAL no Demo

- Abertura da câmera traseira do smartphone via `capture="environment"`
- Overlay de data/hora/GPS nas fotos usando Canvas API (texto branco com fundo semitransparente)
- Preview das fotos capturadas com possibilidade de remover
- Wizard de 3 passos com validação de campos obrigatórios
- Geração de número de OS automático (ex.: OS-2026-0001)
- Persistência de todas as OSs no localStorage (create, read, update)
- Lista de OSs recentes no dashboard com status colorido
- Mini-dashboard com contadores reais (calcula do localStorage)
- Envio de mensagem via WhatsApp (deep link funcional no smartphone)
- Impressão/PDF da OS via window.print() com CSS de impressão dedicado
- Tabela de lucratividade com gráfico de barras em CSS puro
- Navegação single-page sem reload (hash router)
- Design mobile-first 100% responsivo

### 🟡 Simulado para Demo

- Overlay de GPS nas fotos (exibe coordenadas fixas "São Paulo, SP" — GPS real requer HTTPS + permissão do usuário)
- Emissão da NFS-e (chama mock local que retorna número aleatório após delay de 2s, simulando resposta da API ABRASF)
- Assinatura digital do cliente (exibe QR Code mockado + status "Assinado" após 3s)
- Status "Enviado para cliente" após WhatsApp (não há webhook de confirmação)
- Dados da oficina prestadora (fixos no código, editáveis em campo)

### 🔵 Roadmap (Pós-Hackathon)

- Backend Node.js + PostgreSQL para persistência multi-dispositivo
- Integração real com API NFS-e Nacional (ABRASF 2.04 / Receita Federal)
- Assinatura digital com certificado ICP-Brasil via Web Crypto API
- GPS real com Geolocation API (requer HTTPS + permissão)
- OCR automático para placa/modelo via Google Vision API
- Notificações push quando cliente assina OS
- Relatórios financeiros mensais com export CSV/XLSX
- Multi-tenant: rede de franquias de assistência técnica
- Integração ERP (Omie, Bling)

---

## Timeline de Desenvolvimento (48h)

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

*Gerado por Oseias Overflow — Criat Hackathon 2026-03-30*
