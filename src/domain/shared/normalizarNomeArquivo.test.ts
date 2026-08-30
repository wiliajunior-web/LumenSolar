import { describe, it, expect } from 'vitest';
import { normalizarNomeArquivo } from './normalizarNomeArquivo';

describe('normalizarNomeArquivo', () => {
  // BUG CORRIGIDO (ago/2026): caso real que motivou a correção — o nome
  // "Ana Maria Vieira de Sá e Silva" virava "Ana_Maria_Vieira_de_S_e_Silva"
  // (o "á" era simplesmente removido, não transliterado para "a") nos 3
  // geradores de Excel do app. Valor esperado calculado manualmente letra
  // por letra: "Sá" -> "Sa" (á transliterado, não apagado).
  it('caso real: transliteral "Sá" para "Sa" em vez de apagar a letra', () => {
    expect(normalizarNomeArquivo('Ana Maria Vieira de Sá e Silva'))
      .toBe('Ana_Maria_Vieira_de_Sa_e_Silva');
  });

  it('transliteral todas as vogais acentuadas e cedilha do PT-BR (maiúsculas e minúsculas)', () => {
    expect(normalizarNomeArquivo('áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'))
      .toBe('aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
  });

  it('espaços (um ou mais seguidos) viram um único underscore', () => {
    expect(normalizarNomeArquivo('João  da   Silva')).toBe('Joao_da_Silva');
  });

  it('remove pontuação e símbolos que não são letra/número/underscore, incluindo hífen (mesma regra já existente antes da correção)', () => {
    expect(normalizarNomeArquivo('Nome-Composto (Ltda.)')).toBe('NomeComposto_Ltda');
  });

  it('string vazia continua vazia; string só de espaços vira um underscore', () => {
    expect(normalizarNomeArquivo('')).toBe('');
    expect(normalizarNomeArquivo('   ')).toBe('_');
  });

  it('dígitos e underscores já presentes são preservados como estão', () => {
    expect(normalizarNomeArquivo('Projeto_123 v2')).toBe('Projeto_123_v2');
  });
});
