/* ============================================================
   services/cep-service.js — Consulta de CEP (API pública ViaCEP)
   ============================================================ */

/**
 * Busca um CEP (8 dígitos, sem máscara) no ViaCEP.
 * Retorna o objeto da API ({ logradouro, bairro, localidade, uf, erro? }).
 * Lança exceção em falha de rede — trate no chamador.
 */
export async function buscarCEP(cep) {
  const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  return resp.json();
}
