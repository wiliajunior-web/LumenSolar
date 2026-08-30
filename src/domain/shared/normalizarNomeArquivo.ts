/**
 * BUG CORRIGIDO (ago/2026, auditoria de design): os 3 geradores de planilha
 * (gerarExcel.ts, gerarFormularioCemig.ts, gerarCronograma.ts) montavam o
 * nome do arquivo de saída com
 * `nome.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')` — a segunda regex
 * REMOVE (não transliteral) qualquer caractere acentuado, já que á/ã/ç etc.
 * não casam com `[a-zA-Z0-9_]`. Para "Ana Maria Vieira de Sá e Silva" isso
 * produzia "Ana_Maria_Vieira_de_S_e_Silva.xlsx" — a letra some inteira (não
 * vira "Sa", vira só "S"), resultado visualmente quebrado num nome de
 * arquivo entregue ao cliente/engenheiro. Esta função normaliza acentos
 * para o equivalente ASCII (decomposição NFD + remoção dos diacríticos
 * combinantes resultantes, faixa Unicode ̀-ͯ) ANTES de remover
 * caracteres não alfanuméricos, preservando a legibilidade do nome
 * ("Ana_Maria_Vieira_de_Sa_e_Silva.xlsx").
 */
const DIACRITICOS_COMBINANTES = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(DIACRITICOS_COMBINANTES, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}
