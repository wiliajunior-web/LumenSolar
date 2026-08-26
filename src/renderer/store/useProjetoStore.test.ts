import { describe, it, expect, beforeEach } from 'vitest';
import { useProjetoStore } from './useProjetoStore';
import { calcularDimensionamentoGrupoA } from '@domain/dimensionamento/calcularGrupoA';
import { calcularPerdas } from '@domain/dimensionamento/calcularPerdas';
import { dimensionarSistema, ajustarDimensionamentoParaQuantidadeReal } from '@domain/dimensionamento/dimensionar';
import { hspPorUF } from '@data/hspPorUF';
import { PRESETS_MODULO } from '@data/presetsModulo';

// useProjetoStore.ts (o motor de cálculo central do app — calcularTudo())
// tinha ZERO cobertura de teste antes da auditoria de ago/2026. Isto é
// especialmente grave porque o wiring de Grupo A (adicionado nesta mesma
// auditoria) depende inteiramente de mapear os campos certos de `consumo`
// para os parâmetros certos de `calcularDimensionamentoGrupoA` — um erro de
// wiring (ex: trocar historicoFP/historicoP, esquecer percentualCompensacao)
// não quebra o build nem o tsc, só produz números errados silenciosamente.

function resetStore() {
  useProjetoStore.setState({
    cliente: { nome:'', cpf:'', rg:'', estadoCivil:'solteiro', profissao:'', endereco:'', telefone:'', email:'', cidade:'', uf:'MG' },
    consumo: {
      contas: Array.from({length:12},(_,i)=>({mes:`M${i+1}`,kWh: i===0?500:0, valorRS: i===0?400:0})),
      codigoDistribuidora: 'CEMIG',
      tipoLigacao: 'monofasica',
      cipMensalRS: 18,
      tarifaRealKWhComICMS: 0,
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
    },
  } as any);
}

describe('useProjetoStore.calcularTudo() — resultadoGrupoA', () => {
  beforeEach(() => resetStore());

  it('fica null quando grupoTensao é "B" (padrão)', () => {
    useProjetoStore.getState().calcularTudo();
    expect(useProjetoStore.getState().resultadoGrupoA).toBeNull();
  });

  it('quando grupoTensao é "A", calcula resultadoGrupoA com os campos corretamente mapeados', () => {
    const s = useProjetoStore.getState();
    s.atualizarConsumo({
      grupoTensao: 'A',
      historicoFP: [1000, 0,0,0,0,0,0,0,0,0,0,0],
      historicoP:  [200,  0,0,0,0,0,0,0,0,0,0,0],
      tePontaKWh: 0.60,
      teForaPontaKWh: 0.40,
      tusdPontaKWh: 0.30,
      tusdForaPontaKWh: 0.25,
      tarifaDemandaKW: 20,
      demandaContratadaKW: 100,
      demandaMedidaFPkW: 0,
    });
    useProjetoStore.getState().calcularTudo();
    const s2 = useProjetoStore.getState();
    expect(s2.resultadoGrupoA).not.toBeNull();

    // Reconstrói o resultado esperado chamando calcularDimensionamentoGrupoA
    // DIRETAMENTE (não copiando o código do store), usando hsp/perdas reais
    // (funções já testadas em seus próprios arquivos) para o kit/UF padrão
    // do estado inicial (MG / bifacial_ntype / 550Wp / comp. 100%). Se o
    // store mapear os campos errado (ex: trocar FP/P), este teste detecta
    // porque os valores de Fc/geração dependem de qual histórico é qual.
    const preset = PRESETS_MODULO['bifacial_ntype'];
    const hsp = hspPorUF('MG');
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    const esperado = calcularDimensionamentoGrupoA({
      consumo: {
        historicoBFP: [1000, 0,0,0,0,0,0,0,0,0,0,0],
        historicoBP:  [200,  0,0,0,0,0,0,0,0,0,0,0],
        demandaMedidaFPkW: undefined,
        demandaContratadaKW: 100,
      },
      tarifa: { tePontaKWh: 0.60, teForaPontaKWh: 0.40, tusdPontaKWh: 0.30, tusdForaPontaKWh: 0.25, demandaKW: 20 },
      hspLocal: hsp,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 550,
      percentualCompensacao: 1.0,
    });

    expect(s2.resultadoGrupoA).toEqual(esperado);
  });

  it('recalculando com grupoTensao "B" de novo zera resultadoGrupoA (sem sujar de execução Grupo A anterior)', () => {
    const s = useProjetoStore.getState();
    s.atualizarConsumo({
      grupoTensao: 'A',
      historicoFP: [1000, 0,0,0,0,0,0,0,0,0,0,0],
      historicoP:  [200,  0,0,0,0,0,0,0,0,0,0,0],
      tePontaKWh: 0.60, teForaPontaKWh: 0.40,
      demandaContratadaKW: 100, tarifaDemandaKW: 20,
    });
    useProjetoStore.getState().calcularTudo();
    expect(useProjetoStore.getState().resultadoGrupoA).not.toBeNull();

    useProjetoStore.getState().atualizarConsumo({ grupoTensao: 'B' });
    useProjetoStore.getState().calcularTudo();
    expect(useProjetoStore.getState().resultadoGrupoA).toBeNull();
  });
});

describe('useProjetoStore.calcularTudo() — [REGRESSÃO ago/2026] dimensionamento reflete kit.quantidade real', () => {
  beforeEach(() => resetStore());

  // calcularTudo() antes só usava `kit.quantidade` para custo do kit
  // (precificação) e para a tabela do equipamento nos documentos — nunca
  // para recalcular potência/geração/percentualCompensacaoReal. Isso fazia
  // `dimensionamento.numeroModulos` (o recomendado pelo algoritmo, a partir
  // do consumo) divergir silenciosamente de `kit.quantidade` (o kit que o
  // instalador de fato configurou), contradição visível nos PDFs e nos
  // indicadores financeiros (payback/TIR usavam a geração do recomendado,
  // mas o preço vinha do custo do kit real).

  it('kit.quantidade não preenchido (0, padrão inicial): dimensionamento usa a recomendação do algoritmo', () => {
    useProjetoStore.getState().calcularTudo();
    const s = useProjetoStore.getState();
    const preset = PRESETS_MODULO['bifacial_ntype'];
    const hsp = hspPorUF('MG');
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    const recomendado = dimensionarSistema({
      consumoMedioMensalKWh: 500, hspLocal: hsp, perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 550, percentualCompensacaoDesejado: 1.0,
    });
    expect(s.dimensionamento).toEqual(recomendado);
  });

  it('kit.quantidade preenchido e diferente do recomendado: dimensionamento passa a refletir o kit real, não a recomendação', () => {
    const s = useProjetoStore.getState();
    const preset = PRESETS_MODULO['bifacial_ntype'];
    const hsp = hspPorUF('MG');
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    const recomendado = dimensionarSistema({
      consumoMedioMensalKWh: 500, hspLocal: hsp, perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 550, percentualCompensacaoDesejado: 1.0,
    });
    const quantidadeKitReal = recomendado.numeroModulos + 5; // instalador configurou um kit maior

    s.atualizarKit({ quantidade: quantidadeKitReal });
    useProjetoStore.getState().calcularTudo();
    const s2 = useProjetoStore.getState();

    const esperadoAjustado = ajustarDimensionamentoParaQuantidadeReal(recomendado, quantidadeKitReal, {
      potenciaModuloWp: 550, hspLocal: hsp, perdasSistema: perdas.perdaTotalLiquida, consumoMedioMensalKWh: 500,
    });
    expect(s2.dimensionamento).toEqual(esperadoAjustado);
    expect(s2.dimensionamento!.numeroModulos).toBe(quantidadeKitReal);
    expect(s2.dimensionamento!.numeroModulos).not.toBe(recomendado.numeroModulos);
    // A geração/indicadores agora batem com o kit real, não mais com a
    // recomendação — a raiz do bug corrigido nesta auditoria.
    expect(s2.dimensionamento!.geracaoMensalEstimadaKWh).not.toBeCloseTo(recomendado.geracaoMensalEstimadaKWh, 1);
  });
});
