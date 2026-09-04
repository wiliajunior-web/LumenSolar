/**
 * Catálogo de referência de preços de componentes fotovoltaicos — dados REAIS
 * de fornecedores, para uso como referência de mercado (nunca como fonte de
 * verdade do custo do kit, que continua vindo da NF real do fornecedor
 * escolhido pelo instalador em `EspecificacaoKit.custoKitRS`).
 *
 * PROVENIÊNCIA (rastreabilidade obrigatória — não é dado inventado):
 *   Fonte: `solfacil_modulos.csv`, enviado pelo usuário em 04/09/2026 —
 *     extração feita por ele mesmo do catálogo de painéis avulsos da
 *     plataforma de parceiro autenticado da Solfácil (não é dado público
 *     de vitrine; exige login de integrador parceiro).
 *   Cada linha abaixo foi conferida manualmente contra o CSV original
 *     (sku_id, nome, preco_unitario_brl) — sem parsing automático do campo
 *     `nome` por regex, porque o formato varia entre linhas (ordem
 *     marca/potência, presença ou não de "BIFACIAL", presença de sufixos
 *     como "SUL" ou "FINAME") e uma extração automática errada aqui
 *     contaminaria silenciosamente qualquer comparação de preço.
 *
 *   Nesta auditoria (set/2026) o usuário também gerou, na mesma sessão de
 *   pesquisa, arquivos equivalentes para Aldo/Volt (720 kits) e
 *   Belenus/BelEnergy (painéis + inversores mono/trifásico) — mas esses
 *   arquivos ficaram salvos localmente na pasta Downloads do navegador do
 *   usuário e NÃO foram anexados a esta conversa, então não foram
 *   incorporados aqui. Ver comentário no fim deste arquivo.
 *
 * DATA DE COLETA: os preços da Solfácil não vêm datados no CSV original;
 *   `dataColetaISO` abaixo usa a data de envio do arquivo a esta conversa
 *   (04/09/2026) como aproximação — é a melhor data disponível, mas pode
 *   ser alguns dias anterior à coleta real no portal.
 */

export type FornecedorComponente = 'Solfácil';

export interface PainelReferencia {
  fornecedor: FornecedorComponente;
  skuFornecedor: string;
  marca: string;
  modelo: string;
  potenciaWp: number;
  eficienciaPercent?: number;
  bifacial: boolean;
  precoUnitarioRS: number;
  /** Texto original do campo `nome` do fornecedor, para auditoria/conferência. */
  nomeOriginalFornecedor: string;
  dataColetaISO: string;
}

const DATA_COLETA_SOLFACIL = '2026-09-04';

// Conferido linha a linha contra solfacil_modulos.csv (04/09/2026) — nenhum
// valor abaixo foi extraído por regex, todos foram lidos e digitados à mão.
export const CATALOGO_PAINEIS_REFERENCIA: PainelReferencia[] = [
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573504',
    marca: 'LEAPTON',
    modelo: 'LP182-182-M-72-NB',
    potenciaWp: 600,
    eficienciaPercent: 23.22,
    bifacial: true,
    precoUnitarioRS: 557.25,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 600W LEAPTON - EF. 23.22% - FRAME COMPOSITO - LP182-182-M-72-NB',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573472',
    marca: 'OSDA',
    modelo: 'ODA620-33V-MHDRZ',
    potenciaWp: 620,
    eficienciaPercent: 23,
    bifacial: true,
    precoUnitarioRS: 611.58,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 620W - OSDA - EF. 23% - FRAME COMPOSITO - ODA620-33V-MHDRZ',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573481',
    marca: 'RONMA',
    modelo: 'RM-620W-182R/132TB',
    potenciaWp: 620,
    eficienciaPercent: 23,
    bifacial: true,
    precoUnitarioRS: 627.03,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 620W - RONMA - EP - EF.23% - FRAME COMPOSITO - RM-620W-182R/132TB',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573503',
    marca: 'OSDA',
    modelo: 'ODA710-33V-MHD (30MM, versão SUL)',
    potenciaWp: 710,
    eficienciaPercent: 22.86,
    bifacial: true,
    precoUnitarioRS: 659.41,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 710W - OSDA - EF. 22.86% - SUL - FRAME COMPOSITO - (30MM) - ODA710-33V-MHD',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573483',
    marca: 'OSDA',
    modelo: 'ODA710-33V-MHD (30MM)',
    potenciaWp: 710,
    eficienciaPercent: 22.86,
    bifacial: true,
    precoUnitarioRS: 700.36,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 710W - OSDA - EF. 22.86% - FRAME COMPOSITO - (30MM) - ODA710-33V-MHD',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573490',
    marca: 'HANERSUN',
    modelo: 'HN21N-66HT710W',
    potenciaWp: 710,
    eficienciaPercent: 22.9,
    bifacial: true,
    precoUnitarioRS: 700.36,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 710W - HANERSUN - EF.22.9% - FRAME COMPOSITO - HN21N-66HT710W',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573501',
    marca: 'JINKO',
    modelo: 'JKM620N-66HL4M BDV (versão SUL)',
    potenciaWp: 620,
    eficienciaPercent: 22.95,
    bifacial: true,
    precoUnitarioRS: 720.20,
    nomeOriginalFornecedor: 'MODULO BIFACIAL 620W - JINKO - EF.22.95% - SUL - FRAME ALUMINIO - JKM620N-66HL4M BDV',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
  {
    fornecedor: 'Solfácil',
    skuFornecedor: '573468',
    marca: 'MINASOL',
    modelo: 'MS-555 (nacional, elegível FINAME)',
    potenciaWp: 555,
    eficienciaPercent: 21.53,
    bifacial: false,
    precoUnitarioRS: 751.21,
    nomeOriginalFornecedor: 'MODULO 555W - MINASOL NACIONAL - FINAME - EF. 21.53% - FRAME ALUMINIO - MS-555',
    dataColetaISO: DATA_COLETA_SOLFACIL,
  },
];

/**
 * PENDENTE — arquivos que o usuário gerou mas não anexou a esta conversa:
 *   - volt_aldo_catalogo_fotovoltaico_v2_720kits.csv (720 kits Aldo/Volt)
 *   - belenus_belenergy_paineis_fotovoltaicos.csv (19 painéis Belenus)
 *   - belenus_inversores_monofasico_220v.csv / _trifasico_220v.csv /
 *     belenus_belenergy_inversores.csv (91 inversores Belenus)
 * Quando forem anexados, seguir o mesmo padrão deste arquivo: conferência
 * manual linha a linha antes de entrar no catálogo, nunca parsing automático
 * silencioso de um CSV com formato não uniforme.
 */
