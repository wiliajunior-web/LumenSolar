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

// ── Presets de módulo ──────────────────────────────────────────────────────
export const PRESETS_MODULO = {
  monocristalino: { label: 'Monocristalino', coef: -0.34, noct: 45, bifacial: false, ganho: 0 },
  policristalino: { label: 'Policristalino', coef: -0.40, noct: 46, bifacial: false, ganho: 0 },
  bifacial_ntype: { label: 'Bifacial N-TYPE (TOPCon)', coef: -0.29, noct: 45, bifacial: true, ganho: 5 },
  bifacial_ptype: { label: 'Bifacial P-TYPE (PERC)', coef: -0.35, noct: 45, bifacial: true, ganho: 4 },
} as const;

export type TipoModuloPreset = keyof typeof PRESETS_MODULO;

export interface DadosCliente {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
}

export interface ContaMensal {
  mes: string;
  kWh: number;
  valorRS: number;
}

export interface EntradaConsumo {
  contas: ContaMensal[];
  codigoDistribuidora: string;
  tipoLigacao: TipoLigacao;
  cipMensalRS: number;
}

export interface EntradaKit {
  tipoModulo: TipoModuloPreset;
  marcaModulo: string;
  modeloModulo: string;
  potenciaModuloWp: number;
  quantidade: number;
  marcaInversor: string;
  modeloInversor: string;
  potenciaInversorKW: number;
  custoKitRS: number;
  eficienciaInversorPercent: number;
  dataProtocoloAcesso: string;
}

export interface EntradaPrecificacao {
  estruturaRS: number;
  materiaisEletricosRS: number;
  maoDeObraRS: number;
  projetoArtRS: number;
  outrosCustosRS: number;
  aliquotaImpostos: number;
  margemDesejada: number;
}

const MESES_PADRAO = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez',
];

interface ProjetoState {
  empresa: DadosEmpresa;
  cliente: DadosCliente;
  consumo: EntradaConsumo;
  kit: EntradaKit;
  preco: EntradaPrecificacao;
  // resultados
  consumoMedioMensalKWh: number | null;
  valorMedioMensalRS: number | null;
  dimensionamento: ResultadoDimensionamento | null;
  enquadramento: ResultadoEnquadramento | null;
  custosRecorrentes: ResultadoCustosRecorrentes | null;
  precificacao: ResultadoPrecificacao | null;
  percentuaisFioBPorAno: Record<number, number>;
  detalhamentoPerdas: string[];
  // actions
  atualizarEmpresa: (p: Partial<DadosEmpresa>) => void;
  atualizarCliente: (p: Partial<DadosCliente>) => void;
  atualizarConsumo: (p: Partial<EntradaConsumo>) => void;
  atualizarConta: (i: number, p: Partial<ContaMensal>) => void;
  adicionarConta: () => void;
  removerConta: (i: number) => void;
  atualizarKit: (p: Partial<EntradaKit>) => void;
  atualizarPreco: (p: Partial<EntradaPrecificacao>) => void;
  recalcularDefaultsPreco: () => void;
  calcularTudo: () => void;
}

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  empresa: DADOS_EMPRESA_PADRAO,
  cliente: { nome: '', telefone: '', email: '', cidade: '', uf: 'MG' },
  consumo: {
    contas: MESES_PADRAO.map(mes => ({ mes, kWh: 0, valorRS: 0 })),
    codigoDistribuidora: 'CEMIG',
    tipoLigacao: 'monofasica',
    cipMensalRS: 18,
  },
  kit: {
    tipoModulo: 'bifacial_ntype',
    marcaModulo: '',
    modeloModulo: '',
    potenciaModuloWp: 550,
    quantidade: 0,
    marcaInversor: '',
    modeloInversor: '',
    potenciaInversorKW: 0,
    custoKitRS: 0,
    eficienciaInversorPercent: 98.4,
    dataProtocoloAcesso: new Date().toISOString().slice(0, 10),
  },
  preco: {
    estruturaRS: 0,
    materiaisEletricosRS: 0,
    maoDeObraRS: 0,
    projetoArtRS: 500,
    outrosCustosRS: 0,
    aliquotaImpostos: 0.06,
    margemDesejada: 0.15,
  },
  consumoMedioMensalKWh: null,
  valorMedioMensalRS: null,
  dimensionamento: null,
  enquadramento: null,
  custosRecorrentes: null,
  precificacao: null,
  percentuaisFioBPorAno: {},
  detalhamentoPerdas: [],

  atualizarEmpresa: p => set(s => ({ empresa: { ...s.empresa, ...p } })),
  atualizarCliente: p => set(s => ({ cliente: { ...s.cliente, ...p } })),
  atualizarConsumo: p => set(s => ({ consumo: { ...s.consumo, ...p } })),
  atualizarConta: (i, p) => set(s => {
    const contas = [...s.consumo.contas];
    contas[i] = { ...contas[i], ...p };
    return { consumo: { ...s.consumo, contas } };
  }),
  adicionarConta: () => set(s => ({
    consumo: { ...s.consumo, contas: [...s.consumo.contas, { mes: `Mês ${s.consumo.contas.length + 1}`, kWh: 0, valorRS: 0 }] },
  })),
  removerConta: i => set(s => ({ consumo: { ...s.consumo, contas: s.consumo.contas.filter((_, j) => j !== i) } })),
  atualizarKit: p => set(s => ({ kit: { ...s.kit, ...p } })),
  atualizarPreco: p => set(s => ({ preco: { ...s.preco, ...p } })),

  recalcularDefaultsPreco: () => {
    const { kit, empresa } = get();
    const preset = PRESETS_MODULO[kit.tipoModulo];
    const potKWp = (kit.potenciaModuloWp * kit.quantidade) / 1000;
    if (potKWp <= 0) return;
    set(s => ({
      preco: {
        ...s.preco,
        estruturaRS: Math.round(potKWp * empresa.valorEstruturaPorKWp),
        materiaisEletricosRS: Math.round(potKWp * empresa.valorMateriaisPorKWp),
        maoDeObraRS: Math.round(kit.quantidade * empresa.valorMaoDeObraPorModulo),
        projetoArtRS: empresa.valorProjetoArt,
        aliquotaImpostos: empresa.aliquotaImpostos,
        margemDesejada: empresa.margemPadrao,
      },
    }));
  },

  calcularTudo: () => {
    const { cliente, consumo, kit, preco, empresa } = get();
    const preset = PRESETS_MODULO[kit.tipoModulo];

    const validas = consumo.contas.filter(c => c.kWh > 0);
    const mediaKWh = validas.length > 0 ? validas.reduce((a, c) => a + c.kWh, 0) / validas.length : 0;
    const mediaRS = validas.filter(c => c.valorRS > 0).length > 0
      ? validas.filter(c => c.valorRS > 0).reduce((a, c) => a + c.valorRS, 0) / validas.filter(c => c.valorRS > 0).length
      : 0;

    const hsp = hspPorUF(cliente.uf);
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: kit.eficienciaInversorPercent },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );

    const dimensionamento = dimensionarSistema({
      consumoMedioMensalKWh: mediaKWh,
      hspLocal: hsp,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: kit.potenciaModuloWp,
    });

    const enquadramento = classificarEnquadramento({
      dataProtocoloAcesso: kit.dataProtocoloAcesso,
      potenciaInstaladaKW: dimensionamento.potenciaInstaladaRealKWp,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });

    const anos = [2025, 2026, 2027, 2028, 2029, 2030, 2035, 2040, 2045];
    const pfb: Record<number, number> = {};
    for (const a of anos) pfb[a] = percentualFioBPorAno(enquadramento, a);

    const distribuidora = DISTRIBUIDORAS.find(d => d.codigo === consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
    const custosRecorrentes = calcularCustosRecorrentes({
      distribuidora, tipoLigacao: consumo.tipoLigacao,
      cipRS: consumo.cipMensalRS, consumoMedioMensalKWh: mediaKWh,
      geracaoMensalKWh: dimensionamento.geracaoMensalEstimadaKWh,
      percentualFioB: percentualFioBPorAno(enquadramento, new Date().getFullYear()),
    });

    // Usa número de módulos do dimensionamento (pode diferir do kit manual)
    const numModulosDim = dimensionamento.numeroModulos;
    const potKWpDim = dimensionamento.potenciaInstaladaRealKWp;

    const precificacao = calcularPrecificacao({
      composicao: {
        kit: {
          marcaModulo: kit.marcaModulo, modeloModulo: kit.modeloModulo,
          potenciaModuloWp: kit.potenciaModuloWp, quantidade: kit.quantidade,
          tipoModulo: preset.bifacial ? 'bifacial' : kit.tipoModulo === 'policristalino' ? 'policristalino' : 'monocristalino',
          marcaInversor: kit.marcaInversor, modeloInversor: kit.modeloInversor,
          potenciaInversorKW: kit.potenciaInversorKW, custoKitRS: kit.custoKitRS,
        },
        estruturaRS: preco.estruturaRS,
        materiaisEletricosRS: preco.materiaisEletricosRS,
        maoDeObraRS: preco.maoDeObraRS,
        projetoArtRS: preco.projetoArtRS,
        outrosCustosRS: preco.outrosCustosRS,
      },
      aliquotaImpostos: preco.aliquotaImpostos,
      margemDesejada: preco.margemDesejada,
    });

    set({
      consumoMedioMensalKWh: mediaKWh,
      valorMedioMensalRS: mediaRS,
      dimensionamento,
      enquadramento,
      custosRecorrentes,
      precificacao,
      percentuaisFioBPorAno: pfb,
      detalhamentoPerdas: perdas.detalhamento,
    });
  },
}));
