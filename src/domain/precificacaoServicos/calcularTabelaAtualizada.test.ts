import { describe, it, expect } from 'vitest';
import { gerarTabelaAtualizada } from './calcularTabelaAtualizada';
import { TABELA_REFERENCIA_PRECOS_BASE } from '../../data/tabelaReferenciaPrecosServicos';

describe('gerarTabelaAtualizada', () => {
  it('não perde nem duplica itens da tabela base (27 itens: 15 do arquivo de projetos/subestação + 12 do arquivo de SPDA)', () => {
    expect(TABELA_REFERENCIA_PRECOS_BASE.length).toBe(27);
    const atualizada = gerarTabelaAtualizada();
    expect(atualizada.length).toBe(TABELA_REFERENCIA_PRECOS_BASE.length);
  });

  it('preserva os valores originais ao lado dos corrigidos, sem sobrescrever', () => {
    const atualizada = gerarTabelaAtualizada();
    const trifasico = atualizada.find((i) => i.servico === 'Aprovação de Padrão Trifásico');
    expect(trifasico).toBeDefined();
    expect(trifasico!.valorBaseMinRS).toBe(800);
    expect(trifasico!.valorBaseMaxRS).toBe(800);
    expect(trifasico!.valorAtualizadoMinRS).toBe(919);
    expect(trifasico!.valorAtualizadoMaxRS).toBe(919);
  });

  it('corrige min e max independentemente quando a faixa original não é um valor único', () => {
    const atualizada = gerarTabelaAtualizada();
    const galpao = atualizada.find((i) => i.servico.startsWith('Galpão — projeto elétrico'));
    expect(galpao).toBeDefined();
    expect(galpao!.valorBaseMinRS).toBe(7500);
    expect(galpao!.valorBaseMaxRS).toBe(8000);
    expect(galpao!.valorAtualizadoMinRS).toBe(8613);
    expect(galpao!.valorAtualizadoMaxRS).toBe(9187);
  });

  it('todo item corrigido é >= ao original (fator de correção é sempre > 1)', () => {
    const atualizada = gerarTabelaAtualizada();
    for (const item of atualizada) {
      expect(item.valorAtualizadoMinRS).toBeGreaterThanOrEqual(item.valorBaseMinRS);
      expect(item.valorAtualizadoMaxRS).toBeGreaterThanOrEqual(item.valorBaseMaxRS);
    }
  });

  it('nenhum item tem valorMax menor que valorMin, nem original nem corrigido', () => {
    const atualizada = gerarTabelaAtualizada();
    for (const item of atualizada) {
      expect(item.valorBaseMaxRS).toBeGreaterThanOrEqual(item.valorBaseMinRS);
      expect(item.valorAtualizadoMaxRS).toBeGreaterThanOrEqual(item.valorAtualizadoMinRS);
    }
  });

  it('aceita uma tabela e um fator customizados (não fica hardcoded na tabela/fator padrão)', () => {
    const tabelaCustom = [
      {
        categoria: 'projeto_eletrico' as const,
        servico: 'Item de teste',
        valorBaseMinRS: 100,
        valorBaseMaxRS: 200,
      },
    ];
    const atualizada = gerarTabelaAtualizada(tabelaCustom, 2);
    expect(atualizada).toHaveLength(1);
    expect(atualizada[0].valorAtualizadoMinRS).toBe(200);
    expect(atualizada[0].valorAtualizadoMaxRS).toBe(400);
    expect(atualizada[0].fatorCorrecaoAplicado).toBe(2);
  });

  it('todas as categorias usadas na tabela base são um subconjunto válido de CategoriaServicoEletrico', () => {
    const categoriasValidas = new Set([
      'padrao_entrada',
      'projeto_eletrico',
      'subestacao',
      'spda_laudos_inspecao',
      'analise_risco',
      'spda_projeto_completo',
    ]);
    for (const item of TABELA_REFERENCIA_PRECOS_BASE) {
      expect(categoriasValidas.has(item.categoria)).toBe(true);
    }
  });
});
