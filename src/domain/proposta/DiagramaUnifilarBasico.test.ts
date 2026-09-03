import { describe, it, expect } from 'vitest';
import { DiagramaUnifilarBasico } from './DiagramaUnifilarBasico';
import { extractPdfTextJoined, findNodesOfType } from './pdfTextTestHelper';
import { Sup } from './Superscript';

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

// [BUG CORRIGIDO set/2026] achado auditando o DUB de um caso real (Ana Maria
// Vieira de Sá e Silva): a seção dos cabos saía "2.5mm2"/"4mm2" — "mm2" cru,
// sem sobrescrito — nos rótulos do diagrama E nas duas tabelas de proteção.
// A mesma classe de bug já tinha sido corrigida na Proposta Comercial
// (PropostaComercialPDF.test.ts, "símbolos m²/mm²") mas nunca chegou a ser
// auditada neste outro documento, que usa a mesma unidade.
// BUG CORRIGIDO (set/2026): o teste abaixo (set/2026, versão original)
// verificava a string "mm²" no texto extraído — mas isso só prova que o
// caractere certo está na árvore de elementos React, não que a fonte usada
// no PDF de verdade tem um glifo pra desenhá-lo. Descoberto rasterizando o
// PDF real deste EXATO documento (pdftoppm -> PNG) e inspecionando os
// pixels: a linha "Seção do cabo CA" saía visualmente "2.5 mm" — sem
// NENHUM sobrescrito, nem sequer um glifo ".notdef" visível, simplesmente
// em branco — porque "²"/"³" não desenham em nenhuma fonte core do
// @react-pdf/renderer (Helvetica/Helvetica-Bold/Times), mesmo com o
// caractere certo codificado no PDF (confirmado com pdftotext -layout, que
// EXTRAIU "mm²" corretamente do mesmo PDF cujo render visual não mostrava
// nada — prova que pdftotext só lê o mapa ToUnicode, não o glifo
// desenhado). Ver comentário completo em Superscript.tsx. Corrigido usando
// <Sup> (um "2" ASCII normal com verticalAlign:'super', que desenha em
// qualquer fonte) em vez do caractere "²" cru.
describe('DiagramaUnifilarBasico — símbolo mm² como sobrescrito real (não o caractere "²" cru, nem "mm2"), set/2026', () => {
  it('rótulos do diagrama e tabelas de proteção CA/CC usam <Sup>, nunca o caractere "²" cru nem "mm2"', () => {
    const data = dataBase();
    const arvore = DiagramaUnifilarBasico({ data });
    const texto = extractPdfTextJoined(arvore);
    expect(texto).not.toMatch(/²/);
    expect(texto).not.toMatch(/mm2\b/);
    expect(texto).toMatch(/mm/); // a base do texto continua lá
    const sups = findNodesOfType(arvore, Sup);
    // 2 rótulos no diagrama (Cabo CA, Cabo CC) + 2 linhas de tabela (Seção
    // do cabo CA, Seção do cabo CC) = 4 usos de <Sup> nesta página.
    expect(sups.length).toBe(4);
    sups.forEach(s => expect(s.children.join('')).toBe('2'));
  });
});
