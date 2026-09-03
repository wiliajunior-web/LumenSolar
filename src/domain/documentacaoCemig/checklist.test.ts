import { describe, it, expect } from 'vitest';
import {
  CHECKLIST_PADRAO_CEMIG_MICROGD,
  marcarItemGerado,
  marcarItemAnexado,
  resumoChecklist,
  normaConexaoCemig,
  normaBaseExibicao,
} from './checklist';

describe('CHECKLIST_PADRAO_CEMIG_MICROGD', () => {
  it('tem exatamente os 8 itens do checklist CEMIG do README, com ids únicos', () => {
    expect(CHECKLIST_PADRAO_CEMIG_MICROGD).toHaveLength(8);
    const ids = CHECKLIST_PADRAO_CEMIG_MICROGD.map((i) => i.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('classifica ART, RG/CPF e INMETRO como anexo_manual — nunca gerado_automaticamente', () => {
    const manuais = ['art', 'rg_cpf_comprovante', 'certificados_inmetro'];
    for (const id of manuais) {
      const item = CHECKLIST_PADRAO_CEMIG_MICROGD.find((i) => i.id === id);
      expect(item).toBeDefined();
      expect(item!.tipo).toBe('anexo_manual');
    }
  });

  it('classifica os 5 documentos que o LumenSolar produz como gerado_automaticamente', () => {
    const automaticos = ['formulario_microgd', 'procuracao', 'memorial_descritivo', 'dub', 'planta_situacao'];
    for (const id of automaticos) {
      const item = CHECKLIST_PADRAO_CEMIG_MICROGD.find((i) => i.id === id);
      expect(item).toBeDefined();
      expect(item!.tipo).toBe('gerado_automaticamente');
    }
  });
});

// REGRESSÃO (set/2026): confirmado direto no texto do portal Cemig Atende
// (fluxo Mini/Micro Geração Distribuída, seção ORÇAMENTO DE CONEXÃO):
// "...critérios da ND-5.30 para conexão em baixa tensão ou ND-5.31 para
// conexão em média tensão." O app cita "ND 5.30" para todo cliente,
// inclusive Grupo A (média tensão) — errado pra esse caso.
describe('normaConexaoCemig', () => {
  it('Grupo B (baixa tensão) ou sem grupoTensao informado: ND CEMIG 5.30', () => {
    expect(normaConexaoCemig('B')).toContain('5.30');
    expect(normaConexaoCemig('B')).not.toContain('5.31');
    expect(normaConexaoCemig(undefined)).toContain('5.30');
  });

  it('Grupo A (média tensão): ND CEMIG 5.31, nunca 5.30', () => {
    const norma = normaConexaoCemig('A');
    expect(norma).toContain('5.31');
    expect(norma).not.toContain('5.30');
  });
});

describe('normaBaseExibicao', () => {
  it('memorial_descritivo e planta_situacao resolvem pelo grupo de tensão real, não pelo normaBase estático do item', () => {
    const memorial = CHECKLIST_PADRAO_CEMIG_MICROGD.find((i) => i.id === 'memorial_descritivo')!;
    const planta = CHECKLIST_PADRAO_CEMIG_MICROGD.find((i) => i.id === 'planta_situacao')!;
    expect(normaBaseExibicao(memorial, 'A')).toContain('5.31');
    expect(normaBaseExibicao(planta, 'A')).toContain('5.31');
    expect(normaBaseExibicao(memorial, 'B')).toContain('5.30');
    expect(normaBaseExibicao(planta, 'B')).toContain('5.30');
  });

  it('demais itens (DUB, ART, Procuração, Formulário, INMETRO) ignoram grupoTensao — usam o normaBase estático', () => {
    const outros = CHECKLIST_PADRAO_CEMIG_MICROGD.filter(
      (i) => i.id !== 'memorial_descritivo' && i.id !== 'planta_situacao'
    );
    for (const item of outros) {
      expect(normaBaseExibicao(item, 'A')).toBe(item.normaBase);
      expect(normaBaseExibicao(item, 'B')).toBe(item.normaBase);
    }
  });
});

describe('marcarItemGerado', () => {
  it('marca geradoEm sem mutar o array original (imutabilidade)', () => {
    const original = CHECKLIST_PADRAO_CEMIG_MICROGD;
    const atualizado = marcarItemGerado(original, 'memorial_descritivo', '2026-08-25T10:00:00.000Z');
    expect(original.find((i) => i.id === 'memorial_descritivo')!.geradoEm).toBeUndefined();
    expect(atualizado.find((i) => i.id === 'memorial_descritivo')!.geradoEm).toBe('2026-08-25T10:00:00.000Z');
    expect(atualizado).not.toBe(original);
  });

  it('não afeta outros itens', () => {
    const atualizado = marcarItemGerado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'dub', '2026-08-25T10:00:00.000Z');
    expect(atualizado.find((i) => i.id === 'procuracao')!.geradoEm).toBeUndefined();
  });
});

describe('marcarItemAnexado', () => {
  it('marca anexado=true e aceita observação opcional', () => {
    const atualizado = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'art', true, 'ART nº 12345 — CREA-MG');
    const item = atualizado.find((i) => i.id === 'art')!;
    expect(item.anexado).toBe(true);
    expect(item.observacao).toBe('ART nº 12345 — CREA-MG');
  });

  it('permite desmarcar (anexado=false)', () => {
    const marcado = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'art', true);
    const desmarcado = marcarItemAnexado(marcado, 'art', false);
    expect(desmarcado.find((i) => i.id === 'art')!.anexado).toBe(false);
  });
});

describe('resumoChecklist', () => {
  it('checklist vazio (nenhum gerado/anexado): 0 de 8 concluídos', () => {
    const r = resumoChecklist(CHECKLIST_PADRAO_CEMIG_MICROGD);
    expect(r.total).toBe(8);
    expect(r.concluidos).toBe(0);
    expect(r.pendentes).toBe(8);
    expect(r.percentualCompleto).toBe(0);
    expect(r.itensPendentes).toHaveLength(8);
  });

  it('conta itens gerado_automaticamente como concluídos apenas quando geradoEm está preenchido', () => {
    let c = marcarItemGerado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'formulario_microgd', '2026-08-25T10:00:00.000Z');
    c = marcarItemGerado(c, 'procuracao', '2026-08-25T10:00:00.000Z');
    const r = resumoChecklist(c);
    expect(r.concluidos).toBe(2);
    expect(r.pendentes).toBe(6);
  });

  it('conta itens anexo_manual como concluídos apenas quando anexado=true', () => {
    const c = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'rg_cpf_comprovante', true);
    const r = resumoChecklist(c);
    expect(r.concluidos).toBe(1);
  });

  it('todos os 8 itens concluídos → 100%', () => {
    let c = CHECKLIST_PADRAO_CEMIG_MICROGD;
    const dataISO = '2026-08-25T10:00:00.000Z';
    for (const item of c) {
      c = item.tipo === 'gerado_automaticamente'
        ? marcarItemGerado(c, item.id, dataISO)
        : marcarItemAnexado(c, item.id, true);
    }
    const r = resumoChecklist(c);
    expect(r.concluidos).toBe(8);
    expect(r.percentualCompleto).toBe(100);
    expect(r.itensPendentes).toHaveLength(0);
  });
});
