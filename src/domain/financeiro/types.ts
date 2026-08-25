export interface ParametrosFinanciamentoPrice {
  valorFinanciado: number;
  taxaJurosMensal: number; // fração, ex: 0.018 = 1,8% a.m.
  numeroParcelas: number;
}

export interface ParcelaPrice {
  numero: number;
  saldoDevedorInicial: number;
  juros: number;
  amortizacao: number;
  parcela: number;
  saldoDevedorFinal: number;
}

export interface ParametrosFluxoCaixa {
  investimentoInicial: number;
  /** Economia mensal estimada na conta de energia (R$), ano 1, já líquida do Fio B. */
  economiaMensalAno1: number;
  /** Degradação anual da geração dos módulos (fração, ex: 0.005 = 0,5% a.a.). */
  degradacaoAnualModulos: number;
  /** Inflação/reajuste tarifário médio anual esperado (fração, ex: 0.06 = 6% a.a.). */
  reajusteTarifarioAnual: number;
  /** Horizonte da análise, em anos. */
  horizonteAnos: number;
  /** Taxa mínima de atratividade anual, para cálculo de VPL (fração). */
  taxaMinimaAtratividadeAnual?: number;
  /**
   * Economia mensal já corretamente projetada ano a ano (índice 0 = ano 1),
   * incorporando reajuste tarifário, degradação da geração E o escalonamento
   * do Fio B (Lei 14.300/2022) — ver `projetarCustosAnuais` em
   * custosRecorrentes/calcularCustos.ts. Quando fornecido (comprimento deve
   * cobrir `horizonteAnos`), substitui o cálculo por `economiaMensalAno1` ×
   * fatores de degradação/reajuste, que não reflete a variação do Fio B ano
   * a ano. Opcional para manter compatibilidade com chamadores que só têm a
   * economia do ano 1 (ex.: simulações rápidas de UI).
   */
  economiaMensalPorAno?: number[];
}

export interface ResultadoFluxoCaixa {
  fluxoAnual: number[]; // índice 0 = investimento inicial (negativo), índice n = economia líquida do ano n
  paybackSimplesAnos: number | null;
  paybackDescontadoAnos: number | null;
  vpl: number | null;
  economiaTotalHorizonte: number;
}
