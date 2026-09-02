import { describe, expect, it } from 'vitest';
import { nomeArquivoDatasheet } from './nomearDatasheet';

const DATA_FIXA = new Date('2026-09-02T12:00:00Z');

describe('nomeArquivoDatasheet', () => {
  it('monta o nome com tipo, marca normalizada (sem acento/espaço) e data ISO', () => {
    expect(nomeArquivoDatasheet('modulo', 'Datasheet Canadian Solar 550W.pdf', DATA_FIXA))
      .toBe('Datasheet_Modulo_Datasheet_Canadian_Solar_550W_2026-09-02.pdf');
  });

  it('usa o rótulo "Inversor" para tipo inversor e remove hífen do nome original', () => {
    const nome = nomeArquivoDatasheet('inversor', 'Growatt MIN 5000TL-X.pdf', DATA_FIXA);
    expect(nome).toBe('Datasheet_Inversor_Growatt_MIN_5000TLX_2026-09-02.pdf');
  });

  it('normaliza acentos ao invés de removê-los sem substituição (ex: "Módulo Solár" → "Modulo_Solar", não "Mdulo_Solr")', () => {
    const nome = nomeArquivoDatasheet('modulo', 'Módulo Solár 450Wp.pdf', DATA_FIXA);
    expect(nome).toBe('Datasheet_Modulo_Modulo_Solar_450Wp_2026-09-02.pdf');
  });

  it('cai no rótulo do tipo quando o nome do arquivo fica vazio após normalizar (ex: só símbolos)', () => {
    expect(nomeArquivoDatasheet('modulo', '###.pdf', DATA_FIXA)).toBe('Datasheet_Modulo_Modulo_2026-09-02.pdf');
    expect(nomeArquivoDatasheet('inversor', '###.pdf', DATA_FIXA)).toBe('Datasheet_Inversor_Inversor_2026-09-02.pdf');
  });

  it('remove a extensão .pdf (case-insensitive) do nome original antes de normalizar', () => {
    const comExtMaiuscula = nomeArquivoDatasheet('modulo', 'Fabricante.PDF', DATA_FIXA);
    const semExtensao = nomeArquivoDatasheet('modulo', 'Fabricante', DATA_FIXA);
    expect(comExtMaiuscula).toBe(semExtensao);
  });

  it('usa a data corrente quando nenhuma data é passada', () => {
    const nome = nomeArquivoDatasheet('modulo', 'Teste.pdf');
    const hojeISO = new Date().toISOString().slice(0, 10);
    expect(nome.endsWith(`_${hojeISO}.pdf`)).toBe(true);
  });
});
