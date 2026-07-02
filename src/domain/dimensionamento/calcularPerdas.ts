/**
 * Decomposição e cálculo das perdas do sistema fotovoltaico a partir das
 * especificações técnicas do kit (módulo + inversor).
 *
 * Referência: IEC 61724-1:2021, ABSOLAR Infomercado, INMET dados climáticos.
 *
 * NOTA SOBRE GANHO BIFACIAL:
 *   O valor declarado pelo fabricante no datasheet como "fator de bifacialidade"
 *   ou "ganho bifacial" (ex: "5~85%") representa diretamente a faixa de ganho
 *   percentual sobre a geração do sistema — NÃO deve ser multiplicado por albedo.
 *   O albedo já está implícito na metodologia de ensaio do fabricante.
 *   Usar o limite INFERIOR (conservador) como padrão: 5%.
 *   Referência: IEC TS 60904-1-2:2019.
 */

export interface EspecificacoesModulo {
  /** Coeficiente de temperatura da potência máxima (%/°C, valor negativo). Ex.: -0.29 */
  coeficienteTemperaturaPmax: number;
  /** Temperatura nominal da célula (NOCT), em °C. Ex.: 45 */
  noct: number;
  /** Tolerância negativa de potência declarada (%). Ex.: 0 para "0~+5W". */
  toleranciaPercent: number;
  /** É bifacial? */
  bifacial: boolean;
  /**
   * Ganho bifacial conforme declarado pelo fabricante (%).
   * Usar o limite inferior (conservador). Ex.: para "5~85%", use 5.
   * Este valor já representa o ganho DIRETO sobre a geração.
   * Padrão conservador: 5%.
   */
  ganhoBifacialPercent?: number;
}

export interface EspecificacoesInversor {
  /** Eficiência máxima do inversor (%). Ex.: 98.4 */
  eficienciaMaximaPercent: number;
}

export interface CondicoesSite {
  /**
   * Temperatura ambiente média anual no local de instalação (°C).
   * Referência INMET: interior MG/GO ~23-25°C; litoral ~26-28°C; Nordeste ~27-29°C.
   */
  temperaturaAmbienteMediaC: number;
  /**
   * Estimativa de perda por sombreamento (%).
   * 0-2%: sem sombra relevante. 3-5%: leve (galhos, antenas distantes).
   * >10%: significativo — rever layout antes de prosseguir.
   */
  perdaSombreamentoPercent: number;
  /**
   * Estimativa de perda por sujidade / poeira (%).
   * Regiões secas ou estradas de terra: 3-5%.
   * Regiões com >1200mm chuva/ano: 1-2%.
   */
  perdaSujidadePercent: number;
}

export interface ResultadoPerdas {
  perdaInversor: number;
  perdaTemperatura: number;
  perdaSombreamento: number;
  perdaSujidade: number;
  perdaCabeamento: number;
  perdaToleranciaFabricacao: number;
  ganhoBifacial: number;
  perdaTotalLiquida: number;
  detalhamento: string[];
}

const PERDA_CABEAMENTO_PADRAO = 0.02;

/**
 * Calcula a fração de perdas do sistema.
 * A temperatura de operação da célula em condição típica anual é estimada como:
 *   Tcélula ≈ Tamb + (NOCT - 20) × (800/1000)
 * sendo 800 W/m² a irradiância média anual representativa (< 1000 W/m² de STC).
 */
export function calcularPerdas(
  modulo: EspecificacoesModulo,
  inversor: EspecificacoesInversor,
  site: CondicoesSite
): ResultadoPerdas {
  const perdaInversor = 1 - inversor.eficienciaMaximaPercent / 100;

  // Temperatura de operação típica anual
  const tempCelula = site.temperaturaAmbienteMediaC + (modulo.noct - 20) * 0.8;
  const deltaTemp = tempCelula - 25; // diferença em relação ao STC
  const perdaTemperatura = Math.max(0, (Math.abs(modulo.coeficienteTemperaturaPmax) / 100) * deltaTemp);

  const perdaSombreamento = site.perdaSombreamentoPercent / 100;
  const perdaSujidade = site.perdaSujidadePercent / 100;
  const perdaCabeamento = PERDA_CABEAMENTO_PADRAO;
  const perdaToleranciaFabricacao = Math.max(0, -modulo.toleranciaPercent / 100);

  // CORRIGIDO: ganho bifacial é direto (% sobre geração), não multiplicado por albedo
  const ganhoBifacial = modulo.bifacial
    ? (modulo.ganhoBifacialPercent ?? 5) / 100
    : 0;

  // Composição encadeada de perdas com ganho bifacial
  const fatorEficiencia =
    (1 - perdaInversor) *
    (1 - perdaTemperatura) *
    (1 - perdaSombreamento) *
    (1 - perdaSujidade) *
    (1 - perdaCabeamento) *
    (1 - perdaToleranciaFabricacao) *
    (1 + ganhoBifacial);

  const perdaTotalLiquida = Math.max(0, 1 - fatorEficiencia);

  const detalhamento = [
    `Inversor (η=${inversor.eficienciaMaximaPercent}%): -${(perdaInversor * 100).toFixed(1)}%`,
    `Temperatura (Tamb ${site.temperaturaAmbienteMediaC}°C → Tcél ${tempCelula.toFixed(0)}°C): -${(perdaTemperatura * 100).toFixed(1)}%`,
    `Sombreamento estimado: -${(perdaSombreamento * 100).toFixed(1)}%`,
    `Sujidade/poeira estimada: -${(perdaSujidade * 100).toFixed(1)}%`,
    `Cabeamento e conexões: -${(perdaCabeamento * 100).toFixed(1)}%`,
    ...(modulo.bifacial ? [`Ganho bifacial (${(modulo.ganhoBifacialPercent ?? 5).toFixed(0)}%, conservador): +${(ganhoBifacial * 100).toFixed(1)}%`] : []),
    `Perda total líquida do sistema: ${(perdaTotalLiquida * 100).toFixed(1)}%`,
  ];

  return {
    perdaInversor, perdaTemperatura, perdaSombreamento,
    perdaSujidade, perdaCabeamento, perdaToleranciaFabricacao,
    ganhoBifacial, perdaTotalLiquida, detalhamento,
  };
}

export const CONDICOES_SITE_PADRAO_MG: CondicoesSite = {
  temperaturaAmbienteMediaC: 24,
  perdaSombreamentoPercent: 2,
  perdaSujidadePercent: 2,
};

export const MODULO_PADRAO_MONOCRISTALINO: EspecificacoesModulo = {
  coeficienteTemperaturaPmax: -0.34,
  noct: 45,
  toleranciaPercent: 0,
  bifacial: false,
};
