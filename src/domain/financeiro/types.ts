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
}

export interface ResultadoFluxoCaixa {
  fluxoAnual: number[]; // índice 0 = investimento inicial (negativo), índice n = economia líquida do ano n
  paybackSimplesAnos: number | null;
  paybackDescontadoAnos: number | null;
  vpl: number | null;
  economiaTotalHorizonte: number;
}
