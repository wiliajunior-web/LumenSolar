import { describe, it, expect } from 'vitest';
import { DiagramaUnifilarBasico } from './DiagramaUnifilarBasico';
import { extractPdfTextJoined } from './pdfTextTestHelper';

// DiagramaUnifilarBasico.tsx (DUB) não tinha NENHUMA cobertura de teste
// antes desta rodada. Bug descoberto por auditoria de subagente e
// confirmado lendo o arquivo inteiro (ago/2026).

function dataBase(overrides: any = {}) {
  return {
    empresa: { razaoSocial: 'Lumen Soluções Ltda', cnpj: '11.111.111/0001-11' },
    cliente: { nome: 'Maria Oliveira', cidade: 'Araguari', uf: 'MG' },
    localizacao: {},
    kit: {
      potenciaInversorKW: 10, tensaoSaidaV: 220, fatorPotencia: '>0.99',
      corrMaxSaidaA: 15.2, temperaturaInstalacaoC: 40, comprimentoCaboCAm: 10,
      iscA: 14.35, vocV: 49.5, numStrings: 2, modulosPorString: 10,
      tipoModulo: 'monocristalino', marcaInversor: 'Growatt', modeloInversor: 'MOD10KTL3',
      quantidade: 20, potenciaModuloWp: 550,
    },
    consumo: { tipoLigacao: 'trifasica' },
    ...overrides,
  };
}

describe('DiagramaUnifilarBasico — rótulo da distribuidora ("REDE ...")', () => {
  // BUG CORRIGIDO (ago/2026): os rótulos do bloco de rede e da faixa de
  // responsabilidade eram hardcoded como "REDE CEMIG", ignorando
  // data.consumo.codigoDistribuidora — um projeto de qualquer outra
  // distribuidora gerava um DUB identificando a rede errada, documento
  // efetivamente enviado à distribuidora real.

  it('codigoDistribuidora="COPEL" mostra "REDE COPEL", NÃO "REDE CEMIG"', () => {
    const data = dataBase({ consumo: { tipoLigacao: 'trifasica', codigoDistribuidora: 'COPEL' } });
    const texto = extractPdfTextJoined(DiagramaUnifilarBasico({ data }));
    expect(texto).toContain('REDE COPEL');
    expect(texto).not.toContain('REDE CEMIG');
  });

  it('codigoDistribuidora="CEMIG" mostra "REDE CEMIG" (comportamento correto p/ esse caso)', () => {
    const data = dataBase({ consumo: { tipoLigacao: 'trifasica', codigoDistribuidora: 'CEMIG' } });
    const texto = extractPdfTextJoined(DiagramaUnifilarBasico({ data }));
    expect(texto).toContain('REDE CEMIG');
  });

  it('codigoDistribuidora ausente/desconhecido cai no fallback "REDE CEMIG" sem quebrar', () => {
    const data = dataBase({ consumo: { tipoLigacao: 'trifasica' } });
    expect(() => DiagramaUnifilarBasico({ data })).not.toThrow();
    const texto = extractPdfTextJoined(DiagramaUnifilarBasico({ data }));
    expect(texto).toContain('REDE CEMIG');
  });
});
