/**
 * Horas de Sol Pleno (HSP) médias diárias por UF — valores de referência
 * (médias anuais aproximadas, base Atlas Brasileiro de Energia Solar /
 * CRESESB). Use como valor padrão; o ideal é refinar com dado de
 * irradiação da cidade específica (PVGIS / NASA POWER) quando disponível.
 *
 * Unidade: kWh/m²/dia (equivalente a horas de sol pleno).
 */
export const HSP_MEDIO_POR_UF: Record<string, number> = {
  AC: 4.6,
  AL: 5.4,
  AP: 4.8,
  AM: 4.4,
  BA: 5.6,
  CE: 5.7,
  DF: 5.4,
  ES: 5.0,
  GO: 5.5,
  MA: 5.3,
  MT: 5.3,
  MS: 5.2,
  MG: 5.4,
  PA: 4.8,
  PB: 5.6,
  PR: 4.8,
  PE: 5.6,
  PI: 5.6,
  RJ: 4.9,
  RN: 5.8,
  RS: 4.7,
  RO: 4.7,
  RR: 4.7,
  SC: 4.5,
  SP: 5.0,
  SE: 5.5,
  TO: 5.4,
};

export function hspPorUF(uf: string): number {
  const v = HSP_MEDIO_POR_UF[uf.toUpperCase()];
  if (v === undefined) {
    throw new Error(`UF desconhecida: ${uf}`);
  }
  return v;
}
