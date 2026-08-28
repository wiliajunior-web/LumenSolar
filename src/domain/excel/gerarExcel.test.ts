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

// [REGRESSÃO ago/2026 — rodada 10] 6 bugs encontrados por auditoria de
// subagente e verificados manualmente linha a linha contra o payload real
// enviado por App.tsx (gerarExcel(), que monta o objeto direto de
// useProjetoStore.getState() — não passa por buildData()) antes de corrigir.
describe('gerarExcelAuditoria — REGRESSÃO ago/2026 (rodada 10): 6 bugs de fórmula/campo', () => {
  afterEach(() => limparArquivosGerados());

  function planilha(dados: any, aba: string): any {
    gerarExcelAuditoria(dados);
    const gerados = readdirSync('.').filter(f => f.startsWith('Auditoria_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(gerados[0]);
    return wb.Sheets[aba];
  }

  function valorPorLabel(ws: any, labelPrefix: string): any {
    for (const key of Object.keys(ws)) {
      if (/^A\d+$/.test(key) && ws[key].t === 's' && typeof ws[key].v === 'string' && ws[key].v.startsWith(labelPrefix)) {
        return ws[`B${key.slice(1)}`]?.v;
      }
    }
    return undefined;
  }

  function formulaPorLabel(ws: any, labelPrefix: string): string | undefined {
    for (const key of Object.keys(ws)) {
      if (/^A\d+$/.test(key) && ws[key].t === 's' && typeof ws[key].v === 'string' && ws[key].v.startsWith(labelPrefix)) {
        return ws[`B${key.slice(1)}`]?.f;
      }
    }
    return undefined;
  }

  // 1. Tcell = Tamb + (NOCT-20)×0.8 — mesmo bug de calcularPerdas.ts (mistura
  // irradiância NOCT 800W/m² com STC 1000W/m²). NOCT/Tamb são constantes
  // fixas no arquivo (45°C/24°C, não vêm de `dados`), então o valor
  // esperado é sempre o mesmo, com ou sem input.
  it('Tcell da aba Perdas usa Tamb+(NOCT-20) SEM o fator ×0.8 (49°C, não 44°C)', () => {
    const ws = planilha({ cliente: { nome: 'X' } }, 'Perdas');
    expect(valorPorLabel(ws, 'Tcell = Tamb + (NOCT-20)')).toBe(24 + (45 - 20));
  });

  // 2. Payback: MATCH(0,SIGN(...)) nunca acha o ano exato de cruzamento —
  // corrigido para MATCH(1,SIGN(...)) (primeiro ano com fluxo acumulado
  // positivo). Como setFrm() não avalia fórmulas (isso é trabalho do
  // Excel/LibreOffice ao abrir o arquivo), o teste verifica a fórmula
  // gravada em si, não um valor calculado.
  it('fórmula de Payback simples usa MATCH(1,SIGN(...)), não MATCH(0,SIGN(...))', () => {
    const ws = planilha({ cliente: { nome: 'X' } }, 'Fluxo_Caixa');
    const f = formulaPorLabel(ws, 'Payback simples');
    expect(f).toContain('MATCH(1,SIGN(');
    expect(f).not.toContain('MATCH(0,SIGN(');
  });

  // 3. FioB_Economia (a aba que alimenta Fluxo_Caixa/VPL/TIR/Payback) —
  // ao contrário da aba Resumo (já corrigida antes), continuava assumindo
  // Art.27 sempre. Projeção de 25 anos com cliente Art.26 deve ter 0% em
  // todos os anos até 2045.
  it('FioB_Economia — cliente Art.26 (isento): projeção de 25 anos usa 0% em todo o período (2026-2045 incluso)', () => {
    const dados = {
      cliente: { nome: 'Cliente Art26' },
      enquadramento: { classe: 'microgeracao', elegivelArt26: true, regraEspecialArt27Paragrafo1: false, observacoes: [] },
      percentuaisFioBPorAno: { 2025: 0, 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0, 2035: 0, 2040: 0, 2045: 0 },
    };
    const ws = planilha(dados, 'FioB_Economia');
    // Acha todas as linhas da tabela de projeção (coluna A = ano entre
    // 2020 e 2060, coluna C tem fórmula de economia — só a projeção tem
    // as duas coisas juntas nessa faixa de linhas).
    const linhasProjecao = Object.keys(ws)
      .filter(k => /^A\d+$/.test(k) && ws[k].t === 'n' && ws[k].v >= 2020 && ws[k].v <= 2060 && ws[`C${k.slice(1)}`]?.f)
      .map(k => ({ linha: k.slice(1), ano: ws[k].v as number }));
    expect(linhasProjecao.length).toBeGreaterThan(0);
    for (const { linha, ano } of linhasProjecao) {
      const pct = ws[`B${linha}`]?.v;
      if (ano <= 2045) expect(pct).toBe(0);
    }
  });

  it('FioB_Economia — cliente Art.27 (não elegível): projeção de 25 anos ainda usa o escalonamento real (60% em 2026)', () => {
    const dados = {
      cliente: { nome: 'Cliente Art27' },
      enquadramento: { classe: 'microgeracao', elegivelArt26: false, regraEspecialArt27Paragrafo1: false, observacoes: [] },
      percentuaisFioBPorAno: { 2026: 0.60 },
    };
    const ws = planilha(dados, 'FioB_Economia');
    const linha2026 = Object.keys(ws).find(k => /^A\d+$/.test(k) && ws[k].t === 'n' && ws[k].v === 2026 && ws[`C${k.slice(1)}`]?.f);
    expect(linha2026).toBeTruthy();
    expect(ws[`B${linha2026!.slice(1)}`]?.v).toBeCloseTo(0.60, 6);
  });

  // 4. HSP hardcoded em 5.4 (MG), ignorando cliente.uf.
  it('HSP local usa a UF real do cliente (AM=4.4), não fixo 5.4 (MG)', () => {
    const ws = planilha({ cliente: { nome: 'X', uf: 'AM' } }, 'Entradas');
    expect(valorPorLabel(ws, 'HSP local')).toBeCloseTo(4.4, 6);
  });

  it('HSP local cai para 5.4 (MG) quando UF está ausente (fallback, não quebra)', () => {
    const ws = planilha({ cliente: { nome: 'X' } }, 'Entradas');
    expect(valorPorLabel(ws, 'HSP local')).toBeCloseTo(5.4, 6);
  });

  // 5. reajuste/TMA/taxas Solfácil hardcoded, ignorando os campos reais e
  // editáveis de `empresa` (disponível no escopo da função).
  it('Reajuste/TMA/Solfácil 48×/60× usam os valores reais de `empresa`, não os fixos do código', () => {
    const dados = {
      cliente: { nome: 'X' },
      empresa: {
        reajusteTarifarioAnual: 0.05,
        taxaMinimaAtratividadeAnual: 0.10,
        taxaSolfacil48Mensal: 0.0250,
        taxaSolfacil60Mensal: 0.0270,
      },
    };
    const ws = planilha(dados, 'Entradas');
    expect(valorPorLabel(ws, 'Reajuste tarifário anual')).toBeCloseTo(0.05, 6);
    expect(valorPorLabel(ws, 'TMA')).toBeCloseTo(0.10, 6);
    expect(valorPorLabel(ws, 'Taxa Solfácil 48')).toBeCloseTo(0.0250, 6);
    expect(valorPorLabel(ws, 'Taxa Solfácil 60')).toBeCloseTo(0.0270, 6);
  });

  it('Reajuste sem `empresa` cai no default real (0.06), não no valor antigo errado (0.07)', () => {
    const ws = planilha({ cliente: { nome: 'X' } }, 'Entradas');
    expect(valorPorLabel(ws, 'Reajuste tarifário anual')).toBeCloseTo(0.06, 6);
  });

  // 6. tarifa: `?? 1.18272801` não cai no fallback quando o valor é 0 (o
  // default real do campo), e o fallback fixo assumia CEMIG mesmo para
  // outra distribuidora.
  it('Tarifa sem preenchimento (0, o default real) usa a tarifa de referência da distribuidora do cliente, não 0 nem CEMIG fixo', () => {
    const ws = planilha({ cliente: { nome: 'X' }, consumo: { tarifaRealKWhComICMS: 0, codigoDistribuidora: 'COPEL' } }, 'Entradas');
    expect(valorPorLabel(ws, 'Tarifa real')).toBeCloseTo(1.0304, 6); // COPEL, não 0 nem 1.1827 (CEMIG)
  });

  it('Tarifa preenchida pelo usuário (>0) continua tendo prioridade sobre a referência da distribuidora', () => {
    const ws = planilha({ cliente: { nome: 'X' }, consumo: { tarifaRealKWhComICMS: 1.5, codigoDistribuidora: 'COPEL' } }, 'Entradas');
    expect(valorPorLabel(ws, 'Tarifa real')).toBeCloseTo(1.5, 6);
  });
});
