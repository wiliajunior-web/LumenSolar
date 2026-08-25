import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync, readdirSync } from 'node:fs';
import { gerarExcelAuditoria } from './gerarExcel';

// Este arquivo não tinha NENHUM teste antes. Dois bugs reais passaram
// despercebidos por isso:
//   1. `xlsx` não estava em package.json — require('xlsx') falharia sempre
//      que a exportação fosse de fato usada fora deste ambiente de dev.
//   2. FC_T0 era referenciado na aba "Resumo" antes de ser declarado (mais
//      abaixo, na aba "Fluxo_Caixa") — ReferenceError garantido em toda
//      chamada de gerarExcelAuditoria.
// Ambos foram corrigidos no código; estes testes existem para que uma
// regressão futura quebre o build de novo, não silenciosamente.

function limparArquivosGerados() {
  for (const f of readdirSync('.')) {
    if (f.startsWith('Auditoria_') && f.endsWith('.xlsx')) unlinkSync(f);
  }
}

describe('gerarExcelAuditoria — smoke test (regressão do bug FC_T0 + dependência xlsx)', () => {
  afterEach(() => limparArquivosGerados());

  it('não lança exceção com dados mínimos (objeto vazio — todos os campos têm default)', () => {
    expect(() => gerarExcelAuditoria({})).not.toThrow();
  });

  it('não lança exceção com dados realistas e gera o arquivo .xlsx esperado', () => {
    const dados = {
      empresa: { razaoSocial: 'Lumen Soluções Ltda', logoBase64: '' },
      cliente: { nome: 'Cliente Teste', cidade: 'Araguari', uf: 'MG' },
      consumo: {
        contas: Array.from({ length: 12 }, (_, i) => ({ mes: `M${i + 1}`, kWh: 500 + i * 10, valorRS: 400 })),
        tarifaRealKWhComICMS: 1.1827,
        cipMensalRS: 18,
        tipoLigacao: 'trifasica',
      },
      kit: {
        potenciaModuloWp: 550, quantidade: 10, eficienciaInversorPercent: 98.4,
        potenciaInversorKW: 5, vocV: 49.5, iscA: 14.0, numStrings: 2, modulosPorString: 5,
        custoKitRS: 18000, percentualCompensacaoDesejado: 1.0, tipoModulo: 'bifacial_ntype',
      },
      preco: {
        estruturaRS: 1500, materiaisEletricosRS: 2000, maoDeObraRS: 3000,
        projetoArtRS: 800, outrosCustosRS: 0, aliquotaImpostos: 0.065, margemDesejada: 0.18,
      },
    };

    expect(() => gerarExcelAuditoria(dados as any)).not.toThrow();

    const gerados = readdirSync('.').filter(f => f.startsWith('Auditoria_') && f.endsWith('.xlsx'));
    expect(gerados.length).toBeGreaterThan(0);
    expect(existsSync(gerados[0])).toBe(true);
  });

  it('funciona igual com consumo/kit/preco ausentes (undefined dentro de dados)', () => {
    expect(() => gerarExcelAuditoria({ cliente: { nome: 'Sem Dados' } } as any)).not.toThrow();
  });
});
