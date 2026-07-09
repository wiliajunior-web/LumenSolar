/**
 * Serviço de persistência — comunicação com o processo principal via IPC.
 * IMPORTANTE: require('electron') é chamado DENTRO de cada função (lazy),
 * não no nível do módulo, para evitar crash na inicialização do renderer.
 */

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

// Helper lazy — só carrega ipcRenderer quando a função é chamada
function ipc() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('electron').ipcRenderer;
}

export async function listarPropostas(): Promise<ProposalMeta[]> {
  return ipc().invoke('proposal:list');
}

export async function salvarProposta(data: any): Promise<void> {
  await ipc().invoke('proposal:save', data);
}

export async function carregarProposta(id: string): Promise<any> {
  return ipc().invoke('proposal:load', id);
}

export async function excluirProposta(id: string): Promise<void> {
  await ipc().invoke('proposal:delete', id);
}

export async function carregarEmpresa(): Promise<any | null> {
  return ipc().invoke('empresa:get');
}

export async function salvarEmpresa(empresa: any): Promise<void> {
  await ipc().invoke('empresa:save', empresa);
}

// Re-export from utils for convenience
export { gerarId } from './utils';
