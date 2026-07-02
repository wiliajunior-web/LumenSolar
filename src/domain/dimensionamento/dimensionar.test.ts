import { describe, expect, it } from 'vitest';
import { dimensionarSistema } from './dimensionar';

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
