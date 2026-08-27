import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync, readdirSync } from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');
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

  // [REGRESSÃO ago/2026] bloco de aviso Grupo A na aba Resumo — adicionado
  // nesta sessão para que a aba "Resumo" (voltada ao cliente) não fique
  // silenciosamente com KPIs de Grupo B para um cliente Grupo A.
  it('não lança exceção quando consumo.grupoTensao é "A" e resultadoGrupoA está presente', () => {
    const dados = {
      cliente: { nome: 'Cliente Grupo A', cidade: 'Uberlândia', uf: 'MG' },
      consumo: { grupoTensao: 'A', contas: [] },
      resultadoGrupoA: {
        mediaConsumoFPkWh: 1000, mediaConsumoPkWh: 200, mediaTotalKWh: 1200,
        fatorCompensacaoFc: 1.5, geracaoNecessariaKWh: 1300,
        potenciaMinKWp: 10.056, potenciaRealKWp: 10.45, numeroModulos: 19,
        geracaoMensalKWh: 1350.9, geracaoAnualKWh: 16210.6,
        contaAntesRS: 2830, contaAposRS: 2350, economiaMensalRS: 480, economiaAnualRS: 5760,
        reducaoDemandaPossivel: false, custoDemandaBaseRS: 2000, custoUltrapassagemDemandaRS: 0,
        houveUltrapassagemDemanda: false, alertas: [], observacoes: [],
      },
    };
    expect(() => gerarExcelAuditoria(dados as any)).not.toThrow();
  });

  it('não lança exceção quando consumo.grupoTensao é "A" com ultrapassagem de demanda (alerta extra)', () => {
    const dados = {
      cliente: { nome: 'Cliente Grupo A' },
      consumo: { grupoTensao: 'A', contas: [] },
      resultadoGrupoA: {
        mediaConsumoFPkWh: 1000, mediaConsumoPkWh: 200, mediaTotalKWh: 1200,
        fatorCompensacaoFc: 1.5, geracaoNecessariaKWh: 1300,
        potenciaMinKWp: 10.056, potenciaRealKWp: 10.45, numeroModulos: 19,
        geracaoMensalKWh: 1350.9, geracaoAnualKWh: 16210.6,
        contaAntesRS: 3800, contaAposRS: 3320, economiaMensalRS: 480, economiaAnualRS: 5760,
        reducaoDemandaPossivel: false, custoDemandaBaseRS: 2600, custoUltrapassagemDemandaRS: 1200,
        houveUltrapassagemDemanda: true, alertas: ['Ultrapassagem de demanda: 30.0kW acima do contratado'], observacoes: [],
      },
    };
    expect(() => gerarExcelAuditoria(dados as any)).not.toThrow();
  });
});

// [REGRESSÃO ago/2026] o bloco "PROJEÇÃO FIO-B" da aba Resumo ignorava por
// completo o enquadramento real do cliente — nem `enquadramento` nem
// `percentuaisFioBPorAno` eram passados a gerarExcelAuditoria() por App.tsx,
// então a tabela sempre assumia o escalonamento do Art. 27 a partir de 60%
// em 2026, mesmo para um cliente elegível à regra de transição do Art. 26
// (isento até 2045) — e usava fracTUSD=0.35 fixo em vez de
// empresa.fracaoTarifaFioB (configurável). Ver comentário completo em
// gerarExcel.ts.
describe('gerarExcelAuditoria — REGRESSÃO ago/2026: aba Resumo respeita o enquadramento real (Fio B)', () => {
  afterEach(() => limparArquivosGerados());

  function planilhaResumo(dados: any): any {
    gerarExcelAuditoria(dados);
    const gerados = readdirSync('.').filter(f => f.startsWith('Auditoria_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(gerados[0]);
    return wb.Sheets['Resumo'];
  }

  function todosOsTextos(ws: any): string[] {
    return Object.keys(ws)
      .filter(k => k !== '!ref' && k !== '!cols' && ws[k].t === 's')
      .map(k => ws[k].v as string);
  }

  it('cliente elegível ao art. 26 (isento): NÃO mostra a tabela de escalonamento do Art. 27', () => {
    const dados = {
      cliente: { nome: 'Cliente Art26' },
      enquadramento: { classe: 'microgeracao', elegivelArt26: true, regraEspecialArt27Paragrafo1: false, observacoes: [] },
      percentuaisFioBPorAno: { 2025: 0, 2026: 0, 2027: 0, 2028: 0, 2029: 0 },
    };
    const textos = todosOsTextos(planilhaResumo(dados));
    expect(textos.some(t => t.includes('PROJEÇÃO FIO-B') && t.includes('Art. 27'))).toBe(false);
    expect(textos.some(t => t.includes('art. 26') && t.includes('isento'))).toBe(true);
  });

  it('cliente Art. 27: usa o percentual REAL de percentuaisFioBPorAno, não o escalonamento-padrão fixo', () => {
    // protocolo hipotético que dá 15% em 2026 (valor bem diferente do
    // escalonamento-padrão de 60% que o código antigo sempre usava) — o que
    // importa aqui é só provar que a aba lê o valor passado, não recalcula.
    const dados = {
      cliente: { nome: 'Cliente Art27' },
      enquadramento: { classe: 'microgeracao', elegivelArt26: false, regraEspecialArt27Paragrafo1: false, observacoes: [] },
      percentuaisFioBPorAno: { 2025: 0.15, 2026: 0.15, 2027: 0.15, 2028: 0.15, 2029: 0.15 },
    };
    const ws = planilhaResumo(dados);
    // acha a(s) linha(s) onde a coluna B tem o ano 2026 (F_INT) e confere que
    // a coluna C (pctFioB, F_PCT) na mesma linha é 0.15 — não 0.60.
    const linhasAno2026 = Object.keys(ws)
      .filter(k => /^B\d+$/.test(k) && ws[k].t === 'n' && ws[k].v === 2026)
      .map(k => k.slice(1));
    expect(linhasAno2026.length).toBeGreaterThan(0);
    const pct = linhasAno2026.map(linha => ws[`C${linha}`]?.v).find(v => v !== undefined);
    expect(pct).toBeCloseTo(0.15, 6);
  });
});
