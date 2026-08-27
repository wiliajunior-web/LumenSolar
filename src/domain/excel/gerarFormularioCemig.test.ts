import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, unlinkSync } from 'node:fs';
import { checklistDocumentosCEMIG, gerarFormularioCemigMicroGD, MAPA_CELULAS } from './gerarFormularioCemig';
import { CHECKLIST_PADRAO_CEMIG_MICROGD, marcarItemGerado, marcarItemAnexado } from '../documentacaoCemig/checklist';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');

function limparArquivosGerados() {
  for (const f of readdirSync('.')) {
    if (f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx')) unlinkSync(f);
  }
}

describe('MAPA_CELULAS — posições de célula do Formulario-MicroGD_Rev_N4.xlsx oficial', () => {
  // REGRESSÃO (ago/2026): o mapa antigo tinha 28 das 31 células erradas —
  // sistematicamente uma linha abaixo da caixa real de preenchimento (o
  // padrão real do arquivo oficial é "rótulo e caixa na mesma linha", exceto
  // na Seção 9/Solicitante). O caso mais grave: a célula antiga de sol_data
  // (B234) era a própria célula do RÓTULO "Local e data*:" no arquivo
  // oficial — colar por posição de célula apagaria o rótulo do campo.
  //
  // Estes valores foram reverificados um a um com openpyxl contra o arquivo
  // Formulario-MicroGD_Rev_N4.xlsx fornecido pelo usuário (localizando a
  // caixa de preenchimento real — borda `left:medium` — mais próxima de cada
  // rótulo de texto), não deduzidos por um padrão assumido. Este teste não
  // valida contra o arquivo em si (ele não faz parte do repositório, é um
  // documento interno da CEMIG) — apenas trava o mapa já verificado contra
  // regressão acidental.
  it('mantém as posições de célula verificadas contra o arquivo oficial', () => {
    expect(MAPA_CELULAS).toEqual({
      uc_numero: 'J12', uc_titular: 'N16', uc_cpf: 'AC18',
      uc_logradouro: 'G20', uc_num_ender: 'AI20', uc_complemento: 'AR20',
      uc_bairro: 'E22', uc_municipio: 'T22', uc_cep: 'AS22',
      uc_celular: 'O24', uc_email: 'Y24',
      utm_fuso: 'V29', utm_e: 'AC29', utm_n: 'AL29',
      tipo_solicitacao: 'I41', tipo_edificacao: 'I43', tensao_atend: 'L55',
      mod_modelo: 'L108', mod_fabricante: 'L110', mod_pot_w: 'L112',
      mod_qtde: 'L114', mod_pot_total_kw: 'L116', mod_area: 'L118',
      inv_modelo: 'AI108', inv_fabricante: 'AI110', inv_pot_kw: 'AI112',
      inv_qtde: 'AI114', inv_pot_total_kw: 'AI116', inv_tensao: 'AI118',
      sol_nome: 'Q220', sol_endereco: 'O222', sol_celular: 'O226',
      sol_email: 'Y226', sol_data: 'C236',
      // BUG CORRIGIDO (ago/2026): estas 5 células já tinham coordenada
      // documentada em DEFAULTS_CEMIG mas nunca eram escritas — ver teste
      // "preenche CPF/Bairro/CEP..." abaixo.
      grid_zero: 'O14', fast_track: 'AL12', motor_gerador: 'AD33',
      armazenamento: 'R134', telhado_arrendado: 'AF61',
    });
  });

  it('nenhuma célula mapeada aponta para B234 (era o rótulo "Local e data*:" no arquivo oficial, não uma célula em branco)', () => {
    expect(Object.values(MAPA_CELULAS)).not.toContain('B234');
  });
});

describe('gerarFormularioCemigMicroGD — exercitando a função real de produção (round-trip .xlsx)', () => {
  afterEach(() => limparArquivosGerados());

  // BUG CORRIGIDO (ago/2026): `cliente?.bairro`/`cliente?.cep` liam campos
  // que não existiam em `DadosCliente` (só existia `endereco` combinado) —
  // as células E22 (Bairro) e AS22 (CEP), obrigatórias no formulário
  // oficial CEMIG, sempre saíam em branco. `cliente?.cpf` (célula AC18,
  // também obrigatória) existia no tipo mas não tinha input nenhum na UI, e
  // por isso também sempre saía em branco na prática. Corrigido formalizando
  // `bairro`/`cep` em `DadosCliente` e adicionando os 3 campos na aba
  // Cliente (App.tsx). Este teste lê o .xlsx gerado de volta (não só
  // `expect(...).not.toThrow()`) para provar que as células realmente saem
  // preenchidas a partir do formato real de `dados.cliente`.
  it('preenche CPF/Bairro/CEP e os 5 campos Sim/Não com valor-padrão (antes saíam sempre em branco)', () => {
    const dados = {
      cliente: {
        nome: 'Maria Oliveira', cpf: '123.456.789-00',
        endereco: 'Rua das Flores, 100', bairro: 'Centro', cep: '38440-000',
        cidade: 'Araguari', uf: 'MG',
      },
      consumo: { tipoLigacao: 'trifasica' },
      localizacao: {},
      kit: { potenciaModuloWp: 550, quantidade: 10 },
      empresa: {},
    };
    gerarFormularioCemigMicroGD(dados);

    const gerados = readdirSync('.').filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    expect(gerados.length).toBeGreaterThan(0);
    const wb = XLSX.readFile(gerados[0]);
    const ws = wb.Sheets['Formulario_Preenchido'];

    expect(ws[MAPA_CELULAS.uc_cpf]?.v).toBe('123.456.789-00');
    expect(ws[MAPA_CELULAS.uc_bairro]?.v).toBe('Centro');
    expect(ws[MAPA_CELULAS.uc_cep]?.v).toBe('38440-000');
    expect(ws[MAPA_CELULAS.grid_zero]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.fast_track]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.motor_gerador]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.armazenamento]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.telhado_arrendado]?.v).toBe('Não');
  });
});

describe('checklistDocumentosCEMIG', () => {
  it('sem checklistDocumentacao em dados (arquivo .lumensolar antigo): usa o padrão e reporta tudo pendente', () => {
    const lista = checklistDocumentosCEMIG({});
    const obrigatorios = lista.filter((i) => i.obrigatorio);
    expect(obrigatorios.every((i) => i.status === 'pendente')).toBe(true);
  });

  it('REGRESSÃO — bug corrigido: o status de itens manuais (ART/RG-CPF/INMETRO) reage ao checklist real, não a uma condicional morta', () => {
    // A versão anterior tinha `empresa?.crea ? 'pendente' : 'pendente'` — sempre
    // 'pendente' mesmo quando o item estava de fato concluído. Este teste
    // falharia com o código antigo mesmo com o item marcado como anexado.
    const checklist = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'art', true, 'ART 12345');
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    const art = lista.find((i) => i.doc.includes('ART'))!;
    expect(art.status).toBe('ok');
  });

  it('itens gerado_automaticamente (DUB, Planta, Memorial, etc.) viram "ok" quando geradoEm está preenchido', () => {
    let checklist = marcarItemGerado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'dub', '2026-08-25T10:00:00.000Z');
    checklist = marcarItemGerado(checklist, 'planta_situacao', '2026-08-25T10:00:00.000Z');
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    expect(lista.find((i) => i.doc.includes('DUB'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Planta de Situação'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Memorial'))!.status).toBe('pendente');
  });

  it('marca DUB e Planta de Situação como geradoPeloApp=true (agora que existem geradores para eles)', () => {
    const lista = checklistDocumentosCEMIG({});
    expect(lista.find((i) => i.doc.includes('DUB'))!.geradoPeloApp).toBe(true);
    expect(lista.find((i) => i.doc.includes('Planta de Situação'))!.geradoPeloApp).toBe(true);
  });

  it('RG/CPF e Comprovante de imóvel compartilham o mesmo item de checklist (rg_cpf_comprovante)', () => {
    const checklist = marcarItemAnexado(CHECKLIST_PADRAO_CEMIG_MICROGD, 'rg_cpf_comprovante', true);
    const lista = checklistDocumentosCEMIG({ checklistDocumentacao: checklist });
    expect(lista.find((i) => i.doc.includes('RG + CPF'))!.status).toBe('ok');
    expect(lista.find((i) => i.doc.includes('Comprovante de Propriedade'))!.status).toBe('ok');
  });

  it('itens não obrigatórios (CAR, Análise de Carga) permanecem nao_aplicavel', () => {
    const lista = checklistDocumentosCEMIG({});
    expect(lista.find((i) => i.doc.includes('CAR'))!.status).toBe('nao_aplicavel');
    expect(lista.find((i) => i.doc.includes('Análise de Carga'))!.status).toBe('nao_aplicavel');
  });

  it('retorna 11 itens no total (8 do checklist principal + 3 variações/extras)', () => {
    expect(checklistDocumentosCEMIG({})).toHaveLength(11);
  });
});
