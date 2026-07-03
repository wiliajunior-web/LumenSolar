import { describe, expect, it } from 'vitest';
import {
  calcularTIR, calcularROI, formatarPayback,
  areaTotalNecessariaM2, pesoDistribuidoKgM2, simularFinanciamento,
} from './indicadores';

describe('calcularTIR', () => {
  it('converge para TIR conhecida (fluxo simples)', () => {
    // Investimento R$10.000, retorno R$3.000/ano por 5 anos → TIR ~15,24%
    const fluxo = [-10000, 3000, 3000, 3000, 3000, 3000];
    const tir = calcularTIR(fluxo);
    expect(tir).not.toBeNull();
    expect(tir!).toBeCloseTo(0.1524, 3);
  });

  it('TIR solar típica deve ficar entre 20% e 60%', () => {
    // Sistema R$18.000, economia R$600/mês → R$7.200/ano, 25 anos
    const fluxo = [-18000, ...Array(25).fill(7200)];
    const tir = calcularTIR(fluxo);
    expect(tir).not.toBeNull();
    expect(tir!).toBeGreaterThan(0.20);
    expect(tir!).toBeLessThan(0.60);
  });

  it('VPL com TIR calculada deve ser aproximadamente zero', () => {
    const fluxo = [-15000, 4000, 4500, 5000, 5500, 6000];
    const tir = calcularTIR(fluxo);
    if (tir === null) return;
    const vpl = fluxo.reduce((s, cf, t) => s + cf / (1 + tir) ** t, 0);
    expect(Math.abs(vpl)).toBeLessThan(0.01); // VPL quase zero na TIR
  });
});

describe('calcularROI', () => {
  it('ROI de sistema com retorno 5x deve ser 400%', () => {
    const roi = calcularROI(20000, 100000);
    expect(roi).toBeCloseTo(4.0, 5); // 400%
  });

  it('ROI menor que 0 indica prejuízo', () => {
    const roi = calcularROI(20000, 10000);
    expect(roi).toBeLessThan(0);
  });
});

describe('formatarPayback', () => {
  it('formata 2.5 anos como "2 anos e 6 meses"', () => {
    expect(formatarPayback(2.5)).toBe('2 anos e 6 meses');
  });

  it('formata 1.0 como "1 ano"', () => {
    expect(formatarPayback(1.0)).toBe('1 ano');
  });

  it('formata 0.5 como "6 meses"', () => {
    expect(formatarPayback(0.5)).toBe('6 meses');
  });

  it('retorna "Acima de 25 anos" para null', () => {
    expect(formatarPayback(null)).toBe('Acima de 25 anos');
  });

  it('formata 3.667 como "3 anos e 8 meses"', () => {
    expect(formatarPayback(3.667)).toBe('3 anos e 8 meses');
  });
});

describe('área e peso', () => {
  it('área de 12 módulos 620Wp deve estar entre 30-35 m²', () => {
    const area = areaTotalNecessariaM2(12, 620);
    expect(area).toBeGreaterThan(30);
    expect(area).toBeLessThan(36);
  });

  it('peso distribuído deve ficar entre 8 e 20 kg/m²', () => {
    const peso = pesoDistribuidoKgM2(12, 620);
    expect(peso).toBeGreaterThan(8);
    expect(peso).toBeLessThan(20);
  });

  it('sistema maior requer mais área', () => {
    const area12 = areaTotalNecessariaM2(12, 620);
    const area20 = areaTotalNecessariaM2(20, 620);
    expect(area20).toBeGreaterThan(area12);
  });
});

describe('simularFinanciamento', () => {
  it('parcela Price 48x deve ser maior que 60x para mesmo valor', () => {
    const sim48 = simularFinanciamento(18000, 400, 0.018, 48, 0.005, 0.06, 25, '48x');
    const sim60 = simularFinanciamento(18000, 400, 0.018, 60, 0.005, 0.06, 25, '60x');
    expect(sim48.parcelaMensal).toBeGreaterThan(sim60.parcelaMensal);
  });

  it('total pago em 60x é maior que em 48x (mais juros)', () => {
    const sim48 = simularFinanciamento(18000, 400, 0.018, 48, 0.005, 0.06, 25, '48x');
    const sim60 = simularFinanciamento(18000, 400, 0.018, 60, 0.005, 0.06, 25, '60x');
    expect(sim60.totalPago).toBeGreaterThan(sim48.totalPago);
  });
});
