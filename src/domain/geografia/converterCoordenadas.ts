/**
 * CONVERSÃO LAT/LON (WGS84) → UTM
 * Fórmula padrão de projeção UTM (Snyder, "Map Projections: A Working
 * Manual", USGS 1987) — a mesma usada por praticamente toda ferramenta GIS.
 *
 * EXTRAÍDO (ago/2026) de onde vivia duplicado em dois lugares:
 *   1. `latLonToUTM` privada dentro de App.tsx (usada por BuscadorCoordenadas
 *      — o botão "Buscar coordenadas UTM" no passo Local)
 *   2. uma SEGUNDA cópia colada dentro de `cpf_utm.test.ts` só para testar
 *      — ou seja, o teste nunca testava de verdade a função usada em
 *      produção; se a cópia de App.tsx tivesse um bug e a do teste não (ou
 *      vice-versa), o teste passaria sem detectar nada.
 * Agora há uma função só, importada nos dois lugares — e também pela Planta
 * de Situação, que precisa dela para conferir a UTM que o usuário digitou
 * contra a UTM do endereço geocodificado.
 */

export interface CoordenadaUTM {
  utmE: number;
  utmN: number;
  fuso: number;
  // Opcional: só quem tem lat/lon de origem (latLonParaUTM) sabe o hemisfério
  // com certeza. UTM digitada manualmente pelo usuário (sem lat/lon associado)
  // não carrega esse campo — quem consome decide como aproximar.
  hemisferio?: 'N' | 'S';
}

// BUG CORRIGIDO (ago/2026): a letra do hemisfério ("N23" vs "S23") era
// hardcoded como "S" em toda exibição de UTM no app (busca de coordenadas e
// Planta de Situação), presumindo Brasil = hemisfério sul sempre. Isso é
// verdade para a esmagadora maioria do território, mas não para Roraima
// inteiro e partes do norte do Amapá/Amazonas (lat >= 0) — nesses casos a
// convenção UTM usa "N" e NÃO soma a falsa origem de 10.000.000 em N (efeito
// já tratado corretamente no cálculo abaixo, só faltava refletir no rótulo).
// Convenção: lat=0 (equador) cai na faixa "N" (limite entre as letras MGRS M
// e N é o próprio equador).
// ADICIONADO (set/2026, auditoria "rode com valores absurdos"): lat/lon fora da
// faixa fisicamente válida não crashava nem virava NaN — a fórmula UTM aceita
// qualquer número e devolve um resultado numericamente "normal" só que sem
// nenhum sentido geográfico (ex.: lat=200 não é um lugar na Terra, mas o cálculo
// não reclama). Hoje os dois pontos de entrada (BuscadorCoordenadas em App.tsx e
// PlantaDeSituacao.tsx) alimentam a função com lat/lon vindos de geocodificação
// (Nominatim/mosaico de satélite), que já retornam valores válidos — mas a
// função é exportada e pública, e um valor absurdo aqui não gera erro nenhum
// para quem chama, só um UTM E/N silenciosamente errado plotado na Planta de
// Situação. Falha rápido em vez de propagar coordenada sem sentido.
export function latLonParaUTM(lat: number, lon: number): CoordenadaUTM {
  if (lat < -90 || lat > 90) throw new Error('Latitude inválida — deve estar entre -90 e 90.');
  if (lon < -180 || lon > 180) throw new Error('Longitude inválida — deve estar entre -180 e 180.');
  const a = 6378137.0, f = 1 / 298.257223563;
  const b = a * (1 - f), e2 = 1 - (b / a) ** 2;
  const k0 = 0.9996, E0 = 500000;
  const fuso = Math.floor((lon + 180) / 6) + 1;
  const lon0 = ((fuso - 1) * 6 - 180 + 3) * Math.PI / 180;
  const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2, C = (e2 / (1 - e2)) * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lam - lon0);
  const e4 = e2 ** 2, e6 = e2 ** 3;
  const M = a * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
    - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
    - (35 * e6 / 3072) * Math.sin(6 * phi)
  );
  const utmE = Math.round(k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * (e2 / (1 - e2))) * A ** 5 / 120) + E0);
  const utmNraw = Math.round(k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * (e2 / (1 - e2))) * A ** 6 / 720)));
  const utmN = utmNraw + (lat < 0 ? 10_000_000 : 0); // Hemisfério Sul: falsa origem
  const hemisferio: 'N' | 'S' = lat < 0 ? 'S' : 'N';

  return { utmE, utmN, fuso, hemisferio };
}

/**
 * Distância aproximada em metros entre duas coordenadas UTM — só faz sentido
 * comparar E/N quando ambas estão no MESMO fuso (senão os eixos não
 * significam a mesma coisa). Usado para o alerta de divergência na Planta
 * de Situação: UTM digitada pelo usuário vs. UTM do endereço geocodificado.
 */
export function distanciaUTM(a: CoordenadaUTM, b: CoordenadaUTM): number | null {
  if (a.fuso !== b.fuso) return null;
  return Math.sqrt((a.utmE - b.utmE) ** 2 + (a.utmN - b.utmN) ** 2);
}
