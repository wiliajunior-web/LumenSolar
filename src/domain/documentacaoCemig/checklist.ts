/**
 * CHECKLIST DE DOCUMENTAÇÃO — APROVAÇÃO DE MICROGD JUNTO À CEMIG
 * =================================================================
 * Lista os 8 documentos do "Checklist de documentos CEMIG (MicroGD)" do
 * README. Cada item é 'gerado_automaticamente' (o LumenSolar produz o
 * arquivo) ou 'anexo_manual' (documento de terceiro — cliente, engenheiro
 * responsável, fabricante — que o app não pode e não deve gerar sozinho).
 *
 * IMPORTANTE — por que ART não é 'gerado_automaticamente': a Anotação de
 * Responsabilidade Técnica exige assinatura (física ou eletrônica via CREA)
 * de um engenheiro/técnico habilitado. O LumenSolar pode preparar os dados
 * do projeto para preencher a ART, mas gerar e "aprovar" o documento em
 * nome do responsável técnico seria assumir uma responsabilidade legal que
 * não é do software. O mesmo vale para RG/CPF/comprovante (documentos
 * pessoais do cliente) e certificados INMETRO (emitidos pelo fabricante).
 */

export type TipoItemChecklist = 'gerado_automaticamente' | 'anexo_manual';

export interface ItemChecklistDocumentacao {
  id: string;
  label: string;
  normaBase: string;
  tipo: TipoItemChecklist;
  /** ISO 8601 — preenchido quando o item 'gerado_automaticamente' é gerado pelo app. */
  geradoEm?: string;
  /** Marcado manualmente pelo usuário quando ele anexa/obtém o documento fora do app. */
  anexado?: boolean;
  observacao?: string;
}

export const CHECKLIST_PADRAO_CEMIG_MICROGD: ItemChecklistDocumentacao[] = [
  { id: 'formulario_microgd', label: 'Formulário MicroGD Rev. N4', normaBase: 'CEMIG Rev. N4 (03/12/2024)', tipo: 'gerado_automaticamente' },
  { id: 'procuracao', label: 'Procuração', normaBase: 'REN ANEEL 1.000/2021 Art.9', tipo: 'gerado_automaticamente' },
  { id: 'memorial_descritivo', label: 'Memorial Descritivo', normaBase: 'ND CEMIG 5.30', tipo: 'gerado_automaticamente' },
  { id: 'dub', label: 'DUB — Diagrama Unifilar Básico', normaBase: 'NBR 5410 / NBR 16690', tipo: 'gerado_automaticamente' },
  { id: 'planta_situacao', label: 'Planta de Situação (satélite + UTM)', normaBase: 'ND CEMIG 5.30', tipo: 'gerado_automaticamente' },
  { id: 'art', label: 'ART do Responsável Técnico', normaBase: 'Lei 6.496/1977 (CREA)', tipo: 'anexo_manual' },
  { id: 'rg_cpf_comprovante', label: 'RG + CPF + Comprovante de imóvel', normaBase: '—', tipo: 'anexo_manual' },
  { id: 'certificados_inmetro', label: 'Certificados INMETRO (módulo/inversor)', normaBase: 'Portaria INMETRO', tipo: 'anexo_manual' },
];

/** Atualização imutável — nunca muta o array recebido. */
export function marcarItemGerado(
  checklist: ItemChecklistDocumentacao[],
  id: string,
  dataISO: string
): ItemChecklistDocumentacao[] {
  return checklist.map((item) => (item.id === id ? { ...item, geradoEm: dataISO } : item));
}

export function marcarItemAnexado(
  checklist: ItemChecklistDocumentacao[],
  id: string,
  anexado: boolean,
  observacao?: string
): ItemChecklistDocumentacao[] {
  return checklist.map((item) =>
    item.id === id ? { ...item, anexado, ...(observacao !== undefined ? { observacao } : {}) } : item
  );
}

export interface ResumoChecklist {
  total: number;
  concluidos: number;
  pendentes: number;
  percentualCompleto: number;
  itensPendentes: ItemChecklistDocumentacao[];
}

function itemConcluido(item: ItemChecklistDocumentacao): boolean {
  return item.tipo === 'gerado_automaticamente' ? !!item.geradoEm : !!item.anexado;
}

export function resumoChecklist(checklist: ItemChecklistDocumentacao[]): ResumoChecklist {
  const concluidos = checklist.filter(itemConcluido).length;
  const total = checklist.length;
  return {
    total,
    concluidos,
    pendentes: total - concluidos,
    percentualCompleto: total > 0 ? Math.round((concluidos / total) * 100) : 0,
    itensPendentes: checklist.filter((item) => !itemConcluido(item)),
  };
}
