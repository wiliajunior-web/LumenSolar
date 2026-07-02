import { create } from 'zustand';
import { dimensionarSistema } from '@domain/dimensionamento/dimensionar';
import { ResultadoDimensionamento } from '@domain/dimensionamento/types';
import { hspPorUF } from '@data/hspPorUF';
import { classificarEnquadramento, percentualFioBPorAno } from '@domain/fioB/calculoFioB';
import { ResultadoEnquadramento } from '@domain/fioB/calculoFioB';
import { ParametrosEnquadramentoGD } from '@domain/fioB/types';
import { DISTRIBUIDORAS, TipoLigacao } from '@data/distribuidoras';
import { calcularCustosRecorrentes, ResultadoCustosRecorrentes } from '@domain/custosRecorrentes/calcularCustos';
import { EspecificacaoKit, ComposicaoCustos } from '@domain/precificacao/types';
import { calcularPrecificacao, ResultadoPrecificacao } from '@domain/precificacao/calcularPrecificacao';
import { CONFIG_TRIBUTARIA_PADRAO } from '@data/tributacao';
import { calcularPerdas, CONDICOES_SITE_PADRAO_MG } from '@domain/dimensionamento/calcularPerdas';
import { DadosEmpresa, DADOS_EMPRESA_PADRAO } from '@data/empresa';
export type { DadosEmpresa };

export interface DadosCliente {
  nome: string;
  cpfCnpj: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
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
  especificacao: EspecificacaoKit;
  perdasSistema: number;
}

export interface EntradaCustos {
  composicao: Omit<ComposicaoCustos, 'kit'>;
  aliquotaImpostos: number;
  margemDesejada: number;
}

export interface EntradaEnquadramento {
  dataProtocoloAcesso: string;
  modalidade: ParametrosEnquadramentoGD['modalidade'];
  reajusteTarifarioAnual: number;
}

interface ProjetoState {
  cliente: DadosCliente;
  consumo: EntradaConsumo;
  kit: EntradaKit;
  custosConfig: EntradaCustos;
  enquadramentoConfig: EntradaEnquadramento;

  // resultados calculados
  consumoMedioMensalKWh: number | null;
  valorMedioMensalRS: number | null;
  dimensionamento: ResultadoDimensionamento | null;
  enquadramento: ResultadoEnquadramento | null;
  custosRecorrentes: ResultadoCustosRecorrentes | null;
  precificacao: ResultadoPrecificacao | null;
  percentuaisFioBPorAno: Record<number, number>;
  detalhamentoPerdas: string[];

  atualizarCliente: (p: Partial<DadosCliente>) => void;
  atualizarConsumo: (p: Partial<EntradaConsumo>) => void;
  atualizarConta: (idx: number, conta: Partial<ContaMensal>) => void;
  adicionarConta: () => void;
  removerConta: (idx: number) => void;
  atualizarKit: (p: Partial<EntradaKit>) => void;
  atualizarEspecificacaoKit: (p: Partial<EspecificacaoKit>) => void;
  atualizarCustos: (p: Partial<EntradaCustos>) => void;
  atualizarComposicao: (p: Partial<Omit<ComposicaoCustos, 'kit'>>) => void;
  atualizarEnquadramento: (p: Partial<EntradaEnquadramento>) => void;
  empresa: DadosEmpresa;
  atualizarEmpresa: (p: Partial<DadosEmpresa>) => void;
    calcularTudo: () => void;
}

const clientePadrao: DadosCliente = {
  nome: '', cpfCnpj: '', endereco: '', cidade: '', uf: 'MG', telefone: '', email: '',
};

const consumoPadrao: EntradaConsumo = {
  contas: Array.from({ length: 12 }, (_, i) => ({ mes: `Mês ${i + 1}`, kWh: 0, valorRS: 0 })),
  codigoDistribuidora: 'CEMIG',
  tipoLigacao: 'monofasica',
  cipMensalRS: 18,
};

const kitPadrao: EntradaKit = {
  especificacao: {
    marcaModulo: '', modeloModulo: '', potenciaModuloWp: 550, quantidade: 0,
    tipoModulo: 'monocristalino',
    marcaInversor: '', modeloInversor: '', potenciaInversorKW: 0, custoKitRS: 0,
  },
  perdasSistema: 0.20,
};

const custosPadrao: EntradaCustos = {
  composicao: { estruturaRS: 0, materiaisEletricosRS: 0, maoDeObraRS: 0, projetoArtRS: 0, outrosCustosRS: 0 },
  aliquotaImpostos: CONFIG_TRIBUTARIA_PADRAO.aliquotaEfetiva,
  margemDesejada: 0.15,
};

const enquadramentoPadrao: EntradaEnquadramento = {
  dataProtocoloAcesso: new Date().toISOString().slice(0, 10),
  modalidade: 'autoconsumo_local',
  reajusteTarifarioAnual: 0.06,
};

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  cliente: clientePadrao,
  consumo: consumoPadrao,
  kit: kitPadrao,
  custosConfig: custosPadrao,
  enquadramentoConfig: enquadramentoPadrao,
  consumoMedioMensalKWh: null,
  valorMedioMensalRS: null,
  dimensionamento: null,
  enquadramento: null,
  custosRecorrentes: null,
  precificacao: null,
  percentuaisFioBPorAno: {},
  detalhamentoPerdas: [],

  atualizarCliente: (p) => set((s) => ({ cliente: { ...s.cliente, ...p } })),

  atualizarConsumo: (p) => set((s) => ({ consumo: { ...s.consumo, ...p } })),

  atualizarConta: (idx, conta) =>
    set((s) => {
      const contas = [...s.consumo.contas];
      contas[idx] = { ...contas[idx], ...conta };
      return { consumo: { ...s.consumo, contas } };
    }),

  adicionarConta: () =>
    set((s) => ({
      consumo: {
        ...s.consumo,
        contas: [...s.consumo.contas, { mes: `Mês ${s.consumo.contas.length + 1}`, kWh: 0, valorRS: 0 }],
      },
    })),

  removerConta: (idx) =>
    set((s) => ({
      consumo: { ...s.consumo, contas: s.consumo.contas.filter((_, i) => i !== idx) },
    })),

  atualizarKit: (p) => set((s) => ({ kit: { ...s.kit, ...p } })),

  atualizarEspecificacaoKit: (p) =>
    set((s) => ({ kit: { ...s.kit, especificacao: { ...s.kit.especificacao, ...p } } })),

  atualizarCustos: (p) => set((s) => ({ custosConfig: { ...s.custosConfig, ...p } })),

  atualizarComposicao: (p) =>
    set((s) => ({ custosConfig: { ...s.custosConfig, composicao: { ...s.custosConfig.composicao, ...p } } })),

  atualizarEnquadramento: (p) =>
    set((s) => ({ enquadramentoConfig: { ...s.enquadramentoConfig, ...p } })),

  empresa: DADOS_EMPRESA_PADRAO,

    atualizarEmpresa: (p) => set((s) => ({ empresa: { ...s.empresa, ...p } })),

  calcularTudo: () => {
    const { cliente, consumo, kit, custosConfig, enquadramentoConfig } = get();

    const contasValidas = consumo.contas.filter((c) => c.kWh > 0);
    const consumoMedioMensalKWh =
      contasValidas.length > 0
        ? contasValidas.reduce((s, c) => s + c.kWh, 0) / contasValidas.length
        : 0;
    const valorMedioMensalRS =
      contasValidas.length > 0
        ? contasValidas.reduce((s, c) => s + c.valorRS, 0) / contasValidas.length
        : 0;

    const hsp = hspPorUF(cliente.uf);

    // Calcula perdas dinamicamente a partir das specs do kit
    const resultadoPerdas = calcularPerdas(
      {
        coeficienteTemperaturaPmax: kit.especificacao.coeficienteTemperaturaPmax ?? -0.34,
        noct: kit.especificacao.noct ?? 45,
        toleranciaPercent: 0,
        bifacial: !!kit.especificacao.bifacial,
        ganhoBifacialPercent: kit.especificacao.fatorBifacialidadePercent ?? 5,
      },
      { eficienciaMaximaPercent: kit.especificacao.eficienciaInversorPercent ?? 97 },
      CONDICOES_SITE_PADRAO_MG
    );

    const dimensionamento = dimensionarSistema({
      consumoMedioMensalKWh,
      hspLocal: hsp,
      perdasSistema: resultadoPerdas.perdaTotalLiquida,
      potenciaModuloWp: kit.especificacao.potenciaModuloWp,
    });

    const enquadramento = classificarEnquadramento({
      dataProtocoloAcesso: enquadramentoConfig.dataProtocoloAcesso,
      potenciaInstaladaKW: dimensionamento.potenciaInstaladaRealKWp,
      fonte: 'fotovoltaica',
      modalidade: enquadramentoConfig.modalidade,
    });

    const anosProjecao = [2025, 2026, 2027, 2028, 2029, 2030, 2035, 2040, 2045];
    const percentuaisFioBPorAno: Record<number, number> = {};
    for (const ano of anosProjecao) {
      percentuaisFioBPorAno[ano] = percentualFioBPorAno(enquadramento, ano);
    }

    const distribuidora = DISTRIBUIDORAS.find((d) => d.codigo === consumo.codigoDistribuidora)
      ?? DISTRIBUIDORAS[DISTRIBUIDORAS.length - 1];

    const custosRecorrentes = calcularCustosRecorrentes({
      distribuidora,
      tipoLigacao: consumo.tipoLigacao,
      cipRS: consumo.cipMensalRS,
      consumoMedioMensalKWh,
      geracaoMensalKWh: dimensionamento.geracaoMensalEstimadaKWh,
      percentualFioB: percentualFioBPorAno(enquadramento, new Date().getFullYear()),
    });

    const composicaoCompleta: ComposicaoCustos = {
      kit: kit.especificacao,
      ...custosConfig.composicao,
    };
    const precificacao = calcularPrecificacao({
      composicao: composicaoCompleta,
      aliquotaImpostos: custosConfig.aliquotaImpostos,
      margemDesejada: custosConfig.margemDesejada,
    });

    set({
      detalhamentoPerdas: resultadoPerdas.detalhamento,
      consumoMedioMensalKWh,
      valorMedioMensalRS,
      dimensionamento,
      enquadramento,
      custosRecorrentes,
      precificacao,
      percentuaisFioBPorAno,
    });
  },
}));
