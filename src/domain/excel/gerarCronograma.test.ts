import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync, readdirSync } from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');
import { gerarCronograma } from './gerarCronograma';

// Este arquivo não existia antes da auditoria de ago/2026. gerarCronograma.ts
// tinha ZERO cobertura de teste — o que deixou passar despercebido o bug
// corrigido nesta sessão em addWeeks(): `new Date("YYYY-MM-DD")` é meia-noite
// UTC, mas `.getDate()`/`.setDate()`/`.toLocaleDateString()` sem `timeZone`
// explícito usam o fuso LOCAL do processo Node — no Brasil (UTC-3), meia-noite
// UTC de um dia cai às 21h do dia ANTERIOR local, então toda data do
// cronograma saía um dia adiantada. O teste abaixo força TZ=America/Sao_Paulo
// (fuso onde o bug se manifestava) e verifica que a data de início e as datas
// de cada semana do Gantt batem exatamente com o informado — o teste teria
// falhado com o código antigo (mostraria 01/03/2026 em vez de 02/03/2026).

function limparArquivosGerados() {
  for (const f of readdirSync('.')) {
    if (f.startsWith('Cronograma_') && f.endsWith('.xlsx')) unlinkSync(f);
  }
}

describe('gerarCronograma — REGRESSÃO ago/2026: datas corretas independente do fuso horário local', () => {
  afterEach(() => limparArquivosGerados());

  it('com TZ=America/Sao_Paulo, data de início e semanas do Gantt não retrocedem um dia', () => {
    const tzOriginal = process.env.TZ;
    process.env.TZ = 'America/Sao_Paulo'; // UTC-3 — fuso onde o bug se manifestava

    try {
      gerarCronograma({
        nomeCliente: 'Teste Regressao TZ',
        enderecoInstalacao: 'Rua Teste, 123',
        dataInicio: '2026-03-02', // segunda-feira — escolhido arbitrariamente
        potenciaKWp: 10,
        numModulos: 19,
        empresa: 'Lumen Soluções Ltda',
        responsavelTecnico: 'Eng. Teste',
        tipoSistema: 'micro',
      });

      const gerados = readdirSync('.').filter(f => f.startsWith('Cronograma_') && f.endsWith('.xlsx'));
      expect(gerados.length).toBeGreaterThan(0);
      expect(existsSync(gerados[0])).toBe(true);

      const wb = XLSX.readFile(gerados[0]);
      const ws = wb.Sheets['Cronograma'];

      // Linha 4: "10 kWp | 19 módulos | Início: 02/03/2026"
      // Com o bug antigo, em UTC-3 isso apareceria como 01/03/2026.
      const linhaInicio = ws['A4'].v as string;
      expect(linhaInicio).toContain('02/03/2026');
      expect(linhaInicio).not.toContain('01/03/2026');

      // Cabeçalho da Semana 1 (linha 7, coluna F = mesma semana do início)
      const semana1 = ws['F7'].v as string;
      expect(semana1).toContain('02/03/2026');

      // Cabeçalho da Semana 2 (coluna G = +7 dias = 09/03/2026)
      const semana2 = ws['G7'].v as string;
      expect(semana2).toContain('09/03/2026');
      expect(semana2).not.toContain('08/03/2026'); // seria o resultado com o bug (um dia a menos)
    } finally {
      process.env.TZ = tzOriginal;
    }
  });

  it('não lança exceção com dados mínimos de sistema mini (prazos CEMIG diferentes)', () => {
    expect(() => gerarCronograma({
      nomeCliente: 'Cliente MiniGD',
      enderecoInstalacao: 'Rua X, 1',
      dataInicio: '2026-01-05',
      potenciaKWp: 80,
      numModulos: 145,
      empresa: 'Lumen Soluções Ltda',
      responsavelTecnico: 'Eng. Teste',
      tipoSistema: 'mini',
    })).not.toThrow();
  });
});

// [REGRESSÃO ago/2026 — rodada 10] só a duração da etapa "Análise CEMIG —
// Parecer de Acesso" variava com tipoSistema (3 semanas MicroGD / 6 semanas
// MiniGD) — as etapas seguintes (Instalação mecânica/elétrica,
// Comissionamento, Vistoria, Entrega) tinham semana FIXA, calibrada só para
// o caso MicroGD. Para MiniGD, isso agendava instalação para ANTES do
// Parecer de Acesso da CEMIG estar concluído. Ver comentário completo em
// gerarCronograma.ts.
describe('gerarCronograma — REGRESSÃO ago/2026 (rodada 10): instalação nunca agendada antes do Parecer de Acesso concluir', () => {
  afterEach(() => limparArquivosGerados());

  function gerarEler(tipoSistema: 'micro' | 'mini'): any {
    gerarCronograma({
      nomeCliente: `Cliente ${tipoSistema}`,
      enderecoInstalacao: 'Rua X, 1',
      dataInicio: '2026-01-05', // segunda-feira
      potenciaKWp: tipoSistema === 'micro' ? 10 : 80,
      numModulos: tipoSistema === 'micro' ? 19 : 145,
      empresa: 'Lumen Soluções Ltda',
      responsavelTecnico: 'Eng. Teste',
      tipoSistema,
    });
    // Filtra pelo nome do cliente: como o teste de comparação micro-vs-mini gera
    // os dois arquivos antes de limpar (afterEach só roda ao fim do `it`), um
    // filtro genérico por prefixo pegaria o primeiro arquivo em ordem alfabética
    // (ex.: "...Cliente_mini..." < "...Cliente_micro..." alfabeticamente é falso
    // — "mini" > "micro" — mas não se pode confiar em ordem alfabética aqui).
    const gerados = readdirSync('.').filter(f => f.startsWith(`Cronograma_Cliente_${tipoSistema}_`) && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(gerados[0]);
    return wb.Sheets['Cronograma'];
  }

  function linhaPorEtapa(ws: any, etapa: string): number {
    for (const key of Object.keys(ws)) {
      if (/^B\d+$/.test(key) && ws[key].v === etapa) return Number(key.slice(1));
    }
    throw new Error(`Etapa não encontrada: ${etapa}`);
  }

  function dataBR(s: string): Date {
    // "DD/MM/YYYY" (ou "S3\nDD/MM/YYYY") -> Date, só a parte da data
    const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)!;
    return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
  }

  for (const tipoSistema of ['micro', 'mini'] as const) {
    it(`tipoSistema="${tipoSistema}": Início da "Instalação mecânica" é NO MÍNIMO o Término da "Análise CEMIG — Parecer de Acesso"`, () => {
      const ws = gerarEler(tipoSistema);
      const linhaParecer = linhaPorEtapa(ws, 'Análise CEMIG — Parecer de Acesso');
      const linhaInstalacao = linhaPorEtapa(ws, 'Instalação mecânica (estrutura + módulos)');
      const terminoParecer = dataBR(ws[`E${linhaParecer}`].v);
      const inicioInstalacao = dataBR(ws[`D${linhaInstalacao}`].v);
      expect(inicioInstalacao.getTime()).toBeGreaterThanOrEqual(terminoParecer.getTime());
    });
  }

  it('tipoSistema="mini": Instalação mecânica começa mais tarde que em "micro" (cronograma realmente se ajusta ao prazo maior)', () => {
    const wsMicro = gerarEler('micro');
    const wsMini = gerarEler('mini');
    const inicioMicro = dataBR(wsMicro[`D${linhaPorEtapa(wsMicro, 'Instalação mecânica (estrutura + módulos)')}`].v);
    const inicioMini = dataBR(wsMini[`D${linhaPorEtapa(wsMini, 'Instalação mecânica (estrutura + módulos)')}`].v);
    expect(inicioMini.getTime()).toBeGreaterThan(inicioMicro.getTime());
  });
});
