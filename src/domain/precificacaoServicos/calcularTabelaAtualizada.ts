import {
  ItemTabelaReferencia,
  TABELA_REFERENCIA_PRECOS_BASE,
} from '../../data/tabelaReferenciaPrecosServicos';
import { corrigirValorPorIndice, FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026 } from './indiceCorrecao';

export interface ItemTabelaReferenciaAtualizada extends ItemTabelaReferencia {
  valorAtualizadoMinRS: number;
  valorAtualizadoMaxRS: number;
  /** Fator de correção efetivamente aplicado (para auditoria/rastreio). */
  fatorCorrecaoAplicado: number;
}

/**
 * Gera a tabela de referência com os valores corrigidos por IPCA acumulado.
 *
 * Os valores ORIGINAIS (`valorBaseMinRS`/`valorBaseMaxRS`) são preservados no
 * retorno — a correção nunca substitui o dado de origem, apenas o acrescenta.
 * Isso é intencional: quem for vender o serviço deve poder ver a referência
 * original e a atualizada lado a lado, não só o número final.
 */
export function gerarTabelaAtualizada(
  base: ItemTabelaReferencia[] = TABELA_REFERENCIA_PRECOS_BASE,
  fator: number = FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026,
): ItemTabelaReferenciaAtualizada[] {
  return base.map((item) => ({
    ...item,
    valorAtualizadoMinRS: corrigirValorPorIndice(item.valorBaseMinRS, fator),
    valorAtualizadoMaxRS: corrigirValorPorIndice(item.valorBaseMaxRS, fator),
    fatorCorrecaoAplicado: fator,
  }));
}
