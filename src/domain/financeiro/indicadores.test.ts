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
  // REGRESSÃO (set/2026, auditoria de robustez): numeroParcelas=0 (campo "Nº
  // parcelas" da 3ª opção de financiamento, alcançável limpando o input na
  // UI — vira Number('')=0) causava divisão por zero silenciosa: com i=0,
  // valorFinanciado/0 = Infinity; com i>0, (1+i)^0-1 = 0 no denominador →
  // Infinity também. Verificado manualmente com `node -e` antes de escrever
  // este teste: simularFinanciamento(18000, x, 0.0299, 0, ...) → parcelaMensal
  // = Infinity, totalPago = Infinity*0 = NaN — confirmado nos dois casos
  // (i=0 e i>0) antes de decidir que um throw (não um valor de fallback) é a
  // correção certa aqui.
  it('numeroParcelas=0 lança erro em vez de produzir Infinity/NaN silenciosos', () => {
    expect(() => simularFinanciamento(18000, 400, 0.0299, 0, 0.005, 0.06, 25, '3ª opção'))
      .toThrow('Número de parcelas da 3ª opção de financiamento deve ser maior que zero.');
    expect(() => simularFinanciamento(18000, 400, 0, 0, 0.005, 0.06, 25, '3ª opção'))
      .toThrow('Número de parcelas da 3ª opção de financiamento deve ser maior que zero.');
  });

  it('numeroParcelas negativo lança erro', () => {
    expect(() => simularFinanciamento(18000, 400, 0.0299, -5, 0.005, 0.06, 25, '3ª opção'))
      .toThrow('Número de parcelas da 3ª opção de financiamento deve ser maior que zero.');
  });

  it('taxaJurosMensal negativa lança erro', () => {
    expect(() => simularFinanciamento(18000, 400, -0.01, 24, 0.005, 0.06, 25, '3ª opção'))
      .toThrow('Taxa de juros da 3ª opção de financiamento não pode ser negativa.');
  });

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

  // [REGRESSÃO ago/2026] `saldoAcumulado` começa em 0 (financiamento, sem
  // investimento à vista) — quando a economia mensal já cobre a parcela
  // mensal desde o ano 1 (o MELHOR cenário possível), `saldoAnterior` nunca
  // ficava < 0, e a checagem antiga de payback nunca disparava:
  // `paybackAnos` ficava `null` para sempre. App.tsx e PropostaComercialPDF.tsx
  // tratam `null` como "> 25 anos" — ou seja, o melhor cenário aparecia para
  // o cliente como o pior resultado possível. Valores abaixo verificados à
  // mão: parcela Price(10000, 1%a.m., 12x) ≈ R$888,49/mês → parcelasAnual
  // ≈ R$10.661,84 < economiaAnual(R$12.000) já no ano 1.
  it('economia mensal cobrindo a parcela já no ano 1: payback deve ser ~imediato, não null', () => {
    const sim = simularFinanciamento(10000, 1000, 0.01, 12, 0, 0, 5, 'Cenário ótimo');
    expect(sim.paybackAnos).not.toBeNull();
    expect(sim.paybackAnos).toBe(0);
  });

  it('cenário que NÃO cobre a parcela no ano 1 mas se recupera depois: continua calculando payback > 0 normalmente', () => {
    // parcela alta o bastante para que a economia anual não cubra no ano 1,
    // mas cubra a partir do ano 2 em diante (degradação 0, reajuste alto).
    const sim = simularFinanciamento(10000, 400, 0.03, 24, 0, 0.5, 10, 'Cenário parcial');
    expect(sim.paybackAnos).not.toBeNull();
    expect(sim.paybackAnos as number).toBeGreaterThan(0);
  });
});
