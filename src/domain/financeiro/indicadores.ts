/**
 * Indicadores financeiros de viabilidade para sistemas fotovoltaicos.
 * Referências: ABNT NBR ISO 15392, ABSOLAR, literatura de engenharia econômica.
 */

// ─── TIR — Taxa Interna de Retorno ─────────────────────────────────────────

/**
 * Calcula a TIR (Taxa Interna de Retorno) pelo método de Newton-Raphson.
 * @param fluxoCaixa Array com fluxos [ano0 (negativo), ano1, ..., anoN]
 * @returns TIR anual como fração (ex.: 0.30 = 30%/ano), ou null se não convergir
 */
export function calcularTIR(fluxoCaixa: number[]): number | null {
  let taxa = 0.15; // estimativa inicial: 15% a.a.
  for (let iter = 0; iter < 500; iter++) {
    const vpl = fluxoCaixa.reduce((s, cf, t) => s + cf / (1 + taxa) ** t, 0);
    const dvpl = fluxoCaixa.reduce((s, cf, t) => s - (t * cf) / (1 + taxa) ** (t + 1), 0);
    if (Math.abs(dvpl) < 1e-12) break;
    const novaTaxa = taxa - vpl / dvpl;
    if (Math.abs(novaTaxa - taxa) < 1e-8) return novaTaxa > -1 ? novaTaxa : null;
    taxa = novaTaxa < -0.999 ? 0.10 : novaTaxa > 10 ? 0.10 : novaTaxa;
  }
  return null;
}

// ─── ROI ────────────────────────────────────────────────────────────────────

/**
 * Retorno sobre o investimento no horizonte analisado.
 * ROI = (economia total - investimento) / investimento
 */
export function calcularROI(investimento: number, economiaTotalHorizonte: number): number {
  if (investimento <= 0) throw new Error('Investimento deve ser maior que zero para calcular o ROI.');
  return (economiaTotalHorizonte - investimento) / investimento;
}

// ─── Payback formatado ──────────────────────────────────────────────────────

/**
 * Formata o payback em anos decimais para "X anos e Y meses".
 */
export function formatarPayback(anosDecimal: number | null): string {
  if (anosDecimal === null) return 'Acima de 25 anos';
  // Converte para meses totais primeiro para evitar off-by-one por floating-point
  // ex: 1.9999 anos → 23.9988 meses → arredonda para 24 → 2 anos, 0 meses
  const mesesTotal = Math.round(anosDecimal * 12);
  const anos = Math.floor(mesesTotal / 12);
  const meses = mesesTotal % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  if (meses === 0) return `${anos} ano${anos !== 1 ? 's' : ''}`;
  return `${anos} ano${anos !== 1 ? 's' : ''} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

// ─── Área necessária ────────────────────────────────────────────────────────

/** Área aproximada por módulo em m², baseada na potência em Wp. */
export function areaModuloM2(potenciaWp: number): number {
  if (potenciaWp < 350) return 1.65;
  if (potenciaWp < 450) return 1.90;
  if (potenciaWp < 550) return 2.20;
  if (potenciaWp < 650) return 2.55;
  if (potenciaWp < 750) return 2.80;
  return 3.10;
}

/** Área total estimada necessária no telhado (com fator de espacejamento de 10%). */
export function areaTotalNecessariaM2(numModulos: number, potenciaModuloWp: number): number {
  return numModulos * areaModuloM2(potenciaModuloWp) * 1.10;
}

/** Peso distribuído estimado por m² de telhado (kg/m²). */
export function pesoDistribuidoKgM2(numModulos: number, potenciaModuloWp: number): number {
  // Módulos modernos: ~8-12 kg cada. Estrutura adiciona ~3kg/m².
  const pesoModulo = potenciaModuloWp < 550 ? 22 : potenciaModuloWp < 650 ? 28 : 33;
  const areaTotal = areaTotalNecessariaM2(numModulos, potenciaModuloWp);
  if (areaTotal <= 0) return 0;
  return (numModulos * pesoModulo + areaTotal * 3) / areaTotal;
}

// ─── Fluxo de caixa com financiamento ───────────────────────────────────────

export interface SimulacaoFinanciamento {
  descricao: string;
  numeroParcelas: number;
  taxaJurosMensal: number; // fração
  parcelaMensal: number;
  totalPago: number;
  paybackAnos: number | null;
  economiaTotalLiquida: number;
}

/**
 * Simula o fluxo de caixa com financiamento Price e calcula payback e economia líquida.
 * @param valorFinanciado Valor do sistema
 * @param economiaMensalAno1 Economia mensal no primeiro ano (sem considerar parcelas)
 * @param taxaJurosMensal Taxa de juros mensal (fração)
 * @param numeroParcelas Número de parcelas
 * @param degradacaoAnual Degradação anual dos módulos (fração)
 * @param reajusteTarifario Reajuste tarifário anual esperado (fração)
 * @param horizonteAnos Horizonte de análise
 */
export function simularFinanciamento(
  valorFinanciado: number,
  economiaMensalAno1: number,
  taxaJurosMensal: number,
  numeroParcelas: number,
  degradacaoAnual: number,
  reajusteTarifario: number,
  horizonteAnos: number,
  descricao: string
): SimulacaoFinanciamento {
  const i = taxaJurosMensal;
  const n = numeroParcelas;
  const parcelaMensal = i === 0
    ? valorFinanciado / n
    : (valorFinanciado * i * (1 + i) ** n) / ((1 + i) ** n - 1);
  const totalPago = parcelaMensal * n;

  // Fluxo anual: saldo = economia do solar - parcelas do financiamento
  let saldoAcumulado = 0;     // saldo líquido acumulado (economia - parcelas - investimento)
  let totalParcelasPagas = 0;  // total de parcelas efetivamente pagas até agora
  let paybackAnos: number | null = null;
  let economiaTotalLiquida = 0;
  const parcelasAnual = parcelaMensal * 12;

  for (let ano = 1; ano <= horizonteAnos; ano++) {
    const fatorDeg = (1 - degradacaoAnual) ** (ano - 1);
    const fatorTar = (1 + reajusteTarifario) ** (ano - 1);
    const economiaAnual = economiaMensalAno1 * 12 * fatorDeg * fatorTar;
    // Parcelas restantes a pagar (corrigido: usa totalParcelasPagas, não saldoAcumulado)
    const restante = Math.max(0, totalPago - totalParcelasPagas);
    const parcelasNoAno = ano <= Math.ceil(n / 12) ? Math.min(parcelasAnual, restante) : 0;
    totalParcelasPagas += parcelasNoAno;
    const saldoLiquido = economiaAnual - parcelasNoAno;
    const saldoAnterior = saldoAcumulado;
    saldoAcumulado += saldoLiquido;
    economiaTotalLiquida += economiaAnual;
    if (paybackAnos === null && saldoAcumulado >= 0 && saldoAnterior < 0) {
      paybackAnos = ano - 1 + (saldoAnterior < 0 ? Math.abs(saldoAnterior) / Math.max(saldoLiquido, 0.01) : 0);
    }
  }

  return {
    descricao,
    numeroParcelas,
    taxaJurosMensal,
    parcelaMensal,
    totalPago,
    paybackAnos,
    economiaTotalLiquida: economiaTotalLiquida - totalPago,
  };
}
