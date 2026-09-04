import { _electron as electron } from 'playwright';
import path from 'node:path';

function log(...a) { console.log('[verif]', ...a); }

async function main() {
  const app = await electron.launch({
    executablePath: path.resolve('node_modules/electron/dist/electron'),
    args: [path.resolve('dist-electron/index.js')],
    cwd: path.resolve('.'),
    timeout: 30000,
  });
  const win = await app.firstWindow();
  win.on('dialog', async (dialog) => { log('dialog inesperado:', dialog.message()); await dialog.accept(); });
  await win.waitForLoadState('domcontentloaded');
  await win.waitForTimeout(1000);

  // Nova proposta -> pular direto pra aba Kit via localStorage/estado não é
  // simples aqui; em vez disso navega pelo fluxo normal: Home -> Nova Proposta.
  log('clicando em Nova Proposta...');
  await win.getByText('Nova Proposta', { exact: false }).first().click();
  await win.waitForTimeout(500);

  // Preenche o mínimo pra chegar na aba Kit: percorre as abas clicando "Avançar" / navegação direta pelo menu lateral se existir
  await win.screenshot({ path: '/tmp/refpreco_0_inicio.png' });

  // Tenta ir direto pela navegação lateral, se existir uma aba "Kit"
  const linkKit = win.getByText('Kit Solar', { exact: false }).first();
  if (await linkKit.count() > 0) {
    await linkKit.click();
    await win.waitForTimeout(400);
  }
  await win.screenshot({ path: '/tmp/refpreco_1_kit_tentativa.png' });

  // Preenche potência do módulo = 620 (bate exatamente com 3 registros do catálogo)
  // Primeiro input[type=number] da aba Kit é "Potência (Wp)" (Tipo=select,
  // Marca/Modelo=text vêm antes; Quantidade vem depois) — confirmado pelo
  // screenshot da rodada anterior (mostrava 550, valor default de kitPadrao).
  const campoPotenciaWp = win.locator('input[type="number"]').first();
  await campoPotenciaWp.fill('620');
  await win.waitForTimeout(300);

  await win.screenshot({ path: '/tmp/refpreco_2_com_referencia.png' });

  const textoPagina = await win.locator('body').innerText();
  const temReferencia = textoPagina.includes('Referência de mercado');
  const temOSDA = textoPagina.includes('OSDA');
  log('painel "Referência de mercado" visível:', temReferencia);
  log('menciona OSDA (comparável a 620Wp):', temOSDA);

  await app.close();
  process.exit(temReferencia && temOSDA ? 0 : 1);
}

main().catch(e => { console.error('[verif] ERRO:', e); process.exit(1); });
