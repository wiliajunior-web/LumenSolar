import { describe, it, expect } from 'vitest';
import { calcularCustoDemanda, calcularDimensionamentoGrupoA } from './calcularGrupoA';

// Este arquivo não existia antes da auditoria de ago/2026 — calcularGrupoA.ts
// (dimensionamento e análise financeira de Grupo A / Média Tensão) tinha ZERO
// cobertura de teste, apesar de conter uma fórmula de cobrança de demanda
// explicitamente marcada no código como "não verificada contra fonte
// primária". Valores abaixo foram calculados manualmente (não copiados da
// implementação) antes de rodar os testes — ver comentário de cada bloco.

describe('calcularCustoDemanda', () => {
  it('sem ultrapassagem: cobra só demanda contratada × tarifa', () => {
    // demanda medida (80) <= contratada (100) → sem ultrapassagem.
    // custoBase = 100 × 20 = 2000; ultrapassagem = 0.
    const r = calcularCustoDemanda(100, 20, 80);
    expect(r.houveUltrapassagem).toBe(false);
    expect(r.custoBaseRS).toBeCloseTo(2000, 2);
    expect(r.custoUltrapassagemRS).toBe(0);
    expect(r.custoTotalRS).toBeCloseTo(2000, 2);
    expect(r.ultrapassagemKW).toBe(0);
  });

  it('sem demanda medida informada: usa a contratada como medida (sem ultrapassagem)', () => {
    const r = calcularCustoDemanda(100, 20);
    expect(r.demandaMedidaKW).toBe(100);
    expect(r.houveUltrapassagem).toBe(false);
    expect(r.custoBaseRS).toBeCloseTo(2000, 2);
  });

  it('com ultrapassagem: cobra a parcela excedente a 2× a tarifa, além da base', () => {
    // medida=130, contratada=100 → ultrapassagem=30kW.
    // custoBase = 130 × 20 = 2600 (quando há ultrapassagem, a base já usa a
    // demanda MEDIDA, não a contratada — ver código).
    // custoUltrapassagem = 30 × 2 × 20 = 1200.
    // total = 2600 + 1200 = 3800.
    const r = calcularCustoDemanda(100, 20, 130);
    expect(r.houveUltrapassagem).toBe(true);
    expect(r.ultrapassagemKW).toBeCloseTo(30, 3);
    expect(r.custoBaseRS).toBeCloseTo(2600, 2);
    expect(r.custoUltrapassagemRS).toBeCloseTo(1200, 2);
    expect(r.custoTotalRS).toBeCloseTo(3800, 2);
  });

  it('rejeita demanda contratada ou tarifa negativas', () => {
    expect(() => calcularCustoDemanda(-1, 20)).toThrow();
    expect(() => calcularCustoDemanda(100, -1)).toThrow();
  });
});

describe('calcularDimensionamentoGrupoA', () => {
  // Cenário hand-verified (valores calculados manualmente, não extraídos do
  // código, antes de rodar o teste):
  //   histórico FP = [1000] (11 zeros filtrados) → médiaFP = 1000 kWh
  //   histórico P  = [200]  (11 zeros filtrados) → médiaP  = 200  kWh
  //   TE_Ponta=0.60, TE_ForaPonta=0.40 → Fc = 0.60/0.40 = 1.5
  //   TUSD_Ponta=0.30, TUSD_ForaPonta=0.25
  //   demandaContratada=100kW, tarifaDemanda=20 R$/kW, sem demanda medida
  //   hspLocal=5.0 (valor redondo controlado, não hspPorUF real — isola o
  //   teste da tabela de HSP por UF), perdasSistema=0.15 (eficiência=0.85)
  //   potenciaModuloWp=550 (0.55 kWp/módulo), percentualCompensacao=1.0
  //
  //   geracaoNecessaria = (1000 + 1.5×200) × 1.0 = 1300 kWh
  //   DIAS_MES = 365/12 = 30.41666...
  //   potMinKWp = 1300 / (5.0 × 30.41666... × 0.85) = 1300 / 129.270833...
  //             ≈ 10.056 kWp
  //   nMod = ceil(10.056/0.55) = ceil(18.284) = 19 módulos
  //   potRealKWp = 19 × 0.55 = 10.45 kWp
  //   geracaoMensal = 10.45 × 5.0 × 30.41666... × 0.85 ≈ 1350.9 kWh
  //   geracaoAnual  ≈ 1350.880... × 12 ≈ 16210.6 kWh
  //
  //   energiaFP = 1000 × (0.40+0.25) = 650
  //   energiaP  = 200  × (0.60+0.30) = 180
  //   demanda (sem ultrapassagem, medida==contratada==100) = 100×20 = 2000
  //   contaAntes = 650+180+2000 = 2830
  //   energiaCompensada = min(1350.9, 1200) = 1200 (mediaTotal=1000+200)
  //   valorCompensadoTE = 1200 × 0.40 = 480
  //   contaApos = max(2830-480, 2000) = 2350
  //   economiaMensal = 2830-2350 = 480 → economiaAnual = 5760
  const params = {
    consumo: {
      historicoBFP: [1000, 0,0,0,0,0,0,0,0,0,0,0],
      historicoBP:  [200,  0,0,0,0,0,0,0,0,0,0,0],
      demandaContratadaKW: 100,
    },
    tarifa: {
      tePontaKWh: 0.60,
      teForaPontaKWh: 0.40,
      tusdPontaKWh: 0.30,
      tusdForaPontaKWh: 0.25,
      demandaKW: 20,
    },
    hspLocal: 5.0,
    perdasSistema: 0.15,
    potenciaModuloWp: 550,
    percentualCompensacao: 1.0,
  };

  it('calcula médias, Fc e geração necessária corretamente', () => {
    const r = calcularDimensionamentoGrupoA(params);
    expect(r.mediaConsumoFPkWh).toBeCloseTo(1000, 1);
    expect(r.mediaConsumoPkWh).toBeCloseTo(200, 1);
    expect(r.mediaTotalKWh).toBeCloseTo(1200, 1);
    expect(r.fatorCompensacaoFc).toBeCloseTo(1.5, 4);
    expect(r.geracaoNecessariaKWh).toBeCloseTo(1300, 1);
  });

  it('dimensiona o sistema (potência, módulos, geração) corretamente', () => {
    const r = calcularDimensionamentoGrupoA(params);
    expect(r.potenciaMinKWp).toBeCloseTo(10.056, 2);
    expect(r.numeroModulos).toBe(19);
    expect(r.potenciaRealKWp).toBeCloseTo(10.45, 3);
    expect(r.geracaoMensalKWh).toBeCloseTo(1350.9, 0);
    expect(r.geracaoAnualKWh).toBeCloseTo(16210.6, 0);
  });

  it('calcula a análise financeira (conta antes/depois, economia) corretamente', () => {
    const r = calcularDimensionamentoGrupoA(params);
    expect(r.contaAntesRS).toBeCloseTo(2830, 2);
    expect(r.contaAposRS).toBeCloseTo(2350, 2);
    expect(r.economiaMensalRS).toBeCloseTo(480, 2);
    expect(r.economiaAnualRS).toBeCloseTo(5760, 2);
    expect(r.houveUltrapassagemDemanda).toBe(false);
    expect(r.custoDemandaBaseRS).toBeCloseTo(2000, 2);
    expect(r.custoUltrapassagemDemandaRS).toBe(0);
  });

  it('[REGRESSÃO] não confunde histórico Ponta com Fora Ponta — trocar os dois muda o resultado', () => {
    // Guarda contra um bug de wiring comum: se historicoBFP e historicoBP
    // forem trocados na chamada (ex: no store), Fc continua o mesmo mas
    // geracaoNecessaria e a conta antes mudam, porque a P é mais cara.
    const trocado = calcularDimensionamentoGrupoA({
      ...params,
      consumo: { ...params.consumo, historicoBFP: params.consumo.historicoBP, historicoBP: params.consumo.historicoBFP },
    });
    const normal = calcularDimensionamentoGrupoA(params);
    expect(trocado.geracaoNecessariaKWh).not.toBeCloseTo(normal.geracaoNecessariaKWh, 1);
    expect(trocado.contaAntesRS).not.toBeCloseTo(normal.contaAntesRS, 1);
  });

  it('gera alerta de possível redução de demanda quando geração > 50% da demanda medida', () => {
    const r = calcularDimensionamentoGrupoA({
      ...params,
      consumo: { ...params.consumo, demandaMedidaFPkW: 15 }, // potRealKWp=10.45 > 15×0.5=7.5
    });
    expect(r.reducaoDemandaPossivel).toBe(true);
    expect(r.alertas.some(a => a.includes('demanda contratada'))).toBe(true);
  });

  it('gera alerta de ultrapassagem de demanda quando medida excede a contratada', () => {
    const r = calcularDimensionamentoGrupoA({
      ...params,
      consumo: { ...params.consumo, demandaMedidaFPkW: 130 },
    });
    expect(r.houveUltrapassagemDemanda).toBe(true);
    expect(r.custoUltrapassagemDemandaRS).toBeGreaterThan(0);
    expect(r.alertas.some(a => a.includes('Ultrapassagem de demanda'))).toBe(true);
  });

  it('filtra meses com consumo zero (não preenchidos) do cálculo da média', () => {
    // Só 2 dos 12 meses preenchidos — a média deve considerar só esses 2,
    // não dividir por 12 (o que sub-estimaria a média e o dimensionamento).
    const r = calcularDimensionamentoGrupoA({
      ...params,
      consumo: {
        ...params.consumo,
        historicoBFP: [900, 1100, 0,0,0,0,0,0,0,0,0,0], // média = 1000
      },
    });
    expect(r.mediaConsumoFPkWh).toBeCloseTo(1000, 1);
  });
});
