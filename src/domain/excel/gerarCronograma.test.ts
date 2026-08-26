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
