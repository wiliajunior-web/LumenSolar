/**
 * Verificação visual da UI real do Electron (não do bundle carregado num browser comum).
 *
 * Por quê via Electron e não Playwright+Chromium direto: o processo main roda com
 * `nodeIntegration: true` (necessário para o @react-pdf/renderer, que usa `require`
 * internamente — ver src/main/index.ts). Isso faz o bundle do renderer depender de
 * globals de Node que só existem dentro do runtime real do Electron. Carregar o
 * mesmo bundle num Chromium comum (sem Electron) falha com
 * "Dynamic require of 'events' is not supported" antes mesmo do React montar —
 * confirmado que isso reproduz igual com ou sem alterações no App.tsx, ou seja, é
 * uma limitação do ambiente de teste, não um bug do app.
 *
 * Pré-requisitos:
 *   1. `npx vite build` (gera dist/ e dist-electron/ atualizados)
 *   2. Ambiente sem display real precisa de Xvfb: `xvfb-run -a node scripts/verificarUiVisualmente.mjs`
 *
 * Uso: node scripts/verificarUiVisualmente.mjs [pasta-de-saida]
 */
import { _electron as electron } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '/tmp/lumensolar-ui-check';
mkdirSync(outDir, { recursive: true });

const app = await electron.launch({
  args: ['dist-electron/index.js'],
  executablePath: 'node_modules/electron/dist/electron',
  cwd: process.cwd(),
  timeout: 30000,
});

const win = await app.firstWindow();
const logs = [];
win.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await win.waitForLoadState('networkidle');
await win.setViewportSize({ width: 1440, height: 900 });
await win.waitForTimeout(800);

async function shot(name) {
  await win.screenshot({ path: `${outDir}/${name}.png` });
  console.log('screenshot:', `${outDir}/${name}.png`);
}

await shot('01-lista-propostas');

const novaBtn = win.locator('text=Nova Proposta').first();
if (await novaBtn.count() > 0) {
  await novaBtn.click();
  await win.waitForTimeout(400);
}

const nomeInput = win.locator('input[placeholder*="João Silva"]');
if (await nomeInput.count() > 0) {
  await nomeInput.fill('Cliente Teste Visual');
}
await shot('02-cliente');

for (const nome of ['03-consumo', '04-local', '05-kit-solar', '06-precificacao']) {
  const nextBtn = win.locator('button', { hasText: '→' }).last();
  if (await nextBtn.count() > 0) {
    await nextBtn.click().catch(() => {});
    await win.waitForTimeout(500);
  }
  await shot(nome);
}

if (logs.length > 0) {
  console.log('LOGS (erros de página):', JSON.stringify(logs, null, 2));
  process.exitCode = 1;
} else {
  console.log('Nenhum pageerror — renderer carregou limpo.');
}

await app.close();
