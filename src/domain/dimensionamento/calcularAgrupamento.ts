/**
 * AGRUPAMENTO DE UNIDADES CONSUMIDORAS (Dimen. AB)
 * Baseado na planilha "Pre_dimensionamento_FDI.xlsx" — aba "Pre dimensionamento"
 * + REN ANEEL 1.000/2021 (Art. 6°, inciso VIII — agrupamento SCEE)
 * + Lei 14.300/2022 (Art. 2°, §4° — sistema de compensação compartilhada)
 *
 * Aplicação: uma usina serve múltiplas UCs do mesmo CPF/CNPJ ou em condomínio.
 * Os créditos gerados são distribuídos percentualmente entre as UCs.
 */

export interface UnidadeConsumidora {
  /** Identificação da UC */
  id: string;         // ex: 'UC 1', 'UC 2'
  numeroUC?: string;  // número da instalação CEMIG

  /** Consumo mensal por mês (kWh) — 12 valores */
  historico: number[];

  /** Tipo de ligação para cálculo da disponibilidade */
  tipoLigacao: 'monofasica' | 'bifasica' | 'trifasica';

  /** Tarifa da UC (pode ser diferente por UC em casos especiais) */
  tarifaKWh?: number;

  /** Percentual de créditos recebidos desta UC (0-100) */
  percentualCredito: number;

  /** Data de protocolo (para enquadramento FioB) */
  dataProtocolo?: string;
}

export interface ResultadoUC {
  id: string;
  mediaConsumoKWh: number;
  kwhMinDisponibilidade: number;   // 30/50/100 kWh conforme ligação
  consumoCompensavelKWh: number;   // media - disponibilidade
  creditosRecebidosKWh: number;    // geração × percentual
  saldoFinalKWh: number;           // positivo = crédito acumulado
  atendimentoPercent: number;      // % do consumo atendido pelo solar
}

export interface ResultadoAgrupamento {
  // Geração total necessária
  consumoTotalKWh: number;         // soma de todos os consumos médios
  geracaoNecessariaKWh: number;    // consumo total compensável
  potenciaMinKWp: number;
  potenciaRealKWp: number;
  numeroModulos: number;
  geracaoMensalKWh: number;

  // Por UC
  resultadosPorUC: ResultadoUC[];

  // Distribuição de créditos
  totalCreditosDistribuidos: number; // deve ser 100%
  distribuicaoOk: boolean;

  // Classificação do sistema
  classificacao: 'microgeracao' | 'minigeracao';  // ≤75kW ou >75kW
  modalidade: 'autoconsumo_remoto' | 'geracao_compartilhada' | 'condominio';

  alertas: string[];
}

const kWhMin: Record<string, number> = {
  monofasica: 30,
  bifasica: 50,
  trifasica: 100,
};

export function calcularAgrupamento(params: {
  unidades: UnidadeConsumidora[];
  hspLocal: number;
  perdasSistema: number;
  potenciaModuloWp: number;
  percentualCompensacao?: number;
}): ResultadoAgrupamento {
  const { unidades, hspLocal, perdasSistema, potenciaModuloWp, percentualCompensacao = 1.0 } = params;
  const alertas: string[] = [];
  const DIAS_MES = 365 / 12;

  // ── Validações iniciais ────────────────────────────────────────────────────
  const totalPercentual = unidades.reduce((a, u) => a + u.percentualCredito, 0);
  const distribuicaoOk = Math.abs(totalPercentual - 100) < 0.1;

  if (!distribuicaoOk) {
    alertas.push(
      `Distribuição de créditos soma ${totalPercentual.toFixed(1)}% ` +
      `(deve ser exatamente 100%). Ajustar os percentuais.`
    );
  }

  // ── Calcular médias de consumo ────────────────────────────────────────────
  const mediasUC = unidades.map(uc => {
    const validos = uc.historico.filter(k => k > 0);
    return validos.length > 0 ? validos.reduce((a, b) => a + b, 0) / validos.length : 0;
  });

  const consumoTotal = mediasUC.reduce((a, b) => a + b, 0);
  const disponibilidades = unidades.map(uc => kWhMin[uc.tipoLigacao] || 50);
  const totalDisponibilidade = disponibilidades.reduce((a, b) => a + b, 0);
  const consumoCompensavel = Math.max(consumoTotal - totalDisponibilidade, 0);
  const geracaoNecessaria = consumoCompensavel * percentualCompensacao;

  // ── Dimensionamento ────────────────────────────────────────────────────────
  const efic = 1 - perdasSistema;
  const potMinKWp = geracaoNecessaria / (hspLocal * DIAS_MES * efic);
  const nMod = Math.ceil(potMinKWp / (potenciaModuloWp / 1000));
  const potRealKWp = nMod * potenciaModuloWp / 1000;
  const geracaoMensal = potRealKWp * hspLocal * DIAS_MES * efic;

  // ── Distribuição de créditos por UC ───────────────────────────────────────
  const resultadosPorUC: ResultadoUC[] = unidades.map((uc, i) => {
    const media = mediasUC[i];
    const disp = kWhMin[uc.tipoLigacao] || 50;
    const compensavel = Math.max(media - disp, 0);
    const creditos = geracaoMensal * (uc.percentualCredito / 100);
    const saldo = creditos - compensavel;
    const atendimento = compensavel > 0 ? Math.min((creditos / compensavel) * 100, 100) : 0;

    return {
      id: uc.id,
      mediaConsumoKWh: parseFloat(media.toFixed(1)),
      kwhMinDisponibilidade: disp,
      consumoCompensavelKWh: parseFloat(compensavel.toFixed(1)),
      creditosRecebidosKWh: parseFloat(creditos.toFixed(1)),
      saldoFinalKWh: parseFloat(saldo.toFixed(1)),
      atendimentoPercent: parseFloat(atendimento.toFixed(1)),
    };
  });

  // ── Classificação ──────────────────────────────────────────────────────────
  const classificacao = potRealKWp <= 75 ? 'microgeracao' : 'minigeracao';

  // Modalidade — simplificado: se UCs do mesmo CPF/CNPJ = autoconsumo_remoto
  // Se CPFs diferentes = geracao_compartilhada ou condominio
  const modalidade = unidades.length === 1
    ? 'autoconsumo_remoto'
    : 'geracao_compartilhada';

  // ── Alertas ────────────────────────────────────────────────────────────────
  if (unidades.length > 1) {
    alertas.push(
      'Agrupamento: verificar que todas as UCs pertencem ao mesmo CPF/CNPJ ' +
      '(autoconsumo remoto) ou possuem vínculo de condomínio/associação (geração compartilhada). ' +
      'REN 1.000/2021 Art. 6°, VIII.'
    );
  }

  const ucsComExcesso = resultadosPorUC.filter(r => r.saldoFinalKWh > r.mediaConsumoKWh);
  if (ucsComExcesso.length > 0) {
    alertas.push(
      `UCs ${ucsComExcesso.map(u => u.id).join(', ')}: geração excede consumo em >100%. ` +
      'Reduzir percentual de crédito ou redistribuir.'
    );
  }

  resultadosPorUC.forEach(uc => {
    if (uc.atendimentoPercent < 80) {
      alertas.push(`${uc.id}: atendimento ${uc.atendimentoPercent.toFixed(0)}% — aumentar percentual de créditos.`);
    }
  });

  return {
    consumoTotalKWh: parseFloat(consumoTotal.toFixed(1)),
    geracaoNecessariaKWh: parseFloat(geracaoNecessaria.toFixed(1)),
    potenciaMinKWp: parseFloat(potMinKWp.toFixed(3)),
    potenciaRealKWp: parseFloat(potRealKWp.toFixed(3)),
    numeroModulos: nMod,
    geracaoMensalKWh: parseFloat(geracaoMensal.toFixed(1)),
    resultadosPorUC,
    totalCreditosDistribuidos: totalPercentual,
    distribuicaoOk,
    classificacao,
    modalidade,
    alertas,
  };
}
