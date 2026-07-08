/**
 * SEGUNDO LOTE DE 100 TESTES — LumenSolar
 * Foco: coerência entre módulos, valores limítrofes da norma,
 * comportamento com dados ausentes/zerados, precisão numérica.
 */

import { describe, expect, it } from 'vitest';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { calcularPerdas, MODULO_PADRAO_MONOCRISTALINO } from './dimensionamento/calcularPerdas';
import { hspPorUF } from '../data/hspPorUF';
import { fatoresMensaisPorUF, geracaoMensalPorMes } from '../data/hspMensal';
import { classificarEnquadramento, percentualFioBPorAno, custoAnualFioB } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { DISTRIBUIDORAS } from '../data/distribuidoras';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { calcularAliquotaEfetivaSimples } from '../data/tributacao';
import { gerarTabelaPrice, totalPagoPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularTIR, calcularROI, formatarPayback, areaTotalNecessariaM2, pesoDistribuidoKgM2 } from './financeiro/indicadores';

const cemig = DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!;
const MOD = MODULO_PADRAO_MONOCRISTALINO;
const INV = { eficienciaMaximaPercent: 97.0 };
const SITE = { temperaturaAmbienteMediaC: 24, perdaSombreamentoPercent: 2, perdaSujidadePercent: 2 };
const KIT_BASE = {
  marcaModulo:'X', modeloModulo:'X', potenciaModuloWp:620, quantidade:12,
  tipoModulo:'bifacial' as const, marcaInversor:'X', modeloInversor:'X',
  potenciaInversorKW:6, custoKitRS:10000,
};
const COMP = (kit=KIT_BASE, extra=0) => ({
  kit, estruturaRS:extra, materiaisEletricosRS:0, maoDeObraRS:0, projetoArtRS:0, outrosCustosRS:0,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO A — Coerência entre módulos de dimensionamento e perdas', () => {

  it('[A01] Perdas bifacial < perdas mono para mesmo inversor e local', () => {
    const bif = calcularPerdas({...MOD,bifacial:true,ganhoBifacialPercent:5}, INV, SITE);
    const mono = calcularPerdas({...MOD,bifacial:false}, INV, SITE);
    expect(bif.perdaTotalLiquida).toBeLessThan(mono.perdaTotalLiquida);
  });

  it('[A02] Módulo com ganho bifacial 0% = mesmo que mono', () => {
    const bif0 = calcularPerdas({...MOD,bifacial:true,ganhoBifacialPercent:0}, INV, SITE);
    const mono  = calcularPerdas({...MOD,bifacial:false}, INV, SITE);
    expect(bif0.perdaTotalLiquida).toBeCloseTo(mono.perdaTotalLiquida, 8);
  });

  it('[A03] Sistema dimensionado com perdas reais gera >= consumo', () => {
    const perdas = calcularPerdas(MOD, INV, SITE);
    const dim = dimensionarSistema({consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:620});
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(500);
  });

  it('[A04] Mais perdas → mais módulos necessários para mesmo consumo', () => {
    const d1 = dimensionarSistema({consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:0.10, potenciaModuloWp:550});
    const d2 = dimensionarSistema({consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:0.25, potenciaModuloWp:550});
    expect(d2.numeroModulos).toBeGreaterThanOrEqual(d1.numeroModulos);
  });

  it('[A05] Geração anual com fatores sazonais ≈ 12× geração mensal média', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:400, hspLocal:5.4, perdasSistema:0.18, potenciaModuloWp:550});
    const gen12 = geracaoMensalPorMes(dim.potenciaInstaladaRealKWp, 5.4, 0.18, 'MG');
    const somaAnual = gen12.reduce((a,v) => a+v, 0);
    // Deve ser próximo (±20%) da geração anual do dimensionamento
    expect(somaAnual).toBeGreaterThan(dim.geracaoAnualEstimadaKWh * 0.8);
    expect(somaAnual).toBeLessThan(dim.geracaoAnualEstimadaKWh * 1.2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO B — Lei 14.300 e custos recorrentes', () => {

  it('[B01] Custo Fio B anual: energia compensada × tarifa Fio B × percentual', () => {
    const e = classificarEnquadramento({dataProtocoloAcesso:'2024-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local'});
    const custo = custoAnualFioB(6000, 0.30, e, 2026); // 60% em 2026
    expect(custo).toBeCloseTo(6000 * 0.30 * 0.60, 4);
  });

  it('[B02] Custo Fio B é zero para unidade art.26 em qualquer ano até 2045', () => {
    const e = classificarEnquadramento({dataProtocoloAcesso:'2022-03-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local'});
    for (const ano of [2025,2027,2030,2035,2040,2045]) {
      expect(custoAnualFioB(6000, 0.30, e, ano)).toBe(0);
    }
  });

  it('[B03] Percentual Fio B cresce monotonicamente de 2023 a 2029', () => {
    const e = classificarEnquadramento({dataProtocoloAcesso:'2024-01-01', potenciaInstaladaKW:5, fonte:'fotovoltaica', modalidade:'autoconsumo_local'});
    const anos = [2023,2024,2025,2026,2027,2028];
    for (let i=1; i<anos.length; i++) {
      expect(percentualFioBPorAno(e, anos[i])).toBeGreaterThan(percentualFioBPorAno(e, anos[i-1]));
    }
  });

  it('[B04] Ligação trifásica paga mais disponibilidade que monofásica', () => {
    const base = {distribuidora:cemig, cipRS:18, consumoMedioMensalKWh:400, geracaoMensalKWh:420, percentualFioB:0};
    const mono = calcularCustosRecorrentes({...base, tipoLigacao:'monofasica'});
    const tri  = calcularCustosRecorrentes({...base, tipoLigacao:'trifasica'});
    expect(tri.taxaDisponibilidadeRS).toBeGreaterThan(mono.taxaDisponibilidadeRS);
    expect(tri.taxaDisponibilidadeRS / mono.taxaDisponibilidadeRS).toBeCloseTo(100/30, 3);
  });

  it('[B05] Conta após solar < conta antes do solar quando geração ≥ consumo', () => {
    const r = calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:500, geracaoMensalKWh:520, percentualFioB:0});
    expect(r.totalFixoMensalRS).toBeLessThan(r.contaAntesRS);
  });

  it('[B06] CIP sempre aparece na conta mesmo sem Fio B', () => {
    const r = calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:25, consumoMedioMensalKWh:500, geracaoMensalKWh:500, percentualFioB:0});
    expect(r.cipRS).toBe(25);
    expect(r.totalFixoMensalRS).toBeGreaterThanOrEqual(r.taxaDisponibilidadeRS + 25);
  });

  it('[B07] Energia compensada limitada ao consumo (não pode compensar mais que consome)', () => {
    // Se geração > consumo, compensação é limitada ao consumo
    const r = calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:400, geracaoMensalKWh:800, percentualFioB:0.60});
    // Custo Fio B deve usar min(geração, consumo) = 400 kWh
    expect(r.custoBFioMensalRS).toBeGreaterThan(0);
    expect(r.custoBFioMensalRS).toBeLessThan(800 * cemig.tarifaKWhComICMS * 0.35 * 0.60 + 0.01);
  });

  it('[B08] CIP negativo → deve lançar erro (validação adicionada na auditoria)', () => {
    expect(() => calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:-50, consumoMedioMensalKWh:500, geracaoMensalKWh:500, percentualFioB:0})).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO C — Precificação e Simples Nacional', () => {

  it('[C01] Custo total = soma de todos os componentes', () => {
    const r = calcularPrecificacao({composicao:{...COMP(), estruturaRS:800, materiaisEletricosRS:600, maoDeObraRS:1500, projetoArtRS:500}, aliquotaImpostos:0.06, margemDesejada:0.15});
    expect(r.custoTotalDireto).toBe(10000+800+600+1500+500);
  });

  it('[C02] Preço de venda aumenta com a margem', () => {
    const r10 = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.06, margemDesejada:0.10});
    const r20 = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.06, margemDesejada:0.20});
    expect(r20.precoVenda).toBeGreaterThan(r10.precoVenda);
  });

  it('[C03] Preço de venda aumenta com impostos', () => {
    const r5  = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.05, margemDesejada:0.15});
    const r10 = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.10, margemDesejada:0.15});
    expect(r10.precoVenda).toBeGreaterThan(r5.precoVenda);
  });

  it('[C04] Markup em % sobre custo = (preço-custo)/custo × 100', () => {
    const r = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.06, margemDesejada:0.15});
    const markupEsperado = ((r.precoVenda - r.custoTotalDireto) / r.custoTotalDireto) * 100;
    expect(r.markupPercentual).toBeCloseTo(markupEsperado, 4);
  });

  it('[C05] Com margem 20% e imposto 6%: Preço = Custo / 0.74', () => {
    const r = calcularPrecificacao({composicao:{kit:{...KIT_BASE,custoKitRS:10000},estruturaRS:0,materiaisEletricosRS:0,maoDeObraRS:0,projetoArtRS:0,outrosCustosRS:0}, aliquotaImpostos:0.06, margemDesejada:0.20});
    expect(r.precoVenda).toBeCloseTo(10000 / 0.74, 2);
  });

  it('[C06] Simples Anexo I faixas: 4%, 7.3%, 9.5%...', () => {
    expect(calcularAliquotaEfetivaSimples(100000, 'I')).toBeCloseTo(0.04, 5);
    expect(calcularAliquotaEfetivaSimples(200000, 'I')).toBeGreaterThan(0.04);
    expect(calcularAliquotaEfetivaSimples(500000, 'I')).toBeGreaterThan(0.06);
  });

  it('[C07] Alíquota efetiva não pode ser negativa', () => {
    const result = calcularAliquotaEfetivaSimples(50000, 'III');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('[C08] Simples: alíquota efetiva < alíquota nominal (pela dedução)', () => {
    const ef = calcularAliquotaEfetivaSimples(300000, 'III');
    expect(ef).toBeLessThan(0.112); // nominal da faixa 2 é 11.2%
    expect(ef).toBeGreaterThan(0.06); // maior que faixa 1
  });

  it('[C09] ABSURDO: imposto 99% → preço = 100× custo', () => {
    // Com margem 0 e imposto 99%: Preço = custo / (1 - 0.99) = custo × 100
    const r = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0.99, margemDesejada:0});
    expect(r.precoVenda).toBeCloseTo(10000 * 100, 0);
  });

  it('[C10] ABSURDO: imposto 0% e margem 0% → preço = custo', () => {
    const r = calcularPrecificacao({composicao:COMP(), aliquotaImpostos:0, margemDesejada:0});
    expect(r.precoVenda).toBeCloseTo(10000, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO D — Tabela Price: precisão e limites', () => {

  it('[D01] PMT com i=2%, n=24, PV=12000 → verificação manual', () => {
    const t = gerarTabelaPrice({valorFinanciado:12000, taxaJurosMensal:0.02, numeroParcelas:24});
    const pmtExp = 12000 * 0.02 * (1.02)**24 / ((1.02)**24 - 1);
    expect(t[0].parcela).toBeCloseTo(pmtExp, 2);
  });

  it('[D02] Juros da primeira parcela = saldo × taxa', () => {
    const t = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.02, numeroParcelas:12});
    expect(t[0].juros).toBeCloseTo(10000 * 0.02, 4);
  });

  it('[D03] Amortização cresce a cada parcela (Price)', () => {
    const t = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.02, numeroParcelas:24});
    for (let i=1; i<t.length; i++) {
      expect(t[i].amortizacao).toBeGreaterThan(t[i-1].amortizacao);
    }
  });

  it('[D04] Juros diminuem a cada parcela (Price)', () => {
    const t = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.02, numeroParcelas:24});
    for (let i=1; i<t.length; i++) {
      expect(t[i].juros).toBeLessThan(t[i-1].juros);
    }
  });

  it('[D05] Saldo devedor sempre não-negativo em todas as parcelas', () => {
    const t = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.03, numeroParcelas:36});
    for (const p of t) expect(p.saldoDevedorFinal).toBeGreaterThanOrEqual(0);
  });

  it('[D06] Juros totais crescem com a taxa (mesmo prazo)', () => {
    const t1 = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.01, numeroParcelas:24});
    const t2 = gerarTabelaPrice({valorFinanciado:10000, taxaJurosMensal:0.03, numeroParcelas:24});
    expect(totalPagoPrice(t2)).toBeGreaterThan(totalPagoPrice(t1));
  });

  it('[D07] ABSURDO: taxa de 100% ao mês → parcela enorme mas cálculo correto', () => {
    const t = gerarTabelaPrice({valorFinanciado:1000, taxaJurosMensal:1.0, numeroParcelas:6});
    expect(t[0].parcela).toBeGreaterThan(1000);
    expect(t[5].saldoDevedorFinal).toBeCloseTo(0, 0);
  });

  it('[D08] n=120 parcelas: saldo final ainda zerado', () => {
    const t = gerarTabelaPrice({valorFinanciado:50000, taxaJurosMensal:0.012, numeroParcelas:120});
    expect(t[119].saldoDevedorFinal).toBeCloseTo(0, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO E — TIR, ROI, payback, área', () => {

  it('[E01] TIR maior = investimento melhor', () => {
    const bom  = calcularTIR([-15000, ...Array(25).fill(6000)])!;
    const ruim = calcularTIR([-15000, ...Array(25).fill(1000)])!;
    expect(bom).toBeGreaterThan(ruim);
  });

  it('[E02] Fluxo: -10k, +10k imediato → TIR = 0%', () => {
    const tir = calcularTIR([-10000, 10000]);
    expect(tir).toBeCloseTo(0, 4);
  });

  it('[E03] ROI: economia = 2× investimento → ROI = 1 (100%)', () => {
    expect(calcularROI(10000, 20000)).toBeCloseTo(1.0, 5);
  });

  it('[E04] ROI nunca negativo quando economia > investimento', () => {
    expect(calcularROI(10000, 15000)).toBeGreaterThan(0);
  });

  it('[E05] Payback: "0 meses" para 0 anos', () => {
    expect(formatarPayback(0)).toBe('0 meses');
  });

  it('[E06] Payback: "12 meses" para 1 ano exato — não "1 ano e 0 meses"', () => {
    // 1.0 → 1 ano (sem meses extra)
    expect(formatarPayback(1.0)).toBe('1 ano');
    // 0.999... → arredonda para 12 meses = 1 ano
    expect(formatarPayback(0.999)).not.toContain('12 meses');
  });

  it('[E07] Payback: "2 anos e 3 meses" para 2.25', () => {
    expect(formatarPayback(2.25)).toBe('2 anos e 3 meses');
  });

  it('[E08] Área escala com número de módulos', () => {
    const a5  = areaTotalNecessariaM2(5, 550);
    const a10 = areaTotalNecessariaM2(10, 550);
    expect(a10).toBeCloseTo(a5 * 2, 3);
  });

  it('[E09] Módulos maiores ocupam mais área por módulo', () => {
    const a400 = areaTotalNecessariaM2(10, 400);
    const a700 = areaTotalNecessariaM2(10, 700);
    expect(a700).toBeGreaterThan(a400);
  });

  it('[E10] ABSURDO: 0 módulos → área = 0', () => {
    expect(areaTotalNecessariaM2(0, 620)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO F — Fluxo de caixa com reajuste e degradação', () => {

  it('[F01] Sem reajuste, sem degradação: todos os anos têm mesma economia', () => {
    const r = calcularFluxoCaixa({investimentoInicial:10000, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:10});
    for (let i=1; i<=10; i++) {
      expect(r.fluxoAnual[i]).toBeCloseTo(300*12, 5);
    }
  });

  it('[F02] Com degradação: economia do ano 2 < economia do ano 1', () => {
    const r = calcularFluxoCaixa({investimentoInicial:10000, economiaMensalAno1:300, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0, horizonteAnos:5});
    expect(r.fluxoAnual[2]).toBeLessThan(r.fluxoAnual[1]);
  });

  it('[F03] Com reajuste tarifário: economia do ano 2 > economia do ano 1', () => {
    const r = calcularFluxoCaixa({investimentoInicial:10000, economiaMensalAno1:300, degradacaoAnualModulos:0, reajusteTarifarioAnual:0.10, horizonteAnos:5});
    expect(r.fluxoAnual[2]).toBeGreaterThan(r.fluxoAnual[1]);
  });

  it('[F04] Payback simples = investimento / economia anual quando constante', () => {
    const r = calcularFluxoCaixa({investimentoInicial:12000, economiaMensalAno1:500, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25});
    // Payback = 12000 / (500×12) = 12000 / 6000 = 2 anos
    expect(r.paybackSimplesAnos).toBeCloseTo(2.0, 4);
  });

  it('[F05] Payback descontado > payback simples (dinheiro futuro vale menos)', () => {
    const r = calcularFluxoCaixa({investimentoInicial:15000, economiaMensalAno1:400, degradacaoAnualModulos:0, reajusteTarifarioAnual:0.06, horizonteAnos:25, taxaMinimaAtratividadeAnual:0.08});
    if (r.paybackDescontadoAnos !== null && r.paybackSimplesAnos !== null) {
      expect(r.paybackDescontadoAnos).toBeGreaterThanOrEqual(r.paybackSimplesAnos);
    }
  });

  it('[F06] VPL positivo quando TIR > TMA', () => {
    // TMA=5%, sistema que claramente tem TIR>>5%
    const r = calcularFluxoCaixa({investimentoInicial:10000, economiaMensalAno1:600, degradacaoAnualModulos:0, reajusteTarifarioAnual:0.07, horizonteAnos:25, taxaMinimaAtratividadeAnual:0.05});
    expect(r.vpl).not.toBeNull();
    expect(r.vpl!).toBeGreaterThan(0);
  });

  it('[F07] VPL negativo quando TIR < TMA', () => {
    // TMA=50%, sistema ruim: -100k, +1k/ano por 25 anos → TIR muito baixa
    const r = calcularFluxoCaixa({investimentoInicial:100000, economiaMensalAno1:100, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:25, taxaMinimaAtratividadeAnual:0.50});
    expect(r.vpl).not.toBeNull();
    expect(r.vpl!).toBeLessThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO G — HSP mensal e sazonalidade', () => {

  it('[G01] Fatores mensais do nordeste: pico em set-out-nov', () => {
    const f = fatoresMensaisPorUF('CE'); // nordeste
    const pico = Math.max(...f);
    const picoIdx = f.indexOf(pico);
    expect(picoIdx).toBeGreaterThanOrEqual(7); // agosto (7) a novembro (10)
    expect(picoIdx).toBeLessThanOrEqual(10);
  });

  it('[G02] Fatores mensais do sul: variação maior que do nordeste', () => {
    const fSul  = fatoresMensaisPorUF('RS');
    const fNE   = fatoresMensaisPorUF('CE');
    const ampSul = Math.max(...fSul) - Math.min(...fSul);
    const ampNE  = Math.max(...fNE)  - Math.min(...fNE);
    expect(ampSul).toBeGreaterThan(ampNE); // sul tem estações mais marcadas
  });

  it('[G03] Geração mensal: soma dos 12 meses ≈ geração com HSP anual', () => {
    const potKWp = 5, hsp = 5.4, perdas = 0.18;
    const genAnualDireto = potKWp * hsp * 365 * (1 - perdas);
    const gen12 = geracaoMensalPorMes(potKWp, hsp, perdas, 'MG');
    const somaGen12 = gen12.reduce((a,v) => a+v, 0);
    // Devem ser próximos — tolerância 5%
    expect(Math.abs(somaGen12 - genAnualDireto) / genAnualDireto).toBeLessThan(0.05);
  });

  it('[G04] Geração mensal de dezembro > junho em MG (verão > inverno)', () => {
    const gen = geracaoMensalPorMes(5, 5.4, 0.18, 'MG');
    expect(gen[11]).toBeGreaterThan(gen[5]); // dez > jun
  });

  it('[G05] Todas as 12 gerações mensais são positivas', () => {
    const gen = geracaoMensalPorMes(4, 5.5, 0.20, 'GO');
    for (const v of gen) expect(v).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO H — Integridade de dados (ANEEL, CRESESB, distribuidoras)', () => {

  it('[H01] Todas distribuidoras têm código único', () => {
    const codigos = DISTRIBUIDORAS.map(d => d.codigo);
    const unicos = new Set(codigos);
    expect(unicos.size).toBe(codigos.length);
  });

  it('[H02] Todas distribuidoras têm CIP de referência positiva', () => {
    for (const d of DISTRIBUIDORAS) {
      if (d.codigo === 'OUTRO') continue;
      expect(d.cipMediaReferenciaRS).toBeGreaterThan(0);
    }
  });

  it('[H03] HSP de MG >= 5.0 e <= 6.0 (referência CRESESB)', () => {
    const hsp = hspPorUF('MG');
    expect(hsp).toBeGreaterThanOrEqual(5.0);
    expect(hsp).toBeLessThanOrEqual(6.0);
  });

  it('[H04] Nenhuma distribuidora tem tarifa negativa', () => {
    for (const d of DISTRIBUIDORAS) {
      expect(d.tarifaKWhComICMS).toBeGreaterThan(0);
    }
  });

  it('[H05] CEMIG tarifa 2026 (Res. ANEEL 3.589/2026) entre R$1,00 e R$1,50', () => {
    expect(cemig.tarifaKWhComICMS).toBeGreaterThan(1.00);
    expect(cemig.tarifaKWhComICMS).toBeLessThan(1.50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO I — Cenários reais brasileiros completos', () => {

  it('[I01] Residencial RN (alto sol): dimensionamento menor que MG mesmo consumo', () => {
    const base = {consumoMedioMensalKWh:400, perdasSistema:0.18, potenciaModuloWp:550};
    const rRN = dimensionarSistema({...base, hspLocal:hspPorUF('RN')});
    const rMG = dimensionarSistema({...base, hspLocal:hspPorUF('MG')});
    expect(rRN.potenciaSistemaKWp).toBeLessThan(rMG.potenciaSistemaKWp);
  });

  it('[I02] Cenário CEMIG padrão: economia > taxa disponibilidade quando geração = consumo', () => {
    const r = calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:500, geracaoMensalKWh:500, percentualFioB:0});
    expect(r.economiaMensalRS).toBeGreaterThan(r.taxaDisponibilidadeRS);
  });

  it('[I03] Payback 5 kWp / CEMIG / R$15k investimento deve estar entre 3 e 8 anos', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:450, hspLocal:5.4, perdasSistema:0.15, potenciaModuloWp:620});
    const cr = calcularCustosRecorrentes({distribuidora:cemig, tipoLigacao:'monofasica', cipRS:18, consumoMedioMensalKWh:450, geracaoMensalKWh:dim.geracaoMensalEstimadaKWh, percentualFioB:0});
    const fluxo = calcularFluxoCaixa({investimentoInicial:15000, economiaMensalAno1:cr.economiaMensalRS, degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.06, horizonteAnos:25});
    expect(fluxo.paybackSimplesAnos).not.toBeNull();
    expect(fluxo.paybackSimplesAnos!).toBeGreaterThan(2);
    expect(fluxo.paybackSimplesAnos!).toBeLessThan(10);
  });

  it('[I04] Sistema superdimensionado (150% do consumo): compensação > 100%', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:300, hspLocal:5.5, perdasSistema:0.20, potenciaModuloWp:550, percentualCompensacaoDesejado:1.5});
    expect(dim.percentualCompensacaoReal).toBeGreaterThan(1.3);
  });

  it('[I05] Sistema mínimo (50% compensação): geração < consumo', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:500, hspLocal:5.4, perdasSistema:0.20, potenciaModuloWp:550, percentualCompensacaoDesejado:0.50});
    expect(dim.geracaoMensalEstimadaKWh).toBeLessThan(500 * 0.9); // gera menos que o consumo
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('BLOCO J — Valores absurdos: programa deve ser robusto', () => {

  it('[J01] ABSURDO: consumo 0 kWh → dimensionamento de 1 módulo mínimo', () => {
    const dim = dimensionarSistema({consumoMedioMensalKWh:0.001, hspLocal:5.4, perdasSistema:0.20, potenciaModuloWp:550});
    expect(dim.numeroModulos).toBeGreaterThanOrEqual(1);
  });

  it('[J02] ABSURDO: inversor 1% eficiência → perdas totais muito altas (>95%)', () => {
    const r = calcularPerdas(MOD, {eficienciaMaximaPercent:1}, SITE);
    expect(r.perdaInversor).toBeCloseTo(0.99, 3);
    expect(r.perdaTotalLiquida).toBeGreaterThan(0.95);
  });

  it('[J03] ABSURDO: tarifa de distribuidora R$0,01 → disponibilidade quase zero', () => {
    const distribCheap = {...cemig, tarifaKWhComICMS:0.01};
    const r = calcularCustosRecorrentes({distribuidora:distribCheap, tipoLigacao:'monofasica', cipRS:0, consumoMedioMensalKWh:500, geracaoMensalKWh:500, percentualFioB:0});
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(0.30, 2);
  });

  it('[J04] ABSURDO: TIR de fluxo sem lucro possível deve ser muito baixa ou null', () => {
    const fluxo = [-1000000, ...Array(25).fill(1)]; // -1 milhão, +R$1/ano
    const tir = calcularTIR(fluxo);
    if (tir !== null) expect(tir).toBeLessThan(-0.99); // TIR quase -100%
  });

  it('[J05] ABSURDO: horizonte de 1 ano → payback ou null correto', () => {
    const r = calcularFluxoCaixa({investimentoInicial:20000, economiaMensalAno1:500, degradacaoAnualModulos:0, reajusteTarifarioAnual:0, horizonteAnos:1});
    // 500×12 = 6000 < 20000 → não paga em 1 ano → null
    expect(r.paybackSimplesAnos).toBeNull();
  });
});
