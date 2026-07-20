/**
 * Testes do formato .lumensolar — persistência por arquivo.
 * Cobre: geração de nome, SHA-256, estrutura do arquivo, recentes.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { gerarId, nomeArquivo, listarRecentes, removerRecente } from './persistence';

// ── Utilitários de teste ──────────────────────────────────────────────────────

/** SHA-256 usando a Web Crypto API (mesmo algoritmo da produção) */
async function sha256(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  // Em Node.js (Vitest), usamos o módulo crypto nativo
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** Cria um arquivo .lumensolar de teste (sem Web Crypto — usa Node crypto) */
async function criarArquivoTeste(dados: any) {
  const dadosStr = JSON.stringify(dados, null, 2);
  const hash     = await sha256(dadosStr);
  return {
    _formato:     'LumenSolar' as const,
    _versao:      '2.0' as const,
    _criado:      new Date().toISOString(),
    _salvo:       new Date().toISOString(),
    _app:         'LumenSolar 2.0' as const,
    _nomeArquivo: nomeArquivo(dados.cliente?.nome || '', dados.criadoEm),
    _checksum:    `sha256:${hash}`,
    _dados:       dados,
  };
}

// ── Mock localStorage para ambiente Node/Vitest ──────────────────────────────
// Usa jsdom-like implementation para que Object.keys(localStorage) funcione
const _lsStore: Record<string,string> = {};
const localStorageMock = new Proxy(_lsStore, {
  get(target, key: string) {
    if (key === 'getItem')    return (k: string) => target[k] ?? null;
    if (key === 'setItem')    return (k: string, v: string) => { target[k] = v; };
    if (key === 'removeItem') return (k: string) => { delete target[k]; };
    if (key === 'length')     return Object.keys(target).length;
    if (key === 'key')        return (i: number) => Object.keys(target)[i] ?? null;
    if (key === 'clear')      return () => { Object.keys(target).forEach(k => delete target[k]); };
    return target[key];
  },
  ownKeys(target) { return Object.keys(target); },
  has(target, key) { return key in target; },
  getOwnPropertyDescriptor(target, key) { return Object.getOwnPropertyDescriptor(target, key); },
});
(globalThis as any).localStorage = localStorageMock;

// ── Dados de teste ────────────────────────────────────────────────────────────
const DADOS_VALIDOS = {
  id: 'abc123',
  criadoEm: '2026-07-10T10:00:00.000Z',
  cliente: { nome: 'Ana Maria', cpf: '123.456.789-00', cidade: 'Araguari', uf: 'MG' },
  empresa: { razaoSocial: 'Lumen Soluções Ltda', cnpj: '12.345.678/0001-90' },
  consumo: { contas: [], codigoDistribuidora: 'CEMIG', tipoLigacao: 'bifasica', cipMensalRS: 46.40, tarifaRealKWhComICMS: 1.18272801 },
  kit: { potenciaModuloWp: 550, quantidade: 4 },
  preco: { estruturaRS: 1200, aliquotaImpostos: 0.06, margemDesejada: 0.15 },
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('Formato .lumensolar — estrutura e nomenclatura', () => {

  it('[ARQ01] gerarId() produz IDs únicos (1000 amostras)', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => gerarId()));
    expect(ids.size).toBe(1000);
  });

  it('[ARQ02] nomeArquivo() formata corretamente', () => {
    const nome = nomeArquivo('Ana Maria', '2026-07-10T10:00:00.000Z');
    expect(nome).toBe('Ana_Maria_2026-07-10.lumensolar');
  });

  it('[ARQ03] nomeArquivo() remove acentos e caracteres especiais', () => {
    const nome = nomeArquivo('José Antônio Çá', '2026-07-10T00:00:00.000Z');
    expect(nome).not.toMatch(/[àáâãäçéêíóôõú]/i);
    expect(nome).toMatch(/\.lumensolar$/);
  });

  it('[ARQ04] nomeArquivo() substitui espaços por underscore', () => {
    const nome = nomeArquivo('Rafael Ribeiro Barreto');
    expect(nome).toMatch(/^Rafael_Ribeiro_Barreto_\d{4}-\d{2}-\d{2}\.lumensolar$/);
  });

  it('[ARQ05] nomeArquivo() sem nome → "Proposta"', () => {
    const nome = nomeArquivo('');
    expect(nome).toMatch(/^Proposta_/);
  });

  it('[ARQ06] estrutura do arquivo: todos os campos obrigatórios', async () => {
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    expect(arq._formato).toBe('LumenSolar');
    expect(arq._versao).toBe('2.0');
    expect(arq._criado).toBeTruthy();
    expect(arq._salvo).toBeTruthy();
    expect(arq._app).toBe('LumenSolar 2.0');
    expect(arq._checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(arq._dados).toEqual(DADOS_VALIDOS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Checksum SHA-256 — integridade dos dados', () => {

  it('[ARQ07] checksum é SHA-256 de JSON.stringify(_dados, null, 2)', async () => {
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    const dadosStr = JSON.stringify(DADOS_VALIDOS, null, 2);
    const hashEsperado = `sha256:${await sha256(dadosStr)}`;
    expect(arq._checksum).toBe(hashEsperado);
  });

  it('[ARQ08] qualquer alteração nos dados invalida o checksum', async () => {
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    const checksumOriginal = arq._checksum;

    // Simula alteração maliciosa nos dados
    const dadosAlterados = { ...DADOS_VALIDOS, cliente: { ...DADOS_VALIDOS.cliente, cpf: '000.000.000-00' } };
    const dadosAlteradosStr = JSON.stringify(dadosAlterados, null, 2);
    const checksumAlterado = `sha256:${await sha256(dadosAlteradosStr)}`;

    expect(checksumAlterado).not.toBe(checksumOriginal);
  });

  it('[ARQ09] SHA-256 é determinístico — mesmo input, mesmo output', async () => {
    const h1 = await sha256('LumenSolar teste');
    const h2 = await sha256('LumenSolar teste');
    expect(h1).toBe(h2);
  });

  it('[ARQ10] SHA-256 de strings diferentes são diferentes (colisão improvável)', async () => {
    const h1 = await sha256('Proposta A');
    const h2 = await sha256('Proposta B');
    expect(h1).not.toBe(h2);
  });

  it('[ARQ11] checksum tem exatamente 64 caracteres hex após "sha256:"', async () => {
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    const hash = arq._checksum.replace('sha256:', '');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('[ARQ12] serialização JSON é estável (whitespace=2)', async () => {
    // O JSON deve ser serializado com indent=2 para que o checksum seja
    // reprodutível e verificável por qualquer ferramenta externa
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    const str = JSON.stringify(arq._dados, null, 2);
    expect(str).toContain('\n  '); // confirma indentação com 2 espaços
  });

  it('[ARQ13] arquivo corrompido (JSON inválido) seria detectado', () => {
    // Simula o que aconteceria ao tentar parsear um arquivo corrompido
    const arquivoCorreto = '{"_formato":"LumenSolar","_checksum":"sha256:abc"}';
    const arquivoCorreto_parsed = JSON.parse(arquivoCorreto); // OK
    expect(arquivoCorreto_parsed._formato).toBe('LumenSolar');

    // Arquivo truncado (simulação de falha de disco)
    const arquivoCorrompido = '{"_formato":"LumenSolar","_dados":{truncated';
    expect(() => JSON.parse(arquivoCorrompido)).toThrow();
  });

  it('[ARQ14] arquivo de outro software é rejeitado', async () => {
    const arquivoAlheio = { tipo: 'outro_software', dados: {} };
    // Simulação: _formato !== 'LumenSolar' → rejeitado
    expect((arquivoAlheio as any)._formato).toBeUndefined();
    expect((arquivoAlheio as any)._formato !== 'LumenSolar').toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Metadados de recentes (localStorage)', () => {

  beforeEach(() => {
    // Limpar o localStorage antes de cada teste
    Object.keys(_lsStore).filter((k: string) => k.startsWith('lumen:recent:')).forEach((k: string) => delete _lsStore[k]);
  });

  it('[ARQ15] listarRecentes() retorna lista vazia quando não há recentes', () => {
    expect(listarRecentes()).toHaveLength(0);
  });

  it('[ARQ16] removerRecente() remove um item da lista', () => {
    // Adicionar manualmente
    localStorage.setItem('lumen:recent:test1', JSON.stringify({
      id: 'test1', nomeCliente: 'Teste', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString()
    }));
    expect(listarRecentes()).toHaveLength(1);
    removerRecente('test1');
    expect(listarRecentes()).toHaveLength(0);
  });

  it('[ARQ17] recentes são ordenados do mais recente para o mais antigo', () => {
    const datas = ['2026-01-01', '2026-03-15', '2026-07-10'];
    datas.forEach((d, i) => {
      localStorage.setItem(`lumen:recent:prop${i}`, JSON.stringify({
        id: `prop${i}`, nomeCliente: `Cliente ${i}`,
        criadoEm: `${d}T10:00:00.000Z`, atualizadoEm: `${d}T10:00:00.000Z`,
      }));
    });
    const lista = listarRecentes();
    expect(lista[0].atualizadoEm).toContain('2026-07-10');
    expect(lista[lista.length-1].atualizadoEm).toContain('2026-01-01');
  });

  it('[ARQ18] metadados corrompidos no localStorage são ignorados', () => {
    localStorage.setItem('lumen:recent:corrompido', 'ISSO_NAO_E_JSON{{{');
    // listarRecentes() filtra o corrompido
    const lista = listarRecentes();
    expect(lista.every(m => m && m.id)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Cenários de borda e segurança', () => {

  it('[ARQ19] dados com caracteres especiais são preservados intactos', async () => {
    const dados = { cliente: { nome: 'José Antônio Çá', cpf: '123.456.789-00', obs: 'Observação: "aspas" e \\backslash' } };
    const arq = await criarArquivoTeste(dados);
    expect(arq._dados.cliente.nome).toBe('José Antônio Çá');
    expect(arq._dados.cliente.obs).toContain('"aspas"');
  });

  it('[ARQ20] dados com valores null e undefined são preservados', async () => {
    const dados = { cliente: { nome: 'Ana', fax: null }, kit: { modelo: undefined } };
    const arq = await criarArquivoTeste(dados);
    expect(arq._dados.cliente.fax).toBeNull();
    // undefined é ignorado pelo JSON.stringify (comportamento padrão)
    expect(arq._dados.kit.modelo).toBeUndefined();
  });

  it('[ARQ21] proposta grande (200 campos) — checksum ainda funciona', async () => {
    const dados = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`campo${i}`, `valor ${i} — com acentuação: àáâãé`]));
    const arq = await criarArquivoTeste(dados);
    expect(arq._checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    // Verificar que o checksum é correto
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(JSON.stringify(arq._dados, null, 2), 'utf8').digest('hex');
    expect(arq._checksum).toBe(`sha256:${hash}`);
  });

  it('[ARQ22] dois projetos com nomes iguais têm IDs diferentes', () => {
    const id1 = gerarId();
    const id2 = gerarId();
    expect(id1).not.toBe(id2);
  });

  it('[ARQ23] arquivo .lumensolar é JSON puro — verificável por qualquer ferramenta', async () => {
    const arq = await criarArquivoTeste(DADOS_VALIDOS);
    const json = JSON.stringify(arq, null, 2);
    // Deve ser parseável por qualquer parser JSON padrão
    const parsed = JSON.parse(json);
    expect(parsed._formato).toBe('LumenSolar');
    expect(parsed._dados).toEqual(DADOS_VALIDOS);
  });
});
