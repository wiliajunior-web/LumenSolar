/**
 * CRONOGRAMA DE OBRA — SISTEMA FOTOVOLTAICO
 * Baseado nos prazos reais do processo CEMIG (ND 5.30 + REN 1.000/2021)
 * e no modelo "Cronograma-de-Obras-MINIGD.xls" (MODELOS_DE_FORMULARIOS.rar)
 *
 * Prazos CEMIG (MicroGD sem obras na rede):
 *   - APR Web: documentos em 24h após protocolo
 *   - Parecer de Acesso: até 15 dias úteis
 *   - Vistoria após solicitação: até 30 dias úteis
 *   - Troca do medidor: até 30 dias após vistoria favorável
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');

interface ParamsCronograma {
  nomeCliente: string;
  enderecoInstalacao: string;
  dataInicio: string;       // ISO date string (início do projeto)
  potenciaKWp: number;
  numModulos: number;
  empresa: string;
  responsavelTecnico: string;
  tipoSistema: 'micro' | 'mini';   // afeta prazos CEMIG
}

interface Etapa {
  fase: string;
  etapa: string;
  semana: number;
  duracao: number;  // semanas
  responsavel: 'Lumen' | 'CEMIG' | 'Cliente' | 'Lumen + CEMIG';
  descricao: string;
}

// CORRIGIDO (ago/2026): `new Date("YYYY-MM-DD")` é interpretado como meia-noite
// UTC, mas `.getDate()`/`.setDate()`/`.toLocaleDateString()` (sem `timeZone`
// explícito) usam o fuso LOCAL da máquina. Para o Brasil (UTC-3), meia-noite
// UTC de um dia cai às 21h do dia ANTERIOR no horário local — todas as datas
// do cronograma (início, cada semana, início/término de cada etapa) saíam
// sistematicamente um dia adiantadas em relação à data real informada.
// Corrigido mantendo tudo em UTC (parse, aritmética e formatação), igual ao
// padrão já usado em addMonths() de calculoFioB.ts.
function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function gerarCronograma(dados: ParamsCronograma): void {
  const wb = XLSX.utils.book_new();
  const ws: Record<string, any> = {};

  // BUG CORRIGIDO (ago/2026): só a duração da própria etapa "Análise CEMIG —
  // Parecer de Acesso" variava com `tipoSistema` (3 semanas MicroGD / 6
  // semanas MiniGD) — mas TODAS as etapas seguintes (Instalação mecânica,
  // Instalação elétrica, Comissionamento, Solicitação de vistoria, Vistoria
  // CEMIG, Entrega) tinham `semana` FIXA (6, 7, 8, 8, 9, 13), calibrada só
  // para o caso MicroGD (Parecer termina na semana 3+3=6, batendo com o
  // início da Instalação mecânica na semana 6). Para um sistema MiniGD
  // (Parecer termina na semana 3+6=9), o cronograma gerado agendava
  // instalação mecânica/elétrica e até o comissionamento (semanas 6-8) para
  // ANTES do Parecer de Acesso da CEMIG ser concluído (semana 9) — um
  // cronograma que orienta o cliente a instalar o sistema antes de ter a
  // aprovação de acesso da distribuidora, o oposto do processo real de
  // homologação. Corrigido calculando a semana de início de cada etapa
  // pós-Parecer a partir do fim real do Parecer (`semanaParecerFim`), que
  // já varia com `tipoSistema` — preserva exatamente o cronograma MicroGD
  // original (3+3=6, igual ao valor fixo anterior) e desloca corretamente
  // o MiniGD (3+6=9) para não mais empurrar obra para antes da aprovação.
  const semanaParecerFim = 3 + (dados.tipoSistema === 'micro' ? 3 : 6); // 6 (MicroGD) ou 9 (MiniGD)

  // ── Etapas do processo ────────────────────────────────────────────────────
  const etapas: Etapa[] = [
    // FASE 1 — ESTUDO E LEVANTAMENTO
    {
      fase: '1. Estudo e Levantamento',
      etapa: 'Visita técnica e coleta de dados',
      semana: 1, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Levantamento de consumo, inspeção estrutural do telhado, verificação da rede elétrica',
    },
    {
      fase: '1. Estudo e Levantamento',
      etapa: 'Proposta comercial e aprovação do cliente',
      semana: 1, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Elaboração e envio da proposta com dimensionamento e análise financeira',
    },

    // FASE 2 — PROJETO EXECUTIVO
    {
      fase: '2. Projeto Executivo',
      etapa: 'Memorial Descritivo e documentação técnica',
      semana: 2, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Memorial Descritivo (ND 5.30), DUB, Planta de Situação',
    },
    {
      fase: '2. Projeto Executivo',
      etapa: 'Emissão da ART',
      semana: 2, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Emissão da ART no CREA para o projeto de sistema fotovoltaico',
    },
    {
      fase: '2. Projeto Executivo',
      etapa: 'Coleta de documentos do cliente',
      semana: 2, duracao: 1,
      responsavel: 'Cliente',
      descricao: 'RG + CPF + comprovante de propriedade/posse do imóvel',
    },

    // FASE 3 — HOMOLOGAÇÃO CEMIG
    {
      fase: '3. Homologação CEMIG',
      etapa: 'Protocolo no CEMIG Atende (Nota de Serviço)',
      semana: 3, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Abertura da NS no portal CEMIG com formulário MicroGD + Procuração. Prazo: dados em 24h.',
    },
    {
      fase: '3. Homologação CEMIG',
      etapa: 'Upload documentação no APR Web (24h)',
      semana: 3, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: `Upload obrigatório em 24h: formulário, memorial, DUB, planta, ART, procuração, docs cliente`,
    },
    {
      fase: '3. Homologação CEMIG',
      etapa: 'Análise CEMIG — Parecer de Acesso',
      semana: 3, duracao: dados.tipoSistema === 'micro' ? 3 : 6,
      responsavel: 'CEMIG',
      descricao: `Prazo: 15 dias úteis (MicroGD) / 30 dias (MiniGD). Acompanhar portal. Validade do parecer: 120 dias.`,
    },

    // FASE 4 — AQUISIÇÃO E INSTALAÇÃO
    {
      fase: '4. Aquisição e Instalação',
      etapa: 'Aquisição do kit fotovoltaico',
      semana: 4, duracao: Math.max(2, semanaParecerFim - 4),
      responsavel: 'Lumen',
      descricao: `${dados.potenciaKWp} kWp — ${dados.numModulos} módulos + inversor + estrutura + materiais elétricos`,
    },
    {
      fase: '4. Aquisição e Instalação',
      etapa: 'Instalação mecânica (estrutura + módulos)',
      semana: semanaParecerFim, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Fixação da estrutura metálica, instalação dos módulos fotovoltaicos, string box CC',
    },
    {
      fase: '4. Aquisição e Instalação',
      etapa: 'Instalação elétrica (inversores + proteções CA)',
      semana: semanaParecerFim + 1, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Inversor, DPS CA, disjuntor bipolar, cabeamento CA até o QDG, aterramento',
    },

    // FASE 5 — COMISSIONAMENTO
    {
      fase: '5. Comissionamento',
      etapa: 'Testes e comissionamento do sistema',
      semana: semanaParecerFim + 2, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Verificação de Voc, Vmpp, Isc por string. Teste de isolamento. Energização e monitoramento.',
    },
    {
      fase: '5. Comissionamento',
      etapa: 'Solicitação de vistoria CEMIG',
      semana: semanaParecerFim + 2, duracao: 0.5,
      responsavel: 'Lumen',
      // CORRIGIDO (ago/2026): o texto anterior ("Prazo CEMIG: até 30 dias
      // úteis") atribuía a ESTA etapa — a própria solicitação, uma ação quase
      // instantânea do instalador/Lumen — o prazo que na verdade pertence à
      // etapa SEGUINTE (CEMIG realizar a vistoria depois de solicitada). O
      // prazo que de fato se aplica a ESTA ação é outro, e é do acessante, não
      // da CEMIG: "O acessante deve solicitar vistoria em até 120 (cento e
      // vinte) dias após a emissão do parecer de acesso" (Manual do Usuário —
      // Sistema APR Web, CEMIG, v.2H/23-12-2021, seção 7.6, card "Vistoria de
      // Mini/Microgeração Distribuída"). O cronograma já agenda a solicitação
      // ~2 semanas após o fim do Parecer — bem dentro da janela de 120 dias —
      // então não é uma correção de data, só de rótulo.
      descricao: 'Solicitar vistoria no portal CEMIG Atende. Prazo do ACESSANTE para solicitar: até 120 dias após a emissão do Parecer de Acesso (Manual APR Web CEMIG, 7.6).',
    },
    {
      fase: '5. Comissionamento',
      etapa: 'Vistoria CEMIG e troca do medidor',
      semana: semanaParecerFim + 3, duracao: 4,
      responsavel: 'CEMIG',
      // CORRIGIDO (ago/2026): a descrição citava só o prazo de troca do
      // medidor (~30 dias após vistoria favorável), omitindo o prazo da
      // CEMIG para REALIZAR a vistoria em si (até 30 dias úteis após
      // solicitada — o prazo que a etapa anterior citava incorretamente).
      // As duas etapas foram unificadas num único bloco de 4 semanas no
      // cronograma; o texto agora deixa claro que são dois prazos
      // sequenciais somados, não um só — útil para quem for reconciliar o
      // cronograma gerado com o andamento real do pedido no APR Web.
      descricao: 'Inspeção técnica CEMIG (prazo CEMIG p/ realizar: até 30 dias úteis após solicitada) + troca do medidor para bidirecional após aprovação (prazo: ~30 dias). Bloco de 4 semanas soma os dois prazos sequenciais.',
    },

    // FASE 6 — ENTREGA
    {
      fase: '6. Entrega e Pós-Obra',
      etapa: 'Entrega da documentação ao cliente',
      semana: semanaParecerFim + 7, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Manual do sistema, garantias, ART, memorial, cópia do parecer e contrato CEMIG',
    },
    {
      fase: '6. Entrega e Pós-Obra',
      etapa: 'Verificação da primeira fatura com créditos',
      semana: semanaParecerFim + 7, duracao: 1,
      responsavel: 'Lumen + CEMIG',
      descricao: 'Confirmar que os créditos estão sendo gerados e faturados corretamente. Monitorar geração.',
    },
  ];

  // ── Construir planilha ─────────────────────────────────────────────────────
  const hoje = new Date(dados.dataInicio);
  const N_SEMANAS = 16;
  let row = 1;

  const set = (r: number, c: number, v: any) => {
    const coord = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
    ws[coord] = { v, t: typeof v === 'number' ? 'n' : 's' };
  };

  // Cabeçalho
  set(1, 1, 'CRONOGRAMA DE OBRA — SISTEMA FOTOVOLTAICO');
  set(2, 1, dados.nomeCliente);
  set(3, 1, dados.enderecoInstalacao);
  set(4, 1, `${dados.potenciaKWp} kWp | ${dados.numModulos} módulos | Início: ${addWeeks(dados.dataInicio, 0)}`);
  set(5, 1, `Elaborado por: ${dados.empresa} — ${dados.responsavelTecnico}`);

  // BUG CORRIGIDO (ago/2026): `Etapa.descricao` é preenchida para toda etapa
  // (prazos, normas, responsabilidades — inclusive os dois textos logo acima
  // corrigidos com fonte no Manual do Usuário do APR Web da CEMIG) mas nunca
  // era escrita na planilha — o loop abaixo só escrevia Fase/Etapa/
  // Responsável/Início/Término/barras de Gantt. O cliente/empresa que abre o
  // cronograma gerado nunca via nenhuma dessas descrições, por mais detalhe
  // que tivessem: o campo existia no código e era só descartado no render.
  // Corrigido adicionando uma coluna "Descrição / Prazos" após as 16 colunas
  // de semana (coluna N_SEMANAS+6 = 22, 1-indexado).
  const COL_DESC = N_SEMANAS + 6;
  ws['!cols'] = [{ wch: 26 }, { wch: 34 }, { wch: 14 }, { wch: 11 }, { wch: 11 }];
  for (let s = 1; s <= N_SEMANAS; s++) ws['!cols'].push({ wch: 6 });
  ws['!cols'].push({ wch: 70 });

  row = 7;
  // Header das semanas
  set(row, 1, 'Fase');
  set(row, 2, 'Etapa');
  set(row, 3, 'Responsável');
  set(row, 4, 'Início');
  set(row, 5, 'Término');

  for (let s = 1; s <= N_SEMANAS; s++) {
    set(row, 5 + s, `S${s}\n${addWeeks(dados.dataInicio, s - 1)}`);
  }
  set(row, COL_DESC, 'Descrição / Prazos');

  row++;

  // Etapas
  for (const et of etapas) {
    set(row, 1, et.fase);
    set(row, 2, et.etapa);
    set(row, 3, et.responsavel);
    set(row, 4, addWeeks(dados.dataInicio, et.semana - 1));
    set(row, 5, addWeeks(dados.dataInicio, et.semana + et.duracao - 1));
    set(row, COL_DESC, et.descricao);

    // Barras Gantt
    for (let s = 1; s <= N_SEMANAS; s++) {
      if (s >= et.semana && s < et.semana + Math.max(et.duracao, 0.5)) {
        const isCemig = et.responsavel === 'CEMIG';
        set(row, 5 + s, isCemig ? '◆' : '█');
      }
    }
    row++;
  }

  // Legenda
  row += 2;
  set(row, 1, 'Legenda:');
  set(row, 2, '█ = Responsabilidade Lumen Soluções');
  row++;
  set(row, 2, '◆ = Responsabilidade CEMIG (prazo definido pela distribuidora)');
  row++;
  set(row, 2, 'Prazos CEMIG: Parecer de Acesso 15 d.u. (MicroGD) | Vistoria até 30 d.u. | Medidor até 30 d após vistoria');
  row++;
  set(row, 2, 'Prazo APR Web: documentação deve ser enviada em até 24h após protocolo. Atraso = cancelamento automático.');
  row++;
  set(row, 2, `Gerado em: ${new Date().toLocaleDateString('pt-BR')} por ${dados.empresa} | CEMIG ND 5.30 + REN ANEEL 1.000/2021`);

  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: row, c: N_SEMANAS + 6 });

  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');

  const nomeArquivo = `Cronograma_${dados.nomeCliente.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${dados.potenciaKWp}kWp.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
