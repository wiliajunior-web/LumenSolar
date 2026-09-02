import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProjetoStore, clientePadrao, consumoPadrao, kitPadrao, precoPadrao,
  assinaturaEntradasCalculo,
} from './useProjetoStore';
import { calcularDimensionamentoGrupoA } from '@domain/dimensionamento/calcularGrupoA';
import { calcularPerdas } from '@domain/dimensionamento/calcularPerdas';
import { dimensionarSistema, ajustarDimensionamentoParaQuantidadeReal } from '@domain/dimensionamento/dimensionar';
import { hspPorUF } from '@data/hspPorUF';
import { PRESETS_MODULO } from '@data/presetsModulo';
import { DADOS_EMPRESA_PADRAO } from '@data/empresa';

// useProjetoStore.ts (o motor de cálculo central do app — calcularTudo())
// tinha ZERO cobertura de teste antes da auditoria de ago/2026. Isto é
// especialmente grave porque o wiring de Grupo A (adicionado nesta mesma
// auditoria) depende inteiramente de mapear os campos certos de `consumo`
// para os parâmetros certos de `calcularDimensionamentoGrupoA` — um erro de
// wiring (ex: trocar historicoFP/historicoP, esquecer percentualCompensacao)
// não quebra o build nem o tsc, só produz números errados silenciosamente.

function resetStore() {
  // Usa a MESMA fábrica que a store e App.tsx (novaProposta()) usam — não
  // mais uma cópia própria do default, que é exatamente o padrão de bug
  // ("mesma lógica duplicada diverge") corrigido nesta rodada. `contas` aqui
  // difere do default (mês 1 com consumo real) porque os testes de Grupo B
  // abaixo precisam de consumo médio > 0 para calcularTudo() não lançar.
  //
  // BUG CORRIGIDO (set/2026, achado escrevendo os testes de coeficiente/NOCT
  // abaixo): `kit` nunca era resetado aqui — só `cliente`/`consumo`. Isso
  // não dava problema até agora porque nenhum teste anterior fazia uma
  // asserção numérica exata que dependesse de `kit` estar limpo (o teste de
  // "kit.quantidade preenchido..." é sempre o último do seu describe a tocar
  // em quantidade). Mas é uma falha de isolamento real: o Vitest roda os
  // describes do mesmo arquivo na mesma instância do store (singleton
  // Zustand, sem module reset entre testes) — qualquer `atualizarKit(...)`
  // em um teste sobrevive para o próximo, na ordem em que os arquivos/blocos
  // aparecem. Confirmado na prática: os novos testes de coeficiente/NOCT
  // (abaixo) recebiam `kit.quantidade` e `kit.noct` sobrando do describe
  // "dimensionamento reflete kit.quantidade real" — números de geração
  // completamente errados sem nenhum erro de sintaxe pra apontar a causa.
  useProjetoStore.setState({
    cliente: clientePadrao(),
    consumo: {
      ...consumoPadrao(),
      contas: Array.from({length:12},(_,i)=>({mes:`M${i+1}`,kWh: i===0?500:0, valorRS: i===0?400:0})),
    },
    kit: kitPadrao(),
  });
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

// [BUG CORRIGIDO set/2026] `coeficienteTemperaturaPmaxPercent`/`noct` REAIS do
// datasheet (importados via IA em ImportarDatasheet, App.tsx, ou digitados
// manualmente) eram salvos no kit mas NUNCA chegavam a calcularTudo() — a
// perda por temperatura sempre usava o preset genérico do dropdown "tipo de
// módulo", mesmo com o valor real do equipamento disponível. Achado
// auditando a pergunta direta do usuário "como faço a IA reconhecer TUDO que
// foi anexado". Ver comentário completo em EntradaKit.coeficienteTemperatura-
// PmaxPercent (useProjetoStore.ts).
describe('useProjetoStore.calcularTudo() — [BUG CORRIGIDO set/2026] coeficienteTemperaturaPmaxPercent/noct reais sobrepõem o preset', () => {
  beforeEach(() => resetStore());

  it('kit sem coeficiente/NOCT do datasheet: usa o preset do tipo de módulo (comportamento antigo, preservado)', () => {
    useProjetoStore.getState().calcularTudo();
    const s = useProjetoStore.getState();
    const preset = PRESETS_MODULO['bifacial_ntype']; // tipoModulo padrão de kitPadrao()
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    expect(s.detalhamentoPerdas).toEqual(perdas.detalhamento);
  });

  it('kit COM coeficiente/NOCT reais (ex: importados de um datasheet real): usa o valor real, não o preset — e o resultado numérico muda de verdade', () => {
    const preset = PRESETS_MODULO['bifacial_ntype'];
    // Valores conferidos manualmente antes de escrever a expectativa (não é
    // um valor arbitrário ajustado pra bater com a implementação):
    // preset bifacial_ntype = {coef:-0.29, noct:45} → Tcél=24+(45-20)=49°C,
    // ΔT=24°C, perdaTemp=0.29/100×24=6.96%.
    // Override real do datasheet = {coef:-0.40, noct:50} → Tcél=24+(50-20)=54°C,
    // ΔT=29°C, perdaTemp=0.40/100×29=11.6% — mais que o dobro do preset,
    // então o teste tem margem de sobra para detectar se o override não
    // estiver sendo aplicado.
    const s = useProjetoStore.getState();
    s.atualizarKit({ coeficienteTemperaturaPmaxPercent: -0.40, noct: 50 });
    useProjetoStore.getState().calcularTudo();
    const s2 = useProjetoStore.getState();

    const perdasComOverride = calcularPerdas(
      { coeficienteTemperaturaPmax: -0.40, noct: 50, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    expect(perdasComOverride.perdaTemperatura).toBeCloseTo(0.116, 3); // conferido manualmente acima
    expect(s2.detalhamentoPerdas).toEqual(perdasComOverride.detalhamento);

    const perdasPreset = calcularPerdas(
      { coeficienteTemperaturaPmax: preset.coef, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    expect(perdasComOverride.perdaTotalLiquida).toBeGreaterThan(perdasPreset.perdaTotalLiquida);

    // Não é só um número solto no detalhamento — o override também muda o
    // dimensionamento recomendado (kWp/geração) de verdade, porque
    // `dimensionarSistema()` recebe `perdasSistema` como parâmetro direto.
    const hsp = hspPorUF('MG');
    const dimensionamentoComOverride = dimensionarSistema({
      consumoMedioMensalKWh: 500, hspLocal: hsp, perdasSistema: perdasComOverride.perdaTotalLiquida,
      potenciaModuloWp: 550, percentualCompensacaoDesejado: 1.0,
    });
    const dimensionamentoPreset = dimensionarSistema({
      consumoMedioMensalKWh: 500, hspLocal: hsp, perdasSistema: perdasPreset.perdaTotalLiquida,
      potenciaModuloWp: 550, percentualCompensacaoDesejado: 1.0,
    });
    expect(s2.dimensionamento).not.toBeNull();
    expect(s2.dimensionamento!.geracaoMensalEstimadaKWh).toBeCloseTo(dimensionamentoComOverride.geracaoMensalEstimadaKWh, 2);
    expect(dimensionamentoComOverride.geracaoMensalEstimadaKWh).toBeLessThan(dimensionamentoPreset.geracaoMensalEstimadaKWh);
  });

  it('só o coeficiente informado (NOCT em branco): usa o coeficiente real + NOCT do preset — os dois sobrepõem de forma independente', () => {
    const preset = PRESETS_MODULO['bifacial_ntype'];
    const s = useProjetoStore.getState();
    s.atualizarKit({ coeficienteTemperaturaPmaxPercent: -0.50 }); // noct fica undefined
    useProjetoStore.getState().calcularTudo();
    const s2 = useProjetoStore.getState();

    const perdasEsperadas = calcularPerdas(
      { coeficienteTemperaturaPmax: -0.50, noct: preset.noct, toleranciaPercent: 0, bifacial: preset.bifacial, ganhoBifacialPercent: preset.ganho },
      { eficienciaMaximaPercent: 98.4 },
      { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    expect(s2.detalhamentoPerdas).toEqual(perdasEsperadas.detalhamento);
  });
});

// [REGRESSÃO ago/2026] `novaProposta()` (App.tsx) resetava cliente/consumo/kit
// com um literal próprio (via `as any`) que divergia do default real da
// store — faltavam por completo `grupoTensao`/`agrupamentoAtivo`/
// `unidadesConsumidoras`/histórico Grupo A em `consumo`, e `corrMaxMpptA`/
// `comprimentoCaboCAm`/`temperaturaInstalacaoC`/`potenciaAtualKWp`/
// `dataProtocoloOriginal` em `kit`. Corrigido: `novaProposta()` agora usa as
// MESMAS fábricas testadas abaixo — impossível divergir de novo sem quebrar
// estes testes.
describe('Fábricas de estado padrão — clientePadrao/consumoPadrao/kitPadrao/precoPadrao', () => {
  it('consumoPadrao() sempre volta com grupoTensao "B" e todos os campos de Grupo A zerados', () => {
    const c = consumoPadrao();
    expect(c.grupoTensao).toBe('B');
    expect(c.agrupamentoAtivo).toBe(false);
    expect(c.unidadesConsumidoras).toEqual([]);
    expect(c.historicoFP).toEqual([]);
    expect(c.historicoP).toEqual([]);
    expect(c.demandaContratadaKW).toBe(0);
    expect(c.demandaMedidaFPkW).toBe(0);
  });

  it('clientePadrao() inicia estadoCivil="" — não mais "solteiro" (auditoria de design, ago/2026)', () => {
    // BUG CORRIGIDO: com o padrão antigo ('solteiro'), TODA Procuração
    // gerada afirmava "solteiro(a)" como estado civil do cliente mesmo sem
    // o usuário ter informado nada — não havia campo na UI pra mudar isso.
    // Ver comentário completo em DadosCliente.estadoCivil.
    expect(clientePadrao().estadoCivil).toBe('');
  });

  it('kitPadrao() inclui os campos formalizados em ago/2026 (antes só existiam via "as any")', () => {
    const k = kitPadrao();
    expect(k.comprimentoCaboCAm).toBe(10);
    expect(k.temperaturaInstalacaoC).toBe(40);
    expect(k.potenciaAtualKWp).toBe(0);
    expect(k.dataProtocoloOriginal).toBe('');
    expect(k.corrMaxMpptA).toBe(0);
  });

  it('duas chamadas da mesma fábrica retornam objetos/arrays independentes (sem referência compartilhada)', () => {
    const c1 = consumoPadrao();
    const c2 = consumoPadrao();
    expect(c1).not.toBe(c2);
    expect(c1.contas).not.toBe(c2.contas);
    expect(c1.historicoFP).not.toBe(c2.historicoFP);
    c1.contas[0].kWh = 999;
    expect(c2.contas[0].kWh).toBe(0); // não deve vazar mutação entre propostas
  });

  it('precoPadrao(empresa) usa os valores-base da empresa (projetoArt/impostos/margem), não um literal fixo', () => {
    const empresaCustom = { ...DADOS_EMPRESA_PADRAO, valorProjetoArt: 777, aliquotaImpostos: 0.09, margemPadrao: 0.22 };
    const p = precoPadrao(empresaCustom);
    expect(p.projetoArtRS).toBe(777);
    expect(p.aliquotaImpostos).toBe(0.09);
    expect(p.margemDesejada).toBe(0.22);
  });
});

// [REGRESSÃO ago/2026] calcularTudo() só roda no clique de "Calcular
// resultado completo" — nada detectava quando o usuário editava
// Cliente/Consumo/Kit/Empresa/Preço DEPOIS de calcular e ia direto gerar um
// documento com dimensionamento/indicadores desatualizados. Ver comentário
// de `ultimoCalculoAssinatura` em useProjetoStore.ts.
describe('assinaturaEntradasCalculo / ultimoCalculoAssinatura — detecção de cálculo desatualizado', () => {
  beforeEach(() => resetStore());

  it('logo após calcularTudo(), a assinatura atual bate com ultimoCalculoAssinatura (não desatualizado)', () => {
    useProjetoStore.getState().calcularTudo();
    const s = useProjetoStore.getState();
    expect(s.ultimoCalculoAssinatura).not.toBeNull();
    expect(assinaturaEntradasCalculo(s)).toBe(s.ultimoCalculoAssinatura);
  });

  it('editar consumo DEPOIS de calcular faz a assinatura atual divergir de ultimoCalculoAssinatura', () => {
    useProjetoStore.getState().calcularTudo();
    useProjetoStore.getState().atualizarConsumo({ tarifaRealKWhComICMS: 1.5 });
    const s = useProjetoStore.getState();
    expect(assinaturaEntradasCalculo(s)).not.toBe(s.ultimoCalculoAssinatura);
  });

  it('editar kit.quantidade DEPOIS de calcular faz a assinatura divergir', () => {
    useProjetoStore.getState().calcularTudo();
    useProjetoStore.getState().atualizarKit({ quantidade: 30 });
    const s = useProjetoStore.getState();
    expect(assinaturaEntradasCalculo(s)).not.toBe(s.ultimoCalculoAssinatura);
  });

  it('recalcular depois de editar sincroniza a assinatura de novo', () => {
    useProjetoStore.getState().calcularTudo();
    useProjetoStore.getState().atualizarKit({ quantidade: 30 });
    useProjetoStore.getState().calcularTudo();
    const s = useProjetoStore.getState();
    expect(assinaturaEntradasCalculo(s)).toBe(s.ultimoCalculoAssinatura);
  });

  // [REGRESSÃO ago/2026] editar um campo específico de Grupo A (demanda
  // contratada) DEPOIS de calcular também precisa fazer a assinatura
  // divergir — é exatamente o mecanismo que o painel "Cálculo Grupo A
  // (preview)" em App.tsx (TabConsumo) passou a usar (calculoDesatualizado(),
  // que chama esta mesma função) para avisar o vendedor que os números do
  // preview — que o próprio app instrui a copiar MANUALMENTE para a proposta
  // de média tensão — estão desatualizados. Antes da correção, o painel não
  // chamava calculoDesatualizado() nenhuma vez; este teste prova que a
  // assinatura de fato muda para um campo exclusivo de Grupo A (não só para
  // os campos genéricos de Grupo B já cobertos acima), então o guard
  // reaproveitado funciona para esse caso — não fecha o loop da renderização
  // JSX em si (o projeto não tem infraestrutura de teste de componente React:
  // vitest.config.ts usa environment:'node', sem jsdom/@testing-library).
  it('[Grupo A] editar demandaContratadaKW DEPOIS de calcular faz a assinatura divergir (mecanismo usado pelo painel de preview em TabConsumo)', () => {
    useProjetoStore.getState().atualizarConsumo({ grupoTensao: 'A' });
    useProjetoStore.getState().calcularTudo();
    useProjetoStore.getState().atualizarConsumo({ demandaContratadaKW: 60 });
    const s = useProjetoStore.getState();
    expect(s.consumo.grupoTensao).toBe('A');
    expect(assinaturaEntradasCalculo(s)).not.toBe(s.ultimoCalculoAssinatura);
  });
});
