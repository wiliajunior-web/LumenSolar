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
// Fatores normalizados para soma exata = 12 (validado em testes).
// Fator mensal × HSP anual médio = HSP estimado do mês.
const FATORES: Record<GrupoClimatico, number[]> = {
  nordeste:     [1.0314, 0.9620, 0.8926, 0.8727, 0.9223, 0.9620, 1.0413, 1.0909, 1.1107, 1.0909, 1.0413, 0.9819],
  centro_oeste: [1.1111, 1.0505, 1.0000, 0.9293, 0.8788, 0.8384, 0.8788, 0.9697, 1.0404, 1.0808, 1.1111, 1.1111],
  sudeste:      [1.1371, 1.0761, 1.0152, 0.9442, 0.8832, 0.8426, 0.8731, 0.9645, 1.0254, 1.0558, 1.0863, 1.0965],
  sul:          [1.1453, 1.0845, 1.0236, 0.9426, 0.8514, 0.7905, 0.8412, 0.9527, 1.0236, 1.0845, 1.1149, 1.1452],
  norte:        [1.0099, 0.9505, 0.9208, 0.9307, 0.9703, 1.0198, 1.0693, 1.0891, 1.0594, 1.0297, 0.9901, 0.9604],
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
  // Geração do mês = Potência (kWp) × HSP_diário_do_mês × dias_do_mês × eficiência
  // HSP_diário_do_mês = hspAnualMedio × fator (fator normalizado: soma=12, média=1.0)
  return fatores.map((fator, i) =>
    potenciaKWp * hspAnualMedio * fator * diasPorMes[i] * eficiencia
  );
}
