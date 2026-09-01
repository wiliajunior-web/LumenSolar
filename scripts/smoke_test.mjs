// E2E smoke test — abre o app Electron real (sob xvfb), importa um caso real
// e gera os documentos pela UI de verdade, não por script de auditoria.
// Uso: xvfb-run -a node scripts/smoke_test.mjs [--full]
//   --full: também clica em Calcular e em cada botão de gerar documento
//   (Proposta Comercial, Doc. Técnica, Memorial, Procuração, DUB, Excel,
//   Cronograma, Formulário CEMIG) e falha se algum alert() de erro aparecer.
import { _electron as electron } from 'playwright';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const FULL = process.argv.includes('--full');
const ARQUIVO_REAL = '/root/.claude/uploads/0517c809-b220-59da-874e-eafa15bb287e/a9141a54-Ana_Maria_Vieira_de_Sa_e_Silva_20260828.lumensolar';

const dialogs = [];
const consoleErrors = [];
const downloads = [];

function log(...a) { console.log('[smoke]', ...a); }

async function main() {
  const app = await electron.launch({
    executablePath: path.resolve('node_modules/electron/dist/electron'),
    args: [path.resolve('dist-electron/index.js')],
    cwd: path.resolve('.'),
    timeout: 30000,
  });
  log('Electron launched');

  const win = await app.firstWindow();
  win.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  win.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
  win.on('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.accept();
  });
  win.on('download', (dl) => downloads.push(dl.suggestedFilename()));

  await win.waitForLoadState('domcontentloaded');
  await win.waitForTimeout(1000);
  await win.screenshot({ path: '/tmp/e2e_01_home.png' });
  log('Home carregada');

  if (!FULL) {
    log('Modo básico (sem --full) — só valida boot. Erros de console:', consoleErrors);
    await app.close();
    process.exit(consoleErrors.length ? 1 : 0);
  }

  // Importar o caso real
  const [fileChooser] = await Promise.all([
    win.waitForEvent('filechooser'),
    win.getByText('📂 Importar arquivo').first().click(),
  ]);
  await fileChooser.setFiles(ARQUIVO_REAL);
  await win.waitForTimeout(1500);
  log('Arquivo importado. Dialogs até aqui:', JSON.stringify(dialogs));

  // Ir para Precificação e clicar em Calcular
  await win.getByText('Precificação', { exact: true }).first().click();
  await win.waitForTimeout(500);
  await win.screenshot({ path: '/tmp/e2e_02_precificacao.png' });

  const botaoCalcular = win.getByRole('button', { name: /calcular/i }).first();
  if (await botaoCalcular.count()) {
    await botaoCalcular.click();
    await win.waitForTimeout(1500);
    log('Cliquei em Calcular');
  } else {
    log('Botão Calcular não encontrado na Precificação — tentando texto genérico');
    const alt = win.getByText(/calcular/i).first();
    if (await alt.count()) { await alt.click(); await win.waitForTimeout(1500); }
  }
  await win.screenshot({ path: '/tmp/e2e_03_pos_calculo.png' });

  await win.getByText('Resultado', { exact: true }).first().click();
  await win.waitForTimeout(1000);
  await win.screenshot({ path: '/tmp/e2e_04_resultado.png' });

  // Preencher cadastro da empresa (Responsável Técnico/CREA/CNPJ) — sem
  // isso o guard "cadastro incompleto" bloqueia a maioria dos documentos,
  // e este teste quer exercitar a geração de verdade, não só o guard.
  const botaoConfig = win.getByRole('button', { name: /Abrir Configurações/i }).first();
  if (await botaoConfig.count()) {
    await botaoConfig.click();
    await win.waitForTimeout(500);
    // O componente <Campo> é um <label> que envolve DIRETAMENTE o <input>
    // (não um <label> irmão) — locator(label).locator('input'), sem subir
    // para o pai (isso pegava sempre o primeiro input do grid inteiro).
    const preencher = async (label, valor) => {
      const campo = win.locator(`label.lbl:has-text("${label}")`).locator('input').first();
      if (await campo.count()) await campo.fill(valor);
      else log(`  campo "${label}" não encontrado`);
    };
    await preencher('Razão Social', 'Lumen Soluções Ltda');
    await preencher('CNPJ', '12.345.678/0001-90');
    await preencher('CREA', 'CREA-MG 123456');
    await preencher('Responsável Técnico', 'Eng. Carlos Eduardo Ferreira');
    await preencher('Telefone', '(34) 99999-0000');
    await preencher('E-mail', 'contato@lumensolar.com.br');
    await preencher('CPF do engenheiro responsável', '123.456.789-00');
    await win.waitForTimeout(300);
    await win.screenshot({ path: '/tmp/e2e_04b_config_preenchida.png' });
    const voltar = win.getByRole('button', { name: /Voltar/i }).first();
    if (await voltar.count()) { await voltar.click(); await win.waitForTimeout(500); }
    log('Cadastro da empresa preenchido');
  } else {
    log('Banner de cadastro incompleto não apareceu (empresa já cadastrada de execução anterior — Electron persiste localStorage entre execuções neste perfil) — seguindo sem preencher');
  }

  // Preencher a empresa depois de calcular deixa os dados "desatualizados"
  // (guard correto do app) — recalcular antes de gerar documentos.
  const botaoRecalcular = win.getByRole('button', { name: /Recalcular agora/i }).first();
  if (await botaoRecalcular.count()) {
    await botaoRecalcular.click();
    await win.waitForTimeout(1000);
    log('Recalculado após preencher empresa');
  }
  await win.screenshot({ path: '/tmp/e2e_04c_pos_recalculo.png' });

  // Rótulos reais dos botões (curtos, na barra "DOCUMENTOS" da tela de
  // Resultado) — usar role=button para não colidir com os textos parecidos
  // do checklist de documentação acima ("Memorial Descritivo" etc.), que
  // não são botões e não geram nada ao clicar.
  // BUG CORRIGIDO (set/2026): faltavam 'Cronograma' e 'Pacote Completo' nesta
  // lista (existiam num rascunho anterior, sumiram numa reescrita) — a
  // evidência foi encontrada em disco: só 2 dos 3 Excel esperados (Auditoria,
  // FormularioCEMIG) apareciam depois de rodar o teste, faltando Cronograma.
  // 'Pacote Completo' é testado por último de propósito: ele reexecuta 7 dos
  // 8 documentos individuais (não Cronograma) numa sequência silenciosa com
  // resumo único no final — código bem diferente das chamadas diretas acima
  // (ver gerarPacoteCompleto em App.tsx), vale testar separadamente mesmo
  // duplicando a geração dos documentos.
  const botoesDocumento = ['Proposta', 'Memorial', 'Procuração', 'Técnica', 'DUB', 'Planta', 'Form. CEMIG', 'Excel', 'Cronograma', 'Pacote Completo'];

  for (const rotulo of botoesDocumento) {
    try {
      const antesDownloads = downloads.length;
      const antesDialogs = dialogs.length;
      // exact:false porque os botões reais têm um emoji na frente do rótulo
      // (ex: "📄 Proposta"), não texto puro.
      const btn = win.getByRole('button', { name: rotulo, exact: false }).first();
      const existe = await btn.count();
      if (!existe) { log(`Botão "${rotulo}" não encontrado na tela — pulando`); continue; }
      await btn.click({ timeout: 5000 });
      // 'Pacote Completo' reexecuta 7 documentos em sequência — precisa de
      // bem mais tempo que um documento avulso antes de conferir o resultado.
      await win.waitForTimeout(rotulo === 'Pacote Completo' ? 15000 : 3000);
      const novosDialogs = dialogs.slice(antesDialogs);
      const novosDownloads = downloads.slice(antesDownloads);
      log(`"${rotulo}": downloads novos=${novosDownloads.length} dialogs novos=${JSON.stringify(novosDialogs)}`);
    } catch (e) {
      log(`ERRO clicando em "${rotulo}":`, e.message);
    }
  }

  await win.screenshot({ path: '/tmp/e2e_05_final.png' });

  const resultado = { consoleErrors, dialogs, downloads };
  writeFileSync('/tmp/e2e_resultado.json', JSON.stringify(resultado, null, 2));
  log('Resultado final:', JSON.stringify(resultado, null, 2));

  await app.close();
  const falhouPorConsole = consoleErrors.length > 0;
  const falhouPorErro = dialogs.some(d => /erro/i.test(d.message));
  process.exit(falhouPorConsole || falhouPorErro ? 1 : 0);
}

main().catch((e) => { console.error('FALHA FATAL:', e); process.exit(1); });
