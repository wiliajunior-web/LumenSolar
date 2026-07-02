import { Distribuidora, KWH_DISPONIBILIDADE, TipoLigacao } from '../../data/distribuidoras';

export interface ParametrosCustosRecorrentes {
  distribuidora: Distribuidora;
  tipoLigacao: TipoLigacao;
  /** CIP/COSIP mensal em R$ — valor do município do cliente (editável). */
  cipRS: number;
  /** Consumo médio mensal em kWh (antes do solar). */
  consumoMedioMensalKWh: number;
  /** Geração mensal estimada do sistema solar em kWh. */
  geracaoMensalKWh: number;
  /** Percentual do Fio B que incide no ano considerado (0 a 1). */
  percentualFioB: number;
  /** Fração da tarifa total que representa o Fio B (TUSD de distribuição). Valor típico: ~0,35. */
  fracaoTarifaFioB?: number;
}

export interface ResultadoCustosRecorrentes {
  /** Valor mínimo cobrado pela distribuidora (taxa de disponibilidade) em R$. */
  taxaDisponibilidadeRS: number;
  /** CIP/COSIP mensal em R$. */
  cipRS: number;
  /** Custo do Fio B sobre a energia compensada (escalonamento Lei 14.300). */
  custoBFioMensalRS: number;
  /** Total de custos fixos mensais que persistem após a instalação solar. */
  totalFixoMensalRS: number;
  /** Estimativa da conta mensal ANTES do solar (referência). */
  contaAntesRS: number;
  /** Estimativa da conta mensal APÓS o solar (somente os custos fixos + eventual saldo). */
  contaAposRS: number;
  /** Economia mensal líquida estimada. */
  economiaMensalRS: number;
}

/** Fração típica da tarifa total que representa as componentes de distribuição (Fio B). */
const FRACAO_FATURA_FIO_B_PADRAO = 0.35;

export function calcularCustosRecorrentes(p: ParametrosCustosRecorrentes): ResultadoCustosRecorrentes {
  const kwhMinimo = KWH_DISPONIBILIDADE[p.tipoLigacao];
  const taxaDisponibilidadeRS = kwhMinimo * p.distribuidora.tarifaKWhComICMS;

  // energia compensada = mínimo entre geração e consumo (não pode créditar mais que consome)
  const energiaCompensadaKWh = Math.min(p.geracaoMensalKWh, p.consumoMedioMensalKWh);

  const fracaoFioB = p.fracaoTarifaFioB ?? FRACAO_FATURA_FIO_B_PADRAO;
  const tarifaFioBKWh = p.distribuidora.tarifaKWhComICMS * fracaoFioB;
  const custoBFioMensalRS = energiaCompensadaKWh * tarifaFioBKWh * p.percentualFioB;

  const totalFixoMensalRS = taxaDisponibilidadeRS + p.cipRS + custoBFioMensalRS;
  const contaAntesRS = p.consumoMedioMensalKWh * p.distribuidora.tarifaKWhComICMS + p.cipRS;
  const contaAposRS = Math.max(totalFixoMensalRS, taxaDisponibilidadeRS + p.cipRS);
  const economiaMensalRS = contaAntesRS - contaAposRS;

  return {
    taxaDisponibilidadeRS,
    cipRS: p.cipRS,
    custoBFioMensalRS,
    totalFixoMensalRS,
    contaAntesRS,
    contaAposRS,
    economiaMensalRS,
  };
}

/**
 * Gera a projeção anual dos custos recorrentes considerando o escalonamento
 * do Fio B ano a ano e um reajuste tarifário esperado.
 */
export function projetarCustosAnuais(
  base: ParametrosCustosRecorrentes,
  percentuaisFioBPorAno: Record<number, number>,
  reajusteTarifarioAnual: number,
  anos: number[]
): Array<{ ano: number; custos: ResultadoCustosRecorrentes }> {
  return anos.map((ano) => {
    const fatorReajuste = Math.pow(1 + reajusteTarifarioAnual, ano - new Date().getFullYear());
    const distribuidoraReajustada: Distribuidora = {
      ...base.distribuidora,
      tarifaKWhComICMS: base.distribuidora.tarifaKWhComICMS * fatorReajuste,
    };
    const custos = calcularCustosRecorrentes({
      ...base,
      distribuidora: distribuidoraReajustada,
      cipRS: base.cipRS,
      percentualFioB: percentuaisFioBPorAno[ano] ?? 1,
    });
    return { ano, custos };
  });
}
