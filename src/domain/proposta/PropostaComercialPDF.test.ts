import { describe, it, expect } from 'vitest';
import { Image } from '@react-pdf/renderer';
import { PropostaComercialPDF } from './PropostaComercialPDF';
import { extractPdfTextJoined, extractPdfText, findNodesOfType } from './pdfTextTestHelper';
import { Sup } from './Superscript';

// Coleta todos os nós <Image> de uma árvore de elementos react-pdf (mesma
// estratégia de recursão do pdfTextTestHelper, mas devolvendo os PROPS de
// cada <Image> em vez do texto — precisamos inspecionar `src`/`style`, não
// texto). `Image` importado de '@react-pdf/renderer' é a mesma constante de
// string ('IMAGE') usada em `node.type` pelos elementos JSX compilados,
// então `node.type === Image` identifica o nó de forma confiável.
function findImages(node: any): any[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [];
  if (Array.isArray(node)) return node.flatMap(findImages);
  if (node && typeof node === 'object' && 'props' in node) {
    if (node.type === Image) return [node.props, ...findImages(node.props?.children)];
    if (typeof node.type === 'function') {
      try { return findImages(node.type(node.props ?? {})); } catch { return []; }
    }
    return findImages(node.props?.children);
  }
  return [];
}

// PropostaComercialPDF.tsx (o gerador realmente usado pelo botão "Gerar PDF
// Proposta" em App.tsx — nome de arquivo "Proposta_<cliente>_<data>.pdf",
// confirmado lendo gerarPDFCliente() em App.tsx; NÃO é PropostaPDF.tsx, que
// gera um documento técnico separado, "DocTecnica_...") não tinha NENHUMA
// cobertura de teste antes da rodada de ago/2026. Bugs descobertos por
// auditoria sobre PDF/JSON reais de um caso de cliente e confirmados lendo
// o arquivo inteiro.

// Alguns textos são compostos por múltiplos nós <Text> (ex: "...de {N} anos"
// vira 3 nós React separados: "...de ", N, " anos") — extractPdfTextJoined
// junta cada nó com um único espaço, então os espaços já presentes nas pontas
// de cada string somam com o espaço do join e viram espaço duplo no meio da
// frase. Normaliza para comparação, sem esconder problema de conteúdo real.
function normEspacos(s: string): string {
  return s.replace(/\s+/g, ' ');
}

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
      // Valores default reais de kitPadrao() (useProjetoStore.ts) — sem eles,
      // a seção "Garantias do fabricante" (pág. 2, ADICIONADO set/2026)
      // renderiza literalmente "undefined anos"/"undefined%" no PDF do
      // cliente, já que EntradaKit os declara `number` obrigatório mas este
      // fixture de teste não os tinha antes da auditoria de set/2026.
      garantiaProdutoAnos: 12, garantiaPotenciaAnos: 25, potenciaGarantidaPercent: 80,
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

describe('PropostaComercialPDF — símbolos m²/mm² (sobrescrito real, não o caractere "²" cru, set/2026)', () => {
  // BUG CORRIGIDO (set/2026): este teste (ago/2026) verificava a string
  // "m²"/"mm²" no texto extraído — mas extractPdfText só prova que o
  // CARACTERE certo está na árvore de elementos, não que existe um GLIFO
  // desenhado pra ele na fonte usada no PDF de verdade. Descoberto
  // rasterizando o PDF real (pdftoppm) e inspecionando os pixels: "²" não
  // desenha NADA nas fontes core deste app (Helvetica/Helvetica-Bold),
  // mesmo com o caractere certo codificado no PDF (o bug ficou escondido
  // desde ago/2026 porque a única verificação era justamente essa extração
  // de texto). Ver comentário completo em Superscript.tsx. Corrigido usando
  // um componente <Sup> (um "2" ASCII normal, que desenha em QUALQUER
  // fonte, com verticalAlign:'super' — propriedade real do
  // @react-pdf/renderer) em vez do caractere "²" cru — o teste certo agora
  // é "existe um nó <Sup> de verdade na árvore", não "a string extraída
  // contém ²".
  it('área no telhado e bitola dos cabos usam <Sup>, nunca o caractere "²" cru', () => {
    const data = dataBase({ indicadores: { ...dataBase().indicadores, areaNecessariaM2: 42.5 } });
    const arvore = PropostaComercialPDF({ data });
    const texto = extractPdfTextJoined(arvore);
    expect(texto).not.toContain('²'); // nunca mais o caractere quebrado
    expect(texto).not.toContain(' m2'); // nem a forma antiga sem sobrescrito
    expect(texto).not.toContain('6mm2');
    expect(texto).toContain('42,5'); // a base do número continua lá
    expect(texto).toContain('6mm');
    const sups = findNodesOfType(arvore, Sup);
    expect(sups.length).toBeGreaterThanOrEqual(2); // área no telhado + cabeamento
    sups.forEach(s => expect(s.children.join('')).toBe('2'));
  });
});

describe('PropostaComercialPDF — Garantias do fabricante (pág. 2, set/2026)', () => {
  // ADICIONADO junto com a auditoria de "PDF genérico" (set/2026): usa
  // kit.garantiaProdutoAnos/garantiaPotenciaAnos/potenciaGarantidaPercent —
  // campos já coletados em TabKit (App.tsx) mas nunca antes exibidos nesta
  // proposta. `EntradaKit` os declara `number` obrigatório (kitPadrao() já
  // preenche 12/25/80 por padrão), então não deveriam vir undefined em uso
  // normal — mas como o componente não tem guarda própria, um dado
  // incompleto (ex: caso salvo por uma versão muito antiga do app, antes de
  // esses campos existirem) apareceria como "undefined anos"/"undefined%"
  // literalmente no PDF do cliente. Teste de regressão explícito.
  it('com valores de garantia presentes: mostra os anos/percentual reais, nunca "undefined"', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('Garantias do fabricante');
    expect(texto).toContain('12 anos');
    expect(texto).toContain('25 anos');
    expect(texto).toContain('80%');
    expect(texto).not.toContain('undefined');
  });
});

describe('PropostaComercialPDF — opções de financiamento por caso (set/2026)', () => {
  // FUNCIONALIDADE ADICIONADA (set/2026, pedido direto do usuário: "devo
  // poder escolher se as simulações de financiamento vão sair na proposta
  // em cada caso específico"). `data.opcoesProposta.mostrarFinanciamentoNaProposta`
  // é opção de APRESENTAÇÃO (fica fora de EntradaPrecificacao/
  // assinaturaEntradasCalculo — ver useProjetoStore.ts), padrão `true` quando
  // ausente (compatibilidade com casos/arquivos antigos sem o campo).
  const simulacoes = [
    { descricao: 'Solfácil 48x', parcelaMensal: 320.15, totalPago: 15367.2, paybackAnos: 5.1 },
    { descricao: 'Solfácil 60x', parcelaMensal: 268.4, totalPago: 16104.0, paybackAnos: 5.4 },
  ];

  it('padrão (sem opcoesProposta definido): mostra as duas simulações Solfácil, como antes', () => {
    const data = dataBase({ indicadores: { ...dataBase().indicadores, simulacoesFinanciamento: simulacoes } });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('Investimento e financiamento');
    expect(texto).toContain('Opções de financiamento');
    expect(texto).toContain('Solfácil 48x');
    expect(texto).toContain('Solfácil 60x');
    expect(texto).toContain('Financiamento facilitado'); // card de benefício da pág. 1
  });

  it('mostrarFinanciamentoNaProposta=true (explícito): igual ao padrão', () => {
    const data = dataBase({
      indicadores: { ...dataBase().indicadores, simulacoesFinanciamento: simulacoes },
      opcoesProposta: { mostrarFinanciamentoNaProposta: true },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('Solfácil 48x');
    expect(texto).toContain('Solfácil 60x');
  });

  it('mostrarFinanciamentoNaProposta=false: some com os cards Solfácil e com o card de benefício "Financiamento facilitado"', () => {
    const data = dataBase({
      indicadores: { ...dataBase().indicadores, simulacoesFinanciamento: simulacoes },
      opcoesProposta: { mostrarFinanciamentoNaProposta: false },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toContain('Solfácil 48x');
    expect(texto).not.toContain('Solfácil 60x');
    expect(texto).not.toContain('Financiamento facilitado');
  });

  it('mostrarFinanciamentoNaProposta=false: título e rótulo da seção trocam para singular/à vista, e "À vista" continua aparecendo', () => {
    const data = dataBase({
      indicadores: { ...dataBase().indicadores, simulacoesFinanciamento: simulacoes },
      opcoesProposta: { mostrarFinanciamentoNaProposta: false },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('Investimento'); // título vira "Investimento" (sem "e financiamento")
    expect(texto).not.toContain('Investimento e financiamento');
    expect(texto).toContain('Condição de pagamento'); // rótulo da seção vira singular
    expect(texto).not.toContain('Opções de financiamento');
    expect(texto).toContain('À vista');
  });

  it('mostrarFinanciamentoNaProposta=false: card de benefício da pág. 1 vira "Baixa manutenção"', () => {
    const data = dataBase({
      indicadores: { ...dataBase().indicadores, simulacoesFinanciamento: simulacoes },
      opcoesProposta: { mostrarFinanciamentoNaProposta: false },
    });
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('Baixa manutenção');
  });

  it('mostrarFinanciamentoNaProposta=false MAS sem simulações calculadas: não lança exceção (guarda dupla — toggle E dado)', () => {
    const data = dataBase({ opcoesProposta: { mostrarFinanciamentoNaProposta: false } });
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
  });
});

describe('PropostaComercialPDF — gráfico de economia acumulada / payback (set/2026)', () => {
  // FUNCIONALIDADE ADICIONADA (set/2026, auditoria de "PDF genérico"): usa
  // `indicadores.fluxoAnualHorizonte` (fluxo de caixa ano-a-ano já calculado
  // por calcularFluxoCaixa()/calcularTudo(), antes descartado). fluxo[0] é o
  // investimento inicial NEGATIVO; fluxo[1..N] é a economia líquida anual.

  it('com fluxoAnualHorizonte presente: renderiza o título com o nº de anos correto e a legenda', () => {
    // 3 anos: -10000 investimento, depois 4000/ano => acumulado -6000,-2000,+2000 (payback no ano 3)
    const fluxo = [-10000, 4000, 4000, 4000];
    const data = dataBase({ indicadores: { ...dataBase().indicadores, fluxoAnualHorizonte: fluxo } });
    const texto = normEspacos(extractPdfTextJoined(PropostaComercialPDF({ data })));
    expect(texto).toContain('Economia acumulada ao longo de 3 anos');
    expect(texto).toContain('Saldo acumulado (economia menos investimento)');
    expect(texto).toContain('Ponto de equilíbrio (payback) — ano 3');
  });

  it('sem fluxoAnualHorizonte (indicadores antigos / caso legado): não renderiza a seção nem lança exceção', () => {
    const data = dataBase(); // indicadores sem fluxoAnualHorizonte, como em casos/arquivos salvos antes de set/2026
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toContain('Economia acumulada ao longo de');
  });

  it('fluxoAnualHorizonte com um único elemento (só o investimento, sem nenhum ano de retorno): não lança exceção e não renderiza o gráfico', () => {
    const data = dataBase({ indicadores: { ...dataBase().indicadores, fluxoAnualHorizonte: [-10000] } });
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toContain('Economia acumulada ao longo de');
  });

  it('fluxoAnualHorizonte vazio: não lança exceção e não renderiza o gráfico', () => {
    const data = dataBase({ indicadores: { ...dataBase().indicadores, fluxoAnualHorizonte: [] } });
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).not.toContain('Economia acumulada ao longo de');
  });

  it('payback nunca atingido no horizonte (sistema não se paga): não mostra rótulo de ponto de equilíbrio, mas mostra o restante do gráfico', () => {
    const fluxo = [-10000, 1000, 1000, 1000]; // acumulado fica sempre negativo
    const data = dataBase({ indicadores: { ...dataBase().indicadores, fluxoAnualHorizonte: fluxo } });
    const texto = normEspacos(extractPdfTextJoined(PropostaComercialPDF({ data })));
    expect(texto).toContain('Economia acumulada ao longo de 3 anos');
    expect(texto).not.toContain('Ponto de equilíbrio (payback)');
  });
});

describe('PropostaComercialPDF — faixa de marca no topo das páginas internas, sem foto cortada (set/2026)', () => {
  // BUG CORRIGIDO (set/2026): cliente reportou (com foto própria anexada,
  // que bateu com a arte padrão IMG_APOIO embutida) que o topo da pág. 2 da
  // Proposta ("Por que solar?") mostrava "uma imagem cortada, fica feio
  // esquisito esteticamente" e pediu algo "mais profissional" — "um banner
  // ou apenas a logo da empresa".
  //
  // Causa raiz: <Image src={empresa.fotoApoio || IMG_APOIO} style={{width:
  // '100%', height:110, objectFit:'cover', objectPosition:'center 60%'}} />
  // — um container de proporção 5,41:1 (595,28pt largura ÷ 110pt altura)
  // recortando uma foto de origem 1400×933px (proporção 1,5:1) cuja logo
  // fica no terço superior-esquerdo do quadro, não no centro. O recorte
  // agressivo + objectPosition puxando ainda mais pra baixo descartava a
  // logo inteira, sobrando só uma tira de telhado/painéis desconectada.
  //
  // Correção: banner fotográfico removido de TODAS as páginas internas (só
  // existia na pág. 1 antes; agora nenhuma tem foto de banner), substituído
  // por uma faixa de marca sólida (BrandBar: logo real da empresa OU
  // monograma dourado + nome + "PROPOSTA COMERCIAL"), que não depende da
  // proporção de nenhuma foto e por isso nunca corta nada.

  it('nenhum <Image> do documento usa a geometria de banner que causava o corte (largura 100% × altura 110pt)', () => {
    const data = dataBase();
    const imagens = findImages(PropostaComercialPDF({ data }));
    const bannerCortado = imagens.some(p => {
      const st = Array.isArray(p?.style) ? Object.assign({}, ...p.style) : (p?.style ?? {});
      return st.height === 110 && (st.width === '100%' || st.objectPosition === 'center 60%');
    });
    expect(bannerCortado).toBe(false);
  });

  it('sem empresa.fotoApoio nem empresa.logoBase64 cadastrados: só a imagem de capa (fotoCapa/IMG_CAPA) existe no documento inteiro — nenhuma foto no topo das páginas internas', () => {
    const data = dataBase(); // fixture não define fotoApoio nem logoBase64
    const imagens = findImages(PropostaComercialPDF({ data }));
    expect(imagens.length).toBe(1); // só o fundo full-bleed da capa
  });

  it('cada uma das 5 páginas internas mostra "PROPOSTA COMERCIAL" e o nome da empresa na faixa de marca do topo', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    // 5 páginas internas ("Por que solar", "Sistema", "Análise financeira",
    // "Investimento", "Condições") + a faixa de marca em cada uma delas.
    const ocorrencias = (texto.match(/PROPOSTA COMERCIAL/g) ?? []).length;
    expect(ocorrencias).toBe(5);
    expect(texto).toContain('LUMEN SOLAR'); // empresa.nomeFantasia em maiúsculas
  });

  it('sem nomeFantasia nem razaoSocial cadastrados: cai no fallback "ENERGIA SOLAR" e monograma "L", sem lançar exceção nem mostrar "undefined"', () => {
    const data = dataBase({ empresa: { ...dataBase().empresa, nomeFantasia: undefined, razaoSocial: undefined } });
    expect(() => PropostaComercialPDF({ data })).not.toThrow();
    const texto = extractPdfTextJoined(PropostaComercialPDF({ data }));
    expect(texto).toContain('ENERGIA SOLAR');
    expect(texto).not.toContain('undefined');
  });

  it('empresa.logoBase64 cadastrada: usa a logo real (um <Image> por página interna) em vez do monograma', () => {
    const data = dataBase({ empresa: { ...dataBase().empresa, logoBase64: 'data:image/png;base64,FAKE_LOGO' } });
    const imagens = findImages(PropostaComercialPDF({ data }));
    const logosNaFaixaDeMarca = imagens.filter(p => p.src === 'data:image/png;base64,FAKE_LOGO');
    expect(logosNaFaixaDeMarca.length).toBe(5); // uma por página interna
  });

  it('empresa.fotoApoio (campo legado/@deprecated) cadastrada NÃO volta a aparecer como banner — o campo é ignorado pela faixa de marca', () => {
    const data = dataBase({ empresa: { ...dataBase().empresa, fotoApoio: 'data:image/jpeg;base64,FAKE_BANNER_ANTIGO' } });
    const imagens = findImages(PropostaComercialPDF({ data }));
    expect(imagens.some(p => p.src === 'data:image/jpeg;base64,FAKE_BANNER_ANTIGO')).toBe(false);
  });
});
