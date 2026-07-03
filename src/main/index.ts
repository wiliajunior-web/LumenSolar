import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// dist-electron/index.js → sobe um nível → raiz do app → dist/
const RENDERER_DIST = path.join(__dirname, '../dist');

// vite-plugin-electron gera o preload como dist-electron/preload/index.mjs
// mas pode variar — tentamos os dois caminhos possíveis
const PRELOAD_PATH = (() => {
  const opts = [
    path.join(__dirname, 'preload/index.mjs'),   // dist-electron/preload/index.mjs
    path.join(__dirname, '../dist-electron/preload/index.mjs'),
    path.join(__dirname, 'preload.mjs'),
    path.join(__dirname, 'index.mjs'),
  ];
  const { existsSync } = require('fs');
  return opts.find(p => existsSync(p)) ?? opts[0];
})();

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'SolarPropV — Lumen Soluções',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Abre DevTools automaticamente para diagnóstico — remover após resolver a tela branca
  win.webContents.openDevTools({ mode: 'bottom' });

  // Loga o caminho que está sendo carregado
  const rendererPath = path.join(RENDERER_DIST, 'index.html');
  console.log('[SolarPropV] Renderer path:', rendererPath);
  console.log('[SolarPropV] Preload path:', PRELOAD_PATH);

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[SolarPropV] Falha ao carregar:', code, desc, url);
    // Mostra erro amigável na janela
    win?.webContents.loadURL(
      `data:text/html,<h2 style="font-family:sans-serif;color:#c00;padding:20px">
        Erro ao carregar SolarPropV<br>
        <small style="color:#666">${desc} (${code})<br>Caminho: ${rendererPath}</small>
      </h2>`
    );
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // Usa loadURL com file:// em vez de loadFile — mais compatível com base: './'
    const fileUrl = `file://${rendererPath.replace(/\\/g, '/')}`;
    console.log('[SolarPropV] Loading URL:', fileUrl);
    win.loadURL(fileUrl);
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null; }
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
