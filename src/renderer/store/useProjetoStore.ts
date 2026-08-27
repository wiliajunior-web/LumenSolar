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
  estadoCivil: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';
  profissao: string;
  endereco: string;   // rua, número, bairro, CEP
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
}

export interface EntradaPrecificacao {
  estruturaRS: number; materiaisEletricosRS: number;
  maoDeObraRS: number; projetoArtRS: number; outrosCustosRS: number;
  aliquotaImpostos: number; margemDesejada: number;
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
  return { nome:'', cpf:'', rg:'', estadoCivil:'solteiro', profissao:'', endereco:'', telefone:'', email:'', cidade:'', uf:'MG' };
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
    const perdas = calcularPerdas(
      {coeficienteTemperaturaPmax:preset.coef,noct:preset.noct,toleranciaPercent:0,bifacial:preset.bifacial,ganhoBifacialPercent:preset.ganho},
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
      areaNecessariaM2:areaTotalNecessariaM2(dimensionamento.numeroModulos,kit.potenciaModuloWp),
      pesoDistribuidoKgM2:pesoDistribuidoKgM2(dimensionamento.numeroModulos,kit.potenciaModuloWp),
      geracaoMensalKWh:gen12,
      simulacoesFinanciamento:simulacoes,
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
