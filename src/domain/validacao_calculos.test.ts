/**
 * VALIDAÇÃO DE CÁLCULOS — LumenSolar
 * ====================================
 * Todos os valores esperados foram calculados MANUALMENTE e verificados
 * contra as normas antes de virar código. Use como referência definitiva.
 *
 * Normas de referência:
 *   - IEC 61724-1:2021 (perdas e geração)
 *   - IEC TS 60904-1-2:2019 (ganho bifacial)
 *   - Lei 14.300/2022 (FioB, art.26 e art.27)
 *   - ANEEL REN 414/2010 (disponibilidade mínima)
 *   - Res. ANEEL 3.589/2026 (tarifa CEMIG)
 */

import { describe, expect, it } from 'vitest';
import { calcularPerdas } from './dimensionamento/calcularPerdas';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { hspPorUF } from '../data/hspPorUF';
import { classificarEnquadramento, percentualFioBPorAno } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { gerarTabelaPrice, totalPagoPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularTIR, formatarPayback } from './financeiro/indicadores';

// ── Constantes verificadas ────────────────────────────────────────────────────
const CEMIG_TARIFA = 1.18272801;   // Res. ANEEL 3.589/2026
const HSP_MG       = hspPorUF('MG'); // 5.4 h/dia
const CEMIG        = { ...DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!, tarifaKWhComICMS: CEMIG_TARIFA };

// Enquadramento art.27 (protocolo recente)
const ENQ_ART27 = classificarEnquadramento({
  dataProtocoloAcesso: '2024-01-01',
  potenciaInstaladaKW: 3,
  fonte: 'fotovoltaica',
  modalidade: 'autoconsumo_local',
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 1 — Perdas do sistema (IEC 61724-1)', () => {

  // BUG CORRIGIDO em calcularPerdas.ts (ago/2026): Tcélula usava o fator 0.8
  // (=800/1000 — mistura errada entre a irradiância do ensaio NOCT [800 W/m²]
  // e a de STC [1000 W/m²]). Fórmula correta (Sandia PVPMC / Duffie &
  // Beckman): Tcélula = Tamb + (NOCT-20) × (G/800), com G=800 (irradiância
  // média anual já escolhida por este módulo) ⇒ fator=1, ΔT = NOCT-20
  // diretamente. Valores abaixo (P1.1 a P1.5) recalculados manualmente.
  it('[P1.1] Monocristalino Araguari/MG: perdas = 16.15%', () => {
    // Manual: Tcell=24+(45-20)=49°C, ΔT=24°C, perdaTemp=0.34×24/100=8.16%
    // fator=(1-0.03)(1-0.0816)(1-0.02)(1-0.02)(1-0.02)=0.83846
    // perdas = 1-0.83846 = 16.154%
    const r = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:97 },
      { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 }
    );
    expect(r.perdaTotalLiquida).toBeCloseTo(0.16154, 4);
    expect(r.perdaTemperatura).toBeCloseTo(0.08160, 4);
    expect(r.perdaInversor).toBeCloseTo(0.03000, 4);
    expect(r.perdaCabeamento).toBeCloseTo(0.02000, 4);
  });

  it('[P1.2] Tcell = Tamb + (NOCT-20) (fator G/800=1, G=800 = irrad. média anual)', () => {
    // Tamb=24, NOCT=45: Tcell = 24+(45-20) = 49°C
    // ΔT = 49-25 = 24°C → perdaTemp = 0.34/100×24 = 8.16%
    const r = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:100 },
      { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:0, perdaSujidadePercent:0 }
    );
    expect(r.perdaTemperatura).toBeCloseTo(0.0816, 4); // 0.34 × 24 / 100
  });

  it('[P1.3] Bifacial N-TYPE (ganho 5%): perdas = 9.52%', () => {
    // fator = (1-0.016)(1-0.0696)(1-0.02)(1-0.02)(1-0.02)(1+0.05)
    // Tcell = 24+25=49°C, ΔT=24, perdaTemp=0.29×24/100=6.96%
    // fator=(0.984)(0.9304)(0.98)(0.98)(0.98)(1.05)=0.90476
    // perdas = 9.524%
    const r = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.29, noct:45, toleranciaPercent:0, bifacial:true, ganhoBifacialPercent:5 },
      { eficienciaMaximaPercent:98.4 },
      { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 }
    );
    expect(r.perdaTotalLiquida).toBeCloseTo(0.09524, 4);
    expect(r.ganhoBifacial).toBeCloseTo(0.05, 4);
  });

  it('[P1.4] Temperatura abaixo de STC (Tcell < 25°C): perdaTemp = 0', () => {
    // Tamb=0°C, NOCT=45: Tcell=0+(45-20)=25°C → ΔT=0 → perdaTemp=0
    // (com a fórmula corrigida, Tamb=5°C já dá Tcell=30°C — acima de STC —
    // então o cenário de "abaixo/na fronteira de STC" precisou de Tamb=0°C)
    const r = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:97 },
      { temperaturaAmbienteMediaC:0, perdaSombreamentoPercent:0, perdaSujidadePercent:0 }
    );
    expect(r.perdaTemperatura).toBe(0);
  });

  it('[P1.5] Nordeste (Tamb=29°C) tem mais perdas que MG (24°C)', () => {
    const rMG = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:97 },
      { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 }
    );
    const rNE = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:97 },
      { temperaturaAmbienteMediaC:29, perdaSombreamentoPercent:3, perdaSujidadePercent:3 }
    );
    expect(rNE.perdaTotalLiquida).toBeGreaterThan(rMG.perdaTotalLiquida);
    // Manual: Tcell=29+25=54°C, ΔT=29, perdaTemp=0.34×29/100=9.86%
    // fator=(0.97)(0.9014)(0.97)(0.97)(0.98)=0.80623 → perdas=19.377%
    expect(rNE.perdaTotalLiquida).toBeCloseTo(0.19377, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 2 — Dimensionamento (IEC 61724-1)', () => {

  // BUG CORRIGIDO em calcularPerdas.ts (ago/2026): perdaTotalLiquida para
  // este cenário (mesmos parâmetros de [P1.1]) subiu de 14.602% para
  // 16.154% com a fórmula de Tcélula corrigida — ver comentário completo em
  // [P1.1]. Isso reduz a geração estimada e a % de compensação (mas não o
  // número de módulos: 4 módulos continua sendo o resultado do ceil()).
  it('[P2.1] Ana Maria: 281.5 kWh → 4 módulos 550Wp = 2.2 kWp', () => {
    // Manual: kWpMin = 281.5/(5.4×30.4167×0.83846) = 2.0440 kWp
    // ceil(2.0440/0.55) = 4 módulos (inalterado)
    // kWpReal = 4×0.55 = 2.2 kWp
    // Geração = 2.2×5.4×30.4167×0.83846 = 302.98 kWh/mês
    // Compensação = 302.98/281.5 = 107.63% (era 109.6% com o bug)
    const perdas = calcularPerdas(
      { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
      { eficienciaMaximaPercent:97 },
      { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 }
    );
    const dim = dimensionarSistema({
      consumoMedioMensalKWh: 281.5,
      hspLocal: HSP_MG,
      perdasSistema: perdas.perdaTotalLiquida,
      potenciaModuloWp: 550,
    });
    expect(dim.numeroModulos).toBe(4);
    expect(dim.potenciaInstaladaRealKWp).toBeCloseTo(2.2, 6);
    expect(dim.geracaoMensalEstimadaKWh).toBeCloseTo(302.98, 1);
    expect(dim.geracaoAnualEstimadaKWh).toBeCloseTo(302.98 * 12, 0);
    expect(dim.percentualCompensacaoReal).toBeGreaterThan(1.07); // 107.6%
    expect(dim.percentualCompensacaoReal).toBeLessThan(1.08);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(281.5);
  });

  it('[P2.2] fórmula: kWp = consumo / (HSP × 30.4167 × (1-perdas))', () => {
    const hsp = 5.4;
    const perdas = 0.18;
    const consumo = 400;
    const kwpEsperado = consumo / (hsp * 30.4167 * (1 - perdas));
    const dim = dimensionarSistema({ consumoMedioMensalKWh:consumo, hspLocal:hsp, perdasSistema:perdas, potenciaModuloWp:550 });
    expect(dim.potenciaSistemaKWp).toBeCloseTo(kwpEsperado, 6);
  });

  it('[P2.3] geração anual = geração mensal × 12', () => {
    const dim = dimensionarSistema({ consumoMedioMensalKWh:300, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:620 });
    expect(dim.geracaoAnualEstimadaKWh).toBeCloseTo(dim.geracaoMensalEstimadaKWh * 12, 8);
  });

  it('[P2.4] arredondamento sempre para CIMA (módulos inteiros)', () => {
    // 300/(5.4×30.4167×0.82) = 300/134.6 = 2.228 kWp → ceil(2.228/0.620) = 4 módulos
    const dim = dimensionarSistema({ consumoMedioMensalKWh:300, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:620 });
    expect(dim.potenciaInstaladaRealKWp).toBeGreaterThanOrEqual(dim.potenciaSistemaKWp - 1e-9);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(300 - 1e-9);
  });

  it('[P2.5] DIAS_MES = 30.4167 ≈ 365/12 (erro < 0.0001)', () => {
    // 365/12 = 30.41666... | 30.4167 | erro = 0.0000333 → 0.04 kWh/ano/kWp
    expect(Math.abs(30.4167 - 365/12)).toBeLessThan(0.0001);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 3 — FioB e Art. 26/27 (Lei 14.300/2022)', () => {

  it('[P3.1] Art.27 — tabela EXATA conforme texto da lei', () => {
    const esperado: [number, number][] = [
      [2023, 0.15], [2024, 0.30], [2025, 0.45],
      [2026, 0.60], [2027, 0.75], [2028, 0.90],
      [2029, 1.00], [2030, 1.00], [2040, 1.00],
    ];
    for (const [ano, pct] of esperado) {
      expect(percentualFioBPorAno(ENQ_ART27, ano)).toBe(pct);
    }
  });

  it('[P3.2] Art.26 — FioB = 0% até 2045 (regra de transição)', () => {
    const enq26 = classificarEnquadramento({
      dataProtocoloAcesso: '2022-06-15',
      potenciaInstaladaKW: 3,
      fonte: 'fotovoltaica',
      modalidade: 'autoconsumo_local',
    });
    for (const ano of [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2045]) {
      expect(percentualFioBPorAno(enq26, ano)).toBe(0);
    }
  });

  it('[P3.3] Disponibilidade ANEEL: 30/50/100 kWh × tarifa', () => {
    // REN 414/2010: valores nacionais para grupo B1
    const r_mono = calcularCustosRecorrentes({ distribuidora:CEMIG, tipoLigacao:'monofasica', cipRS:0, consumoMedioMensalKWh:300, geracaoMensalKWh:320, percentualFioB:0 });
    const r_bi   = calcularCustosRecorrentes({ distribuidora:CEMIG, tipoLigacao:'bifasica',   cipRS:0, consumoMedioMensalKWh:300, geracaoMensalKWh:320, percentualFioB:0 });
    const r_tri  = calcularCustosRecorrentes({ distribuidora:CEMIG, tipoLigacao:'trifasica',  cipRS:0, consumoMedioMensalKWh:300, geracaoMensalKWh:320, percentualFioB:0 });
    expect(r_mono.taxaDisponibilidadeRS).toBeCloseTo(30 * CEMIG_TARIFA, 4);  // R$35.48
    expect(r_bi.taxaDisponibilidadeRS).toBeCloseTo(50 * CEMIG_TARIFA, 4);   // R$59.14
    expect(r_tri.taxaDisponibilidadeRS).toBeCloseTo(100 * CEMIG_TARIFA, 4); // R$118.27
  });

  it('[P3.4] Ana Maria 2026: conta antes = R$379.34, economia = R$203.88', () => {
    // Manual: 281.5×1.18272801+46.40 = 332.94+46.40 = R$379.34
    // FioB = 281.5×1.18272801×0.35×0.60 = R$69.92
    // totalFixo = 59.14+46.40+69.92 = R$175.46
    // economia = 379.34-175.46 = R$203.88
    const r = calcularCustosRecorrentes({
      distribuidora: CEMIG,
      tipoLigacao: 'bifasica',
      cipRS: 46.40,
      consumoMedioMensalKWh: 281.5,
      geracaoMensalKWh: 308.59,
      percentualFioB: 0.60,
      fracaoTarifaFioB: 0.35,
    });
    expect(r.contaAntesRS).toBeCloseTo(379.34, 1);
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(59.14, 2);
    expect(r.custoBFioMensalRS).toBeCloseTo(69.92, 1);
    expect(r.totalFixoMensalRS).toBeCloseTo(175.46, 1);
    expect(r.economiaMensalRS).toBeCloseTo(203.88, 1);
  });

  it('[P3.5] Ana Maria 2029 (FioB=100%): economia = R$157.27', () => {
    // FioB100 = 281.5×1.18272801×0.35×1.00 = R$116.53
    // economia = 379.34-(59.14+46.40+116.53) = 379.34-222.07 = R$157.27
    const r = calcularCustosRecorrentes({
      distribuidora: CEMIG, tipoLigacao: 'bifasica', cipRS: 46.40,
      consumoMedioMensalKWh: 281.5, geracaoMensalKWh: 308.59,
      percentualFioB: 1.00, fracaoTarifaFioB: 0.35,
    });
    expect(r.economiaMensalRS).toBeCloseTo(157.27, 1);
  });

  it('[P3.6] Energia compensada = min(geração, consumo)', () => {
    // Sistema superdimensionado: geração 500 kWh, consumo 300 kWh
    // FioB incide sobre 300 kWh (não sobre 500)
    const rGrande = calcularCustosRecorrentes({ distribuidora:CEMIG, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:300, geracaoMensalKWh:500, percentualFioB:1.0 });
    const rExato  = calcularCustosRecorrentes({ distribuidora:CEMIG, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:300, geracaoMensalKWh:300, percentualFioB:1.0 });
    expect(rGrande.custoBFioMensalRS).toBeCloseTo(rExato.custoBFioMensalRS, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 4 — Precificação', () => {

  const comp = (custo: number) => ({
    kit: { marcaModulo:'X', modeloModulo:'X', potenciaModuloWp:550, quantidade:8, tipoModulo:'monocristalino' as const, marcaInversor:'X', modeloInversor:'X', potenciaInversorKW:5, custoKitRS:custo },
    estruturaRS:0, materiaisEletricosRS:0, maoDeObraRS:0, projetoArtRS:0, outrosCustosRS:0,
  });

  it('[P4.1] Preço = custo/(1-impostos-margem) — verificação algébrica', () => {
    // custo=18000, imp=6.5%, marg=18%: preço=18000/(1-0.065-0.18)=18000/0.755=23841.06
    const r = calcularPrecificacao({ composicao:comp(18000), aliquotaImpostos:0.065, margemDesejada:0.18 });
    expect(r.precoVenda).toBeCloseTo(18000 / (1 - 0.065 - 0.18), 2);
    expect(r.precoVenda).toBeCloseTo(23841.06, 1);
  });

  it('[P4.2] Balanço: custo + imposto + lucro = preço (exato)', () => {
    const r = calcularPrecificacao({ composicao:comp(15000), aliquotaImpostos:0.06, margemDesejada:0.15 });
    expect(r.custoTotalDireto + r.impostoSobreVenda + r.lucroLiquido).toBeCloseTo(r.precoVenda, 4);
  });

  it('[P4.3] Lucro = preço × margem (exato)', () => {
    const r = calcularPrecificacao({ composicao:comp(12000), aliquotaImpostos:0.06, margemDesejada:0.20 });
    expect(r.lucroLiquido).toBeCloseTo(r.precoVenda * 0.20, 4);
  });

  it('[P4.4] Imposto = preço × alíquota (exato)', () => {
    const r = calcularPrecificacao({ composicao:comp(12000), aliquotaImpostos:0.065, margemDesejada:0.15 });
    expect(r.impostoSobreVenda).toBeCloseTo(r.precoVenda * 0.065, 4);
  });

  it('[P4.5] Markup > Margem sempre (bases diferentes)', () => {
    for (const [imp, marg] of [[0.06,0.15],[0.08,0.20],[0.04,0.12]]) {
      const r = calcularPrecificacao({ composicao:comp(10000), aliquotaImpostos:imp, margemDesejada:marg });
      expect(r.markupPercentual).toBeGreaterThan(r.margemPercentual);
    }
  });

  it('[P4.6] Custo adicional R$1 aumenta preço em 1/(1-imp-marg)', () => {
    const r0 = calcularPrecificacao({ composicao:comp(10000), aliquotaImpostos:0.06, margemDesejada:0.15 });
    const r1 = calcularPrecificacao({ composicao:comp(10001), aliquotaImpostos:0.06, margemDesejada:0.15 });
    const multiplicador = 1 / (1 - 0.06 - 0.15); // = 1/0.79 ≈ 1.2658
    expect(r1.precoVenda - r0.precoVenda).toBeCloseTo(multiplicador, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 5 — Tabela Price', () => {

  it('[P5.1] PMT = PV × i × (1+i)^n / ((1+i)^n - 1)', () => {
    const PV=15000, i=0.0199, n=48;
    const pmtEsperado = PV * i * (1+i)**n / ((1+i)**n - 1);
    const t = gerarTabelaPrice({ valorFinanciado:PV, taxaJurosMensal:i, numeroParcelas:n });
    expect(t[0].parcela).toBeCloseTo(pmtEsperado, 4); // R$488.03
    expect(t[0].parcela).toBeCloseTo(488.03, 1);
  });

  it('[P5.2] Saldo final = 0 (amortização total = PV)', () => {
    const t = gerarTabelaPrice({ valorFinanciado:20000, taxaJurosMensal:0.0199, numeroParcelas:60 });
    const somaAmort = t.reduce((s,p) => s + p.amortizacao, 0);
    expect(Math.abs(somaAmort - 20000)).toBeLessThan(0.01);
    expect(t[t.length-1].saldoDevedorFinal).toBeCloseTo(0, 1);
  });

  it('[P5.3] Juros = saldo × taxa em cada parcela', () => {
    const t = gerarTabelaPrice({ valorFinanciado:10000, taxaJurosMensal:0.015, numeroParcelas:24 });
    for (const p of t) {
      expect(p.juros).toBeCloseTo(p.saldoDevedorInicial * 0.015, 4);
    }
  });

  it('[P5.4] Parcela = juros + amortização em cada período', () => {
    const t = gerarTabelaPrice({ valorFinanciado:18000, taxaJurosMensal:0.02, numeroParcelas:48 });
    for (const p of t) {
      expect(p.parcela).toBeCloseTo(p.juros + p.amortizacao, 6);
    }
  });

  it('[P5.5] 60× tem parcela menor mas total maior que 48×', () => {
    const t48 = gerarTabelaPrice({ valorFinanciado:15000, taxaJurosMensal:0.0199, numeroParcelas:48 });
    const t60 = gerarTabelaPrice({ valorFinanciado:15000, taxaJurosMensal:0.0199, numeroParcelas:60 });
    expect(t60[0].parcela).toBeLessThan(t48[0].parcela);
    expect(totalPagoPrice(t60)).toBeGreaterThan(totalPagoPrice(t48));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 6 — Fluxo de caixa, TIR, Payback', () => {

  it('[P6.1] Payback simples = investimento/economia anual (sem reajuste, sem degradação)', () => {
    // R$12.000 / (R$203.88×12) = 12000/2446.56 = 4.904 anos
    const r = calcularFluxoCaixa({
      investimentoInicial: 12000, economiaMensalAno1: 203.88,
      degradacaoAnualModulos: 0, reajusteTarifarioAnual: 0, horizonteAnos: 25,
    });
    expect(r.paybackSimplesAnos).toBeCloseTo(12000 / (203.88 * 12), 3);
  });

  it('[P6.2] Payback Ana Maria R$12.000 (deg 0.5%, reaj 7%): 4 anos e 5 meses', () => {
    const r = calcularFluxoCaixa({
      investimentoInicial: 12000, economiaMensalAno1: 203.88,
      degradacaoAnualModulos: 0.005, reajusteTarifarioAnual: 0.07, horizonteAnos: 25,
    });
    expect(r.paybackSimplesAnos).not.toBeNull();
    expect(Math.abs(r.paybackSimplesAnos! - 4.389)).toBeLessThan(0.05);
    expect(formatarPayback(r.paybackSimplesAnos)).toMatch(/4 anos e [4-6] meses/);
  });

  it('[P6.3] TIR: VPL calculado com a TIR é < R$0.01', () => {
    const fluxo = [-12000, ...Array.from({length:25}, (_,i) => 203.88*12*(0.995**i)*(1.07**i))];
    const tir = calcularTIR(fluxo)!;
    expect(tir).not.toBeNull();
    const vpl = fluxo.reduce((s,cf,t) => s + cf/(1+tir)**t, 0);
    expect(Math.abs(vpl)).toBeLessThan(0.01);
  });

  it('[P6.4] TIR Ana Maria ≈ 26.58% a.a.', () => {
    const fluxo = [-12000, ...Array.from({length:25}, (_,i) => 203.88*12*(0.995**i)*(1.07**i))];
    const tir = calcularTIR(fluxo)!;
    expect(Math.abs(tir * 100 - 26.58)).toBeLessThan(0.05);
  });

  it('[P6.5] Fluxo ano 0 = -investimento (sempre negativo)', () => {
    const r = calcularFluxoCaixa({ investimentoInicial:15000, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25 });
    expect(r.fluxoAnual[0]).toBe(-15000);
  });

  it('[P6.6] Degradação 0.5%/ano: ano 25 gera 11.3% menos que ano 1', () => {
    const r = calcularFluxoCaixa({ investimentoInicial:15000, economiaMensalAno1:300, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0, horizonteAnos:25 });
    // (1-0.005)^24 = 0.8868
    expect(r.fluxoAnual[25] / r.fluxoAnual[1]).toBeCloseTo((1-0.005)**24, 3);
  });

  it('[P6.7] VPL positivo confirma sistema viável (TIR > TMA)', () => {
    const r = calcularFluxoCaixa({ investimentoInicial:12000, economiaMensalAno1:203.88, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.07, horizonteAnos:25, taxaMinimaAtratividadeAnual:0.08 });
    expect(r.vpl).not.toBeNull();
    expect(r.vpl!).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('CÁLCULO 7 — formatarPayback (precisão de arredondamento)', () => {

  it('[P7.1] 4.389 anos → "4 anos e 5 meses"', () => {
    // 4.389 × 12 = 52.668 → round = 53 meses → 4 anos, 5 meses
    expect(formatarPayback(4.389)).toBe('4 anos e 5 meses');
  });

  it('[P7.2] 2.9999 → "3 anos" (sem off-by-one)', () => {
    expect(formatarPayback(2.9999)).toBe('3 anos');
  });

  it('[P7.3] 1.9999 → "2 anos" (sem "2 anos e 1 mês")', () => {
    expect(formatarPayback(1.9999)).toBe('2 anos');
  });

  it('[P7.4] 0.5 → "6 meses"', () => {
    expect(formatarPayback(0.5)).toBe('6 meses');
  });

  it('[P7.5] null → "Acima de 25 anos"', () => {
    expect(formatarPayback(null)).toBe('Acima de 25 anos');
  });

  it('[P7.6] 1.0 → "1 ano" (singular)', () => {
    expect(formatarPayback(1.0)).toBe('1 ano');
  });

  it('[P7.7] 2.5 → "2 anos e 6 meses"', () => {
    expect(formatarPayback(2.5)).toBe('2 anos e 6 meses');
  });
});
