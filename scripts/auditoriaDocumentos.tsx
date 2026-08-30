/**
 * Script de apoio à AUDITORIA DE DESIGN/CONTEÚDO dos documentos gerados pelo
 * app (pedido do usuário: "Analise tambem a disposicao dos documentos
 * gerados, design, estetica, informações, pra quem cada documento é gerado e
 * o que ele informa"). Gera todos os 9 documentos com um caso real (Ana
 * Maria Vieira de Sá e Silva, mesmo .lumensolar usado nas correções desta
 * sessão) rodando o MESMO pipeline de cálculo do app (`calcularTudo()` da
 * store), para depois inspecionar cada um manualmente (pdftotext/pdftoppm
 * para os PDFs, openpyxl para os .xlsx).
 *
 * Não é um teste automatizado — é uma ferramenta de inspeção, mesmo padrão
 * de `scripts/testarGeracaoPdf.tsx`. Roda fora do Electron (componentes
 * @react-pdf/renderer e SheetJS são puro Node/React, sem dependência de DOM).
 *
 * Uso: npx tsx scripts/auditoriaDocumentos.tsx <dir-de-saida>
 */
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  useProjetoStore, clientePadrao, consumoPadrao, kitPadrao, precoPadrao,
} from '../src/renderer/store/useProjetoStore';
import { LOCALIZACAO_PADRAO } from '../src/data/localizacao';
import { DISTRIBUIDORAS } from '../src/data/distribuidoras';
import { CHECKLIST_PADRAO_CEMIG_MICROGD } from '../src/domain/documentacaoCemig/checklist';

async function main() {
  const outDir = process.argv[2] ?? '/tmp/auditoria_docs';
  mkdirSync(outDir, { recursive: true });

  // Caso real (mesmo arquivo usado nas correções desta sessão) — empresa
  // preenchida por completo aqui (no arquivo original ela está em branco,
  // que era exatamente o bug já corrigido) para poder gerar os 9 documentos
  // sem o guard de cadastro incompleto bloquear a auditoria.
  const raw = JSON.parse(readFileSync(
    '/root/.claude/uploads/0517c809-b220-59da-874e-eafa15bb287e/a9141a54-Ana_Maria_Vieira_de_Sa_e_Silva_20260828.lumensolar',
    'utf-8'
  ));
  const dados = raw._dados;

  const empresaCompleta = {
    ...dados.empresa,
    cnpj: '12.345.678/0001-90',
    crea: 'CREA-MG 123456',
    responsavelTecnico: 'Eng. Carlos Eduardo Ferreira',
    cpfEngenheiro: '123.456.789-00',
    telefone: '(34) 99999-0000',
    email: 'contato@lumensolar.com.br',
  };

  useProjetoStore.setState({
    cliente: { ...clientePadrao(), ...dados.cliente },
    consumo: { ...consumoPadrao(), ...dados.consumo },
    localizacao: { ...LOCALIZACAO_PADRAO, ...dados.localizacao },
    kit: { ...kitPadrao(), ...dados.kit },
    preco: { ...precoPadrao(empresaCompleta), ...dados.preco },
    empresa: empresaCompleta,
    checklistDocumentacao: dados.checklistDocumentacao ?? CHECKLIST_PADRAO_CEMIG_MICROGD,
  } as any);

  useProjetoStore.getState().calcularTudo();
  const s = useProjetoStore.getState();
  if (!s.dimensionamento || !s.custosRecorrentes || !s.precificacao || !s.enquadramento || !s.indicadores) {
    throw new Error('calcularTudo() não produziu resultado — dados de entrada insuficientes para a auditoria.');
  }

  const distribuidoraObj = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
  // Mesmo shape de buildData() em App.tsx (~L2822) — replicado aqui porque é
  // uma função interna do componente App, não exportada.
  const d: any = {
    empresa: s.empresa, cliente: s.cliente, consumo: s.consumo,
    resultadoGrupoA: s.resultadoGrupoA,
    codigoDistribuidora: s.consumo.codigoDistribuidora, distribuidora: distribuidoraObj,
    localizacao: s.localizacao, kit: s.kit,
    dimensionamento: s.dimensionamento, custosRecorrentes: s.custosRecorrentes,
    precificacao: s.precificacao, enquadramento: s.enquadramento,
    percentuaisFioBPorAno: s.percentuaisFioBPorAno,
    consumoMedioMensalKWh: s.consumoMedioMensalKWh ?? 0, valorMedioMensalRS: s.valorMedioMensalRS ?? 0,
    aliquotaImpostos: s.preco.aliquotaImpostos, margemDesejada: s.preco.margemDesejada,
    indicadores: s.indicadores, contas: s.consumo.contas,
    detalhamentoPerdas: s.detalhamentoPerdas,
    checklistDocumentacao: s.checklistDocumentacao,
  };

  console.log('Dados calculados. Potência:', s.dimensionamento.potenciaInstaladaRealKWp, 'kWp');

  async function salvarPdf(nome: string, elemento: React.ReactElement) {
    const blob = await pdf(elemento).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of blob as any) chunks.push(chunk as Buffer);
    const p = path.join(outDir, nome);
    writeFileSync(p, Buffer.concat(chunks));
    console.log('  PDF:', p);
  }

  const { PropostaComercialPDF } = await import('../src/domain/proposta/PropostaComercialPDF');
  const { PropostaPDF } = await import('../src/domain/proposta/PropostaPDF');
  const { MemorialDescritivo } = await import('../src/domain/proposta/MemorialDescritivo');
  const { Procuracao } = await import('../src/domain/proposta/Procuracao');
  const { DiagramaUnifilarBasico } = await import('../src/domain/proposta/DiagramaUnifilarBasico');

  console.log('Gerando PDFs...');
  await salvarPdf('1_PropostaComercial.pdf', React.createElement(PropostaComercialPDF, { data: d }));
  await salvarPdf('2_PropostaTecnica.pdf', React.createElement(PropostaPDF, { data: d }));
  await salvarPdf('3_MemorialDescritivo.pdf', React.createElement(MemorialDescritivo, { data: d }));
  await salvarPdf('4_Procuracao.pdf', React.createElement(Procuracao, { data: d }));
  await salvarPdf('5_DUB.pdf', React.createElement(DiagramaUnifilarBasico, { data: d }));

  // Planta de Situação depende de busca de mosaico de satélite via rede —
  // isolada num try/catch próprio para não derrubar o resto da auditoria se
  // não houver rede disponível neste ambiente.
  try {
    const { montarMosaicoSatelite } = await import('../src/renderer/services/satelliteMosaic');
    const { PlantaDeSituacao } = await import('../src/domain/proposta/PlantaDeSituacao');
    const endereco = [d.cliente.endereco, d.cliente.cidade, d.cliente.uf].filter(Boolean).join(', ');
    console.log('Buscando mosaico de satélite para:', endereco);
    const mosaico = await montarMosaicoSatelite(endereco);
    await salvarPdf('6_PlantaSituacao.pdf', React.createElement(PlantaDeSituacao, { data: d, mosaico }));
  } catch (e) {
    console.error('  Planta de Situação PULADA (provável falta de rede/acesso ao provedor de tiles):', e instanceof Error ? e.message : String(e));
  }

  console.log('Gerando planilhas Excel...');
  const cwd = process.cwd();
  process.chdir(outDir); // XLSX.writeFile grava relativo ao cwd
  try {
    const { gerarFormularioCemigMicroGD } = await import('../src/domain/excel/gerarFormularioCemig');
    gerarFormularioCemigMicroGD(d);
    console.log('  Excel: FormularioCEMIG_MicroGD_*.xlsx');
  } catch (e) { console.error('  Formulário CEMIG FALHOU:', e); }

  try {
    const { gerarExcelAuditoria } = await import('../src/domain/excel/gerarExcel');
    gerarExcelAuditoria({
      empresa: s.empresa, cliente: s.cliente, consumo: s.consumo,
      localizacao: s.localizacao, kit: s.kit, preco: s.preco,
      dimensionamento: s.dimensionamento, custosRecorrentes: s.custosRecorrentes,
      precificacao: s.precificacao, indicadores: s.indicadores,
      resultadoGrupoA: s.resultadoGrupoA,
      enquadramento: s.enquadramento, percentuaisFioBPorAno: s.percentuaisFioBPorAno,
    });
    console.log('  Excel: Auditoria_*.xlsx');
  } catch (e) { console.error('  Excel de Auditoria FALHOU:', e); }

  try {
    const { gerarCronograma: gc } = await import('../src/domain/excel/gerarCronograma');
    gc({
      nomeCliente: d.cliente?.nome || 'Cliente',
      enderecoInstalacao: [d.cliente?.endereco, d.cliente?.cidade, d.cliente?.uf].filter(Boolean).join(', '),
      dataInicio: new Date().toISOString().split('T')[0],
      potenciaKWp: d.dimensionamento?.potenciaInstaladaRealKWp || 0,
      numModulos: d.kit?.quantidade || 0,
      empresa: d.empresa?.razaoSocial || 'Lumen Soluções Ltda',
      responsavelTecnico: d.empresa?.responsavelTecnico || '',
      tipoSistema: (d.dimensionamento?.potenciaInstaladaRealKWp || 0) > 75 ? 'mini' : 'micro',
    });
    console.log('  Excel: Cronograma_*.xlsx');
  } catch (e) { console.error('  Cronograma FALHOU:', e); }
  process.chdir(cwd);

  console.log('\nConcluído. Saída em:', outDir);
}

main().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
