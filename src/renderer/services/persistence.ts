/**
 * Persistência via localStorage — simples, confiável, sem require('electron').
 *
 * Em Electron, o localStorage persiste no diretório de dados do app:
 *   %APPDATA%/LumenSolar/Local Storage/
 * Dados sobrevivem ao reinício do app, sem limite prático para nosso uso.
 * Cada proposta ocupa ~10-50 KB; suporta centenas de propostas.
 */

const KEY_EMPRESA   = 'lumen:empresa';
const KEY_PROPOSAL  = (id: string) => `lumen:proposal:${id}`;
const KEY_PREFIX    = 'lumen:proposal:';

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

export async function listarPropostas(): Promise<ProposalMeta[]> {
  const result: ProposalMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(KEY_PREFIX)) continue;
    try {
      const d = JSON.parse(localStorage.getItem(key)!);
      result.push({
        id: d.id, nomeCliente: d.nomeCliente, cidade: d.cidade,
        uf: d.uf, criadoEm: d.criadoEm, atualizadoEm: d.atualizadoEm,
        potenciaKWp: d.potenciaKWp, precoVenda: d.precoVenda,
      });
    } catch { /* proposta corrompida — ignora */ }
  }
  return result.sort((a, b) =>
    new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
  );
}

export async function salvarProposta(data: any): Promise<void> {
  localStorage.setItem(KEY_PROPOSAL(data.id), JSON.stringify(data));
}

export async function carregarProposta(id: string): Promise<any> {
  const raw = localStorage.getItem(KEY_PROPOSAL(id));
  return raw ? JSON.parse(raw) : null;
}

export async function excluirProposta(id: string): Promise<void> {
  localStorage.removeItem(KEY_PROPOSAL(id));
}

export async function carregarEmpresa(): Promise<any | null> {
  const raw = localStorage.getItem(KEY_EMPRESA);
  return raw ? JSON.parse(raw) : null;
}

export async function salvarEmpresa(empresa: any): Promise<void> {
  localStorage.setItem(KEY_EMPRESA, JSON.stringify(empresa));
}

export { gerarId } from './utils';
