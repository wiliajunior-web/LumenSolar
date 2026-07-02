import { ParametrosFinanciamentoPrice, ParcelaPrice } from './types';

/**
 * Gera a tabela de amortização pelo Sistema Price (parcelas fixas).
 */
export function gerarTabelaPrice(params: ParametrosFinanciamentoPrice): ParcelaPrice[] {
  const { valorFinanciado, taxaJurosMensal, numeroParcelas } = params;
  if (valorFinanciado <= 0) throw new Error('Valor financiado deve ser maior que zero.');
  if (numeroParcelas <= 0) throw new Error('Número de parcelas deve ser maior que zero.');
  if (taxaJurosMensal < 0) throw new Error('Taxa de juros não pode ser negativa.');

  const i = taxaJurosMensal;
  const n = numeroParcelas;
  const parcelaFixa =
    i === 0
      ? valorFinanciado / n
      : (valorFinanciado * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

  const tabela: ParcelaPrice[] = [];
  let saldo = valorFinanciado;

  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const amortizacao = parcelaFixa - juros;
    const saldoFinal = saldo - amortizacao;
    tabela.push({
      numero: k,
      saldoDevedorInicial: saldo,
      juros,
      amortizacao,
      parcela: parcelaFixa,
      saldoDevedorFinal: Math.max(saldoFinal, 0),
    });
    saldo = saldoFinal;
  }

  return tabela;
}

export function totalPagoPrice(tabela: ParcelaPrice[]): number {
  return tabela.reduce((acc, p) => acc + p.parcela, 0);
}

export function totalJurosPrice(tabela: ParcelaPrice[]): number {
  return tabela.reduce((acc, p) => acc + p.juros, 0);
}
