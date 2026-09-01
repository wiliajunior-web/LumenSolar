/**
 * PERSISTÊNCIA POR ARQUIVO .lumensolar
 * =====================================
 * Cada proposta é salva como um arquivo independente no disco do usuário.
 *
 * FORMATO: JSON com cabeçalho de integridade
 * CHECKSUM: SHA-256 via Web Crypto API (nativo no Electron/Chromium)
 * EXTENSÃO: .lumensolar
 *
 * Vantagens vs localStorage:
 *   ✓ Dados no sistema de arquivos — o usuário controla
 *   ✓ Pode copiar, renomear, enviar por e-mail, colocar no Google Drive
 *   ✓ SHA-256 detecta qualquer corrupção antes de carregar
 *   ✓ Múltiplas máquinas — só copiar o arquivo
 *   ✓ Zero risco de perda por limpeza de cache ou reinstalação
 */

import { gerarId } from './utils';
import { salvarArquivoNativo } from './pastaDocumentos';

export { gerarId };

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface MetadataProposta {
  id: string;
  nomeCliente: string;
  cidade?: string;
  uf?: string;
  criadoEm: string;
  atualizadoEm: string;
  potenciaKWp?: number;
  precoVenda?: number;
  nomeArquivo?: string;  // ex: "Proposta_Rafael_2026-07-10.lumensolar"
}

interface ArquivoLumenSolar {
  _formato: 'LumenSolar';
  _versao: '2.0';
  _criado: string;
  _salvo: string;
  _app: 'LumenSolar 2.0';
  _nomeArquivo: string;
  _checksum: string;    // "sha256:<64 hex chars>" — calculado sobre _dados
  _dados: any;
}

// ─── Checksum SHA-256 ────────────────────────────────────────────────────────

/**
 * Calcula SHA-256 de uma string usando a Web Crypto API.
 * Disponível nativamente no Electron/Chromium — sem bibliotecas externas.
 */
async function sha256(texto: string): Promise<string> {
  const bytes  = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Nome do arquivo ─────────────────────────────────────────────────────────

export function nomeArquivo(nomeCliente: string, data?: string): string {
  const nome = (nomeCliente || 'Proposta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '')   // remove especiais
    .trim()
    .replace(/\s+/g, '_');
  const d = (data || new Date().toISOString()).slice(0, 10);
  return `${nome}_${d}.lumensolar`;
}

// ─── Salvar arquivo ──────────────────────────────────────────────────────────

/**
 * Serializa os dados do projeto em um arquivo .lumensolar e grava no disco.
 *
 * BUG CORRIGIDO (set/2026): usava o MESMO padrão `URL.createObjectURL(blob)` +
 * `<a download>.click()` + `URL.revokeObjectURL(url)` já confirmado quebrado
 * nos 5 botões de PDF desta sessão (ver comentário completo em
 * `salvarArquivoNativo`, pastaDocumentos.ts — instrumentei
 * `session.on('will-download')` no processo principal e confirmei que o
 * evento nunca dispara para este exato padrão de código). Esta é a função
 * de "Salvar" PRINCIPAL do app — o botão que grava o próprio arquivo de
 * projeto (.lumensolar) no disco, chamado por `salvar()` em App.tsx a cada
 * clique manual e (depois desta mesma auditoria) pelo autosave periódico.
 * Era o bug de maior risco possível encontrado nesta auditoria: o "Salvar"
 * do usuário podia estar silenciosamente não gravando nada, sem nenhum
 * erro, com a UI mostrando "salvo" (`setSaving('saved')` em App.tsx) mesmo
 * assim. Corrigido com o mesmo mecanismo já usado e verificado para PDF/
 * Excel: grava direto com `fs`, sem passar pelo gerenciador de download do
 * Chromium.
 */
export async function salvarArquivo(dados: any, pastaDestino?: string): Promise<string> {
  const agora    = new Date().toISOString();
  const nome     = nomeArquivo(dados.cliente?.nome || 'Proposta', agora);
  const dadosStr = JSON.stringify(dados, null, 2);
  const hash     = await sha256(dadosStr);

  const arquivo: ArquivoLumenSolar = {
    _formato:     'LumenSolar',
    _versao:      '2.0',
    _criado:      dados.criadoEm || agora,
    _salvo:       agora,
    _app:         'LumenSolar 2.0',
    _nomeArquivo: nome,
    _checksum:    `sha256:${hash}`,
    _dados:       dados,
  };

  const conteudo = JSON.stringify(arquivo, null, 2);
  const blob     = new Blob([conteudo], { type: 'application/json; charset=utf-8' });
  await salvarArquivoNativo(blob, nome, pastaDestino);

  // Guardar metadados no localStorage para exibir na lista de recentes
  //
  // BUG CORRIGIDO (ago/2026): lia `dados.dimensionamento?.potenciaInstaladaRealKWp`
  // e `dados.precificacao?.precoVenda` — campos aninhados que este arquivo
  // esperava, mas que o único chamador real (`App.tsx`, função `salvar()`)
  // NUNCA envia: ele monta `data` com `potenciaKWp`/`precoVenda` já resolvidos
  // na RAIZ do objeto (`data.potenciaKWp`, `data.precoVenda`), sem nenhum
  // `data.dimensionamento`/`data.precificacao`. Como `salvarArquivo(dados: any)`
  // não é tipado, o tsc nunca acusou essa dessincronia de contrato. Resultado:
  // toda proposta salva pelo fluxo real do app tinha `potenciaKWp`/`precoVenda`
  // gravados como `undefined` nos metadados de "recentes", e a Home nunca
  // mostrava potência/preço em nenhum card de proposta salva (a renderização
  // é condicional em `App.tsx`: `{p.potenciaKWp && (...)}`).
  _salvarMetadata({
    id:           dados.id || gerarId(),
    nomeCliente:  dados.cliente?.nome  || 'Sem nome',
    cidade:       dados.cliente?.cidade,
    uf:           dados.cliente?.uf,
    criadoEm:     dados.criadoEm || agora,
    atualizadoEm: agora,
    potenciaKWp:  dados.potenciaKWp ?? dados.dimensionamento?.potenciaInstaladaRealKWp,
    precoVenda:   dados.precoVenda ?? dados.precificacao?.precoVenda,
    nomeArquivo:  nome,
  });

  return nome;
}

// ─── Importar arquivo ────────────────────────────────────────────────────────

/**
 * Abre o seletor de arquivo nativo.
 * Valida o checksum SHA-256 antes de retornar os dados.
 * Lança erro descritivo se o arquivo estiver corrompido ou inválido.
 */
export function importarArquivo(): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.lumensolar,application/json';

    // BUG CORRIGIDO (ago/2026): só havia listener em `onchange` — em
    // navegadores Chromium/Electron, quando o usuário abre o diálogo nativo
    // e clica em "Cancelar" sem escolher arquivo, o evento `change` NÃO
    // dispara (só dispara quando um arquivo é de fato selecionado). Sem um
    // handler de `cancel`, a Promise retornada nunca era resolvida nem
    // rejeitada nesse caso — ficava pendurada para sempre (o teste que
    // afirmava cobrir "usuário fecha o seletor sem escolher arquivo" usava um
    // mock que sempre disparava `onchange`, então não reproduzia o
    // comportamento real do DOM). Resolver com `null` no cancelamento, igual
    // ao "nenhum arquivo selecionado" dentro de `onchange`.
    input.oncancel = () => resolve(null);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      try {
        const texto = await file.text();

        // 1. Parse JSON
        let arquivo: ArquivoLumenSolar;
        try {
          arquivo = JSON.parse(texto);
        } catch {
          throw new Error(
            `"${file.name}" não é um arquivo JSON válido.\n` +
            'O arquivo pode ter sido corrompido durante a cópia.'
          );
        }

        // 2. Verificar formato
        if (arquivo._formato !== 'LumenSolar') {
          throw new Error(
            `"${file.name}" não é um arquivo LumenSolar.\n` +
            `Campo _formato: "${arquivo._formato}" (esperado: "LumenSolar")`
          );
        }

        // 3. Verificar versão
        if (!arquivo._versao || !arquivo._dados) {
          throw new Error(
            `"${file.name}" está incompleto ou é de uma versão muito antiga.`
          );
        }

        // 4. Validar checksum SHA-256
        if (arquivo._checksum) {
          const dadosStr        = JSON.stringify(arquivo._dados, null, 2);
          const hashCalculado   = `sha256:${await sha256(dadosStr)}`;

          if (hashCalculado !== arquivo._checksum) {
            throw new Error(
              `ATENÇÃO: O arquivo "${file.name}" foi corrompido ou modificado!\n\n` +
              `Checksum gravado:   ${arquivo._checksum}\n` +
              `Checksum calculado: ${hashCalculado}\n\n` +
              'Os dados NÃO foram carregados. Use uma cópia íntegra do arquivo.'
            );
          }
        }

        // 5. Atualizar metadados de recentes
        // BUG CORRIGIDO (ago/2026): mesmo bug de `salvarArquivo()` acima —
        // `d.dimensionamento`/`d.precificacao` nunca existem no formato real
        // salvo por `App.tsx` (campos ficam em `d.potenciaKWp`/`d.precoVenda`
        // na raiz). Ver comentário completo em `salvarArquivo()`.
        const d = arquivo._dados;
        _salvarMetadata({
          id:           d.id || gerarId(),
          nomeCliente:  d.cliente?.nome  || 'Sem nome',
          cidade:       d.cliente?.cidade,
          uf:           d.cliente?.uf,
          criadoEm:     d.criadoEm || arquivo._criado,
          atualizadoEm: arquivo._salvo  || new Date().toISOString(),
          potenciaKWp:  d.potenciaKWp ?? d.dimensionamento?.potenciaInstaladaRealKWp,
          precoVenda:   d.precoVenda ?? d.precificacao?.precoVenda,
          nomeArquivo:  arquivo._nomeArquivo || file.name,
        });

        resolve(arquivo._dados);

      } catch (err) {
        reject(err);
      }
    };

    // Disparar o diálogo
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

// ─── Metadados de recentes (localStorage) ────────────────────────────────────

const KEY_RECENT = 'lumen:recent:';
const MAX_RECENTES = 20;

function _salvarMetadata(m: MetadataProposta) {
  localStorage.setItem(KEY_RECENT + m.id, JSON.stringify(m));
  _limparAntigos();
}

function _limparAntigos() {
  const chaves = Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_RECENT));
  if (chaves.length <= MAX_RECENTES) return;
  const metas = chaves
    .map(k => { try { return JSON.parse(localStorage.getItem(k)!); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
  metas.slice(MAX_RECENTES).forEach((m: MetadataProposta) =>
    localStorage.removeItem(KEY_RECENT + m.id)
  );
}

export function listarRecentes(): MetadataProposta[] {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_RECENT))
    .map(k => { try { return JSON.parse(localStorage.getItem(k)!); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
}

export function removerRecente(id: string) {
  localStorage.removeItem(KEY_RECENT + id);
}

// ─── Empresa (localStorage — configuração global) ────────────────────────────

const KEY_EMPRESA = 'lumen:empresa';

export function carregarEmpresa(): any | null {
  const raw = localStorage.getItem(KEY_EMPRESA);
  return raw ? JSON.parse(raw) : null;
}

export function salvarEmpresa(empresa: any): void {
  localStorage.setItem(KEY_EMPRESA, JSON.stringify(empresa));
}
