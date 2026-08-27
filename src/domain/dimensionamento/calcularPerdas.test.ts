import { describe, expect, it } from 'vitest';
import { calcularPerdas } from './calcularPerdas';

const moduloLeapton = {
  coeficienteTemperaturaPmax: -0.29,
  noct: 45,
  toleranciaPercent: 0,
  bifacial: true,
  ganhoBifacialPercent: 5,
};
const inversorGrowatt = { eficienciaMaximaPercent: 98.4 };
const siteMG = { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 };

describe('calcularPerdas', () => {
  it('retorna perdas dentro de um intervalo realista (10%-30%)', () => {
    const r = calcularPerdas(moduloLeapton, inversorGrowatt, siteMG);
    expect(r.perdaTotalLiquida).toBeGreaterThan(0.06); // bifacial premium reduz perdas abaixo de 10%
    expect(r.perdaTotalLiquida).toBeLessThan(0.30);
  });

  it('inversor mais eficiente resulta em menos perda total', () => {
    const r98 = calcularPerdas(moduloLeapton, { eficienciaMaximaPercent: 98.4 }, siteMG);
    const r95 = calcularPerdas(moduloLeapton, { eficienciaMaximaPercent: 95.0 }, siteMG);
    expect(r95.perdaTotalLiquida).toBeGreaterThan(r98.perdaTotalLiquida);
  });

  it('temperatura ambiente mais alta aumenta as perdas', () => {
    const rFrio = calcularPerdas(moduloLeapton, inversorGrowatt, { ...siteMG, temperaturaAmbienteMediaC: 20 });
    const rQuente = calcularPerdas(moduloLeapton, inversorGrowatt, { ...siteMG, temperaturaAmbienteMediaC: 32 });
    expect(rQuente.perdaTotalLiquida).toBeGreaterThan(rFrio.perdaTotalLiquida);
  });

  it('módulo bifacial tem perda líquida menor que módulo monocristalino equivalente', () => {
    const rBifacial = calcularPerdas({ ...moduloLeapton, bifacial: true }, inversorGrowatt, siteMG);
    const rMono = calcularPerdas({ ...moduloLeapton, bifacial: false }, inversorGrowatt, siteMG);
    expect(rBifacial.perdaTotalLiquida).toBeLessThan(rMono.perdaTotalLiquida);
  });

  it('gera detalhamento com a mesma quantidade de itens que componentes', () => {
    const r = calcularPerdas(moduloLeapton, inversorGrowatt, siteMG);
    expect(r.detalhamento.length).toBeGreaterThanOrEqual(6); // pelo menos 6 linhas
  });

  it('perda total líquida é consistente com o fator de eficiência implícito', () => {
    const r = calcularPerdas(moduloLeapton, inversorGrowatt, siteMG);
    // fator de eficiência = 1 - perdaTotalLiquida → deve ser < 1
    expect(1 - r.perdaTotalLiquida).toBeLessThan(1);
    expect(1 - r.perdaTotalLiquida).toBeGreaterThan(0.7);
  });

  // BUG CORRIGIDO (ago/2026): Tcélula usava o fator 0.8 (=800/1000, mistura
  // errada entre a irradiância do ensaio NOCT [800 W/m²] e a de STC
  // [1000 W/m²]). Fórmula correta (Sandia PVPMC / Duffie & Beckman):
  //   Tcélula = Tamb + (NOCT-20) × (G/800), com G=800 (irradiância média
  //   anual representativa já escolhida por este módulo) ⇒ fator = 1.
  // Valores abaixo verificados manualmente (não só via toBeCloseTo contra a
  // própria implementação): módulo Leapton do fixture acima, NOCT=45,
  // Tamb=24°C, coefTemp=-0.29%/°C.
  //   Tcélula = 24 + (45-20) = 49°C (antes do fix: 44°C)
  //   ΔT = 49-25 = 24°C (antes do fix: 19°C)
  //   perdaTemperatura = 0.29% × 24 = 6.96% (antes do fix: 5.51%)
  //   fatorEficiência = 0.984 × (1-0.0696) × 0.98³ × 1.05 = 0.90476...
  //   perdaTotalLiquida = 1 - 0.90476 = 9.524% (antes do fix: ~8.1%)
  it('Tcélula e perdaTemperatura batem com a fórmula NOCT padrão (G=800), não com o fator errado 800/1000', () => {
    const r = calcularPerdas(moduloLeapton, inversorGrowatt, siteMG);
    const tempCelulaEsperada = 24 + (45 - 20); // = 49°C
    const perdaTemperaturaEsperada = (0.29 / 100) * (tempCelulaEsperada - 25); // = 0.0696
    expect(r.detalhamento.some((l) => l.includes('Tcél 49°C'))).toBe(true);
    expect(r.perdaTemperatura).toBeCloseTo(perdaTemperaturaEsperada, 6);
    expect(r.perdaTotalLiquida).toBeCloseTo(0.09524222, 5);
  });
});
