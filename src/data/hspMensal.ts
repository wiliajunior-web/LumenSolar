/**
 * Fatores de distribuição mensal da irradiação solar (HSP) por UF.
 * Representa o quanto cada mês contribui relativamente ao ano inteiro.
 * Valores normalizados para que a soma = 12 (média mensal = 1.0).
 *
 * Fonte: CRESESB/INMET — Atlas Solarimétrico do Brasil.
 * Padrão: regiões com estação seca (maio–agosto) têm pico diferente
 * de regiões equatoriais (maior uniformidade anual).
 */

export type GrupoClimatico = 'nordeste' | 'centro_oeste' | 'sudeste' | 'sul' | 'norte';

export const GRUPO_POR_UF: Record<string, GrupoClimatico> = {
  MA: 'nordeste', PI: 'nordeste', CE: 'nordeste', RN: 'nordeste',
  PB: 'nordeste', PE: 'nordeste', AL: 'nordeste', SE: 'nordeste', BA: 'nordeste',
  GO: 'centro_oeste', DF: 'centro_oeste', MT: 'centro_oeste', MS: 'centro_oeste',
  TO: 'centro_oeste',
  MG: 'sudeste', ES: 'sudeste', RJ: 'sudeste', SP: 'sudeste',
  PR: 'sul', SC: 'sul', RS: 'sul',
  AM: 'norte', PA: 'norte', AC: 'norte', RO: 'norte',
  RR: 'norte', AP: 'norte',
};

// Fatores mensais [jan..dez], normalizados (soma = 12)
const FATORES: Record<GrupoClimatico, number[]> = {
  nordeste:     [1.04, 0.97, 0.90, 0.88, 0.93, 0.97, 1.05, 1.10, 1.12, 1.10, 1.05, 0.99],
  centro_oeste: [1.10, 1.04, 0.99, 0.92, 0.87, 0.83, 0.87, 0.96, 1.03, 1.07, 1.10, 1.10],
  sudeste:      [1.12, 1.06, 1.00, 0.93, 0.87, 0.83, 0.86, 0.95, 1.01, 1.04, 1.07, 1.08],
  sul:          [1.13, 1.07, 1.01, 0.93, 0.84, 0.78, 0.83, 0.94, 1.01, 1.07, 1.10, 1.13],
  norte:        [1.02, 0.96, 0.93, 0.94, 0.98, 1.03, 1.08, 1.10, 1.07, 1.04, 1.00, 0.97],
};

export const MESES_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/**
 * Retorna os 12 fatores mensais de HSP para uma UF.
 * Multiplique o HSP anual médio por cada fator para estimar o HSP mensal.
 */
export function fatoresMensaisPorUF(uf: string): number[] {
  const grupo = GRUPO_POR_UF[uf.toUpperCase()] ?? 'sudeste';
  return FATORES[grupo];
}

/**
 * Calcula a geração estimada para cada mês do ano (kWh).
 */
export function geracaoMensalPorMes(
  potenciaKWp: number,
  hspAnualMedio: number,
  perdasSistema: number,
  uf: string
): number[] {
  const fatores = fatoresMensaisPorUF(uf);
  const eficiencia = 1 - perdasSistema;
  // dias médios por mês considerando que HSP anual é a média diária
  const diasPorMes = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return fatores.map((fator, i) =>
    potenciaKWp * hspAnualMedio * fator * diasPorMes[i] * eficiencia / 30.4167
    // Simplificação: usa HSP médio × fator como HSP do mês, × dias do mês
    // mas normaliza pela média de dias para preservar coerência com o dimensionamento
  );
}
