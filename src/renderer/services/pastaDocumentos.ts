import fs from 'node:fs';
import path from 'node:path';

// BUG CORRIGIDO (set/2026): `import { ipcRenderer } from 'electron'` (import
// estático) quebra no build de PRODUÇÃO com "Failed to resolve module
// specifier 'electron'" — confirmado rodando o .xlsx/.pdf gerado pelo app
// real empacotado (não o servidor de dev do Vite). `rollupOptions.external`
// (vite.config.ts) faz o Rollup deixar o especificador "electron" tal e qual
// no JS de saída, sem reescrever — o carregador ESM nativo do Chromium (que
// executa os chunks de import() dinâmico no contexto file:// do app
// empacotado) não sabe resolver um specifier "bare" desses sozinho; só o
// `require()` do Node (disponível como global de verdade por causa de
// nodeIntegration:true, independente de como o Vite montou o grafo de
// import ESM) resolve em tempo de execução, nos dois contextos (dev server
// E build empacotado). É por isso que nenhum outro arquivo deste renderer
// importava 'electron' estaticamente antes deste — mantendo o mesmo padrão
// `require()` em runtime já usado em outros lugares do projeto.
function obterIpcRenderer(): typeof import('electron').ipcRenderer {
  const electron = (window as any).require
    ? (window as any).require('electron')
    : require('electron');
  return electron.ipcRenderer;
}

/**
 * Resolve o diretório "Documentos" real do usuário via IPC para o processo
 * principal — `app.getPath('documents')` só existe lá (Electron.app não é
 * exposto ao renderer, nem com nodeIntegration:true, que dá acesso a
 * ipcRenderer/fs/path mas não às APIs de janela/ciclo de vida do Electron).
 *
 * BUG CORRIGIDO (set/2026, auditoria de robustez do processo principal): os 3
 * geradores de Excel (`gerarExcelAuditoria`, `gerarFormularioCemigMicroGD`,
 * `gerarCronograma`) usam `XLSX.writeFile(wb, caminho)`, que grava com `fs`
 * direto — funciona no renderer por causa de `nodeIntegration: true` (ver
 * `src/main/index.ts`), e por isso nunca lançou nenhum erro visível. O
 * problema não é o mecanismo de escrita, é o DESTINO: por padrão o caminho
 * era relativo (resolvido contra `process.cwd()`). Isso é inofensivo em
 * desenvolvimento (cwd = pasta do projeto), mas o único alvo Windows
 * configurado em package.json é `build.win.target = "portable"` — o formato
 * "portable" do electron-builder EXTRAI o .exe pra uma pasta temporária a
 * cada execução (tipicamente dentro de %LOCALAPPDATA%\Temp\...) e roda com
 * cwd apontando pra lá. Resultado prático pro usuário real: o Excel é gerado
 * com sucesso (nenhum erro, nenhum aviso), mas pousa numa pasta temporária
 * que ele não escolheu, não vê no Explorer por padrão, e que o Windows pode
 * limpar mais tarde — o arquivo "sumiu" sem nenhum sintoma que apontasse pra
 * causa. Verificado nesta sessão com o app real rodando (Playwright +
 * Electron, ver scripts/smoke_test.mjs): antes da correção o Excel pousava
 * em process.cwd() (pasta do projeto); depois, no diretório resolvido por
 * app.getPath('documents'). Neste ambiente Linux de teste isso resolveu para
 * a própria pasta HOME (não há um "~/Documents" configurado via XDG neste
 * container) — no Windows real (a única plataforma que este app builda),
 * app.getPath('documents') usa a API nativa de Known Folders, que resolve a
 * pasta Documentos corretamente mesmo quando redirecionada pelo OneDrive
 * (cada vez mais comum em instalações padrão do Windows 11), o que um
 * caminho fixo tipo os.homedir()+'Documents' não trataria.
 *
 * Fallback pra `process.cwd()` (comportamento antigo) quando o IPC não está
 * disponível — por exemplo em testes/scripts que chamam os geradores
 * diretamente fora do Electron (eles já passam pastaDestino próprio ou usam
 * o default do parâmetro, então nem chegam a chamar esta função).
 *
 * ADICIONADO (set/2026, pedido direto do usuário: "o ideal é que o usuário
 * escolha onde quer salvar"): antes desta mudança, a pasta Documentos do
 * Windows era a ÚNICA opção, sem nenhuma forma de o usuário escolher outro
 * lugar (pendrive, pasta de rede, pasta específica de um cliente/projeto).
 * Agora `obterPastaDocumentos()` primeiro confere se existe uma pasta
 * PREFERIDA salva (`obterPastaPreferida()`, localStorage — sobrevive entre
 * sessões, mesmo padrão já usado para `salvarEmpresa()`); só cai pro padrão
 * do Windows se não houver preferência OU se a preferência salva não existir
 * mais no disco (pendrive desconectado, pasta apagada/renomeada) — nesse
 * caso a preferência inválida é apagada automaticamente (não fica tentando
 * gravar num caminho morto pra sempre) e um aviso vai pro console.
 */
let cache: string | null = null;

const CHAVE_PASTA_PREFERIDA = 'lumen:pastaDocumentosPreferida';

/** Pasta escolhida manualmente pelo usuário (via `escolherPastaDocumentos()`), ou `null` se nunca escolheu. */
export function obterPastaPreferida(): string | null {
  try {
    return localStorage.getItem(CHAVE_PASTA_PREFERIDA) || null;
  } catch {
    return null;
  }
}

function salvarPastaPreferida(pasta: string): void {
  try {
    localStorage.setItem(CHAVE_PASTA_PREFERIDA, pasta);
  } catch (e) {
    console.warn('[pastaDocumentos] não foi possível salvar a pasta preferida:', e);
  }
}

/** Remove a preferência salva — volta a usar a pasta Documentos padrão do Windows. */
export function limparPastaPreferida(): void {
  try {
    localStorage.removeItem(CHAVE_PASTA_PREFERIDA);
  } catch (e) {
    console.warn('[pastaDocumentos] não foi possível limpar a pasta preferida:', e);
  }
  cache = null;
}

/**
 * Abre o diálogo nativo do Windows pra escolher a pasta. Devolve a pasta
 * escolhida (e já salva como preferência) ou `null` se o usuário cancelou —
 * o chamador deve tratar `null` como "nada mudou", nunca como erro.
 */
export async function escolherPastaDocumentos(): Promise<string | null> {
  const escolhida: string | null = await obterIpcRenderer().invoke('escolher-pasta-documentos');
  if (!escolhida) return null;
  salvarPastaPreferida(escolhida);
  return escolhida;
}

export async function obterPastaDocumentos(): Promise<string> {
  // BUG CORRIGIDO (set/2026, achado escrevendo o teste de regressão — a pasta
  // preferida some no meio da sessão — antes de existir de verdade): a
  // preferência era conferida só na PRIMEIRA chamada; depois disso `cache`
  // (pensado só pra evitar round-trip de IPC repetido durante "Pacote
  // Completo", que chama esta função 7x seguidas) fazia `obterPastaDocumentos()`
  // devolver o caminho preferido antigo sem NUNCA mais checar se ele ainda
  // existe — um pendrive desconectado ou pasta apagada no meio da sessão só
  // seria percebido quando `fs.writeFileSync` finalmente lançasse um erro de
  // I/O real lá na frente, em vez do fallback automático pro padrão do
  // Windows já documentado acima. Corrigido: a preferência agora é
  // revalidada em TODA chamada (fs.existsSync é síncrono e barato — nada a
  // ver com o custo do IPC, que é o que o cache realmente evita); o cache só
  // se aplica ao caminho padrão do Windows resolvido via IPC.
  const preferida = obterPastaPreferida();
  if (preferida) {
    if (fs.existsSync(preferida) && fs.statSync(preferida).isDirectory()) {
      return preferida;
    }
    console.warn(`[pastaDocumentos] pasta preferida "${preferida}" não existe mais — voltando ao padrão do Windows.`);
    limparPastaPreferida(); // não mexe em `cache` do padrão — só limpa a preferência morta
  }

  if (cache) return cache;
  try {
    const pasta: string = await obterIpcRenderer().invoke('obter-pasta-documentos');
    if (typeof pasta === 'string' && pasta) {
      cache = pasta;
      return cache;
    }
    return process.cwd();
  } catch (e) {
    console.warn('[pastaDocumentos] IPC indisponível, usando cwd como fallback:', e);
    return process.cwd();
  }
}

/**
 * BUG CORRIGIDO (set/2026): os 7 pontos de "download" de PDF em App.tsx
 * (gerarPDFCliente, gerarPDFTecnico, gerarMemorial, gerarProcuracao, gerarDUB,
 * gerarPlantaSituacao, enviarEmailComPDF) usavam o padrão
 * `URL.createObjectURL(blob)` + `<a download>.click()` + `URL.revokeObjectURL(url)`
 * — com a revogação da URL chamada IMEDIATAMENTE após o `.click()`, na
 * linha seguinte, de forma síncrona.
 *
 * Isso é uma condição de corrida conhecida do Chromium: `.click()` num
 * `<a download>` com `href` blob: dispara o download de forma ASSÍNCRONA (o
 * processo do browser precisa ler o conteúdo do blob antes de gravar o
 * arquivo) — revogar a URL antes desse processo terminar de ler pode
 * invalidar o blob no meio do caminho. Quando isso acontece, NENHUM erro é
 * lançado pro código JS (`.click()` não retorna promise nem lança), então o
 * `try{}catch{}` ao redor nunca via nada de errado — a função simplesmente
 * terminava normalmente, e (no caso de gerarPacoteCompleto) o documento era
 * contado como "✅ Gerado" mesmo quando nada foi salvo.
 *
 * CONFIRMADO nesta sessão com o app real rodando: instrumentei
 * `session.on('will-download', ...)` no processo principal (diagnóstico,
 * revertido depois) e cliquei no botão "Proposta" pela UI de verdade —
 * o evento `will-download` NUNCA disparou. Ou seja, não é só "o diálogo
 * nativo não aparece" — o Electron nunca chega a iniciar o download. Uma
 * busca em disco por PDFs novos após clicar nos 5 botões de PDF (+ o
 * caminho de e-mail) confirmou: zero arquivos novos em qualquer lugar
 * plausível (cwd, pasta Documentos resolvida, ~/Downloads, diretório
 * userData do Electron).
 *
 * Corrigido eliminando o mecanismo de download do browser por completo:
 * grava o PDF direto com `fs` (mesmo padrão já usado pelos 3 geradores de
 * Excel, disponível no renderer por causa de nodeIntegration:true) na pasta
 * Documentos resolvida por `obterPastaDocumentos()` — sem blob URL, sem
 * elemento <a>, sem timing assíncrono não determinístico pra dar errado.
 */
export async function salvarArquivoNativo(blob: Blob, nomeArquivo: string, pastaDestino?: string): Promise<string> {
  const pasta = pastaDestino ?? await obterPastaDocumentos();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const caminho = path.join(pasta, nomeArquivo);
  fs.writeFileSync(caminho, buffer);
  return caminho;
}
