import { describe, expect, it } from 'vitest';
import { dimensionarSistema, ajustarDimensionamentoParaQuantidadeReal } from './dimensionar';

describe('dimensionarSistema', () => {
  it('dimensiona corretamente para um consumo padrão', () => {
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 500,
      hspLocal: 5.5, // GO
      perdasSistema: 0.2,
      potenciaModuloWp: 550,
    });
    // potencia teórica = 500 / (5.5*30.4167*0.8) = 3.736 kWp (usa 30.4167 dias/mês)
    expect(r.potenciaSistemaKWp).toBeCloseTo(500/(5.5*30.4167*0.8), 3);
    // 3.7878 / 0.55 = 6.886 -> 7 módulos
    expect(r.numeroModulos).toBe(7);
    expect(r.potenciaInstaladaRealKWp).toBeCloseTo(3.85, 5);
    expect(r.percentualCompensacaoReal).toBeGreaterThanOrEqual(1);
  });

  it('respeita percentual de compensação desejado menor que 100%', () => {
    const r100 = dimensionarSistema({
      consumoMedioMensalKWh: 500,
      hspLocal: 5.5,
      perdasSistema: 0.2,
      potenciaModuloWp: 550,
    });
    const r50 = dimensionarSistema({
      consumoMedioMensalKWh: 500,
      hspLocal: 5.5,
      perdasSistema: 0.2,
      potenciaModuloWp: 550,
      percentualCompensacaoDesejado: 0.5,
    });
    expect(r50.potenciaSistemaKWp).toBeCloseTo(r100.potenciaSistemaKWp * 0.5, 5);
    expect(r50.numeroModulos).toBeLessThanOrEqual(r100.numeroModulos);
  });

  it('lança erro para HSP inválido', () => {
    expect(() =>
      dimensionarSistema({
        consumoMedioMensalKWh: 500,
        hspLocal: 0,
        perdasSistema: 0.2,
        potenciaModuloWp: 550,
      })
    ).toThrow();
  });

  it('lança erro para perdas fora do intervalo', () => {
    expect(() =>
      dimensionarSistema({
        consumoMedioMensalKWh: 500,
        hspLocal: 5.5,
        perdasSistema: 1,
        potenciaModuloWp: 550,
      })
    ).toThrow();
  });

  it('calcula geração anual como 12x a mensal', () => {
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 320,
      hspLocal: 5.5,
      perdasSistema: 0.2,
      potenciaModuloWp: 450,
    });
    expect(r.geracaoAnualEstimadaKWh).toBeCloseTo(r.geracaoMensalEstimadaKWh * 12, 5);
  });
});

describe('ajustarDimensionamentoParaQuantidadeReal — [ago/2026] correção da contradição kit.quantidade vs numeroModulos', () => {
  // Módulo não existia antes desta auditoria — dimensionarSistema() só sabia
  // calcular o número RECOMENDADO de módulos a partir do consumo; o
  // `kit.quantidade` configurado pelo instalador (kit comercial real) era uma
  // fonte de verdade totalmente separada, nunca usada para recalcular
  // potência/geração/indicadores financeiros. Isso fazia documentos mostrarem
  // dois números de módulos contraditórios na mesma página e o payback/TIR
  // saírem calculados com a geração do número recomendado enquanto o preço
  // vinha do kit real. Valores hand-verified abaixo.
  const params = { consumoMedioMensalKWh: 500, hspLocal: 5.5, perdasSistema: 0.2, potenciaModuloWp: 550 };

  it('kit.quantidade (10) diferente do recomendado (7): recalcula potência/geração/compensação para 10 módulos', () => {
    const recomendado = dimensionarSistema(params);
    expect(recomendado.numeroModulos).toBe(7); // baseline já coberto no describe acima

    const ajustado = ajustarDimensionamentoParaQuantidadeReal(recomendado, 10, params);
    // potenciaInstaladaRealKWp = 10 × 0,550 = 5,5 kWp
    expect(ajustado.numeroModulos).toBe(10);
    expect(ajustado.potenciaInstaladaRealKWp).toBeCloseTo(5.5, 5);
    // geracaoMensal = 5,5 × 5,5 × 30,4167 × 0,8 = 736,08 kWh
    expect(ajustado.geracaoMensalEstimadaKWh).toBeCloseTo(736.08, 1);
    expect(ajustado.geracaoAnualEstimadaKWh).toBeCloseTo(ajustado.geracaoMensalEstimadaKWh * 12, 5);
    // percentualCompensacaoReal = 736,08 / 500 = 1,4722
    expect(ajustado.percentualCompensacaoReal).toBeCloseTo(1.4722, 3);
    // potenciaSistemaKWp (alvo teórico pré-arredondamento) NÃO muda — não
    // depende de qual kit discreto foi escolhido, só do consumo/HSP/perdas.
    expect(ajustado.potenciaSistemaKWp).toBe(recomendado.potenciaSistemaKWp);
  });

  it('kit.quantidade = 0 (campo ainda não preenchido pelo instalador): mantém a recomendação inalterada', () => {
    const recomendado = dimensionarSistema(params);
    const ajustado = ajustarDimensionamentoParaQuantidadeReal(recomendado, 0, params);
    expect(ajustado).toBe(recomendado); // mesma referência — early return
  });

  it('kit.quantidade igual ao recomendado (7): não recalcula (mesma referência)', () => {
    const recomendado = dimensionarSistema(params);
    const ajustado = ajustarDimensionamentoParaQuantidadeReal(recomendado, 7, params);
    expect(ajustado).toBe(recomendado);
  });

  it('kit.quantidade (5) MENOR que o recomendado (7): geração cai proporcionalmente, refletindo compensação parcial real', () => {
    const recomendado = dimensionarSistema(params);
    const ajustado = ajustarDimensionamentoParaQuantidadeReal(recomendado, 5, params);
    // potenciaInstaladaRealKWp = 5 × 0,550 = 2,75 kWp
    expect(ajustado.numeroModulos).toBe(5);
    expect(ajustado.potenciaInstaladaRealKWp).toBeCloseTo(2.75, 5);
    // geracaoMensal = 2,75 × 5,5 × 30,4167 × 0,8 = 368,04 kWh
    expect(ajustado.geracaoMensalEstimadaKWh).toBeCloseTo(368.04, 1);
    // percentualCompensacaoReal = 368,04/500 = 0,7361 — instalador vendeu um
    // kit que compensa só ~74% do consumo, e agora isso aparece corretamente
    // nos indicadores em vez de usar os 100%+ do dimensionamento recomendado.
    expect(ajustado.percentualCompensacaoReal).toBeCloseTo(0.7361, 3);
    expect(ajustado.percentualCompensacaoReal).toBeLessThan(recomendado.percentualCompensacaoReal);
  });
});
