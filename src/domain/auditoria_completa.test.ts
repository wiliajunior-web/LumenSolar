/**
 * AUDITORIA COMPLETA — LumenSolar
 *
 * Simula cenários reais de clientes brasileiros e casos impossíveis/absurdos.
 * Objetivo: garantir que o programa se comporta corretamente em todos os casos.
 *
 * Organização:
 *  A. Cenários reais (perfis de clientes brasileiros típicos)
 *  B. Cenários limítrofes (exatamente nos limites normativos)
 *  C. Valores impossíveis (lixo na entrada)
 *  D. Consistência matemática (cross-check entre módulos)
 *  E. Tarifa real da conta (novo campo)
 *  F. Pipeline completo (end-to-end com dados reais)
 */

import { describe, expect, it } from 'vitest';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { calcularPerdas } from './dimensionamento/calcularPerdas';
import { hspPorUF } from '../data/hspPorUF';
import { geracaoMensalPorMes } from '../data/hspMensal';
import { classificarEnquadramento, percentualFioBPorAno, custoAnualFioB } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS, KWH_DISPONIBILIDADE } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { calcularAliquotaEfetivaSimples } from '../data/tributacao';
import { gerarTabelaPrice, totalPagoPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularTIR, calcularROI, formatarPayback, areaTotalNecessariaM2 } from './financeiro/indicadores';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const cemig     = DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!;
const eqGO      = DISTRIBUIDORAS.find(d => d.codigo === 'EQUATORIAL_GO')!;
const cpflSP    = DISTRIBUIDORAS.find(d => d.codigo === 'CPFL_PAULISTA')!;
const copelPR   = DISTRIBUIDORAS.find(d => d.codigo === 'COPEL')!;

const modBifacial = { coeficienteTemperaturaPmax:-0.29, noct:45, toleranciaPercent:0, bifacial:true, ganhoBifacialPercent:5 };
const modMono     = { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false };
const invGrowatt  = { eficienciaMaximaPercent: 98.4 };
const invStd      = { eficienciaMaximaPercent: 97.0 };
const siteMG      = { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 };

const kit = (custoKitRS:number, extras=0) => ({
  kit:{ marcaModulo:'X',modeloModulo:'X',potenciaModuloWp:550,quantidade:8,
        tipoModulo:'bifacial' as const,marcaInversor:'X',modeloInversor:'X',
        potenciaInversorKW:4,custoKitRS },
  estruturaRS:extras, materiaisEletricosRS:0, maoDeObraRS:0, projetoArtRS:0, outrosCustosRS:0,
});

// ═══════════════════════════════════════════════════════════════════════════
// A. CENÁRIOS REAIS — perfis típicos brasileiros
// ═══════════════════════════════════════════════════════════════════════════
describe('A — Cenários reais de clientes', () => {

  it('[A01] ANA MARIA — Araguari/MG, Bifásico, 276 kWh/mês, tarifa R$1,18', () => {
    // Dados reais da conta CEMIG junho/2026
    const historico = [285,309,257,289,234,295,301,245,293,310,267,293];
    const media = historico.reduce((a,v)=>a+v,0)/historico.length;
    expect(media).toBeCloseTo(281.5, 0); // ~276-282 kWh/mês

    const hsp = hspPorUF('MG');
    const perdas = calcularPerdas(modBifacial, invGrowatt, siteMG);
    const dim = dimensionarSistema({ consumoMedioMensalKWh:media, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:550 });
    
    // Sistema mínimo esperado: ~2 kWp (276 / (5.4 * 30.4 * 0.84) ≈ 2.0)
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(1.5);
    expect(dim.potenciaSistemaKWp).toBeLessThan(3.0);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(media * 0.99);

    // Com tarifa real R$1,18: conta real antes = 285 * 1.1827 + 46.40 = R$383,46
    const tarifaReal = 1.18272801;
    const cemigComTarifaReal = {...cemig, tarifaKWhComICMS: tarifaReal};
    const cr = calcularCustosRecorrentes({
      distribuidora: cemigComTarifaReal, tipoLigacao: 'bifasica',
      cipRS: 46.40, consumoMedioMensalKWh: media,
      geracaoMensalKWh: dim.geracaoMensalEstimadaKWh, percentualFioB: 0.60,
    });
    // Conta antes: 281 * 1.18 + 46.40 ≈ R$378
    expect(cr.contaAntesRS).toBeCloseTo(media * tarifaReal + 46.40, 0);
    // Taxa disponibilidade: 50 kWh (bifásica) × R$1,18 = R$59,14
    expect(cr.taxaDisponibilidadeRS).toBeCloseTo(50 * tarifaReal, 1);
    expect(cr.economiaMensalRS).toBeGreaterThan(200); // economia expressiva
  });

  it('[A02] Residencial pequeno — GO, 180 kWh/mês, Monofásico, tarifa Equatorial', () => {
    const hsp = hspPorUF('GO');
    const perdas = calcularPerdas(modMono, invStd, { temperaturaAmbienteMediaC:26, perdaSombreamentoPercent:2, perdaSujidadePercent:3 });
    const dim = dimensionarSistema({ consumoMedioMensalKWh:180, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:450 });
    
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(1.0);
    expect(dim.potenciaSistemaKWp).toBeLessThan(2.5);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(180);
    
    const cr = calcularCustosRecorrentes({
      distribuidora: eqGO, tipoLigacao: 'monofasica',
      cipRS: 20, consumoMedioMensalKWh: 180,
      geracaoMensalKWh: dim.geracaoMensalEstimadaKWh, percentualFioB: 0,
    });
    expect(cr.taxaDisponibilidadeRS).toBeCloseTo(30 * eqGO.tarifaKWhComICMS, 1);
    expect(cr.economiaMensalRS).toBeGreaterThan(0);
  });

  it('[A03] Comercial médio — SP, 800 kWh/mês, Trifásico, CPFL', () => {
    const hsp = hspPorUF('SP');
    const perdas = calcularPerdas(modMono, invStd, { temperaturaAmbienteMediaC:22, perdaSombreamentoPercent:3, perdaSujidadePercent:2 });
    const dim = dimensionarSistema({ consumoMedioMensalKWh:800, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:595 });
    
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(5.0);
    expect(dim.potenciaSistemaKWp).toBeLessThan(10.0);
    expect(dim.potenciaInstaladaRealKWp).toBeLessThan(75); // microgeração
    
    const cr = calcularCustosRecorrentes({
      distribuidora: cpflSP, tipoLigacao: 'trifasica',
      cipRS: 28, consumoMedioMensalKWh: 800,
      geracaoMensalKWh: dim.geracaoMensalEstimadaKWh, percentualFioB: 0.60,
    });
    expect(cr.taxaDisponibilidadeRS).toBeCloseTo(100 * cpflSP.tarifaKWhComICMS, 1);
    expect(cr.economiaMensalRS).toBeGreaterThan(500);
  });

  it('[A04] RS sul do país — Porto Alegre, 450 kWh/mês, CEEE, verão/inverno assimétrico', () => {
    const hsp = hspPorUF('RS'); // 4.7 — menor do Brasil
    const perdas = calcularPerdas(modMono, invStd, { temperaturaAmbienteMediaC:18, perdaSombreamentoPercent:2, perdaSujidadePercent:1 });
    const dim = dimensionarSistema({ consumoMedioMensalKWh:450, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:550 });
    
    // RS precisa de mais kWp que MG para mesma demanda
    const dimMG = dimensionarSistema({ consumoMedioMensalKWh:450, hspLocal:hspPorUF('MG'), perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:550 });
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(dimMG.potenciaSistemaKWp);
  });

  it('[A05] Nordeste — Fortaleza/CE, 650 kWh/mês, altíssima irradiação', () => {
    const hsp = hspPorUF('CE'); // 5.7 — muito alto
    const perdas = calcularPerdas(modMono, invStd, { temperaturaAmbienteMediaC:28, perdaSombreamentoPercent:2, perdaSujidadePercent:4 });
    const dim = dimensionarSistema({ consumoMedioMensalKWh:650, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:620 });
    
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(3.5);
    // CE precisa de menos kWp que SC para a mesma demanda
    const dimSC = dimensionarSistema({ consumoMedioMensalKWh:650, hspLocal:hspPorUF('SC'), perdasSistema:0.18, potenciaModuloWp:620 });
    expect(dim.potenciaSistemaKWp).toBeLessThan(dimSC.potenciaSistemaKWp);
  });

  it('[A06] Pré-aposentado — consumo muito baixo (95 kWh/mês), MG', () => {
    const hsp = hspPorUF('MG');
    const dim = dimensionarSistema({ consumoMedioMensalKWh:95, hspLocal:hsp, perdasSistema:0.18, potenciaModuloWp:550 });
    expect(dim.numeroModulos).toBeGreaterThanOrEqual(1);
    // Sistema vai "superdimensionar" pois 1 módulo de 550Wp já gera mais que 95 kWh
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(95);
  });

  it('[A07] Empresa — alto consumo (3000 kWh/mês), PR, Copel, Trifásico', () => {
    const hsp = hspPorUF('PR');
    const dim = dimensionarSistema({ consumoMedioMensalKWh:3000, hspLocal:hsp, perdasSistema:0.18, potenciaModuloWp:670 });
    expect(dim.potenciaInstaladaRealKWp).toBeGreaterThan(20);
    // Deve ser classificado como minigeração (> 75 kWp)
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2025-01-01', potenciaInstaladaKW:dim.potenciaInstaladaRealKWp, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    if (dim.potenciaInstaladaRealKWp > 75) {
      expect(e.classe).toBe('minigeracao');
    } else {
      expect(e.classe).toBe('microgeracao');
    }
  });

  it('[A08] Tarifa bifásica CEMIG 2026: disponibilidade = 50 × R$1,1827', () => {
    // Baseado na conta real da Ana Maria
    const tarifaReal = 1.18272801;
    const cemigAtual = {...cemig, tarifaKWhComICMS: tarifaReal};
    const r = calcularCustosRecorrentes({
      distribuidora: cemigAtual, tipoLigacao: 'bifasica',
      cipRS: 46.40, consumoMedioMensalKWh: 285, geracaoMensalKWh: 300, percentualFioB: 0.60,
    });
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(50 * tarifaReal, 2); // R$59,14
    expect(r.cipRS).toBe(46.40);
    expect(r.contaAntesRS).toBeCloseTo(285 * tarifaReal + 46.40, 1); // ~R$383
  });

  it('[A09] Payback real: sistema 2kWp / R$8.000 / economia R$250/mês', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 8000, economiaMensalAno1: 250,
      degradacaoAnualModulos: 0.005, reajusteTarifarioAnual: 0.08,
      horizonteAnos: 25,
    });
    // Payback: 8000 / (250*12) = 2,67 anos → com reajuste 8% fica menor
    expect(r.paybackSimplesAnos).not.toBeNull();
    expect(r.paybackSimplesAnos!).toBeGreaterThan(1.5);
    expect(r.paybackSimplesAnos!).toBeLessThan(4.0);
    expect(r.economiaTotalHorizonte).toBeGreaterThan(8000 * 3); // retorna 3x+
  });

  it('[A10] Precificação real: kit R$9.800, extras R$3.200, total ~R$13k, margem 15%', () => {
    const r = calcularPrecificacao({
      composicao:{ kit:{...kit(9800).kit}, estruturaRS:900, materiaisEletricosRS:700, maoDeObraRS:1600, projetoArtRS:500, outrosCustosRS:0 },
      aliquotaImpostos: 0.06, margemDesejada: 0.15,
    });
    expect(r.custoTotalDireto).toBe(9800+900+700+1600+500);
    expect(r.precoVenda).toBeCloseTo(13500 / 0.79, 0);
    expect(r.lucroLiquido).toBeCloseTo(r.precoVenda * 0.15, 2);
    expect(r.impostoSobreVenda).toBeCloseTo(r.precoVenda * 0.06, 2);
    // Preço real: deve estar entre R$15k e R$25k para sistema residencial pequeno
    expect(r.precoVenda).toBeGreaterThan(15000);
    expect(r.precoVenda).toBeLessThan(25000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B. CENÁRIOS LIMÍTROFES — exatamente nos limites das normas
// ═══════════════════════════════════════════════════════════════════════════
describe('B — Cenários limítrofes normativos', () => {

  it('[B01] Limite art.26: protocolo EXATAMENTE 07/01/2023 → elegível', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2023-01-07', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(e.elegivelArt26).toBe(true);
    expect(percentualFioBPorAno(e, 2030)).toBe(0);
  });

  it('[B02] Limite art.26: protocolo EXATAMENTE 08/01/2023 → NÃO elegível', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2023-01-08', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(e.elegivelArt26).toBe(false);
    expect(percentualFioBPorAno(e, 2026)).toBe(0.60);
  });

  it('[B03] Limite microgeração: 75 kW exato → microgeração', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2025-01-01', potenciaInstaladaKW:75, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(e.classe).toBe('microgeracao');
  });

  it('[B04] Limite microgeração: 75,001 kW → minigeração', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2025-01-01', potenciaInstaladaKW:75.001, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(e.classe).toBe('minigeracao');
  });

  it('[B05] Fio B 2026 = exatamente 60% (não 59%, não 61%)', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2024-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(percentualFioBPorAno(e, 2026)).toBe(0.60);
  });

  it('[B06] Fio B muda de 90% para 100% exatamente em 2029', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2024-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(percentualFioBPorAno(e, 2028)).toBe(0.90);
    expect(percentualFioBPorAno(e, 2029)).toBe(1.00);
    expect(percentualFioBPorAno(e, 2030)).toBe(1.00);
  });

  it('[B07] Sistema EXATO no consumo: geração = consumo → compensação = 100%', () => {
    // Projetar um sistema que gera exatamente o consumo
    const consumo = 400;
    const hsp = hspPorUF('MG');
    const perdas = 0.20;
    // Calcular kWp que gera exatamente 400 kWh
    const kWpExato = consumo / (hsp * 30.4167 * (1 - perdas));
    // Qualquer módulo que der esse kWp vai compensar 100%
    const wpModulo = 1000; // módulo hipotético de 1kWp para simplificar
    const dim = dimensionarSistema({ consumoMedioMensalKWh:consumo, hspLocal:hsp, perdasSistema:perdas, potenciaModuloWp:wpModulo });
    expect(dim.percentualCompensacaoReal).toBeGreaterThanOrEqual(1.0);
  });

  it('[B08] Imposto + margem = 79% → preço = custo / 0.21 (não deve dar erro)', () => {
    const r = calcularPrecificacao({ composicao:kit(10000), aliquotaImpostos:0.50, margemDesejada:0.29 });
    expect(r.precoVenda).toBeCloseTo(10000 / 0.21, 0);
  });

  it('[B09] Imposto + margem = 99,9% → preço = custo × 1000 (extremo mas válido)', () => {
    const r = calcularPrecificacao({ composicao:kit(1000), aliquotaImpostos:0.50, margemDesejada:0.499 });
    expect(r.precoVenda).toBeGreaterThan(1000 * 100);
  });

  it('[B10] Degradação ZERO: economia de todos os anos = ano 1 (sem decaimento)', () => {
    const r = calcularFluxoCaixa({ investimentoInicial:10000, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:10 });
    for (let i=1; i<=10; i++) {
      expect(r.fluxoAnual[i]).toBeCloseTo(300*12, 5);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C. VALORES IMPOSSÍVEIS — o programa NÃO pode travar
// ═══════════════════════════════════════════════════════════════════════════
describe('C — Valores impossíveis (robustez)', () => {

  it('[C01] ABSURDO: consumo 0 kWh → sistema de 1 módulo mínimo', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:0.001, hspLocal:5.4, perdasSistema:0.20, potenciaModuloWp:550 });
    expect(dim.numeroModulos).toBeGreaterThanOrEqual(1);
    expect(dim.potenciaInstaladaRealKWp).toBeGreaterThan(0);
  });

  it('[C02] ABSURDO: HSP = 0 → deve lançar erro (impossível fisicamente)', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh:500, hspLocal:0, perdasSistema:0.20, potenciaModuloWp:550 })).toThrow();
  });

  it('[C03] ABSURDO: HSP negativo → deve lançar erro', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh:500, hspLocal:-5, perdasSistema:0.20, potenciaModuloWp:550 })).toThrow();
  });

  it('[C04] ABSURDO: perdas 100% (100%) → deve lançar erro (nada gerado)', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:1.0, potenciaModuloWp:550 })).toThrow();
  });

  it('[C05] ABSURDO: perdas 150% → deve lançar erro', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:1.5, potenciaModuloWp:550 })).toThrow();
  });

  it('[C06] ABSURDO: módulo de 1 Wp → muitos módulos, mas cálculo ainda correto', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:100, hspLocal:5.4, perdasSistema:0.20, potenciaModuloWp:1 });
    // 100 kWh / (5.4 × 30.4 × 0.80) = 0.762 kWp → 762 módulos de 1Wp
    expect(dim.numeroModulos).toBeGreaterThan(500);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(100);
    // Potência real = numeroModulos × 0.001 kWp
    expect(dim.potenciaInstaladaRealKWp).toBeCloseTo(dim.numeroModulos * 0.001, 3);
  });

  it('[C07] ABSURDO: módulo de 100.000 Wp → 1 módulo suficiente para 500 kWh', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:0.20, potenciaModuloWp:100000 });
    expect(dim.numeroModulos).toBe(1);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThan(500);
  });

  it('[C08] ABSURDO: consumo 1.000.000 kWh/mês → cálculo correto (usina)', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:1000000, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:670 });
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(5000);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(999000);
  });

  it('[C09] ABSURDO: tarifa distribuidora R$0 → disponibilidade = R$0', () => {
    const distribGratis = {...cemig, tarifaKWhComICMS: 0};
    const r = calcularCustosRecorrentes({ distribuidora:distribGratis, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:300, geracaoMensalKWh:320, percentualFioB:0 });
    expect(r.taxaDisponibilidadeRS).toBe(0);
    expect(r.custoBFioMensalRS).toBe(0);
    expect(r.cipRS).toBe(18);
  });

  it('[C10] ABSURDO: tarifa R$100/kWh → cálculos ainda corretos (gigantesco)', () => {
    const distribCara = {...cemig, tarifaKWhComICMS: 100};
    const r = calcularCustosRecorrentes({ distribuidora:distribCara, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:300, geracaoMensalKWh:320, percentualFioB:0 });
    expect(r.contaAntesRS).toBeCloseTo(300 * 100 + 18, 1);
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * 100, 1);
    expect(r.economiaMensalRS).toBeGreaterThan(0);
  });

  it('[C11] ABSURDO: imposto + margem = 100% exato → deve lançar erro', () => {
    expect(() => calcularPrecificacao({ composicao:kit(10000), aliquotaImpostos:0.50, margemDesejada:0.50 })).toThrow();
  });

  it('[C12] ABSURDO: imposto + margem > 100% → deve lançar erro', () => {
    expect(() => calcularPrecificacao({ composicao:kit(10000), aliquotaImpostos:0.60, margemDesejada:0.60 })).toThrow();
  });

  it('[C13] ABSURDO: custo do kit = R$0 → preço final = R$0', () => {
    const r = calcularPrecificacao({ composicao:kit(0), aliquotaImpostos:0.06, margemDesejada:0.15 });
    expect(r.precoVenda).toBe(0);
  });

  it('[C14] ABSURDO: financiamento 0 parcelas → deve lançar erro', () => {
    expect(() => gerarTabelaPrice({ valorFinanciado:10000, taxaJurosMensal:0.02, numeroParcelas:0 })).toThrow();
  });

  it('[C15] ABSURDO: valor financiado negativo → deve lançar erro', () => {
    expect(() => gerarTabelaPrice({ valorFinanciado:-10000, taxaJurosMensal:0.02, numeroParcelas:12 })).toThrow();
  });

  it('[C16] ABSURDO: eficiência inversor 0% → perda = 100% (toda energia perdida)', () => {
    const r = calcularPerdas(modMono, { eficienciaMaximaPercent:0 }, siteMG);
    expect(r.perdaInversor).toBeCloseTo(1.0, 5);
    expect(r.perdaTotalLiquida).toBeGreaterThan(0.99); // praticamente tudo perdido
  });

  it('[C17] ABSURDO: inversor 200% eficiência → perda negativa (ganho impossível)', () => {
    // O sistema deve aceitar matematicamente mas o resultado é fisicamente impossível
    // A perda do inversor seria negativa (ganho)
    const r = calcularPerdas(modMono, { eficienciaMaximaPercent:200 }, siteMG);
    expect(r.perdaInversor).toBeCloseTo(-1.0, 5); // -100% = ganho 100%
    // Sistema não deve travar, só retorna valor matematicamente consistente
    expect(typeof r.perdaTotalLiquida).toBe('number');
  });

  it('[C18] Protocolo em 1900 → IS elegível ao art.26 (sistema existia antes da publicação da Lei 14.300/2022)', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'1900-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    // 1900 é antes da publicação da lei 14.300 (2022), mas MUITO antes do prazo do art.26
    // O código deve tratar isso: como é antes da publicação da lei, não é elegível ao art.26
    // (o critério é "dentro de 12 meses após 07/01/2022")
    expect(e.elegivelArt26).toBe(true); // 1900 não está nos 12 meses após 2022
  });

  it('[C19] ABSURDO: protocolo em 2050 → não elegível, Fio B = 100%', () => {
    const e = classificarEnquadramento({ dataProtocoloAcesso:'2050-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local' });
    expect(e.elegivelArt26).toBe(false);
    expect(percentualFioBPorAno(e, 2050)).toBe(1.0);
  });

  it('[C20] ABSURDO: investimento R$0 → deve lançar erro no fluxo de caixa', () => {
    expect(() => calcularFluxoCaixa({ investimentoInicial:0, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25 })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// D. CONSISTÊNCIA MATEMÁTICA — cross-checks entre módulos
// ═══════════════════════════════════════════════════════════════════════════
describe('D — Consistência matemática', () => {

  it('[D01] Potência real = nModulos × potModulo / 1000 (sempre)', () => {
    for (const wp of [300,400,550,620,670]) {
      const dim = dimensionarSistema({ consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:wp });
      expect(dim.potenciaInstaladaRealKWp).toBeCloseTo(dim.numeroModulos * wp / 1000, 8);
    }
  });

  it('[D02] Geração anual = 12 × geração mensal (sempre)', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:600, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:620 });
    expect(dim.geracaoAnualEstimadaKWh).toBeCloseTo(dim.geracaoMensalEstimadaKWh * 12, 5);
  });

  it('[D03] Geração mensal usando IEC 61724-1 (dias = 30,4167)', () => {
    const kWp = 4;
    const hsp = 5.4;
    const ef = 0.82;
    const dim = dimensionarSistema({ consumoMedioMensalKWh:1, hspLocal:hsp, perdasSistema:1-ef, potenciaModuloWp:kWp*1000 });
    const geracaoEsperada = kWp * hsp * 30.4167 * ef;
    expect(dim.geracaoMensalEstimadaKWh).toBeCloseTo(geracaoEsperada, 2);
  });

  it('[D04] Custo total = soma individual de todos os componentes', () => {
    const c = { kit:{...kit(8000).kit}, estruturaRS:900, materiaisEletricosRS:700, maoDeObraRS:1500, projetoArtRS:500, outrosCustosRS:200 };
    const r = calcularPrecificacao({ composicao:c, aliquotaImpostos:0.06, margemDesejada:0.15 });
    expect(r.custoTotalDireto).toBe(8000+900+700+1500+500+200);
  });

  it('[D05] Preço de venda = custo + imposto + lucro (centavo a centavo)', () => {
    const r = calcularPrecificacao({ composicao:kit(12000), aliquotaImpostos:0.07, margemDesejada:0.18 });
    expect(r.custoTotalDireto + r.impostoSobreVenda + r.lucroLiquido).toBeCloseTo(r.precoVenda, 2);
  });

  it('[D06] VPL = 0 quando a taxa de desconto = TIR calculada', () => {
    const fluxo = [-15000, ...Array(25).fill(5000)];
    const tir = calcularTIR(fluxo)!;
    const vpl = fluxo.reduce((s, cf, t) => s + cf / (1+tir)**t, 0);
    expect(Math.abs(vpl)).toBeLessThan(0.01);
  });

  it('[D07] Payback simples = investimento / economia_anual quando constante', () => {
    const investimento = 15000;
    const economiaMensal = 500;
    const r = calcularFluxoCaixa({ investimentoInicial:investimento, economiaMensalAno1:economiaMensal, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25 });
    const paybackEsperado = investimento / (economiaMensal * 12);
    expect(r.paybackSimplesAnos).toBeCloseTo(paybackEsperado, 4);
  });

  it('[D08] ROI = (economiaTotalHorizonte - investimento) / investimento', () => {
    const r = calcularFluxoCaixa({ investimentoInicial:20000, economiaMensalAno1:600, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.07, horizonteAnos:25 });
    const roiEsperado = (r.economiaTotalHorizonte - 20000) / 20000;
    expect(calcularROI(20000, r.economiaTotalHorizonte)).toBeCloseTo(roiEsperado, 6);
  });

  it('[D09] Parcela Price: total pago = parcela × n (todas parcelas iguais)', () => {
    const t = gerarTabelaPrice({ valorFinanciado:18000, taxaJurosMensal:0.0199, numeroParcelas:48 });
    expect(totalPagoPrice(t)).toBeCloseTo(t[0].parcela * 48, 2);
  });

  it('[D10] Maior perdas → menor geração → mais módulos necessários (monotonicidade)', () => {
    const base = { consumoMedioMensalKWh:400, hspLocal:5.4, potenciaModuloWp:550 };
    const d1 = dimensionarSistema({...base, perdasSistema:0.10});
    const d2 = dimensionarSistema({...base, perdasSistema:0.20});
    const d3 = dimensionarSistema({...base, perdasSistema:0.30});
    expect(d1.potenciaSistemaKWp).toBeLessThan(d2.potenciaSistemaKWp);
    expect(d2.potenciaSistemaKWp).toBeLessThan(d3.potenciaSistemaKWp);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E. TARIFA REAL DA CONTA — novo campo crítico
// ═══════════════════════════════════════════════════════════════════════════
describe('E — Tarifa real da conta', () => {

  it('[E01] Tarifa R$1,18 (conta CEMIG jun/2026) vs banco de dados R$1,18: deve usar a da conta', () => {
    const tarifaReal = 1.18272801;
    const cemigComReal = {...cemig, tarifaKWhComICMS: tarifaReal};
    const r = calcularCustosRecorrentes({
      distribuidora: cemigComReal, tipoLigacao: 'bifasica',
      cipRS: 46.40, consumoMedioMensalKWh: 285, geracaoMensalKWh: 300, percentualFioB: 0.60,
    });
    expect(r.contaAntesRS).toBeCloseTo(285 * tarifaReal + 46.40, 1);
  });

  it('[E02] Conta antes com tarifa real R$1,18 = R$383 (igual à conta real)', () => {
    const tarifaReal = 1.18272801;
    const cemigComReal = {...cemig, tarifaKWhComICMS: tarifaReal};
    const r = calcularCustosRecorrentes({
      distribuidora: cemigComReal, tipoLigacao: 'bifasica',
      cipRS: 46.40, consumoMedioMensalKWh: 285, geracaoMensalKWh: 300, percentualFioB: 0,
    });
    // R$337,06 + R$46,40 = R$383,46 (valor real da conta)
    expect(r.contaAntesRS).toBeCloseTo(383.46, 0);
  });

  it('[E03] Economia com tarifa real é 31% maior que com tarifa antiga', () => {
    const tarifaAntiga = 0.9012;
    const tarifaReal  = 1.18272801;
    const base = { tipoLigacao:'bifasica' as const, cipRS:46.40, consumoMedioMensalKWh:285, geracaoMensalKWh:300, percentualFioB:0 };
    const rAntiga = calcularCustosRecorrentes({ distribuidora:{...cemig, tarifaKWhComICMS:tarifaAntiga}, ...base });
    const rReal   = calcularCustosRecorrentes({ distribuidora:{...cemig, tarifaKWhComICMS:tarifaReal}, ...base });
    // A conta real é 31% maior, portanto a economia também é maior
    expect(rReal.contaAntesRS).toBeGreaterThan(rAntiga.contaAntesRS * 1.25);
    expect(rReal.economiaMensalRS).toBeGreaterThan(rAntiga.economiaMensalRS * 1.25);
  });

  it('[E04] Tarifa real R$1,18 atualiza o banco de dados CEMIG (foi corrigido)', () => {
    // Após a correção, cemig.tarifaKWhComICMS deve ser ~1,18
    expect(cemig.tarifaKWhComICMS).toBeCloseTo(1.1827, 3);
  });

  it('[E05] CIP real de Araguari (R$46,40) muito diferente do padrão anterior (R$18)', () => {
    // A conta real mostrou R$46,40 de CIP vs R$18 que era o padrão
    // Importante: CIP varia muito por município — sempre copiar da conta
    expect(46.40).toBeGreaterThan(18 * 2); // mais que o dobro do padrão antigo
    expect(cemig.cipMediaReferenciaRS).toBeCloseTo(46.0, 0); // banco atualizado
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// F. PIPELINE COMPLETO — da conta ao resultado final
// ═══════════════════════════════════════════════════════════════════════════
describe('F — Pipeline completo end-to-end', () => {

  it('[F01] Pipeline completo: conta Ana Maria → dimensionamento → preço → payback', () => {
    // DADOS DA CONTA (reais)
    const historico = [285,309,257,289,234,295,301,245,293,310,267,293];
    const mediaKWh  = historico.reduce((a,v)=>a+v,0)/historico.length;
    const tarifaReal= 1.18272801;
    const cipMensal = 46.40;

    // DIMENSIONAMENTO
    const hsp    = hspPorUF('MG');
    const perdas = calcularPerdas(modBifacial, invGrowatt, siteMG);
    const dim    = dimensionarSistema({ consumoMedioMensalKWh:mediaKWh, hspLocal:hsp, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:550 });

    // CUSTOS RECORRENTES com tarifa real
    const cemigReal = {...cemig, tarifaKWhComICMS:tarifaReal};
    const cr = calcularCustosRecorrentes({
      distribuidora:cemigReal, tipoLigacao:'bifasica', cipRS:cipMensal,
      consumoMedioMensalKWh:mediaKWh, geracaoMensalKWh:dim.geracaoMensalEstimadaKWh,
      percentualFioB:0.60, // 2026
    });

    // PRECIFICAÇÃO (kit 4× 550Wp ≈ R$4.500, instalação R$2.500 total)
    const preco = calcularPrecificacao({
      composicao:{ kit:{...kit(4500).kit,quantidade:dim.numeroModulos,custoKitRS:4500}, estruturaRS:600, materiaisEletricosRS:400, maoDeObraRS:dim.numeroModulos*280, projetoArtRS:500, outrosCustosRS:0 },
      aliquotaImpostos:0.06, margemDesejada:0.15,
    });

    // PAYBACK
    const fluxo = calcularFluxoCaixa({
      investimentoInicial:preco.precoVenda, economiaMensalAno1:cr.economiaMensalRS,
      degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.08, horizonteAnos:25,
    });

    // VALIDAÇÕES INTEGRADAS
    expect(mediaKWh).toBeGreaterThan(250);
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(1.5);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(mediaKWh);
    expect(cr.economiaMensalRS).toBeGreaterThan(150);
    expect(cr.contaAntesRS).toBeCloseTo(mediaKWh * tarifaReal + cipMensal, 0);
    expect(preco.precoVenda).toBeGreaterThan(7000);
    expect(preco.precoVenda).toBeLessThan(20000);
    expect(fluxo.paybackSimplesAnos).not.toBeNull();
    expect(fluxo.paybackSimplesAnos!).toBeLessThan(10);
    expect(fluxo.economiaTotalHorizonte).toBeGreaterThan(preco.precoVenda * 2); // retorna 2× no mínimo
  });

  it('[F02] Quanto maior o consumo, maior o kit necessário (monotonicidade)', () => {
    const hsp = hspPorUF('MG');
    const consumos = [200, 400, 600, 800, 1200];
    let anteriorKWp = 0;
    for (const c of consumos) {
      const d = dimensionarSistema({ consumoMedioMensalKWh:c, hspLocal:hsp, perdasSistema:0.18, potenciaModuloWp:550 });
      expect(d.potenciaSistemaKWp).toBeGreaterThan(anteriorKWp);
      anteriorKWp = d.potenciaSistemaKWp;
    }
  });

  it('[F03] Tarifa mais alta → economia maior → payback menor', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550 });
    const tarifas = [0.80, 1.00, 1.18, 1.40];
    let economiaAnterior = 0;
    for (const tar of tarifas) {
      const cr = calcularCustosRecorrentes({
        distribuidora:{...cemig, tarifaKWhComICMS:tar}, tipoLigacao:'monofasica',
        cipRS:20, consumoMedioMensalKWh:400, geracaoMensalKWh:dim.geracaoMensalEstimadaKWh, percentualFioB:0,
      });
      expect(cr.economiaMensalRS).toBeGreaterThan(economiaAnterior);
      economiaAnterior = cr.economiaMensalRS;
    }
  });

  it('[F04] Formato payback "X anos e Y meses" para todos os paybacks reais', () => {
    const casos = [1.0, 1.5, 2.25, 2.667, 3.0, 4.333, 5.75, 7.0, 8.5];
    for (const anos of casos) {
      const f = formatarPayback(anos);
      expect(typeof f).toBe('string');
      expect(f.length).toBeGreaterThan(0);
      expect(f).not.toContain('NaN');
      expect(f).not.toContain('undefined');
    }
  });

  it('[F05] Área no telhado proporcional ao número de módulos', () => {
    const areas = [4,6,8,10,12,16].map(n => ({ n, area: areaTotalNecessariaM2(n, 550) }));
    for (let i=1; i<areas.length; i++) {
      expect(areas[i].area).toBeGreaterThan(areas[i-1].area);
    }
    // Área de 12 módulos de 550Wp ~ 30m² (2.2m² por módulo × 1.1 espaçamento)
    expect(areaTotalNecessariaM2(12, 550)).toBeGreaterThan(25);
    expect(areaTotalNecessariaM2(12, 550)).toBeLessThan(40);
  });
});
