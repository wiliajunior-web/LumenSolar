/**
 * MOSAICO DE SATÉLITE — busca tiles de imagem de satélite pública (Esri
 * World Imagery, https://server.arcgisonline.com — gratuito, sem chave de
 * API, mesmo padrão de uso livre já adotado neste projeto para o Nominatim/
 * OpenStreetMap em BuscadorCoordenadas) e monta um mosaico único via canvas.
 *
 * NÃO TEM TESTE AUTOMATIZADO (vitest/jsdom não tem canvas real nem faz
 * requisição de rede de verdade) — e o sandbox onde este código foi escrito
 * bloqueia egress para arcgisonline.com (só permite os domínios da allowlist
 * do ambiente), então a busca real de tiles não pôde ser executada ali. A
 * matemática de qual tile buscar (@domain/plantaSituacao/tileMercator) É
 * testada e verificada manualmente — é a parte que pode dar errado de forma
 * sutil. A parte de rede/canvas aqui é testada no app real, no computador do
 * usuário (que tem internet normal), na primeira vez que gerar uma Planta de
 * Situação — se falhar, o erro aparece no alert() de gerarPlantaSituacao() em
 * App.tsx com uma mensagem explicando a causa mais provável (rede).
 */
import { latLonParaTile, latLonParaPixelNoMosaico } from '@domain/plantaSituacao/tileMercator';

export interface ResultadoMosaicoSatelite {
  /** PNG como data URI — pronto para <Image src=...> no react-pdf */
  dataUri: string;
  larguraPx: number;
  alturaPx: number;
  /** Posição do marcador (endereço buscado) dentro do mosaico, em pixels */
  marcadorPx: { px: number; py: number };
  latitude: number;
  longitude: number;
  zoom: number;
  enderecoEncontrado: string;
}

const TILE_SIZE = 256;
const LADO_EM_TILES = 3; // mosaico 3x3 — ~750-800m de lado em zoom 18, suficiente para a Planta de Situação
const ZOOM = 18;
const ESRI_TILE_URL = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

async function geocodificarEndereco(endereco: string): Promise<{ lat: number; lon: number; enderecoEncontrado: string }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1&countrycodes=br`;
  const r = await fetch(url, { headers: { 'User-Agent': 'LumenSolar/2.0 (wilianjunior@lumen.eng.br)' } });
  const data = await r.json();
  if (!data.length) {
    throw new Error(`Endereço "${endereco}" não encontrado no OpenStreetMap — ajuste o endereço do cliente e tente novamente.`);
  }
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), enderecoEncontrado: data[0].display_name };
}

async function carregarImagemTile(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar tile de satélite: ${url}`));
    img.src = url;
  });
}

/**
 * Geocodifica o endereço (Nominatim, gratuito) e monta um mosaico de tiles
 * de satélite (Esri World Imagery, gratuito) centrado nele, com um marcador
 * desenhado nas coordenadas exatas.
 */
export async function montarMosaicoSatelite(endereco: string): Promise<ResultadoMosaicoSatelite> {
  const { lat, lon, enderecoEncontrado } = await geocodificarEndereco(endereco);
  const tileCentral = latLonParaTile(lat, lon, ZOOM);
  const offset = Math.floor(LADO_EM_TILES / 2);

  const canvas = document.createElement('canvas');
  canvas.width = LADO_EM_TILES * TILE_SIZE;
  canvas.height = LADO_EM_TILES * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não disponível neste ambiente.');

  const tarefas: Promise<void>[] = [];
  for (let dy = 0; dy < LADO_EM_TILES; dy++) {
    for (let dx = 0; dx < LADO_EM_TILES; dx++) {
      const tx = tileCentral.x - offset + dx;
      const ty = tileCentral.y - offset + dy;
      const url = ESRI_TILE_URL(ZOOM, ty, tx);
      tarefas.push(
        carregarImagemTile(url).then((img) => {
          ctx.drawImage(img, dx * TILE_SIZE, dy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        })
      );
    }
  }
  await Promise.all(tarefas);

  const marcadorPx = latLonParaPixelNoMosaico(lat, lon, ZOOM, tileCentral, LADO_EM_TILES, TILE_SIZE);

  // Marcador (pin) desenhado diretamente no canvas — mais simples e confiável
  // que sobrepor um <View> no react-pdf em cima de uma <Image>.
  ctx.strokeStyle = '#ff3b30';
  ctx.fillStyle = '#ff3b30cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(marcadorPx.px, marcadorPx.py, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marcadorPx.px - 14, marcadorPx.py);
  ctx.lineTo(marcadorPx.px + 14, marcadorPx.py);
  ctx.moveTo(marcadorPx.px, marcadorPx.py - 14);
  ctx.lineTo(marcadorPx.px, marcadorPx.py + 14);
  ctx.stroke();

  return {
    dataUri: canvas.toDataURL('image/png'),
    larguraPx: canvas.width,
    alturaPx: canvas.height,
    marcadorPx,
    latitude: lat,
    longitude: lon,
    zoom: ZOOM,
    enderecoEncontrado,
  };
}
