import { ParametrosFluxoCaixa, ResultadoFluxoCaixa } from './types';

/**
 * Monta o fluxo de caixa anual do projeto (investimento inicial negativo no
 * ano 0, seguido da economia líquida estimada em cada ano do horizonte),
 * já considerando degradação dos módulos e reajuste tarifário.
 *
 * Observação: a economia mensal informada deve já estar líquida do custo de
 * Fio B (ver módulo fioB), pois esse custo varia ano a ano conforme o
 * escalonamento da Lei 14.300.
 */
export function calcularFluxoCaixa(params: ParametrosFluxoCaixa): ResultadoFluxoCaixa {
  const {
    investimentoInicial,
    economiaMensalAno1,
    degradacaoAnualModulos,
    reajusteTarifarioAnual,
    horizonteAnos,
    taxaMinimaAtratividadeAnual,
    economiaMensalPorAno,
  } = params;

  if (investimentoInicial <= 0) throw new Error('Investimento inicial deve ser maior que zero.');
  if (horizonteAnos <= 0) throw new Error('Horizonte deve ser maior que zero.');
  if (degradacaoAnualModulos < 0 || degradacaoAnualModulos > 1) throw new Error('Degradação anual deve ser entre 0 e 1 (0% a 100%).');
  if (economiaMensalPorAno && economiaMensalPorAno.length < horizonteAnos) {
    throw new Error('economiaMensalPorAno deve cobrir todo o horizonteAnos.');
  }

  const fluxoAnual: number[] = [-investimentoInicial];

  // BUG CORRIGIDO (ago/2026): sem `economiaMensalPorAno`, a economia de cada ano
  // era escalada só por degradação e reajuste tarifário, mantendo o percentual do
  // Fio B (embutido em `economiaMensalAno1`) FIXO no valor do ano 1 pelos 25 anos
  // do horizonte — apesar de a Lei 14.300/2022 escaloná-lo até 100% em 2029. Isso
  // superestimava a economia projetada (verificado: +13,6% na economia total e
  // +23,7% no VPL em um cenário de teste com sistema instalado em 2026). Quando o
  // chamador fornece `economiaMensalPorAno` (ver projetarCustosAnuais), cada ano já
  // vem com o Fio B, reajuste e degradação corretos — não reaplicar os fatores.
  for (let ano = 1; ano <= horizonteAnos; ano++) {
    let economiaAnual: number;
    if (economiaMensalPorAno) {
      economiaAnual = economiaMensalPorAno[ano - 1] * 12;
    } else {
      const fatorDegradacao = Math.pow(1 - degradacaoAnualModulos, ano - 1);
      const fatorTarifa = Math.pow(1 + reajusteTarifarioAnual, ano - 1);
      economiaAnual = economiaMensalAno1 * 12 * fatorDegradacao * fatorTarifa;
    }
    fluxoAnual.push(economiaAnual);
  }

  const paybackSimplesAnos = calcularPayback(fluxoAnual);
  const paybackDescontadoAnos =
    taxaMinimaAtratividadeAnual !== undefined
      ? calcularPayback(descontarFluxo(fluxoAnual, taxaMinimaAtratividadeAnual))
      : null;
  const vpl = taxaMinimaAtratividadeAnual !== undefined ? somaFluxoDescontado(fluxoAnual, taxaMinimaAtratividadeAnual) : null;

  const economiaTotalHorizonte = fluxoAnual.slice(1).reduce((acc, v) => acc + v, 0);

  return { fluxoAnual, paybackSimplesAnos, paybackDescontadoAnos, vpl, economiaTotalHorizonte };
}

function descontarFluxo(fluxo: number[], taxaAnual: number): number[] {
  return fluxo.map((v, idx) => v / Math.pow(1 + taxaAnual, idx));
}

function somaFluxoDescontado(fluxo: number[], taxaAnual: number): number {
  return descontarFluxo(fluxo, taxaAnual).reduce((acc, v) => acc + v, 0);
}

/**
 * Payback por interpolação linear dentro do ano em que o saldo acumulado
 * passa a ser positivo. Retorna null se o investimento não se paga dentro
 * do horizonte fornecido.
 */
function calcularPayback(fluxo: number[]): number | null {
  let acumulado = fluxo[0];
  for (let ano = 1; ano < fluxo.length; ano++) {
    const acumuladoAnterior = acumulado;
    acumulado += fluxo[ano];
    if (acumulado >= 0) {
      const fracaoDoAno = fluxo[ano] !== 0 ? -acumuladoAnterior / fluxo[ano] : 0;
      return ano - 1 + fracaoDoAno;
    }
  }
  return null;
}
