import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_HTML = path.join(__dirname, '../dist/index.html');

const PRELOAD_CANDIDATES = [
  path.join(__dirname, 'preload/index.mjs'),
  path.join(__dirname, 'preload/index.js'),
];
const PRELOAD_PATH = PRELOAD_CANDIDATES.find(p => existsSync(p));

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'LumenSolar — Lumen Soluções',
    show: false,
    webPreferences: {
      ...(PRELOAD_PATH ? { preload: PRELOAD_PATH } : {}),
      // nodeIntegration necessário para @react-pdf/renderer (usa require internamente)
      nodeIntegration: true,
      contextIsolation: false,
      // INVESTIGADO, MANTIDO DE PROPÓSITO (set/2026) — não é um flag esquecido.
      //
      // `webSecurity: false` desliga same-origin/CORS por completo no
      // renderer — uma superfície de ataque real: qualquer conteúdo web que
      // este app venha a carregar no futuro (hoje é só o próprio app,
      // carregado local via file://) ficaria sem a última linha de defesa
      // do Chromium contra requisições cross-origin maliciosas. Auditei os 3
      // pontos de rede externa do app pra achar o motivo real de estar
      // ligado, em vez de só desligar às cegas:
      //
      //   1. `App.tsx` (import de datasheet por IA): POST direto pra
      //      api.anthropic.com com a chave QUE O PRÓPRIO USUÁRIO cadastra em
      //      ⚙ Empresa (não é credencial embutida no app) — não precisa de
      //      webSecurity:false, é só uma chamada de rede normal.
      //   2. `BuscadorCoordenadas` (App.tsx): geocodifica endereço via
      //      nominatim.openstreetmap.org — API pública, sem credencial,
      //      também não depende de webSecurity:false pra funcionar.
      //   3. `satelliteMosaic.ts` (mosaico de satélite da Planta de
      //      Situação): busca tiles de server.arcgisonline.com, desenha cada
      //      um num <canvas> com `img.crossOrigin = 'anonymous'` (linha ~52)
      //      e no final chama `canvas.toDataURL()` (linha ~111) pra virar
      //      imagem do PDF. ESTE é o motivo mais provável: se o servidor de
      //      tiles não devolver cabeçalho CORS permissivo em TODO tile (nem
      //      sempre é garantido em servidores públicos de mapa), o canvas
      //      fica "tainted" e `toDataURL()` lança SecurityError — quebrando
      //      a Planta de Situação pra qualquer endereço. `webSecurity:false`
      //      desliga essa checagem de tainting inteira, então nunca quebra,
      //      não importa o que o ArcGIS mande.
      //
      // Não removi o flag: pra confirmar que dá pra tirar com segurança eu
      // precisaria testar o mosaico de satélite de verdade contra
      // server.arcgisonline.com — e ESTE AMBIENTE (sandbox de teste) tem
      // egress bloqueado pra esse domínio especificamente (ver comentário em
      // satelliteMosaic.ts), então qualquer teste aqui não prova nada sobre
      // o comportamento real no Windows do usuário. Mudar às cegas um flag
      // de segurança carregado por uma feature que já está em produção, sem
      // conseguir verificar, é pior do que deixar como está.
      //
      // Caminho pra resolver isso de verdade, se algum dia valer a pena (só
      // com o app rodando numa máquina com acesso de verdade a
      // arcgisonline.com): trocar `webSecurity: false` por
      // `webSecurity: true` + testar se a Planta de Situação ainda gera
      // corretamente pra 3-4 endereços diferentes. Se quebrar, a correção
      // correta não é religar este flag global — é buscar os tiles pelo
      // processo PRINCIPAL (`net.fetch` do Electron, que não tem CORS) e
      // passar os bytes pro renderer via IPC, em vez de `<img crossOrigin>`
      // direto no renderer.
      webSecurity: false,
    },
  });

  win.once('ready-to-show', () => win?.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ADICIONADO (set/2026, robustecimento do processo principal): antes disso,
  // não havia NENHUM handler pra renderer travado/morto — se o processo do
  // renderer caísse (falta de memória, crash nativo do Chromium etc.), a janela
  // ficava simplesmente parada/em branco pro usuário, sem nenhum aviso e sem
  // nada registrado. Não tento reabrir automaticamente (poderia entrar em loop
  // se a causa for determinística, ex: um bug que trava toda vez com os mesmos
  // dados) — só avisa e registra, deixando a decisão de reabrir com o usuário.
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone:', details.reason, details);
    if (details.reason !== 'clean-exit') {
      dialog.showErrorBox(
        'LumenSolar travou',
        `A janela do aplicativo parou de responder (motivo: ${details.reason}). ` +
        'Feche esta janela e abra o LumenSolar novamente. Se tinha um formulário ' +
        'preenchido sem salvar, esses dados foram perdidos nesta falha.'
      );
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const fileUrl = `file:///${RENDERER_HTML.replace(/\\/g, '/')}`;
    win.loadURL(fileUrl);
  }
}

// ADICIONADO (set/2026): resolve a pasta "Documentos" real do Windows (via API
// nativa do Electron, que trata redirecionamento por OneDrive — cada vez mais
// comum em instalações padrão do Windows 11 — corretamente; um caminho fixo tipo
// os.homedir()+'Documents' não trataria). Consumido pelos 3 geradores de Excel
// (ver `pastaDestino` em gerarExcel.ts/gerarFormularioCemig.ts/gerarCronograma.ts)
// através de `src/renderer/services/pastaDocumentos.ts`. Motivo: o único alvo
// Windows deste app (build.win.target = "portable" em package.json) roda com
// cwd dentro de uma pasta temporária de extração do electron-builder — sem isso,
// XLSX.writeFile(wb, nomeArquivo) (caminho relativo) gravava certo, mas num
// lugar que o usuário não escolheu e dificilmente encontraria depois.
ipcMain.handle('obter-pasta-documentos', () => app.getPath('documents'));

// ADICIONADO (set/2026): feedback real de usuário — "o ideal é que o usuário
// escolha onde quer salvar" — `obter-pasta-documentos` acima só devolve o
// padrão do Windows (Documentos), sem nenhuma forma de o usuário escolher
// outro lugar (um pendrive, uma pasta de rede, uma pasta específica do
// cliente). Abre o diálogo NATIVO de escolha de pasta do próprio Windows —
// `dialog.showOpenDialog` só existe no processo principal (por isso é IPC,
// mesmo padrão de `obter-pasta-documentos`). `properties: ['openDirectory',
// 'createDirectory']` deixa o usuário criar uma pasta nova ali mesmo, sem
// precisar sair do diálogo. Devolve `null` se o usuário cancelar — o
// chamador (`escolherPastaDocumentos` em pastaDocumentos.ts) trata isso como
// "não mudou nada", nunca como pasta vazia/raiz.
ipcMain.handle('escolher-pasta-documentos', async () => {
  const opcoes = {
    title: 'Escolha onde salvar os documentos do LumenSolar',
    defaultPath: app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'] as const,
  };
  // `win` pode em teoria já ter sido fechado entre o clique e a resposta do
  // IPC — `dialog.showOpenDialog` aceita rodar sem janela-pai (só perde o
  // comportamento modal), então não vale a pena falhar a escolha de pasta
  // por causa disso.
  const resultado = win ? await dialog.showOpenDialog(win, opcoes) : await dialog.showOpenDialog(opcoes);
  if (resultado.canceled || !resultado.filePaths[0]) return null;
  return resultado.filePaths[0];
});

// BUG CORRIGIDO (set/2026, auditoria de código adjacente ao revisar este mesmo
// arquivo por outro motivo): o comentário original aqui dizia "não tenta
// engolir o erro e continuar rodando em estado desconhecido" — mas o código
// fazia exatamente isso. Em Node, registrar um listener de 'uncaughtException'
// SUPRIME o comportamento padrão (que é imprimir o stack e encerrar o
// processo) — sem chamar `process.exit()` explicitamente dentro do handler,
// o processo principal simplesmente CONTINUA rodando depois de uma exceção
// verdadeiramente não tratada, só com um `console.error` que nenhum usuário
// final de um app empacotado (sem terminal visível) jamais vê. Ou seja: o
// comentário prometia uma coisa, o código entregava o oposto — o processo
// principal (o que decide IPC, caminho de gravação de arquivo, ciclo de vida
// da janela) seguia rodando em estado desconhecido depois de um erro fatal
// de verdade, sem nenhum aviso.
//
// Corrigido: 'uncaughtException' agora avisa o usuário (dialog nativo, igual
// ao padrão já usado em 'render-process-gone' acima) e encerra o processo de
// propósito — não tenta adivinhar se é seguro continuar. É deliberadamente
// mais agressivo que 'unhandledRejection' abaixo: uma exceção síncrona não
// tratada no processo principal é rara o bastante, e severa o bastante (nada
// mais roda depois disso sem afetar o processo inteiro, não só uma aba/janela)
// pra que "encerrar limpo" seja mais seguro que "seguir rodando sem saber o
// que quebrou".
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err);
  dialog.showErrorBox(
    'LumenSolar encontrou um erro grave',
    `O aplicativo precisa fechar por causa de um erro interno inesperado:\n\n${err?.message || err}\n\n` +
    'Se tinha um formulário preenchido sem salvar, esses dados foram perdidos. ' +
    'Abra o LumenSolar novamente — se o erro se repetir, esse detalhe ajuda a diagnosticar a causa.'
  );
  app.exit(1);
});
// 'unhandledRejection' fica só registrando log, sem forçar o encerramento —
// diferente de 'uncaughtException' acima. Promises rejeitadas sem `.catch()`
// são mais comuns e nem sempre indicam um estado corrompido (podem ser uma
// chamada assíncrona isolada que falhou sem afetar o resto do app); forçar
// o fechamento do app inteiro por qualquer rejeição não tratada seria pior
// pro usuário do que a situação atual (nenhuma promise ignorada existe hoje
// neste arquivo — o único await é o handler trivial de
// 'obter-pasta-documentos' — então isso é uma rede de segurança pra código
// futuro, não uma correção de um caso conhecido).
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection:', reason);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null; }
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
