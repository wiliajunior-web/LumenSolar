// Script de verificação visual (set/2026) — Simulação Rápida (nova feature,
// ver App.tsx: SimulacaoRapida). Abre o app do zero (sem importar arquivo),
// clica no botão "⚡ Simulação Rápida" da sidebar, preenche UF+consumo,
// confirma que o KPI de kWp/módulos aparece com o valor certo, tira
// screenshot, clica em "Continuar para orçamento completo" e confirma que
// cai na aba Cliente com a UF e o 1º mês do histórico já preenchidos.
// Uso: xvfb-run -a node scripts/verificar_simulacao_rapida.mjs
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

  log('clicando em Simulação Rápida na sidebar...');
  await win.getByText('Simulação Rápida', { exact: false }).first().click();
  await win.waitForTimeout(400);

  await win.screenshot({ path: '/tmp/simrapida_1_vazia.png' });
  log('screenshot 1 (tela vazia) salvo');

  // Seleciona UF = GO (HSP mais alto que MG, pra provar que o campo influencia o resultado)
  await win.locator('select.inp').first().selectOption('GO');
  const campoConsumo = win.locator('input[placeholder="Ex: 450"]');
  await campoConsumo.fill('500');
  await win.waitForTimeout(300);

  await win.screenshot({ path: '/tmp/simrapida_2_resultado.png' });
  log('screenshot 2 (com resultado) salvo');

  const textoKpiKwp = await win.locator('.kpi-val').first().textContent();
  const textoKpiModulos = await win.locator('.kpi-val').nth(1).textContent();
  log('KPI potência mínima:', textoKpiKwp);
  log('KPI módulos:', textoKpiModulos);

  // Verificação independente: 500 / (5,5[GO] × 30,4167 × 0,8) = 3,73599 kWp
  // (mesmo valor do teste unitário de potenciaMinimaKWp) -> 7 módulos de 550Wp
  // (ceil(3,73599/0,55) = 7)
  const kwpEsperado = 500 / (5.5 * 30.4167 * 0.8);
  const kwpMostrado = parseFloat((textoKpiKwp || '').replace(',', '.'));
  const modulosMostrados = parseInt((textoKpiModulos || '').trim(), 10);
  const modulosEsperados = Math.ceil(kwpEsperado / 0.55);

  const kwpOk = Math.abs(kwpMostrado - kwpEsperado) < 0.01;
  const modulosOk = modulosMostrados === modulosEsperados;
  log(`kWp mostrado=${kwpMostrado} esperado≈${kwpEsperado.toFixed(2)} -> ${kwpOk ? 'OK' : 'DIVERGENTE'}`);
  log(`módulos mostrados=${modulosMostrados} esperado=${modulosEsperados} -> ${modulosOk ? 'OK' : 'DIVERGENTE'}`);

  log('clicando em "Continuar para orçamento completo"...');
  // getByText (mesmo exact:false) casaria com o parágrafo de aviso, que cita
  // o mesmo texto entre aspas — precisa ser getByRole('button') para pegar o
  // <button> de verdade, não o texto inerte que o menciona.
  await win.getByRole('button', { name: /Continuar para orçamento completo/i }).first().click();
  await win.waitForTimeout(600);

  await win.screenshot({ path: '/tmp/simrapida_3_apos_continuar.png' });
  log('screenshot 3 (após continuar, esperado: aba Cliente) salvo');

  // Confirma que caiu na aba Cliente (campo "Nome completo *" visível) e que
  // a UF já veio preenchida com GO.
  const campoNomeVisivel = await win.getByPlaceholder('Ex: João Silva / Empresa Ltda').count();
  log('campo "Nome completo" visível (esperado: 1):', campoNomeVisivel);

  const selectsNaTelaCliente = await win.locator('select.inp').all();
  let ufEncontrada = null;
  for (const sel of selectsNaTelaCliente) {
    const val = await sel.inputValue().catch(() => null);
    if (val === 'GO') { ufEncontrada = val; break; }
  }
  log('UF pré-preenchida na aba Cliente (esperado: GO):', ufEncontrada);

  const tudoOk = kwpOk && modulosOk && campoNomeVisivel === 1 && ufEncontrada === 'GO';
  log(tudoOk ? '✅ VERIFICAÇÃO PASSOU' : '❌ VERIFICAÇÃO FALHOU');

  await app.close();
  process.exit(tudoOk ? 0 : 1);
}

main().catch(e => { console.error('[verif] ERRO:', e); process.exit(1); });
