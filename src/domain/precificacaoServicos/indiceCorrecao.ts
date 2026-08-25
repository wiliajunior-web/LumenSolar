/**
 * Correção monetária dos valores de `tabelaReferenciaPrecosServicos.ts` por IPCA
 * acumulado (índice oficial de inflação do Brasil, apurado pelo IBGE).
 *
 * POR QUE IPCA (e não INCC-DI ou IGP-M):
 *   - INCC-DI (FGV) mede o custo de materiais + mão de obra da CONSTRUÇÃO CIVIL.
 *     É o índice certo para reajustar contrato de obra, mas os itens desta
 *     tabela são HONORÁRIOS DE SERVIÇO TÉCNICO (projeto, laudo, inspeção), não
 *     insumo de obra. Acumulado 12 meses até jul/2026: 6,46% — mais agressivo
 *     que o IPCA e menos aderente à natureza do serviço.
 *   - IGP-M (FGV) inclui preços no atacado (IPA), fortemente exposto a câmbio
 *     e commodities; é o índice tradicional de contrato de aluguel, não de
 *     honorário técnico, e é historicamente mais volátil.
 *   - IPCA (IBGE) é o índice oficial de inflação ao consumidor do Brasil — a
 *     referência mais aceita para reajuste de contrato de serviço quando não
 *     há índice setorial específico definido em convenção coletiva/sindicato
 *     (não há uma tabela CREA/sindicato nacional vinculante para os serviços
 *     desta lista). É também o índice mais conservador entre os três acima,
 *     o que evita superestimar a correção de uma tabela que já era uma
 *     referência aproximada na origem.
 *
 * COMPOSIÇÃO DO ACUMULADO (jul/2023 → jul/2026), mês a mês onde disponível:
 *   ago/2023  +0,23%   set/2023  +0,26%   out/2023  +0,24%
 *   nov/2023  +0,28%   dez/2023  +0,56%
 *   2024 (ano fechado):            +4,83%
 *   2025 (ano fechado):            +4,26%
 *   2026 (jan–jul, parcial):       +3,44%
 *
 *   Fontes (consultadas em 25/08/2026):
 *   - IBGE, variação mensal do IPCA 2023: mobills.com.br/tabelas/ipca/
 *   - IPCA fechado 2024/2025 e acumulado 2026: numerando.com.br/indices/ipca/acumulado
 *   - IPCA acumulado 12 meses (jul/2026) e mensal ago/2025–jul/2026:
 *     debit.com.br/tabelas/ipca-indice-nacional-de-precos-ao-consumidor-amplo
 *   - INCC-DI acumulado 12 meses (comparação): brasilindicadores.com.br/incc-di/
 *
 * LIMITAÇÃO CONHECIDA: a data-base "jul/2023" é uma INFERÊNCIA a partir do
 * comentário mais antigo visível na página de origem do arquivo (03/07/2023),
 * não uma data de publicação documentada. Se uma data-base mais precisa for
 * encontrada, `FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026` deve ser recalculado.
 */

/** Variação mensal do IPCA, ago/2023 a dez/2023 (segunda metade do ano-base). */
export const IPCA_MENSAL_AGO_A_DEZ_2023 = [0.0023, 0.0026, 0.0024, 0.0028, 0.0056] as const;

/** IPCA acumulado do ano fechado de 2024. */
export const IPCA_ACUMULADO_2024 = 0.0483;

/** IPCA acumulado do ano fechado de 2025. */
export const IPCA_ACUMULADO_2025 = 0.0426;

/** IPCA acumulado de jan/2026 a jul/2026 (parcial — último dado disponível). */
export const IPCA_ACUMULADO_2026_JAN_A_JUL = 0.0344;

/**
 * Fator de correção composto (juros compostos mês a mês / ano a ano) do
 * acumulado de IPCA entre jul/2023 e jul/2026. Recalculado a partir dos
 * componentes documentados acima — não é um número "solto".
 */
export const FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026: number = (() => {
  let fator = 1;
  for (const m of IPCA_MENSAL_AGO_A_DEZ_2023) fator *= 1 + m;
  fator *= 1 + IPCA_ACUMULADO_2024;
  fator *= 1 + IPCA_ACUMULADO_2025;
  fator *= 1 + IPCA_ACUMULADO_2026_JAN_A_JUL;
  return fator;
})();

/**
 * Aplica o fator de correção a um valor em R$, arredondando para o real
 * inteiro mais próximo (mesma granularidade dos valores originais da tabela).
 */
export function corrigirValorPorIndice(
  valorBaseRS: number,
  fator: number = FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026,
): number {
  if (valorBaseRS < 0) throw new Error('Valor base não pode ser negativo.');
  if (fator <= 0) throw new Error('Fator de correção deve ser positivo.');
  return Math.round(valorBaseRS * fator);
}
