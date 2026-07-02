import { describe, expect, it } from 'vitest';
import { calcularFluxoCaixa } from './fluxoCaixa';

describe('calcularFluxoCaixa', () => {
  it('calcula payback simples corretamente para economia constante', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 24000,
      economiaMensalAno1: 1000, // 12000/ano
      degradacaoAnualModulos: 0,
      reajusteTarifarioAnual: 0,
      horizonteAnos: 5,
      taxaMinimaAtratividadeAnual: 0,
    });
    expect(r.paybackSimplesAnos).toBeCloseTo(2, 5);
    expect(r.economiaTotalHorizonte).toBeCloseTo(60000, 5);
  });

  it('retorna null se não houver payback dentro do horizonte', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 100000,
      economiaMensalAno1: 100,
      degradacaoAnualModulos: 0,
      reajusteTarifarioAnual: 0,
      horizonteAnos: 5,
    });
    expect(r.paybackSimplesAnos).toBeNull();
  });

  it('aplica degradação e reajuste tarifário ano a ano', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 10000,
      economiaMensalAno1: 100,
      degradacaoAnualModulos: 0.01,
      reajusteTarifarioAnual: 0.05,
      horizonteAnos: 3,
    });
    const economiaAno1 = 1200;
    const economiaAno2 = 1200 * 0.99 * 1.05;
    expect(r.fluxoAnual[1]).toBeCloseTo(economiaAno1, 5);
    expect(r.fluxoAnual[2]).toBeCloseTo(economiaAno2, 5);
  });

  it('calcula VPL quando taxa mínima de atratividade é informada', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 10000,
      economiaMensalAno1: 1000,
      degradacaoAnualModulos: 0,
      reajusteTarifarioAnual: 0,
      horizonteAnos: 5,
      taxaMinimaAtratividadeAnual: 0.08,
    });
    expect(r.vpl).not.toBeNull();
    expect(r.vpl as number).toBeGreaterThan(-10000);
  });

  it('lança erro para investimento inicial inválido', () => {
    expect(() =>
      calcularFluxoCaixa({
        investimentoInicial: 0,
        economiaMensalAno1: 100,
        degradacaoAnualModulos: 0,
        reajusteTarifarioAnual: 0,
        horizonteAnos: 5,
      })
    ).toThrow();
  });
});
