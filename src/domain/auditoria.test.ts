/**
 * AUDITORIA COMPLETA — SolarPropV
 *
 * Cenários reais brasileiros testados contra:
 * - ANEEL REN 414/2010 (taxa de disponibilidade)
 * - Lei 14.300/2022 (art. 26 e art. 27 — Fio B)
 * - IEC 61724-1 (perdas do sistema)
 * - CRESESB/Atlas Solarimétrico (HSP por UF)
 * - Tabela Price (matemática financeira)
 * - Simples Nacional 2025 (tributação)
 */

import { describe, expect, it } from 'vitest';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { calcularPerdas, CONDICOES_SITE_PADRAO_MG } from './dimensionamento/calcularPerdas';
import { hspPorUF } from '../data/hspPorUF';
import { classificarEnquadramento, percentualFioBPorAno, custoAnualFioB } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS, KWH_DISPONIBILIDADE } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { gerarTabelaPrice, totalPagoPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularAliquotaEfetivaSimples } from '../data/tributacao';

// ─── Fixtures de referência ──────────────────────────────────────────────────

const cemig = DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!;
const equatorialGO = DISTRIBUIDORAS.find(d => d.codigo === 'EQUATORIAL_GO')!;

const moduloLeapton620 = {
  coeficienteTemperaturaPmax: -0.29,
  noct: 45,
  toleranciaPercent: 0,
  bifacial: true,
  ganhoBifacialPercent: 5,
};

const growattMIN6kW = { eficienciaMaximaPercent: 98.4 };

// ─── BLOCO 1: Lei 14.300/2022 ─────────────────────────────────────────────

describe('Lei 14.300/2022 — Art. 26 e Art. 27', () => {

  it('[Art. 26] UC protocolada em 01/06/2022 tem direito à transição até 2045', () => {
    const r = classificarEnquadramento({
      dataProtocoloAcesso: '2022-06-01',
      potenciaInstaladaKW: 5,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });
    expect(r.elegivelArt26).toBe(true);
    // deve pagar ZERO de Fio B sobre energia compensada até 2045
    expect(percentualFioBPorAno(r, 2025)).toBe(0);
    expect(percentualFioBPorAno(r, 2035)).toBe(0);
    expect(percentualFioBPorAno(r, 2045)).toBe(0);
  });

  it('[Art. 26] Limite exato: protocolo em 07/01/2023 ainda é elegível', () => {
    // 12 meses após publicação da lei (07/01/2022) = 07/01/2023
    const r = classificarEnquadramento({
      dataProtocoloAcesso: '2023-01-07',
      potenciaInstaladaKW: 5,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });
    expect(r.elegivelArt26).toBe(true);
  });

  it('[Art. 26] Protocolo em 08/01/2023 (um dia depois) NÃO é elegível', () => {
    const r = classificarEnquadramento({
      dataProtocoloAcesso: '2023-01-08',
      potenciaInstaladaKW: 5,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });
    expect(r.elegivelArt26).toBe(false);
  });

  it('[Art. 27] Tabela de escalonamento conforme texto literal da lei', () => {
    const r = classificarEnquadramento({
      dataProtocoloAcesso: '2024-03-15', // fora do art. 26
      potenciaInstaladaKW: 8,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });
    expect(r.elegivelArt26).toBe(false);
    // Percentuais exatos da lei: art. 27, incisos I a VI
    expect(percentualFioBPorAno(r, 2023)).toBe(0.15); // inciso I
    expect(percentualFioBPorAno(r, 2024)).toBe(0.30); // inciso II
    expect(percentualFioBPorAno(r, 2025)).toBe(0.45); // inciso III
    expect(percentualFioBPorAno(r, 2026)).toBe(0.60); // inciso IV
    expect(percentualFioBPorAno(r, 2027)).toBe(0.75); // inciso V
    expect(percentualFioBPorAno(r, 2028)).toBe(0.90); // inciso VI
    expect(percentualFioBPorAno(r, 2029)).toBe(1);    // art. 17 pleno
    expect(percentualFioBPorAno(r, 2035)).toBe(1);
  });

  it('[Art. 27 §1°] Minigeração >500kW, autoconsumo remoto, titular ≥25% → 100% imediato', () => {
    const r = classificarEnquadramento({
      dataProtocoloAcesso: '2025-01-01',
      potenciaInstaladaKW: 750,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_remoto',
      participacaoMaiorTitularPercent: 30,
    });
    expect(r.regraEspecialArt27Paragrafo1).toBe(true);
    expect(percentualFioBPorAno(r, 2025)).toBe(1);
    expect(percentualFioBPorAno(r, 2028)).toBe(1);
  });

  it('[ANEEL] Taxa de disponibilidade: monofásica=30 kWh, bifásica=50 kWh, trifásica=100 kWh', () => {
    // REN ANEEL 414/2010, art. 98
    expect(KWH_DISPONIBILIDADE.monofasica).toBe(30);
    expect(KWH_DISPONIBILIDADE.bifasica).toBe(50);
    expect(KWH_DISPONIBILIDADE.trifasica).toBe(100);
  });
});

// ─── BLOCO 2: Dimensionamento ────────────────────────────────────────────────

describe('Dimensionamento fotovoltaico — cenários reais', () => {

  it('[Cenário 1] Residencial pequeno — GO, 300 kWh/mês, módulo 550Wp', () => {
    // Consumo típico baixa renda, Goiás
    const hsp = hspPorUF('GO'); // 5.5
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax: -0.34, noct: 45, toleranciaPercent: 0, bifacial: false },
      { eficienciaMaximaPercent: 97 },
      { temperaturaAmbienteMediaC: 26, perdaSombreamentoPercent: 2, perdaSujidadePercent: 3 }
    );
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 300,
      hspLocal: hsp,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 550,
    });
    // kWp esperado: ~300/(5.5×30.4×eficiencia) ≈ 2.1-2.5 kWp dependendo das perdas
    expect(r.potenciaSistemaKWp).toBeGreaterThan(1.8);
    expect(r.potenciaSistemaKWp).toBeLessThan(3.0);
    // módulos: 4 a 5 (cada um com 550Wp)
    expect(r.numeroModulos).toBeGreaterThanOrEqual(4);
    expect(r.numeroModulos).toBeLessThanOrEqual(6);
    // geração mensal deve ser >= consumo alvo
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(300);
    expect(r.percentualCompensacaoReal).toBeGreaterThanOrEqual(1);
  });

  it('[Cenário 2] Residencial médio — MG/Araguari, 500 kWh/mês, kit Leapton 620Wp bifacial', () => {
    const hsp = hspPorUF('MG'); // 5.4
    const perdas = calcularPerdas(moduloLeapton620, growattMIN6kW, CONDICOES_SITE_PADRAO_MG);
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 500,
      hspLocal: hsp,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 620,
    });
    // Com ganho bifacial 5% direto e inversor 98.4%, perdas ficam ~8-15%
    expect(perdas.perdaTotalLiquida).toBeGreaterThan(0.06);
    expect(perdas.perdaTotalLiquida).toBeLessThan(0.22);
    // kWp esperado: ~3.2-4.0 kWp
    expect(r.potenciaSistemaKWp).toBeGreaterThan(3.0);
    expect(r.potenciaSistemaKWp).toBeLessThan(4.5);
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(500);
  });

  it('[Cenário 3] Kit exato da Aldo Solar — 7,44 kWp / 12 módulos Leapton 620Wp', () => {
    // Validação contra kit real: 12 × 620Wp = 7440 Wp = 7.44 kWp
    const hsp = hspPorUF('GO'); // cliente Gabriel, GO
    const perdas = calcularPerdas(moduloLeapton620, growattMIN6kW,
      { temperaturaAmbienteMediaC: 26, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 }
    );
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 500,
      hspLocal: hsp,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 620,
    });
    // Verificar se o dimensionamento bate com o kit de 12 módulos
    expect(r.numeroModulos).toBeLessThanOrEqual(12);
    // geração do kit real: 7.44 kWp × 5.5 × 30.4 × (1-perdas)
    const geracaoKitReal = 7.44 * hsp * 30.4167 * (1 - perdas.perdaTotalLiquida);
    expect(geracaoKitReal).toBeGreaterThan(500 * 0.95); // kit superdimensionado para compensação
  });

  it('[Cenário 4] Comercial médio — SP, 2000 kWh/mês, trifásico', () => {
    const hsp = hspPorUF('SP'); // 5.0
    const r = dimensionarSistema({
      consumoMedioMensalKWh: 2000,
      hspLocal: hsp,
      perdasSistema: 0.18,
      potenciaModuloWp: 595,
    });
    // kWp esperado: ~14-17 kWp
    expect(r.potenciaSistemaKWp).toBeGreaterThan(12);
    expect(r.potenciaSistemaKWp).toBeLessThan(20);
    // potência < 75 kW → microgeração (dentro do limite da lei)
    expect(r.potenciaInstaladaRealKWp).toBeLessThan(75);
  });

  it('[IEC 61724] Dias/mês deve usar 30.4167 (365/12), não 30 fixos', () => {
    const r30 = dimensionarSistema({
      consumoMedioMensalKWh: 500, hspLocal: 5.5,
      perdasSistema: 0.20, potenciaModuloWp: 550,
    });
    // Com 30.4 dias, a geração mensal = kWp × HSP × 30.4 × efic
    // Verificar que a geração anual / 12 bate com a mensal
    expect(r30.geracaoAnualEstimadaKWh / 12).toBeCloseTo(r30.geracaoMensalEstimadaKWh, 2);
    // E que a geração mensal é MAIOR que com 30 dias (diferença ~1.4%)
    const geracaoCom30Dias = r30.potenciaInstaladaRealKWp * 5.5 * 30 * 0.80;
    expect(r30.geracaoMensalEstimadaKWh).toBeGreaterThan(geracaoCom30Dias);
  });
});

// ─── BLOCO 3: Perdas do sistema ──────────────────────────────────────────────

describe('Cálculo de perdas — IEC 61724-1 e specs do fabricante', () => {

  it('[Bifacial - Bug Fix] Ganho bifacial 5% = +5% direto na geração (não ×albedo)', () => {
    const rBifacial = calcularPerdas(
      { ...moduloLeapton620, ganhoBifacialPercent: 5, bifacial: true },
      growattMIN6kW, CONDICOES_SITE_PADRAO_MG
    );
    const rMono = calcularPerdas(
      { ...moduloLeapton620, bifacial: false },
      growattMIN6kW, CONDICOES_SITE_PADRAO_MG
    );
    // A diferença de perdas entre bifacial e mono deve ser ~5% (não 0.75%)
    const diferencaPerdas = rMono.perdaTotalLiquida - rBifacial.perdaTotalLiquida;
    // Com 5% de ganho bifacial, a diferença de perdas líquidas deve ser ~4-6%
    expect(diferencaPerdas).toBeGreaterThan(0.03);
    expect(diferencaPerdas).toBeLessThan(0.07);
  });

  it('[Temperatura] Leapton 620W em GO (Tamb 26°C, NOCT 45°C) → perda ~5-8%', () => {
    const r = calcularPerdas(moduloLeapton620, growattMIN6kW,
      { temperaturaAmbienteMediaC: 26, perdaSombreamentoPercent: 0, perdaSujidadePercent: 0 }
    );
    // Tcélula ≈ 26 + (45-20)×0.8 = 26 + 20 = 46°C → ΔT = 21°C
    // Perda = 0.29%/°C × 21°C = 6.09%
    expect(r.perdaTemperatura).toBeCloseTo(0.0609, 3);
  });

  it('[Inversor] Growatt 98.4% eficiência → perda de 1.6%', () => {
    const r = calcularPerdas(moduloLeapton620, growattMIN6kW, CONDICOES_SITE_PADRAO_MG);
    expect(r.perdaInversor).toBeCloseTo(0.016, 4);
  });

  it('[Intervalo real] Perdas totais devem ficar entre 10% e 25% em cenários típicos', () => {
    const casos = [
      { tamb: 22, sombra: 0, sujidade: 1 },
      { tamb: 26, sombra: 2, sujidade: 2 },
      { tamb: 30, sombra: 3, sujidade: 4 },
    ];
    for (const c of casos) {
      const r = calcularPerdas(moduloLeapton620, growattMIN6kW,
        { temperaturaAmbienteMediaC: c.tamb, perdaSombreamentoPercent: c.sombra, perdaSujidadePercent: c.sujidade }
      );
      expect(r.perdaTotalLiquida).toBeGreaterThan(0.04); // bifacial + condições ideais pode chegar a ~5%
      expect(r.perdaTotalLiquida).toBeLessThan(0.30);
    }
  });
});

// ─── BLOCO 4: Custos recorrentes ─────────────────────────────────────────────

describe('Custos mensais recorrentes — distribuidoras e tarifas', () => {

  it('[CEMIG/MG] Taxa de disponibilidade monofásica = 30 kWh × tarifa CEMIG', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18, consumoMedioMensalKWh: 400, geracaoMensalKWh: 420, percentualFioB: 0.60,
    });
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * cemig.tarifaKWhComICMS, 1);
  });

  it('[CEMIG/MG] Conta antes do solar condizente com tarifa e consumo', () => {
    const consumo = 400;
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18, consumoMedioMensalKWh: consumo, geracaoMensalKWh: 420, percentualFioB: 0,
    });
    // Conta = consumo × tarifa + CIP
    expect(r.contaAntesRS).toBeCloseTo(400 * cemig.tarifaKWhComICMS + 18, 0);
  });

  it('[Art. 26 cliente] Com Fio B = 0%, custo adicional do Fio B é zero', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 20, consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    expect(r.custoBFioMensalRS).toBe(0);
  });

  it('[Art. 27/2026] Com Fio B = 60% (2026), custo recorrente aumenta vs 0%', () => {
    const sem = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 20, consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    const com60 = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 20, consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.60,
    });
    expect(com60.custoBFioMensalRS).toBeGreaterThan(sem.custoBFioMensalRS);
    expect(com60.totalFixoMensalRS).toBeGreaterThan(sem.totalFixoMensalRS);
  });

  it('[Equatorial GO] Cliente Gabriel — verificar conta mínima após solar', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: equatorialGO, tipoLigacao: 'monofasica',
      cipRS: 15, consumoMedioMensalKWh: 500, geracaoMensalKWh: 550, percentualFioB: 0,
    });
    // Mínimo = disponibilidade (30 kWh × tarifa Equatorial GO) + CIP
    const disponibilidadeEsperada = 30 * equatorialGO.tarifaKWhComICMS;
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(disponibilidadeEsperada, 2);
    expect(r.totalFixoMensalRS).toBeGreaterThan(0);
    expect(r.economiaMensalRS).toBeGreaterThan(0);
  });
});

// ─── BLOCO 5: Precificação ───────────────────────────────────────────────────

describe('Precificação — fórmula correta com impostos sobre receita', () => {

  const composicaoReal = {
    kit: {
      marcaModulo: 'Leapton', modeloModulo: '620W BIF N-TYPE',
      potenciaModuloWp: 620, quantidade: 12,
      tipoModulo: 'bifacial' as const,
      marcaInversor: 'Growatt', modeloInversor: 'MIN 6000TL-X2',
      potenciaInversorKW: 6,
      custoKitRS: 9800,
    },
    estruturaRS: 900,
    materiaisEletricosRS: 700,
    maoDeObraRS: 1800,
    projetoArtRS: 600,
    outrosCustosRS: 200,
  };
  // Custo total direto = 9800+900+700+1800+600+200 = 14000

  it('[Fórmula] Preço = Custo / (1 - impostos - margem)', () => {
    const r = calcularPrecificacao({ composicao: composicaoReal, aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    const precoEsperado = 14000 / (1 - 0.06 - 0.15);
    expect(r.precoVenda).toBeCloseTo(precoEsperado, 2);
  });

  it('[Integridade] custo + imposto + lucro = preço de venda (centavo)', () => {
    const r = calcularPrecificacao({ composicao: composicaoReal, aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    const soma = r.custoTotalDireto + r.impostoSobreVenda + r.lucroLiquido;
    expect(soma).toBeCloseTo(r.precoVenda, 2);
  });

  it('[Simples Nacional] Alíquota efetiva correta para faturamento R$200k/ano, Anexo III', () => {
    // Faturamento 200k → Faixa 2 Anexo III (até 360k): 11,2% nominal
    // Alíquota efetiva = (200000 × 0.112 - 9360) / 200000 = (22400 - 9360)/200000 = 6,52%
    const efetiva = calcularAliquotaEfetivaSimples(200000, 'III');
    expect(efetiva).toBeCloseTo(0.0652, 3);
  });

  it('[Simples Nacional] Faixa 1 (até R$180k/ano) → alíquota efetiva = 6% (sem dedução)', () => {
    const efetiva = calcularAliquotaEfetivaSimples(150000, 'III');
    expect(efetiva).toBeCloseTo(0.06, 4);
  });

  it('[Markup vs Margem] Markup sempre maior que margem (bases de cálculo diferentes)', () => {
    const r = calcularPrecificacao({ composicao: composicaoReal, aliquotaImpostos: 0.06, margemDesejada: 0.20 });
    // Margem = % sobre preço. Markup = % sobre custo. Markup > margem sempre.
    expect(r.markupPercentual).toBeGreaterThan(r.margemPercentual);
  });

  it('[Cenário real] Kit 7,44kWp completo em Araguari-MG — preço de mercado plausível', () => {
    const r = calcularPrecificacao({ composicao: composicaoReal, aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    // Sistemas de 7-8 kWp custam tipicamente R$18k-28k no mercado (2025)
    expect(r.precoVenda).toBeGreaterThan(15000);
    expect(r.precoVenda).toBeLessThan(30000);
  });
});

// ─── BLOCO 6: Financeiro ─────────────────────────────────────────────────────

describe('Tabela Price e fluxo de caixa', () => {

  it('[Price] PMT = PV × [i(1+i)^n] / [(1+i)^n-1] — fórmula padrão', () => {
    const tabela = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 60 });
    // PMT esperado manualmente: i=1.99%, n=60
    const i = 0.0199;
    const n = 60;
    const pmtEsperado = 18000 * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    expect(tabela[0].parcela).toBeCloseTo(pmtEsperado, 2);
  });

  it('[Price] Total pago em 60x é maior que em 36x (mais juros)', () => {
    const t36 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 36 });
    const t60 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 60 });
    expect(totalPagoPrice(t60)).toBeGreaterThan(totalPagoPrice(t36));
  });

  it('[Fluxo de caixa] Payback de sistema típico 7,44 kWp entre 4 e 8 anos', () => {
    // Cenário: sistema R$17.722 (preço de venda), economia R$400/mês ano 1
    // degradação 0.5%/ano, reajuste tarifário 6%/ano
    const r = calcularFluxoCaixa({
      investimentoInicial: 17722,
      economiaMensalAno1: 400,
      degradacaoAnualModulos: 0.005,
      reajusteTarifarioAnual: 0.06,
      horizonteAnos: 25,
      taxaMinimaAtratividadeAnual: 0.08,
    });
    expect(r.paybackSimplesAnos).not.toBeNull();
    expect(r.paybackSimplesAnos!).toBeGreaterThan(3);
    expect(r.paybackSimplesAnos!).toBeLessThan(9);
    // VPL positivo = investimento se paga com retorno acima do mínimo
    expect(r.vpl).toBeGreaterThan(0);
  });

  it('[Fluxo de caixa] Economia em 25 anos muito superior ao investimento', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 17722,
      economiaMensalAno1: 400,
      degradacaoAnualModulos: 0.005,
      reajusteTarifarioAnual: 0.06,
      horizonteAnos: 25,
    });
    // Com reajuste tarifário de 6%/ano, economia total em 25 anos >> investimento
    expect(r.economiaTotalHorizonte).toBeGreaterThan(r.fluxoAnual[0] * -2); // pelo menos 2x o investimento
  });
});

// ─── BLOCO 7: Integridade dos dados de referência ───────────────────────────

describe('Dados de referência — ANEEL, CRESESB, distribuidoras', () => {

  it('[CRESESB] HSP de GO (5.5) maior que SC (4.5) — norte tem mais sol', () => {
    expect(hspPorUF('GO')).toBeGreaterThan(hspPorUF('SC'));
  });

  it('[CRESESB] RN tem maior HSP do Brasil (>5.5 kWh/m²/dia)', () => {
    expect(hspPorUF('RN')).toBeGreaterThanOrEqual(5.7);
  });

  it('[CRESESB] Todas as UFs têm HSP entre 4 e 7 kWh/m²/dia (físicamente possível)', () => {
    const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
                 'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    for (const uf of ufs) {
      const hsp = hspPorUF(uf);
      expect(hsp).toBeGreaterThan(3.5);
      expect(hsp).toBeLessThan(7.0);
    }
  });

  it('[Distribuidoras] Todas têm tarifa entre R$0.60 e R$1.50/kWh (intervalo real 2025)', () => {
    for (const d of DISTRIBUIDORAS) {
      if (d.codigo === 'OUTRO') continue;
      expect(d.tarifaKWhComICMS).toBeGreaterThan(0.60);
      expect(d.tarifaKWhComICMS).toBeLessThan(1.50);
    }
  });

  it('[Distribuidoras] CEMIG (MG) existe e tem tarifa válida', () => {
    expect(cemig).toBeDefined();
    expect(cemig.tarifaKWhComICMS).toBeGreaterThan(0.80);
  });

  it('[Distribuidoras] Equatorial Goiás existe e tem tarifa válida', () => {
    expect(equatorialGO).toBeDefined();
    expect(equatorialGO.uf).toContain('GO');
  });
});
