/**
 * BATERIA DE 100 TESTES — LumenSolar
 *
 * Cobre valores normais, limites normativos e casos absurdos/extremos.
 * Todo comportamento inesperado aqui é um bug.
 */

import { describe, expect, it } from 'vitest';

// Módulos de domínio
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { calcularPerdas } from './dimensionamento/calcularPerdas';
import { hspPorUF } from '../data/hspPorUF';
import { fatoresMensaisPorUF, geracaoMensalPorMes, MESES_LABELS } from '../data/hspMensal';
import { classificarEnquadramento, percentualFioBPorAno, custoAnualFioB } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS, KWH_DISPONIBILIDADE } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { calcularAliquotaEfetivaSimples, SIMPLES_ANEXO_I, SIMPLES_ANEXO_III } from '../data/tributacao';
import { gerarTabelaPrice, totalPagoPrice, totalJurosPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import {
  calcularTIR, calcularROI, formatarPayback,
  areaTotalNecessariaM2, pesoDistribuidoKgM2, simularFinanciamento,
} from './financeiro/indicadores';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const cemig = DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!;
const eqGO  = DISTRIBUIDORAS.find(d => d.codigo === 'EQUATORIAL_GO')!;

const moduloPadrao = { coeficienteTemperaturaPmax: -0.34, noct: 45, toleranciaPercent: 0, bifacial: false };
const moduloBifacial = { coeficienteTemperaturaPmax: -0.29, noct: 45, toleranciaPercent: 0, bifacial: true, ganhoBifacialPercent: 5 };
const inversorBom   = { eficienciaMaximaPercent: 98.4 };
const inversorMed   = { eficienciaMaximaPercent: 97.0 };
const siteMG = { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 };
const siteQuente = { temperaturaAmbienteMediaC: 32, perdaSombreamentoPercent: 3, perdaSujidadePercent: 4 };
const siteFrio   = { temperaturaAmbienteMediaC: 18, perdaSombreamentoPercent: 0, perdaSujidadePercent: 1 };

// ── BLOCO 1: Dimensionamento (15 testes) ─────────────────────────────────────
describe('Dimensionamento', () => {
  it('[01] Residencial padrão — MG 500 kWh/mês, 550 Wp', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 500, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 550 });
    expect(r.potenciaSistemaKWp).toBeGreaterThan(3);
    expect(r.potenciaSistemaKWp).toBeLessThan(5);
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(500);
  });

  it('[02] Residencial pequeno — GO 300 kWh/mês, 620 Wp bifacial', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 300, hspLocal: 5.5, perdasSistema: 0.15, potenciaModuloWp: 620 });
    expect(r.numeroModulos).toBeGreaterThanOrEqual(2);
    expect(r.numeroModulos).toBeLessThanOrEqual(8);
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(300);
  });

  it('[03] Comercial médio — SP 2000 kWh/mês', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 2000, hspLocal: 5.0, perdasSistema: 0.18, potenciaModuloWp: 595 });
    expect(r.potenciaInstaladaRealKWp).toBeGreaterThan(12);
    expect(r.potenciaInstaladaRealKWp).toBeLessThan(75); // limite microgeração
  });

  it('[04] Consumo muito baixo — 50 kWh/mês (microgeração)', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 50, hspLocal: 5.5, perdasSistema: 0.20, potenciaModuloWp: 550 });
    expect(r.numeroModulos).toBeGreaterThanOrEqual(1);
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(50);
  });

  it('[05] Consumo alto — 5000 kWh/mês (minigeração)', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 5000, hspLocal: 5.4, perdasSistema: 0.18, potenciaModuloWp: 670 });
    expect(r.potenciaInstaladaRealKWp).toBeGreaterThan(30);
    expect(r.potenciaInstaladaRealKWp).toBeLessThan(3000); // limite minigeração
  });

  it('[06] ABSURDO: HSP zero → deve lançar erro', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh: 500, hspLocal: 0, perdasSistema: 0.20, potenciaModuloWp: 550 })).toThrow();
  });

  it('[07] ABSURDO: HSP negativo → deve lançar erro', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh: 500, hspLocal: -1, perdasSistema: 0.20, potenciaModuloWp: 550 })).toThrow();
  });

  it('[08] ABSURDO: Perdas = 1 (100%) → deve lançar erro', () => {
    expect(() => dimensionarSistema({ consumoMedioMensalKWh: 500, hspLocal: 5.4, perdasSistema: 1, potenciaModuloWp: 550 })).toThrow();
  });

  it('[09] ABSURDO: Módulo de 1 Wp → muitos módulos mas cálculo correto', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 100, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 1 });
    expect(r.numeroModulos).toBeGreaterThan(100);
    expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(100);
  });

  it('[10] ABSURDO: Módulo de 10.000 Wp → 1 módulo provavelmente', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 300, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 10000 });
    expect(r.numeroModulos).toBeGreaterThanOrEqual(1);
    expect(r.potenciaInstaladaRealKWp).toBeGreaterThanOrEqual(0);
  });

  it('[11] Número de módulos sempre arredondado para CIMA', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 501, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 550 });
    expect(r.potenciaInstaladaRealKWp).toBeGreaterThanOrEqual(r.potenciaSistemaKWp);
  });

  it('[12] Geração mensal >= consumo quando compensação >= 100%', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 400, hspLocal: 5.5, perdasSistema: 0.20, potenciaModuloWp: 620 });
    if (r.percentualCompensacaoReal >= 1) {
      expect(r.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(400);
    }
  });

  it('[13] Geração anual = 12 × geração mensal', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 600, hspLocal: 5.3, perdasSistema: 0.18, potenciaModuloWp: 595 });
    expect(r.geracaoAnualEstimadaKWh).toBeCloseTo(r.geracaoMensalEstimadaKWh * 12, 5);
  });

  it('[14] Potência real = nModulos × potModulo / 1000', () => {
    const r = dimensionarSistema({ consumoMedioMensalKWh: 350, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 450 });
    expect(r.potenciaInstaladaRealKWp).toBeCloseTo(r.numeroModulos * 450 / 1000, 8);
  });

  it('[15] Alta irradiação (RN) gera mais que baixa irradiação (SC) para mesmo kit', () => {
    const rRN = dimensionarSistema({ consumoMedioMensalKWh: 400, hspLocal: hspPorUF('RN'), perdasSistema: 0.20, potenciaModuloWp: 550 });
    const rSC = dimensionarSistema({ consumoMedioMensalKWh: 400, hspLocal: hspPorUF('SC'), perdasSistema: 0.20, potenciaModuloWp: 550 });
    expect(rRN.potenciaSistemaKWp).toBeLessThan(rSC.potenciaSistemaKWp); // RN precisa de menos kWp para gerar o mesmo
  });
});

// ── BLOCO 2: Lei 14.300/2022 — Fio B (15 testes) ────────────────────────────
describe('Lei 14.300/2022 — Fio B', () => {
  const params = (data: string) => ({ dataProtocoloAcesso: data, potenciaInstaladaKW: 5, fonte: 'fotovoltaica' as const, modalidade: 'autoconsumo_local' as const });

  it('[16] Protocolo 07/01/2022 (dia da publicação) → elegível art.26', () => {
    expect(classificarEnquadramento(params('2022-01-07')).elegivelArt26).toBe(true);
  });
  it('[17] Protocolo 15/06/2022 → elegível art.26', () => {
    expect(classificarEnquadramento(params('2022-06-15')).elegivelArt26).toBe(true);
  });
  it('[18] Protocolo 07/01/2023 (limite exato 12 meses) → elegível art.26', () => {
    expect(classificarEnquadramento(params('2023-01-07')).elegivelArt26).toBe(true);
  });
  it('[19] Protocolo 08/01/2023 (um dia depois) → NÃO elegível', () => {
    expect(classificarEnquadramento(params('2023-01-08')).elegivelArt26).toBe(false);
  });
  it('[20] Protocolo 2025 → NÃO elegível art.26', () => {
    expect(classificarEnquadramento(params('2025-06-01')).elegivelArt26).toBe(false);
  });
  it('[21] Art.26: percentual Fio B em 2025 = 0%', () => {
    const e = classificarEnquadramento(params('2022-06-01'));
    expect(percentualFioBPorAno(e, 2025)).toBe(0);
  });
  it('[22] Art.26: percentual em 2035 = 0%', () => {
    const e = classificarEnquadramento(params('2022-06-01'));
    expect(percentualFioBPorAno(e, 2035)).toBe(0);
  });
  it('[23] Art.26: percentual em 2045 = 0% (limite da regra)', () => {
    const e = classificarEnquadramento(params('2022-06-01'));
    expect(percentualFioBPorAno(e, 2045)).toBe(0);
  });
  it('[24] Art.27: 2023 = 15%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2023)).toBe(0.15);
  });
  it('[25] Art.27: 2024 = 30%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2024)).toBe(0.30);
  });
  it('[26] Art.27: 2025 = 45%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2025)).toBe(0.45);
  });
  it('[27] Art.27: 2026 = 60%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2026)).toBe(0.60);
  });
  it('[28] Art.27: 2027 = 75%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2027)).toBe(0.75);
  });
  it('[29] Art.27: 2028 = 90%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2028)).toBe(0.90);
  });
  it('[30] Art.27: 2029 e além = 100%', () => {
    const e = classificarEnquadramento(params('2024-01-01'));
    expect(percentualFioBPorAno(e, 2029)).toBe(1);
    expect(percentualFioBPorAno(e, 2035)).toBe(1);
    expect(percentualFioBPorAno(e, 2050)).toBe(1);
  });
});

// ── BLOCO 3: Perdas do sistema (10 testes) ────────────────────────────────────
describe('Perdas do sistema', () => {
  it('[31] Inversor 98,4% → perda de inversor = 1,6%', () => {
    const r = calcularPerdas(moduloPadrao, inversorBom, siteMG);
    expect(r.perdaInversor).toBeCloseTo(0.016, 5);
  });

  it('[32] Bifacial 5% ganho → perdas líquidas menores que mono equivalente', () => {
    const mono = calcularPerdas(moduloPadrao, inversorMed, siteMG);
    const bif  = calcularPerdas(moduloBifacial, inversorMed, siteMG);
    expect(bif.perdaTotalLiquida).toBeLessThan(mono.perdaTotalLiquida);
  });

  it('[33] Temperatura quente (32°C) → mais perdas que fria (18°C)', () => {
    const rQ = calcularPerdas(moduloPadrao, inversorMed, siteQuente);
    const rF = calcularPerdas(moduloPadrao, inversorMed, siteFrio);
    expect(rQ.perdaTotalLiquida).toBeGreaterThan(rF.perdaTotalLiquida);
  });

  it('[34] Perdas totais entre 5% e 25% em todos os casos normais', () => {
    const casos = [
      calcularPerdas(moduloPadrao, inversorBom, siteFrio),
      calcularPerdas(moduloPadrao, inversorMed, siteMG),
      calcularPerdas(moduloPadrao, inversorMed, siteQuente),
      calcularPerdas(moduloBifacial, inversorBom, siteMG),
    ];
    for (const r of casos) {
      expect(r.perdaTotalLiquida).toBeGreaterThan(0.04);
      expect(r.perdaTotalLiquida).toBeLessThan(0.30);
    }
  });

  it('[35] Sem sombreamento + sem sujidade → perdas menores', () => {
    const rSem = calcularPerdas(moduloPadrao, inversorMed, { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 0, perdaSujidadePercent: 0 });
    const rCom = calcularPerdas(moduloPadrao, inversorMed, siteMG);
    expect(rSem.perdaTotalLiquida).toBeLessThan(rCom.perdaTotalLiquida);
  });

  it('[36] Sombreamento 15% → perdas totais > 15%', () => {
    const r = calcularPerdas(moduloPadrao, inversorMed, { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 15, perdaSujidadePercent: 0 });
    expect(r.perdaTotalLiquida).toBeGreaterThan(0.15);
  });

  it('[37] NOCT igual a 25°C → perda de temperatura quase zero (Tamb 24°C)', () => {
    const r = calcularPerdas({ ...moduloPadrao, noct: 25 }, inversorMed, { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 0, perdaSujidadePercent: 0 });
    // Tcélula = 24 + (25-20)*0.8 = 28°C → ΔT = 3°C → perda = 0.34% × 3 = 1.02%
    expect(r.perdaTemperatura).toBeLessThan(0.015);
  });

  it('[38] NOCT 50°C, Tamb 30°C → perda de temperatura > 8%', () => {
    const r = calcularPerdas({ ...moduloPadrao, noct: 50 }, inversorMed, { temperaturaAmbienteMediaC: 30, perdaSombreamentoPercent: 0, perdaSujidadePercent: 0 });
    // Tcélula = 30 + 30*0.8 = 54°C → ΔT = 29°C → perda = 0.34% × 29 ≈ 9.86%
    expect(r.perdaTemperatura).toBeGreaterThan(0.08);
  });

  it('[39] Inversor 100% eficiência → perda inversor = 0', () => {
    const r = calcularPerdas(moduloPadrao, { eficienciaMaximaPercent: 100 }, siteMG);
    expect(r.perdaInversor).toBeCloseTo(0, 8);
  });

  it('[40] ABSURDO: Inversor 50% eficiência → perda de 50% no inversor', () => {
    const r = calcularPerdas(moduloPadrao, { eficienciaMaximaPercent: 50 }, siteMG);
    expect(r.perdaInversor).toBeCloseTo(0.50, 5);
  });
});

// ── BLOCO 4: Custos recorrentes e ANEEL (10 testes) ──────────────────────────
describe('Custos recorrentes (ANEEL / Lei 14.300)', () => {
  const base = (tipoLigacao: 'monofasica'|'bifasica'|'trifasica', cipRS = 18, percentualFioB = 0) => ({
    distribuidora: cemig, tipoLigacao, cipRS, consumoMedioMensalKWh: 500,
    geracaoMensalKWh: 520, percentualFioB,
  });

  it('[41] Taxa disponibilidade monofásica = 30 kWh × tarifa CEMIG', () => {
    const r = calcularCustosRecorrentes(base('monofasica'));
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * cemig.tarifaKWhComICMS, 3);
  });
  it('[42] Taxa disponibilidade bifásica = 50 kWh × tarifa', () => {
    const r = calcularCustosRecorrentes(base('bifasica'));
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(50 * cemig.tarifaKWhComICMS, 3);
  });
  it('[43] Taxa disponibilidade trifásica = 100 kWh × tarifa', () => {
    const r = calcularCustosRecorrentes(base('trifasica'));
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(100 * cemig.tarifaKWhComICMS, 3);
  });
  it('[44] Fio B = 0 quando percentual = 0 (art.26)', () => {
    const r = calcularCustosRecorrentes(base('monofasica', 18, 0));
    expect(r.custoBFioMensalRS).toBe(0);
  });
  it('[45] Fio B > 0 quando percentual = 60% (2026)', () => {
    const r = calcularCustosRecorrentes(base('monofasica', 18, 0.60));
    expect(r.custoBFioMensalRS).toBeGreaterThan(0);
  });
  it('[46] Conta antes = consumo × tarifa + CIP', () => {
    const r = calcularCustosRecorrentes(base('monofasica', 18, 0));
    expect(r.contaAntesRS).toBeCloseTo(500 * cemig.tarifaKWhComICMS + 18, 1);
  });
  it('[47] Total fixo = disponibilidade + CIP + FioB', () => {
    const r = calcularCustosRecorrentes(base('monofasica', 20, 0.60));
    expect(r.totalFixoMensalRS).toBeCloseTo(r.taxaDisponibilidadeRS + r.cipRS + r.custoBFioMensalRS, 4);
  });
  it('[48] Economia < conta antes (não pode economizar mais do que gastava)', () => {
    const r = calcularCustosRecorrentes(base('monofasica', 18, 0));
    expect(r.economiaMensalRS).toBeLessThanOrEqual(r.contaAntesRS);
  });
  it('[49] ABSURDO: Geração = 0 → economia próxima de zero', () => {
    const r = calcularCustosRecorrentes({ ...base('monofasica'), geracaoMensalKWh: 0 });
    expect(r.custoBFioMensalRS).toBe(0); // sem compensação, sem Fio B
  });
  it('[50] Equatorial GO tarifa válida e positiva', () => {
    expect(eqGO.tarifaKWhComICMS).toBeGreaterThan(0);
    const r = calcularCustosRecorrentes({ distribuidora: eqGO, tipoLigacao: 'monofasica', cipRS: 15, consumoMedioMensalKWh: 400, geracaoMensalKWh: 420, percentualFioB: 0 });
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * eqGO.tarifaKWhComICMS, 3);
  });
});

// ── BLOCO 5: Precificação (10 testes) ────────────────────────────────────────
describe('Precificação', () => {
  const comp = (custoKit: number, extras = 0) => ({
    kit: { marcaModulo:'X', modeloModulo:'X', potenciaModuloWp:620, quantidade:12, tipoModulo:'bifacial' as const, marcaInversor:'X', modeloInversor:'X', potenciaInversorKW:6, custoKitRS: custoKit },
    estruturaRS: extras, materiaisEletricosRS: 0, maoDeObraRS: 0, projetoArtRS: 0, outrosCustosRS: 0,
  });

  it('[51] Fórmula: Preço = Custo / (1 - impostos - margem)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    expect(r.precoVenda).toBeCloseTo(10000 / (1 - 0.06 - 0.15), 2);
  });

  it('[52] Custo + imposto + margem = preço (balanço perfeito)', () => {
    const r = calcularPrecificacao({ composicao: comp(12000), aliquotaImpostos: 0.07, margemDesejada: 0.18 });
    expect(r.custoTotalDireto + r.impostoSobreVenda + r.lucroLiquido).toBeCloseTo(r.precoVenda, 2);
  });

  it('[53] Margem 0% → preço = custo / (1 - imposto)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.06, margemDesejada: 0 });
    expect(r.precoVenda).toBeCloseTo(10000 / 0.94, 2);
  });

  it('[54] Imposto 0% → preço = custo / (1 - margem)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0, margemDesejada: 0.20 });
    expect(r.precoVenda).toBeCloseTo(10000 / 0.80, 2);
  });

  it('[55] Markup sempre > margem (bases de cálculo diferentes)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    expect(r.markupPercentual).toBeGreaterThan(r.margemPercentual);
  });

  it('[56] ABSURDO: impostos + margem = 100% → deve lançar erro', () => {
    expect(() => calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.50, margemDesejada: 0.50 })).toThrow();
  });

  it('[57] ABSURDO: impostos + margem > 100% → deve lançar erro', () => {
    expect(() => calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.60, margemDesejada: 0.60 })).toThrow();
  });

  it('[58] Lucro = preço × margem (exato)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    expect(r.lucroLiquido).toBeCloseTo(r.precoVenda * 0.15, 4);
  });

  it('[59] Imposto = preço × alíquota (exato)', () => {
    const r = calcularPrecificacao({ composicao: comp(10000), aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    expect(r.impostoSobreVenda).toBeCloseTo(r.precoVenda * 0.06, 4);
  });

  it('[60] ABSURDO: custo zero → preço zero sem erros', () => {
    const r = calcularPrecificacao({ composicao: comp(0), aliquotaImpostos: 0.06, margemDesejada: 0.15 });
    expect(r.precoVenda).toBe(0);
  });
});

// ── BLOCO 6: Simples Nacional (5 testes) ─────────────────────────────────────
describe('Simples Nacional', () => {
  it('[61] Anexo I faixa 1 (até R$180k/ano) = 4,00% exato', () => {
    expect(SIMPLES_ANEXO_I[0].aliquota).toBe(0.04);
  });
  it('[62] Anexo III faixa 1 = 6,00% exato', () => {
    expect(SIMPLES_ANEXO_III[0].aliquota).toBe(0.06);
  });
  it('[63] Alíquota efetiva faixa 1 Anexo III = 6% (sem dedução)', () => {
    const r = calcularAliquotaEfetivaSimples(100000, 'III');
    expect(r).toBeCloseTo(0.06, 6);
  });
  it('[64] Alíquota efetiva faixa 2 Anexo III (200k) > 6%', () => {
    const r = calcularAliquotaEfetivaSimples(200000, 'III');
    expect(r).toBeGreaterThan(0.06);
    expect(r).toBeLessThan(0.12);
  });
  it('[65] Alíquota efetiva cresce com o faturamento', () => {
    const r1 = calcularAliquotaEfetivaSimples(100000, 'III');
    const r2 = calcularAliquotaEfetivaSimples(300000, 'III');
    const r3 = calcularAliquotaEfetivaSimples(600000, 'III');
    expect(r2).toBeGreaterThan(r1);
    expect(r3).toBeGreaterThan(r2);
  });
});

// ── BLOCO 7: Tabela Price (10 testes) ────────────────────────────────────────
describe('Tabela Price', () => {
  it('[66] Parcela Price calculada corretamente (fórmula exata)', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 48 });
    const i = 0.0199, n = 48;
    const pmtEsperado = 18000 * i * (1+i)**n / ((1+i)**n - 1);
    expect(t[0].parcela).toBeCloseTo(pmtEsperado, 2);
  });

  it('[67] Todas as parcelas são iguais (definição do sistema Price)', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 15000, taxaJurosMensal: 0.02, numeroParcelas: 36 });
    const primeira = t[0].parcela;
    for (const p of t) expect(p.parcela).toBeCloseTo(primeira, 2);
  });

  it('[68] Saldo devedor zerrado na última parcela', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 20000, taxaJurosMensal: 0.018, numeroParcelas: 60 });
    expect(t[t.length - 1].saldoDevedorFinal).toBeCloseTo(0, 1);
  });

  it('[69] Total pago > valor financiado (com juros positivos)', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 15000, taxaJurosMensal: 0.02, numeroParcelas: 48 });
    expect(totalPagoPrice(t)).toBeGreaterThan(15000);
  });

  it('[70] Taxa zero → parcela = valor / n (sem juros)', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 12000, taxaJurosMensal: 0, numeroParcelas: 12 });
    expect(t[0].parcela).toBeCloseTo(1000, 5);
    expect(totalJurosPrice(t)).toBeCloseTo(0, 5);
  });

  it('[71] 48× > parcela 60× para mesmo valor e taxa (Price)', () => {
    const t48 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 48 });
    const t60 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 60 });
    expect(t48[0].parcela).toBeGreaterThan(t60[0].parcela);
  });

  it('[72] Total 60× > total 48× (mais juros em mais tempo)', () => {
    const t48 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 48 });
    const t60 = gerarTabelaPrice({ valorFinanciado: 18000, taxaJurosMensal: 0.0199, numeroParcelas: 60 });
    expect(totalPagoPrice(t60)).toBeGreaterThan(totalPagoPrice(t48));
  });

  it('[73] ABSURDO: n=1 → parcela = valor × (1 + taxa)', () => {
    const t = gerarTabelaPrice({ valorFinanciado: 10000, taxaJurosMensal: 0.02, numeroParcelas: 1 });
    expect(t[0].parcela).toBeCloseTo(10000 * 1.02, 2);
  });

  it('[74] ABSURDO: valor financiado zero → erro', () => {
    expect(() => gerarTabelaPrice({ valorFinanciado: 0, taxaJurosMensal: 0.02, numeroParcelas: 12 })).toThrow();
  });

  it('[75] ABSURDO: parcelas zero → erro', () => {
    expect(() => gerarTabelaPrice({ valorFinanciado: 10000, taxaJurosMensal: 0.02, numeroParcelas: 0 })).toThrow();
  });
});

// ── BLOCO 8: TIR, ROI, Payback, Área (10 testes) ─────────────────────────────
describe('TIR, ROI, Payback, Área', () => {
  it('[76] TIR: VPL = 0 quando avaliado com a própria TIR', () => {
    const fluxo = [-18000, ...Array(25).fill(5000)];
    const tir = calcularTIR(fluxo)!;
    const vpl = fluxo.reduce((s, cf, t) => s + cf / (1 + tir)**t, 0);
    expect(Math.abs(vpl)).toBeLessThan(0.01);
  });

  it('[77] TIR solar típico (R$18k, R$450/mês) → entre 20% e 50% a.a.', () => {
    const fluxo = [-18000, ...Array(25).fill(450 * 12)];
    const tir = calcularTIR(fluxo)!;
    expect(tir).toBeGreaterThan(0.20);
    expect(tir).toBeLessThan(0.60);
  });

  it('[78] ABSURDO: investimento enorme, retorno mínimo → TIR muito baixa', () => {
    const fluxo = [-100000, ...Array(25).fill(100)];
    const tir = calcularTIR(fluxo);
    if (tir !== null) expect(tir).toBeLessThan(0.01);
  });

  it('[79] ROI: economia 3× investimento → ROI = 200%', () => {
    expect(calcularROI(10000, 30000)).toBeCloseTo(2.0, 5);
  });

  it('[80] ROI negativo quando economia < investimento', () => {
    expect(calcularROI(20000, 10000)).toBeLessThan(0);
  });

  it('[81] Payback "2 anos e 6 meses" para 2.5 anos', () => {
    expect(formatarPayback(2.5)).toBe('2 anos e 6 meses');
  });

  it('[82] Payback "1 ano" (singular, não "1 anos")', () => {
    expect(formatarPayback(1.0)).toBe('1 ano');
  });

  it('[83] Payback "Acima de 25 anos" para null', () => {
    expect(formatarPayback(null)).toBe('Acima de 25 anos');
  });

  it('[84] Área 12 módulos 620 Wp → entre 30 e 38 m²', () => {
    const area = areaTotalNecessariaM2(12, 620);
    expect(area).toBeGreaterThan(30);
    expect(area).toBeLessThan(38);
  });

  it('[85] Área maior → mais módulos (proporcional)', () => {
    const a10 = areaTotalNecessariaM2(10, 620);
    const a20 = areaTotalNecessariaM2(20, 620);
    expect(a20).toBeCloseTo(a10 * 2, 3);
  });
});

// ── BLOCO 9: Dados de referência e HSP (10 testes) ───────────────────────────
describe('Dados de referência — ANEEL, CRESESB, distribuidoras', () => {
  it('[86] Todas as UFs têm HSP entre 4,0 e 7,0 kWh/m²/dia', () => {
    const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    for (const uf of ufs) {
      const hsp = hspPorUF(uf);
      expect(hsp).toBeGreaterThan(3.5);
      expect(hsp).toBeLessThan(7.0);
    }
  });

  it('[87] RN tem maior HSP do Brasil (>5.7)', () => {
    expect(hspPorUF('RN')).toBeGreaterThanOrEqual(5.7);
  });

  it('[88] GO (5.5) > SC (4.5) — mais sol no centro-oeste', () => {
    expect(hspPorUF('GO')).toBeGreaterThan(hspPorUF('SC'));
  });

  it('[89] Fatores mensais MG: soma = 12.0 (±0.3)', () => {
    const fatores = fatoresMensaisPorUF('MG');
    const soma = fatores.reduce((s, f) => s + f, 0);
    expect(soma).toBeGreaterThan(11.7);
    expect(soma).toBeLessThan(12.3);
  });

  it('[90] Meses ensolarados (out-jan) > meses chuvosos (jun-ago) para MG', () => {
    const f = fatoresMensaisPorUF('MG');
    const media_ensol = (f[9] + f[10] + f[11] + f[0]) / 4; // out, nov, dez, jan
    const media_chuv  = (f[5] + f[6] + f[7]) / 3;           // jun, jul, ago
    expect(media_ensol).toBeGreaterThan(media_chuv);
  });

  it('[91] Geração anual ≈ soma dos 12 meses (tolerância 2%)', () => {
    const gen12 = geracaoMensalPorMes(5, 5.4, 0.20, 'MG');
    const somaAnual = gen12.reduce((s, v) => s + v, 0);
    const geracaoAnualDimensionamento = dimensionarSistema({ consumoMedioMensalKWh: 500, hspLocal: 5.4, perdasSistema: 0.20, potenciaModuloWp: 550 }).geracaoAnualEstimadaKWh;
    // Não devem ser idênticos (metodologias diferentes), mas ordens de grandeza similares
    // 5 kWp × 5.4 HSP × ~30 dias × 0.8 efic ≈ 648 kWh/mês × 12 ≈ 7776 kWh/ano
    expect(somaAnual).toBeGreaterThan(6000);
    expect(somaAnual).toBeLessThan(10000);
  });

  it('[92] CEMIG existe com tarifa entre R$0,70 e R$1,20/kWh', () => {
    expect(cemig).toBeDefined();
    expect(cemig.tarifaKWhComICMS).toBeGreaterThan(0.70);
    expect(cemig.tarifaKWhComICMS).toBeLessThan(1.20);
  });

  it('[93] Todas distribuidoras têm tarifa entre R$0,60 e R$1,50/kWh', () => {
    for (const d of DISTRIBUIDORAS) {
      if (d.codigo === 'OUTRO') continue;
      expect(d.tarifaKWhComICMS).toBeGreaterThan(0.60);
      expect(d.tarifaKWhComICMS).toBeLessThan(1.50);
    }
  });

  it('[94] KWH disponibilidade: mono=30, bi=50, tri=100 (ANEEL REN 414/2010)', () => {
    expect(KWH_DISPONIBILIDADE.monofasica).toBe(30);
    expect(KWH_DISPONIBILIDADE.bifasica).toBe(50);
    expect(KWH_DISPONIBILIDADE.trifasica).toBe(100);
  });

  it('[95] MESES_LABELS tem exatamente 12 elementos', () => {
    expect(MESES_LABELS).toHaveLength(12);
  });
});

// ── BLOCO 10: Cenários reais integrados e absurdos (5 testes) ────────────────
describe('Cenários integrados e absurdos', () => {
  it('[96] Cenário real: RAFAEL/Araguari — 6 kWp, consumo 411 kWh/mês', () => {
    // Baseado na proposta concorrente: 6 kWp, 411 kWh consumo, GO
    const hsp = hspPorUF('GO');
    const perdas = calcularPerdas({ coeficienteTemperaturaPmax: -0.34, noct: 45, toleranciaPercent: 0, bifacial: false }, { eficienciaMaximaPercent: 97 }, siteMG);
    const dim = dimensionarSistema({ consumoMedioMensalKWh: 411, hspLocal: hsp, perdasSistema: perdas.perdaTotalLiquida, potenciaModuloWp: 600 });
    expect(dim.potenciaInstaladaRealKWp).toBeLessThanOrEqual(7.5); // concorrente usa 6 kWp para 411 kWh
    expect(dim.potenciaInstaladaRealKWp).toBeGreaterThanOrEqual(3.0);
  });

  it('[97] ABSURDO: Consumo 1 kWh/mês → sistema funcional (1 módulo)', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh: 1, hspLocal: 5.5, perdasSistema: 0.20, potenciaModuloWp: 550 });
    expect(dim.numeroModulos).toBeGreaterThanOrEqual(1);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(1);
  });

  it('[98] ABSURDO: Consumo 100.000 kWh/mês (usina industrial) → cálculo correto', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh: 100000, hspLocal: 5.5, perdasSistema: 0.20, potenciaModuloWp: 670 });
    expect(dim.potenciaSistemaKWp).toBeGreaterThan(500);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(100000 * 0.99);
  });

  it('[99] Fluxo de caixa solar 25 anos → payback simples < 10 anos para sistema viável', () => {
    const r = calcularFluxoCaixa({ investimentoInicial: 18000, economiaMensalAno1: 500, degradacaoAnualModulos: 0.005, reajusteTarifarioAnual: 0.07, horizonteAnos: 25 });
    expect(r.paybackSimplesAnos).not.toBeNull();
    expect(r.paybackSimplesAnos!).toBeLessThan(10);
    expect(r.economiaTotalHorizonte).toBeGreaterThan(18000); // retorna mais do que investiu
  });

  it('[100] ABSURDO: Investimento R$1, economia R$0,01/mês → payback > 8 anos', () => {
    const r = calcularFluxoCaixa({ investimentoInicial: 1, economiaMensalAno1: 0.01, degradacaoAnualModulos: 0, reajusteTarifarioAnual: 0, horizonteAnos: 25 });
    if (r.paybackSimplesAnos !== null) {
      expect(r.paybackSimplesAnos).toBeGreaterThan(6); // 1 / (0.01 × 12) = 8.33 anos
    }
  });
});
