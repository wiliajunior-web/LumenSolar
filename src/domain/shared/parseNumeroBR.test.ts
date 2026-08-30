import { describe, it, expect } from 'vitest';
import { parseNumeroBR } from './parseNumeroBR';

describe('parseNumeroBR', () => {
  // BUG CORRIGIDO (ago/2026): caso real que motivou a correção — valor
  // colado do Google Maps usa sinal de menos Unicode (−, U+2212), não
  // hífen-menos ASCII. Verificado manualmente: -48,2049444 (com vírgula PT-BR
  // e sinal Unicode) representa o número -48.2049444.
  it('caso real: reconhece sinal de menos Unicode (Google Maps) + vírgula decimal PT-BR', () => {
    expect(parseNumeroBR('−48,2049444')).toBeCloseTo(-48.2049444, 6);
    expect(parseNumeroBR('−18,6366583')).toBeCloseTo(-18.6366583, 6);
  });

  it('hífen-menos ASCII comum continua funcionando (sem regressão)', () => {
    expect(parseNumeroBR('-48,20')).toBeCloseTo(-48.20, 2);
  });

  it('número já em formato JS (ponto decimal) funciona', () => {
    expect(parseNumeroBR('795209')).toBe(795209);
    expect(parseNumeroBR('795209.5')).toBe(795209.5);
  });

  it('valor já numérico (não string) é devolvido como está', () => {
    expect(parseNumeroBR(795209)).toBe(795209);
    expect(parseNumeroBR(-48.2)).toBe(-48.2);
  });

  it('lixo não numérico retorna NaN', () => {
    expect(Number.isNaN(parseNumeroBR('abc'))).toBe(true);
  });

  // '' / undefined / null viram '' antes do Number(), e Number('') é 0 em JS
  // puro (peculiaridade de coerção da linguagem, não deste código) —
  // documentado aqui, não tratado como erro, porque os dois pontos de uso
  // (utmValorPlausivel e gerarFormularioCemig) já verificam truthiness do
  // valor ANTES de chamar parseNumeroBR, então isso nunca chega aqui na
  // prática. Confirmado com `node -e` antes de escrever este teste.
  it('string vazia/undefined/null viram 0 (coerção padrão de Number(""))', () => {
    expect(parseNumeroBR('')).toBe(0);
    expect(parseNumeroBR(undefined)).toBe(0);
    expect(parseNumeroBR(null)).toBe(0);
  });

  it('espaços em volta são ignorados', () => {
    expect(parseNumeroBR('  795209  ')).toBe(795209);
  });
});
