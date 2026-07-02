/**
 * Domínio: Lei 14.300/2022 — Marco Legal da Geração Distribuída (GD)
 *
 * Regras de faturamento da componente "Fio B" (TUSD - remuneração dos ativos
 * de distribuição, depreciação e O&M) sobre a energia compensada.
 *
 * Referência: Lei nº 14.300, de 6 de janeiro de 2022, arts. 17, 26 e 27.
 */

export type FonteGeracao = 'fotovoltaica' | 'eolica' | 'biomassa' | 'biogas' | 'hidrica' | 'outra';

export type ModalidadeGD =
  | 'autoconsumo_local'
  | 'autoconsumo_remoto'
  | 'geracao_compartilhada'
  | 'multiplas_unidades';

export interface ParametrosEnquadramentoGD {
  /** Data em que a solicitação de acesso foi protocolada na distribuidora (ISO 8601). */
  dataProtocoloAcesso: string;
  /** Potência instalada em corrente alternada (kW). */
  potenciaInstaladaKW: number;
  /** Fonte de geração. */
  fonte: FonteGeracao;
  /** Modalidade de geração distribuída. */
  modalidade: ModalidadeGD;
  /**
   * Para autoconsumo remoto ou geração compartilhada com minigeração não
   * despachável > 500 kW: percentual de participação do maior titular no
   * excedente de energia (0-100). Relevante para a regra do art. 27 §1º.
   */
  participacaoMaiorTitularPercent?: number;
}

/** Data de publicação da Lei 14.300/2022. */
export const DATA_PUBLICACAO_LEI_14300 = '2022-01-07'; // publicada em 07/01/2022 (DOU)

/**
 * Limite, em kW, que classifica uma fonte como "despachável" para fins do
 * art. 1º, IX (apenas fotovoltaica com baterias é considerada despachável,
 * e mesmo assim limitada a 3 MW). Para simplificação prática do programa,
 * tratamos fotovoltaica sem sistema de armazenamento relevante como NÃO
 * despachável — que é o caso da grande maioria dos projetos residenciais e
 * comerciais dimensionados aqui.
 */
export const LIMITE_MICROGERACAO_KW = 75;
export const LIMITE_MINIGERACAO_KW = 5000;
export const LIMITE_MINIGERACAO_NAO_DESPACHAVEL_KW = 3000;
export const LIMITE_PARTICIPACAO_REGRA_ESPECIAL_PERCENT = 25;
export const LIMITE_POTENCIA_REGRA_ESPECIAL_KW = 500;

/**
 * Escalonamento do art. 27 — percentual das componentes tarifárias de Fio B
 * (remuneração dos ativos, quota de reintegração regulatória e O&M da
 * distribuição) que incide sobre a energia compensada, por ano civil, para
 * quem protocolou acesso fora da regra de transição do art. 26.
 */
export const ESCALONAMENTO_FIO_B_ART27: ReadonlyArray<{ ano: number; percentual: number }> = [
  { ano: 2023, percentual: 0.15 },
  { ano: 2024, percentual: 0.30 },
  { ano: 2025, percentual: 0.45 },
  { ano: 2026, percentual: 0.60 },
  { ano: 2027, percentual: 0.75 },
  { ano: 2028, percentual: 0.90 },
  // a partir de 2029: regra plena do art. 17 (100% das componentes não
  // associadas ao custo de energia, conforme regulação da Aneel)
];

export const PRAZO_TRANSICAO_ART26_FIM = '2045-12-31';
