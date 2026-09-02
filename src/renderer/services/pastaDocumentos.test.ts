/**
 * Testes de pastaDocumentos.ts — resolução da pasta de destino dos
 * documentos e a preferência de pasta escolhida manualmente pelo usuário.
 *
 * ADICIONADO (set/2026, pedido direto do usuário: "o ideal é que o usuário
 * escolha onde quer salvar"): antes desta mudança, `obterPastaDocumentos()`
 * nunca tinha teste próprio — só era exercitada indiretamente (sempre com
 * `pastaDestino` explícito, nunca batendo no caminho de IPC/preferência).
 * Estes testes cobrem os 3 casos reais de `obterPastaDocumentos()`
 * (preferência válida / preferência apagada por fora / nenhuma preferência)
 * e o fluxo completo de escolher uma pasta nova.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── Mock localStorage (mesmo padrão de arquivo_lumensolar.test.ts) ──────────
const _lsStore: Record<string, string> = {};
const localStorageMock = new Proxy(_lsStore, {
  get(target, key: string) {
    if (key === 'getItem') return (k: string) => target[k] ?? null;
    if (key === 'setItem') return (k: string, v: string) => { target[k] = v; };
    if (key === 'removeItem') return (k: string) => { delete target[k]; };
    if (key === 'clear') return () => { Object.keys(target).forEach(k => delete target[k]); };
    return target[key];
  },
});
(globalThis as any).localStorage = localStorageMock;

// ── Mock do IPC (electron.ipcRenderer) — `obterIpcRenderer()` em
// pastaDocumentos.ts checa `(window as any).require` primeiro; simular isso
// é o único jeito de exercitar de verdade o caminho de IPC fora do Electron,
// sem reimplementar a lógica em paralelo no teste. ────────────────────────
const invokeMock = vi.fn();
(globalThis as any).window = {
  require: (mod: string) => {
    if (mod === 'electron') return { ipcRenderer: { invoke: invokeMock } };
    throw new Error(`mock window.require: módulo inesperado "${mod}"`);
  },
};

// Import dinâmico DEPOIS dos mocks acima estarem no lugar — o módulo real
// lê `window`/`localStorage` só dentro das funções (lazy), então a ordem de
// import não importa tanto aqui, mas mantém o padrão claro.
import {
  obterPastaDocumentos,
  obterPastaPreferida,
  limparPastaPreferida,
  escolherPastaDocumentos,
} from './pastaDocumentos';

function limparTudo() {
  // `obterPastaDocumentos()` guarda o resultado num `cache` privado do
  // módulo (evita chamar o IPC toda hora) — `limparPastaPreferida()` é a
  // única função exportada que também zera esse cache como efeito colateral
  // documentado, então é a forma correta de resetar o estado entre testes
  // sem reimplementar/expor o cache só para teste.
  limparPastaPreferida();
  Object.keys(_lsStore).forEach(k => delete _lsStore[k]);
  invokeMock.mockReset();
}

describe('obterPastaPreferida / limparPastaPreferida', () => {
  beforeEach(limparTudo);

  it('devolve null quando nunca foi escolhida nenhuma pasta', () => {
    expect(obterPastaPreferida()).toBeNull();
  });

  it('limparPastaPreferida() é segura de chamar mesmo sem nada salvo (não lança)', () => {
    expect(() => limparPastaPreferida()).not.toThrow();
    expect(obterPastaPreferida()).toBeNull();
  });
});

describe('escolherPastaDocumentos()', () => {
  beforeEach(limparTudo);

  it('usuário cancela o diálogo → devolve null e NÃO salva nenhuma preferência', async () => {
    invokeMock.mockResolvedValueOnce(null); // dialog.showOpenDialog cancelado → handler devolve null
    const resultado = await escolherPastaDocumentos();
    expect(resultado).toBeNull();
    expect(obterPastaPreferida()).toBeNull();
    expect(invokeMock).toHaveBeenCalledWith('escolher-pasta-documentos');
  });

  it('usuário escolhe uma pasta → devolve o caminho e salva como preferência', async () => {
    const dirTeste = mkdtempSync(path.join(os.tmpdir(), 'lumensolar-test-pasta-'));
    try {
      invokeMock.mockResolvedValueOnce(dirTeste);
      const resultado = await escolherPastaDocumentos();
      expect(resultado).toBe(dirTeste);
      expect(obterPastaPreferida()).toBe(dirTeste);
    } finally {
      rmSync(dirTeste, { recursive: true, force: true });
    }
  });
});

describe('obterPastaDocumentos()', () => {
  beforeEach(limparTudo);

  it('sem preferência salva → usa o caminho que o IPC devolver (pasta Documentos do Windows)', async () => {
    invokeMock.mockResolvedValueOnce('/caminho/fake/Documentos');
    const pasta = await obterPastaDocumentos();
    expect(pasta).toBe('/caminho/fake/Documentos');
    expect(invokeMock).toHaveBeenCalledWith('obter-pasta-documentos');
  });

  it('preferência salva E a pasta existe de verdade → usa a preferência, NUNCA chama o IPC padrão', async () => {
    const dirTeste = mkdtempSync(path.join(os.tmpdir(), 'lumensolar-test-pasta-'));
    try {
      invokeMock.mockResolvedValueOnce(dirTeste); // escolherPastaDocumentos() usa o mock
      await escolherPastaDocumentos();
      invokeMock.mockClear(); // a partir daqui, qualquer chamada ao IPC seria um bug

      const pasta = await obterPastaDocumentos();
      expect(pasta).toBe(dirTeste);
      expect(invokeMock).not.toHaveBeenCalled();
    } finally {
      rmSync(dirTeste, { recursive: true, force: true });
    }
  });

  it('[REGRESSÃO set/2026] preferência salva mas a pasta NÃO existe mais (pendrive desconectado, pasta apagada) → limpa a preferência sozinha e cai no padrão do Windows', async () => {
    const dirTeste = mkdtempSync(path.join(os.tmpdir(), 'lumensolar-test-pasta-'));
    invokeMock.mockResolvedValueOnce(dirTeste);
    await escolherPastaDocumentos();
    rmSync(dirTeste, { recursive: true, force: true }); // a pasta escolhida deixa de existir
    expect(obterPastaPreferida()).toBe(dirTeste); // preferência ainda está salva, só a pasta sumiu

    invokeMock.mockResolvedValueOnce('/caminho/fake/Documentos'); // resposta do fallback (obter-pasta-documentos)
    const pasta = await obterPastaDocumentos();
    expect(pasta).toBe('/caminho/fake/Documentos');
    expect(invokeMock).toHaveBeenLastCalledWith('obter-pasta-documentos');
    // a preferência morta foi limpa automaticamente — não fica tentando gravar
    // num caminho que não existe mais pra sempre
    expect(obterPastaPreferida()).toBeNull();
  });
});
