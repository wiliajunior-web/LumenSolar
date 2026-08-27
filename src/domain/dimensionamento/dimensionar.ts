import { ParametrosDimensionamento, ResultadoDimensionamento } from './types';

// CORRIGIDO (ago/2026): citava "Ref: IEC 61724-1" para esta constante — essa
// norma trata de monitoramento de desempenho de sistemas FV em operação, não
// tem relação com a média de dias por mês (é só 365/12, aritmética básica).
// Mesma citação incorreta encontrada e removida de outros pontos do código
// nesta auditoria (calcularPerdas.ts, calcularFDI.ts, gerarExcel.ts, App.tsx).
/** Média anual de dias por mês: 365/12 = 30.4167. */
const DIAS_MES = 30.4167;

/**
 * Dimensiona um sistema fotovoltaico a partir do consumo médio mensal e da
 * irradiação local, usando o modelo padrão:
 *
 *   Geração diária (kWh) = Potência (kWp) × HSP × (1 - perdas)
 *   Geração mensal (kWh) = Geração diária × 30
 *
 * Resolvendo para a potência necessária a partir do consumo-alvo, depois
 * arredondando para um número inteiro de módulos.
 */
export function dimensionarSistema(params: ParametrosDimensionamento): ResultadoDimensionamento {
  if (params.consumoMedioMensalKWh < 0) throw new Error('Consumo médio mensal não pode ser negativo.');
  if (params.percentualCompensacaoDesejado !== undefined && params.percentualCompensacaoDesejado < 0) {
    throw new Error('Percentual de compensação desejado não pode ser negativo.');
  }
  if (params.hspLocal <= 0) throw new Error('HSP local deve ser maior que zero.');
  if (params.perdasSistema < 0 || params.perdasSistema >= 1) {
    throw new Error('Perdas do sistema devem estar entre 0 e 1 (exclusivo).');
  }
  if (params.potenciaModuloWp <= 0) throw new Error('Potência do módulo deve ser maior que zero.');

  const percentualAlvo = params.percentualCompensacaoDesejado ?? 1;
  const consumoAlvoMensalKWh = params.consumoMedioMensalKWh * percentualAlvo;
  const fatorEficiencia = 1 - params.perdasSistema;

  // kWp necessário = consumo mensal alvo / (HSP * dias * eficiência)
  const potenciaSistemaKWp = consumoAlvoMensalKWh / (params.hspLocal * DIAS_MES * fatorEficiencia);

  const potenciaModuloKWp = params.potenciaModuloWp / 1000;
  const numeroModulos = Math.ceil(potenciaSistemaKWp / potenciaModuloKWp);
  const potenciaInstaladaRealKWp = numeroModulos * potenciaModuloKWp;

  const geracaoMensalEstimadaKWh = potenciaInstaladaRealKWp * params.hspLocal * DIAS_MES * fatorEficiencia;
  const geracaoAnualEstimadaKWh = geracaoMensalEstimadaKWh * 12;

  const percentualCompensacaoReal =
    params.consumoMedioMensalKWh > 0 ? geracaoMensalEstimadaKWh / params.consumoMedioMensalKWh : 0;

  return {
    potenciaSistemaKWp,
    numeroModulos,
    potenciaInstaladaRealKWp,
    geracaoMensalEstimadaKWh,
    geracaoAnualEstimadaKWh,
    percentualCompensacaoReal,
  };
}

/**
 * Recalcula potência/geração do dimensionamento para o número REAL de
 * módulos do kit escolhido pelo instalador (`kit.quantidade`), quando esse
 * número diverge do recomendado por `dimensionarSistema()`. Mantém
 * `potenciaSistemaKWp` (o alvo teórico pré-arredondamento, que não depende
 * de qual kit discreto foi escolhido) inalterado.
 *
 * CORRIGIDO (ago/2026): antes, `dimensionamento.numeroModulos` (recomendado
 * pelo algoritmo, a partir do consumo/HSP/perdas) e `kit.quantidade` (o que o
 * instalador de fato configura no kit comercial — quantidade essa que raras
 * vezes bate exatamente com a recomendação, já que kits vêm em tamanhos
 * discretos compatíveis com o inversor escolhido) eram duas fontes de
 * verdade independentes que nunca convergiam. Isso produzia duas falhas
 * visíveis: (1) documentos gerados (PropostaPDF, PropostaComercialPDF,
 * MemorialDescritivo) mostravam os DOIS números — recomendado e real — na
 * mesma página quando divergiam, uma contradição para o cliente; (2) os
 * indicadores financeiros (payback, TIR, economia mensal) eram calculados
 * com a GERAÇÃO do número recomendado, enquanto o preço de venda vinha do
 * CUSTO do kit real — descasamento silencioso entre "quanto o sistema
 * gera" e "quanto o sistema custa" no mesmo cálculo de retorno.
 *
 * Uso: chamar logo após `dimensionarSistema(...)`, em `calcularTudo()` da
 * store, passando `kit.quantidade` — o resultado ajustado é então o único
 * `dimensionamento` armazenado e consumido por todo o resto do app
 * (enquadramento, custosRecorrentes, precificação, indicadores, documentos).
 * Não existe painel na UI que dependa do valor NÃO ajustado — o painel de
 * sugestão de dimensionamento (`StrategiaKwp` em App.tsx) calcula sua própria
 * sugestão diretamente do consumo/HSP, independente deste módulo.
 */
export function ajustarDimensionamentoParaQuantidadeReal(
  resultado: ResultadoDimensionamento,
  quantidadeReal: number,
  params: Pick<ParametrosDimensionamento, 'potenciaModuloWp' | 'hspLocal' | 'perdasSistema' | 'consumoMedioMensalKWh'>
): ResultadoDimensionamento {
  if (quantidadeReal <= 0 || quantidadeReal === resultado.numeroModulos) return resultado;

  const potenciaModuloKWp = params.potenciaModuloWp / 1000;
  const fatorEficiencia = 1 - params.perdasSistema;
  const potenciaInstaladaRealKWp = quantidadeReal * potenciaModuloKWp;
  const geracaoMensalEstimadaKWh = potenciaInstaladaRealKWp * params.hspLocal * DIAS_MES * fatorEficiencia;
  const geracaoAnualEstimadaKWh = geracaoMensalEstimadaKWh * 12;
  const percentualCompensacaoReal =
    params.consumoMedioMensalKWh > 0 ? geracaoMensalEstimadaKWh / params.consumoMedioMensalKWh : 0;

  return {
    potenciaSistemaKWp: resultado.potenciaSistemaKWp,
    numeroModulos: quantidadeReal,
    potenciaInstaladaRealKWp,
    geracaoMensalEstimadaKWh,
    geracaoAnualEstimadaKWh,
    percentualCompensacaoReal,
  };
}
