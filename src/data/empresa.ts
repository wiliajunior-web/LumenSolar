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
};
