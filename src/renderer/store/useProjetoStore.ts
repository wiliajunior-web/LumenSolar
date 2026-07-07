import { create } from 'zustand';
import { dimensionarSistema } from '@domain/dimensionamento/dimensionar';
import { calcularPerdas } from '@domain/dimensionamento/calcularPerdas';
import { hspPorUF } from '@data/hspPorUF';
import { classificarEnquadramento, percentualFioBPorAno } from '@domain/fioB/calculoFioB';
import type { ResultadoEnquadramento } from '@domain/fioB/calculoFioB';
import type { ResultadoDimensionamento } from '@domain/dimensionamento/types';
import { DISTRIBUIDORAS, type TipoLigacao } from '@data/distribuidoras';
import { calcularCustosRecorrentes, type ResultadoCustosRecorrentes } from '@domain/custosRecorrentes/calcularCustos';
import { calcularPrecificacao } from '@domain/precificacao/calcularPrecificacao';
import type { ResultadoPrecificacao } from '@domain/precificacao/types';
import { DADOS_EMPRESA_PADRAO, type DadosEmpresa } from '@data/empresa';
import { calcularFluxoCaixa } from '@domain/financeiro/fluxoCaixa';
import { calcularTIR, calcularROI, formatarPayback, areaTotalNecessariaM2, pesoDistribuidoKgM2, simularFinanciamento, type SimulacaoFinanciamento } from '@domain/financeiro/indicadores';
import { geracaoMensalPorMes } from '@data/hspMensal';
import { LOCALIZACAO_PADRAO, type DadosLocalizacao } from '@data/localizacao';

export const PRESETS_MODULO = {
  monocristalino:  { label: 'Monocristalino', coef: -0.34, noct: 45, bifacial: false, ganho: 0 },
  policristalino:  { label: 'Policristalino',  coef: -0.40, noct: 46, bifacial: false, ganho: 0 },
  bifacial_ntype:  { label: 'Bifacial N-TYPE (TOPCon)', coef: -0.29, noct: 45, bifacial: true, ganho: 5 },
  bifacial_ptype:  { label: 'Bifacial P-TYPE (PERC)', coef: -0.35, noct: 45, bifacial: true, ganho: 4 },
} as const;
export type TipoModuloPreset = keyof typeof PRESETS_MODULO;

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
  numMppt: number;          // Número de rastreadores MPPT
  ipGabinete: string;       // Grau de proteção (ex: IP65)
  fatorPotencia: string;    // Ex: ">0.99"
  thd: string;              // Distorção harmônica (ex: "<3%")
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
  paybackDescontado: string;
  economiaTotalHorizonte: number;
  economia25Anos: number;
  areaNecessariaM2: number;
  pesoDistribuidoKgM2: number;
  geracaoMensalKWh: number[];
  simulacoesFinanciamento: SimulacaoFinanciamento[];
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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
}

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  empresa: DADOS_EMPRESA_PADRAO,
  cliente: { nome:'', cpf:'', rg:'', estadoCivil:'solteiro', profissao:'', endereco:'', telefone:'', email:'', cidade:'', uf:'MG' },
  consumo: {
    contas: MESES.map(mes => ({ mes, kWh:0, valorRS:0 })),
    codigoDistribuidora: 'CEMIG',
    tipoLigacao: 'monofasica',
    cipMensalRS: 18,
    tarifaRealKWhComICMS: 0,
  },
  localizacao: LOCALIZACAO_PADRAO,
  kit: {
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
    tensaoSaidaV:220, corrMaxSaidaA:0, numMppt:1,
    ipGabinete:'IP65', fatorPotencia:'>0.99', thd:'<3%',
  },
  preco: {
    estruturaRS:0, materiaisEletricosRS:0, maoDeObraRS:0,
    projetoArtRS:500, outrosCustosRS:0,
    aliquotaImpostos:0.06, margemDesejada:0.15,
  },
  consumoMedioMensalKWh:null, valorMedioMensalRS:null,
  dimensionamento:null, enquadramento:null,
  custosRecorrentes:null, precificacao:null,
  percentuaisFioBPorAno:{}, detalhamentoPerdas:[], indicadores:null,

  atualizarEmpresa: p => set(s => ({ empresa:{...s.empresa,...p} })),
  atualizarCliente: p => set(s => ({ cliente:{...s.cliente,...p} })),
  atualizarConsumo: p => set(s => ({ consumo:{...s.consumo,...p} })),
  atualizarConta: (i,p) => set(s => { const c=[...s.consumo.contas]; c[i]={...c[i],...p}; return {consumo:{...s.consumo,contas:c}}; }),
  adicionarConta: () => set(s => ({ consumo:{...s.consumo,contas:[...s.consumo.contas,{mes:`Mês ${s.consumo.contas.length+1}`,kWh:0,valorRS:0}]} })),
  removerConta: i => set(s => ({ consumo:{...s.consumo,contas:s.consumo.contas.filter((_,j)=>j!==i)} })),
  atualizarLocalizacao: p => set(s => ({ localizacao:{...s.localizacao,...p} })),
  atualizarKit: p => set(s => ({ kit:{...s.kit,...p} })),
  atualizarPreco: p => set(s => ({ preco:{...s.preco,...p} })),

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
    const dimensionamento = dimensionarSistema({consumoMedioMensalKWh:mediaKWh,hspLocal:hsp,perdasSistema:perdas.perdaTotalLiquida,potenciaModuloWp:kit.potenciaModuloWp});
    const enquadramento = classificarEnquadramento({dataProtocoloAcesso:kit.dataProtocoloAcesso,potenciaInstaladaKW:dimensionamento.potenciaInstaladaRealKWp,fonte:'fotovoltaica',modalidade:'autoconsumo_local'});

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
    const economiaMensal=custosRecorrentes.economiaMensalRS;
    const investimento=precificacao.precoVenda;
    const fluxo=calcularFluxoCaixa({investimentoInicial:investimento,economiaMensalAno1:economiaMensal,degradacaoAnualModulos:0.005,reajusteTarifarioAnual:empresa.reajusteTarifarioAnual,horizonteAnos:HORIZONTE,taxaMinimaAtratividadeAnual:empresa.taxaMinimaAtratividadeAnual});
    const tir=calcularTIR(fluxo.fluxoAnual);
    const gen12=geracaoMensalPorMes(potKWp,hsp,perdas.perdaTotalLiquida,cliente.uf);
    const simulacoes=[
      simularFinanciamento(investimento,economiaMensal,empresa.taxaSolfacil48Mensal,48,0.005,empresa.reajusteTarifarioAnual,HORIZONTE,'Solfácil 48×'),
      simularFinanciamento(investimento,economiaMensal,empresa.taxaSolfacil60Mensal,60,0.005,empresa.reajusteTarifarioAnual,HORIZONTE,'Solfácil 60×'),
      simularFinanciamento(investimento,economiaMensal,empresa.taxaOutroFinanciamento,empresa.parcelasOutroFinanciamento,0.005,empresa.reajusteTarifarioAnual,HORIZONTE,empresa.descricaoOutroFinanciamento),
    ];
    const indicadores:IndicadoresFinanceiros={
      tirAnualPercent:tir!==null?tir*100:null,
      roiMultiplo:calcularROI(investimento,fluxo.economiaTotalHorizonte),
      paybackSimples:formatarPayback(fluxo.paybackSimplesAnos),
      paybackDescontado:formatarPayback(fluxo.paybackDescontadoAnos),
      economiaTotalHorizonte:fluxo.economiaTotalHorizonte,
      economia25Anos:fluxo.economiaTotalHorizonte,
      areaNecessariaM2:areaTotalNecessariaM2(dimensionamento.numeroModulos,kit.potenciaModuloWp),
      pesoDistribuidoKgM2:pesoDistribuidoKgM2(dimensionamento.numeroModulos,kit.potenciaModuloWp),
      geracaoMensalKWh:gen12,
      simulacoesFinanciamento:simulacoes,
    };
    set({consumoMedioMensalKWh:mediaKWh,valorMedioMensalRS:mediaRS,dimensionamento,enquadramento,custosRecorrentes,precificacao,percentuaisFioBPorAno:pfb,detalhamentoPerdas:perdas.detalhamento,indicadores});
  },
}));
