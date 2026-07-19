# OficinaPRO — Guia de Piloto com a Primeira Oficina
**Versão:** 1.0 · **Data:** 2026-03-30 · **Criat**

> Este documento detalha o passo a passo para transformar o MVP do hackathon em uma aplicação 100% funcional e iniciar os testes com a primeira oficina técnica real.

---

## Situação Atual do MVP

O código entregue (`mvp/index.html` + `style.css` + `app.js`) já funciona como aplicação real com as seguintes capacidades **reais**:

| Funcionalidade | Status | Observação |
|---|---|---|
| Dashboard com métricas | ✅ Real | Calcula do localStorage |
| Criação de OS com wizard | ✅ Real | Campos validados |
| Câmera do smartphone | ✅ Real | Abre câmera traseira nativa |
| Carimbo de data/hora na foto | ✅ Real | Canvas API — gravado na imagem |
| Persistência de OSs | ✅ Real | localStorage (por dispositivo) |
| Impressão/PDF da OS | ✅ Real | window.print() |
| Link WhatsApp para cliente | ✅ Real | Deep link funcional |
| Tabela de lucratividade | ✅ Real | 10 serviços com margem/hora |
| GPS na foto | 🟡 Simulado | Exibe "São Paulo, SP" fixo |
| Assinatura digital do cliente | 🟡 Simulado | Status muda após 3s |
| Emissão NFS-e | 🟡 Simulado | Retorna número aleatório mockado |
| Sincronização entre dispositivos | ❌ Não existe | localStorage é por browser |

**Uma limitação crítica:** a câmera do browser só funciona em conexão **HTTPS**. Abrir o arquivo local (`file://`) no celular não ativa a câmera. É preciso hospedar a aplicação.

---

## Fase 0 — Testar Localmente (5 minutos)

Antes de qualquer deploy, valide que o código funciona no seu computador.

### Pré-requisitos
- Google Chrome ou Microsoft Edge instalado
- Os 3 arquivos: `index.html`, `style.css`, `app.js` na mesma pasta

### Passos
```
1. Abra a pasta mvp/ no Explorador de Arquivos
2. Clique duplo em index.html
3. O Chrome abrirá a aplicação
4. Teste: criar uma OS, preencher campos, avancar os passos
5. ATENÇÃO: a câmera NÃO vai funcionar aqui (é local/HTTP) — isso é normal
```

### O que validar localmente
- [ ] Dashboard carrega com as 3 OSs mockadas de exemplo
- [ ] Botão "Nova OS" abre o wizard corretamente
- [ ] Os 3 passos do wizard navegam sem erro
- [ ] Formulário valida campos obrigatórios (botão Avançar desabilitado se vazio)
- [ ] OS é criada e aparece na lista do dashboard
- [ ] Visualização de OS mostra dados + status

---

## Fase 1 — Deploy com HTTPS (30–60 minutos) ← PASSO CRÍTICO

Para a câmera funcionar no smartphone, a aplicação precisa de HTTPS. A solução mais simples e gratuita é o **Netlify Drop**.

### Opção A — Netlify Drop (recomendado, zero configuração, grátis)

**Tempo estimado: 10 minutos**

```
1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta inteira mvp/ para a área de drop do site
3. O Netlify vai gerar automaticamente uma URL como:
   https://oficina-pro-abc123.netlify.app
4. Esta URL já tem HTTPS — câmera e GPS vão funcionar
5. Salve a URL — é ela que você vai abrir no celular da oficina
```

> **Atenção:** O plano gratuito do Netlify tem 100 GB de banda/mês e funciona para piloto. Mais que suficiente.

### Opção B — GitHub Pages (grátis, mais permanente)

**Tempo estimado: 20 minutos**

```
1. Crie uma conta em github.com (se não tiver)
2. Crie um novo repositório: "oficina-pro"
3. Faça upload dos 3 arquivos (index.html, style.css, app.js)
4. Vá em Settings → Pages → Source: selecione "main" branch
5. A URL será: https://SEU_USUARIO.github.io/oficina-pro
6. Aguarde 2–3 minutos para o GitHub ativar
```

### Opção C — Vercel (grátis, mais rápido para updates)

```
1. Acesse: https://vercel.com
2. Importe o repositório GitHub (da Opção B)
3. URL gerada: https://oficina-pro.vercel.app
4. Cada push no GitHub atualiza automaticamente
```

### Validação do deploy

Após o deploy, abra a URL no smartphone e verifique:
- [ ] URL começa com `https://` (cadeado verde no browser)
- [ ] Dashboard carrega corretamente no celular
- [ ] Botão "Fotografar" abre a câmera traseira
- [ ] Foto é tirada e aparece no preview com carimbo de data/hora
- [ ] WhatsApp link abre o app com mensagem pré-preenchida

---

## Fase 2 — Personalizar para a Oficina Piloto (15 minutos)

Antes de levar para a oficina, substitua os dados fictícios pelos dados reais dela.

### Editar dados da oficina no app.js

Abra `mvp/app.js` e localize o bloco na linha 37:

```javascript
// ANTES (dados fictícios)
const OFICINA = {
  razao:   'TechFix Assistência Técnica LTDA',
  cnpj:    '12.345.678/0001-99',
  im:      '1234567',
  endereco:'Rua das Ferramentas, 123 — São Paulo/SP',
  telefone:'(11) 99999-0000',
};

// DEPOIS (substituir pelos dados reais da oficina piloto)
const OFICINA = {
  razao:   'NOME REAL DA OFICINA',
  cnpj:    'CNPJ REAL (ou CPF se MEI)',
  im:      'INSCRIÇÃO MUNICIPAL REAL',
  endereco:'ENDEREÇO REAL',
  telefone:'TELEFONE REAL',
};
```

> **Importante:** A Inscrição Municipal (IM) é necessária para a emissão da NFS-e. O dono da oficina encontra esse número no alvará de funcionamento ou no cadastro da prefeitura.

### Após editar

1. Salve o arquivo `app.js`
2. Faça novo upload no Netlify (arraste novamente) ou faça push no GitHub
3. Atualize a página no celular

---

## Fase 3 — GPS Real na Foto (10 minutos, opcional)

O GPS está simulado como "São Paulo, SP" no código. Para usar a localização real do dispositivo, substitua a função no `app.js`:

### Encontre a linha com o GPS simulado (linha ~398):

```javascript
// ANTES
const locStr = 'São Paulo, SP'; // GPS simulado

// DEPOIS — substitua por:
const locStr = await getGPS();
```

### Adicione a função getGPS() antes da função stampTimestamp():

```javascript
async function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('Localização indisponível');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => resolve('GPS não autorizado'),
      { timeout: 5000 }
    );
  });
}
```

> **Obs:** O smartphone vai pedir permissão de localização ao tirar a primeira foto. O usuário precisa aceitar. Se recusar, o carimbo exibirá "GPS não autorizado" — ainda válido como registro temporal.

### Para exibir cidade em vez de coordenadas (avançado)

Utilize a API gratuita do OpenStreetMap Nominatim para converter coordenadas em endereço:

```javascript
async function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve('Localização indisponível'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const d = await r.json();
        const cidade = d.address?.city || d.address?.town || d.address?.village || 'Cidade desconhecida';
        const estado = d.address?.state_code || d.address?.state || '';
        resolve(`${cidade}, ${estado}`);
      } catch {
        resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      }
    }, () => resolve('GPS não autorizado'), { timeout: 8000 });
  });
}
```

---

## Fase 4 — NFS-e Real (1–3 dias de configuração)

Esta é a parte mais complexa. Existem dois caminhos:

### Caminho A — Usar a API da Prefeitura Municipal (gratuito)

A NFS-e Nacional (padrão ABRASF) tem integração direta com a prefeitura. O processo:

```
1. Solicitar credenciais de acesso à Nota Fiscal Eletrônica na prefeitura da cidade da oficina
   - Documentos geralmente exigidos: CNPJ/CPF, Inscrição Municipal, e-mail
   - Prazo: 1 a 5 dias úteis dependendo da prefeitura

2. A prefeitura fornece:
   - URL do webservice (ex.: https://nfse.prefeitura.sp.gov.br/...)
   - Token ou usuário/senha de homologação (ambiente de testes)
   - Documentação do padrão ABRASF 2.04

3. Configurar o endpoint no app.js:
   - Substituir a função mockNFSe() pela chamada real ao webservice
   - ATENÇÃO: webservices ABRASF são SOAP/XML — necessário um backend
     (o JavaScript puro não consegue fazer chamadas SOAP diretamente por CORS)
```

> **Solução recomendada para piloto:** Use um serviço intermediário.

### Caminho B — Usar um Emissor de NFS-e (recomendado para piloto rápido)

Serviços como **eNotas**, **Nuvem Fiscal**, **Focus NFe** e **Omie** oferecem APIs REST modernas que abstraem o SOAP da prefeitura. Mais simples de integrar.

**Exemplo com Nuvem Fiscal (plano gratuito até 50 NFs/mês):**

```
1. Crie conta em nuvemfiscal.com.br
2. Acesse: API → Credenciais → gere um Client ID e Client Secret
3. Cadastre a empresa da oficina no painel
4. Use a API REST para emitir NFS-e:

   POST https://api.nuvemfiscal.com.br/nfse
   Authorization: Bearer {seu_token}
   Content-Type: application/json
   {
     "ambiente": "homologacao",
     "competencia": "2026-03",
     "prestador": { "cnpj": "...", "inscricao_municipal": "..." },
     "tomador": { "cpf_cnpj": "...", "razao_social": "..." },
     "servico": {
       "codigo_municipio": "3550308",
       "item_lista_servico": "14.02",
       "discriminacao": "Assistência técnica conforme OS-2026-0001",
       "valor_servico": 280.00
     }
   }

5. No app.js, substitua a função mockNFSe() por uma chamada fetch() para este endpoint
```

> **Atenção de segurança:** A chave de API nunca deve ficar no JavaScript do lado cliente (qualquer um pode ver). Para o piloto, você pode usar um script de proxy simples no Netlify Functions ou simplesmente emitir a NFS-e manualmente no painel da Nuvem Fiscal após a OS ser criada — e registrar o número no campo da OS.

### Solução pragmática para o piloto (sem backend)

Para o primeiro piloto, uma abordagem funcional e segura:

```
1. Mantenha a emissão de NFS-e simulada no app (gera número fictício)
2. Ao final do dia, o dono da oficina emite as NFs reais no portal da prefeitura
   ou no sistema que ele já usa
3. Registre o número real da NFS-e editando a OS no app
4. Esta abordagem valida TODOS os outros fluxos (foto, OS, WhatsApp) sem risco fiscal
5. A integração de NFS-e real vem na Versão 2.0, após validar os demais fluxos
```

---

## Fase 5 — Checklist do Dia de Teste na Oficina

Antes de ir para a oficina com o técnico:

### Preparação (na véspera)
- [ ] App hospedado com HTTPS (Netlify ou GitHub Pages)
- [ ] Dados da oficina atualizados no app.js (nome, CNPJ, endereço)
- [ ] Testado no mesmo modelo de smartphone que o técnico usa
- [ ] URL salva como atalho na tela inicial do celular (Add to Home Screen)
- [ ] WhatsApp instalado no celular que vai usar

### Como adicionar à tela inicial (parece um app nativo)
```
Android (Chrome):
  1. Abra a URL no Chrome
  2. Menu (3 pontos) → "Adicionar à tela inicial"
  3. O OficinaPRO aparece como ícone de app

iPhone (Safari):
  1. Abra a URL no Safari
  2. Botão compartilhar → "Adicionar à Tela de Início"
  3. Nomeie "OficinaPRO" → Adicionar
```

### Roteiro do teste (60 minutos na oficina)

**Cenário 1 — Entrada de aparelho (20 min)**
```
1. Peça ao técnico criar uma OS real com aparelho de cliente real (ou simulado)
2. Observe onde ele tem dificuldade no formulário
3. Foto: peça para fotografar o aparelho — valide que o carimbo aparece
4. Link WhatsApp: envie para o próprio celular do cliente (ou do próprio técnico)
5. Anote: quantos passos foram intuitivos? O que gerou dúvida?
```

**Cenário 2 — Conclusão de serviço (15 min)**
```
1. Abra uma OS existente
2. Clique em "Concluir e Emitir NFS-e"
3. Verifique se os dados da OS preencheram o formulário corretamente
4. Emita (versão simulada)
5. Anote o número gerado — mostre que ficou vinculado à OS
```

**Cenário 3 — Tabela de lucratividade (10 min)**
```
1. Navegue até a aba Lucratividade
2. Mostre ao dono que "Desbloqueio/IMEI" tem margem de R$ 185/hora
3. Pergunte: "Esse dado muda como você prioriza os serviços?"
4. Anote a reação — isso valida o critério "Apoio à Decisão" do edital
```

**Entrevista rápida ao final (15 min)**
```
Perguntas obrigatórias:
1. "Em qual parte você sentiu mais dificuldade?"
2. "Você usaria isso no dia a dia? Por quê sim / Por quê não?"
3. "Quanto você pagaria por isso por mês? (não sugira valores)"
4. "O que está faltando para você usar de verdade?"
5. "A foto com o carimbo te daria segurança em caso de processo?"
```

---

## Fase 6 — Coleta de Dados do Piloto

Crie uma planilha simples (Google Sheets) com:

| Data | Oficina | Técnico | OS criadas | Fotos tiradas | NFs emitidas | Dificuldades | Score (1-5) |
|------|---------|---------|------------|---------------|--------------|--------------|-------------|

Após 1 semana com a primeira oficina, você terá dados reais para:
- Ajustar o UX (onde o técnico trava)
- Validar o modelo de preço (quanto eles pagariam)
- Identificar a feature mais valiosa para eles
- Ter um case real para pitch com investidores

---

## Problemas Comuns e Soluções

| Problema | Causa | Solução |
|---|---|---|
| Câmera não abre | HTTP (sem HTTPS) | Hospedar no Netlify/GitHub Pages |
| Fotos somem ao fechar o browser | localStorage limpo | Orientar a não limpar histórico/dados |
| App lento no smartphone antigo | Fotos em alta resolução | Já limitado a 1280px no código |
| Dados diferentes em computador e celular | localStorage é por dispositivo | Fase 3: adicionar backend com banco de dados |
| GPS mostra coordenadas erradas | Permissão negada | Orientar a aceitar permissão de localização |

---

## Roadmap Pós-Piloto

Após validar o piloto com 1 oficina e coletar feedback:

### Versão 2.0 (2–4 semanas)
- [ ] Backend com banco de dados (Supabase — gratuito) para sincronizar entre dispositivos
- [ ] Login da oficina (e-mail + senha)
- [ ] NFS-e real via Nuvem Fiscal API
- [ ] GPS real com nome da cidade
- [ ] Assinatura digital real do cliente (link de confirmação)

### Versão 3.0 (1–2 meses)
- [ ] Multi-técnico (vários técnicos na mesma oficina)
- [ ] Relatório mensal de faturamento por tipo de serviço
- [ ] Export CSV das OSs
- [ ] App nativo (PWA completo com cache offline)

---

## Resumo dos Próximos Passos Imediatos

```
HOJE:
1. Abrir mvp/index.html no Chrome — validar funcionamento (5 min)
2. Hospedar no Netlify Drop — arrastar pasta e copiar URL (10 min)
3. Abrir a URL no smartphone — validar câmera funcionando (5 min)

AMANHÃ:
4. Editar OFICINA no app.js com dados reais da oficina piloto (15 min)
5. Refazer o upload no Netlify com os dados atualizados (5 min)
6. Agendar visita à oficina piloto

EM ATÉ 7 DIAS:
7. Rodar o Roteiro de Teste de 60 minutos na oficina
8. Preencher a planilha de feedback
9. Listar os top 3 ajustes prioritários
10. Decidir: continuar no Netlify (gratuito) ou migrar para backend real
```

---

*Documento gerado por Criat · 2026-03-30*
*MVP: HTML + CSS + JS puro · Zero dependências · Hospedagem gratuita disponível*
