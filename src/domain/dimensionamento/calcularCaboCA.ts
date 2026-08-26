/**
 * DIMENSIONAMENTO DE CONDUTORES CA E PROTEÇÃO
 * Baseado em: NBR 5410 (Tabela 36, Método B1 — ver nota em TABELA_SECAO_IZ) + NBR 16690 5.4
 * Fórmulas verificadas contra o curso "Processo Homologatório" (slides 48–58)
 *
 * PROCESSO (conforme curso):
 *  1. Ib = corrente de projeto (corrente máx. saída do inversor)
 *  2. Iz_req = Ib / (FTA × FRS × FAC)    ← bitola mínima sem correção
 *  3. Selecionar cabo com Iz ≥ Iz_req
 *  4. Iz' = Iz × FTA                      ← capacidade corrigida
 *  5. Disjuntor: Ib ≤ In ≤ Iz'
 *  6. Verificar queda de tensão: ΔU = α × ρ × Ib × L / (U × S) ≤ 4%
 */

// ── Tabela NBR 5410 Tabela 36 — Método B1 (condutor Cu, PVC 70°C, T_ref=30°C) ──
// CORRIGIDO (ago/2026): rotulado como "Método C" desde a criação do arquivo, mas os
// valores (17.5/24/32/41/57/76/101/125/151A) são os da coluna B1 da Tabela 36 — a
// coluna C real da NBR 5410 é (19.5/27/36/46/63/85/112/138/168A). O erro de rótulo
// vem do material de origem (curso "Processo Homologatório"); os VALORES em si são
// mais conservadores que Método C real (subdimensiona a favor da segurança, não
// contra), então não é um bug de segurança — só a citação normativa estava errada.
// Formato: [mm², Iz_A]
const TABELA_SECAO_IZ: Array<[number, number]> = [
  [1.5,  17.5],
  [2.5,  24],
  [4,    32],
  [6,    41],
  [10,   57],
  [16,   76],
  [25,   101],
  [35,   125],
  [50,   151],
];

// ── Fatores de correção de temperatura (FTA) — PVC 70°C (NBR 5410 Tabela 40) ──
// FTA = sqrt((70 - T_amb) / (70 - 30))
// Valores tabelados para evitar raiz quadrada em tempo de execução
const FTA_PVC_70: Array<[number, number]> = [
  // CORRIGIDO (ago/2026): era 1.04. A própria fórmula documentada acima
  // (FTA = sqrt((70-T)/(70-30))) dá sqrt(45/40) = 1.0607 para T=25°C — todas
  // as outras 7 linhas desta tabela batem com a fórmula (±0.01); só esta
  // divergia. Afeta a interpolação de calcFTA() para instalações entre 25°C
  // e 30°C (regiões mais frias/de altitude), subestimando levemente a
  // ampacidade corrigida disponível nessa faixa (lado conservador, mas incorreto).
  [25, 1.06],
  [30, 1.00],
  [35, 0.94],
  [40, 0.87],
  [45, 0.79],
  [50, 0.71],
  [55, 0.61],
  [60, 0.50],
];

// ── Disjuntores padrão IEC disponíveis ───────────────────────────────────────
const DISJUNTORES_IEC = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

export interface ResultadoCaboCA {
  // Correntes
  ibA: number;               // Corrente de projeto (máx. inversor)
  izRequeridoA: number;      // Iz mínima sem correção = Ib / FTA
  fta: number;               // Fator correção temperatura
  temperaturaAmbienteC: number;

  // Cabo selecionado
  secaoMm2: number;          // Seção do condutor (mm²)
  izCaboA: number;           // Ampacidade nominal (sem correção)
  izCorrigidaA: number;      // Iz' = Iz × FTA (capacidade corrigida)

  // Proteção
  disjuntorA: number;        // In selecionado (Ib ≤ In ≤ Iz')

  // Queda de tensão (NBR 5410)
  quedaTensaoPct: number;    // ΔU em % — limite: 4% circuitos terminais
  quedaTensaoV: number;      // ΔU em V
  comprimentoMm: number;     // Comprimento do cabo CA informado
  quedaTensaoOk: boolean;    // true se ΔU ≤ 4%

  // Alertas
  alertas: string[];
}

export interface ParamsCaboCA {
  /** Corrente máx. de saída do inversor — datasheet "corrMaxSaidaA" */
  corrMaxSaidaA: number;
  /** Tensão de saída do inversor (V) — ex: 220, 380 */
  tensaoSaidaV: number;
  /** Tipo de ligação — define α na queda de tensão */
  tipoLigacao: 'monofasica' | 'bifasica' | 'trifasica';
  /** Temperatura ambiente máxima no local de instalação (°C) — default 40°C */
  temperaturaAmbienteC?: number;
  /** Comprimento do cabo CA: inversor → QDG (m) — default 10m */
  comprimentoCaboCAm?: number;
  /** FRS: fator de agrupamento de circuitos — default 1 (circuito único) */
  frs?: number;
}

/** Interpola FTA para temperatura intermediária */
function calcFTA(tempC: number): number {
  const tabela = FTA_PVC_70;
  const t = Math.min(60, Math.max(25, tempC));
  for (let i = 0; i < tabela.length - 1; i++) {
    if (t >= tabela[i][0] && t <= tabela[i+1][0]) {
      const ratio = (t - tabela[i][0]) / (tabela[i+1][0] - tabela[i][0]);
      return tabela[i][1] + ratio * (tabela[i+1][1] - tabela[i][1]);
    }
  }
  return tabela[tabela.length-1][1];
}

/**
 * Calcula o condutor CA, disjuntor e queda de tensão.
 * Norma: NBR 5410 (seção e proteção) + NBR 16690 5.4 (proteção CA)
 */
export function calcularCaboCA(params: ParamsCaboCA): ResultadoCaboCA {
  const {
    corrMaxSaidaA,
    tensaoSaidaV,
    tipoLigacao,
    temperaturaAmbienteC = 40,
    comprimentoCaboCAm = 10,
    frs = 1,
  } = params;

  const alertas: string[] = [];

  // 1. Corrente de projeto = corrente máx. de saída do inversor
  const Ib = corrMaxSaidaA;

  // 2. Fator de correção temperatura (FTA)
  const fta = parseFloat(calcFTA(temperaturaAmbienteC).toFixed(4));
  // ADICIONADO (ago/2026): calcFTA() satura silenciosamente fora de [25,60]°C — o
  // alerta de "acima da tabela" já existe para Iz_req fora da faixa (linha abaixo),
  // mas uma temperatura de instalação fora da faixa tabelada não tinha aviso nenhum.
  if (temperaturaAmbienteC < 25 || temperaturaAmbienteC > 60) {
    alertas.push(
      `Temperatura ambiente ${temperaturaAmbienteC}°C fora da faixa tabelada (25–60°C) — ` +
      `FTA calculado com o limite mais próximo (${temperaturaAmbienteC < 25 ? '25' : '60'}°C), verificar manualmente`
    );
  }

  // 3. Iz mínimo requerido (NBR 5410) — Iz ≥ Ib / (FTA × FRS × FAC)
  const FAC = 1; // fator tipo condutor — PVC padrão
  const Iz_req = Ib / (fta * frs * FAC);

  // 4 + 5 + 6. Selecionar cabo + verificar disjuntor disponível (NBR 5410 + slide 53-54)
  // Critério: Ib ≤ In ≤ Iz' — deve existir disjuntor padrão nessa faixa.
  // Se não existir, avançar para o próximo cabo (como o curso demonstra: 6mm² → 10mm²).
  let secaoMm2 = TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][0];
  let Iz_cabo  = TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][1];
  let Iz_corrigida = Iz_cabo * fta;
  let disjuntor = DISJUNTORES_IEC[DISJUNTORES_IEC.length - 1];
  let disjuntorEncontrado = false;

  for (const [s, iz] of TABELA_SECAO_IZ) {
    if (iz < Iz_req) continue;                         // cabo insuficiente
    const izCorr = parseFloat((iz * fta).toFixed(2));
    const disj = DISJUNTORES_IEC.find(d => d >= Ib && d <= izCorr);
    if (disj) {
      secaoMm2 = s; Iz_cabo = iz; Iz_corrigida = izCorr; disjuntor = disj;
      disjuntorEncontrado = true;
      break;
    }
    // Sem disjuntor adequado → tentar próximo tamanho de cabo
  }

  // CORRIGIDO (ago/2026): quando NENHUMA bitola da tabela tem um disjuntor padrão que
  // satisfaça Ib≤In≤Iz' (Ib grande o bastante para passar do maior disjuntor IEC padrão
  // de 100A, mas Iz_req ainda dentro da faixa coberta pela maior bitola de 50mm² — faixa
  // real para inversores comerciais/industriais maiores), o código antes mantinha os
  // valores default definidos ANTES do loop (secaoMm2=50, disjuntor=100) sem verificar
  // se esse disjuntor default sequer cobre Ib. Resultado: disjuntor abaixo da corrente
  // de projeto (In < Ib — dispara em carga normal, violando o próprio critério citado
  // no cabeçalho) entregue SEM nenhum alerta. Ex. hand-verified: Ib=110A, 40°C →
  // fta=0.87 → Iz_req=126,4A (não dispara o alerta "acima da tabela", pois ≤151A) →
  // nenhuma bitola tem disjuntor padrão entre 110A e Iz'_bitola → disjuntor default
  // ficava 100A < 110A, zero alertas. Agora: usa a maior bitola (50mm²) e o MENOR
  // disjuntor padrão que cubra Ib (mesmo que ultrapasse Iz' — o alerta de "excede Iz'"
  // abaixo cobre esse caso), e emite alerta explícito se nem o maior disjuntor padrão
  // (100A) cobrir Ib.
  if (!disjuntorEncontrado && Iz_req <= TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][1]) {
    secaoMm2 = TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][0];
    Iz_cabo = TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][1];
    Iz_corrigida = parseFloat((Iz_cabo * fta).toFixed(2));
    disjuntor = DISJUNTORES_IEC.find(d => d >= Ib) ?? DISJUNTORES_IEC[DISJUNTORES_IEC.length - 1];
  }

  if (Iz_req > TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][1]) {
    alertas.push('Corrente acima da tabela — consultar engenheiro especialista');
  } else if (disjuntor < Ib) {
    alertas.push(
      `Nenhum disjuntor padrão (até ${DISJUNTORES_IEC[DISJUNTORES_IEC.length - 1]}A) cobre ` +
      `Ib=${Ib.toFixed(1)}A com a bitola disponível — consultar engenheiro especialista ` +
      `para disjuntor especial ou paralelismo de condutores`
    );
  }

  if (disjuntor > Iz_corrigida) {
    alertas.push(
      `Disjuntor ${disjuntor}A excede Iz'=${Iz_corrigida.toFixed(1)}A — aumentar seção do cabo`
    );
  }

  // 7. Queda de tensão (NBR 5410): ΔU(V) = α × ρ × Ib × L / S ; ΔU% = ΔU(V) / U × 100
  // α: 2 para mono/bifásico, 1.73 para trifásico
  // ρ: 0,018 Ω·mm²/m (cobre)
  //
  // BUG CORRIGIDO (ago/2026): a versão anterior dividia por `tensaoSaidaV` DUAS vezes —
  // uma vez dentro do que deveria ser dU_V (em Volts) e de novo ao converter para
  // percentual — fazendo dU_pct sair ~220x/380x menor que o real. Na prática,
  // `quedaTensaoOk` nunca dava false, e o Diagrama Unifilar Básico (documento entregue
  // ao cliente/instalador) mostrava "0,00% (OK)" mesmo quando a queda real excedia os
  // 4% da NBR 5410. Verificado manualmente: Ib=14A, L=15m, S=6mm², U=220V, α=2 →
  // ΔU(V) = 2×0,018×14×15/6 = 1,26V → ΔU% = 1,26/220×100 = 0,573% (valor correto;
  // o código antigo retornava 0,0026%, ~220x menor).
  const alpha = tipoLigacao === 'trifasica' ? 1.73 : 2;
  const rho = 0.018;
  const dU_V = alpha * rho * Ib * comprimentoCaboCAm / secaoMm2;
  const dU_pct = parseFloat(((dU_V / tensaoSaidaV) * 100).toFixed(3));
  const quedaOk = dU_pct <= 4.0; // NBR 5410: 4% para circuitos terminais

  if (!quedaOk) {
    alertas.push(
      `Queda de tensão CA ${dU_pct.toFixed(2)}% > 4% (NBR 5410) — ` +
      `aumentar seção ou reduzir comprimento`
    );
  }

  return {
    ibA: parseFloat(Ib.toFixed(2)),
    izRequeridoA: parseFloat(Iz_req.toFixed(2)),
    fta,
    temperaturaAmbienteC,
    secaoMm2,
    izCaboA: Iz_cabo,
    izCorrigidaA: Iz_corrigida,
    disjuntorA: disjuntor,
    quedaTensaoPct: dU_pct,
    quedaTensaoV: parseFloat(dU_V.toFixed(3)),
    comprimentoMm: comprimentoCaboCAm,
    quedaTensaoOk: quedaOk,
    alertas,
  };
}
