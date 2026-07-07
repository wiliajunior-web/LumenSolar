/**
 * Dados de localização da instalação fotovoltaica.
 * Necessários para o Memorial Descritivo (CEMIG / distribuidoras).
 */

export type TipoTelhado = 'colonial' | 'metalico' | 'laje' | 'fibrocimento' | 'outro';

export const TIPO_TELHADO_LABELS: Record<TipoTelhado, string> = {
  colonial:    'Colonial (cerâmica)',
  metalico:    'Metálico (zinco/aço)',
  laje:        'Laje de concreto',
  fibrocimento:'Fibrocimento (telha)',
  outro:       'Outro',
};

export const ORIENTACOES = [
  'Norte', 'Nordeste', 'Leste', 'Sudeste',
  'Sul', 'Sudoeste', 'Oeste', 'Noroeste',
];

export interface DadosLocalizacao {
  /** Tipo de cobertura do telhado. */
  tipoTelhado: TipoTelhado;
  /** Descrição quando tipo = 'outro'. */
  descTipoTelhado: string;
  /** Inclinação do telhado em graus. */
  inclinacaoGraus: number;
  /** Orientação principal dos módulos (Norte, Nordeste, etc.). */
  orientacaoPrincipal: string;
  /** Desvio azimutal em graus (positivo = Oeste, negativo = Leste). */
  desvioAzimuthalGraus: number;
  /** Coordenada UTM — Abscissa (E). Ex: "795209". */
  utmE: string;
  /** Coordenada UTM — Ordenada (N). Ex: "7933873". */
  utmN: string;
  /** Fuso UTM. Ex: 22. */
  utmFuso: number;
  /** Nome/código da Unidade Consumidora (número do cliente na distribuidora). */
  numeroUC: string;
  /** Número do medidor (se disponível). */
  numeroMedidor: string;
  /** Endereço da instalação (se diferente do cliente). */
  enderecoInstalacao: string;
}

export const LOCALIZACAO_PADRAO: DadosLocalizacao = {
  tipoTelhado: 'colonial',
  descTipoTelhado: '',
  inclinacaoGraus: 10,
  orientacaoPrincipal: 'Norte',
  desvioAzimuthalGraus: 0,
  utmE: '',
  utmN: '',
  utmFuso: 22,
  numeroUC: '',
  numeroMedidor: '',
  enderecoInstalacao: '',
};
