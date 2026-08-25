import { describe, it, expect } from 'vitest';
import { latLonParaTile, tileParaLatLonNoroeste, latLonParaPixelNoMosaico } from './tileMercator';

// Valores de referência calculados de forma INDEPENDENTE em Python, com uma
// fórmula equivalente mas escrita de outro jeito (asinh em vez de
// log(tan+sec)), antes de escrever este teste:
//   def lonlat_to_tile(lat, lon, zoom):
//       n = 2 ** zoom
//       x = int((lon + 180.0) / 360.0 * n)
//       y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
//       return x, y
describe('latLonParaTile', () => {
  it('equador/meridiano de Greenwich (0,0) — caso trivial em todos os zooms', () => {
    expect(latLonParaTile(0, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(latLonParaTile(0, 0, 1)).toEqual({ x: 1, y: 1 });
    expect(latLonParaTile(0, 0, 2)).toEqual({ x: 2, y: 2 });
    expect(latLonParaTile(0, 0, 3)).toEqual({ x: 4, y: 4 });
  });

  it('Araguari/MG (-18.6461, -48.1869) — sede da Lumen Soluções', () => {
    expect(latLonParaTile(-18.6461, -48.1869, 10)).toEqual({ x: 374, y: 565 });
    expect(latLonParaTile(-18.6461, -48.1869, 15)).toEqual({ x: 11997, y: 18111 });
    expect(latLonParaTile(-18.6461, -48.1869, 17)).toEqual({ x: 47991, y: 72447 });
    expect(latLonParaTile(-18.6461, -48.1869, 18)).toEqual({ x: 95983, y: 144895 });
  });

  it('São Paulo (-23.5505, -46.6333)', () => {
    expect(latLonParaTile(-23.5505, -46.6333, 12)).toEqual({ x: 1517, y: 2323 });
    expect(latLonParaTile(-23.5505, -46.6333, 17)).toEqual({ x: 48557, y: 74362 });
  });

  it('nunca retorna tile fora de [0, 2^zoom - 1] mesmo em coordenadas extremas', () => {
    const { x, y } = latLonParaTile(89.9, 179.9, 5);
    expect(x).toBeLessThanOrEqual(2 ** 5 - 1);
    expect(y).toBeGreaterThanOrEqual(0);
  });
});

describe('tileParaLatLonNoroeste + latLonParaTile — ida e volta', () => {
  it('o canto noroeste do tile que contém um ponto está a no máximo 1 tile de distância dele', () => {
    const zoom = 17;
    const lat = -18.6461, lon = -48.1869;
    const tile = latLonParaTile(lat, lon, zoom);
    const canto = tileParaLatLonNoroeste(tile.x, tile.y, zoom);
    // O canto NO deve estar ao norte e a oeste do ponto (ou muito próximo, por arredondamento de tile)
    expect(canto.lat).toBeGreaterThanOrEqual(lat - 0.01);
    expect(canto.lon).toBeLessThanOrEqual(lon + 0.01);
  });
});

describe('latLonParaPixelNoMosaico', () => {
  it('o próprio ponto central do tile central cai dentro do tile central do mosaico (não em outro tile)', () => {
    const zoom = 17;
    const tileCentral = latLonParaTile(-18.6461, -48.1869, zoom);
    const cantoCentral = tileParaLatLonNoroeste(tileCentral.x, tileCentral.y, zoom);
    const ladoEmTiles = 3;
    const tileSizePx = 256;
    const { px, py } = latLonParaPixelNoMosaico(cantoCentral.lat, cantoCentral.lon, zoom, tileCentral, ladoEmTiles, tileSizePx);
    // Mosaico 3x3: o tile central ocupa de 1*256 a 2*256 em ambos os eixos.
    // O canto NO do tile central cai bem na borda superior-esquerda dessa faixa.
    expect(px).toBeGreaterThanOrEqual(tileSizePx - 1);
    expect(px).toBeLessThanOrEqual(tileSizePx + 1);
    expect(py).toBeGreaterThanOrEqual(tileSizePx - 1);
    expect(py).toBeLessThanOrEqual(tileSizePx + 1);
  });

  it('um ponto exatamente no centro geográfico do mosaico cai no centro em pixels', () => {
    const zoom = 17;
    const lat = -18.6461, lon = -48.1869;
    const tileCentral = latLonParaTile(lat, lon, zoom);
    const ladoEmTiles = 3;
    const tileSizePx = 256;
    const { px, py } = latLonParaPixelNoMosaico(lat, lon, zoom, tileCentral, ladoEmTiles, tileSizePx);
    const mosaicoPx = ladoEmTiles * tileSizePx; // 768
    // Deve estar dentro do tile central (faixa 256–512), não nas bordas do mosaico
    expect(px).toBeGreaterThan(tileSizePx);
    expect(px).toBeLessThan(2 * tileSizePx);
    expect(py).toBeGreaterThan(tileSizePx);
    expect(py).toBeLessThan(2 * tileSizePx);
    expect(px).toBeLessThan(mosaicoPx);
    expect(py).toBeLessThan(mosaicoPx);
  });
});
