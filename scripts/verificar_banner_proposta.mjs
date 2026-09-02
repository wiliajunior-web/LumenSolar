// Script de verificação visual (set/2026) — gera a Proposta Comercial REAL
// (mesma UI/botão "📄 Proposta" que o usuário usa) para o caso real da Ana
// Maria Vieira de Sá e Silva, e salva o PDF em /tmp para conversão em PNG
// e inspeção visual da nova faixa de marca no topo das páginas internas
// (substituiu o banner fotográfico cortado — ver PropostaComercialPDF.tsx).
// Uso: xvfb-run -a node scripts/verificar_banner_proposta.mjs
import { _electron as electron } from 'playwright';
import path from 'node:path';

const ARQUIVO_REAL = process.argv[2] || '/root/.claude/uploads/0517c809-b220-59da-874e-eafa15bb287e/b02ef569-Ana_Maria_Vieira_de_Sa_e_Silva_20260828.lumensolar';
const SAIDA = process.argv[3] || '/tmp/proposta_banner_novo.pdf';
const COM_LOGO = process.argv.includes('--com-logo');

function log(...a) { console.log('[verif]', ...a); }

async function main() {
  const app = await electron.launch({
    executablePath: path.resolve('node_modules/electron/dist/electron'),
    args: [path.resolve('dist-electron/index.js')],
    cwd: path.resolve('.'),
    timeout: 30000,
  });
  const win = await app.firstWindow();
  win.on('dialog', async (dialog) => { log('dialog:', dialog.message()); await dialog.accept(); });
  let salvo = false;
  win.on('download', async (dl) => {
    await dl.saveAs(SAIDA);
    salvo = true;
    log('PDF salvo em', SAIDA);
  });

  await win.waitForLoadState('domcontentloaded');
  await win.waitForTimeout(1000);

  const [fileChooser] = await Promise.all([
    win.waitForEvent('filechooser'),
    win.getByText('📂 Importar arquivo').first().click(),
  ]);
  await fileChooser.setFiles(ARQUIVO_REAL);
  await win.waitForTimeout(1500);
  log('Arquivo importado');

  await win.getByText('Precificação', { exact: true }).first().click();
  await win.waitForTimeout(500);
  const botaoCalcular = win.getByRole('button', { name: /calcular/i }).first();
  if (await botaoCalcular.count()) { await botaoCalcular.click(); await win.waitForTimeout(1500); }
  log('Calculado');

  log('indo para Resultado...');
  await win.getByText('Resultado', { exact: true }).first().click({ timeout: 10000 });
  await win.waitForTimeout(1000);
  log('em Resultado');

  // Botão fixo da barra lateral ("⚙ Configurações", sempre presente — não
  // depende do banner condicional de "cadastro incompleto", que só aparece
  // na 1ª execução deste perfil Electron; perfis já usados nesta sessão de
  // testes têm o cadastro persistido em localStorage e nunca mostram o
  // banner de novo).
  const botaoConfig = win.getByRole('button', { name: /Configurações/i }).first();
  log('botaoConfig existe?', await botaoConfig.count());
  if (await botaoConfig.count()) {
    await botaoConfig.click();
    await win.waitForTimeout(500);
    const preencher = async (label, valor) => {
      const campo = win.locator(`label.lbl:has-text("${label}")`).locator('input').first();
      if (await campo.count()) await campo.fill(valor);
    };
    await preencher('Razão Social', 'Lumen Soluções Ltda');
    await preencher('CNPJ', '12.345.678/0001-90');
    await preencher('CREA', 'CREA-MG 123456');
    await preencher('Responsável Técnico', 'Eng. Carlos Eduardo Ferreira');
    await preencher('Telefone', '(34) 99999-0000');
    await preencher('E-mail', 'contato@lumensolar.com.br');
    await preencher('CPF do engenheiro responsável', '123.456.789-00');
    if (COM_LOGO) {
      // Testa o caminho "com logo real" da faixa de marca: sobe um PNG
      // qualquer (1x1) como empresa.logoBase64 via input[type=file] oculto.
      const [fileChooser2] = await Promise.all([
        win.waitForEvent('filechooser'),
        win.getByText(/Carregar logo|Trocar logo/).first().click(),
      ]);
      const pngMinimo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
      await fileChooser2.setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngMinimo });
      await win.waitForTimeout(300);
      log('Logo de teste carregada');
    }
    await win.waitForTimeout(300);
    const voltar = win.getByRole('button', { name: /Voltar/i }).first();
    if (await voltar.count()) { await voltar.click(); await win.waitForTimeout(500); }
  }

  const botaoRecalcular = win.getByRole('button', { name: /Recalcular agora/i }).first();
  log('botaoRecalcular existe?', await botaoRecalcular.count());
  if (await botaoRecalcular.count()) { await botaoRecalcular.click(); await win.waitForTimeout(1000); }

  log('clicando em Proposta...');
  const btn = win.getByRole('button', { name: 'Proposta', exact: false }).first();
  await btn.click({ timeout: 8000 });
  log('cliquei, aguardando download...');
  await win.waitForTimeout(3000);

  for (let i = 0; i < 20 && !salvo; i++) await win.waitForTimeout(300);

  log('salvo?', salvo);
  await app.close();
  process.exit(salvo ? 0 : 1);
}

main().catch(e => { console.error('[verif] ERRO:', e && e.stack || e); process.exit(1); });
