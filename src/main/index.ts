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

// ADICIONADO (set/2026, robustecimento do processo principal): sem isso, uma
// exceção não tratada no processo principal (não no renderer — este é o
// processo Node "de trás", sem UI própria) simplesmente derrubava o app inteiro
// sem nenhum diagnóstico visível pro usuário (nem mesmo um dialog nativo, já
// que o processo já não existe mais quando o crash acontece). Registrar aqui
// pelo menos garante um log no console antes de qualquer encerramento — não
// tenta "engolir" o erro e continuar rodando em estado desconhecido (isso seria
// pior: mascarar um bug real deixando o app seguir com estado corrompido).
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err);
});
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
