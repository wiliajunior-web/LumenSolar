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
  // ADICIONADO (set/2026, auditoria "rode com valores absurdos"): geracaoMensalKWh
  // negativo não era guardado — hoje nunca chega negativo pela UI (vem sempre do
  // dimensionamento, que já é >= 0), mas a função é pública e projetarCustosAnuais
  // a alimenta com geracaoMensalKWh degradado ano a ano (fatorDegradacao pode ficar
  // negativo se degradacaoAnualModulos > 1, um valor didático/absurdo mas aceito
  // sem checagem por projetarCustosAnuais). Sem este guard, geração negativa vira
  // energiaCompensadaKWh negativa (Math.min com consumo positivo) e distorce
  // silenciosamente custoBFioMensalRS e contaAposRS para valores sem sentido físico,
  // em vez de avisar que a entrada é inválida.
  if (p.geracaoMensalKWh < 0) throw new Error('Geração mensal não pode ser negativa.');
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
  // código tratava como se o sistema sempre cobrisse 100% do consumo.
  const energiaNaoCompensadaKWh = Math.max(0, p.consumoMedioMensalKWh - energiaCompensadaKWh);

  // BUG CORRIGIDO (set/2026, auditoria "rode com valores absurdos" — achado ao
  // auditar o código adjacente ao guard de geracaoMensalKWh acima): o comentário
  // do bug de ago/2026 (linhas acima) já continha, ele mesmo, a conta manual
  // correta — "contaAposRS correto=R$320,50" — mas a IMPLEMENTAÇÃO que foi
  // commitada logo abaixo não batia com essa própria conta: ela soma
  // custoEnergiaNaoCompensadaRS (energiaNaoCompensadaKWh × tarifa cheia) por
  // cima de taxaDisponibilidadeRS, em vez de aplicar a taxaDisponibilidadeRS
  // como PISO mínimo (REN ANEEL 414/2010: o consumidor paga o maior entre o
  // consumo medido e o mínimo de disponibilidade — nunca os dois somados). O
  // teste que acompanhava aquele commit também esperava o valor duplicado
  // (R$350,50), então "passava" sem que ninguém comparasse com a própria conta
  // manual do comentário — exatamente o tipo de erro que "teste passa" não
  // prova ("implementado" ≠ "testado" ≠ "verificado com dados reais").
  //
  // Verificado de novo, independentemente, com os mesmos valores do exemplo
  // original (consumo=500kWh, geração=250kWh, tarifa=R$1,00, CIP=R$18,
  // FioB=60%, kwhMinimo monofásico=30kWh):
  //   energiaNaoCompensadaKWh = 500-250 = 250
  //   kWhFaturado = max(250, 30) = 250 (o consumo real já supera o mínimo, o
  //     mínimo só "aparece" na conta quando o consumidor consome MENOS que ele)
  //   custoEnergiaFaturadaRS = 250 × 1,00 = 250,00
  //   contaAposRS = 250,00 + 18,00 (CIP) + 52,50 (Fio B) = R$320,50  ✓ bate com
  //     o comentário original de ago/2026, que a implementação nunca seguiu.
  //   economiaMensalRS = 518,00 - 320,50 = R$197,50 — também bate com o
  //     comentário original ("economia real ≈R$197,50/mês").
  //
  // Reachability confirmada nesta auditoria: o campo "Livre" da Estratégia de
  // kWp (App.tsx, StrategiaKwp) tem min="100" no <input type="number">, mas
  // esse atributo HTML não bloqueia digitação nem é validado no onChange — o
  // usuário digita, por exemplo, 50 e percentualCompensacaoDesejado vira 0.5
  // sem nenhum aviso, ao contrário do que um comentário anterior desta função
  // presumia ("único caminho hoje alcançável... ≥ 100%"). Esse presuposto
  // nunca foi verificado contra o código do input — outra lição da auditoria:
  // não herdar uma afirmação de reachability sem checar a UI de novo.
  const custoEnergiaFaturadaRS = Math.max(energiaNaoCompensadaKWh, kwhMinimo) * p.distribuidora.tarifaKWhComICMS;

  const totalFixoMensalRS = taxaDisponibilidadeRS + p.cipRS + custoBFioMensalRS;
  const contaAntesRS = p.consumoMedioMensalKWh * p.distribuidora.tarifaKWhComICMS + p.cipRS;
  const contaAposRS = custoEnergiaFaturadaRS + p.cipRS + custoBFioMensalRS;
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
