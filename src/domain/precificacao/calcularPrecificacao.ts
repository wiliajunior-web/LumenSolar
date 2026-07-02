import { ComposicaoCustos, ParametrosPrecificacao, ResultadoPrecificacao } from './types';

export function somarCustos(c: ComposicaoCustos): number {
  return (
    c.kit.custoKitRS +
    c.estruturaRS +
    c.materiaisEletricosRS +
    c.maoDeObraRS +
    c.projetoArtRS +
    c.outrosCustosRS
  );
}

/**
 * Calcula o preço de venda e a composição de custos/impostos/lucro.
 *
 * Usa a fórmula correta para precificação com imposto sobre receita:
 *   Preço = Custo / (1 - impostos - margem)
 *
 * Isso evita o erro comum de somar percentuais por cima do custo, que resulta
 * em imposto e margem sub-calculados.
 */
export type { ResultadoPrecificacao } from "./types";
export function calcularPrecificacao(params: ParametrosPrecificacao): ResultadoPrecificacao {
  const { composicao, aliquotaImpostos, margemDesejada } = params;

  if (aliquotaImpostos < 0 || aliquotaImpostos >= 1) throw new Error('Alíquota de impostos inválida (deve ser entre 0 e 1).');
  if (margemDesejada < 0 || margemDesejada >= 1) throw new Error('Margem desejada inválida (deve ser entre 0 e 1).');
  if (aliquotaImpostos + margemDesejada >= 1) throw new Error('A soma de impostos e margem não pode ser >= 100%.');

  const custoTotalDireto = somarCustos(composicao);
  const precoVenda = custoTotalDireto / (1 - aliquotaImpostos - margemDesejada);
  const impostoSobreVenda = precoVenda * aliquotaImpostos;
  const lucroLiquido = precoVenda * margemDesejada;
  const markupPercentual = ((precoVenda - custoTotalDireto) / custoTotalDireto) * 100;
  const margemPercentual = margemDesejada * 100;

  return {
    custoKit: composicao.kit.custoKitRS,
    custoEstrutura: composicao.estruturaRS,
    custoMateriais: composicao.materiaisEletricosRS,
    custoMaoDeObra: composicao.maoDeObraRS,
    custoProjetoArt: composicao.projetoArtRS,
    custoOutros: composicao.outrosCustosRS,
    custoTotalDireto,
    impostoSobreVenda,
    lucroLiquido,
    precoVenda,
    markupPercentual,
    margemPercentual,
  };
}
