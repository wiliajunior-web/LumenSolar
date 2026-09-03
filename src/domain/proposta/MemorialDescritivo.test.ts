import { describe, it, expect } from 'vitest';
import { MemorialDescritivo } from './MemorialDescritivo';
import { extractPdfTextJoined, findNodesOfType } from './pdfTextTestHelper';
import { Sup } from './Superscript';

// MemorialDescritivo.tsx não tinha NENHUMA cobertura de teste antes desta
// rodada. Bugs descobertos por auditoria de subagente e confirmados lendo o
// arquivo inteiro (ago/2026).

function dataBase(overrides: any = {}) {
  return {
    empresa: { razaoSocial: 'Lumen Soluções Ltda', cnpj: '11.111.111/0001-11', responsavelTecnico: 'Eng. João Silva', crea: '123456', uf: 'MG' },
    cliente: { nome: 'Maria Oliveira', cidade: 'Araguari', uf: 'MG' },
    localizacao: { tipoTelhado: 'ceramico', inclinacaoGraus: 15, orientacaoPrincipal: 'Norte', desvioAzimuthalGraus: 0 },
    kit: {
      comprimentoMm: 2280, larguraMm: 1134, vocV: 49.5, modulosPorString: 10,
      marcaModulo: 'Trina', modeloModulo: 'Vertex', potenciaModuloWp: 550, tipoModulo: 'monocristalino',
      marcaInversor: 'Growatt', modeloInversor: 'MOD10KTL3', potenciaInversorKW: 10,
      faixaMpptMinV: 80, faixaMpptMaxV: 550, numMppt: 2, tensaoSaidaV: 220, eficienciaInversorPercent: 97.6,
    },
    consumo: { codigoDistribuidora: 'CEMIG', grupoTensao: 'B' },
    dimensionamento: {
      potenciaInstaladaRealKWp: 10.45, numeroModulos: 19,
      geracaoAnualEstimadaKWh: 16210.6, geracaoMensalEstimadaKWh: 1350.9,
    },
    indicadores: undefined,
    enquadramento: { classe: 'microgeracao' },
    ...overrides,
  };
}

describe('MemorialDescritivo — classe de geração e nível de tensão (capa + objetivo)', () => {
  // BUG CORRIGIDO (ago/2026): capa e texto de objetivo diziam sempre
  // "Microgeração...BT", independente de enquadramento.classe
  // (LIMITE_MICROGERACAO_KW=75kWp) e de consumo.grupoTensao.

  it('projeto Grupo B / microgeracao: capa e objetivo dizem "Microgeração" e "BT"', () => {
    const data = dataBase({ consumo: { codigoDistribuidora: 'CEMIG', grupoTensao: 'B' }, enquadramento: { classe: 'microgeracao' } });
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('Microgeração');
    expect(texto).toContain('BT');
    expect(texto).not.toContain('Minigeração');
    expect(texto).not.toContain('MINIGERAÇÃO');
  });

  it('projeto Grupo A / minigeracao (>75kWp): capa e objetivo dizem "Minigeração" e "MT", NÃO "Microgeração"/"BT"', () => {
    const data = dataBase({ consumo: { codigoDistribuidora: 'CEMIG', grupoTensao: 'A' }, enquadramento: { classe: 'minigeracao' } });
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('Minigeração');
    expect(texto).toContain('MINIGERAÇÃO');
    expect(texto).toContain('Média Tensão');
    expect(texto).not.toContain('Microgeração');
    expect(texto).not.toContain('MICROGERAÇÃO');
    expect(texto).not.toContain('Baixa Tensão');
  });
});

describe('MemorialDescritivo — citação normativa', () => {
  // BUG CORRIGIDO (ago/2026): o corpo do texto (seção OBJETIVO) citava
  // "RN no 482 da ANEEL" — norma SUPERSEDIDA. O próprio cabeçalho do arquivo
  // (linha 4, comentário) já citava corretamente "REN ANEEL 1000/2021", uma
  // inconsistência entre o comentário interno e o texto realmente impresso
  // no documento entregue à distribuidora.
  it('não cita mais "RN no 482" — cita REN ANEEL nº 1.000/2021', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).not.toContain('RN no 482');
    expect(texto).not.toContain('RN nº 482');
    // BUG CORRIGIDO (ago/2026): "no" (ASCII puro) em vez do símbolo "nº" —
    // ver mesma classe de bug em Procuracao.tsx.
    expect(texto).toContain('REN ANEEL nº 1.000/2021');
    expect(texto).not.toContain('REN ANEEL no 1.000/2021');
  });
});

describe('MemorialDescritivo — rodapé com cadastro de empresa incompleto', () => {
  // BUG CORRIGIDO (ago/2026): quando empresa.cnpj/responsavelTecnico/crea
  // estavam vazios, o rodapé de toda página imprimia o separador " - " nu,
  // sem o valor ("LUMEN SOLUÇÕES LTDA - CNPJ: -" / "- CREA-MG"). Ver
  // auditoria "geração de documentos" (ago/2026), item 11.

  it('empresa com CNPJ/responsavelTecnico/CREA vazios não deixa traço solto no rodapé', () => {
    const data = dataBase({ empresa: { razaoSocial: 'Lumen Soluções Ltda' } });
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).not.toContain('CNPJ: -');
    expect(texto).not.toContain('- CREA-MG ');
    expect(texto).not.toMatch(/-\s+-/); // dois separadores colados sem conteúdo entre eles
  });

  it('empresa completa mostra CNPJ e CREA normalmente no rodapé e na tabela de cabeçalho', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('CNPJ: 11.111.111/0001-11');
    // BUG CORRIGIDO (ago/2026): auditoria de design encontrou 3 formatos
    // DIFERENTES de CREA no mesmo documento — rodapé "CREA-MG 123456",
    // tabela "Empresa responsável" sem hífen "CREA 123456", e um caso real
    // que duplicava tudo ("CREA-MG CREA-MG 123456") quando o usuário já
    // digitava o prefixo. Unificado via formatarCrea() — mesmo formato em
    // TODO lugar do documento agora, sem duplicar se o valor já vier com o
    // prefixo. Ver domain/empresa/cadastroEmpresa.ts.
    expect(texto).toContain('CREA-MG 123456');
    expect(texto).not.toContain('CREA-MG CREA-MG');
  });

  it('caso real que motivou a correção: usuário já digita "CREA-MG 123456" no cadastro — nenhuma das 3 ocorrências duplica', () => {
    const data = dataBase({ empresa: {
      razaoSocial: 'Lumen Soluções Ltda', cnpj: '11.111.111/0001-11',
      responsavelTecnico: 'Eng. João Silva', crea: 'CREA-MG 123456', uf: 'MG',
    } });
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('CREA-MG 123456');
    expect(texto).not.toContain('CREA-MG CREA-MG');
    expect(texto).not.toContain('CREA CREA-MG');
  });
});

describe('MemorialDescritivo — formatação numérica e símbolos', () => {
  // BUG CORRIGIDO (ago/2026): valores elétricos do datasheet (Vmpp, Impp,
  // Voc, Isc, peso, eficiência) eram interpolados direto no template sem
  // passar pela localização pt-BR (fmtN/toLocaleString), saindo com ponto
  // decimal ("41.06 V") em vez de vírgula, mesmo com o resto do documento
  // (área, potência, geração) corretamente em pt-BR. E "m2"/"°C" saíam sem
  // o símbolo correto. Ver auditoria "geração de documentos", itens 9 e 10.

  it('Vmpp/Impp/Voc/Isc/peso/eficiência saem em pt-BR (vírgula), não em formato americano', () => {
    const data = dataBase({
      kit: {
        ...dataBase().kit,
        vmppV: 41.06, imppA: 15.01, vocV: 49.5, iscA: 13.85,
        pesoKgModulo: 34.5, corrMaxSaidaA: 13.6,
      },
    });
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('41,06 V');
    expect(texto).toContain('15,01 A');
    expect(texto).toContain('49,50 V');
    expect(texto).toContain('13,85 A');
    expect(texto).toContain('34,5 kg');
    expect(texto).toContain('13,60 A');
    expect(texto).toContain('97,6%'); // eficienciaInversorPercent do dataBase()
    expect(texto).not.toContain('41.06');
    expect(texto).not.toContain('15.01');
    expect(texto).not.toContain('34.5 kg');
  });

  // BUG CORRIGIDO (set/2026): este teste (ago/2026) verificava a string
  // "m²" no texto extraído — mas isso só prova que o caractere certo está
  // na árvore de elementos, não que a fonte usada no PDF de verdade tem um
  // glifo pra desenhá-lo (rasterizando o PDF real com pdftoppm e inspecionando
  // os pixels: "²" não desenha NADA em Helvetica/Helvetica-Bold, mesmo com
  // o caractere certo codificado — ver Superscript.tsx). Corrigido usando
  // <Sup> (um "2" ASCII normal, que desenha em qualquer fonte).
  it('área do telhado e área do módulo usam <Sup>, nunca o caractere "²" cru', () => {
    const data = dataBase();
    const arvore = MemorialDescritivo({ data });
    const texto = extractPdfTextJoined(arvore);
    expect(texto).not.toContain('²');
    expect(texto).not.toContain('m2');
    const sups = findNodesOfType(arvore, Sup);
    expect(sups.length).toBeGreaterThanOrEqual(2); // área do telhado (pág. localização) + área do módulo (tabela)
    sups.forEach(s => expect(s.children.join('')).toBe('2'));
  });

  it('coeficiente de temperatura sai com "°C", não "oC"', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).toContain('%/°C');
    expect(texto).not.toContain('%/oC');
  });
});
