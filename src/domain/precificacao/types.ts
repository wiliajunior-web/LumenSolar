/**
 * Composição completa de custos para precificação de um sistema fotovoltaico.
 *
 * Filosofia: o preço de venda deve cobrir todos os custos, os impostos
 * (que incidem sobre a receita bruta, no caso do Simples Nacional), e ainda
 * gerar a margem de lucro desejada.
 *
 * Fórmula usada:
 *   Preço de venda = Custo total / (1 - alíquota impostos - margem desejada)
 *
 * Isso garante que, após deduzir impostos e margem do preço de venda, o que
 * sobra é exatamente o custo total — ao contrário de simplesmente somar
 * percentuais por cima do custo, que subestima o imposto.
 */

/** Especificação do kit fotovoltaico conforme informado pelo fornecedor. */
export interface EspecificacaoKit {
  marcaModulo: string;
  modeloModulo: string;
  potenciaModuloWp: number;
  quantidade: number;
  tipoModulo: 'monocristalino' | 'policristalino' | 'bifacial';
  marcaInversor: string;
  modeloInversor: string;
  potenciaInversorKW: number;
  /** Preço de custo do kit completo (módulos + inversor) cobrado pelo fornecedor, em R$. */
  custoKitRS: number;
  // ── Specs técnicas do módulo (para cálculo de perdas) ──
  coeficienteTemperaturaPmax?: number; // %/°C, ex: -0.29
  noct?: number;                        // °C, ex: 45
  eficienciaInversorPercent?: number;   // %, ex: 98.4
  bifacial?: boolean;
  ganhoBifacialPercent?: number;   // % de ganho direto sobre geração, ex: 5
}

/** Itens de custo para composição do preço final. */
export interface ComposicaoCustos {
  kit: EspecificacaoKit;
  /** Estrutura de fixação (suporte para telhado), em R$. */
  estruturaRS: number;
  /** Cabos, conectores, string box, DPS, disjuntores, eletrodutos, etc., em R$. */
  materiaisEletricosRS: number;
  /** Mão de obra de instalação, em R$. */
  maoDeObraRS: number;
  /** Projeto elétrico + ART (engenheiro responsável), em R$. */
  projetoArtRS: number;
  /**
   * Outros custos: frete, estadias, etc. Pode deixar 0 se já estiver embutido
   * nos itens acima.
   */
  outrosCustosRS: number;
}

export interface ParametrosPrecificacao {
  composicao: ComposicaoCustos;
  /** Alíquota efetiva dos impostos sobre a receita bruta (fração 0–1). */
  aliquotaImpostos: number;
  /**
   * Margem de lucro desejada sobre o preço de venda (fração 0–1).
   * Atenção: margem sobre o PREÇO DE VENDA, não sobre o custo (markup).
   * Ex.: 0,15 = 15% do preço de venda é lucro antes do IR pessoa física.
   */
  margemDesejada: number;
}

export interface ResultadoPrecificacao {
  custoKit: number;
  custoEstrutura: number;
  custoMateriais: number;
  custoMaoDeObra: number;
  custoProjetoArt: number;
  custoOutros: number;
  custoTotalDireto: number;
  impostoSobreVenda: number;
  lucroLiquido: number;
  precoVenda: number;
  markupPercentual: number;
  margemPercentual: number;
}
