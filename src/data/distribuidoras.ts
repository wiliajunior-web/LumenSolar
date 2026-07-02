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
    tarifaKWhComICMS: 0.9012,
    cipMediaReferenciaRS: 18.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'EQUATORIAL_GO',
    nome: 'Equatorial Goiás Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial Goiás (GO)',
    uf: ['GO'],
    tarifaKWhComICMS: 0.8754,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CPFL_PAULISTA',
    nome: 'CPFL Energia Elétrica S.A. (Paulista)',
    nomeAbreviado: 'CPFL Paulista (SP)',
    uf: ['SP'],
    tarifaKWhComICMS: 0.9321,
    cipMediaReferenciaRS: 20.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENEL_SP',
    nome: 'Enel Distribuição São Paulo S.A.',
    nomeAbreviado: 'Enel SP (Grande SP)',
    uf: ['SP'],
    tarifaKWhComICMS: 0.8867,
    cipMediaReferenciaRS: 22.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COPEL',
    nome: 'COPEL Distribuição S.A.',
    nomeAbreviado: 'COPEL (PR)',
    uf: ['PR'],
    tarifaKWhComICMS: 0.8243,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CELESC',
    nome: 'CELESC Distribuição S.A.',
    nomeAbreviado: 'CELESC (SC)',
    uf: ['SC'],
    tarifaKWhComICMS: 0.8156,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CPFL_RGE',
    nome: 'CPFL Rio Grande Energia S.A.',
    nomeAbreviado: 'RGE (RS)',
    uf: ['RS'],
    tarifaKWhComICMS: 0.7932,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_MT',
    nome: 'Energisa Mato Grosso S.A.',
    nomeAbreviado: 'Energisa (MT)',
    uf: ['MT'],
    tarifaKWhComICMS: 0.9641,
    cipMediaReferenciaRS: 16.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_MS',
    nome: 'Energisa Mato Grosso do Sul S.A.',
    nomeAbreviado: 'Energisa (MS)',
    uf: ['MS'],
    tarifaKWhComICMS: 0.9102,
    cipMediaReferenciaRS: 15.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COELBA',
    nome: 'Coelba — Companhia de Eletricidade do Estado da Bahia',
    nomeAbreviado: 'Coelba (BA)',
    uf: ['BA'],
    tarifaKWhComICMS: 0.9874,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'COSERN',
    nome: 'COSERN — Companhia Energética do Rio Grande do Norte',
    nomeAbreviado: 'COSERN (RN)',
    uf: ['RN'],
    tarifaKWhComICMS: 0.9543,
    cipMediaReferenciaRS: 13.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'CELPA',
    nome: 'CELPA — Centrais Elétricas do Pará S.A.',
    nomeAbreviado: 'CELPA (PA)',
    uf: ['PA'],
    tarifaKWhComICMS: 0.9988,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'EQUATORIAL_MA',
    nome: 'Equatorial Maranhão Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial (MA)',
    uf: ['MA'],
    tarifaKWhComICMS: 0.9234,
    cipMediaReferenciaRS: 11.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'EQUATORIAL_PI',
    nome: 'Equatorial Piauí Distribuidora de Energia S.A.',
    nomeAbreviado: 'Equatorial (PI)',
    uf: ['PI'],
    tarifaKWhComICMS: 0.9456,
    cipMediaReferenciaRS: 11.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENEL_CE',
    nome: 'Enel Distribuição Ceará S.A.',
    nomeAbreviado: 'Enel (CE)',
    uf: ['CE'],
    tarifaKWhComICMS: 0.9312,
    cipMediaReferenciaRS: 13.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENEL_GO',
    nome: 'Enel Distribuição Goiás S.A.',
    nomeAbreviado: 'Enel Goiás (GO)',
    uf: ['GO'],
    tarifaKWhComICMS: 0.8641,
    cipMediaReferenciaRS: 14.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'ENERGISA_SE',
    nome: 'Energisa Sergipe — Distribuidora de Energia S.A.',
    nomeAbreviado: 'Energisa (SE)',
    uf: ['SE'],
    tarifaKWhComICMS: 0.9112,
    cipMediaReferenciaRS: 12.0,
    referenciaAtualizacao: '2025-04',
  },
  {
    codigo: 'OUTRO',
    nome: 'Outra distribuidora (informe a tarifa manualmente)',
    nomeAbreviado: 'Outra',
    uf: [],
    tarifaKWhComICMS: 0.85,
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
