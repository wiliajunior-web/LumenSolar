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
 * @param economiaMensalPorAno Opcional: economia mensal já projetada ano a ano
 *   (índice 0 = ano 1), incorporando o escalonamento do Fio B — ver
 *   `projetarCustosAnuais`. Quando fornecido, substitui o cálculo por
 *   degradação/reajuste isolados (que mantêm o Fio B fixo no valor do ano 1).
 */
export function simularFinanciamento(
  valorFinanciado: number,
  economiaMensalAno1: number,
  taxaJurosMensal: number,
  numeroParcelas: number,
  degradacaoAnual: number,
  reajusteTarifario: number,
  horizonteAnos: number,
  descricao: string,
  economiaMensalPorAno?: number[]
): SimulacaoFinanciamento {
  // BUG CORRIGIDO (set/2026, auditoria de robustez): `numeroParcelas` (campo
  // "Nº parcelas" da 3ª opção de financiamento, aba Empresa) é um
  // `<input type="number">` sem validação — limpar o campo vira
  // `Number('') = 0` (ver App.tsx). Sem este guard, n=0 produzia divisão por
  // zero: com i=0 → valorFinanciado/0 = Infinity; com i>0 →
  // (1+i)^0 - 1 = 0 no denominador → Infinity também. Como `.click()`/`for`
  // não lança nada, o Infinity/NaN corria solto até o card "Simulações de
  // financiamento" (App.tsx), sem nenhum erro visível ao usuário. `n<0`
  // (também alcançável, mesmo campo) chegava a um valor finito mas sem
  // sentido físico algum (financiamento com parcelas negativas). Mesmo guard
  // já existente na função irmã `gerarTabelaPrice` (price.ts) — este era o
  // único ponto do arquivo que ainda não tinha essa proteção. A validação
  // "de verdade" (mensagem amigável antes de chegar aqui) foi adicionada em
  // `validation.ts`; este throw é a segunda camada, para o caminho de
  // "Recalcular agora" que chama calcularTudo() direto, sem passar pela
  // validação de `tentarCalcular()`.
  if (numeroParcelas <= 0) throw new Error('Número de parcelas da 3ª opção de financiamento deve ser maior que zero.');
  if (taxaJurosMensal < 0) throw new Error('Taxa de juros da 3ª opção de financiamento não pode ser negativa.');

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
    // BUG CORRIGIDO (ago/2026): mesma correção de calcularFluxoCaixa.ts — sem
    // economiaMensalPorAno, o Fio B ficava fixo no percentual do ano 1 pelos 25
    // anos, apesar do escalonamento da Lei 14.300/2022.
    const economiaAnual = economiaMensalPorAno
      ? economiaMensalPorAno[ano - 1] * 12
      : economiaMensalAno1 * 12 * ((1 - degradacaoAnual) ** (ano - 1)) * ((1 + reajusteTarifario) ** (ano - 1));
    // Parcelas restantes a pagar (corrigido: usa totalParcelasPagas, não saldoAcumulado)
    const restante = Math.max(0, totalPago - totalParcelasPagas);
    const parcelasNoAno = ano <= Math.ceil(n / 12) ? Math.min(parcelasAnual, restante) : 0;
    totalParcelasPagas += parcelasNoAno;
    const saldoLiquido = economiaAnual - parcelasNoAno;
    const saldoAnterior = saldoAcumulado;
    saldoAcumulado += saldoLiquido;
    economiaTotalLiquida += economiaAnual;
    // BUG CORRIGIDO (ago/2026): `saldoAcumulado` começa em 0 (não negativo — é
    // financiamento, sem investimento inicial à vista), então a checagem
    // original `saldoAnterior < 0` NUNCA disparava quando a economia mensal já
    // cobre a parcela mensal desde o primeiro mês (economiaAnual ≥ parcelasNoAno
    // já no ano 1, o melhor cenário possível). `saldoAnterior` ficava travado em
    // 0 (nunca < 0) em todo o horizonte, e `paybackAnos` permanecia `null` para
    // sempre — App.tsx e PropostaComercialPDF.tsx tratam `null` como "> 25 anos",
    // ou seja, o MELHOR cenário de financiamento (paga-se sozinho desde o
    // primeiro mês) aparecia para o cliente como o PIOR resultado possível.
    // Verificado manualmente: valorFinanciado=10000, economiaMensalAno1=1000,
    // taxaJurosMensal=0.01, numeroParcelas=12 → parcela≈R$888,74/mês,
    // economiaAnual(12000) > parcelasAnual(≈10664,9) já no ano 1 → payback
    // correto é ~imediato (0), não null/">25 anos".
    if (paybackAnos === null && saldoAcumulado >= 0) {
      if (ano === 1) {
        // Nasceu positivo já no primeiro ano: economia mensal cobre a parcela
        // mensal desde o início — paga-se a si mesmo, payback ~ imediato.
        paybackAnos = 0;
      } else if (saldoAnterior < 0) {
        paybackAnos = ano - 1 + Math.abs(saldoAnterior) / Math.max(saldoLiquido, 0.01);
      }
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
