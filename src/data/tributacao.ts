/**
 * Estrutura tributária para empresas instaladoras de sistemas fotovoltaicos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIMPLES NACIONAL (regime mais comum para instaladoras de pequeno/médio porte)
 * ─────────────────────────────────────────────────────────────────────────────
 * A alíquota incide sobre a RECEITA BRUTA e já engloba:
 *   IRPJ, CSLL, PIS, COFINS, CPP (previdência patronal) e ISS/ICMS.
 *
 * Para a venda + instalação de sistemas fotovoltaicos, a atividade mista
 * (mercadoria + serviço) normalmente usa:
 *   - Parte do kit (mercadoria) → Anexo I (comércio)
 *   - Instalação (serviço)      → Anexo III (serviços)
 *
 * Na prática, o contador da empresa fornece uma ALÍQUOTA EFETIVA MENSAL —
 * use esse valor no campo "aliquotaEfetiva" abaixo.
 *
 * Faixas de referência 2025 (Simples):
 *   Faturamento até R$180k/ano → Anexo I: 4,00% | Anexo III: 6,00%
 *   Até R$360k/ano             → Anexo I: 7,30% | Anexo III: 11,20%
 *   Até R$720k/ano             → Anexo I: 9,50% | Anexo III: 13,50%
 *
 * ICMS sobre EQUIPAMENTOS:
 *   Convênio ICMS 15/2007 (e renovações) concede isenção de ICMS sobre
 *   módulos fotovoltaicos e inversores em grande parte dos estados.
 *   Isso já vem refletido no preço do fornecedor — não some por fora.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LUCRO PRESUMIDO (empresas maiores ou que optam por esse regime)
 * ─────────────────────────────────────────────────────────────────────────────
 * As alíquotas incidem separadamente:
 *   PIS:   0,65% sobre receita bruta
 *   COFINS: 3,00% sobre receita bruta
 *   IRPJ:  1,20% sobre receita bruta (presumida 8% × 15% + 10% adicional)
 *   CSLL:  1,08% sobre receita bruta (presumida 12% × 9%)
 *   ISS:   2% a 5% sobre o serviço (municipal)
 *   Total típico: ~6% a 11% sobre receita, dependendo do município/ISS.
 */

export type RegimeTributario = 'simples' | 'lucro_presumido' | 'lucro_real';

export interface ConfiguracaoTributaria {
  regime: RegimeTributario;
  /**
   * Alíquota efetiva total sobre a receita bruta (fração 0–1).
   * Para Simples: informe a alíquota efetiva mensal do DAS (fornecida pelo contador).
   * Para Lucro Presumido/Real: soma PIS + COFINS + IRPJ + CSLL + ISS.
   * Valor padrão: 0,06 (6% — Simples, faixa 1, serviços).
   */
  aliquotaEfetiva: number;
}

/** Tabelas de alíquotas nominais do Simples Nacional 2025 (para referência). */
export const SIMPLES_ANEXO_I = [
  { faixaMaximaAnual: 180000, aliquota: 0.04, deducao: 0 },
  { faixaMaximaAnual: 360000, aliquota: 0.073, deducao: 5940 },
  { faixaMaximaAnual: 720000, aliquota: 0.095, deducao: 13860 },
  { faixaMaximaAnual: 1800000, aliquota: 0.107, deducao: 22500 },
  { faixaMaximaAnual: 3600000, aliquota: 0.143, deducao: 87300 },
  { faixaMaximaAnual: 4800000, aliquota: 0.19, deducao: 378000 },
];

export const SIMPLES_ANEXO_III = [
  { faixaMaximaAnual: 180000, aliquota: 0.06, deducao: 0 },
  { faixaMaximaAnual: 360000, aliquota: 0.112, deducao: 9360 },
  { faixaMaximaAnual: 720000, aliquota: 0.135, deducao: 17640 },
  { faixaMaximaAnual: 1800000, aliquota: 0.16, deducao: 35640 },
  { faixaMaximaAnual: 3600000, aliquota: 0.21, deducao: 125640 },
  { faixaMaximaAnual: 4800000, aliquota: 0.33, deducao: 648000 },
];

/**
 * Calcula a alíquota efetiva do Simples Nacional dado o faturamento
 * anual bruto e o anexo aplicável.
 */
export function calcularAliquotaEfetivaSimples(
  faturamentoAnualBruto: number,
  anexo: 'I' | 'III'
): number {
  const tabela = anexo === 'I' ? SIMPLES_ANEXO_I : SIMPLES_ANEXO_III;
  const faixa = tabela.find((f) => faturamentoAnualBruto <= f.faixaMaximaAnual) ?? tabela[tabela.length - 1];
  const aliquotaEfetiva = (faturamentoAnualBruto * faixa.aliquota - faixa.deducao) / faturamentoAnualBruto;
  return Math.max(0, aliquotaEfetiva);
}

export const CONFIG_TRIBUTARIA_PADRAO: ConfiguracaoTributaria = {
  regime: 'simples',
  aliquotaEfetiva: 0.06,
};
