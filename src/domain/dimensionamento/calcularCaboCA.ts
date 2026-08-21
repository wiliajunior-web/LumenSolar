/**
 * DIMENSIONAMENTO DE CONDUTORES CA E PROTEÇÃO
 * Baseado em: NBR 5410 (Tabela 36, Método C) + NBR 16690 5.4
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

// ── Tabela NBR 5410 Tabela 36 — Método C (condutor Cu, PVC 70°C, T_ref=30°C) ──
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
  [25, 1.04],
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

  for (const [s, iz] of TABELA_SECAO_IZ) {
    if (iz < Iz_req) continue;                         // cabo insuficiente
    const izCorr = parseFloat((iz * fta).toFixed(2));
    const disj = DISJUNTORES_IEC.find(d => d >= Ib && d <= izCorr);
    if (disj) {
      secaoMm2 = s; Iz_cabo = iz; Iz_corrigida = izCorr; disjuntor = disj;
      break;
    }
    // Sem disjuntor adequado → tentar próximo tamanho de cabo
  }

  if (Iz_req > TABELA_SECAO_IZ[TABELA_SECAO_IZ.length - 1][1]) {
    alertas.push('Corrente acima da tabela — consultar engenheiro especialista');
  }

  if (disjuntor > Iz_corrigida) {
    alertas.push(
      `Disjuntor ${disjuntor}A excede Iz'=${Iz_corrigida.toFixed(1)}A — aumentar seção do cabo`
    );
  }

  // 7. Queda de tensão (NBR 5410): ΔU = α × ρ × Ib × L / (U × S)
  // α: 2 para mono/bifásico, 1.73 para trifásico
  // ρ: 0,018 Ω·mm²/m (cobre)
  const alpha = tipoLigacao === 'trifasica' ? 1.73 : 2;
  const rho = 0.018;
  const dU_V = alpha * rho * Ib * comprimentoCaboCAm / (tensaoSaidaV * secaoMm2);
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
