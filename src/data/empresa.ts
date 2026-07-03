export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  crea: string;
  responsavelTecnico: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  validadeProposta: number;
  logoBase64?: string;

  // ── Valores-base de precificação (editáveis por proposta) ──────────────
  /** Custo da estrutura de fixação por kWp instalado (R$/kWp). */
  valorEstruturaPorKWp: number;
  /** Custo dos materiais elétricos por kWp instalado (R$/kWp). */
  valorMateriaisPorKWp: number;
  /** Custo de mão de obra por módulo instalado (R$/módulo). */
  valorMaoDeObraPorModulo: number;
  /**
   * Custo do projeto de engenharia + ART CREA (valor fixo por proposta).
   * Referência CREA-MG 2025: ART ~R$130 para obras de R$10k–30k.
   * Projeto elétrico típico: R$400. Total sugerido: R$530 → R$500 arredondado.
   */
  valorProjetoArt: number;
  /** Alíquota efetiva do Simples Nacional (fração). */
  aliquotaImpostos: number;
  /** Margem de lucro sobre o preço de venda (fração). */
  margemPadrao: number;
  /** Reajuste tarifário médio esperado (%/ano). */
  reajusteTarifarioAnual: number;
  /** Taxa mínima de atratividade para cálculo de VPL/payback descontado (%/ano). */
  taxaMinimaAtratividadeAnual: number;
  /** Taxa mensal Solfácil 48 meses (fração). Varia por perfil de crédito do cliente. */
  taxaSolfacil48Mensal: number;
  /** Taxa mensal Solfácil 60 meses (fração). */
  taxaSolfacil60Mensal: number;
  /** Taxa mensal cartão de crédito/outro (fração). */
  taxaOutroFinanciamento: number;
  /** Descrição do 3º financiamento (ex: "Cartão 18×", "Banco 72×"). */
  descricaoOutroFinanciamento: string;
  /** Número de parcelas do 3º financiamento. */
  parcelasOutroFinanciamento: number;
  /**
   * Fração da tarifa total que representa o Fio B (TUSD de distribuição).
   * CEMIG: ~32% | Distribuidoras menores: ~36–40%.
   * Valor padrão: 35% (média nacional).
   */
  fracaoTarifaFioB: number;
}

export const DADOS_EMPRESA_PADRAO: DadosEmpresa = {
  razaoSocial: 'LUMEN SOLUÇÕES LTDA',
  nomeFantasia: 'Lumen Solar',
  cnpj: '',
  crea: '',
  responsavelTecnico: '',
  cidade: 'Araguari',
  uf: 'MG',
  telefone: '',
  email: '',
  site: '',
  validadeProposta: 15,
  logoBase64: undefined,
  // Valores-base
  valorEstruturaPorKWp: 150,
  valorMateriaisPorKWp: 120,
  valorMaoDeObraPorModulo: 280,
  valorProjetoArt: 500,
  aliquotaImpostos: 0.06,
  margemPadrao: 0.15,
  reajusteTarifarioAnual: 0.06,
  taxaMinimaAtratividadeAnual: 0.08,
  taxaSolfacil48Mensal: 0.0199,
  taxaSolfacil60Mensal: 0.0199,
  taxaOutroFinanciamento: 0.0299,
  descricaoOutroFinanciamento: 'Cartão 18×',
  parcelasOutroFinanciamento: 18,
  fracaoTarifaFioB: 0.35,
};
