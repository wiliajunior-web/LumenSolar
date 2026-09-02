import { create } from 'zustand';
import { dimensionarSistema, ajustarDimensionamentoParaQuantidadeReal } from '@domain/dimensionamento/dimensionar';
import { calcularPerdas } from '@domain/dimensionamento/calcularPerdas';
import { hspPorUF } from '@data/hspPorUF';
import { classificarEnquadramento, percentualFioBPorAno } from '@domain/fioB/calculoFioB';
import type { ResultadoEnquadramento } from '@domain/fioB/calculoFioB';
import type { ResultadoDimensionamento } from '@domain/dimensionamento/types';
import { DISTRIBUIDORAS, type TipoLigacao } from '@data/distribuidoras';
import { calcularCustosRecorrentes, projetarCustosAnuais, type ResultadoCustosRecorrentes } from '@domain/custosRecorrentes/calcularCustos';
import { calcularDimensionamentoGrupoA, type ResultadoGrupoA } from '@domain/dimensionamento/calcularGrupoA';
import { calcularPrecificacao } from '@domain/precificacao/calcularPrecificacao';
import type { ResultadoPrecificacao } from '@domain/precificacao/types';
import { DADOS_EMPRESA_PADRAO, type DadosEmpresa } from '@data/empresa';
import { calcularFluxoCaixa } from '@domain/financeiro/fluxoCaixa';
import { calcularTIR, calcularROI, formatarPayback, areaTotalNecessariaM2, pesoDistribuidoKgM2, simularFinanciamento, type SimulacaoFinanciamento } from '@domain/financeiro/indicadores';
import { geracaoMensalPorMes } from '@data/hspMensal';
import { LOCALIZACAO_PADRAO, type DadosLocalizacao } from '@data/localizacao';
import { PRESETS_MODULO, type TipoModuloPreset } from '@data/presetsModulo';
import {
  CHECKLIST_PADRAO_CEMIG_MICROGD,
  marcarItemGerado,
  marcarItemAnexado,
  type ItemChecklistDocumentacao,
} from '@domain/documentacaoCemig/checklist';

// BUG CORRIGIDO: `export { X } from 'Y'` é um re-export transparente — não
// cria um binding local. calcularTudo() (abaixo) usava PRESETS_MODULO como
// se estivesse importado, o que lançaria ReferenceError em tempo de
// execução. Precisa do import acima E do export abaixo (consumido por
// App.tsx) simultaneamente.
export { PRESETS_MODULO, type TipoModuloPreset };

export interface DadosCliente {
  nome: string;
  cpf: string;
  rg: string;
  /**
   * BUG CORRIGIDO (ago/2026): auditoria de design dos documentos gerados
   * encontrou que a Procuração afirma "solteiro(a)" como fato jurídico do
   * cliente em TODA geração — não porque o usuário informou isso, mas
   * porque `estadoCivil` sempre iniciava como `'solteiro'` (valor-padrão
   * do store) e NENHUMA aba da UI tinha campo para alterá-lo (mesma classe
   * de bug já corrigida para `bairro`/`cep` — ver comentário abaixo). Um
   * documento com efeito legal não deve afirmar um dado nunca confirmado
   * pelo usuário. `''` (vazio) agora é um estado real e distinto de
   * "solteiro" — TabCliente (App.tsx) tem um <select> com opção em branco,
   * e Procuracao.tsx já cai no placeholder "____________" para qualquer
   * valor fora do mapa (`''` incluso), sem precisar de nenhuma mudança lá.
   */
  estadoCivil: '' | 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';
  profissao: string;
  endereco: string;   // rua e número (logradouro) — bairro/CEP são campos próprios abaixo
  /**
   * CORRIGIDO (ago/2026): antes não existia — `gerarFormularioCemig.ts` já
   * lia `cliente?.bairro` (célula obrigatória E22 do Formulário CEMIG
   * MicroGD, Seção 1), mas o campo nunca existiu em `DadosCliente` nem tinha
   * input na UI — a leitura sempre resolvia `undefined` e a célula do
   * formulário oficial saía em branco para qualquer proposta gerada pelo
   * app. Formalizado como campo próprio (não dá pra extrair de forma
   * confiável a partir de `endereco` combinado).
   */
  bairro: string;
  /** Ver comentário de `bairro` acima — mesmo bug, célula AS22 (CEP). */
  cep: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
}

export interface ContaMensal { mes: string; kWh: number; valorRS: number; }

export interface EntradaConsumo {
  contas: ContaMensal[];
  codigoDistribuidora: string;
  tipoLigacao: TipoLigacao;
  cipMensalRS: number;
  /**
   * Tarifa real da conta de energia (R$/kWh), conforme valor na fatura.
   * Se 0, usa a tarifa de referência da distribuidora no banco de dados.
   * SEMPRE prefira o valor da conta: é mais preciso que o banco de dados.
   */
  tarifaRealKWhComICMS: number;
  // ── Grupo A — Média Tensão (ver @domain/dimensionamento/calcularGrupoA) ──
  // Adicionados formalmente à interface em ago/2026: antes só existiam no
  // objeto default do estado, acessados via `(s.consumo as any)` em toda a
  // UI — o que também é a razão de calcularTudo() nunca ter usado esses
  // campos (não apareciam no tipo que calcularTudo() enxergava).
  /** 'B' = Baixa Tensão (residencial/comercial padrão). 'A' = Média Tensão. */
  grupoTensao: 'B' | 'A';
  agrupamentoAtivo: boolean;
  unidadesConsumidoras: Array<{ id: string; historico: number[]; tipoLigacao: string; percentualCredito: number }>;
  /** Histórico de consumo fora de ponta por mês (kWh) — Grupo A. */
  historicoFP: number[];
  /** Histórico de consumo em ponta por mês (kWh) — Grupo A. */
  historicoP: number[];
  /** TE Ponta (R$/kWh) — só a parcela de Tarifa de Energia, sem TUSD. */
  tePontaKWh: number;
  /** TE Fora Ponta (R$/kWh). */
  teForaPontaKWh: number;
  /** TUSD Ponta (R$/kWh). */
  tusdPontaKWh: number;
  /** TUSD Fora Ponta (R$/kWh). */
  tusdForaPontaKWh: number;
  /** Tarifa de demanda contratada (R$/kW). */
  tarifaDemandaKW: number;
  /** Demanda contratada (kW). */
  demandaContratadaKW: number;
  /** Demanda medida no ciclo atual (kW) — opcional, usada para alerta de redução e cobrança de ultrapassagem. */
  demandaMedidaFPkW: number;
}

export interface EntradaKit {
  // Kit geral
  tipoModulo: TipoModuloPreset;
  marcaModulo: string; modeloModulo: string;
  potenciaModuloWp: number; quantidade: number;
  marcaInversor: string; modeloInversor: string;
  potenciaInversorKW: number;
  eficienciaInversorPercent: number;
  custoKitRS: number;
  dataProtocoloAcesso: string;
  // Specs técnicas do módulo (datasheet) — para memorial descritivo
  vmppV: number;          // Tensão de máxima potência (V)
  imppA: number;          // Corrente de máxima potência (A)
  vocV: number;           // Tensão de circuito aberto (V)
  iscA: number;           // Corrente de curto-circuito (A)
  comprimentoMm: number;  // Comprimento do módulo (mm)
  larguraMm: number;      // Largura do módulo (mm)
  pesoKgModulo: number;   // Peso de cada módulo (kg)
  certificacoes: string;  // Ex: "INMETRO, IEC 61215, IEC 61730"
  garantiaProdutoAnos: number; // Garantia contra defeitos (anos)
  garantiaPotenciaAnos: number; // Garantia de potência linear (anos)
  potenciaGarantidaPercent: number; // % de potência garantida ao final (ex: 80)
  // Configuração de strings
  numStrings: number;       // Número de strings (fileiras) em paralelo
  modulosPorString: number; // Módulos em série por string
  // Specs do inversor (datasheet) — para memorial
  faixaMpptMinV: number;    // Tensão mínima da faixa MPPT
  faixaMpptMaxV: number;    // Tensão máxima da faixa MPPT
  tensaoMaxEntradaV: number; // Tensão máxima de entrada CC
  tensaoSaidaV: number;     // Tensão nominal de saída CA (ex: 220)
  corrMaxSaidaA: number;    // Corrente máxima de saída CA
  /**
   * Corrente máxima por entrada MPPT (A) — datasheet do inversor. Usada pelo
   * Critério 3 do FDI (calcularFDI.ts): N_strings_por_MPPT × Isc ≤ Imax_MPPT.
   * Formalizado na interface em ago/2026: já existia no objeto de estado
   * inicial (default 0) e tinha input próprio em App.tsx, mas só era acessado
   * via `(kit as any).corrMaxMpptA` em todo o app — nunca esteve no tipo.
   */
  corrMaxMpptA: number;
  numMppt: number;          // Número de rastreadores MPPT
  ipGabinete: string;       // Grau de proteção (ex: IP65)
  fatorPotencia: string;    // Ex: ">0.99"
  thd: string;              // Distorção harmônica (ex: "<3%")
  // Estratégia de dimensionamento
  percentualCompensacaoDesejado?: number; // 1.0 = cobrir 100% do consumo; >1 = superdimensionar
  motivoSuperdimensionamento?: string;    // justificativa quando percentual > 1.0
  /**
   * Formalizados na interface em ago/2026 (mesmo padrão de `corrMaxMpptA`
   * acima): já existiam no objeto de estado inicial e tinham input próprio
   * em App.tsx, mas eram acessados via `(kit as any).campo` em todo o app —
   * nunca estiveram no tipo. Isso é o que permitiu `novaProposta()` (App.tsx)
   * resetar o kit com um literal parcial sem que o TypeScript acusasse os
   * campos faltando — ver BUG CORRIGIDO no reset de `novaProposta()`.
   */
  /** Comprimento do cabo CA: inversor → QDG (m) — usado por calcularCaboCA/DUB. */
  comprimentoCaboCAm: number;
  /** Temperatura ambiente/telhado (°C) — usada por calcularCaboCA e calcularProtecaoCC. */
  temperaturaInstalacaoC: number;
  /** Potência atual (kWp) já instalada — só relevante em expansão de usina existente (GD com alteração de potência). */
  potenciaAtualKWp: number;
  /** Data do protocolo de acesso ORIGINAL — só relevante em expansão de usina existente. */
  dataProtocoloOriginal: string;
  // ADICIONADO (set/2026, pedido direto do usuário: "anexar o datasheet do
  // equipamento de forma que o selo INMETRO dele já esteja lá" / "link do
  // equipamento... para consulta a posteriori"): `certificacoes` (acima) já
  // registrava a certificação como TEXTO livre — sem nenhuma prova
  // verificável por trás. Estes 4 campos guardam a prova de verdade: uma
  // CÓPIA local do PDF do datasheet (caminho — ver `salvarArquivoNativo` em
  // ImportarDatasheet/App.tsx, grava na mesma pasta configurável em ⚙
  // Configurações) e/ou um link (URL da página do fabricante, por exemplo).
  // Os dois são opcionais e independentes — o usuário pode preencher só um.
  /** Caminho local da cópia do datasheet do módulo (PDF), salva ao usar "Importar Datasheet" ou "Anexar". */
  datasheetModuloCaminho?: string;
  /** Link/URL de referência do módulo (página do fabricante, loja, etc.) — opcional, digitado manualmente. */
  datasheetModuloLink?: string;
  /** Caminho local da cópia do datasheet do inversor (PDF). */
  datasheetInversorCaminho?: string;
  /** Link/URL de referência do inversor — opcional, digitado manualmente. */
  datasheetInversorLink?: string;
  // FORMALIZADOS (set/2026, auditoria ao responder "como faço a IA reconhecer
  // TUDO que foi anexado" — pergunta direta do usuário): estes 2 campos já
  // eram devolvidos pela extração por IA do datasheet do módulo
  // (ImportarDatasheet, App.tsx) só que com nomes que NÃO batiam com nenhum
  // campo desta interface (`coefTempPmaxPorCent`, sem equivalente aqui) — o
  // JSON extraído era passado direto pra `atualizarKit(dados: any)`, que
  // aceita qualquer coisa porque `dados` é `any` (TypeScript não pega excesso
  // de propriedade em variável tipada `any`). Resultado prático: o
  // coeficiente de temperatura e o NOCT REAIS do datasheet do cliente eram
  // extraídos com sucesso pela IA e então IGNORADOS — `calcularTudo()`
  // (abaixo) sempre usava um valor GENÉRICO de preset (`PRESETS_MODULO`,
  // baseado só no dropdown "tipo de módulo": mono/poli/bifacial etc.), nunca
  // o valor real do equipamento comprado. Isso subestima ou superestima a
  // perda por temperatura de verdade (ver fórmula Tcél=Tamb+(NOCT-20) em
  // calcularPerdas.ts) sem nenhum aviso — o mesmo padrão "implementado mas
  // nunca chega a ser usado" do botão ImportarDatasheet que nunca era
  // renderizado. Corrigido: `noct` já batia por coincidência com o nome
  // usado em `EspecificacoesModulo`/`PresetModulo`; `coeficienteTemperaturaPmaxPercent`
  // foi renomeado no prompt de extração (App.tsx) pra bater com este campo.
  // Ambos ficam OPCIONAIS — quando ausentes, `calcularTudo()` cai de volta
  // no preset genérico (comportamento antigo, preservado para todo kit sem
  // datasheet importado).
  /** Coeficiente de temperatura de Pmax real do módulo (%/°C, negativo) — do datasheet. Ex.: -0.29. Sobrepõe o preset genérico em calcularTudo() quando preenchido. */
  coeficienteTemperaturaPmaxPercent?: number;
  /** NOCT real do módulo (°C) — do datasheet. Ex.: 45. Sobrepõe o preset genérico em calcularTudo() quando preenchido. */
  noct?: number;
  /**
   * Tipo do inversor conforme identificado pela IA no datasheet — já era
   * usado em App.tsx (badge "⚡ Microinversor"/"🔋 Híbrido"/"🔌 Inversor
   * String") mas só via `(kit as any).tipoInversor`, o MESMO padrão que já
   * causou um bug real antes (ver comentário de `corrMaxMpptA` acima: campos
   * acessados só via `as any`, nunca no tipo, sobreviveram sem o TypeScript
   * conseguir avisar quando `novaProposta()`/importação esquecessem de
   * resetá-los). Formalizado aqui pelo mesmo motivo.
   */
  tipoInversor?: 'string' | 'microinversor' | 'hibrido';
}

export interface EntradaPrecificacao {
  estruturaRS: number; materiaisEletricosRS: number;
  maoDeObraRS: number; projetoArtRS: number; outrosCustosRS: number;
  aliquotaImpostos: number; margemDesejada: number;
}

// ADICIONADO (set/2026, pedido direto do usuário: "devo poder escolher se as
// simulações de financiamento vão sair na proposta em cada caso específico"):
// antes desta mudança, `PropostaComercialPDF` (a proposta comercial enviada
// ao cliente) sempre mostrava as opções Solfácil 48×/60× quando
// `indicadores.simulacoesFinanciamento` existia — o que é sempre, porque
// `calcularTudo()` roda as duas simulações incondicionalmente. Não havia
// nenhuma forma de omitir essa seção para um caso específico (ex: cliente
// que já avisou que paga à vista, ou cujo perfil não combina com oferecer
// parcelamento). Deliberadamente FORA de `EntradaPrecificacao`/não faz parte
// de `assinaturaEntradasCalculo()` (useProjetoStore.ts) — é uma opção de
// APRESENTAÇÃO do documento, não uma entrada de CÁLCULO; incluir aqui faria
// o app pedir "recalcule antes de gerar" só por causa de um checkbox
// cosmético, sem nenhum número ter mudado de verdade.
export interface OpcoesProposta {
  /** Se falso, a seção "Opções de financiamento" (Solfácil 48×/60×) não aparece na Proposta Comercial (PDF) deste caso. Padrão: true (preserva o comportamento anterior). */
  mostrarFinanciamentoNaProposta: boolean;
}

export function opcoesPropostaPadrao(): OpcoesProposta {
  return { mostrarFinanciamentoNaProposta: true };
}

export interface IndicadoresFinanceiros {
  tirAnualPercent: number | null;
  roiMultiplo: number;
  paybackSimples: string;
  /** Valor numérico bruto (anos, fracionário) por trás de `paybackSimples` — null se não paga em 25 anos. Para uso em planilhas/exportações que precisam de número, não texto formatado. */
  paybackSimplesAnos: number | null;
  paybackDescontado: string;
  economiaTotalHorizonte: number;
  economia25Anos: number;
  areaNecessariaM2: number;
  pesoDistribuidoKgM2: number;
  geracaoMensalKWh: number[];
  simulacoesFinanciamento: SimulacaoFinanciamento[];
  /**
   * ADICIONADO (set/2026, auditoria de design da Proposta Comercial — usuário
   * relatou "o PDF ficou muito genérico... o gráfico de barras não ocupa
   * sequer toda a largura da página"): `calcularFluxoCaixa()` já computava
   * este array (fluxo de caixa ano a ano, índice 0 = investimento inicial
   * negativo, índices 1..25 = economia líquida de cada ano, já considerando
   * degradação dos módulos + reajuste tarifário + escalonamento real do Fio
   * B ano a ano) só para extrair payback/TIR/VPL — o array em si nunca saía
   * da função `calcularTudo()`. Ao investigar por que a página "Análise
   * financeira" da proposta tinha ~55% da página em branco, esse foi o dado
   * mais óbvio faltando: um gráfico de economia acumulada/ponto de equilíbrio
   * é o gráfico mais padrão de qualquer proposta financeira de energia solar,
   * e os dados pra ele já existiam prontos — só não saíam do store. Formalizado
   * aqui para a Proposta Comercial (PropostaComercialPDF.tsx) poder desenhar
   * esse gráfico sem duplicar o cálculo.
   */
  fluxoAnualHorizonte: number[];
}

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Estado padrão ("nova proposta") — FÁBRICAS, não constantes congeladas ──
// BUG CORRIGIDO (ago/2026): `novaProposta()` em App.tsx montava seu próprio
// literal parcial de `cliente`/`consumo`/`kit`/`preco` para resetar o store,
// em vez de reusar o mesmo default do estado inicial da store — exatamente o
// padrão "mesma lógica reimplementada em dois lugares diverge" encontrado
// repetidamente nesta auditoria (Fio B em App.tsx/gerarExcel.ts, etc.). O
// literal de `novaProposta()` estava desatualizado: faltavam por completo
// `grupoTensao/agrupamentoAtivo/unidadesConsumidoras/historicoFP/historicoP/
// tePontaKWh/teForaPontaKWh/tusdPontaKWh/tusdForaPontaKWh/tarifaDemandaKW/
// demandaContratadaKW/demandaMedidaFPkW` em `consumo`, e `corrMaxMpptA/
// percentualCompensacaoDesejado/motivoSuperdimensionamento/comprimentoCaboCAm/
// temperaturaInstalacaoC/potenciaAtualKWp/dataProtocoloOriginal` em `kit` — o
// `as any` no `setState(...)` escondia isso do TypeScript. Resultado prático:
// ao clicar "+ Nova Proposta" depois de uma proposta Grupo A, `grupoTensao`
// ficava `undefined` (não voltava a `'B'`) — o toggle Grupo A/B (painel
// Consumo) ficava sem nenhum botão selecionado, e o `<select>` de
// `motivoSuperdimensionamento` virava um controlled→uncontrolled input.
//
// Fábricas (funções, não objetos) porque `kit.dataProtocoloAcesso` usa
// `new Date()` — um objeto congelado no topo do módulo travaria essa data no
// momento em que o app foi ABERTO, não no momento em que "Nova Proposta" foi
// clicada (app Electron pode ficar aberto por dias). Usadas tanto pelo
// estado inicial da store quanto por `novaProposta()` em App.tsx — agora é
// impossível as duas divergirem de novo.
export function clientePadrao(): DadosCliente {
  return { nome:'', cpf:'', rg:'', estadoCivil:'', profissao:'', endereco:'', bairro:'', cep:'', telefone:'', email:'', cidade:'', uf:'MG' };
}

export function consumoPadrao(): EntradaConsumo {
  return {
    contas: MESES.map(mes => ({ mes, kWh:0, valorRS:0 })),
    codigoDistribuidora: 'CEMIG',
    tipoLigacao: 'monofasica',
    cipMensalRS: 18,
    tarifaRealKWhComICMS: 0,
    // Grupo A — Média Tensão
    grupoTensao: 'B',
    agrupamentoAtivo: false,
    unidadesConsumidoras: [],
    historicoFP: [],
    historicoP: [],
    tePontaKWh: 0,
    teForaPontaKWh: 0,
    tusdPontaKWh: 0,
    tusdForaPontaKWh: 0,
    tarifaDemandaKW: 0,
    demandaContratadaKW: 0,
    demandaMedidaFPkW: 0,
  };
}

export function kitPadrao(): EntradaKit {
  return {
    tipoModulo: 'bifacial_ntype',
    marcaModulo:'', modeloModulo:'',
    potenciaModuloWp:550, quantidade:0,
    marcaInversor:'', modeloInversor:'',
    potenciaInversorKW:0, eficienciaInversorPercent:98.4,
    custoKitRS:0,
    dataProtocoloAcesso: new Date().toISOString().slice(0,10),
    // Specs módulo
    vmppV:0, imppA:0, vocV:0, iscA:0,
    comprimentoMm:0, larguraMm:0, pesoKgModulo:0,
    certificacoes:'INMETRO, IEC 61215, IEC 61730',
    garantiaProdutoAnos:12, garantiaPotenciaAnos:25, potenciaGarantidaPercent:80,
    // Strings
    numStrings:1, modulosPorString:1,
    // Specs inversor
    faixaMpptMinV:0, faixaMpptMaxV:0, tensaoMaxEntradaV:0,
    tensaoSaidaV:220, corrMaxSaidaA:0, numMppt:1, corrMaxMpptA:0,
    ipGabinete:'IP65', fatorPotencia:'>0.99', thd:'<3%',
    percentualCompensacaoDesejado:1.0, motivoSuperdimensionamento:'',
    // Cabo CA e proteção (NBR 5410)
    comprimentoCaboCAm:10, temperaturaInstalacaoC:40,
    // Expansão de usina existente (GD Existente COM Alteração de Potência)
    potenciaAtualKWp:0, dataProtocoloOriginal:'',
  };
}

export function precoPadrao(empresa: DadosEmpresa): EntradaPrecificacao {
  return {
    estruturaRS:0, materiaisEletricosRS:0, maoDeObraRS:0,
    projetoArtRS: empresa.valorProjetoArt, outrosCustosRS:0,
    aliquotaImpostos: empresa.aliquotaImpostos, margemDesejada: empresa.margemPadrao,
  };
}

/**
 * "Assinatura" das entradas que alimentam `calcularTudo()` — usada para
 * detectar quando os resultados calculados (dimensionamento/indicadores/
 * documentos) ficaram DESATUALIZADOS em relação aos dados atuais do projeto.
 * Ver BUG CORRIGIDO no comentário de `ultimoCalculoAssinatura` abaixo.
 */
export function assinaturaEntradasCalculo(s: Pick<ProjetoState, 'cliente'|'consumo'|'kit'|'empresa'|'preco'>): string {
  return JSON.stringify({ cliente: s.cliente, consumo: s.consumo, kit: s.kit, empresa: s.empresa, preco: s.preco });
}

interface ProjetoState {
  empresa: DadosEmpresa;
  cliente: DadosCliente;
  consumo: EntradaConsumo;
  localizacao: DadosLocalizacao;
  kit: EntradaKit;
  preco: EntradaPrecificacao;
  /** Opções de APRESENTAÇÃO do documento (não de cálculo) — ver comentário completo em `OpcoesProposta`. */
  opcoesProposta: OpcoesProposta;
  consumoMedioMensalKWh: number | null;
  valorMedioMensalRS: number | null;
  dimensionamento: ResultadoDimensionamento | null;
  enquadramento: ResultadoEnquadramento | null;
  custosRecorrentes: ResultadoCustosRecorrentes | null;
  precificacao: ResultadoPrecificacao | null;
  percentuaisFioBPorAno: Record<number, number>;
  detalhamentoPerdas: string[];
  indicadores: IndicadoresFinanceiros | null;
  /**
   * Dimensionamento/análise financeira Grupo A (média tensão), calculado
   * quando consumo.grupoTensao === 'A' — ver @domain/dimensionamento/
   * calcularGrupoA.ts. IMPORTANTE (ago/2026): ainda não alimenta
   * `dimensionamento`/`custosRecorrentes`/os PDFs/Excel — aqueles continuam
   * calculados como Grupo B. Só é exibido no painel "Grupo A" da tela de
   * Consumo. Não gerar proposta para cliente Grupo A a partir dos documentos
   * do app enquanto essa integração não for concluída (ver README).
   */
  resultadoGrupoA: ResultadoGrupoA | null;
  checklistDocumentacao: ItemChecklistDocumentacao[];
  /**
   * BUG CORRIGIDO (ago/2026): `calcularTudo()` só roda quando o usuário clica
   * "Calcular resultado completo" (aba Preço) — por desenho, não recalcula a
   * cada tecla digitada. Mas nada impedia o usuário de, DEPOIS de calcular,
   * voltar para Consumo/Kit/Preço, editar um valor (distribuidora, tarifa,
   * quantidade de módulos, margem...) e ir direto para a aba Resultado (ou
   * gerar um PDF/Excel) sem recalcular — a navegação lateral não é bloqueada
   * por etapa. `dimensionamento`/`indicadores`/etc. continuavam com os
   * números do cálculo ANTERIOR, e o guard existente em TabResultado
   * (`!s.dimensionamento`) só protege contra "nunca calculou", não contra
   * "calculou, mas os dados mudaram depois" — resultado: proposta entregue
   * ao cliente com economia/payback/TIR calculados a partir de uma tarifa ou
   * quantidade de módulos que já não é a que aparece no resto do mesmo
   * documento. Guarda a assinatura (`assinaturaEntradasCalculo`) das
   * entradas no momento do último cálculo bem-sucedido; comparada contra a
   * assinatura atual em App.tsx (`calculoDesatualizado`) para avisar o
   * usuário e bloquear a geração de documentos até recalcular.
   */
  ultimoCalculoAssinatura: string | null;

  atualizarEmpresa: (p: Partial<DadosEmpresa>) => void;
  atualizarCliente: (p: Partial<DadosCliente>) => void;
  atualizarConsumo: (p: Partial<EntradaConsumo>) => void;
  atualizarConta: (i: number, p: Partial<ContaMensal>) => void;
  adicionarConta: () => void;
  removerConta: (i: number) => void;
  atualizarLocalizacao: (p: Partial<DadosLocalizacao>) => void;
  atualizarKit: (p: Partial<EntradaKit>) => void;
  atualizarPreco: (p: Partial<EntradaPrecificacao>) => void;
  atualizarOpcoesProposta: (p: Partial<OpcoesProposta>) => void;
  recalcularDefaultsPreco: () => void;
  calcularTudo: () => void;
  marcarDocumentoGerado: (id: string) => void;
  marcarDocumentoAnexado: (id: string, anexado: boolean, observacao?: string) => void;
  resetarChecklistDocumentacao: () => void;
}

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  empresa: DADOS_EMPRESA_PADRAO,
  cliente: clientePadrao(),
  consumo: consumoPadrao(),
  localizacao: LOCALIZACAO_PADRAO,
  kit: kitPadrao(),
  preco: precoPadrao(DADOS_EMPRESA_PADRAO),
  opcoesProposta: opcoesPropostaPadrao(),
  consumoMedioMensalKWh:null, valorMedioMensalRS:null,
  dimensionamento:null, enquadramento:null,
  custosRecorrentes:null, precificacao:null,
  percentuaisFioBPorAno:{}, detalhamentoPerdas:[], indicadores:null,
  resultadoGrupoA:null,
  checklistDocumentacao: CHECKLIST_PADRAO_CEMIG_MICROGD,
  ultimoCalculoAssinatura: null,

  atualizarEmpresa: p => set(s => ({ empresa:{...s.empresa,...p} })),
  atualizarCliente: p => set(s => ({ cliente:{...s.cliente,...p} })),
  atualizarConsumo: p => set(s => ({ consumo:{...s.consumo,...p} })),
  atualizarConta: (i,p) => set(s => { const c=[...s.consumo.contas]; c[i]={...c[i],...p}; return {consumo:{...s.consumo,contas:c}}; }),
  adicionarConta: () => set(s => ({ consumo:{...s.consumo,contas:[...s.consumo.contas,{mes:`Mês ${s.consumo.contas.length+1}`,kWh:0,valorRS:0}]} })),
  removerConta: i => set(s => ({ consumo:{...s.consumo,contas:s.consumo.contas.filter((_,j)=>j!==i)} })),
  atualizarLocalizacao: p => set(s => ({ localizacao:{...s.localizacao,...p} })),
  atualizarKit: p => set(s => ({ kit:{...s.kit,...p} })),
  atualizarPreco: p => set(s => ({ preco:{...s.preco,...p} })),
  atualizarOpcoesProposta: p => set(s => ({ opcoesProposta:{...s.opcoesProposta,...p} })),
  marcarDocumentoGerado: id => set(s => ({ checklistDocumentacao: marcarItemGerado(s.checklistDocumentacao, id, new Date().toISOString()) })),
  marcarDocumentoAnexado: (id, anexado, observacao) => set(s => ({ checklistDocumentacao: marcarItemAnexado(s.checklistDocumentacao, id, anexado, observacao) })),
  resetarChecklistDocumentacao: () => set({ checklistDocumentacao: CHECKLIST_PADRAO_CEMIG_MICROGD }),

  recalcularDefaultsPreco: () => {
    const {kit,empresa} = get();
    const potKWp = (kit.potenciaModuloWp*kit.quantidade)/1000;
    if (potKWp<=0) return;
    // Auto atualiza modulosPorString se apenas 1 string
    const mpps = kit.numStrings===1 ? kit.quantidade : Math.ceil(kit.quantidade/kit.numStrings);
    set(s => ({
      kit:{...s.kit,modulosPorString:mpps},
      preco:{...s.preco,
        estruturaRS:Math.round(potKWp*empresa.valorEstruturaPorKWp),
        materiaisEletricosRS:Math.round(potKWp*empresa.valorMateriaisPorKWp),
        maoDeObraRS:Math.round(kit.quantidade*empresa.valorMaoDeObraPorModulo),
        projetoArtRS:empresa.valorProjetoArt,
        aliquotaImpostos:empresa.aliquotaImpostos,
        margemDesejada:empresa.margemPadrao,
      },
    }));
  },

  calcularTudo: () => {
    const {cliente,consumo,kit,empresa,preco} = get();
    let prc = preco;
    const preset = PRESETS_MODULO[kit.tipoModulo];
    const validas = consumo.contas.filter(c=>c.kWh>0);
    const mediaKWh = validas.length>0 ? validas.reduce((a,c)=>a+c.kWh,0)/validas.length : 0;
    const mediaRS = validas.filter(c=>c.valorRS>0).length>0
      ? validas.filter(c=>c.valorRS>0).reduce((a,c)=>a+c.valorRS,0)/validas.filter(c=>c.valorRS>0).length : 0;

    const hsp = hspPorUF(cliente.uf);
    // BUG CORRIGIDO (set/2026): `coeficienteTemperaturaPmax`/`noct` REAIS do
    // datasheet (importados via IA — ver comentário completo em
    // `EntradaKit.coeficienteTemperaturaPmaxPercent` acima) eram extraídos
    // com sucesso mas nunca chegavam a esta função — o cálculo de perda por
    // temperatura sempre usava o preset genérico do dropdown "tipo de
    // módulo", mesmo quando o valor real do equipamento já estava disponível
    // no state. `?? ` preserva o comportamento antigo (preset) para todo kit
    // sem datasheet importado — só usa o valor real quando presente.
    const perdas = calcularPerdas(
      {coeficienteTemperaturaPmax:kit.coeficienteTemperaturaPmaxPercent ?? preset.coef,noct:kit.noct ?? preset.noct,toleranciaPercent:0,bifacial:preset.bifacial,ganhoBifacialPercent:preset.ganho},
      {eficienciaMaximaPercent:kit.eficienciaInversorPercent},
      {temperaturaAmbienteMediaC:24,perdaSombreamentoPercent:2,perdaSujidadePercent:2}
    );
    const dimensionamentoRecomendado = dimensionarSistema({consumoMedioMensalKWh:mediaKWh,hspLocal:hsp,perdasSistema:perdas.perdaTotalLiquida,potenciaModuloWp:kit.potenciaModuloWp,percentualCompensacaoDesejado:kit.percentualCompensacaoDesejado});
    // CORRIGIDO (ago/2026): ver doc de ajustarDimensionamentoParaQuantidadeReal
    // em @domain/dimensionamento/dimensionar.ts — `kit.quantidade` (o kit real
    // configurado pelo instalador) raramente bate com `numeroModulos`
    // (recomendado pelo algoritmo a partir do consumo). Sem este ajuste,
    // documentos e indicadores financeiros usavam os dois números
    // contraditoriamente. `dimensionamento` abaixo é o único valor usado pelo
    // resto do app (enquadramento, custos, precificação, indicadores, PDFs/
    // Excel) — quando kit.quantidade ainda não foi preenchido (=0), cai de
    // volta na recomendação, preservando o comportamento anterior.
    const dimensionamento = ajustarDimensionamentoParaQuantidadeReal(
      dimensionamentoRecomendado,
      kit.quantidade,
      {potenciaModuloWp:kit.potenciaModuloWp, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, consumoMedioMensalKWh:mediaKWh}
    );
    const enquadramento = classificarEnquadramento({dataProtocoloAcesso:kit.dataProtocoloAcesso,potenciaInstaladaKW:dimensionamento.potenciaInstaladaRealKWp,fonte:'fotovoltaica',modalidade:'autoconsumo_local'});

    // Grupo A (média tensão) — calculado à parte, com fórmula própria (fator de
    // compensação Fc = TE_Ponta/TE_ForaPonta), ver @domain/dimensionamento/
    // calcularGrupoA.ts. NÃO substitui `dimensionamento`/`custosRecorrentes`
    // acima (que continuam sempre Grupo B) — ver comentário do campo
    // `resultadoGrupoA` na interface ProjetoState para o porquê.
    const resultadoGrupoA: ResultadoGrupoA | null = consumo.grupoTensao === 'A'
      ? calcularDimensionamentoGrupoA({
          consumo: {
            historicoBFP: consumo.historicoFP,
            historicoBP: consumo.historicoP,
            demandaMedidaFPkW: consumo.demandaMedidaFPkW || undefined,
            demandaContratadaKW: consumo.demandaContratadaKW,
          },
          tarifa: {
            tePontaKWh: consumo.tePontaKWh,
            teForaPontaKWh: consumo.teForaPontaKWh,
            tusdPontaKWh: consumo.tusdPontaKWh,
            tusdForaPontaKWh: consumo.tusdForaPontaKWh,
            demandaKW: consumo.tarifaDemandaKW,
          },
          hspLocal: hsp,
          perdasSistema: perdas.perdaTotalLiquida,
          potenciaModuloWp: kit.potenciaModuloWp,
          percentualCompensacao: kit.percentualCompensacaoDesejado,
        })
      : null;

    const anos=[2025,2026,2027,2028,2029,2030,2035,2040,2045];
    const pfb:Record<number,number>={};
    for (const a of anos) pfb[a]=percentualFioBPorAno(enquadramento,a);

    const distribuidora=DISTRIBUIDORAS.find(d=>d.codigo===consumo.codigoDistribuidora)??DISTRIBUIDORAS[0];
    // Usa tarifa real da conta se informada; caso contrário usa banco de dados
    const distribuidoraComTarifa = consumo.tarifaRealKWhComICMS > 0
      ? {...distribuidora, tarifaKWhComICMS: consumo.tarifaRealKWhComICMS}
      : distribuidora;
    const custosRecorrentes=calcularCustosRecorrentes({distribuidora:distribuidoraComTarifa,tipoLigacao:consumo.tipoLigacao,cipRS:consumo.cipMensalRS,consumoMedioMensalKWh:mediaKWh,geracaoMensalKWh:dimensionamento.geracaoMensalEstimadaKWh,percentualFioB:percentualFioBPorAno(enquadramento,new Date().getFullYear()),fracaoTarifaFioB:empresa.fracaoTarifaFioB});

    const potKWp=dimensionamento.potenciaInstaladaRealKWp;
    const numMod=dimensionamento.numeroModulos;
    if (prc.estruturaRS===0&&prc.maoDeObraRS===0) {
      prc={...prc,estruturaRS:Math.round(potKWp*empresa.valorEstruturaPorKWp),materiaisEletricosRS:Math.round(potKWp*empresa.valorMateriaisPorKWp),maoDeObraRS:Math.round(numMod*empresa.valorMaoDeObraPorModulo),projetoArtRS:empresa.valorProjetoArt,aliquotaImpostos:empresa.aliquotaImpostos,margemDesejada:empresa.margemPadrao};
      set({preco:prc});
    }

    const precificacao=calcularPrecificacao({
      composicao:{kit:{marcaModulo:kit.marcaModulo,modeloModulo:kit.modeloModulo,potenciaModuloWp:kit.potenciaModuloWp,quantidade:kit.quantidade,tipoModulo:preset.bifacial?'bifacial':kit.tipoModulo==='policristalino'?'policristalino':'monocristalino',marcaInversor:kit.marcaInversor,modeloInversor:kit.modeloInversor,potenciaInversorKW:kit.potenciaInversorKW,custoKitRS:kit.custoKitRS},estruturaRS:prc.estruturaRS,materiaisEletricosRS:prc.materiaisEletricosRS,maoDeObraRS:prc.maoDeObraRS,projetoArtRS:prc.projetoArtRS,outrosCustosRS:prc.outrosCustosRS},
      aliquotaImpostos:prc.aliquotaImpostos,margemDesejada:prc.margemDesejada,
    });

    const HORIZONTE=25;
    const DEGRADACAO_ANUAL=0.005;
    const economiaMensal=custosRecorrentes.economiaMensalRS;
    const investimento=precificacao.precoVenda;
    // BUG CORRIGIDO (ago/2026): `economiaMensal` (ano 1) usava o percentual do Fio B
    // do ano corrente — mas ficava FIXO nesse valor pelos 25 anos da projeção
    // abaixo, apesar do escalonamento da Lei 14.300/2022 (15%→100% entre 2023 e
    // 2029). `projetarCustosAnuais` recalcula a economia mensal ano a ano com o
    // percentual de Fio B, reajuste tarifário e degradação da geração corretos;
    // `economiaMensalPorAno` é repassado a calcularFluxoCaixa/simularFinanciamento
    // para substituir a projeção ingênua (que assumia Fio B constante).
    const anoCalendarioBase=new Date().getFullYear();
    const anosProjecao=Array.from({length:HORIZONTE},(_,i)=>anoCalendarioBase+i);
    const projecaoAnual=projetarCustosAnuais(
      {distribuidora:distribuidoraComTarifa,tipoLigacao:consumo.tipoLigacao,cipRS:consumo.cipMensalRS,consumoMedioMensalKWh:mediaKWh,geracaoMensalKWh:dimensionamento.geracaoMensalEstimadaKWh,percentualFioB:0,fracaoTarifaFioB:empresa.fracaoTarifaFioB},
      (ano)=>percentualFioBPorAno(enquadramento,ano),
      empresa.reajusteTarifarioAnual,
      anosProjecao,
      DEGRADACAO_ANUAL,
      anoCalendarioBase
    );
    const economiaMensalPorAno=projecaoAnual.map(p=>p.custos.economiaMensalRS);
    const fluxo=calcularFluxoCaixa({investimentoInicial:investimento,economiaMensalAno1:economiaMensal,degradacaoAnualModulos:DEGRADACAO_ANUAL,reajusteTarifarioAnual:empresa.reajusteTarifarioAnual,horizonteAnos:HORIZONTE,taxaMinimaAtratividadeAnual:empresa.taxaMinimaAtratividadeAnual,economiaMensalPorAno});
    const tir=calcularTIR(fluxo.fluxoAnual);
    const gen12=geracaoMensalPorMes(potKWp,hsp,perdas.perdaTotalLiquida,cliente.uf);
    const simulacoes=[
      simularFinanciamento(investimento,economiaMensal,empresa.taxaSolfacil48Mensal,48,DEGRADACAO_ANUAL,empresa.reajusteTarifarioAnual,HORIZONTE,'Solfácil 48×',economiaMensalPorAno),
      simularFinanciamento(investimento,economiaMensal,empresa.taxaSolfacil60Mensal,60,DEGRADACAO_ANUAL,empresa.reajusteTarifarioAnual,HORIZONTE,'Solfácil 60×',economiaMensalPorAno),
      simularFinanciamento(investimento,economiaMensal,empresa.taxaOutroFinanciamento,empresa.parcelasOutroFinanciamento,DEGRADACAO_ANUAL,empresa.reajusteTarifarioAnual,HORIZONTE,empresa.descricaoOutroFinanciamento,economiaMensalPorAno),
    ];
    const indicadores:IndicadoresFinanceiros={
      tirAnualPercent:tir!==null?tir*100:null,
      roiMultiplo:calcularROI(investimento,fluxo.economiaTotalHorizonte),
      paybackSimples:formatarPayback(fluxo.paybackSimplesAnos),
      paybackSimplesAnos:fluxo.paybackSimplesAnos,
      paybackDescontado:formatarPayback(fluxo.paybackDescontadoAnos),
      economiaTotalHorizonte:fluxo.economiaTotalHorizonte,
      economia25Anos:fluxo.economiaTotalHorizonte,
      // set/2026: passa as dimensões reais do módulo (kit.comprimentoMm/
      // larguraMm, já coletadas em TabKit) para que a área/peso batam com o
      // que MemorialDescritivo.tsx e gerarFormularioCemig.ts já calculavam
      // corretamente — ver comentário completo em areaTotalNecessariaM2().
      areaNecessariaM2:areaTotalNecessariaM2(dimensionamento.numeroModulos,kit.potenciaModuloWp,kit.comprimentoMm,kit.larguraMm),
      pesoDistribuidoKgM2:pesoDistribuidoKgM2(dimensionamento.numeroModulos,kit.potenciaModuloWp,kit.comprimentoMm,kit.larguraMm),
      geracaoMensalKWh:gen12,
      simulacoesFinanciamento:simulacoes,
      fluxoAnualHorizonte:fluxo.fluxoAnual,
    };
    // Assinatura calculada com o estado FINAL (get() de novo, não as variáveis
    // desestruturadas no topo da função): `preco` pode ter sido auto-preenchido
    // pelo `set({preco:prc})` alguns passos acima quando estruturaRS/maoDeObraRS
    // ainda estavam zerados — precisa refletir o valor que efetivamente ficou
    // salvo, senão a assinatura ficaria "desatualizada" na hora em que acabou
    // de calcular.
    const estadoFinal = get();
    const assinatura = assinaturaEntradasCalculo(estadoFinal);
    set({consumoMedioMensalKWh:mediaKWh,valorMedioMensalRS:mediaRS,dimensionamento,enquadramento,custosRecorrentes,precificacao,percentuaisFioBPorAno:pfb,detalhamentoPerdas:perdas.detalhamento,indicadores,resultadoGrupoA,ultimoCalculoAssinatura:assinatura});
  },
}));
