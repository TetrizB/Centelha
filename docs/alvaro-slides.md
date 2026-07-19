# Álvaro Arte — Guia Visual e Slide Deck
**Solução:** OficinaPRO | **Criat 2026** | **Total:** 7 slides | **Duração:** 5 minutos

---

## Identidade Visual

### Paleta de Cores
| Papel | Nome | Hex | Uso |
|---|---|---|---|
| Primária | Azul Autoridade | `#1a365d` | Fundos de impacto (slides 1, 6, 7), headers |
| Acento | Laranja Urgência | `#ed8936` | CTAs, números-chave, destaques |
| Fundo | Off-White | `#f7fafc` | Slides informativos (2, 3, 4, 5) |
| Texto | Cinza Profundo | `#2d3748` | Corpo de texto, subtítulos |
| Alerta | Vermelho Risco | `#e53e3e` | Card "Dor Jurídica", valores de risco |
| Sucesso | Verde ODS | `#38a169` | Badge ODS 8 |
| Informação | Azul ODS | `#3182ce` | Badge ODS 16 |

### Tipografia
- **Família:** Inter (Google Fonts)
- **Pesos usados:** 400 (Regular), 600 (SemiBold), 700 (Bold), 900 (Black)
- **Escala:**
  - Hero number (dados principais): 72–96px, peso 900
  - Headline slide: 48–56px, peso 700
  - Subtítulo / corpo: 20–24px, peso 400–600
  - Labels / badges: 14–16px, peso 600, uppercase

### Estilo Visual
- **Minimalismo de dados:** Cada slide tem no máximo 1 número-herói e 1 mensagem-âncora
- **Hierarquia cromática:** Azul escuro = autoridade/credibilidade, Laranja = ação/urgência, Vermelho = risco/dor
- **Ícones:** SVG inline, monocromáticos, estilo outline clean
- **Espaçamento:** Margens generosas (10% do container), sem poluição visual
- **Ratio:** 16:9 fixo (1920×1080 referência), responsivo via aspect-ratio CSS
- **Transição:** fadeIn 0.4s ease — profissional, sem distração

---

## Slides

---

### Slide 1 — PERSONAGEM
**Headline:** "Seu Marcos. 52 anos. 8 anos de oficina."
**Chamada visual:** Fundo azul escuro `#1a365d` — autoridade máxima de abertura. Layout dois painéis: texto à esquerda, ícone SVG de técnico/ferramentas à direita.
**Nome em destaque:** "SEU MARCOS" em laranja `#ed8936`, 64px bold
**Dado-herói:** "R$ 50.000" em vermelho `#e53e3e`, 80px Black — choque emocional imediato
**Fonte de credibilidade:** "TJMG, 2024 · falta de prova fotográfica" em branco 50% opacity, 16px
**Objetivo narrativo:** Criar empatia instantânea com o personagem. O dado financeiro ancora o problema antes de nomeá-lo.
**Notas de apresentação:** Pausa de 5s após entrar no slide. Deixar o número "falar" antes de continuar.

---

### Slide 2 — PROBLEMA
**Headline:** "Dois problemas. Dois riscos reais. Com data e valor."
**Chamada visual:** Fundo off-white `#f7fafc`. Dois cards grandes lado a lado, cada um com sombra e borda colorida no topo.
**Card Esquerdo — Dor Jurídica:**
- Barra topo: `#e53e3e` (vermelho)
- Ícone: martelo de juiz SVG
- Label: "DOR JURÍDICA" uppercase vermelho
- Número-herói: "R$ 50.000" em 72px vermelho bold
- Subtext: "CDC art. 14 · responsabilidade objetiva"
- "121k oficinas sem prova fotográfica"

**Card Direito — Dor Fiscal:**
- Barra topo: `#ed8936` (laranja)
- Ícone: nota fiscal SVG
- Label: "DOR FISCAL" uppercase laranja
- Número-herói: "jan/2026" em 72px laranja bold
- Subtext: "NFS-e obrigatória por lei"
- "Multas + irregularidade fiscal"

**Objetivo narrativo:** Tornar tangíveis os dois vetores de dor. Data + valor = urgência real.
**Notas:** Apontar cada card ao nomear. "Este aqui já aconteceu. Este aqui vai acontecer."

---

### Slide 3 — SOLUÇÃO
**Headline:** "OS + Foto + NFS-e em 3 Cliques."
**Chamada visual:** Fundo off-white. Headline laranja grande centralizado no topo. Três cards numerados em linha horizontal com setas conectoras entre eles.
**Card 1 — Foto:**
- Número "1" em laranja 48px
- Ícone câmera SVG
- Título: "Foto com Carimbo"
- Detalhe: "Data · Hora · GPS"

**Card 2 — OS:**
- Número "2" em laranja 48px
- Ícone documento SVG
- Título: "OS + Assinatura"
- Detalhe: "Digital · WhatsApp"

**Card 3 — NFS-e:**
- Número "3" em laranja 48px
- Ícone nota fiscal SVG
- Título: "NFS-e Automática"
- Detalhe: "Dados da OS · Sem retrabalho"

**Setas:** SVG inline entre os cards, cor `#ed8936`
**Rodapé:** "Zero troca de app. Zero retrabalho. Zero risco." em `#2d3748`, 20px

**Objetivo narrativo:** Solução elegante e direta. O fluxo linear reforça a simplicidade prometida no headline.

---

### Slide 4 — BUSINESS
**Headline implícito:** O funil fala por si.
**Chamada visual:** Fundo off-white. Três caixas em cascata vertical (funil), cada uma maior em destaque visual que a anterior.
**Funil:**
- Caixa 1: "121.000 oficinas no Brasil" — `#2d3748`, 32px, background cinza claro
- Caixa 2: "1% = 1.210 assinantes" — `#2d3748`, 36px, background levemente mais escuro
- Caixa 3: "× R$ 89/mês = **R$ 107.690 MRR**" — laranja `#ed8936`, 48px Black, background `#1a365d` branco

**Separador:** Linha horizontal `#e2e8f0` com padding

**ROI em destaque:**
- Label: "ROI DO CLIENTE" uppercase, cinza, 14px
- Valor: "R$ 50.000 ÷ R$ 89 = 561 meses" em 40px bold azul escuro
- Subtítulo: "Um processo evitado cobre 46 anos de assinatura." em laranja

**Objetivo narrativo:** Mostrar que o TAM é concreto e o ROI do cliente é absurdamente óbvio.
**Notas:** "Não estamos pedindo para ele acreditar em nós. Estamos pedindo para ele fazer a conta."

---

### Slide 5 — IMPACTO
**Headline:** "760 mil empregos. Dois ODS. Um produto."
**Chamada visual:** Fundo off-white. Layout em três zonas verticais: headline, badges ODS, stat destaque.
**Badges ODS (retângulos coloridos lado a lado):**
- Badge 1: `#38a169` (verde) — "ODS 8" em branco bold + "Trabalho Decente e Crescimento Econômico"
- Badge 2: `#3182ce` (azul) — "ODS 16" em branco bold + "Paz, Justiça e Instituições Eficazes"

**Stat destaque:**
- Número: "99,1%" em 96px Black azul escuro
- Label: "dos empreendedores já usam smartphone" em 24px cinza
- Fonte: "Sebrae 2025" em 14px cinza claro

**Frase fechamento:** "A barreira não é tecnologia. É a ferramenta certa." em 24px, itálico, `#2d3748`

**Objetivo narrativo:** Legitimidade sistêmica (ODS) + evidência de adoção (Sebrae). Remove objeção de "o público não vai usar."

---

### Slide 6 — PROTÓTIPO
**Headline:** "Já está funcionando."
**Chamada visual:** Fundo azul escuro `#1a365d` — arco visual que retorna ao impacto do Slide 1. Texto branco.
**Subtítulo:** "Não é mockup. Não é Figma. É código." em laranja `#ed8936`, 28px

**4 steps em linha horizontal (ícones brancos + texto branco):**
- Dashboard → Câmera → OS Gerada → NFS-e Emitida
- Setas laranjas entre eles

**Badge técnico:** Retângulo `#ed8936` com texto "HTML + CSS + JS · 1.860 linhas · 48h" em branco bold

**QR Code:** Placeholder visual simulado em CSS (quadrado 140px com padrão de pixels preto/branco)

**Objetivo narrativo:** Prova de execução. A equipe entregou produto real, não conceito.
**Notas:** Se possível, abrir o MVP ao vivo neste momento.

---

### Slide 7 — CTA
**Headline:** "OficinaPRO"
**Chamada visual:** Fundo azul escuro `#1a365d`. Layout centralizado e limpo. Máximo impacto de fechamento.
**Logo:** "OficinaPRO" em branco, 72px Black, centralizado
**Tagline:** "OS + Foto + NFS-e em 3 Cliques" em laranja `#ed8936`, 32px
**Preço:** "R$ 89/mês · Free trial 30 dias" em branco, 24px, com separadores visuais
**QR Code:** Placeholder grande (200px), centralizado, com label "Acesse o MVP"
**Rodapé:** "Criat · 2026" em branco 40% opacity, 16px

**Objetivo narrativo:** Fechar com clareza total. Nome, ação, preço, acesso. Nada mais.
**Notas:** "Temos 30 segundos. Nome do produto. Preço. Acesso. Obrigado."

---

## Princípios Aplicados

1. **Arco de cor:** Azul escuro (slides 1, 6, 7) — Off-white (slides 2, 3, 4, 5) — cria ritmo visual e sinaliza mudança de fase narrativa
2. **Dados como heróis:** Nenhum número relevante tem menos de 48px
3. **Zero texto de corpo:** Cada slide tem no máximo 1 headline + 1 dado + 1 subtítulo
4. **Consistência de ícones:** Todos SVG inline, stroke only, 2px, sem fill — estilo único
5. **Hierarquia de leitura:** Número → Label → Contexto (ordem do olho, não do lógico)
