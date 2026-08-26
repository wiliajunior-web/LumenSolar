/**
 * VALIDAÇÃO DO FDI — FATOR DE DIMENSIONAMENTO DO INVERSOR
 * Fórmulas extraídas da planilha "Pre_dimensionamento_FDI.xlsx"
 * (Toolbox de Elite — Projetista de Elite, 2024)
 *
 * CORRIGIDO (ago/2026): a citação "IEC 61724-1" abaixo estava incorreta — essa
 * norma trata de monitoramento de desempenho de sistemas FV, não de critérios
 * de dimensionamento DC/AC. A faixa de overload 0,90–1,35 e os 3 critérios vêm
 * da planilha comercial citada acima, não de uma norma IEC — removida a
 * citação indevida.
 *
 * 3 critérios obrigatórios (planilha do fabricante/mercado — ver nota acima):
 *   1. Potência   — overload: 0,90 ≤ FDI ≤ 1,35
 *   2. Tensão     — N_série dentro da faixa MPPT do inversor
 *   3. Corrente   — strings por MPPT ≤ limite do inversor (requer Imax_MPPT do
 *      datasheet — ver `criterio3Avaliado` quando esse dado não é informado)
 */

export interface ParamsFDI {
  // Módulo
  potenciaModuloWp: number;    // Wp
  quantidade: number;          // total de módulos
  vocV: number;                // Voc @ STC (V)
  vmpV: number;                // Vmpp @ STC (V)
  iscA: number;                // Isc @ STC (A)
  // Inversor
  potenciaInversorKW: number;  // kW nominal AC
  faixaMpptMinV: number;       // V mínima da faixa MPPT
  faixaMpptMaxV: number;       // V máxima da faixa MPPT
  tensaoMaxEntradaV: number;   // Vmáx entrada CC (Voc_max)
  corrMaxMpptA: number;        // Imax por entrada MPPT (A)
  numMppt: number;             // número de entradas MPPT
  // Configuração
  numStrings: number;          // strings em paralelo (total)
  modulosPorString: number;    // módulos por string (série)
}

export interface ResultadoFDI {
  // Critério 1 — Potência
  pgerKWp: number;             // potência total do arranjo
  fdi: number;                 // FDI = Pger / Pinv
  pinvMinKW: number;           // Pgen / 1.35
  pinvMaxKW: number;           // Pgen / 0.90
  criterio1Ok: boolean;
  statusFDI: 'ideal' | 'aceitavel' | 'alto' | 'baixo' | 'invalido';

  // Critério 2 — Tensão
  nSerieMin: number;           // ROUNDUP(Vmppt_min × 1.1 / Vmp, 0)
  nSerieMax: number;           // ROUNDDOWN(MIN(Vmppt_max/Vmp, Vmáx/Voc), 0)
  nSerieCfg: number;           // modulosPorString configurado
  criterio2Ok: boolean;

  // Critério 3 — Corrente
  stringsPerMppt: number;      // strings distribuídas por MPPT
  nStringsMaxMppt: number;     // ROUNDDOWN(Imax_mppt / Isc, 0)
  criterio3Ok: boolean;
  /**
   * false quando `corrMaxMpptA` não foi informado (≤0) — o Critério 3 não pôde
   * ser calculado de verdade. ADICIONADO ago/2026: antes, App.tsx usava
   * `corrMaxMpptA || corrMaxSaidaA || 99` como fallback quando o campo estava
   * vazio — misturando corrente CC por MPPT com corrente CA de saída do
   * inversor (grandezas diferentes) ou, no pior caso, aprovando silenciosamente
   * qualquer configuração de strings com o valor arbitrário 99A. Agora, sem o
   * dado real do datasheet, o Critério 3 fica marcado como não avaliado (não
   * aprovado nem reprovado) em vez de aprovar às cegas.
   */
  criterio3Avaliado: boolean;

  // Geral
  aprovado: boolean;
  alertas: string[];
  sugestoes: string[];
}

/**
 * Valida o FDI do sistema em 3 critérios.
 * Baseado nas fórmulas da planilha "Pre_dimensionamento_FDI.xlsx".
 */
export function calcularFDI(p: ParamsFDI): ResultadoFDI {
  const alertas: string[] = [];
  const sugestoes: string[] = [];

  // ── Critério 1 — Potência (overload 0.90–1.35) ────────────────────────────
  const pgerKWp = (p.potenciaModuloWp * p.quantidade) / 1000;
  const fdi = pgerKWp / p.potenciaInversorKW;
  const pinvMinKW = parseFloat((pgerKWp / 1.35).toFixed(2));
  const pinvMaxKW = parseFloat((pgerKWp / 0.90).toFixed(2));

  let statusFDI: ResultadoFDI['statusFDI'];
  let c1Ok = true;

  if (fdi < 0.90) {
    statusFDI = 'baixo'; c1Ok = false;
    alertas.push(
      `FDI ${fdi.toFixed(3)} < 0,90 — arranjo subdimensionado para o inversor. ` +
      `O inversor ficará ocioso parte do tempo. Pinv ideal: ${pinvMinKW}–${pinvMaxKW} kW.`
    );
  } else if (fdi <= 1.00) {
    statusFDI = 'aceitavel';
    sugestoes.push(`FDI ${fdi.toFixed(3)} — aceitável, inversor levemente maior que o arranjo.`);
  } else if (fdi <= 1.20) {
    statusFDI = 'ideal';
  } else if (fdi <= 1.35) {
    statusFDI = 'aceitavel';
    sugestoes.push(
      `FDI ${fdi.toFixed(3)} — aceitável mas com clipping em dias de pico. ` +
      'Verificar se a perda por clipping compensa o custo de inversor maior.'
    );
  } else {
    statusFDI = 'invalido'; c1Ok = false;
    alertas.push(
      `FDI ${fdi.toFixed(3)} > 1,35 — arranjo superdimensionado. ` +
      `Clipping significativo esperado. Pinv mínimo recomendado: ${pinvMinKW} kW.`
    );
  }

  // ── Critério 2 — Tensão ────────────────────────────────────────────────────
  // N_min = ROUNDUP(Vmppt_min × 1.1 / Vmp) — 1.1: margem de 10% no mínimo MPPT
  const nSerieMin = Math.ceil((p.faixaMpptMinV * 1.1) / p.vmpV);
  // N_max = ROUNDDOWN(MIN(Vmppt_max/Vmp, Vmáx_inv/Voc))
  const nSerieMax = Math.floor(Math.min(
    p.faixaMpptMaxV / p.vmpV,
    p.tensaoMaxEntradaV / p.vocV
  ));
  const nSerieCfg = p.modulosPorString;
  const c2Ok = nSerieCfg >= nSerieMin && nSerieCfg <= nSerieMax;

  if (!c2Ok) {
    if (nSerieCfg < nSerieMin) {
      alertas.push(
        `Critério de tensão: ${nSerieCfg} módulos/string < mínimo ${nSerieMin}. ` +
        `Vmpp_arranjo=${(nSerieCfg * p.vmpV).toFixed(0)}V ficará abaixo de Vmppt_min=${p.faixaMpptMinV}V.`
      );
    } else {
      alertas.push(
        `Critério de tensão: ${nSerieCfg} módulos/string > máximo ${nSerieMax}. ` +
        `Voc_arranjo=${(nSerieCfg * p.vocV).toFixed(0)}V pode exceder Vmáx=${p.tensaoMaxEntradaV}V.`
      );
    }
    sugestoes.push(`Faixa válida: ${nSerieMin}–${nSerieMax} módulos por string.`);
  }

  // ── Critério 3 — Corrente ─────────────────────────────────────────────────
  const stringsPerMppt = Math.ceil(p.numStrings / p.numMppt);
  const criterio3Avaliado = p.corrMaxMpptA > 0;
  // N_strings_max_mppt = ROUNDDOWN(Imax_mppt / Isc)
  const nStringsMaxMppt = criterio3Avaliado ? Math.floor(p.corrMaxMpptA / p.iscA) : 0;
  // Sem o dado real (corrMaxMpptA≤0), não há como avaliar — não conta nem a
  // favor nem contra `aprovado` (ver criterio3Avaliado e sugestão abaixo).
  const c3Ok = !criterio3Avaliado || stringsPerMppt <= nStringsMaxMppt;

  if (!criterio3Avaliado) {
    sugestoes.push(
      'Critério de corrente (Critério 3) não avaliado: preencha "Imax por MPPT (A)" ' +
      'com o valor do datasheet do inversor para verificar strings por MPPT × Isc ≤ Imax_MPPT.'
    );
  } else if (!c3Ok) {
    alertas.push(
      `Critério de corrente: ${stringsPerMppt} strings por MPPT excede máximo ${nStringsMaxMppt}. ` +
      `Isc_arranjo=${(stringsPerMppt * p.iscA).toFixed(1)}A > Imax_MPPT=${p.corrMaxMpptA}A.`
    );
    sugestoes.push(
      `Usar mais entradas MPPT ou inversor com Imax_MPPT ≥ ${(stringsPerMppt * p.iscA).toFixed(1)}A.`
    );
  }

  const aprovado = c1Ok && c2Ok && c3Ok;

  return {
    pgerKWp: parseFloat(pgerKWp.toFixed(3)),
    fdi: parseFloat(fdi.toFixed(4)),
    pinvMinKW, pinvMaxKW,
    criterio1Ok: c1Ok, statusFDI,
    nSerieMin, nSerieMax, nSerieCfg,
    criterio2Ok: c2Ok,
    stringsPerMppt, nStringsMaxMppt,
    criterio3Ok: c3Ok,
    criterio3Avaliado,
    aprovado, alertas, sugestoes,
  };
}
