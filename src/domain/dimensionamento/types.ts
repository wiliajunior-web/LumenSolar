export interface ParametrosDimensionamento {
  /** Consumo médio mensal de energia (kWh), já considerando todas as UCs do projeto. */
  consumoMedioMensalKWh: number;
  /** Horas de Sol Pleno médias diárias no local (kWh/m²/dia). */
  hspLocal: number;
  /**
   * Percentual de perdas do sistema (sombreamento, temperatura, cabeamento,
   * sujidade, inversor, etc.), em fração de 0 a 1. Valor típico: 0.20 (20%).
   */
  perdasSistema: number;
  /** Potência nominal de cada módulo fotovoltaico, em Wp. */
  potenciaModuloWp: number;
  /**
   * Percentual do consumo que se deseja compensar (fração de 0 a 1).
   * Padrão recomendado: 1.0 (100%), mas pode ser menor por limitação de
   * área de telhado ou orçamento do cliente.
   */
  percentualCompensacaoDesejado?: number;
}

export interface ResultadoDimensionamento {
  /** Potência de pico necessária do sistema, em kWp. */
  potenciaSistemaKWp: number;
  /** Número de módulos fotovoltaicos necessários (arredondado para cima). */
  numeroModulos: number;
  /** Potência real instalada após arredondamento do número de módulos, em kWp. */
  potenciaInstaladaRealKWp: number;
  /** Geração mensal estimada, em kWh, considerando a potência real instalada. */
  geracaoMensalEstimadaKWh: number;
  /** Geração anual estimada, em kWh. */
  geracaoAnualEstimadaKWh: number;
  /** Percentual de compensação efetivamente alcançado com a potência real instalada. */
  percentualCompensacaoReal: number;
}
