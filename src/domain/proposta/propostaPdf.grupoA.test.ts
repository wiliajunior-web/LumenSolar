import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PropostaPDF, type PropostaData } from './PropostaPDF';
import { PropostaComercialPDF } from './PropostaComercialPDF';
import type { ResultadoGrupoA } from '@domain/dimensionamento/calcularGrupoA';

// PropostaPDF.tsx e PropostaComercialPDF.tsx (os dois PDFs de proposta —
// "Técnica" e "Proposta" respectivamente, ver botões em App.tsx) tinham ZERO
// cobertura de teste antes desta sessão. Isso é especialmente arriscado para
// a página AvisoGrupoA adicionada agora: um nome de campo errado ao ler
// `ResultadoGrupoA` (ex: `numModulos` em vez de `numeroModulos`) não
// apareceria no tsc porque `data: any`/props soltas não travam isso em tempo
// de compilação em todos os pontos — só um crash em tempo de execução ao
// gerar o PDF de um cliente Grupo A real. Teste .ts (não .tsx) via
// React.createElement porque vitest.config.ts só coleta `src/**/*.test.ts`.

const resultadoGrupoAExemplo: ResultadoGrupoA = {
  mediaConsumoFPkWh: 1000,
  mediaConsumoPkWh: 200,
  mediaTotalKWh: 1200,
  fatorCompensacaoFc: 1.5,
  geracaoNecessariaKWh: 1300,
  potenciaMinKWp: 10.056,
  potenciaRealKWp: 10.45,
  numeroModulos: 19,
  geracaoMensalKWh: 1350.9,
  geracaoAnualKWh: 16210.6,
  contaAntesRS: 2830,
  contaAposRS: 2350,
  economiaMensalRS: 480,
  economiaAnualRS: 5760,
  reducaoDemandaPossivel: false,
  custoDemandaBaseRS: 2000,
  custoUltrapassagemDemandaRS: 0,
  houveUltrapassagemDemanda: false,
  alertas: [],
  observacoes: ['Fc = TE_Ponta(0.6000) / TE_FP(0.4000) = 1.5000'],
};

const propostaDataBase: PropostaData = {
  empresa: { razaoSocial: 'Lumen Soluções Ltda', nomeFantasia: 'Lumen', validadeProposta: 15 } as any,
  cliente: { nome: 'Cliente Teste', cidade: 'Araguari', uf: 'MG' } as any,
  codigoDistribuidora: 'CEMIG',
  kit: {
    marcaModulo: 'Trina', modeloModulo: 'Vertex', potenciaModuloWp: 550, quantidade: 19,
    tipoModulo: 'bifacial_ntype', marcaInversor: 'Growatt', modeloInversor: 'MOD10KTL3',
    potenciaInversorKW: 10, custoKitRS: 18000,
  } as any,
  dimensionamento: {
    potenciaSistemaKWp: 10, numeroModulos: 19, potenciaInstaladaRealKWp: 10.45,
    geracaoMensalEstimadaKWh: 1350.9, geracaoAnualEstimadaKWh: 16210.6, percentualCompensacaoReal: 1.0,
  },
  custosRecorrentes: {
    taxaDisponibilidadeRS: 30, cipRS: 18, custoBFioMensalRS: 50, totalFixoMensalRS: 98,
    contaAntesRS: 800, contaAposRS: 98, economiaMensalRS: 702,
  },
  precificacao: {
    custoKit: 18000, custoEstrutura: 1500, custoMateriais: 2000, custoMaoDeObra: 3000,
    custoProjetoArt: 800, custoOutros: 0, custoTotalDireto: 25300, impostoSobreVenda: 1645,
    lucroLiquido: 4859, precoVenda: 31804, markupPercentual: 0.257, margemPercentual: 0.18,
  },
  enquadramento: { classe: 'microgeracao', elegivelArt26: true, regraEspecialArt27Paragrafo1: false, observacoes: [] },
  percentuaisFioBPorAno: {},
  consumoMedioMensalKWh: 500,
  valorMedioMensalRS: 590,
  aliquotaImpostos: 0.065,
  margemDesejada: 0.18,
  indicadores: undefined,
  contas: [],
};

describe('PropostaPDF — página AvisoGrupoA', () => {
  it('gera o PDF sem erro para cliente Grupo B (sem aviso)', async () => {
    const data: PropostaData = { ...propostaDataBase, consumo: { grupoTensao: 'B' } };
    const buf = await pdf(React.createElement(PropostaPDF, { data }) as any).toBuffer();
    expect(buf).toBeTruthy();
  });

  it('gera o PDF sem erro para cliente Grupo A (com página de aviso e resultadoGrupoA)', async () => {
    const data: PropostaData = {
      ...propostaDataBase,
      consumo: { grupoTensao: 'A' },
      resultadoGrupoA: resultadoGrupoAExemplo,
    };
    const buf = await pdf(React.createElement(PropostaPDF, { data }) as any).toBuffer();
    expect(buf).toBeTruthy();
  });

  it('gera o PDF sem erro para cliente Grupo A com alerta de ultrapassagem de demanda', async () => {
    const data: PropostaData = {
      ...propostaDataBase,
      consumo: { grupoTensao: 'A' },
      resultadoGrupoA: { ...resultadoGrupoAExemplo, houveUltrapassagemDemanda: true, custoUltrapassagemDemandaRS: 1200, alertas: ['Ultrapassagem de demanda: 30.0kW acima do contratado'] },
    };
    const buf = await pdf(React.createElement(PropostaPDF, { data }) as any).toBuffer();
    expect(buf).toBeTruthy();
  });
});

describe('PropostaComercialPDF — página AvisoGrupoA', () => {
  const dataComercialBase: any = {
    empresa: { razaoSocial: 'Lumen Soluções Ltda', nomeFantasia: 'Lumen', validadeProposta: 15 },
    cliente: { nome: 'Cliente Teste', cidade: 'Araguari', uf: 'MG' },
    codigoDistribuidora: 'CEMIG',
    kit: { marcaModulo: 'Trina', modeloModulo: 'Vertex', potenciaModuloWp: 550, quantidade: 19, marcaInversor: 'Growatt', modeloInversor: 'MOD10KTL3', potenciaInversorKW: 10 },
    dimensionamento: propostaDataBase.dimensionamento,
    custosRecorrentes: propostaDataBase.custosRecorrentes,
    precificacao: propostaDataBase.precificacao,
    enquadramento: propostaDataBase.enquadramento,
    percentuaisFioBPorAno: {},
    consumoMedioMensalKWh: 500,
    valorMedioMensalRS: 590,
    indicadores: null,
  };

  it('gera o PDF sem erro para cliente Grupo B (sem aviso)', async () => {
    const data = { ...dataComercialBase, consumo: { grupoTensao: 'B' } };
    const buf = await pdf(React.createElement(PropostaComercialPDF, { data }) as any).toBuffer();
    expect(buf).toBeTruthy();
  });

  it('gera o PDF sem erro para cliente Grupo A (com página de aviso e resultadoGrupoA)', async () => {
    const data = { ...dataComercialBase, consumo: { grupoTensao: 'A' }, resultadoGrupoA: resultadoGrupoAExemplo };
    const buf = await pdf(React.createElement(PropostaComercialPDF, { data }) as any).toBuffer();
    expect(buf).toBeTruthy();
  });

  // BUG CORRIGIDO (ago/2026): a página de capa usava uma <Image> de fundo
  // full-bleed (position:'absolute', width/height:'100%') seguida de uma
  // <View> irmã também absoluta (overlay com dados do cliente). O motor de
  // paginação do @react-pdf/renderer interpretava essa combinação como "nó
  // grande demais para caber e que não sabe quebrar entre páginas" — emite
  // `console.warn('Node of type IMAGE can't wrap between pages...')` e separa
  // o conteúdo: a imagem de fundo fica sozinha na página 1 e a <View> do
  // overlay (com nome do cliente, cidade, kWp, economia) é órfã numa página
  // 2 quase em branco. Resultado: o PDF entregue ao cliente tinha uma página
  // extra vazia logo após a capa, e a capa em si aparecia sem nenhuma
  // informação do cliente (pois o overlay tinha "vazado" pra página 2).
  // Fix: prop `fixed` na <Image> de capa (isenta o nó da paginação normal,
  // igual ao padrão já usado no rodapé <View style={S.footer} fixed>).
  // Esse fix expôs um segundo defeito, também corrigido: o overlay usava
  // `backgroundColor: 'rgba(0,0,0,0.72)'` (semi-transparente), deixando o
  // texto/ícones já embutidos na foto de capa (badges "INSTALAÇÃO",
  // "MANUTENÇÃO", "TECNOLOGIA" etc.) visíveis por baixo do texto dinâmico do
  // cliente — colisão visual. Fix: cor sólida e opaca (C.dark, já usada no
  // resto da paleta) em vez de rgba translúcido, eliminando qualquer chance
  // de vazamento da imagem por trás do texto, independente da posição exata
  // dos elementos gráficos embutidos na foto.
  // A suíte anterior só checava `expect(buf).toBeTruthy()`, o que não
  // detectava nenhum dos dois defeitos (o PDF continuava sendo gerado com
  // sucesso, só que com conteúdo/paginação errados). Este teste verifica a
  // causa raiz diretamente: nenhum warning de paginação deve ser emitido.
  it('capa não deve gerar warning de paginação do react-pdf (nó IMAGE não deve "vazar" pra página órfã)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const data = { ...dataComercialBase, consumo: { grupoTensao: 'B' } };
      const buf = await pdf(React.createElement(PropostaComercialPDF, { data }) as any).toBuffer();
      expect(buf).toBeTruthy();
      const mensagensDeAviso = warnSpy.mock.calls.map((args) => String(args[0]));
      const avisoDePaginacao = mensagensDeAviso.filter((m) => m.includes("can't wrap between pages"));
      expect(avisoDePaginacao).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
