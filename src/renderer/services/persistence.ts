/**
 * Serviço de persistência — comunicação via IPC com o processo principal.
 *
 * Usa window.require('electron') em vez de require() diretamente,
 * para que o Vite não tente transformar/bundlar o módulo electron.
 * Com nodeIntegration: true, window.require é idêntico ao require do Node.js.
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

// window.require não é transformado pelo Vite (só bare require() é interceptado)
// Funciona em Electron com nodeIntegration: true e contextIsolation: false
function ipc(): Electron.IpcRenderer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).require('electron').ipcRenderer;
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

export { gerarId } from './utils';
