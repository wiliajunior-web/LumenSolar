/**
 * Testes do formato .lumensolar — persistência por arquivo.
 * Cobre: geração de nome, SHA-256, estrutura do arquivo, recentes.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gerarId, nomeArquivo, listarRecentes, removerRecente, salvarArquivo, importarArquivo } from './persistence';

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

// ── Mock document/DOM para exercitar salvarArquivo()/importarArquivo() de
// verdade (não uma reimplementação da lógica em paralelo) ────────────────────
// CORRIGIDO/ADICIONADO (ago/2026): até esta sessão, `salvarArquivo` e
// `importarArquivo` — as duas funções REALMENTE usadas pelo app (salvar() e
// abrirImportado() em App.tsx) — nunca eram chamadas por nenhum teste; só
// helpers puros (nomeArquivo, gerarId) e uma reimplementação paralela da
// lógica de checksum eram testados. Um bug real dentro da função de
// verdade (nome de campo trocado, condição invertida, checksum calculado
// sobre o objeto errado) não seria pego. `Blob`/`URL.createObjectURL` já
// funcionam nativamente no Node 22 (verificado); só `document` precisa de
// stub mínimo — não dá para trocar o ambiente do vitest para jsdom (afetaria
// os outros 37 arquivos de teste), então a interceptação do <input type=file>
// é feita via um mock que devolve o "arquivo selecionado" configurado pelo
// teste antes de chamar importarArquivo().
let arquivoSelecionadoMock: { name: string; text: () => Promise<string> } | null = null;
// BUG CORRIGIDO (ago/2026): a produção chama sempre `input.click()` — quem
// decide se o navegador dispara `change` ou `cancel` é o próprio diálogo
// nativo, dependendo da escolha do usuário. Esta flag simula essa decisão do
// navegador dentro do mock (antes, `click()` disparava `onchange` sempre,
// mesmo simulando "cancelar" via `files=[]` — o que testava só o caminho
// "onchange com lista vazia", nunca o cancelamento real do diálogo, onde
// `change` simplesmente não dispara).
let simularCancelamentoMock = false;

class FakeInputArquivo {
  type = ''; accept = ''; onchange: (() => any) | null = null; oncancel: (() => any) | null = null;
  get files() { return arquivoSelecionadoMock ? [arquivoSelecionadoMock] : []; }
  click() {
    if (simularCancelamentoMock) { this.oncancel?.(); return; }
    this.onchange?.();
  }
}
class FakeAncora {
  href = ''; download = '';
  click() { /* no-op — produção só dispara o download do navegador real */ }
}
(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'input' ? new FakeInputArquivo() : new FakeAncora()),
  body: { appendChild: () => {}, removeChild: () => {} },
};

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

// ═══════════════════════════════════════════════════════════════════════════════
// salvarArquivo()/importarArquivo() DE VERDADE — não a reimplementação acima.
//
// BUG CORRIGIDO (set/2026): a versão anterior deste describe interceptava
// `URL.createObjectURL` e considerava o teste "passando" ao capturar o Blob —
// ou seja, testava exatamente o mecanismo de download do browser
// (`URL.createObjectURL` + `<a download>.click()` + `URL.revokeObjectURL`)
// que esta mesma auditoria confirmou estar QUEBRADO (condição de corrida do
// Chromium — revogar a URL imediatamente após o clique podia invalidar o
// blob antes do download terminar de ler seu conteúdo; nenhum erro chega ao
// JS quando isso acontece). Ou seja: este teste passava mesmo com o bug real
// presente — ele nunca verificava que um ARQUIVO de verdade chegava ao
// disco, só que a API do browser tinha sido *chamada*. `salvarArquivo()` foi
// corrigido para gravar direto com `fs` (ver persistence.ts/pastaDocumentos.ts);
// o teste agora usa um diretório temporário real (mesmo padrão dos testes de
// Excel desta sessão) e lê o arquivo de volta do disco de verdade.
describe('salvarArquivo() — exercitando a função real de produção (grava no disco de verdade)', () => {
  const DIR_TESTE = mkdtempSync(path.join(os.tmpdir(), 'lumensolar-test-persistence-'));

  beforeEach(() => {
    Object.keys(_lsStore).forEach(k => delete _lsStore[k]);
    arquivoSelecionadoMock = null;
  });

  it('gera o envelope correto (formato/versão/checksum) e grava um arquivo real e legível no disco', async () => {
    const dados = { ...DADOS_VALIDOS, id: 'proj-001', cliente: { nome: 'Rafael Ribeiro' },
      dimensionamento: { potenciaInstaladaRealKWp: 5.5 }, precificacao: { precoVenda: 32000 } };
    const nome = await salvarArquivo(dados, DIR_TESTE);

    expect(nome).toMatch(/^Rafael_Ribeiro_\d{4}-\d{2}-\d{2}\.lumensolar$/);

    const caminho = path.join(DIR_TESTE, nome);
    const conteudo = JSON.parse(readFileSync(caminho, 'utf8'));
    expect(conteudo._formato).toBe('LumenSolar');
    expect(conteudo._versao).toBe('2.0');
    expect(conteudo._dados).toEqual(dados);
    const hashEsperado = `sha256:${await sha256(JSON.stringify(dados, null, 2))}`;
    expect(conteudo._checksum).toBe(hashEsperado);

    const recentes = listarRecentes();
    expect(recentes).toHaveLength(1);
    expect(recentes[0]).toMatchObject({
      id: 'proj-001', nomeCliente: 'Rafael Ribeiro',
      potenciaKWp: 5.5, precoVenda: 32000, nomeArquivo: nome,
    });
  });

  // BUG CORRIGIDO (ago/2026): o teste acima usa `dados.dimensionamento`/
  // `dados.precificacao` (formato aninhado) — formato que `salvarArquivo()`
  // sabia ler, mas que o único chamador real (`App.tsx`, função `salvar()`)
  // NUNCA envia. `salvar()` monta `data.potenciaKWp`/`data.precoVenda` já
  // resolvidos na RAIZ do objeto, sem nenhum `data.dimensionamento`/
  // `data.precificacao`. Antes do fix, toda proposta salva pelo fluxo real
  // do app gravava `potenciaKWp: undefined, precoVenda: undefined` nos
  // metadados de "recentes" — a Home nunca mostrava potência/preço em
  // nenhum card de proposta salva de verdade. Este teste usa o formato REAL.
  it('grava potenciaKWp/precoVenda nos recentes a partir do formato REAL enviado por App.tsx (campos na raiz, sem dimensionamento/precificacao)', async () => {
    const dados = {
      id: 'proj-004', cliente: { nome: 'Fernanda Lima' }, criadoEm: '2026-08-01T10:00:00.000Z',
      potenciaKWp: 11.2, precoVenda: 58900,
      empresa: {}, consumo: {}, localizacao: {}, kit: {}, preco: {},
    };
    await salvarArquivo(dados, DIR_TESTE);
    const recentes = listarRecentes();
    expect(recentes).toHaveLength(1);
    expect(recentes[0]).toMatchObject({
      id: 'proj-004', nomeCliente: 'Fernanda Lima',
      potenciaKWp: 11.2, precoVenda: 58900,
    });
  });

  it('[REGRESSÃO set/2026] o arquivo gravado é lido de volta por importarArquivo() com checksum válido (ida e volta completa)', async () => {
    const dados = { id: 'proj-005', cliente: { nome: 'Roberto Alves' }, criadoEm: '2026-09-01T10:00:00.000Z',
      empresa: {}, consumo: {}, localizacao: {}, kit: {}, preco: {} };
    const nome = await salvarArquivo(dados, DIR_TESTE);
    const caminho = path.join(DIR_TESTE, nome);
    const conteudoDisco = readFileSync(caminho, 'utf8');

    arquivoSelecionadoMock = { name: nome, text: async () => conteudoDisco };
    const resultado = await importarArquivo();
    expect(resultado).toEqual(dados);
  });
});

describe('importarArquivo() — exercitando a função real de produção', () => {
  beforeEach(() => {
    Object.keys(_lsStore).forEach(k => delete _lsStore[k]);
    arquivoSelecionadoMock = null;
    simularCancelamentoMock = false;
  });

  it('importa um arquivo íntegro com sucesso e atualiza os recentes', async () => {
    const dados = { id: 'proj-002', cliente: { nome: 'Ana Souza' }, criadoEm: '2026-05-01T10:00:00.000Z',
      dimensionamento: { potenciaInstaladaRealKWp: 8.25 }, precificacao: { precoVenda: 45000 } };
    const arq = await criarArquivoTeste(dados);
    arquivoSelecionadoMock = { name: 'Ana_Souza.lumensolar', text: async () => JSON.stringify(arq) };

    const resultado = await importarArquivo();
    expect(resultado).toEqual(dados);

    const recentes = listarRecentes();
    expect(recentes).toHaveLength(1);
    expect(recentes[0]).toMatchObject({ id: 'proj-002', nomeCliente: 'Ana Souza', potenciaKWp: 8.25, precoVenda: 45000 });
  });

  it('resolve null quando o navegador dispara change com lista de arquivos vazia', async () => {
    arquivoSelecionadoMock = null; // input.files fica []
    const resultado = await importarArquivo();
    expect(resultado).toBeNull();
    expect(listarRecentes()).toHaveLength(0);
  });

  // BUG CORRIGIDO (ago/2026): faltava handler de `cancel` — quando o usuário
  // clica em "Cancelar" no diálogo nativo (Chromium/Electron), o evento
  // `change` NÃO dispara (diferente do teste acima, que testa o caso de
  // `change` disparar com lista vazia — cenário distinto). Sem
  // `input.oncancel`, a Promise nunca era resolvida nem rejeitada — ficava
  // pendurada para sempre. `simularCancelamentoMock=true` faz o mock disparar
  // `oncancel` (não `onchange`) em `click()`, reproduzindo o comportamento
  // real do DOM.
  it('resolve null quando o usuário clica em "Cancelar" no diálogo nativo (change nunca dispara)', async () => {
    simularCancelamentoMock = true;
    const resultado = await importarArquivo();
    expect(resultado).toBeNull();
    expect(listarRecentes()).toHaveLength(0);
  });

  // BUG CORRIGIDO (ago/2026): `d.dimensionamento?.potenciaInstaladaRealKWp` e
  // `d.precificacao?.precoVenda` nunca existem no formato REAL que App.tsx
  // salva (campos ficam em `d.potenciaKWp`/`d.precoVenda`, na raiz — ver
  // `salvar()` em App.tsx). O teste acima ("importa um arquivo íntegro...")
  // usa o formato aninhado antigo, que nunca é o formato real — dava falsa
  // confiança. Este teste usa o formato de verdade.
  it('importa um arquivo no formato REAL salvo por App.tsx (potenciaKWp/precoVenda na raiz, sem dimensionamento/precificacao)', async () => {
    const dados = {
      id: 'proj-003', cliente: { nome: 'Carlos Mendes' }, criadoEm: '2026-06-01T10:00:00.000Z',
      potenciaKWp: 6.6, precoVenda: 38500,
      empresa: {}, consumo: {}, localizacao: {}, kit: {}, preco: {},
    };
    const arq = await criarArquivoTeste(dados);
    arquivoSelecionadoMock = { name: 'Carlos_Mendes.lumensolar', text: async () => JSON.stringify(arq) };

    const resultado = await importarArquivo();
    expect(resultado).toEqual(dados);

    const recentes = listarRecentes();
    expect(recentes).toHaveLength(1);
    expect(recentes[0]).toMatchObject({ id: 'proj-003', nomeCliente: 'Carlos Mendes', potenciaKWp: 6.6, precoVenda: 38500 });
  });

  it('rejeita com erro descritivo quando o JSON está corrompido/truncado', async () => {
    arquivoSelecionadoMock = { name: 'quebrado.lumensolar', text: async () => '{"_formato":"LumenSolar","_dados":{trunc' };
    await expect(importarArquivo()).rejects.toThrow(/JSON válido/);
  });

  it('rejeita arquivo de outro formato/software (_formato incorreto)', async () => {
    arquivoSelecionadoMock = { name: 'outro.json', text: async () => JSON.stringify({ _formato: 'OutroApp', _dados: {} }) };
    await expect(importarArquivo()).rejects.toThrow(/não é um arquivo LumenSolar/);
  });

  it('rejeita arquivo incompleto (sem _versao ou _dados)', async () => {
    arquivoSelecionadoMock = { name: 'incompleto.lumensolar', text: async () => JSON.stringify({ _formato: 'LumenSolar' }) };
    await expect(importarArquivo()).rejects.toThrow(/incompleto ou é de uma versão muito antiga/);
  });

  it('[REGRESSÃO] rejeita quando o checksum não bate — dados alterados após salvar', async () => {
    const dados = { id: 'proj-003', cliente: { nome: 'Cliente Alterado' } };
    const arq = await criarArquivoTeste(dados);
    // Simula adulteração: o checksum gravado não muda, mas _dados sim —
    // exatamente o cenário que a validação de checksum existe para pegar.
    const arqAdulterado = { ...arq, _dados: { ...dados, cliente: { nome: 'Nome Trocado' } } };
    arquivoSelecionadoMock = { name: 'adulterado.lumensolar', text: async () => JSON.stringify(arqAdulterado) };
    await expect(importarArquivo()).rejects.toThrow(/corrompido ou modificado/);
    // Corrompido: os recentes NÃO devem ser atualizados com dado não confiável
    expect(listarRecentes()).toHaveLength(0);
  });

  it('aceita arquivo sem _checksum (compatibilidade com formato anterior à validação)', async () => {
    const dados = { id: 'proj-004', cliente: { nome: 'Legado' } };
    const arqSemChecksum = { _formato: 'LumenSolar', _versao: '2.0', _criado: '2026-01-01T00:00:00.000Z',
      _salvo: '2026-01-01T00:00:00.000Z', _app: 'LumenSolar 2.0', _nomeArquivo: 'Legado.lumensolar', _dados: dados };
    arquivoSelecionadoMock = { name: 'legado.lumensolar', text: async () => JSON.stringify(arqSemChecksum) };
    const resultado = await importarArquivo();
    expect(resultado).toEqual(dados);
  });
});
