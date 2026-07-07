/**
 * Tabela de distribuidoras de energia elétrica com tarifas de referência.
 *
 * Tarifas do Grupo B1 Residencial (TE + TUSD com ICMS), baseadas nas
 * resoluções homologatórias da ANEEL vigentes em 2025 — atualize após
 * cada revisão tarifária da distribuidora.
 *
 * Taxa de disponibilidade: definida pela ANEEL conforme o tipo de ligação
 * (resolução 414/2010, atualizada). O valor em R$ é calculado aplicando
 * a tarifa sobre os kWh mínimos.
 *
 * Unidades de disponibilidade mínima (ANEEL — nacionais):
 *   Monofásica: 30 kWh/mês
 *   Bifásica:   50 kWh/mês
 *   Trifásica: 100 kWh/mês
 */

export type TipoLigacao = 'monofasica' | 'bifasica' | 'trifasica';

export interface Distribuidora {
  codigo: string;
  nome: string;
  nomeAbreviado: string;
  uf: string[];
  /** Tarifa de energia (TE + TUSD) em R$/kWh, com ICMS, Grupo B1 Residencial. */
  tarifaKWhComICMS: number;
  /**
   * CIP/COSIP média de referência, em R$/mês, para clientes residenciais na
   * área de concessão. Varia por município — use como padrão editável.
   */
  cipMediaReferenciaRS: number;
  /** Ano/mês da última atualização tarifária de referência. */
  referenciaAtualizacao: string;
}

export const DISTRIBUIDORAS: ReadonlyArray<Distribuidora> = [
  {
    codigo: 'CEMIG',
    nome: 'CEMIG Distribuição S.A.',
    nomeAbreviado: 'CEMIG (MG)',
    uf: ['MG'],
    tarifaKWhComICMS: 1.1827,
    cipMediaReferenciaRS: 46.0,
    referenciaAtualizacao: '2026-05', // Res. ANEEL 3.589/2026
  },
  {
    codigo: 'EQUATORIAL_GO',
    nome: 'Equatorial Goiás Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial Goiás (GO)',
    uf: ['GO'],
    tarifaKWhComICMS: 1.0542,
    cipMediaReferenciaRS: 20.0,
    referenciaAtualizacao: '2026-04',
  },
  {
    codigo: 'CPFL_PAULISTA',
    nome: 'CPFL Energia Elétrica S.A. (Paulista)',
    nomeAbreviado: 'CPFL Paulista (SP)',
    uf: ['SP'],
    tarifaKWhComICMS: 1.0847,
    cipMediaReferenciaRS: 24.0,
    referenciaAtualizacao: '2026-04',
  },
  {
    codigo: 'ENEL_SP',
    nome: 'Enel Distribuição São Paulo S.A.',
    nomeAbreviado: 'Enel SP (Grande SP)',
    uf: ['SP'],
    tarifaKWhComICMS: 1.1084,
    cipMediaReferenciaRS: 22.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COPEL',
    nome: 'COPEL Distribuição S.A.',
    nomeAbreviado: 'COPEL (PR)',
    uf: ['PR'],
    tarifaKWhComICMS: 1.0304,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CELESC',
    nome: 'CELESC Distribuição S.A.',
    nomeAbreviado: 'CELESC (SC)',
    uf: ['SC'],
    tarifaKWhComICMS: 1.0195,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CPFL_RGE',
    nome: 'CPFL Rio Grande Energia S.A.',
    nomeAbreviado: 'RGE (RS)',
    uf: ['RS'],
    tarifaKWhComICMS: 0.9915,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_MT',
    nome: 'Energisa Mato Grosso S.A.',
    nomeAbreviado: 'Energisa (MT)',
    uf: ['MT'],
    tarifaKWhComICMS: 1.2051,
    cipMediaReferenciaRS: 16.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_MS',
    nome: 'Energisa Mato Grosso do Sul S.A.',
    nomeAbreviado: 'Energisa (MS)',
    uf: ['MS'],
    tarifaKWhComICMS: 1.1378,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COELBA',
    nome: 'Coelba — Companhia de Eletricidade do Estado da Bahia',
    nomeAbreviado: 'Coelba (BA)',
    uf: ['BA'],
    tarifaKWhComICMS: 1.2343,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COSERN',
    nome: 'COSERN — Companhia Energética do Rio Grande do Norte',
    nomeAbreviado: 'COSERN (RN)',
    uf: ['RN'],
    tarifaKWhComICMS: 1.1929,
    cipMediaReferenciaRS: 13.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CELPA',
    nome: 'CELPA — Centrais Elétricas do Pará S.A.',
    nomeAbreviado: 'CELPA (PA)',
    uf: ['PA'],
    tarifaKWhComICMS: 1.2485,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'EQUATORIAL_MA',
    nome: 'Equatorial Maranhão Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial (MA)',
    uf: ['MA'],
    tarifaKWhComICMS: 1.1542,
    cipMediaReferenciaRS: 11.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'EQUATORIAL_PI',
    nome: 'Equatorial Piauí Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial (PI)',
    uf: ['PI'],
    tarifaKWhComICMS: 1.182,
    cipMediaReferenciaRS: 11.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENEL_CE',
    nome: 'Enel Distribuição Ceará S.A.',
    nomeAbreviado: 'Enel (CE)',
    uf: ['CE'],
    tarifaKWhComICMS: 1.164,
    cipMediaReferenciaRS: 13.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENEL_GO',
    nome: 'Enel Distribuição Goiás S.A.',
    nomeAbreviado: 'Enel Goiás (GO)',
    uf: ['GO'],
    tarifaKWhComICMS: 1.0801,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_SE',
    nome: 'Energisa Sergipe — Distribuidora de Energia S.A.',
    nomeAbreviado: 'Energisa (SE)',
    uf: ['SE'],
    tarifaKWhComICMS: 1.139,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'OUTRO',
    nome: 'Outra distribuidora (informe a tarifa manualmente)',
    nomeAbreviado: 'Outra',
    uf: [],
    tarifaKWhComICMS: 1.0625,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
];

/** kWh mínimos de disponibilidade por tipo de ligação (ANEEL — valores nacionais). */
export const KWH_DISPONIBILIDADE: Record<TipoLigacao, number> = {
  monofasica: 30,
  bifasica: 50,
  trifasica: 100,
};

export function buscarDistribuidora(codigo: string): Distribuidora {
  const d = DISTRIBUIDORAS.find((d) => d.codigo === codigo);
  if (!d) throw new Error(`Distribuidora não encontrada: ${codigo}`);
  return d;
}
