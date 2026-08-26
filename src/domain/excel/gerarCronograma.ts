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
      semana: 4, duracao: 2,
      responsavel: 'Lumen',
      descricao: `${dados.potenciaKWp} kWp — ${dados.numModulos} módulos + inversor + estrutura + materiais elétricos`,
    },
    {
      fase: '4. Aquisição e Instalação',
      etapa: 'Instalação mecânica (estrutura + módulos)',
      semana: 6, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Fixação da estrutura metálica, instalação dos módulos fotovoltaicos, string box CC',
    },
    {
      fase: '4. Aquisição e Instalação',
      etapa: 'Instalação elétrica (inversores + proteções CA)',
      semana: 7, duracao: 1,
      responsavel: 'Lumen',
      descricao: 'Inversor, DPS CA, disjuntor bipolar, cabeamento CA até o QDG, aterramento',
    },

    // FASE 5 — COMISSIONAMENTO
    {
      fase: '5. Comissionamento',
      etapa: 'Testes e comissionamento do sistema',
      semana: 8, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Verificação de Voc, Vmpp, Isc por string. Teste de isolamento. Energização e monitoramento.',
    },
    {
      fase: '5. Comissionamento',
      etapa: 'Solicitação de vistoria CEMIG',
      semana: 8, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Solicitar vistoria no portal CEMIG Atende. Prazo CEMIG: até 30 dias úteis.',
    },
    {
      fase: '5. Comissionamento',
      etapa: 'Vistoria CEMIG e troca do medidor',
      semana: 9, duracao: 4,
      responsavel: 'CEMIG',
      descricao: 'Inspeção técnica CEMIG. Após aprovação: troca do medidor para bidirecional. Prazo: ~30 dias.',
    },

    // FASE 6 — ENTREGA
    {
      fase: '6. Entrega e Pós-Obra',
      etapa: 'Entrega da documentação ao cliente',
      semana: 13, duracao: 0.5,
      responsavel: 'Lumen',
      descricao: 'Manual do sistema, garantias, ART, memorial, cópia do parecer e contrato CEMIG',
    },
    {
      fase: '6. Entrega e Pós-Obra',
      etapa: 'Verificação da primeira fatura com créditos',
      semana: 13, duracao: 1,
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

  row++;

  // Etapas
  for (const et of etapas) {
    set(row, 1, et.fase);
    set(row, 2, et.etapa);
    set(row, 3, et.responsavel);
    set(row, 4, addWeeks(dados.dataInicio, et.semana - 1));
    set(row, 5, addWeeks(dados.dataInicio, et.semana + et.duracao - 1));

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
