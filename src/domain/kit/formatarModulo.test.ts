import { describe, it, expect } from 'vitest';
import { formatarNomeModulo, formatarTipoModulo } from './formatarModulo';
import { PRESETS_MODULO } from '@data/presetsModulo';

// ADICIONADO (ago/2026): ver comentário completo em formatarModulo.ts — bug
// real encontrado na auditoria de design dos documentos gerados (caso Ana
// Maria Vieira de Sá e Silva).
describe('formatarNomeModulo', () => {
  it('caso real que motivou a correção: modelo já contém a marca — não duplica', () => {
    // Valores reais do kit da Ana Maria (marcaModulo tem espaço à direita,
    // como digitado pelo usuário — precisa sobreviver ao trim()).
    expect(formatarNomeModulo('LEAPTON ', 'LEAPTON LP182210-M-66-NB')).toBe('LEAPTON LP182210-M-66-NB');
  });

  it('modelo NÃO contém a marca: concatena normalmente', () => {
    expect(formatarNomeModulo('Canadian Solar', 'CS3W-450MS')).toBe('Canadian Solar CS3W-450MS');
  });

  it('só marca preenchida: retorna só a marca', () => {
    expect(formatarNomeModulo('Canadian Solar', '')).toBe('Canadian Solar');
    expect(formatarNomeModulo('Canadian Solar', undefined)).toBe('Canadian Solar');
  });

  it('só modelo preenchido: retorna só o modelo', () => {
    expect(formatarNomeModulo('', 'CS3W-450MS')).toBe('CS3W-450MS');
    expect(formatarNomeModulo(null, 'CS3W-450MS')).toBe('CS3W-450MS');
  });

  it('nenhum preenchido: string vazia, sem lançar exceção', () => {
    expect(formatarNomeModulo(undefined, undefined)).toBe('');
    expect(formatarNomeModulo(null, null)).toBe('');
  });

  it('comparação de prefixo é case-insensitive (marca em caixa diferente do modelo)', () => {
    expect(formatarNomeModulo('leapton', 'LEAPTON LP182210-M-66-NB')).toBe('LEAPTON LP182210-M-66-NB');
  });
});

describe('formatarTipoModulo', () => {
  it('chave válida do preset: devolve o rótulo em português, não a chave interna', () => {
    // Caso real: kit.tipoModulo="bifacial_ntype" aparecia literalmente no PDF
    // ("620Wp bifacial_ntype") em vez de "Bifacial N-TYPE (TOPCon)".
    expect(formatarTipoModulo('bifacial_ntype', PRESETS_MODULO)).toBe('Bifacial N-TYPE (TOPCon)');
    expect(formatarTipoModulo('monocristalino', PRESETS_MODULO)).toBe('Monocristalino');
  });

  it('chave desconhecida: cai de volta na própria chave (nunca lança exceção)', () => {
    expect(formatarTipoModulo('chave_inexistente', PRESETS_MODULO)).toBe('chave_inexistente');
  });

  it('vazio/undefined/null: string vazia', () => {
    expect(formatarTipoModulo('', PRESETS_MODULO)).toBe('');
    expect(formatarTipoModulo(undefined, PRESETS_MODULO)).toBe('');
    expect(formatarTipoModulo(null, PRESETS_MODULO)).toBe('');
  });
});
