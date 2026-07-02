import { describe, expect, it } from 'vitest';
import { gerarTabelaPrice, totalPagoPrice, totalJurosPrice } from './price';

describe('gerarTabelaPrice', () => {
  it('gera parcelas fixas e zera o saldo devedor ao final', () => {
    const tabela = gerarTabelaPrice({ valorFinanciado: 10000, taxaJurosMensal: 0.02, numeroParcelas: 12 });
    expect(tabela).toHaveLength(12);
    const valores = new Set(tabela.map((p) => Math.round(p.parcela * 100)));
    expect(valores.size).toBe(1); // todas as parcelas iguais (Price)
    expect(tabela[11].saldoDevedorFinal).toBeCloseTo(0, 2);
  });

  it('com taxa zero, parcela é o valor financiado dividido pelo número de parcelas', () => {
    const tabela = gerarTabelaPrice({ valorFinanciado: 12000, taxaJurosMensal: 0, numeroParcelas: 12 });
    expect(tabela[0].parcela).toBeCloseTo(1000, 5);
    expect(totalJurosPrice(tabela)).toBeCloseTo(0, 5);
  });

  it('total pago é maior que o valor financiado quando há juros', () => {
    const tabela = gerarTabelaPrice({ valorFinanciado: 20000, taxaJurosMensal: 0.015, numeroParcelas: 48 });
    expect(totalPagoPrice(tabela)).toBeGreaterThan(20000);
  });

  it('lança erro para valor financiado inválido', () => {
    expect(() => gerarTabelaPrice({ valorFinanciado: 0, taxaJurosMensal: 0.02, numeroParcelas: 12 })).toThrow();
  });
});
