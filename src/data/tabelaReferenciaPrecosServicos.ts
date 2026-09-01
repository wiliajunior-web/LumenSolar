/**
 * Tabela de referência de preços — Projetos Elétricos, Padrão de Entrada,
 * Subestações, SPDA/Laudos e Análise de Risco.
 *
 * PROVENIÊNCIA (rastreabilidade obrigatória — não é dado inventado):
 *   Fonte: "Toolbox de Elite", conteúdo da Comunidade Projetista de Elite
 *     (https://aluno.projetistadeelite.com.br/area/conteudo/listagem/103761)
 *   Arquivos originais (protegidos por senha, aula "V0" — nunca revisados
 *     pelo autor desde a publicação):
 *     - PRECIFICAO_DE_PROJETOS_MEDIA_VALORES.xlsx  (aula 8, id 1345626)
 *     - PRECIFICAO_DE_PROJETOS-_SPDA.xlsx           (aula 9, id 1345627)
 *   Extraído em 25/08/2026 (arquivos protegidos por senha — a senha em si
 *     foi removida deste comentário em set/2026: é a senha de um conteúdo
 *     pago de terceiros, não algo que devesse ficar em texto puro dentro do
 *     código-fonte, mesmo num repositório privado — repositórios privados
 *     viram públicos, são clonados, compartilhados. Quem precisar reabrir os
 *     .xlsx originais para conferência deve pedir a senha diretamente ao
 *     usuário deste projeto, não copiá-la daqui.).
 *
 * DATA-BASE DOS VALORES (estimada, não documentada no arquivo em si):
 *   Os comentários mais antigos visíveis na página da aula pedindo a senha
 *   datam de 03/07/2023, e o arquivo está marcado "V0" (nunca teve uma
 *   revisão de valores publicada). Por isso os valores abaixo são tratados
 *   como tendo data-base ~07/2023 para fins de correção monetária — é uma
 *   inferência a partir do histórico de comentários, não uma data oficial.
 *   Em 09/06/2026 o próprio autor do curso respondeu a um aluno perguntando
 *   se os valores estavam atualizados: "Sim pode considerar como base. Mas é
 *   bom fazer uma pesquisa de valores na sua região" — ou seja, mesmo o autor
 *   trata isso como referência aproximada, não como tarifa fechada.
 *
 * Os valores aqui são os ORIGINAIS, sem correção. Para os valores corrigidos
 * por IPCA acumulado, ver `precificacaoServicos/calcularTabelaAtualizada.ts`.
 */

export type CategoriaServicoEletrico =
  | 'padrao_entrada'
  | 'projeto_eletrico'
  | 'subestacao'
  | 'spda_laudos_inspecao'
  | 'analise_risco'
  | 'spda_projeto_completo';

export interface ItemTabelaReferencia {
  categoria: CategoriaServicoEletrico;
  servico: string;
  /** Valor mínimo original (R$). Igual a valorBaseMaxRS quando a planilha trazia um valor único. */
  valorBaseMinRS: number;
  /** Valor máximo original (R$). Igual a valorBaseMinRS quando a planilha trazia um valor único. */
  valorBaseMaxRS: number;
  /** true quando a planilha original dizia "X (base) ou acima" — ou seja, sem teto definido. */
  semTeto?: boolean;
  observacoes?: string;
  formaPagamento?: string;
}

const PAGAMENTO_PADRAO_CONCESSIONARIA =
  '50% na entrada e 50% na entrega dos projetos ou 30% na entrada e 70% na entrega ' +
  '(algumas vezes essas situações podem não acontecer, nesses casos o recebimento acontece ' +
  'na entrega, converse bem isso com seu cliente).';

const PAGAMENTO_SPDA =
  PAGAMENTO_PADRAO_CONCESSIONARIA +
  ' Não esqueça de considerar deslocamento, aluguel de equipamentos, equipe, materiais ' +
  'adicionais que possam ser necessários. Os valores mencionados na planilha são valores ' +
  'médios e não podem ser tomados como valores únicos para qualquer tipo de edificação.';

const OBS_PRAZO_CONCESSIONARIA =
  'Prazo dependente exclusivamente da concessionária: pelo menos 30 a 45 dias, podendo ' +
  'chegar a 60 dias ou mais.';

const OBS_PRAZO_PROJETO_CURTO =
  'Prazo: 20 a 30 dias (pode ser reduzido conforme disponibilidade e segurança para elaborar o projeto).';

export const TABELA_REFERENCIA_PRECOS_BASE: ItemTabelaReferencia[] = [
  // ── Padrão de entrada (aprovação junto à concessionária) ──────────────
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão Trifásico',
    valorBaseMinRS: 800,
    valorBaseMaxRS: 800,
    observacoes: OBS_PRAZO_CONCESSIONARIA,
    formaPagamento: PAGAMENTO_PADRAO_CONCESSIONARIA,
  },
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão 02 a 06 unidades',
    valorBaseMinRS: 950,
    valorBaseMaxRS: 950,
  },
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão 07 a 15 unidades',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 1500,
  },
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão 16 a 35 unidades',
    valorBaseMinRS: 2200,
    valorBaseMaxRS: 2200,
  },
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão 36 a 110 unidades',
    valorBaseMinRS: 4000,
    valorBaseMaxRS: 4000,
  },
  {
    categoria: 'padrao_entrada',
    servico: 'Aprovação de Padrão 110 a 180 unidades',
    valorBaseMinRS: 5000,
    valorBaseMaxRS: 5000,
  },

  // ── Projeto elétrico ────────────────────────────────────────────────
  {
    categoria: 'projeto_eletrico',
    servico: 'Projeto elétrico residencial — aprox. 100 m² de área construída',
    valorBaseMinRS: 1100,
    valorBaseMaxRS: 1100,
    observacoes: OBS_PRAZO_PROJETO_CURTO,
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Projeto de RTA — aprox. 100 m² de área construída',
    valorBaseMinRS: 700,
    valorBaseMaxRS: 700,
    observacoes: OBS_PRAZO_PROJETO_CURTO,
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Projeto elétrico + cabeamento estruturado — sala comercial, aprox. 110 m²',
    valorBaseMinRS: 1800,
    valorBaseMaxRS: 1800,
    observacoes: OBS_PRAZO_PROJETO_CURTO,
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Projeto elétrico + RTA — sala comercial, aprox. 35 m²',
    valorBaseMinRS: 750,
    valorBaseMaxRS: 800,
    observacoes: OBS_PRAZO_PROJETO_CURTO,
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Galpão — projeto elétrico + RTA, 10.000 m²',
    valorBaseMinRS: 7500,
    valorBaseMaxRS: 8000,
    observacoes: OBS_PRAZO_PROJETO_CURTO + ' Considere também a opção de parcelamento.',
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Shopping center — quiosque',
    valorBaseMinRS: 1000,
    valorBaseMaxRS: 1000,
    observacoes: 'Prazo: 15 dias (pode ser reduzido conforme disponibilidade e segurança para elaborar o projeto).',
  },
  {
    categoria: 'projeto_eletrico',
    servico: 'Loja pequena em shopping center — média de R$ 15 a R$ 18/m²',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 1500,
    semTeto: true,
    observacoes: OBS_PRAZO_PROJETO_CURTO,
  },

  // ── Subestações ─────────────────────────────────────────────────────
  {
    categoria: 'subestacao',
    servico: 'Subestação aérea até 112,5 kVA — medição direta',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 1500,
    semTeto: true,
    observacoes:
      OBS_PRAZO_CONCESSIONARIA + ' Considerar também o pedido de liberação de carga (AVT).',
    formaPagamento: PAGAMENTO_PADRAO_CONCESSIONARIA,
  },
  {
    categoria: 'subestacao',
    servico: 'Subestação aérea até 150–300 kVA — medição indireta',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 3000,
  },

  // ── SPDA: laudos e inspeções ────────────────────────────────────────
  {
    categoria: 'spda_laudos_inspecao',
    servico: 'Inspeção visual semestral — emissão de relatório',
    valorBaseMinRS: 1000,
    valorBaseMaxRS: 2000,
    observacoes: 'Inspeção simples, sem necessidade de medições conforme NBR 5419:2015-3.',
    formaPagamento: PAGAMENTO_SPDA,
  },
  {
    categoria: 'spda_laudos_inspecao',
    servico:
      'Inspeção periódica 1 a 3 anos (essenciais, regiões litorâneas, munição ou explosivos) — emissão de relatório',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 5000,
    observacoes:
      'Necessário verificar a integridade física dos condutores do eletrodo de aterramento; ' +
      'prever aluguel de mili/microhmímetro caso não possua e acrescentar esse custo ao orçamento.',
  },
  {
    categoria: 'spda_laudos_inspecao',
    servico: 'Laudo solicitado por órgãos públicos (corpo de bombeiros / CREA)',
    valorBaseMinRS: 1000,
    valorBaseMaxRS: 3000,
    observacoes: 'Determinação das atividades exatas depende exclusivamente do órgão solicitante.',
  },
  {
    categoria: 'spda_laudos_inspecao',
    servico:
      'Medição de continuidade das armaduras com relatório técnico (verificação de SPDA natural) + verificação final',
    valorBaseMinRS: 2000,
    valorBaseMaxRS: 5000,
    observacoes:
      'Contratar empresa especializada para escarificação dos pilares; caso não tenha ' +
      'mili/microhmímetro, acrescentar aluguel no orçamento.',
  },

  // ── Análise / gerenciamento de risco ───────────────────────────────
  {
    categoria: 'analise_risco',
    servico: 'Gerenciamento de Risco — edificações comerciais',
    valorBaseMinRS: 1500,
    valorBaseMaxRS: 1500,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
  {
    categoria: 'analise_risco',
    servico: 'Gerenciamento de Risco — edificações prediais comerciais/residenciais ou mistas',
    valorBaseMinRS: 2000,
    valorBaseMaxRS: 2000,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
  {
    categoria: 'analise_risco',
    servico: 'Gerenciamento de Risco — residências',
    valorBaseMinRS: 1000,
    valorBaseMaxRS: 1000,
    observacoes: 'Valor único para residências de alto padrão.',
  },
  {
    categoria: 'analise_risco',
    servico: 'Gerenciamento de Risco — hospitais',
    valorBaseMinRS: 2000,
    valorBaseMaxRS: 5000,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },

  // ── SPDA: projeto completo (SPDA + MPS) ────────────────────────────
  {
    categoria: 'spda_projeto_completo',
    servico: 'Galpão — SPDA + MPS, 2.000 a 10.000 m²',
    valorBaseMinRS: 2500,
    valorBaseMaxRS: 7000,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
  {
    categoria: 'spda_projeto_completo',
    servico: 'Edificações prediais (4 a 9 andares)',
    valorBaseMinRS: 1800,
    valorBaseMaxRS: 1800,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
  {
    categoria: 'spda_projeto_completo',
    servico: 'Edificações prediais (10 a 30 andares)',
    valorBaseMinRS: 1800,
    valorBaseMaxRS: 5000,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
  {
    categoria: 'spda_projeto_completo',
    servico: 'Edificações comerciais — 200 a 2.000 m²',
    valorBaseMinRS: 1200,
    valorBaseMaxRS: 3000,
    observacoes: 'Valor pode variar conforme tamanho e complexidade da edificação.',
  },
];
