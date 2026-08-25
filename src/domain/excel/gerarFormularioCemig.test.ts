import { describe, it, expect } from 'vitest';
import { checklistDocumentosCEMIG } from './gerarFormularioCemig';
import { CHECKLIST_PADRAO_CEMIG_MICROGD, marcarItemGerado, marcarItemAnexado } from '../documentacaoCemig/checklist';

describe('checklistDocumentosCEMIG', () => {
  it('sem checklistDocumentacao em dados (arquivo .lumensolar antigo): usa o padrão e reporta tudo pendente', () => {
    const lista = checklistDocumentosCEMIG({});
    const obrigatorios = lista.filter((i) => i.obrigatorio);
    expect(obrigatorios.every((i) => i.status === 'pendente')).toBe(true);
  });

  it('REGRESSÃO — bug corrigido: o status de itens manuais (ART/RG-CPF/INMETRO) reage ao checklist real, não a uma condicional morta', () => {
    // A versão anterior tinha `empresa?.crea ? 'pendente' : 'pendente'` — sempre
    // 'pendente' mesmo quando o item estava de fato concluído. Este teste
    // falharia com o código antigo mesmo com o item marcado como anexado.
    const checklist = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'art', true, 'ART 12345');
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    const art = lista.find((i) => i.doc.includes('ART'))!;
    expect(art.status).toBe('ok');
  });

  it('itens gerado_automaticamente (DUB, Planta, Memorial, etc.) viram "ok" quando geradoEm está preenchido', () => {
    let checklist = marcarItemGerado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'dub', '2026-08-25T10:00:00.000Z');
    checklist = marcarItemGerado(checklist, 'planta_situacao', '2026-08-25T10:00:00.000Z');
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    expect(lista.find((i) => i.doc.includes('DUB'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Planta de Situação'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Memorial'))!.status).toBe('pendente');
  });

  it('marca DUB e Planta de Situação como geradoPeloApp=true (agora que existem geradores para eles)', () => {
    const lista = checklistDocumentosCEMIG({});
    expect(lista.find((i) => i.doc.includes('DUB'))!.geradoPeloApp).toBe(true);
    expect(lista.find((i) => i.doc.includes('Planta de Situação'))!.geradoPeloApp).toBe(true);
  });

  it('RG/CPF e Comprovante de imóvel compartilham o mesmo item de checklist (rg_cpf_comprovante)', () => {
    const checklist = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'rg_cpf_comprovante', true);
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    expect(lista.find((i) => i.doc.includes('RG + CPF'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Comprovante de Propriedade'))!.status).toBe('ok');
  });

  it('itens não obrigatórios (CAR, Análise de Carga) permanecem nao_aplicavel', () => {
    const lista = checklistDocumentosCEMIG({});
    expect(lista.find((i) => i.doc.includes('CAR'))!.status).toBe('nao_aplicavel');
    expect(lista.find((i) => i.doc.includes('Análise de Carga'))!.status).toBe('nao_aplicavel');
  });

  it('retorna 11 itens no total (8 do checklist principal + 3 variações/extras)', () => {
    expect(checklistDocumentosCEMIG({})).toHaveLength(11);
  });
});
