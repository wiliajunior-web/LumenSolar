export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  crea: string;
  responsavelTecnico: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  validadeProposta: number;
  logoBase64?: string;

  // ── Valores-base de precificação (editáveis por proposta) ──────────────
  /** Custo da estrutura de fixação por kWp instalado (R$/kWp). */
  valorEstruturaPorKWp: number;
  /** Custo dos materiais elétricos por kWp instalado (R$/kWp). */
  valorMateriaisPorKWp: number;
  /** Custo de mão de obra por módulo instalado (R$/módulo). */
  valorMaoDeObraPorModulo: number;
  /**
   * Custo do projeto de engenharia + ART CREA (valor fixo por proposta).
   * Referência CREA-MG 2025: ART ~R$130 para obras de R$10k–30k.
   * Projeto elétrico típico: R$400. Total sugerido: R$530 → R$500 arredondado.
   */
  valorProjetoArt: number;
  /** Alíquota efetiva do Simples Nacional (fração). */
  aliquotaImpostos: number;
  /** Margem de lucro sobre o preço de venda (fração). */
  margemPadrao: number;
  /** Reajuste tarifário médio esperado (%/ano). */
  reajusteTarifarioAnual: number;
  /** Taxa mínima de atratividade para cálculo de VPL/payback descontado (%/ano). */
  taxaMinimaAtratividadeAnual: number;
  /** Taxa mensal Solfácil 48 meses (fração). Varia por perfil de crédito do cliente. */
  taxaSolfacil48Mensal: number;
  /** Taxa mensal Solfácil 60 meses (fração). */
  taxaSolfacil60Mensal: number;
  /** Taxa mensal cartão de crédito/outro (fração). */
  taxaOutroFinanciamento: number;
  /** Descrição do 3º financiamento (ex: "Cartão 18×", "Banco 72×"). */
  descricaoOutroFinanciamento: string;
  /** Número de parcelas do 3º financiamento. */
  parcelasOutroFinanciamento: number;
  /**
   * Fração da tarifa total que representa o Fio B (TUSD de distribuição).
   * CEMIG: ~32% | Distribuidoras menores: ~36–40%.
   * Valor padrão: 35% (média nacional).
   */
  fracaoTarifaFioB: number;
  /** CPF do engenheiro responsável técnico (para procuração). */
  cpfEngenheiro: string;
  /** Foto de capa da proposta (base64). Padrão: arte Lumen. */
  fotoCapa?: string;
  /**
   * @deprecated (set/2026) Não usado mais em nenhum documento gerado — a
   * Proposta Comercial trocou o banner fotográfico de topo (que cortava a
   * logo em qualquer foto enviada aqui, proporção do container 5,41:1) por
   * uma faixa de marca sólida (ver BrandBar em PropostaComercialPDF.tsx).
   * O upload correspondente também foi removido de App.tsx. Campo mantido
   * apenas para não quebrar a leitura de perfis de empresa/.lumensolar
   * salvos antes desta mudança que ainda tragam essa chave.
   */
  fotoApoio?: string;
}

/**
 * BUG CORRIGIDO (set/2026, auditoria de código adjacente ao fix do
 * `webSecurity`/fetch externo): a tela "⚙ Empresa" tem um campo de chave de
 * API da Anthropic (`anthropicApiKey`, usada só para a importação de
 * datasheet por IA — ver App.tsx ~2262/2337) gravado direto no MESMO objeto
 * `empresa` da store (`atualizarEmpresa({ anthropicApiKey: ... })`, campo
 * solto via `as any` porque nunca fez parte de `DadosEmpresa`). Esse mesmo
 * objeto `empresa`, por sua vez, é embutido INTEIRO — sem filtro nenhum — em
 * TRÊS artefatos que saem da máquina do usuário:
 *   1. `salvar()` (App.tsx) grava `empresa` dentro de todo arquivo
 *      `.lumensolar`, que o próprio app documenta como "pode copiar,
 *      renomear, enviar por e-mail, colocar no Google Drive" (ver
 *      persistence.ts) — ou seja, TODO projeto salvo levava a chave de API
 *      pessoal do usuário, em texto puro, dentro do JSON.
 *   2. `gerarExcelAuditoria()` recebe `empresa` no payload — o Excel de
 *      auditoria/formulário CEMIG é literalmente feito para ser ENVIADO À
 *      DISTRIBUIDORA.
 *   3. `buildData()` retorna `empresa` para todos os PDFs (Proposta,
 *      Memorial, Procuração, DUB, Planta de Situação) — documentos que vão
 *      direto para o CLIENTE.
 * Nenhum template atual imprime o objeto `empresa` inteiro (cada um lê
 * campos específicos como razaoSocial/cnpj/crea), então a chave não aparece
 * como texto visível em nenhum PDF/Excel gerado hoje — mas o dado sensível
 * não tinha nenhum motivo para sequer chegar até essas funções, e um
 * template futuro (ou uma seção de "dados técnicos completos") poderia
 * expor ela por acidente. No `.lumensolar` o risco já é real e imediato: o
 * arquivo é JSON puro, sem nenhuma tela intermediária — abrir o arquivo em
 * qualquer editor de texto mostra a chave.
 *
 * Corrigido na raiz: esta função remove qualquer campo de credencial do
 * objeto `empresa` ANTES dele entrar em qualquer um dos 3 artefatos acima
 * (ver usos em App.tsx: `salvar()`, `buildData()`, payload do
 * `gerarExcelAuditoria`). A chave continua funcionando normalmente na tela
 * "⚙ Empresa" e na importação de datasheet — ela só nunca sai da store
 * local (`salvarEmpresa()`/`carregarEmpresa()`, localStorage, nunca
 * embutida em arquivo exportado). Como consequência colateral correta:
 * importar um arquivo .lumensolar de outra pessoa/computador não
 * sobrescreve (nem preenche) a chave de API local — `camposEmpresaParaPreencherAoImportar`
 * só herda campos que EXISTEM no arquivo importado, e a chave nunca está lá.
 *
 * Lista de campos de credencial é centralizada aqui de propósito: qualquer
 * campo sensível futuro (outra chave de API, token, etc.) deve ser
 * adicionado a `CAMPOS_SECRETOS_EMPRESA`, não espalhado em filtros ad-hoc
 * pelos 3 pontos de uso.
 */
const CAMPOS_SECRETOS_EMPRESA = ['anthropicApiKey'] as const;

export function empresaSemSegredos<T extends Record<string, any>>(empresa: T): T {
  if (!empresa) return empresa;
  const copia: Record<string, any> = { ...empresa };
  for (const campo of CAMPOS_SECRETOS_EMPRESA) delete copia[campo];
  return copia as T;
}

export const DADOS_EMPRESA_PADRAO: DadosEmpresa = {
  razaoSocial: 'LUMEN SOLUÇÕES LTDA',
  nomeFantasia: 'Lumen Solar',
  cnpj: '',
  crea: '',
  responsavelTecnico: '',
  cidade: 'Araguari',
  uf: 'MG',
  telefone: '',
  email: '',
  site: '',
  validadeProposta: 15,
  logoBase64: undefined,
  // Valores-base
  valorEstruturaPorKWp: 150,
  valorMateriaisPorKWp: 120,
  valorMaoDeObraPorModulo: 280,
  valorProjetoArt: 500,
  aliquotaImpostos: 0.06,
  margemPadrao: 0.15,
  reajusteTarifarioAnual: 0.06,
  taxaMinimaAtratividadeAnual: 0.08,
  taxaSolfacil48Mensal: 0.0199,
  taxaSolfacil60Mensal: 0.0199,
  taxaOutroFinanciamento: 0.0299,
  descricaoOutroFinanciamento: 'Cartão 18×',
  parcelasOutroFinanciamento: 18,
  fracaoTarifaFioB: 0.35,
  cpfEngenheiro: '',
};
