import { describe, it, expect } from 'vitest';
import { MemorialDescritivo } from './MemorialDescritivo';
import { extractPdfTextJoined } from './pdfTextTestHelper';

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
  it('não cita mais "RN no 482" — cita REN ANEEL 1.000/2021', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(MemorialDescritivo({ data }));
    expect(texto).not.toContain('RN no 482');
    expect(texto).not.toContain('RN nº 482');
    expect(texto).toContain('REN ANEEL no 1.000/2021');
  });
});
