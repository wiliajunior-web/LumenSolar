import { describe, it, expect } from 'vitest';
import { PropostaComercialPDF } from './PropostaComercialPDF';
import { extractPdfTextJoined, extractPdfText } from './pdfTextTestHelper';

// PropostaComercialPDF.tsx (o gerador realmente usado pelo botão "Gerar PDF
// Proposta" em App.tsx — nome de arquivo "Proposta_<cliente>_<data>.pdf",
// confirmado lendo gerarPDFCliente() em App.tsx; NÃO é PropostaPDF.tsx, que
// gera um documento técnico separado, "DocTecnica_...") não tinha NENHUMA
// cobertura de teste antes da rodada de ago/2026. Bugs descobertos por
// auditoria sobre PDF/JSON reais de um caso de cliente e confirmados lendo
// o arquivo inteiro.

function dataBase(overrides: any = {}) {
  return {
    empresa: {
      razaoSocial: 'Lumen Soluções Ltda', nomeFantasia: 'Lumen Solar',
      email: 'contato@lumen.eng.br', telefone: '(34) 99999-0000',
      validadeProposta: 15, responsavelTecnico: 'Eng. João Silva', crea: '123456', uf: 'MG',
    },
    cliente: { nome: 'Ana Maria', cidade: 'Araguari', uf: 'MG' },
    kit: {
      marcaModulo: 'Leapton', modeloModulo: 'LP182', potenciaModuloWp: 620, tipoModulo: 'monocristalino',
      quantidade: 12, marcaInversor: 'Growatt', modeloInversor: 'MIC3000TL-X2', potenciaInversorKW: 3,
      percentualCompensacaoDesejado: 1.5,
    },
    dimensionamento: {
      potenciaInstaladaRealKWp: 7.44, numeroModulos: 12,
      geracaoMensalEstimadaKWh: 645, percentualCompensacaoReal: 2.28, // 228% real do caso auditado
    },
    custosRecorrentes: { contaAntesRS: 360.24, economiaMensalRS: 204.97, totalFixoMensalRS: 155.27 },
    precificacao: { precoVenda: 12604.86 },
    enquadramento: { classe: 'microgeracao', elegivelArt26: true },
    percentuaisFioBPorAno: {},
    consumoMedioMensalKWh: 283, valorMedioMensalRS: 360.24,
    indicadores: { paybackSimples: '4,2 anos', economia25Anos: 61491, simulacoesFinanciamento: [] },
    consumo: { grupoTensao: 'B' },
    codigoDistribuidora: 'CEMIG',
    ...overrides,
  };
}

describe('PropostaComercialPDF — % de redução da conta (não confundir com razão geração/consumo)', () => {
  // BUG CORRIGIDO (ago/2026): "Reduza sua conta em ate X%" usava
  // dim.percentualCompensacaoReal (razão geração anual / consumo anual —
  // pode passar de 100% num sistema superdimensionado, ver
  // kit.percentualCompensacaoDesejado) em vez da redução real de conta
  // (economiaMensalRS / contaAntesRS), com risco de propaganda enganosa.
  // Valores do caso real auditado: percentualCompensacaoReal=2.28 (228%),
  // economiaMensalRS=204,97, contaAntesRS=360,24 => redução real = 56,9%.

  it('caso real auditado: mostra ~57%, não 228%', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('57%');
    expect(texto).not.toContain('228%');
  });

  it('sistema não superdimensionado (100% de compensação): redução de conta bate com economia/conta-antes', () => {
    const data = dataBase({
      custosRecorrentes: { contaAntesRS: 300, economiaMensalRS: 270, totalFixoMensalRS: 30 },
      dimensionamento: { ...dataBase().dimensionamento, percentualCompensacaoReal: 1.0 },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('90%'); // 270/300
  });

  it('redução nunca ultrapassa 100%, mesmo com economia calculada maior que a conta (dado inconsistente)', () => {
    const data = dataBase({
      custosRecorrentes: { contaAntesRS: 100, economiaMensalRS: 150, totalFixoMensalRS: 0 },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('100%');
    expect(texto).not.toContain('150%');
  });

  it('contaAntesRS zerada não gera NaN/Infinity na proposta', () => {
    const data = dataBase({
      custosRecorrentes: { contaAntesRS: 0, economiaMensalRS: 0, totalFixoMensalRS: 0 },
    });
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('Infinity');
  });
});

describe('PropostaComercialPDF — ícones dos benefícios (não mais texto cru em círculo)', () => {
  // BUG CORRIGIDO (ago/2026): os círculos de "Por que investir" mostravam
  // as abreviações cruas ("R$", "%", "UP", "CO", "60x", "25") como texto —
  // não era fonte de ícone quebrada, era o conteúdo real. Substituído por
  // ícones vetoriais (Svg/Path/Circle/Line/Polyline/Rect do próprio
  // @react-pdf/renderer). Aqui só é possível verificar que o texto cru NÃO
  // aparece mais nos nós de <Text> — a renderização visual do Svg em si
  // exigiria abrir o PDF (fora do alcance do pdfTextTestHelper, que só
  // percorre a árvore de texto).

  it('não renderiza mais "R$"/"UP"/"CO"/"60x" isolados como conteúdo dos círculos de benefício', () => {
    const data = dataBase();
    const nos = extractPdfText(PropostaComercialPDF({ data }));
    // "R$" e afins não devem aparecer como nó de texto isolado (o texto
    // corrido da proposta usa "R$ " sempre seguido de um valor, nunca como
    // token solto de 2-3 caracteres).
    expect(nos).not.toContain('R$');
    expect(nos).not.toContain('UP');
    expect(nos).not.toContain('CO');
    expect(nos).not.toContain('60x');
  });
});

describe('PropostaComercialPDF — rodapé e capa com cadastro incompleto', () => {
  // BUG CORRIGIDO (ago/2026): telefone/email vazios deixavam o separador
  // " - " nu no rodapé de toda página e na faixa da capa (ex: "Lumen Solar
  // - -" e "Válida por 15 dias - 28 de agosto de 2026 - -").

  it('empresa sem telefone/email não deixa traço solto no rodapé nem na capa', () => {
    const data = dataBase({
      empresa: { razaoSocial: 'Lumen Soluções Ltda', validadeProposta: 15 },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toMatch(/-\s+-/);
  });

  it('empresa completa mostra telefone e email normalmente no rodapé', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('contato@lumen.eng.br');
    expect(texto).toContain('(34) 99999-0000');
  });
});

describe('PropostaComercialPDF — símbolos m²/mm² (não m2/mm2)', () => {
  it('área no telhado e bitola dos cabos saem com sobrescrito correto', () => {
    const data = dataBase({ indicadores: { ...dataBase().indicadores, areaNecessariaM2: 42.5 } });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('m²');
    expect(texto).toContain('6mm²');
    expect(texto).not.toContain(' m2');
    expect(texto).not.toContain('6mm2');
  });
});
