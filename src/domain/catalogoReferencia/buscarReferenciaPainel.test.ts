import { describe, expect, it } from 'vitest';
import {
  buscarPaineisComparaveis,
  calcularFaixaPrecoReferencia,
  painelPrecoPorWp,
} from './buscarReferenciaPainel';
import { CATALOGO_PAINEIS_REFERENCIA, PainelReferencia } from '@data/catalogoReferenciaComponentes';

// Todos os valores esperados abaixo foram recalculados à mão a partir dos 8
// registros reais de src/data/catalogoReferenciaComponentes.ts (conferidos
// contra o CSV original enviado pelo usuário em 04/09/2026), não copiados de
// nenhuma saída anterior do próprio código.

describe('painelPrecoPorWp', () => {
  it('OSDA 620W/R$611,58 -> 611,58/620 = 0,986419 R$/Wp', () => {
    const item = CATALOGO_PAINEIS_REFERENCIA.find((p) => p.skuFornecedor === '573472')!;
    expect(painelPrecoPorWp(item)).toBeCloseTo(0.986419, 5);
  });

  it('MINASOL 555W/R$751,21 -> 751,21/555 = 1,353532 R$/Wp (o mais caro por Wp do catálogo)', () => {
    // 751,21 / 555 = 1,35 + 1,96/555 = 1,35 + 0,0035315... = 1,3535315315...
    const item = CATALOGO_PAINEIS_REFERENCIA.find((p) => p.skuFornecedor === '573468')!;
    expect(painelPrecoPorWp(item)).toBeCloseTo(1.353532, 4);
  });

  it('lança erro para potenciaWp <= 0', () => {
    expect(() => painelPrecoPorWp({ potenciaWp: 0, precoUnitarioRS: 500 })).toThrow(
      'Potência do painel de referência deve ser maior que zero.'
    );
    expect(() => painelPrecoPorWp({ potenciaWp: -600, precoUnitarioRS: 500 })).toThrow();
  });

  it('lança erro para preço negativo', () => {
    expect(() => painelPrecoPorWp({ potenciaWp: 600, precoUnitarioRS: -1 })).toThrow(
      'Preço do painel de referência não pode ser negativo.'
    );
  });
});

describe('buscarPaineisComparaveis', () => {
  it('margemWp=0 e potenciaWp=620: só os 3 registros de exatamente 620W, ordenados por R$/Wp crescente (OSDA < RONMA < JINKO)', () => {
    const r = buscarPaineisComparaveis(620, CATALOGO_PAINEIS_REFERENCIA, 0);
    expect(r.map((p) => p.marca)).toEqual(['OSDA', 'RONMA', 'JINKO']);
  });

  it('margem padrão (30Wp) a partir de 620W: inclui o LEAPTON de 600W (diff=20) mas não os 710W (diff=90) nem o MINASOL 555W (diff=65)', () => {
    const r = buscarPaineisComparaveis(620);
    const marcas = r.map((p) => p.marca).sort();
    expect(marcas).toEqual(['JINKO', 'LEAPTON', 'OSDA', 'RONMA']);
  });

  it('potenciaWp <= 0 devolve lista vazia sem lançar erro (estado normal da tela antes de preencher o campo)', () => {
    expect(buscarPaineisComparaveis(0)).toEqual([]);
    expect(buscarPaineisComparaveis(-100)).toEqual([]);
  });

  it('catálogo vazio devolve lista vazia', () => {
    expect(buscarPaineisComparaveis(620, [])).toEqual([]);
  });
});

describe('calcularFaixaPrecoReferencia', () => {
  it('margemWp=0, potenciaWp=620: quantidade=3, min=OSDA(0,986419), max=JINKO(1,161613), média=1,053124, fornecedor único "Solfácil"', () => {
    const r = calcularFaixaPrecoReferencia(620, CATALOGO_PAINEIS_REFERENCIA, 0)!;
    expect(r.quantidade).toBe(3);
    expect(r.precoPorWpMinimo).toBeCloseTo(0.986419, 5);
    expect(r.precoPorWpMaximo).toBeCloseTo(1.161613, 5);
    // média = (0,986419355 + 1,011338710 + 1,161612903) / 3 = 1,053123656
    expect(r.precoPorWpMedio).toBeCloseTo(1.053124, 5);
    expect(r.fornecedores).toEqual(['Solfácil']);
  });

  it('devolve null quando não há nenhum painel dentro da margem (não inventa faixa de amostra vazia)', () => {
    expect(calcularFaixaPrecoReferencia(50)).toBeNull(); // nenhum painel perto de 50Wp
    expect(calcularFaixaPrecoReferencia(620, [])).toBeNull();
  });

  it('potenciaWp <= 0 devolve null', () => {
    expect(calcularFaixaPrecoReferencia(0)).toBeNull();
  });
});
