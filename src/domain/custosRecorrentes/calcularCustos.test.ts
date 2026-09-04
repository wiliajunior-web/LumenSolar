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

  // BUG CORRIGIDO (ago/2026, e CORRIGIDO DE NOVO em set/2026): energia não
  // compensada (consumo > geração) não era cobrada em contaAposRS na primeira
  // versão. A correção de ago/2026 passou a cobrá-la, mas somando
  // taxaDisponibilidadeRS por cima do custo da energia não compensada, em vez
  // de aplicar a taxaDisponibilidadeRS como PISO mínimo (REN ANEEL 414/2010:
  // paga-se o maior entre o consumo medido e o mínimo de disponibilidade,
  // nunca os dois somados). Esse segundo bug foi encontrado na auditoria de
  // set/2026 ao revisar o código adjacente ao guard de geracaoMensalKWh<0 —
  // o comentário de ago/2026 já continha a conta manual correta
  // (R$320,50/R$167,50→na real R$197,50, ver abaixo) mas o teste original
  // esperava R$350,50, batendo com a implementação errada, não com a conta
  // manual do próprio comentário.
  it('[REGRESSÃO] cobra a energia não compensada quando geração < consumo (sistema subdimensionado), sem somar a taxa de disponibilidade em dobro', () => {
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
    // Verificado manualmente (independente da implementação; REN ANEEL 414/2010
    // — cobrança é o MAIOR entre consumo faturável e mínimo de disponibilidade):
    // taxaDisponibilidadeRS = 30 × 1,00 = 30
    // energiaCompensadaKWh = min(250,500) = 250
    // custoBFioMensalRS = 250 × (1,00×0,35) × 0,6 = 52,5
    // energiaNaoCompensadaKWh = 500 - 250 = 250
    // kWhFaturado = max(250 [não compensada], 30 [mínimo]) = 250
    //   (a energia não compensada já supera o mínimo — não há "piso" a aplicar
    //   por cima, diferente de quando geração cobre 100% do consumo)
    // contaAposRS = 250×1,00 (energia faturada) + 18 (CIP) + 52,5 (Fio B) = 320,5
    // contaAntesRS = 500×1,00 + 18 = 518
    // economiaMensalRS = 518 - 320,5 = 197,5
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30, 4);
    expect(r.custoBFioMensalRS).toBeCloseTo(52.5, 4);
    expect(r.contaAntesRS).toBeCloseTo(518, 4);
    expect(r.contaAposRS).toBeCloseTo(320.5, 4);
    expect(r.economiaMensalRS).toBeCloseTo(197.5, 4);
  });

  // ADICIONADO (set/2026, auditoria "rode com valores absurdos"): geracaoMensalKWh
  // negativo não era guardado — sem crash nem NaN, só distorcia silenciosamente
  // energiaCompensadaKWh (Math.min com um número negativo) e todo o resto do
  // resultado. Paridade de defesa em profundidade com os guards já existentes
  // de tarifa/CIP/consumo negativos, na mesma função.
  describe('[REGRESSÃO set/2026] guard contra geracaoMensalKWh negativo', () => {
    it('lança erro quando geracaoMensalKWh é negativo', () => {
      expect(() => calcularCustosRecorrentes({
        distribuidora: cemig, tipoLigacao: 'monofasica',
        cipRS: 18, consumoMedioMensalKWh: 500, geracaoMensalKWh: -1, percentualFioB: 0.6,
      })).toThrow('Geração mensal não pode ser negativa.');
    });

    it('geracaoMensalKWh = 0 (estruturalmente válido, sistema ainda não gera) não lança erro e não gera economia nem prejuízo', () => {
      const r = calcularCustosRecorrentes({
        distribuidora: cemig, tipoLigacao: 'monofasica',
        cipRS: 18, consumoMedioMensalKWh: 500, geracaoMensalKWh: 0, percentualFioB: 0.6,
      });
      // Verificado manualmente: com geração=0 toda a energia é "não compensada"
      // (500kWh), que já supera o mínimo de disponibilidade (30kWh) — então
      // kWhFaturado=500, contaAposRS=500×tarifa+cip+0(FioB)=contaAntesRS, e
      // economiaMensalRS=0. Fisicamente correto: sem geração solar, não pode
      // haver nem economia nem prejuízo em relação à conta antes do solar — este
      // é o caso que expôs o bug de dupla contagem corrigido em set/2026 (a
      // implementação antiga dava economiaMensalRS=-35,48, um "prejuízo" que não
      // existe, causado por somar a taxa de disponibilidade por cima da energia
      // não compensada em vez de usá-la só como piso).
      expect(r.economiaMensalRS).toBeCloseTo(0, 4);
      expect(r.contaAposRS).toBeCloseTo(r.contaAntesRS, 4);
    });

    it('geracaoMensalKWh absurdamente grande é limitada pelo consumo (min), não inflaciona a economia', () => {
      const r = calcularCustosRecorrentes({
        distribuidora: cemig, tipoLigacao: 'monofasica',
        cipRS: 18, consumoMedioMensalKWh: 500, geracaoMensalKWh: 1_000_000, percentualFioB: 0.6,
      });
      // Verificado manualmente (tarifa CEMIG = R$1,1827/kWh):
      // taxaDisponibilidadeRS = 30 × 1,1827 = 35,481
      // energiaCompensadaKWh = min(1.000.000, 500) = 500 (limitada pelo consumo)
      // custoBFioMensalRS = 500 × (1,1827×0,35) × 0,6 = 124,1835
      // totalFixoMensalRS = 35,481 + 18 + 124,1835 = 177,6645
      // energiaNaoCompensadaKWh = max(0, 500-500) = 0
      // contaAntesRS = 500×1,1827 + 18 = 609,35
      // contaAposRS = max(177,6645; 53,481) + 0 = 177,6645
      // economiaMensalRS = 609,35 - 177,6645 = 431,6855
      expect(Number.isFinite(r.economiaMensalRS)).toBe(true);
      expect(r.taxaDisponibilidadeRS).toBeCloseTo(35.481, 3);
      expect(r.custoBFioMensalRS).toBeCloseTo(124.1835, 3);
      expect(r.contaAposRS).toBeCloseTo(177.6645, 3);
      expect(r.economiaMensalRS).toBeCloseTo(431.6855, 3);
      // Uma geração 2000x maior que o consumo não pode gerar mais economia do que
      // 100% do consumo compensado permite — trava de sanidade contra o "silent
      // wrong" que o guard existe para prevenir.
      expect(r.economiaMensalRS).toBeLessThanOrEqual(r.contaAntesRS);
    });
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
    // da implementação. ATUALIZADO (set/2026) para a fórmula correta de
    // contaAposRS — kWhFaturado = max(energiaNaoCompensadaKWh, kwhMinimo), não
    // taxaDisponibilidadeRS somada por cima do custo da energia não compensada
    // (ver comentário do BUG CORRIGIDO em calcularCustos.ts) — só o ano de 2027
    // muda, porque só nele há energia não compensada > 0:
    // 2026 (ano base, sem reajuste/degradação): geração=1000, compensada=1000,
    //   custoFioB=1000×(1,00×0,5)×0,5=250, taxaDisp=30, totalFixo=280,
    //   naoCompensada=0 → kWhFaturado=max(0,30)=30 (mesmo que antes)
    //   contaAntes=1000, contaApos=30×1,00+0+250=280, economia=720
    // 2027 (tarifa×1,10, geração×0,90): tarifa=1,10, geração=900, compensada=900,
    //   custoFioB=900×(1,10×0,5)×0,8=396, taxaDisp=33,
    //   naoCompensada=1000-900=100 → kWhFaturado=max(100,30)=100 (a energia não
    //   compensada já supera o mínimo — sem "piso" extra por cima)
    //   contaAntes=1100, contaApos=100×1,10+0+396=506, economia=1100-506=594
    expect(resultado).toHaveLength(2);
    expect(resultado[0].ano).toBe(2026);
    expect(resultado[0].custos.custoBFioMensalRS).toBeCloseTo(250, 4);
    expect(resultado[0].custos.economiaMensalRS).toBeCloseTo(720, 4);
    expect(resultado[1].ano).toBe(2027);
    expect(resultado[1].custos.taxaDisponibilidadeRS).toBeCloseTo(33, 4);
    expect(resultado[1].custos.custoBFioMensalRS).toBeCloseTo(396, 2);
    expect(resultado[1].custos.contaAntesRS).toBeCloseTo(1100, 4);
    expect(resultado[1].custos.contaAposRS).toBeCloseTo(506, 2);
    expect(resultado[1].custos.economiaMensalRS).toBeCloseTo(594, 2);
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
