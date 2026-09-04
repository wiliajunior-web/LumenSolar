import { CATALOGO_PAINEIS_REFERENCIA, PainelReferencia } from '@data/catalogoReferenciaComponentes';

/** Margem padrão (Wp) para considerar dois painéis "de potência semelhante". */
const MARGEM_WP_PADRAO = 30;

/**
 * Preço por Wp de um painel de referência — a métrica comparável entre
 * modelos/marcas diferentes (preço absoluto não é comparável entre um
 * painel de 555W e um de 710W).
 */
export function painelPrecoPorWp(item: Pick<PainelReferencia, 'potenciaWp' | 'precoUnitarioRS'>): number {
  if (item.potenciaWp <= 0) throw new Error('Potência do painel de referência deve ser maior que zero.');
  if (item.precoUnitarioRS < 0) throw new Error('Preço do painel de referência não pode ser negativo.');
  return item.precoUnitarioRS / item.potenciaWp;
}

/**
 * Painéis do catálogo com potência dentro de `margemWp` de `potenciaWp`,
 * ordenados do mais barato ao mais caro por Wp.
 *
 * `potenciaWp <= 0` devolve lista vazia (sem erro) — corresponde ao estado
 * normal da tela de Kit antes do instalador preencher a potência do módulo.
 */
export function buscarPaineisComparaveis(
  potenciaWp: number,
  catalogo: PainelReferencia[] = CATALOGO_PAINEIS_REFERENCIA,
  margemWp: number = MARGEM_WP_PADRAO
): PainelReferencia[] {
  if (potenciaWp <= 0) return [];
  return catalogo
    .filter((p) => Math.abs(p.potenciaWp - potenciaWp) <= margemWp)
    .slice()
    .sort((a, b) => painelPrecoPorWp(a) - painelPrecoPorWp(b));
}

export interface FaixaPrecoReferencia {
  quantidade: number;
  precoPorWpMinimo: number;
  precoPorWpMedio: number;
  precoPorWpMaximo: number;
  /** Fornecedores presentes na amostra (para deixar claro que hoje é só 1). */
  fornecedores: string[];
}

/**
 * Resume o catálogo em uma faixa de preço R$/Wp para painéis comparáveis a
 * `potenciaWp`. Devolve `null` quando não há nenhum painel dentro da margem
 * (nunca inventa faixa a partir de amostra vazia).
 */
export function calcularFaixaPrecoReferencia(
  potenciaWp: number,
  catalogo: PainelReferencia[] = CATALOGO_PAINEIS_REFERENCIA,
  margemWp: number = MARGEM_WP_PADRAO
): FaixaPrecoReferencia | null {
  const comparaveis = buscarPaineisComparaveis(potenciaWp, catalogo, margemWp);
  if (comparaveis.length === 0) return null;

  const precos = comparaveis.map(painelPrecoPorWp);
  const fornecedores = Array.from(new Set(comparaveis.map((p) => p.fornecedor)));

  return {
    quantidade: comparaveis.length,
    precoPorWpMinimo: Math.min(...precos),
    precoPorWpMedio: precos.reduce((a, b) => a + b, 0) / precos.length,
    precoPorWpMaximo: Math.max(...precos),
    fornecedores,
  };
}
