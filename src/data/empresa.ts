/**
 * Dados da empresa integradora — aparecem em todas as propostas.
 * Configurados uma vez e persistidos localmente.
 */
export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  crea: string;
  responsavelTecnico: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  validadeProposta: number; // dias
  /** Logo em base64 (data URL), para uso no PDF. */
  logoBase64?: string;
}

export const DADOS_EMPRESA_PADRAO: DadosEmpresa = {
  razaoSocial: 'LUMEN SOLUÇÕES LTDA',
  nomeFantasia: 'Lumen Solar',
  cnpj: '',
  crea: '',
  responsavelTecnico: '',
  endereco: '',
  cidade: 'Araguari',
  uf: 'MG',
  telefone: '',
  email: '',
  site: '',
  validadeProposta: 15,
};
