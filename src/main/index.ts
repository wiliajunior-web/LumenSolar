import { app, BrowserWindow, shell } from 'electron';
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
      // nodeIntegration: true permite que dependências como @react-pdf/renderer
      // usem require() no renderer. Seguro para apps desktop locais (sem conteúdo remoto).
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

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const fileUrl = `file:///${RENDERER_HTML.replace(/\\/g, '/')}`;
    win.loadURL(fileUrl);
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit(); win = null; } });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
