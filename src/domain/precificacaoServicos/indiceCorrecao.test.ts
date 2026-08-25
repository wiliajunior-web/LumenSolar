import { describe, it, expect } from 'vitest';
import {
  corrigirValorPorIndice,
  FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026,
  IPCA_MENSAL_AGO_A_DEZ_2023,
  IPCA_ACUMULADO_2024,
  IPCA_ACUMULADO_2025,
  IPCA_ACUMULADO_2026_JAN_A_JUL,
} from './indiceCorrecao';

describe('FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026', () => {
  it('é o produto composto (juros compostos) dos componentes documentados — recalculado de forma independente', () => {
    // Verificação manual independente (não é o mesmo código de produção):
    // multiplica os 5 meses de 2023 e os 3 anos/parcial subsequentes "na unha".
    const [ago, set, out, nov, dez] = IPCA_MENSAL_AGO_A_DEZ_2023;
    let fatorEsperado = 1;
    fatorEsperado *= 1 + ago;
    fatorEsperado *= 1 + set;
    fatorEsperado *= 1 + out;
    fatorEsperado *= 1 + nov;
    fatorEsperado *= 1 + dez;
    fatorEsperado *= 1 + IPCA_ACUMULADO_2024;
    fatorEsperado *= 1 + IPCA_ACUMULADO_2025;
    fatorEsperado *= 1 + IPCA_ACUMULADO_2026_JAN_A_JUL;

    expect(FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026).toBeCloseTo(fatorEsperado, 10);
  });

  it('corresponde a ~14,84% acumulado — valor conferido manualmente em Python antes de escrever este teste', () => {
    // python3: fator = 1.1484124626543697 (ver histórico da conversa)
    expect(FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026).toBeCloseTo(1.1484124626543697, 8);
    const percentual = (FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026 - 1) * 100;
    expect(percentual).toBeGreaterThan(14.8);
    expect(percentual).toBeLessThan(14.9);
  });
});

describe('corrigirValorPorIndice', () => {
  it('aplica o fator e arredonda para o real inteiro mais próximo (valores conferidos manualmente)', () => {
    // Cada valor abaixo foi calculado independentemente em Python
    // (round(valor_base * 1.1484124626543697)) antes deste teste existir.
    expect(corrigirValorPorIndice(800)).toBe(919);
    expect(corrigirValorPorIndice(950)).toBe(1091);
    expect(corrigirValorPorIndice(1500)).toBe(1723);
    expect(corrigirValorPorIndice(2200)).toBe(2527);
    expect(corrigirValorPorIndice(4000)).toBe(4594);
    expect(corrigirValorPorIndice(5000)).toBe(5742);
    expect(corrigirValorPorIndice(1100)).toBe(1263);
    expect(corrigirValorPorIndice(700)).toBe(804);
    expect(corrigirValorPorIndice(7500)).toBe(8613);
    expect(corrigirValorPorIndice(8000)).toBe(9187);
  });

  it('aceita um fator customizado (não fica hardcoded no fator padrão)', () => {
    expect(corrigirValorPorIndice(1000, 1.5)).toBe(1500);
    expect(corrigirValorPorIndice(100, 1)).toBe(100);
  });

  it('rejeita valor base negativo', () => {
    expect(() => corrigirValorPorIndice(-1)).toThrow();
  });

  it('rejeita fator zero ou negativo', () => {
    expect(() => corrigirValorPorIndice(100, 0)).toThrow();
    expect(() => corrigirValorPorIndice(100, -0.5)).toThrow();
  });
});
