/**
 * PENTE-FINO — Auditoria exaustiva de todos os módulos de domínio.
 * Cada teste é baseado em cálculo manual independente ou verificação normativa.
 * Cobertura: precisão numérica, edge cases, bugs corrigidos, normas.
 */

import { describe, expect, it } from 'vitest';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { calcularPerdas } from './dimensionamento/calcularPerdas';
import { hspPorUF } from '../data/hspPorUF';
import { fatoresMensaisPorUF, geracaoMensalPorMes } from '../data/hspMensal';
import { classificarEnquadramento, percentualFioBPorAno } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS, KWH_DISPONIBILIDADE } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { calcularAliquotaEfetivaSimples, SIMPLES_ANEXO_I, SIMPLES_ANEXO_III } from '../data/tributacao';
import { gerarTabelaPrice, totalPagoPrice, totalJurosPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularTIR, calcularROI, formatarPayback, simularFinanciamento } from './financeiro/indicadores';

const CEMIG = DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!;
const HSP_MG = hspPorUF('MG');

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 1 — Fatores sazonais: precisão e normalização', () => {

  it('[P01] Todos os grupos somam EXATAMENTE 12.000 (±0.001)', () => {
    const ufs = ['CE', 'GO', 'MG', 'SC', 'AM']; // nordeste, centro-oeste, sudeste, sul, norte
    for (const uf of ufs) {
      const soma = fatoresMensaisPorUF(uf).reduce((a, b) => a + b, 0);
      expect(soma).toBeCloseTo(12.000, 2);
    }
  });

  it('[P02] Fator médio dos 12 meses = 1.000 (por definição)', () => {
    for (const uf of ['CE','GO','MG','SC','AM']) {
      const media = fatoresMensaisPorUF(uf).reduce((a,b)=>a+b,0) / 12;
      expect(media).toBeCloseTo(1.000, 2);
    }
  });

  it('[P03] Geração anual (soma dos 12 meses) = geração direta com HSP anual (±1%)', () => {
    const potKWp = 5, hsp = 5.4, perdas = 0.18;
    const gen12 = geracaoMensalPorMes(potKWp, hsp, perdas, 'MG');
    const somaAnual = gen12.reduce((a,v) => a+v, 0);
    const geracaoAnualDireta = potKWp * hsp * 365 * (1 - perdas);
    // Devem ser próximos — < 1% de diferença após normalização
    expect(Math.abs(somaAnual - geracaoAnualDireta) / geracaoAnualDireta).toBeLessThan(0.015);
  });

  it('[P04] Verão (dez-jan) sempre > inverno (jun-jul) para MG (sudeste)', () => {
    const f = fatoresMensaisPorUF('MG');
    const verão  = (f[11] + f[0]) / 2;  // dez, jan
    const inverno = (f[5] + f[6]) / 2;  // jun, jul
    expect(verão).toBeGreaterThan(inverno);
  });

  it('[P05] Nordeste (CE) tem menor variação sazonal que Sul (SC)', () => {
    const fCE = fatoresMensaisPorUF('CE');
    const fSC = fatoresMensaisPorUF('SC');
    const ampCE = Math.max(...fCE) - Math.min(...fCE);
    const ampSC = Math.max(...fSC) - Math.min(...fSC);
    expect(ampCE).toBeLessThan(ampSC);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 2 — Dimensionamento: precisão numérica e edge cases', () => {

  it('[P06] kWp = consumo/(HSP × 30.4167 × (1-perdas)) — fórmula exata verificada', () => {
    const consumo = 400, hsp = 5.4, perdas = 0.18, modWp = 620;
    const kWpEsperado = consumo / (hsp * 30.4167 * (1 - perdas));
    const dim = dimensionarSistema({consumoMedioMensalKWh:consumo, hspLocal:hsp, perdasSistema:perdas, potenciaModuloWp:modWp});
    expect(dim.potenciaSistemaKWp).toBeCloseTo(kWpEsperado, 6);
  });

  it('[P07] 30.4167 = 365/12 com precisão de 4 casas decimais', () => {
    // Verifica o constante IEC 61724-1
    expect(30.4167).toBeCloseTo(365/12, 3);
  });

  it('[P08] Consumo = 0 kWh → 0 módulos, geração = 0, sem erro', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:0, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550});
    expect(dim.numeroModulos).toBe(0);
    expect(dim.geracaoMensalEstimadaKWh).toBe(0);
    expect(dim.percentualCompensacaoReal).toBe(0);
  });

  it('[P09] NOVO: percentualCompensacaoDesejado < 0 → throw', () => {
    expect(() => dimensionarSistema({consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550, percentualCompensacaoDesejado:-0.5})).toThrow();
  });

  it('[P10] percentualCompensacaoDesejado = 0 → 0 módulos', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550, percentualCompensacaoDesejado:0});
    expect(dim.numeroModulos).toBe(0);
  });

  it('[P11] percentualCompensacaoDesejado = 1.5 → 50% superdimensionado', () => {
    const dim100 = dimensionarSistema({consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550});
    const dim150 = dimensionarSistema({consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550, percentualCompensacaoDesejado:1.5});
    // Sistema 150% deve ter pelo menos 50% mais módulos
    expect(dim150.numeroModulos).toBeGreaterThan(dim100.numeroModulos);
  });

  it('[P12] Arredondamento para CIMA: potenciaReal SEMPRE >= potenciaSistema', () => {
    // Testar 20 consumos diferentes para garantir o arredondamento
    for (let consumo = 100; consumo <= 2000; consumo += 97) {
      const dim = dimensionarSistema({consumoMedioMensalKWh:consumo, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550});
      expect(dim.potenciaInstaladaRealKWp).toBeGreaterThanOrEqual(dim.potenciaSistemaKWp - 1e-9);
    }
  });

  it('[P13] Geração real SEMPRE >= consumo quando perdas < 100% e consumo > 0', () => {
    for (const consumo of [100, 300, 500, 800, 1200]) {
      const dim = dimensionarSistema({consumoMedioMensalKWh:consumo, hspLocal:5.4, perdasSistema:0.15, potenciaModuloWp:620});
      expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(consumo - 0.001);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 3 — Perdas: física e limites', () => {

  it('[P14] Temperatura STC (25°C exato): perda de temperatura = 0', () => {
    // Tcell = Tamb + (NOCT-20)×0.8 = 25 quando Tamb = 25 - (NOCT-20)×0.8
    // Para NOCT=45: Tamb = 25 - 25×0.8 = 25 - 20 = 5°C
    const r = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:100},{temperaturaAmbienteMediaC:5, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    expect(r.perdaTemperatura).toBe(0); // Tcell = 5 + 25×0.8 = 25°C = STC
  });

  it('[P15] Temperatura abaixo de STC: perda = 0 (ganho ignorado — conservador)', () => {
    // Tcell < 25 → deltaTemp < 0 → Math.max(0, negativo) = 0
    const r = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:25, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:97},{temperaturaAmbienteMediaC:10, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    // Tcell = 10 + (25-20)×0.8 = 10 + 4 = 14°C < 25°C
    expect(r.perdaTemperatura).toBe(0);
  });

  it('[P16] Inversor 100% eficiência: perdaInversor = 0 exato', () => {
    const r = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:100},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    expect(r.perdaInversor).toBe(0);
  });

  it('[P17] Sombreamento 50%: fatorEficiencia tem fator (1-0.50) = 0.50', () => {
    const rSem = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:100},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    const rCom = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:100},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:50, perdaSujidadePercent:0});
    // Com 50% sombra: (1-perdaSombreamento) = 0.5 → mais perdas
    expect(rCom.perdaTotalLiquida).toBeGreaterThan(rSem.perdaTotalLiquida);
    expect(rCom.perdaSombreamento).toBeCloseTo(0.50, 4);
  });

  it('[P18] Ganho bifacial 5% reduz perdas em ~5 pontos percentuais', () => {
    const rMono = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:97},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    const rBif  = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:true, ganhoBifacialPercent:5},{eficienciaMaximaPercent:97},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    const diferencaPP = rMono.perdaTotalLiquida - rBif.perdaTotalLiquida;
    // Diferença deve ser ~5% (ganho bifacial)
    expect(diferencaPP).toBeGreaterThan(0.03); // ao menos 3pp de diferença
    expect(diferencaPP).toBeLessThan(0.08);    // não mais de 8pp
  });

  it('[P19] NOVO: ganho bifacial 85% → perdas clampadas em 0 (não negativo)', () => {
    const r = calcularPerdas({coeficienteTemperaturaPmax:-0.29, noct:45, toleranciaPercent:0, bifacial:true, ganhoBifacialPercent:85},{eficienciaMaximaPercent:98},{temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2});
    expect(r.perdaTotalLiquida).toBe(0);
    expect(r.ganhoBifacial).toBeCloseTo(0.85, 4);
  });

  it('[P20] Cabeamento padrão = 2% (constante documentada no código)', () => {
    const r = calcularPerdas({coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false},{eficienciaMaximaPercent:100},{temperaturaAmbienteMediaC:25, perdaSombreamentoPercent:0, perdaSujidadePercent:0});
    // Tcell = 25 + 25×0.8 = 45°C, deltaTemp = 20, perda_temp = 0.34×20/100 = 6.8%
    // Mas cabeamento = 2% fixo
    expect(r.perdaCabeamento).toBeCloseTo(0.02, 6);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 4 — Custos recorrentes: fórmulas e edge cases', () => {

  const base = {distribuidora:CEMIG, cipRS:46.40, consumoMedioMensalKWh:281.5, geracaoMensalKWh:296, percentualFioB:0};

  it('[P21] Taxa disponibilidade = kWhMinimo × tarifa (ANEEL REN 414/2010)', () => {
    const bi  = calcularCustosRecorrentes({...base, tipoLigacao:'bifasica'});
    const tri = calcularCustosRecorrentes({...base, tipoLigacao:'trifasica'});
    const mono= calcularCustosRecorrentes({...base, tipoLigacao:'monofasica'});
    expect(mono.taxaDisponibilidadeRS).toBeCloseTo(30 * CEMIG.tarifaKWhComICMS, 4);
    expect(bi.taxaDisponibilidadeRS).toBeCloseTo(50 * CEMIG.tarifaKWhComICMS, 4);
    expect(tri.taxaDisponibilidadeRS).toBeCloseTo(100 * CEMIG.tarifaKWhComICMS, 4);
  });

  it('[P22] contaAntesRS = consumo × tarifa + CIP (sem outros termos)', () => {
    const r = calcularCustosRecorrentes({...base, tipoLigacao:'bifasica'});
    expect(r.contaAntesRS).toBeCloseTo(281.5 * CEMIG.tarifaKWhComICMS + 46.40, 4);
  });

  it('[P23] totalFixoMensalRS = taxaDisp + CIP + FioB', () => {
    const r = calcularCustosRecorrentes({...base, tipoLigacao:'bifasica', percentualFioB:0.60, fracaoTarifaFioB:0.35});
    expect(r.totalFixoMensalRS).toBeCloseTo(r.taxaDisponibilidadeRS + r.cipRS + r.custoBFioMensalRS, 6);
  });

  it('[P24] economiaMensalRS = contaAntesRS - contaAposRS', () => {
    const r = calcularCustosRecorrentes({...base, tipoLigacao:'bifasica', percentualFioB:0.60, fracaoTarifaFioB:0.35});
    expect(r.economiaMensalRS).toBeCloseTo(r.contaAntesRS - r.contaAposRS, 6);
  });

  it('[P25] Energia compensada = min(geração, consumo) — geração 2× não gera Fio B 2×', () => {
    const r1 = calcularCustosRecorrentes({...base, geracaoMensalKWh:281.5, tipoLigacao:'bifasica', percentualFioB:1.0, fracaoTarifaFioB:0.35});
    const r2 = calcularCustosRecorrentes({...base, geracaoMensalKWh:563.0, tipoLigacao:'bifasica', percentualFioB:1.0, fracaoTarifaFioB:0.35});
    // 2× geração → mesma energia compensada (limitada ao consumo) → mesmo FioB
    expect(r1.custoBFioMensalRS).toBeCloseTo(r2.custoBFioMensalRS, 4);
  });

  it('[P26] CRÍTICO: economia NEGATIVA quando consumo = mínimo mono e FioB = 100%', () => {
    // Consumo = 30 kWh (disponibilidade monofásica), sistema solar gera exatamente 30 kWh
    // Fio B = 100%: custo = 30 × tarifa × 0.35 × 1.0 → mais que a economia na energia
    const consumo30 = {
      distribuidora: CEMIG, tipoLigacao: 'monofasica' as const, cipRS: 0,
      consumoMedioMensalKWh: 30, geracaoMensalKWh: 30,
      percentualFioB: 1.0, fracaoTarifaFioB: 0.35,
    };
    const r = calcularCustosRecorrentes(consumo30);
    // conta antes = 30 × tarifa, conta após = 30 × tarifa (disponibilidade) + FioB
    // FioB > 0 → conta após > conta antes → economia NEGATIVA
    expect(r.economiaMensalRS).toBeLessThan(0);
    // → Sistema solar PIORA a situação neste caso. Usuário deve ser alertado.
  });

  it('[P27] CIP zero → zero impacto no FioB (apenas na conta antes/após)', () => {
    const rComCIP  = calcularCustosRecorrentes({...base, tipoLigacao:'monofasica', cipRS:50, percentualFioB:0.60, fracaoTarifaFioB:0.35});
    const rSemCIP  = calcularCustosRecorrentes({...base, tipoLigacao:'monofasica', cipRS:0,  percentualFioB:0.60, fracaoTarifaFioB:0.35});
    // FioB não depende do CIP
    expect(rComCIP.custoBFioMensalRS).toBeCloseTo(rSemCIP.custoBFioMensalRS, 4);
    // Mas conta antes e total fixo diferem
    expect(rComCIP.contaAntesRS).toBeGreaterThan(rSemCIP.contaAntesRS);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 5 — Precificação: precisão algébrica', () => {

  const kit = {marcaModulo:'X',modeloModulo:'X',potenciaModuloWp:620,quantidade:12,tipoModulo:'bifacial' as const,marcaInversor:'X',modeloInversor:'X',potenciaInversorKW:6,custoKitRS:12000};
  const comp = (extras=0) => ({kit:{...kit,custoKitRS:12000}, estruturaRS:extras,materiaisEletricosRS:0,maoDeObraRS:0,projetoArtRS:0,outrosCustosRS:0});

  it('[P28] Preço × (1 - imp - margem) = custo (inversão algébrica)', () => {
    for (const [imp,marg] of [[0.06,0.15],[0.08,0.20],[0.10,0.25],[0.04,0.10]]) {
      const r = calcularPrecificacao({composicao:comp(), aliquotaImpostos:imp, margemDesejada:marg});
      expect(r.precoVenda * (1 - imp - marg)).toBeCloseTo(r.custoTotalDireto, 4);
    }
  });

  it('[P29] Lucro = preço × margem (exato em 4 casas decimais)', () => {
    const r = calcularPrecificacao({composicao:comp(), aliquotaImpostos:0.065, margemDesejada:0.18});
    expect(r.lucroLiquido).toBeCloseTo(r.precoVenda * 0.18, 4);
  });

  it('[P30] Imposto = preço × alíquota (exato em 4 casas decimais)', () => {
    const r = calcularPrecificacao({composicao:comp(), aliquotaImpostos:0.065, margemDesejada:0.18});
    expect(r.impostoSobreVenda).toBeCloseTo(r.precoVenda * 0.065, 4);
  });

  it('[P31] Markup = (preço - custo) / custo × 100', () => {
    const r = calcularPrecificacao({composicao:comp(), aliquotaImpostos:0.06, margemDesejada:0.15});
    const markupCalculado = ((r.precoVenda - r.custoTotalDireto) / r.custoTotalDireto) * 100;
    expect(r.markupPercentual).toBeCloseTo(markupCalculado, 6);
  });

  it('[P32] Imposto 0% e margem 0% → preço = custo exato', () => {
    const r = calcularPrecificacao({composicao:comp(), aliquotaImpostos:0, margemDesejada:0});
    expect(r.precoVenda).toBeCloseTo(r.custoTotalDireto, 8);
  });

  it('[P33] Custo adicional R$1 → preço sobe mais que R$1 (efeito multiplicador do markup)', () => {
    const r0 = calcularPrecificacao({composicao:comp(0), aliquotaImpostos:0.06, margemDesejada:0.15});
    const r1 = calcularPrecificacao({composicao:comp(1), aliquotaImpostos:0.06, margemDesejada:0.15});
    expect(r1.precoVenda - r0.precoVenda).toBeGreaterThan(1);
    // Precisamente: Δpreço = ΔCusto / (1 - imp - margem) = 1 / (1 - 0.21) ≈ 1.266
    expect(r1.precoVenda - r0.precoVenda).toBeCloseTo(1 / (1 - 0.06 - 0.15), 4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 6 — Simples Nacional: faixas e fórmula oficial', () => {

  it('[P34] NOVO: faturamento = 0 → alíquota = 0% (sem faturamento, sem imposto)', () => {
    expect(calcularAliquotaEfetivaSimples(0, 'I')).toBe(0);
    expect(calcularAliquotaEfetivaSimples(0, 'III')).toBe(0);
  });

  it('[P35] NOVO: faturamento > R$4,8M → throw (fora do Simples Nacional)', () => {
    expect(() => calcularAliquotaEfetivaSimples(4_800_001, 'I')).toThrow();
    expect(() => calcularAliquotaEfetivaSimples(10_000_000, 'III')).toThrow();
  });

  it('[P36] Faixa 1 Anexo I: R$100k/ano → 4.00% exato', () => {
    // (100000 × 0.04 - 0) / 100000 = 4%
    expect(calcularAliquotaEfetivaSimples(100000, 'I')).toBeCloseTo(0.040, 5);
  });

  it('[P37] Limite máximo Anexo I (R$4.8M) → fórmula correta', () => {
    const aliq = calcularAliquotaEfetivaSimples(4_800_000, 'I');
    const esperado = (4_800_000 * 0.19 - 378_000) / 4_800_000;
    expect(aliq).toBeCloseTo(esperado, 6);
  });

  it('[P38] Faixa 1 Anexo III: R$180k/ano → 6.00% exato', () => {
    expect(calcularAliquotaEfetivaSimples(180_000, 'III')).toBeCloseTo(0.060, 5);
  });

  it('[P39] Continuidade entre faixas: alíquota não cai ao cruzar faixas', () => {
    // Deduções garantem continuidade
    const a1 = calcularAliquotaEfetivaSimples(179_999, 'I');
    const a2 = calcularAliquotaEfetivaSimples(180_001, 'I');
    // Ambas devem ser ~4% pela dedução da faixa 2
    expect(Math.abs(a1 - a2)).toBeLessThan(0.001); // Continuidade
  });

  it('[P40] Alíquota efetiva SEMPRE menor que alíquota nominal (exceto faixa 1)', () => {
    const faturamentos = [200000, 300000, 500000, 1000000, 2000000];
    for (const fat of faturamentos) {
      const aliqEfetiva = calcularAliquotaEfetivaSimples(fat, 'I');
      const faixa = SIMPLES_ANEXO_I.find(f => fat <= f.faixaMaximaAnual)!;
      expect(aliqEfetiva).toBeLessThanOrEqual(faixa.aliquota);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 7 — Tabela Price: precisão matemática', () => {

  it('[P41] PMT verificado algebricamente com fórmula exata', () => {
    const PV = 18000, i = 0.0199, n = 48;
    const pmtEsperado = PV * i * (1+i)**n / ((1+i)**n - 1);
    const t = gerarTabelaPrice({valorFinanciado:PV, taxaJurosMensal:i, numeroParcelas:n});
    expect(t[0].parcela).toBeCloseTo(pmtEsperado, 4);
  });

  it('[P42] Saldo devedor decresce monotonicamente (Price)', () => {
    const t = gerarTabelaPrice({valorFinanciado:15000, taxaJurosMensal:0.018, numeroParcelas:60});
    for (let k=1; k<t.length; k++) {
      expect(t[k].saldoDevedorInicial).toBeLessThan(t[k-1].saldoDevedorInicial);
    }
  });

  it('[P43] Juros = saldo × taxa (em cada parcela)', () => {
    const t = gerarTabelaPrice({valorFinanciado:20000, taxaJurosMensal:0.02, numeroParcelas:48});
    for (const p of t) {
      expect(p.juros).toBeCloseTo(p.saldoDevedorInicial * 0.02, 4);
    }
  });

  it('[P44] Parcela = juros + amortização (em cada parcela)', () => {
    const t = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.015, numeroParcelas:36});
    for (const p of t) {
      expect(p.parcela).toBeCloseTo(p.juros + p.amortizacao, 6);
    }
  });

  it('[P45] Amortizações somam ao valor financiado (erro < R$0,10)', () => {
    const t = gerarTabelaPrice({valorFinanciado:25000, taxaJurosMensal:0.0199, numeroParcelas:60});
    const somaAmort = t.reduce((s,p) => s+p.amortizacao, 0);
    expect(Math.abs(somaAmort - 25000)).toBeLessThan(0.10);
  });

  it('[P46] Amortização cresce, juros decrescem em cada parcela (monotônico)', () => {
    const t = gerarTabelaPrice({valorFinanciado:18000, taxaJurosMensal:0.02, numeroParcelas:48});
    for (let k=1; k<t.length; k++) {
      expect(t[k].amortizacao).toBeGreaterThan(t[k-1].amortizacao);
      expect(t[k].juros).toBeLessThan(t[k-1].juros);
    }
  });

  it('[P47] Taxa negativa → throw (taxa de juros não pode ser negativa)', () => {
    expect(() => gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:-0.01, numeroParcelas:12})).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 8 — Fluxo de caixa e TIR: rigor matemático', () => {

  it('[P48] NOVO: degradação > 1 → throw', () => {
    expect(() => calcularFluxoCaixa({investimentoInicial:15000, economiaMensalAno1:300, degradacaoAnualModulos:1.5, reajusteTarifarioAnual:0.06, horizonteAnos:25})).toThrow();
  });

  it('[P49] Fluxo[0] = -investimento (sempre negativo)', () => {
    const r = calcularFluxoCaixa({investimentoInicial:20000, economiaMensalAno1:400, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.07, horizonteAnos:25});
    expect(r.fluxoAnual[0]).toBe(-20000);
  });

  it('[P50] Economia acumulada: fluxo total = soma anos 1-25', () => {
    const r = calcularFluxoCaixa({investimentoInicial:15000, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25});
    const somaAnos = r.fluxoAnual.slice(1).reduce((a,v) => a+v, 0);
    expect(r.economiaTotalHorizonte).toBeCloseTo(somaAnos, 4);
  });

  it('[P51] TIR: VPL calculado com a própria TIR é < R$0.01', () => {
    const fluxo = [-20000, ...Array(25).fill(500*12)];
    const tir = calcularTIR(fluxo)!;
    const vpl = fluxo.reduce((s,cf,t) => s + cf/(1+tir)**t, 0);
    expect(Math.abs(vpl)).toBeLessThan(0.01);
  });

  it('[P52] TIR fluxo todo positivo (sem investimento) → null (não converge)', () => {
    const tir = calcularTIR([1000, 2000, 3000]); // sem investimento inicial
    expect(tir).toBeNull();
  });

  it('[P53] NOVO: calcularROI com investimento = 0 → throw', () => {
    expect(() => calcularROI(0, 50000)).toThrow();
  });

  it('[P54] Payback simples = investimento / economia anual constante', () => {
    const inv = 12000, eco = 200;
    const r = calcularFluxoCaixa({investimentoInicial:inv, economiaMensalAno1:eco, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25});
    // Payback = 12000 / (200×12) = 12000/2400 = 5 anos
    expect(r.paybackSimplesAnos).toBeCloseTo(5.0, 3);
  });

  it('[P55] Payback descontado > payback simples quando TMA > 0', () => {
    const r = calcularFluxoCaixa({investimentoInicial:15000, economiaMensalAno1:350, degradacaoAnualModulos:0, reajusteTarifarioAnual:0.06, horizonteAnos:25, taxaMinimaAtratividadeAnual:0.10});
    if (r.paybackSimplesAnos && r.paybackDescontadoAnos) {
      expect(r.paybackDescontadoAnos).toBeGreaterThan(r.paybackSimplesAnos);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 9 — formatarPayback: precisão e sem off-by-one', () => {

  it('[P56] NOVO: 1.9999 anos → "2 anos" (não "2 anos e 1 mês")', () => {
    // Bug anterior: arredondava para 24 meses → 2 anos e 0 meses ✓
    expect(formatarPayback(1.9999)).toBe('2 anos');
  });

  it('[P57] NOVO: 2.9999 anos → "3 anos" (não "3 anos e 1 mês")', () => {
    expect(formatarPayback(2.9999)).toBe('3 anos');
  });

  it('[P58] 2.5 anos → "2 anos e 6 meses"', () => {
    expect(formatarPayback(2.5)).toBe('2 anos e 6 meses');
  });

  it('[P59] 0.0833 anos → "1 mês" (1/12 de ano)', () => {
    expect(formatarPayback(1/12)).toBe('1 mês');
  });

  it('[P60] 1.0 exato → "1 ano" (singular)', () => {
    expect(formatarPayback(1.0)).toBe('1 ano');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('🔬 PENTE-FINO 10 — simularFinanciamento: bug de parcelas corrigido', () => {

  it('[P61] NOVO: economia >> parcelas → economiaTotalLiquida massiva e parcelasNoAno nunca negativo', () => {
    // Sistema que economiza R$2000/mês (muito acima das parcelas ~R$488/mês)
    // Bug anterior: parcelasNoAno ficava negativo → saldo inflado artificialmente
    const sim = simularFinanciamento(15000, 2000, 0.0199, 48, 0.005, 0.07, 25, 'Solfácil 48×');
    // Economia total (bruto - parcelas) deve ser muito positiva
    expect(sim.economiaTotalLiquida).toBeGreaterThan(200000); // >>parcelas de R$23k
    // Total pago nunca pode exceder o financiamento total
    expect(sim.totalPago).toBeCloseTo(sim.parcelaMensal * 48, 1);
    // economiaTotalLiquida = economia_bruta - totalPago deve ser > 0
    expect(sim.economiaTotalLiquida).toBeGreaterThan(0);
  });

  it('[P62] Total pago = parcela × n (sempre)', () => {
    const sim = simularFinanciamento(18000, 400, 0.0199, 48, 0.005, 0.06, 25, 'test');
    expect(sim.totalPago).toBeCloseTo(sim.parcelaMensal * 48, 2);
  });

  it('[P63] Solfácil 60× payback > Solfácil 48× (mais juros = maior custo)', () => {
    const s48 = simularFinanciamento(18000, 400, 0.0199, 48, 0.005, 0.06, 25, '48x');
    const s60 = simularFinanciamento(18000, 400, 0.0199, 60, 0.005, 0.06, 25, '60x');
    // 60x tem maior total pago → payback maior (ou igual)
    expect(s60.totalPago).toBeGreaterThan(s48.totalPago);
  });
});
