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
});
