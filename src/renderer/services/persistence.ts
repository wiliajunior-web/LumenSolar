/**
 * Serviço de persistência — comunicação com o processo principal via IPC.
 * Salva e carrega propostas e configurações da empresa em disco.
 * Localização: %APPDATA%/LumenSolar/ (Windows)
 */

// Com nodeIntegration: true, podemos usar require() no renderer
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require('electron');

export interface ProposalMeta {
  id: string;
  nomeCliente: string;
  cidade: string;
  uf: string;
  criadoEm: string;
  atualizadoEm: string;
  potenciaKWp?: number;
  precoVenda?: number;
}

/** Lista todas as propostas salvas (ordenadas por data de atualização). */
export async function listarPropostas(): Promise<ProposalMeta[]> {
  return ipcRenderer.invoke('proposal:list');
}

/** Salva (cria ou atualiza) uma proposta. */
export async function salvarProposta(data: any): Promise<void> {
  await ipcRenderer.invoke('proposal:save', data);
}

/** Carrega uma proposta pelo ID. */
export async function carregarProposta(id: string): Promise<any> {
  return ipcRenderer.invoke('proposal:load', id);
}

/** Exclui uma proposta pelo ID. */
export async function excluirProposta(id: string): Promise<void> {
  await ipcRenderer.invoke('proposal:delete', id);
}

/** Carrega as configurações da empresa salvas em disco. */
export async function carregarEmpresa(): Promise<any | null> {
  return ipcRenderer.invoke('empresa:get');
}

/** Persiste as configurações da empresa em disco. */
export async function salvarEmpresa(empresa: any): Promise<void> {
  await ipcRenderer.invoke('empresa:save', empresa);
}

/** Gera um ID único para uma proposta. */
export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
