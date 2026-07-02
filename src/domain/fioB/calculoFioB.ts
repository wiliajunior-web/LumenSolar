import {
  DATA_PUBLICACAO_LEI_14300,
  ESCALONAMENTO_FIO_B_ART27,
  LIMITE_MICROGERACAO_KW,
  LIMITE_MINIGERACAO_NAO_DESPACHAVEL_KW,
  LIMITE_PARTICIPACAO_REGRA_ESPECIAL_PERCENT,
  LIMITE_POTENCIA_REGRA_ESPECIAL_KW,
  ParametrosEnquadramentoGD,
  PRAZO_TRANSICAO_ART26_FIM,
} from './types';

export type ClasseGD = 'microgeracao' | 'minigeracao';

export interface ResultadoEnquadramento {
  classe: ClasseGD;
  /** Unidade tem direito à regra de transição do art. 26 (até 2045)? */
  elegivelArt26: boolean;
  /** Aplica-se a regra especial do art. 27 §1º (100% Fio B + 40% Rede Básica até 2028)? */
  regraEspecialArt27Paragrafo1: boolean;
  observacoes: string[];
}

function addMonths(iso: string, months: number): Date {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Classifica a central como microgeração ou minigeração e verifica se a
 * unidade tem direito à regra de transição do art. 26 (existentes na data de
 * publicação da lei, ou que protocolaram solicitação de acesso em até 12
 * meses dessa data).
 */
export function classificarEnquadramento(params: ParametrosEnquadramentoGD): ResultadoEnquadramento {
  const observacoes: string[] = [];
  const classe: ClasseGD = params.potenciaInstaladaKW <= LIMITE_MICROGERACAO_KW ? 'microgeracao' : 'minigeracao';

  if (classe === 'minigeracao' && params.potenciaInstaladaKW > LIMITE_MINIGERACAO_NAO_DESPACHAVEL_KW) {
    observacoes.push(
      'Potência acima de 3 MW para fonte não despachável: fora do limite padrão de minigeração (verificar enquadramento como geração centralizada/ACL).'
    );
  }

  const protocolo = new Date(params.dataProtocoloAcesso + 'T00:00:00Z');
  const prazoLimite12Meses = addMonths(DATA_PUBLICACAO_LEI_14300, 12);
  const elegivelArt26 = protocolo.getTime() <= prazoLimite12Meses.getTime();

  if (elegivelArt26) {
    observacoes.push(
      `Regra de transição do art. 26 aplicável até ${PRAZO_TRANSICAO_ART26_FIM} (protocolo dentro dos 12 meses após a publicação da lei).`
    );
  } else {
    observacoes.push('Fora do prazo do art. 26 — aplica-se o escalonamento do art. 27 desde o início.');
  }

  const regraEspecialArt27Paragrafo1 =
    classe === 'minigeracao' &&
    params.potenciaInstaladaKW > LIMITE_POTENCIA_REGRA_ESPECIAL_KW &&
    params.fonte !== 'biogas' && // simplificação: tratamos como "não despachável" tudo exceto biogás/biomassa/hidro/cogeração
    params.fonte !== 'biomassa' &&
    params.fonte !== 'hidrica' &&
    (params.modalidade === 'autoconsumo_remoto' || params.modalidade === 'geracao_compartilhada') &&
    (params.participacaoMaiorTitularPercent ?? 0) >= LIMITE_PARTICIPACAO_REGRA_ESPECIAL_PERCENT;

  if (regraEspecialArt27Paragrafo1) {
    observacoes.push(
      'Regra especial do art. 27 §1º: 100% das componentes de remuneração/depreciação/O&M e 100% de P&D/EE/TFSEE incidem até 2028 (não se aplica o escalonamento gradual).'
    );
  }

  return { classe, elegivelArt26, regraEspecialArt27Paragrafo1, observacoes };
}

/**
 * Percentual da componente Fio B que incide sobre a energia compensada em um
 * determinado ano civil, dado o enquadramento da unidade.
 *
 * - Se elegível ao art. 26: retorna um percentual residual mínimo (a regra de
 *   transição cobra apenas sobre o saldo líquido positivo entre consumo e
 *   geração+créditos — não há escalonamento percentual sobre o Fio B em si).
 *   Para fins de simulação financeira, tratamos como 0% de incidência
 *   adicional de Fio B sobre a energia compensada, já que o consumidor é
 *   faturado pela regra do art. 16/26 (diferença líquida), não pelo
 *   escalonamento do art. 27.
 * - Se regra especial do art. 27 §1º: 100% até 2028, regra do art. 17 a partir de 2029.
 * - Caso geral (art. 27): escalonamento da tabela ESCALONAMENTO_FIO_B_ART27.
 */
export function percentualFioBPorAno(enquadramento: ResultadoEnquadramento, ano: number): number {
  if (enquadramento.elegivelArt26 && ano <= 2045) {
    return 0;
  }

  if (enquadramento.regraEspecialArt27Paragrafo1) {
    return ano <= 2028 ? 1 : 1; // 100% das componentes de distribuição; a partir de 2029 regra plena (também ~100% sobre o que não é custo de energia)
  }

  const faixa = [...ESCALONAMENTO_FIO_B_ART27].reverse().find((f) => ano >= f.ano);
  if (!faixa) {
    // ano anterior a 2023: lei ainda não previa cobrança escalonada
    return 0;
  }
  if (ano >= 2029) {
    return 1;
  }
  return faixa.percentual;
}

/**
 * Calcula o custo anual estimado de Fio B sobre a energia compensada.
 *
 * @param energiaCompensadaAnualKWh energia anual compensada via SCEE (kWh)
 * @param tarifaFioBPorKWh valor da tarifa de Fio B (componente TUSD) em R$/kWh
 * @param enquadramento resultado de classificarEnquadramento()
 * @param ano ano civil de referência para a tarifação
 */
export function custoAnualFioB(
  energiaCompensadaAnualKWh: number,
  tarifaFioBPorKWh: number,
  enquadramento: ResultadoEnquadramento,
  ano: number
): number {
  const percentual = percentualFioBPorAno(enquadramento, ano);
  return energiaCompensadaAnualKWh * tarifaFioBPorKWh * percentual;
}
