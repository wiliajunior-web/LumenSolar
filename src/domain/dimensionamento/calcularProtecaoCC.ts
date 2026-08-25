/**
 * PROTEÇÃO E CABEAMENTO DO LADO CC (STRINGS FOTOVOLTAICAS)
 * Baseado em: NBR 16690:2019 5.3.3 (tensão) e 5.4.2 (fusível de string) +
 * IEC 60364-7-712 (fator 1,25) + NBR 16612 Tab. C.2 (FTA cabo solar XLPE 90°C)
 *
 * EXTRAÍDO de `ComponentesRecomendados` em App.tsx (onde essa lógica já
 * rodava, inline e sem cobertura de teste, desde antes desta sessão — só
 * movida para cá e testada; nenhuma fórmula foi alterada). Motivo da
 * extração: o Diagrama Unifilar Básico (DUB) precisa exibir exatamente os
 * mesmos valores de proteção CC que já aparecem no passo "Kit Solar" da UI
 * — duplicar a fórmula ali e aqui seria dois lugares para divergir com o
 * tempo. Ver também `calcularCaboCA.ts` (lado CA, já era um módulo à parte).
 */

// FTA XLPE 90°C (NBR 16612 Tab. C.2 / IEC 60364-5-52)
const TABELA_FTA_XLPE90: Array<[number, number]> = [
  [30, 1.00], [40, 0.91], [50, 0.82], [60, 0.71], [70, 0.58], [80, 0.41],
];

const SECOES_CABO_CC: Array<{ secaoMm2: number; imaxA: number }> = [
  { secaoMm2: 4.0,  imaxA: 32.0 },
  { secaoMm2: 6.0,  imaxA: 41.0 },
  { secaoMm2: 10.0, imaxA: 57.0 },
  { secaoMm2: 16.0, imaxA: 76.0 },
];

const FUSIVEIS_PADRAO_A = [8, 10, 12, 15, 20, 25, 30] as const;

const TEMPERATURA_MINIMA_PROJETO_C = 5; // NBR 16690:2019 5.3.3
const LIMITE_TENSAO_CC_V = 1000;        // NBR 16690:2019 5.3.3

function interpolarFTA(tempC: number): number {
  const t = Math.min(80, Math.max(30, tempC));
  for (let i = 0; i < TABELA_FTA_XLPE90.length - 1; i++) {
    const [tA, fA] = TABELA_FTA_XLPE90[i];
    const [tB, fB] = TABELA_FTA_XLPE90[i + 1];
    if (t >= tA && t <= tB) {
      const r = (t - tA) / (tB - tA);
      return parseFloat((fA + r * (fB - fA)).toFixed(3));
    }
  }
  return TABELA_FTA_XLPE90[TABELA_FTA_XLPE90.length - 1][1];
}

export interface ParamsProtecaoCC {
  /** Corrente de curto-circuito do módulo (datasheet, STC) — A */
  iscA: number;
  vocV: number;
  numStrings: number;
  modulosPorString: number;
  /**
   * Coeficiente de temperatura usado para corrigir Voc no frio. O datasheet
   * do kit hoje só guarda o coeficiente de Pmax (não um de Voc dedicado);
   * |β_Voc| é tipicamente menor que |γ_Pmax|, então usar o de Pmax
   * SUPERESTIMA a alta de Voc no frio — conservador (nunca subestima o
   * risco de passar de 1000V), mas não é o valor real do módulo.
   */
  coeficienteTemperaturaPercentPorC: number;
  temperaturaMinimaProjetoC?: number;
  temperaturaInstalacaoC?: number;
}

export interface ResultadoProtecaoCC {
  correnteCurtoCircuitoTotalA: number;
  correnteProjetoA: number;
  fta: number;
  correnteProjetoComFtaA: number;
  secaoCaboMm2: number;
  izCaboA: number;
  izCorrigidaA: number;
  dpsClasseKA: number;
  vocSistemaV: number;
  vocMaximoFrioV: number;
  limiteTensaoV: number;
  dentroDoLimiteTensao: boolean;
  fusivelStringA: number;
  alertas: string[];
}

export function calcularProtecaoCC(params: ParamsProtecaoCC): ResultadoProtecaoCC {
  const {
    iscA, vocV, numStrings, modulosPorString,
    coeficienteTemperaturaPercentPorC,
    temperaturaMinimaProjetoC = TEMPERATURA_MINIMA_PROJETO_C,
    temperaturaInstalacaoC = 40,
  } = params;

  const alertas: string[] = [];

  // Corrente CC — fator 1,25 (IEC 60364-7-712)
  const correnteCurtoCircuitoTotalA = iscA * numStrings;
  const correnteProjetoA = correnteCurtoCircuitoTotalA * 1.25;
  const fta = interpolarFTA(temperaturaInstalacaoC);
  const correnteProjetoComFtaA = correnteProjetoA / fta;

  const cabo = SECOES_CABO_CC.find((s) => s.imaxA >= correnteProjetoComFtaA)
    ?? SECOES_CABO_CC[SECOES_CABO_CC.length - 1];
  const izCorrigidaA = parseFloat((cabo.imaxA * fta).toFixed(1));
  if (cabo.imaxA < correnteProjetoComFtaA) {
    alertas.push('Corrente CC acima da maior seção tabelada (16mm²) — consultar engenheiro especialista');
  }

  // DPS CC — classe por corrente de curto do módulo
  const dpsClasseKA = iscA > 0 ? (iscA <= 12 ? 5 : 10) : 0;

  // Voc do sistema corrigido por temperatura mínima (NBR 16690:2019 5.3.3)
  const vocSistemaV = vocV * modulosPorString;
  const vocMaximoFrioV = vocSistemaV * (1 + (coeficienteTemperaturaPercentPorC / 100) * (temperaturaMinimaProjetoC - 25));
  const dentroDoLimiteTensao = vocMaximoFrioV <= LIMITE_TENSAO_CC_V;
  if (!dentroDoLimiteTensao) {
    alertas.push(`Voc no frio (${vocMaximoFrioV.toFixed(0)}V) excede o limite de ${LIMITE_TENSAO_CC_V}V (NBR 16690:2019 5.3.3) — reduzir módulos por string`);
  }

  // Fusível de string — NBR 16690:2019 5.4.2: Isc ≤ Ifuse ≤ 2,5×Isc
  const fusivelStringA = FUSIVEIS_PADRAO_A.find((f) => f >= iscA && f <= 2.5 * iscA) ?? 0;
  if (iscA > 0 && fusivelStringA === 0) {
    alertas.push('Nenhum fusível padrão atende Isc ≤ F ≤ 2,5×Isc — verificar manualmente');
  }

  return {
    correnteCurtoCircuitoTotalA: parseFloat(correnteCurtoCircuitoTotalA.toFixed(2)),
    correnteProjetoA: parseFloat(correnteProjetoA.toFixed(2)),
    fta,
    correnteProjetoComFtaA: parseFloat(correnteProjetoComFtaA.toFixed(2)),
    secaoCaboMm2: cabo.secaoMm2,
    izCaboA: cabo.imaxA,
    izCorrigidaA,
    dpsClasseKA,
    vocSistemaV: parseFloat(vocSistemaV.toFixed(1)),
    vocMaximoFrioV: parseFloat(vocMaximoFrioV.toFixed(1)),
    limiteTensaoV: LIMITE_TENSAO_CC_V,
    dentroDoLimiteTensao,
    fusivelStringA,
    alertas,
  };
}

/**
 * DPS CA — classe por potência/risco (NBR IEC 62305-3).
 * EXTRAÍDO de `ComponentesRecomendados` em App.tsx (mesma lógica, agora testada).
 */
export function calcularDPSCA(potCA_kW: number): { classeKA: number; descricao: string } {
  const classeKA = potCA_kW <= 3 ? 15 : potCA_kW <= 12 ? 20 : 45;
  const descricao = classeKA === 15
    ? 'Residencial baixa exposição'
    : classeKA === 20
      ? 'Residencial/comercial padrão'
      : 'Alta exposição / industrial';
  return { classeKA, descricao };
}
