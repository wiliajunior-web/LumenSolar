import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
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

// ── Diretórios de dados ──────────────────────────────────────────────────────
// Caminhos inicializados lazy dentro de app.whenReady para máxima compatibilidade
let PROPOSALS_DIR: string;
let EMPRESA_FILE: string;

function ensureDirs() {
  if (!PROPOSALS_DIR) {
    const userData = app.getPath('userData');
    PROPOSALS_DIR = path.join(userData, 'proposals');
    EMPRESA_FILE  = path.join(userData, 'empresa.json');
  }
  if (!existsSync(PROPOSALS_DIR)) mkdirSync(PROPOSALS_DIR, { recursive: true });
}

// ── IPC: Propostas ────────────────────────────────────────────────────────────
ipcMain.handle('proposal:list', async () => {
  ensureDirs();
  const files = await readdir(PROPOSALS_DIR).catch(() => [] as string[]);
  const proposals = await Promise.all(
    files.filter(f => f.endsWith('.json')).map(async (f) => {
      try {
        const raw = await readFile(path.join(PROPOSALS_DIR, f), 'utf-8');
        const data = JSON.parse(raw);
        return { id: data.id, nomeCliente: data.nomeCliente, uf: data.uf,
          criadoEm: data.criadoEm, atualizadoEm: data.atualizadoEm,
          potenciaKWp: data.potenciaKWp, precoVenda: data.precoVenda, cidade: data.cidade };
      } catch { return null; }
    })
  );
  return proposals.filter(Boolean).sort((a: any, b: any) =>
    new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
  );
});

ipcMain.handle('proposal:save', async (_e, proposal: any) => {
  ensureDirs();
  const file = path.join(PROPOSALS_DIR, `${proposal.id}.json`);
  await writeFile(file, JSON.stringify(proposal, null, 2), 'utf-8');
  return { ok: true };
});

ipcMain.handle('proposal:load', async (_e, id: string) => {
  ensureDirs();
  const file = path.join(PROPOSALS_DIR, `${id}.json`);
  try {
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e: any) {
    if (e.code === 'ENOENT') return null; // arquivo não encontrado
    throw e;
  }
});

ipcMain.handle('proposal:delete', async (_e, id: string) => {
  const file = path.join(PROPOSALS_DIR, `${id}.json`);
  await unlink(file).catch(() => {});
  return { ok: true };
});

// ── IPC: Empresa (configuração persistente) ───────────────────────────────────
ipcMain.handle('empresa:get', async () => {
  try {
    const raw = await readFile(EMPRESA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
});

ipcMain.handle('empresa:save', async (_e, empresa: any) => {
  await writeFile(EMPRESA_FILE, JSON.stringify(empresa, null, 2), 'utf-8');
  return { ok: true };
});

// ── Janela principal ──────────────────────────────────────────────────────────
let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 850, minWidth: 900, minHeight: 600,
    title: 'LumenSolar — Lumen Soluções',
    show: false,
    webPreferences: {
      ...(PRELOAD_PATH ? { preload: PRELOAD_PATH } : {}),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  win.once('ready-to-show', () => win?.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

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
