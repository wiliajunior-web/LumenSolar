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
 * causa. Não verificado em uma instalação Windows real (não há como, neste
 * ambiente) — o comportamento de extração do formato "portable" do
 * electron-builder é documentado e conhecido, não uma suposição sobre este
 * app específico, mas a mitigação (resolver `app.getPath('documents')` em vez
 * de depender do cwd) é aplicada de qualquer forma por ser de baixo risco e
 * alto benefício potencial: mesmo se o cwd acabar sendo inofensivo em algum
 * cenário, salvar direto na pasta Documentos do usuário é estritamente melhor
 * UX do que salvar num cwd desconhecido.
 *
 * Fallback pra `process.cwd()` (comportamento antigo) quando o IPC não está
 * disponível — por exemplo em testes/scripts que chamam os geradores
 * diretamente fora do Electron (eles já passam pastaDestino próprio ou usam
 * o default do parâmetro, então nem chegam a chamar esta função).
 */
let cache: string | null = null;

export async function obterPastaDocumentos(): Promise<string> {
  if (cache) return cache;
  try {
    // nodeIntegration:true + contextIsolation:false (ver src/main/index.ts) →
    // require('electron') funciona direto no renderer, sem preload/contextBridge.
    const electron = (window as any).require
      ? (window as any).require('electron')
      : require('electron');
    const pasta: string = await electron.ipcRenderer.invoke('obter-pasta-documentos');
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
