import { describe, it, expect } from 'vitest';
import { PlantaDeSituacao } from './PlantaDeSituacao';
import { extractPdfTextJoined } from './pdfTextTestHelper';
import type { ResultadoMosaicoSatelite } from '../../renderer/services/satelliteMosaic';

// PlantaDeSituacao.tsx não tinha NENHUMA cobertura de teste antes desta
// rodada. Bug (baixa prioridade, cosmético) descoberto por auditoria de
// subagente e confirmado lendo o arquivo inteiro (ago/2026).

const mosaicoBase: ResultadoMosaicoSatelite = {
  dataUri: 'data:image/png;base64,AAAA',
  latitude: -18.645,
  longitude: -48.207,
  zoom: 18,
  enderecoEncontrado: 'Rua das Flores, 100, Araguari, MG',
} as any;

function dataBase(overrides: any = {}) {
  return {
    empresa: { razaoSocial: 'Lumen Soluções Ltda' },
    cliente: { nome: 'Maria Oliveira', cidade: 'Araguari', uf: 'MG' },
    localizacao: {},
    ...overrides,
  };
}

describe('PlantaDeSituacao — formatação da UTM digitada pelo usuário', () => {
  // BUG CORRIGIDO (ago/2026): `localizacao.utmE`/`utmN` são STRING (campo de
  // texto livre em DadosLocalizacao). O código chamava
  // `.toLocaleString('pt-BR')` diretamente nessas strings — mas
  // String.prototype.toLocaleString() é, por especificação (ECMA-402
  // 21.1.3.28), equivalente a toString(): não formata nada, é um no-op. A
  // UTM geocodificada (numérica, calculada por latLonParaUTM) formatava
  // corretamente; só a UTM DIGITADA pelo usuário saía sem separador de
  // milhar — inconsistência visual entre as duas linhas da mesma tabela.

  it('UTM digitada como string de 6-7 dígitos ganha separador de milhar (formatação real, não no-op)', () => {
    const data = dataBase({ localizacao: { utmE: '674321', utmN: '7924567', utmFuso: 23 } });
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data, mosaico: mosaicoBase }));
    expect(texto).toContain('674.321');
    expect(texto).toContain('7.924.567');
    // Não deve aparecer a versão sem separador (prova de que não é mais no-op)
    expect(texto).not.toMatch(/E=674321\b/);
    expect(texto).not.toMatch(/N=7924567\b/);
  });

  it('UTM não preenchida não quebra e mostra "nao preenchida"', () => {
    const data = dataBase({ localizacao: {} });
    expect(() => PlantaDeSituacao({ data, mosaico: mosaicoBase })).not.toThrow();
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data, mosaico: mosaicoBase }));
    expect(texto).toContain('não preenchida');
  });

  it('UTM digitada com valor não-numérico (entrada inválida do usuário) não quebra — mostra o texto bruto', () => {
    const data = dataBase({ localizacao: { utmE: 'abc', utmN: '123', utmFuso: 23 } });
    expect(() => PlantaDeSituacao({ data, mosaico: mosaicoBase })).not.toThrow();
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data, mosaico: mosaicoBase }));
    expect(texto).toContain('E=abc');
  });
});

describe('PlantaDeSituacao — REGRESSÃO ago/2026: letra do hemisfério da UTM não é sempre "S"', () => {
  // BUG CORRIGIDO (ago/2026): as duas linhas de UTM da tabela (geocodificada e
  // digitada) mostravam sempre "Fuso <n>S", hardcoded — presumindo Brasil =
  // hemisfério sul sempre. Errado para Roraima inteiro e partes do norte do
  // Amapá/Amazonas (lat >= 0, hemisfério N). Documento enviado à distribuidora
  // (ND 5.30) — rótulo de fuso errado nesse documento é o pior caso.

  it('endereço geocodificado no hemisfério sul (a esmagadora maioria do Brasil): mostra "S"', () => {
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data: dataBase(), mosaico: mosaicoBase }));
    expect(texto).toContain('Fuso 22S');
  });

  it('endereço geocodificado no hemisfério norte (ex: Boa Vista/RR, lat > 0): mostra "N", não "S"', () => {
    const mosaicoNorte: ResultadoMosaicoSatelite = { ...mosaicoBase, latitude: 2.8, longitude: -60.7 } as any;
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data: dataBase(), mosaico: mosaicoNorte }));
    expect(texto).toContain('N —'); // "Fuso <n>N — E=..."
    expect(texto).not.toMatch(/Fuso \d+S/);
  });

  it('UTM digitada (aproximada pelo hemisfério do endereço geocodificado) também usa "N" no hemisfério norte', () => {
    const mosaicoNorte: ResultadoMosaicoSatelite = { ...mosaicoBase, latitude: 2.8, longitude: -60.7 } as any;
    const data = dataBase({ localizacao: { utmE: '674321', utmN: '312000', utmFuso: 20 } });
    const texto = extractPdfTextJoined(PlantaDeSituacao({ data, mosaico: mosaicoNorte }));
    expect(texto).toContain('Fuso 20N');
    expect(texto).not.toContain('Fuso 20S');
  });
});
