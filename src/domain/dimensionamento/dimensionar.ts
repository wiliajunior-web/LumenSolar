import { ParametrosDimensionamento, ResultadoDimensionamento } from './types';

/** Média anual de dias por mês (365/12 = 30.4167). Ref: IEC 61724-1. */
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
