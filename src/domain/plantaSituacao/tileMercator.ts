/**
 * MATEMÁTICA DE TILES WEB MERCATOR (EPSG:3857) — "slippy map" padrão
 * usado por OpenStreetMap, Esri, Google Maps, Mapbox, etc.
 * Referência: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 *
 * Usado pela Planta de Situação para descobrir quais tiles de satélite
 * buscar ao redor de um ponto (lat/lon) e onde desenhar o marcador dentro
 * do mosaico final. Pura matemática — sem rede, sem DOM — por isso separada
 * do serviço que efetivamente busca as imagens (@renderer/services/satelliteMosaic),
 * que depende de fetch()+canvas e não roda em teste automatizado (vitest/jsdom
 * não tem canvas real) — ver o comentário nesse arquivo.
 */

export interface TileXY {
  x: number;
  y: number;
}

/** Converte lat/lon (graus) para o tile (x,y) que o contém, num dado zoom. */
export function latLonParaTile(lat: number, lon: number, zoom: number): TileXY {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) };
}

/** Canto noroeste (lat/lon) de um tile — usado para posicionar o marcador dentro do mosaico. */
export function tileParaLatLonNoroeste(x: number, y: number, zoom: number): { lat: number; lon: number } {
  const n = 2 ** zoom;
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

/**
 * Posição em pixels (dentro de um mosaico de `ladoEmTiles × ladoEmTiles`
 * tiles de `tileSizePx` cada, centrado no tile de `lat`/`lon`) de um ponto
 * lat/lon qualquer — usado para desenhar o marcador exatamente sobre as
 * coordenadas do cliente, não só no centro do tile.
 */
export function latLonParaPixelNoMosaico(
  lat: number, lon: number, zoom: number,
  tileCentral: TileXY, ladoEmTiles: number, tileSizePx: number
): { px: number; py: number } {
  const n = 2 ** zoom;
  const xFracional = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFracional = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const offset = Math.floor(ladoEmTiles / 2);
  const tileOrigemX = tileCentral.x - offset;
  const tileOrigemY = tileCentral.y - offset;

  return {
    px: (xFracional - tileOrigemX) * tileSizePx,
    py: (yFracional - tileOrigemY) * tileSizePx,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
