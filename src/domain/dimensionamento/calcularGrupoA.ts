/**
 * DIMENSIONAMENTO GRUPO A — Sistemas Fotovoltaicos em Média Tensão
 * Baseado em: curso "Processo Homologatório" (slides sobre Grupo A)
 * + REN ANEEL 1.000/2021 + Lei 14.300/2022
 *
 * Grupo A: consumidores alimentados em média tensão (≥ 2,3 kV).
 * Pagam energia (kWh) separada em postos tarifários P (ponta) e FP (fora ponta),
 * e demanda contratada (kW).
 *
 * CONCEITO CENTRAL:
 *   Sistemas FV geram durante o dia → fora do horário de ponta (18h–21h).
 *   A compensação é calculada em TE (tarifa de energia), não em TUSD.
 *   Fator de compensação Fc = TE_Ponta / TE_ForaPonta
 *   Geração necessária = Media_FP + Fc × Media_Ponta
 *
 * ATENÇÃO: NBR 5410 limita queda de tensão a 7% entre gerador e UC.
 */

const DIAS_MES = 365 / 12; // 30.4167

export interface TarifaGrupoA {
  /** TE Ponta (R$/kWh) — apenas tarifa de energia, sem TUSD */
  tePontaKWh: number;
  /** TE Fora Ponta (R$/kWh) */
  teForaPontaKWh: number;
  /** TUSD Ponta (R$/kWh) */
  tusdPontaKWh: number;
  /** TUSD Fora Ponta (R$/kWh) */
  tusdForaPontaKWh: number;
  /** Tarifa de demanda (R$/kW) */
  demandaKW: number;
}

export interface ConsumoGrupoA {
  /** Histórico: consumo fora ponta por mês (kWh) */
  historicoBFP: number[];
  /** Histórico: consumo ponta por mês (kWh) */
  historicoBP: number[];
  /** Demanda medida fora ponta (kW) — para análise de demanda */
  demandaMedidaFPkW?: number;
  /** Demanda contratada (kW) */
  demandaContratadakW: number;
  /** Subgrupo: A2, A3, A3a, A4, AS */
  subgrupo?: string;
}

export interface ResultadoGrupoA {
  // Médias mensais
  mediaConsumoFPkWh: number;
  mediaConsumoPkWh: number;
  mediaTotalKWh: number;

  // Fator de compensação
  fatorCompensacaoFc: number;   // Fc = TE_P / TE_FP
  geracaoNecessariaKWh: number; // Media_FP + Fc × Media_P

  // Dimensionamento
  potenciaMinKWp: number;
  potenciaRealKWp: number;
  numeroModulos: number;
  geracaoMensalKWh: number;
  geracaoAnualKWh: number;

  // Análise financeira Grupo A
  contaAntesRS: number;
  contaAposRS: number;
  economiaMensalRS: number;
  economiaAnualRS: number;
  reducaoDemandaPossivel: boolean; // se geração reduz pico de demanda

  // Alertas e observações
  alertas: string[];
  observacoes: string[];
}

export interface ParamsGrupoA {
  consumo: ConsumoGrupoA;
  tarifa: TarifaGrupoA;
  hspLocal: number;
  perdasSistema: number;     // decimal — ex: 0.134
  potenciaModuloWp: number;
  percentualCompensacao?: number; // 1.0 = 100%
}

export function calcularDimensionamentoGrupoA(params: ParamsGrupoA): ResultadoGrupoA {
  const { consumo, tarifa, hspLocal, perdasSistema, potenciaModuloWp, percentualCompensacao = 1.0 } = params;
  const alertas: string[] = [];
  const observacoes: string[] = [];

  // ── 1. Médias mensais ──────────────────────────────────────────────────────
  const histFP = consumo.historicoBFP.filter(k => k > 0);
  const histP  = consumo.historicoBP.filter(k => k > 0);
  const mediaFP = histFP.length > 0 ? histFP.reduce((a,b)=>a+b,0)/histFP.length : 0;
  const mediaP  = histP.length  > 0 ? histP.reduce((a,b)=>a+b,0)/histP.length   : 0;
  const mediaTotal = mediaFP + mediaP;

  // ── 2. Fator de compensação (TE_P / TE_FP) ────────────────────────────────
  // Atenção: usar SOMENTE a parcela TE, não TE+TUSD completa
  const Fc = tarifa.teForaPontaKWh > 0
    ? tarifa.tePontaKWh / tarifa.teForaPontaKWh
    : 1;

  observacoes.push(
    `Fc = TE_Ponta(${tarifa.tePontaKWh.toFixed(4)}) / TE_FP(${tarifa.teForaPontaKWh.toFixed(4)}) = ${Fc.toFixed(4)}`
  );
  observacoes.push(
    'Sistema FV gera em FP (período diurno). A geração equivale a mais ' +
    'energia ponta pela relação de preços TE.'
  );

  // ── 3. Geração necessária para compensar tudo ─────────────────────────────
  // Geração_necessária = Media_FP + Fc × Media_Ponta
  const geracaoNecessaria = (mediaFP + Fc * mediaP) * percentualCompensacao;

  // ── 4. Dimensionamento kWp ────────────────────────────────────────────────
  const eficiencia = 1 - perdasSistema;
  const potMinKWp = geracaoNecessaria / (hspLocal * DIAS_MES * eficiencia);
  const nMod = Math.ceil(potMinKWp / (potenciaModuloWp / 1000));
  const potRealKWp = nMod * potenciaModuloWp / 1000;
  const geracaoMensal = potRealKWp * hspLocal * DIAS_MES * eficiencia;
  const geracaoAnual = geracaoMensal * 12;

  // ── 5. Análise financeira Grupo A ─────────────────────────────────────────
  // Conta antes: energia FP + energia P + demanda
  const energiaFP = mediaFP * (tarifa.teForaPontaKWh + tarifa.tusdForaPontaKWh);
  const energiaP  = mediaP  * (tarifa.tePontaKWh + tarifa.tusdPontaKWh);
  const demanda   = consumo.demandaContratadakW * tarifa.demandaKW;
  const contaAntes = energiaFP + energiaP + demanda;

  // Conta após: a geração compensa energia em TE
  // Energia compensada = min(geração, consumo_total) — em energia equivalente TE
  const energiaCompensada = Math.min(geracaoMensal, mediaTotal);
  // Compensação em TE ponderada (a geração ocorre em FP — compensa TE_FP por padrão)
  const valorCompensadoTE = energiaCompensada * tarifa.teForaPontaKWh;
  // TUSD não é compensada integralmente após Lei 14.300/2022 (FioB)
  const contaApos = Math.max(contaAntes - valorCompensadoTE, demanda);
  const economiaMensal = contaAntes - contaApos;

  // ── 6. Verificações ────────────────────────────────────────────────────────
  // Classificação MicroGD / MiniGD
  if (potRealKWp <= 75) {
    observacoes.push(`Sistema ${potRealKWp.toFixed(1)} kWp → Microgeração (≤ 75 kW)`);
  } else if (potRealKWp <= 5000) {
    observacoes.push(`Sistema ${potRealKWp.toFixed(1)} kWp → Minigeração (75 kW–5 MW)`);
  }

  // FioB alerta
  observacoes.push(
    'FioB (Lei 14.300/2022): a TUSD não é compensada integralmente. ' +
    'Para análise completa, use o módulo FioB.'
  );

  // Demanda: solar não reduz demanda contratada automaticamente
  const reducaoDemanda = (consumo.demandaMedidaFPkW ?? 0) > 0 &&
    (potRealKWp > (consumo.demandaMedidaFPkW ?? 0) * 0.5);
  if (reducaoDemanda) {
    alertas.push(
      'Geração ≈ 50% da demanda FP medida. Avaliar redução de demanda contratada ' +
      'após 12 meses de operação (pode gerar economia adicional significativa).'
    );
  }

  if (Fc > 3) {
    alertas.push(
      `Fc=${Fc.toFixed(2)} — tarifa ponta muito acima da FP. ` +
      'Avaliar geração com bateria para injetar no horário de ponta.'
    );
  }

  return {
    mediaConsumoFPkWh: parseFloat(mediaFP.toFixed(1)),
    mediaConsumoPkWh:  parseFloat(mediaP.toFixed(1)),
    mediaTotalKWh:     parseFloat(mediaTotal.toFixed(1)),
    fatorCompensacaoFc: parseFloat(Fc.toFixed(4)),
    geracaoNecessariaKWh: parseFloat(geracaoNecessaria.toFixed(1)),
    potenciaMinKWp:  parseFloat(potMinKWp.toFixed(3)),
    potenciaRealKWp: parseFloat(potRealKWp.toFixed(3)),
    numeroModulos:   nMod,
    geracaoMensalKWh: parseFloat(geracaoMensal.toFixed(1)),
    geracaoAnualKWh:  parseFloat(geracaoAnual.toFixed(1)),
    contaAntesRS:    parseFloat(contaAntes.toFixed(2)),
    contaAposRS:     parseFloat(contaApos.toFixed(2)),
    economiaMensalRS: parseFloat(economiaMensal.toFixed(2)),
    economiaAnualRS:  parseFloat((economiaMensal * 12).toFixed(2)),
    reducaoDemandaPossivel: reducaoDemanda,
    alertas,
    observacoes,
  };
}
