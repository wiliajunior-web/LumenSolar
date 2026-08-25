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

  // BUG CORRIGIDO (ago/2026): sem economiaMensalPorAno, o Fio B ficava fixo no
  // percentual do ano 1 pelos 25 anos (encontrado na auditoria completa de
  // ago/2026). economiaMensalPorAno permite ao chamador (useProjetoStore, via
  // projetarCustosAnuais) fornecer a economia já correta ano a ano.
  it('[REGRESSÃO] usa economiaMensalPorAno quando fornecido, ignorando degradação/reajuste/economiaMensalAno1', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 3000,
      economiaMensalAno1: 999999, // deliberadamente errado — deve ser ignorado
      degradacaoAnualModulos: 0.5, // deliberadamente absurdo — deve ser ignorado
      reajusteTarifarioAnual: 2.0, // deliberadamente absurdo — deve ser ignorado
      horizonteAnos: 3,
      economiaMensalPorAno: [100, 150, 200], // R$/mês por ano 1, 2, 3
    });
    // Verificado manualmente: fluxoAnual = [-3000, 100×12, 150×12, 200×12]
    //                                     = [-3000, 1200, 1800, 2400]
    // acumulado: ano1 -3000+1200=-1800 (<0); ano2 -1800+1800=0 (>=0) →
    // payback = 1 + (-(-1800)/1800) = 1 + 1 = 2,0 anos exatos.
    expect(r.fluxoAnual).toEqual([-3000, 1200, 1800, 2400]);
    expect(r.paybackSimplesAnos).toBeCloseTo(2.0, 6);
    expect(r.economiaTotalHorizonte).toBeCloseTo(5400, 6);
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
