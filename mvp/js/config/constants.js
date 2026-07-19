/* ============================================================
   config/constants.js — Constantes globais do app
   EDITE AQUI: chaves do localStorage, listas de referência.
   ============================================================ */

// Chaves usadas no localStorage do navegador
export const STORAGE_KEY = 'oficina_pro_os';
export const PENDING_KEY = 'oficina_pro_pending';

// CNPJ de demonstração — perfis com este CNPJ são tratados como "sem perfil"
export const DEMO_CNPJ = '12.345.678/0001-99';

// ── Ciclo de vida da OS ─────────────────────────────────────────
// A ordem do array é a ordem exibida nos filtros e no seletor.
// ATENÇÃO: NÃO renomeie os `value` — eles ficam gravados nas OS do banco.
//    ('aguardando', 'andamento' e 'concluida' existem desde a 1ª versão)
export const OS_STATUS = [
  { value: 'aguardando', label: 'Em análise',            badge: 'badge-waiting'  },
  { value: 'aprovacao',  label: 'Aguardando aprovação',  badge: 'badge-approval' },
  { value: 'pecas',      label: 'Aguardando peça',       badge: 'badge-parts'    },
  { value: 'andamento',  label: 'Em reparo',             badge: 'badge-progress' },
  { value: 'pronto',     label: 'Pronto p/ retirada',    badge: 'badge-ready'    },
  { value: 'concluida',  label: 'Entregue',              badge: 'badge-done'     },
];

// ── Dados de referência (não usados diretamente no código hoje,
//    mantidos para consulta/uso futuro) ─────────────────────────

export const DEVICE_TYPES = ['Celular','Notebook','Tablet','Eletrodoméstico','TV','Câmera','Videogame','Outro'];

// Códigos de serviço da LC 116/2003 relevantes para NFS-e de assistência técnica
export const SERVICES_NFSE = [
  { code: '14.01', desc: 'Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto' },
  { code: '14.02', desc: 'Assistência técnica' },
  { code: '14.03', desc: 'Recondicionamento de motores (exceto peças e partes empregadas, que ficam sujeitas ao ICMS)' },
  { code: '14.04', desc: 'Recauchutagem ou regeneração de pneus' },
  { code: '14.05', desc: 'Restauração, recondicionamento, acondicionamento, pintura, beneficiamento, lavagem, secagem, tingimento, galvanoplastia, anodização, corte, recorte, polimento, plastificação e congêneres, de objetos quaisquer' },
  { code: '14.06', desc: 'Instalação e montagem de aparelhos, máquinas e equipamentos, inclusive montagem industrial, prestados ao usuário final' },
];

// Tabela de preços/margens de referência do mercado (material de pitch)
export const LUCRO_DATA = [
  { servico: 'Troca de tela',         preco: 280, tempo: 1.5, margem: 130 },
  { servico: 'Troca de bateria',      preco: 120, tempo: 0.5, margem: 175 },
  { servico: 'Conector de carga',     preco: 90,  tempo: 0.5, margem: 140 },
  { servico: 'Formatação/Software',   preco: 80,  tempo: 0.75,margem: 98  },
  { servico: 'Troca de câmera',       preco: 180, tempo: 1.0, margem: 130 },
  { servico: 'Reparo de placa mãe',   preco: 350, tempo: 3.0, margem: 95  },
  { servico: 'Troca de teclado NB',   preco: 150, tempo: 1.0, margem: 110 },
  { servico: 'Limpeza interna',       preco: 70,  tempo: 0.5, margem: 105 },
  { servico: 'Troca de alto-falante', preco: 100, tempo: 0.75,margem: 98  },
  { servico: 'Desbloqueio/IMEI',      preco: 60,  tempo: 0.25,margem: 185 },
];
