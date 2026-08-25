/**
 * Verificação isolada da Planta de Situação SEM depender de rede — usa um
 * PNG mínimo gerado localmente como stand-in do mosaico de satélite (que na
 * vida real vem de @renderer/services/satelliteMosaic, bloqueado neste
 * sandbox por não ter egress para arcgisonline.com). Confirma que o layout
 * da página, a tabela de coordenadas e o alerta de divergência UTM
 * renderizam corretamente — a parte que este script NÃO cobre é o
 * fetch+stitch real de tiles, que só roda no computador do usuário.
 */
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { PlantaDeSituacao } from '../src/domain/proposta/PlantaDeSituacao';
import { writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

// PNG 4x4 verde-oliva sólido, montado na mão (sem depender do pacote `canvas`)
function pngSolido(w: number, h: number, r: number, g: number, b: number): string {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const rowStart = y * (1 + w * 3);
    raw[rowStart] = 0; // filtro "none"
    for (let x = 0; x < w; x++) {
      raw[rowStart + 1 + x * 3] = r;
      raw[rowStart + 1 + x * 3 + 1] = g;
      raw[rowStart + 1 + x * 3 + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcInput = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(crcInput) >>> 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  function crc32(buf: Buffer): number {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

const dadosExemplo = {
  empresa: { nomeFantasia: 'Lumen Solucoes', razaoSocial: 'Lumen Solucoes Ltda', cnpj: '00.000.000/0001-00' },
  cliente: { nome: 'Cliente Teste Visual', cidade: 'Araguari', uf: 'MG' },
  localizacao: { numeroUC: '1234567-8', utmE: 805000, utmN: 7933000, utmFuso: 22 },
};

const mosaico = {
  dataUri: pngSolido(8, 8, 90, 110, 70),
  larguraPx: 768, alturaPx: 768,
  marcadorPx: { px: 384, py: 384 },
  latitude: -18.6476, longitude: -48.1936,
  zoom: 18,
  enderecoEncontrado: 'Rua Exemplo, 123, Araguari, MG, Brasil',
};

async function main() {
  const outPath = process.argv[2] ?? '/tmp/planta-teste.pdf';
  const blob = await pdf(React.createElement(PlantaDeSituacao, { data: dadosExemplo, mosaico })).toBuffer();
  const chunks: Buffer[] = [];
  for await (const c of blob as any) chunks.push(c as Buffer);
  writeFileSync(outPath, Buffer.concat(chunks));
  console.log('PDF gerado:', outPath);
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
