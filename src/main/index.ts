import { app, BrowserWindow, shell } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// vite-plugin-electron compila para dist-electron/
// o renderer vai para dist/
const RENDERER_HTML = path.join(__dirname, '../dist/index.html');

// Preload: vite-plugin-electron pode gerar em locais diferentes
const PRELOAD_CANDIDATES = [
  path.join(__dirname, 'preload/index.mjs'),
  path.join(__dirname, 'preload/index.js'),
  path.join(__dirname, '../dist-electron/preload/index.mjs'),
  path.join(__dirname, '../dist-electron/preload/index.js'),
];
const PRELOAD_PATH = PRELOAD_CANDIDATES.find(p => existsSync(p));

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'SolarPropV — Lumen Soluções',
    show: false, // não mostra até carregar
    webPreferences: {
      ...(PRELOAD_PATH ? { preload: PRELOAD_PATH } : {}),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // permite file:// carregar assets locais
    },
  });

  // Mostra a janela só quando o renderer estiver pronto (sem flash branco)
  win.once('ready-to-show', () => win?.show());

  // DevTools para debug — remove quando estiver funcionando
  win.webContents.openDevTools({ mode: 'detach' });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[SolarPropV] did-fail-load:', code, desc);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // file:// com barras no estilo Unix — funciona no Windows também
    const fileUrl = `file:///${RENDERER_HTML.replace(/\\/g, '/')}`;
    win.loadURL(fileUrl);
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit(); win = null; } });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
