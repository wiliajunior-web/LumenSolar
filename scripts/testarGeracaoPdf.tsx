/**
 * Verificação de geração de PDF (DUB / Planta de Situação / etc.) fora do
 * Electron — os componentes @react-pdf/renderer são puro React + Node, não
 * dependem de Electron, então dá pra renderizar e conferir aqui mesmo, sem
 * precisar do Xvfb+Electron usado para o resto da UI.
 *
 * Uso: npx tsx scripts/testarGeracaoPdf.tsx <saida.pdf>
 */
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { DiagramaUnifilarBasico } from '../src/domain/proposta/DiagramaUnifilarBasico';
import { writeFileSync } from 'node:fs';

const dadosExemplo = {
  empresa: { nomeFantasia: 'Lumen Solucoes', razaoSocial: 'Lumen Solucoes Ltda', cnpj: '00.000.000/0001-00' },
  cliente: { nome: 'Cliente Teste Visual', cidade: 'Araguari', uf: 'MG' },
  localizacao: { numeroUC: '1234567-8' },
  kit: {
    potenciaInversorKW: 8.0, tensaoSaidaV: 220, fatorPotencia: '>0.99',
    corrMaxSaidaA: 27.2, temperaturaInstalacaoC: 40, comprimentoCaboCAm: 10,
    marcaInversor: 'Growatt', modeloInversor: 'MIN 8000TL-X2',
    tipoModulo: 'bifacial_ntype', iscA: 14, vocV: 49.5, numStrings: 2, modulosPorString: 10,
    quantidade: 20, potenciaModuloWp: 550,
  },
};

async function main() {
  const outPath = process.argv[2] ?? '/tmp/dub-teste.pdf';
  const blob = await pdf(React.createElement(DiagramaUnifilarBasico, { data: dadosExemplo })).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of blob as any) chunks.push(chunk as Buffer);
  writeFileSync(outPath, Buffer.concat(chunks));
  console.log('PDF gerado:', outPath);
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
