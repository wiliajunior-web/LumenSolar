/**
 * Script utilitário (não faz parte do build do app) — gera uma planilha .xlsx
 * com a tabela de referência de preços original + corrigida por IPCA, a partir
 * do módulo real `src/domain/precificacaoServicos`. Não duplica dados: lê os
 * mesmos arrays/funções usados pelos testes automatizados.
 *
 * Uso: npx tsx scripts/gerarTabelaReferenciaXlsx.ts <caminho-de-saida.xlsx>
 */
import * as XLSX from 'xlsx';
import { gerarTabelaAtualizada } from '../src/domain/precificacaoServicos/calcularTabelaAtualizada';
import {
  FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026,
  IPCA_MENSAL_AGO_A_DEZ_2023,
  IPCA_ACUMULADO_2024,
  IPCA_ACUMULADO_2025,
  IPCA_ACUMULADO_2026_JAN_A_JUL,
} from '../src/domain/precificacaoServicos/indiceCorrecao';
import { CategoriaServicoEletrico } from '../src/data/tabelaReferenciaPrecosServicos';

const LABEL_CATEGORIA: Record<CategoriaServicoEletrico, string> = {
  padrao_entrada: 'Padrão de Entrada (Concessionária)',
  projeto_eletrico: 'Projeto Elétrico',
  subestacao: 'Subestação',
  spda_laudos_inspecao: 'SPDA — Laudos e Inspeções',
  analise_risco: 'Análise / Gerenciamento de Risco',
  spda_projeto_completo: 'SPDA — Projeto Completo (SPDA + MPS)',
};

function formatarFaixa(min: number, max: number, semTeto?: boolean): string {
  if (min === max) return semTeto ? `R$ ${min.toLocaleString('pt-BR')} (base) ou acima` : `R$ ${min.toLocaleString('pt-BR')}`;
  return `R$ ${min.toLocaleString('pt-BR')} – R$ ${max.toLocaleString('pt-BR')}`;
}

function main() {
  const outPath = process.argv[2] ?? 'TABELA_REFERENCIA_PRECOS_ATUALIZADA.xlsx';
  const tabela = gerarTabelaAtualizada();

  const linhas = tabela.map((item) => ({
    Categoria: LABEL_CATEGORIA[item.categoria],
    Serviço: item.servico,
    'Valor Original (referência ~jul/2023)': formatarFaixa(item.valorBaseMinRS, item.valorBaseMaxRS, item.semTeto),
    'Valor Atualizado (IPCA acum. até jul/2026)': formatarFaixa(item.valorAtualizadoMinRS, item.valorAtualizadoMaxRS, item.semTeto),
    'Correção aplicada': `+${((item.fatorCorrecaoAplicado - 1) * 100).toFixed(2)}%`,
    Observações: item.observacoes ?? '',
    'Forma de pagamento': item.formaPagamento ?? '',
  }));

  const wsTabela = XLSX.utils.json_to_sheet(linhas);
  wsTabela['!cols'] = [
    { wch: 30 }, // Categoria
    { wch: 55 }, // Serviço
    { wch: 30 }, // Valor original
    { wch: 32 }, // Valor atualizado
    { wch: 16 }, // Correção
    { wch: 60 }, // Observações
    { wch: 60 }, // Forma de pagamento
  ];

  const metodologia: (string | number)[][] = [
    ['TABELA DE REFERÊNCIA DE PREÇOS — PROJETOS ELÉTRICOS, SUBESTAÇÃO, SPDA E ANÁLISE DE RISCO'],
    [''],
    ['Fonte original: Toolbox de Elite — Comunidade Projetista de Elite'],
    ['Arquivos: PRECIFICAO_DE_PROJETOS_MEDIA_VALORES.xlsx e PRECIFICAO_DE_PROJETOS-_SPDA.xlsx (aula "V0", nunca revisada pelo autor)'],
    ['Data-base estimada dos valores originais: ~07/2023 (inferida do comentário mais antigo na página de origem)'],
    [''],
    ['ÍNDICE DE CORREÇÃO USADO: IPCA (IBGE) — acumulado composto de jul/2023 a jul/2026'],
    ['Por que IPCA e não INCC-DI ou IGP-M: os itens desta tabela são honorários de SERVIÇO técnico'],
    ['(projeto, laudo, inspeção), não insumo de obra civil. INCC-DI (6,46% em 12m) mede custo de material'],
    ['+ mão de obra de construção civil; IGP-M é o índice tradicional de contrato de aluguel, mais volátil'],
    ['por incluir preços no atacado. IPCA é o índice oficial de inflação ao consumidor (IBGE) e é o mais'],
    ['aceito para reajuste de contrato de serviço na ausência de índice setorial específico — e também o'],
    ['mais conservador dos três, o que evita superestimar a correção.'],
    [''],
    ['Composição do fator acumulado (jul/2023 → jul/2026):'],
    [`  ago/2023: +${(IPCA_MENSAL_AGO_A_DEZ_2023[0] * 100).toFixed(2)}%   set/2023: +${(IPCA_MENSAL_AGO_A_DEZ_2023[1] * 100).toFixed(2)}%   out/2023: +${(IPCA_MENSAL_AGO_A_DEZ_2023[2] * 100).toFixed(2)}%   nov/2023: +${(IPCA_MENSAL_AGO_A_DEZ_2023[3] * 100).toFixed(2)}%   dez/2023: +${(IPCA_MENSAL_AGO_A_DEZ_2023[4] * 100).toFixed(2)}%`],
    [`  2024 (ano fechado): +${(IPCA_ACUMULADO_2024 * 100).toFixed(2)}%`],
    [`  2025 (ano fechado): +${(IPCA_ACUMULADO_2025 * 100).toFixed(2)}%`],
    [`  2026 (jan–jul, parcial): +${(IPCA_ACUMULADO_2026_JAN_A_JUL * 100).toFixed(2)}%`],
    [`  Fator acumulado composto: ${FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026.toFixed(6)}  (+${((FATOR_CORRECAO_IPCA_JUL2023_A_JUL2026 - 1) * 100).toFixed(2)}%)`],
    [''],
    ['ALERTA — benchmark de mercado real (não incorporado automaticamente nesta correção):'],
    ['A tabela ABEE-MS (Associação Brasileira de Engenheiros Eletricistas, MS), abril/2024, cobra'],
    ['mínimo de R$ 1.900,00 para projeto elétrico residencial — bem acima do valor original desta'],
    ['planilha (R$ 1.100) mesmo após a correção por IPCA (R$ 1.263). Ou seja, mesmo corrigido pela'],
    ['inflação, o valor de projeto elétrico residencial desta tabela pode estar abaixo do praticado'],
    ['no mercado em algumas regiões. Recomenda-se pesquisa de valores locais antes de fechar preço,'],
    ['como o próprio autor do curso orienta nos comentários da página de origem (09/06/2026).'],
    [''],
    ['LIMITAÇÃO CONHECIDA: a data-base "jul/2023" é inferida do histórico de comentários da página'],
    ['de origem, não é uma data de publicação documentada oficialmente pelo autor do material.'],
    [''],
    [`Gerado em: ${new Date().toISOString().slice(0, 10)}`],
  ];
  const wsMetodologia = XLSX.utils.aoa_to_sheet(metodologia);
  wsMetodologia['!cols'] = [{ wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMetodologia, 'Metodologia');
  XLSX.utils.book_append_sheet(wb, wsTabela, 'Tabela Atualizada');

  XLSX.writeFile(wb, outPath);
  console.log('Gerado:', outPath, '—', linhas.length, 'itens');
}

main();
