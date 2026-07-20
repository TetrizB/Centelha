/* ============================================================
   pages/nova-os/state.js — Estado compartilhado do wizard
   Compartilhado entre wizard.js, itens.js, pattern-lock.js e fotos.js.
   O objeto é mutado diretamente (wizard.data = {...}, wizard.step++).
   ============================================================ */

export const wizard = {
  // Dados coletados nos passos (vira a OS ao final)
  data: { fotos: [], fotoMeta: [], condicoes: [], senhaParao: [], itens: [] },
  // Passo atual do wizard (1 a 3)
  step: 1,
  // Dots selecionados no padrão de desbloqueio 3x3
  pattern: [],
  // Contador de linhas da tabela de itens (gera ids únicos)
  rowCount: 0,
};
