import { describe, expect, it } from 'vitest';
import { calcularCustosRecorrentes, projetarCustosAnuais } from './calcularCustos';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';

const cemig = DISTRIBUIDORAS.find((d) => d.codigo === 'CEMIG')!;

describe('calcularCustosRecorrentes', () => {
  it('calcula taxa de disponibilidade corretamente para ligação monofásica', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig,
      tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500,
      geracaoMensalKWh: 520,
      percentualFioB: 0.6,
    });
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * cemig.tarifaKWhComICMS, 1);
  });

  it('taxa de disponibilidade para trifásica é maior que monofásica', () => {
    const mono = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    const tri = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'trifasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    expect(tri.taxaDisponibilidadeRS).toBeGreaterThan(mono.taxaDisponibilidadeRS);
  });

  it('custo do Fio B é zero quando percentual é 0 (art. 26)', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    expect(r.custoBFioMensalRS).toBe(0);
  });

  it('custo total fixo é soma de disponibilidade + CIP + Fio B', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    expect(r.totalFixoMensalRS).toBeCloseTo(
      r.taxaDisponibilidadeRS + r.cipRS + r.custoBFioMensalRS, 4
    );
  });

  it('economia mensal é positiva quando solar gera mais do que o mínimo de disponibilidade', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    expect(r.economiaMensalRS).toBeGreaterThan(0);
  });

  // BUG CORRIGIDO (ago/2026): energia não compensada (consumo > geração) não era
  // cobrada em contaAposRS — regressão encontrada na auditoria completa de ago/2026.
  it('[REGRESSÃO] cobra a energia não compensada quando geração < consumo (sistema subdimensionado)', () => {
    const distribuidoraTeste = {
      codigo: 'TESTE', nome: 'Teste', nomeAbreviado: 'Teste', uf: ['MG'],
      tarifaKWhComICMS: 1.0, cipMediaReferenciaRS: 18, referenciaAtualizacao: '2026-01',
    };
    const r = calcularCustosRecorrentes({
      distribuidora: distribuidoraTeste, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 250, // 50% de compensação
      percentualFioB: 0.6, fracaoTarifaFioB: 0.35,
    });
    // Verificado manualmente (independente da implementação):
    // taxaDisponibilidadeRS = 30 × 1,00 = 30
    // energiaCompensadaKWh = min(250,500) = 250
    // custoBFioMensalRS = 250 × (1,00×0,35) × 0,6 = 52,5
    // totalFixoMensalRS = 30 + 18 + 52,5 = 100,5
    // energiaNaoCompensadaKWh = 500 - 250 = 250 → custo = 250 × 1,00 = 250
    // contaAposRS = max(100,5; 30+18) + 250 = 350,5
    // contaAntesRS = 500×1,00 + 18 = 518
    // economiaMensalRS = 518 - 350,5 = 167,5
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30, 4);
    expect(r.custoBFioMensalRS).toBeCloseTo(52.5, 4);
    expect(r.contaAntesRS).toBeCloseTo(518, 4);
    expect(r.contaAposRS).toBeCloseTo(350.5, 4);
    expect(r.economiaMensalRS).toBeCloseTo(167.5, 4);
  });
});

describe('projetarCustosAnuais', () => {
  // BUG CORRIGIDO (ago/2026): antes desta correção, a função nunca era chamada em
  // lugar nenhum do app — o Fio B, embutido em economiaMensalRS, ficava congelado
  // no percentual do ano de instalação por toda a projeção de 25 anos usada em
  // calcularFluxoCaixa/simularFinanciamento (ver auditoria completa de ago/2026).
  // Agora também aplica degradação à geração, o que faltava até nesta função.
  it('[REGRESSÃO] aplica reajuste tarifário, degradação da geração e Fio B variável ano a ano', () => {
    const distribuidoraTeste = {
      codigo: 'TESTE', nome: 'Teste', nomeAbreviado: 'Teste', uf: ['MG'],
      tarifaKWhComICMS: 1.0, cipMediaReferenciaRS: 0, referenciaAtualizacao: '2026-01',
    };
    const resultado = projetarCustosAnuais(
      { distribuidora: distribuidoraTeste, tipoLigacao: 'monofasica', cipRS: 0,
        consumoMedioMensalKWh: 1000, geracaoMensalKWh: 1000, percentualFioB: 0, fracaoTarifaFioB: 0.5 },
      (ano) => (ano === 2026 ? 0.5 : 0.8), // percentual de Fio B fictício por ano (só p/ testar o mecanismo)
      0.10, // reajuste tarifário 10% a.a.
      [2026, 2027],
      0.10, // degradação 10% a.a. (valor didático, não real)
      2026
    );
    // Verificado manualmente e de forma independente (script Python), não copiado
    // da implementação:
    // 2026 (ano base, sem reajuste/degradação): geração=1000, compensada=1000,
    //   custoFioB=1000×(1,00×0,5)×0,5=250, taxaDisp=30, totalFixo=280,
    //   contaAntes=1000, contaApos=280, economia=720
    // 2027 (tarifa×1,10, geração×0,90): tarifa=1,10, geração=900, compensada=900,
    //   custoFioB=900×(1,10×0,5)×0,8=396, taxaDisp=33, totalFixo=429,
    //   contaAntes=1100, naoCompensada=100→custo=110, contaApos=539, economia=561
    expect(resultado).toHaveLength(2);
    expect(resultado[0].ano).toBe(2026);
    expect(resultado[0].custos.custoBFioMensalRS).toBeCloseTo(250, 4);
    expect(resultado[0].custos.economiaMensalRS).toBeCloseTo(720, 4);
    expect(resultado[1].ano).toBe(2027);
    expect(resultado[1].custos.taxaDisponibilidadeRS).toBeCloseTo(33, 4);
    expect(resultado[1].custos.custoBFioMensalRS).toBeCloseTo(396, 2);
    expect(resultado[1].custos.contaAntesRS).toBeCloseTo(1100, 4);
    expect(resultado[1].custos.contaAposRS).toBeCloseTo(539, 2);
    expect(resultado[1].custos.economiaMensalRS).toBeCloseTo(561, 2);
    // A economia deve cair de um ano para o outro nesse cenário didático (Fio B
    // sobe de 50%→80% e degradação reduz a geração) — confirma que o Fio B
    // realmente varia ano a ano em vez de ficar congelado.
    expect(resultado[1].custos.economiaMensalRS).toBeLessThan(resultado[0].custos.economiaMensalRS);
  });

  it('aceita percentuaisFioBPorAno como Record (compatibilidade retroativa)', () => {
    const distribuidoraTeste = {
      codigo: 'TESTE', nome: 'Teste', nomeAbreviado: 'Teste', uf: ['MG'],
      tarifaKWhComICMS: 1.0, cipMediaReferenciaRS: 0, referenciaAtualizacao: '2026-01',
    };
    const resultado = projetarCustosAnuais(
      { distribuidora: distribuidoraTeste, tipoLigacao: 'monofasica', cipRS: 0,
        consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0 },
      { 2026: 0.6 },
      0, [2026], 0, 2026
    );
    expect(resultado[0].custos.custoBFioMensalRS).toBeCloseTo(500 * (1.0 * 0.35) * 0.6, 4);
  });
});
