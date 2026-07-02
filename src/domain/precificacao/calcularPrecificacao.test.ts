import { describe, expect, it } from 'vitest';
import { calcularPrecificacao, somarCustos } from './calcularPrecificacao';
import { ComposicaoCustos } from './types';

const composicaoPadrao: ComposicaoCustos = {
  kit: {
    marcaModulo: 'Risen',
    modeloModulo: 'RSM144-7-550M',
    potenciaModuloWp: 550,
    quantidade: 7,
    tipoModulo: 'monocristalino',
    marcaInversor: 'Growatt',
    modeloInversor: 'MIN 3600TL-X',
    potenciaInversorKW: 3.6,
    custoKitRS: 8000,
  },
  estruturaRS: 800,
  materiaisEletricosRS: 600,
  maoDeObraRS: 1500,
  projetoArtRS: 500,
  outrosCustosRS: 0,
};

describe('somarCustos', () => {
  it('soma todos os itens corretamente', () => {
    const total = somarCustos(composicaoPadrao);
    expect(total).toBe(8000 + 800 + 600 + 1500 + 500);
  });
});

describe('calcularPrecificacao', () => {
  it('o preço de venda cobre custo + imposto + margem', () => {
    const r = calcularPrecificacao({
      composicao: composicaoPadrao,
      aliquotaImpostos: 0.06,
      margemDesejada: 0.15,
    });
    expect(r.precoVenda).toBeCloseTo(r.custoTotalDireto + r.impostoSobreVenda + r.lucroLiquido, 2);
  });

  it('imposto e margem incidem sobre o preço de venda, não sobre o custo', () => {
    const r = calcularPrecificacao({
      composicao: composicaoPadrao,
      aliquotaImpostos: 0.06,
      margemDesejada: 0.15,
    });
    expect(r.impostoSobreVenda).toBeCloseTo(r.precoVenda * 0.06, 4);
    expect(r.lucroLiquido).toBeCloseTo(r.precoVenda * 0.15, 4);
  });

  it('margem maior resulta em preço de venda maior', () => {
    const r10 = calcularPrecificacao({ composicao: composicaoPadrao, aliquotaImpostos: 0.06, margemDesejada: 0.10 });
    const r20 = calcularPrecificacao({ composicao: composicaoPadrao, aliquotaImpostos: 0.06, margemDesejada: 0.20 });
    expect(r20.precoVenda).toBeGreaterThan(r10.precoVenda);
  });

  it('lança erro quando soma de impostos + margem >= 1', () => {
    expect(() =>
      calcularPrecificacao({ composicao: composicaoPadrao, aliquotaImpostos: 0.5, margemDesejada: 0.5 })
    ).toThrow();
  });

  it('markup é maior que a margem (efeito da base de cálculo diferente)', () => {
    const r = calcularPrecificacao({
      composicao: composicaoPadrao,
      aliquotaImpostos: 0.06,
      margemDesejada: 0.15,
    });
    expect(r.markupPercentual).toBeGreaterThan(r.margemPercentual);
  });
});
