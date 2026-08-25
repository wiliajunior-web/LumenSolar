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
  if (p.distribuidora.tarifaKWhComICMS < 0) throw new Error('Tarifa da distribuidora não pode ser negativa.');
  if (p.cipRS < 0) throw new Error('CIP/COSIP não pode ser negativo.');
  if (p.consumoMedioMensalKWh < 0) throw new Error('Consumo médio mensal não pode ser negativo.');
  const kwhMinimo = KWH_DISPONIBILIDADE[p.tipoLigacao];
  const taxaDisponibilidadeRS = kwhMinimo * p.distribuidora.tarifaKWhComICMS;

  // energia compensada = mínimo entre geração e consumo (não pode créditar mais que consome)
  const energiaCompensadaKWh = Math.min(p.geracaoMensalKWh, p.consumoMedioMensalKWh);

  const fracaoFioB = p.fracaoTarifaFioB ?? FRACAO_FATURA_FIO_B_PADRAO;
  const tarifaFioBKWh = p.distribuidora.tarifaKWhComICMS * fracaoFioB;
  const custoBFioMensalRS = energiaCompensadaKWh * tarifaFioBKWh * p.percentualFioB;

  // BUG CORRIGIDO (ago/2026): quando geração < consumo (sistema subdimensionado,
  // cenário aceito por dimensionarSistema com percentualCompensacaoDesejado < 1),
  // a energia não compensada (consumo - energiaCompensadaKWh) é efetivamente
  // importada da rede à tarifa cheia, mas nunca era cobrada em contaAposRS — o
  // código tratava como se o sistema sempre cobrisse 100% do consumo. Verificado
  // manualmente: consumo=500kWh, geração=250kWh (50% de compensação), tarifa=R$1,00,
  // CIP=R$18, FioB=60% → contaAposRS antigo=R$100,50 (economia R$417,50/mês);
  // contaAposRS correto=R$320,50 (economia real ≈R$197,50/mês) — o código antigo
  // relatava mais que o dobro da economia real. Em cenários com geração ≥ consumo
  // (percentualCompensacaoDesejado ≥ 100%, único caminho hoje alcançável pela UI de
  // Estratégia de kWp), energiaNaoCompensadaKWh = 0 e este termo não altera nada.
  const energiaNaoCompensadaKWh = Math.max(0, p.consumoMedioMensalKWh - energiaCompensadaKWh);
  const custoEnergiaNaoCompensadaRS = energiaNaoCompensadaKWh * p.distribuidora.tarifaKWhComICMS;

  const totalFixoMensalRS = taxaDisponibilidadeRS + p.cipRS + custoBFioMensalRS;
  const contaAntesRS = p.consumoMedioMensalKWh * p.distribuidora.tarifaKWhComICMS + p.cipRS;
  const contaAposRS = Math.max(totalFixoMensalRS, taxaDisponibilidadeRS + p.cipRS) + custoEnergiaNaoCompensadaRS;
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
 * do Fio B ano a ano (Lei 14.300/2022), o reajuste tarifário esperado e a
 * degradação da geração dos módulos — os três efeitos que fazem a economia
 * mensal real variar ano a ano ao longo do horizonte do projeto.
 *
 * `anoBase` é o ano civil correspondente ao ano 1 da projeção (normalmente o
 * ano corrente, quando o sistema é instalado) — cada elemento de `anos` deve
 * ser um ano civil ≥ anoBase.
 */
export function projetarCustosAnuais(
  base: ParametrosCustosRecorrentes,
  percentuaisFioBPorAno: Record<number, number> | ((ano: number) => number),
  reajusteTarifarioAnual: number,
  anos: number[],
  degradacaoAnualModulos: number = 0,
  anoBase: number = new Date().getFullYear()
): Array<{ ano: number; custos: ResultadoCustosRecorrentes }> {
  const pctFioB = (ano: number) =>
    typeof percentuaisFioBPorAno === 'function' ? percentuaisFioBPorAno(ano) : (percentuaisFioBPorAno[ano] ?? 1);
  return anos.map((ano) => {
    const fatorReajuste = Math.pow(1 + reajusteTarifarioAnual, ano - anoBase);
    const fatorDegradacao = Math.pow(1 - degradacaoAnualModulos, ano - anoBase);
    const distribuidoraReajustada: Distribuidora = {
      ...base.distribuidora,
      tarifaKWhComICMS: base.distribuidora.tarifaKWhComICMS * fatorReajuste,
    };
    const custos = calcularCustosRecorrentes({
      ...base,
      distribuidora: distribuidoraReajustada,
      geracaoMensalKWh: base.geracaoMensalKWh * fatorDegradacao,
      cipRS: base.cipRS,
      percentualFioB: pctFioB(ano),
    });
    return { ano, custos };
  });
}
