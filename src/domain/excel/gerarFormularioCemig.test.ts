import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, unlinkSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checklistDocumentosCEMIG, gerarFormularioCemigMicroGD, MAPA_CELULAS } from './gerarFormularioCemig';
import { CHECKLIST_PADRAO_CEMIG_MICROGD, marcarItemGerado, marcarItemAnexado } from '../documentacaoCemig/checklist';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');

// BUG CORRIGIDO (set/2026): ver comentário completo em gerarExcel.test.ts —
// mesma correção (isolar em diretório temporário próprio em vez de cwd
// compartilhado), motivada por uma falha real desta sessão causada por
// exatamente essa colisão neste mesmo arquivo de teste.
const DIR_TESTE = mkdtempSync(path.join(os.tmpdir(), 'lumensolar-test-cemig-'));

function limparArquivosGerados() {
  for (const f of readdirSync(DIR_TESTE)) {
    if (f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx')) unlinkSync(path.join(DIR_TESTE, f));
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
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);

    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    expect(gerados.length).toBeGreaterThan(0);
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const ws = wb.Sheets['Formulário_Preenchido'];

    expect(ws[MAPA_CELULAS.uc_cpf]?.v).toBe('123.456.789-00');
    expect(ws[MAPA_CELULAS.uc_bairro]?.v).toBe('Centro');
    expect(ws[MAPA_CELULAS.uc_cep]?.v).toBe('38440-000');
    expect(ws[MAPA_CELULAS.grid_zero]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.fast_track]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.motor_gerador]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.armazenamento]?.v).toBe('Não');
    expect(ws[MAPA_CELULAS.telhado_arrendado]?.v).toBe('Não');
  });

  // BUG CORRIGIDO (ago/2026): caso real (Ana Maria Vieira de Sá e Silva) tinha
  // `localizacao.utmE`/`utmN` = "−48,2049444"/"−18,6366583" — uma
  // latitude/longitude do Google Maps (sinal de menos Unicode U+2212, não
  // hífen-menos ASCII, e vírgula decimal PT-BR) que foi parar nos campos de
  // UTM por engano (ver parseNumeroBR.ts e utmValorPlausivel.test.ts para a
  // causa raiz). O código antigo escrevia essa STRING direto numa célula
  // XLSX tipo 'n' (numérico) sem convertê-la — o resultado viola a
  // especificação OOXML (célula numérica precisa de um literal numérico
  // válido). Verificado de duas formas contra o .xlsx gerado pelo código
  // antigo: openpyxl (Python, parser rígido) recusava abrir o arquivo
  // ("invalid literal for int()"); o próprio SheetJS (lib usada pelo app)
  // não lançava, mas lia a célula de volta como v:null/w:"NAN" — perda
  // silenciosa do dado, sem indício de erro. Dependendo de quem abrisse o
  // Formulário antes de enviar à CEMIG, o resultado era "arquivo recusa
  // abrir" ou "campo aparentemente vazio". A correção (`parseNumeroBR`)
  // normaliza o sinal de menos Unicode e a vírgula ANTES de decidir o tipo
  // da célula — então este valor específico (que É um número válido, só
  // formatado de um jeito que `Number()` puro não reconhece) agora vai
  // corretamente para uma célula tipo 'n' com o valor numérico certo
  // (-48.2049444), em vez de uma célula 'n' com uma string inválida dentro.
  it('REGRESSÃO — utmE/utmN com lat/long colada do Google Maps (sinal de menos Unicode) vira número válido, não corrompe o .xlsx', () => {
    const menosUnicode = '−'; // U+2212 MINUS SIGN — caractere exato do caso real
    const dados = {
      cliente: { nome: 'Ana Maria Vieira de Sá e Silva' },
      consumo: {},
      localizacao: {
        utmFuso: 22,
        utmE: `${menosUnicode}48,2049444`,
        utmN: `${menosUnicode}18,6366583`,
      },
      kit: {},
      empresa: {},
    };
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);

    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    expect(gerados.length).toBeGreaterThan(0);
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const ws = wb.Sheets['Formulário_Preenchido'];

    expect(ws[MAPA_CELULAS.utm_fuso]?.v).toBe(22);
    expect(ws[MAPA_CELULAS.utm_fuso]?.t).toBe('n');
    // Valor calculado manualmente: "−48,2049444" (menos Unicode + vírgula) é
    // o número -48.2049444, não uma string opaca.
    expect(ws[MAPA_CELULAS.utm_e]?.t).toBe('n');
    expect(ws[MAPA_CELULAS.utm_e]?.v).toBeCloseTo(-48.2049444, 6);
    expect(ws[MAPA_CELULAS.utm_n]?.t).toBe('n');
    expect(ws[MAPA_CELULAS.utm_n]?.v).toBeCloseTo(-18.6366583, 6);
  });

  // Complementa o teste acima: um valor que NÃO é número de jeito nenhum
  // (nem com a normalização de menos Unicode/vírgula) precisa continuar
  // indo como texto — é o caso de defesa que `escreverNumerico()` existe
  // para cobrir (ex: usuário cola um endereço ou texto qualquer no campo
  // UTM, não só uma lat/long malformatada).
  it('utmE com texto que não é número de jeito nenhum vai como texto (tipo "s"), sem corromper o arquivo', () => {
    const dados = {
      cliente: { nome: 'Cliente Teste' },
      consumo: {},
      localizacao: { utmFuso: 22, utmE: 'endereço não encontrado', utmN: '7937092.29' },
      kit: {},
      empresa: {},
    };
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);
    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const ws = wb.Sheets['Formulário_Preenchido'];
    expect(ws[MAPA_CELULAS.utm_e]?.t).toBe('s');
    expect(ws[MAPA_CELULAS.utm_e]?.v).toBe('endereço não encontrado');
    expect(ws[MAPA_CELULAS.utm_n]?.t).toBe('n');
    expect(ws[MAPA_CELULAS.utm_n]?.v).toBe(7937092.29);
  });

  it('utmE/utmN com valor numérico válido continuam indo como número (tipo "n"), sem regressão', () => {
    const dados = {
      cliente: { nome: 'Cliente Teste' },
      consumo: {},
      localizacao: { utmFuso: 22, utmE: '794897.61', utmN: '7937092.29' },
      kit: {},
      empresa: {},
    };
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);
    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const ws = wb.Sheets['Formulário_Preenchido'];
    expect(ws[MAPA_CELULAS.utm_e]?.t).toBe('n');
    expect(ws[MAPA_CELULAS.utm_e]?.v).toBe(794897.61);
    expect(ws[MAPA_CELULAS.utm_n]?.t).toBe('n');
    expect(ws[MAPA_CELULAS.utm_n]?.v).toBe(7937092.29);
  });
});

// REGRESSÃO (set/2026): a aba "Instruções" do .xlsx real gerado citava
// "ND CEMIG 5.30" fixo no cabeçalho da lista de documentos obrigatórios,
// mesmo pra cliente Grupo A (média tensão) — mesmo bug e mesma correção de
// checklistDocumentosCEMIG, mas na função que produz o arquivo de verdade
// (não só a estrutura de dados em memória).
describe('gerarFormularioCemigMicroGD — aba Instruções cita a norma de conexão certa', () => {
  afterEach(() => limparArquivosGerados());

  it('cliente Grupo A (média tensão): cabeçalho cita ND CEMIG 5.31, nunca 5.30', () => {
    const dados = {
      cliente: { nome: 'Cliente MT', cidade: 'Araguari', uf: 'MG' },
      consumo: { tipoLigacao: 'trifasica', grupoTensao: 'A' },
      localizacao: {}, kit: { potenciaModuloWp: 550, quantidade: 10 }, empresa: {},
    };
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);
    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const wsInst = wb.Sheets['Instruções'];
    const cabecalho = wsInst['A8']?.v as string; // linha "DOCUMENTOS OBRIGATÓRIOS — ..."
    expect(cabecalho).toContain('DOCUMENTOS OBRIGATÓRIOS');
    expect(cabecalho).toContain('5.31');
    expect(cabecalho).not.toContain('5.30');
  });

  it('cliente Grupo B (baixa tensão) ou sem grupoTensao: cabeçalho cita ND CEMIG 5.30', () => {
    const dados = {
      cliente: { nome: 'Cliente BT', cidade: 'Araguari', uf: 'MG' },
      consumo: { tipoLigacao: 'monofasica' },
      localizacao: {}, kit: { potenciaModuloWp: 550, quantidade: 10 }, empresa: {},
    };
    gerarFormularioCemigMicroGD(dados, DIR_TESTE);
    const gerados = readdirSync(DIR_TESTE).filter(f => f.startsWith('FormularioCEMIG_MicroGD_') && f.endsWith('.xlsx'));
    const wb = XLSX.readFile(path.join(DIR_TESTE, gerados[0]));
    const wsInst = wb.Sheets['Instruções'];
    const cabecalho = wsInst['A8']?.v as string;
    expect(cabecalho).toContain('5.30');
    expect(cabecalho).not.toContain('5.31');
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

  // REGRESSÃO (set/2026): "ND 5.30" citado fixo pro Memorial e pra Planta de
  // Situação, mesmo pra cliente Grupo A (média tensão) — a Cemig exige
  // ND-5.31 pra conexão em média tensão (confirmado no texto do portal Cemig
  // Atende). Ver normaConexaoCemig em ../documentacaoCemig/checklist.ts.
  it('Memorial Descritivo e Planta de Situação citam ND CEMIG 5.31 para cliente Grupo A (média tensão)', () => {
    const lista = checklistDocumentosCEMIG({ consumo: { grupoTensao: 'A' } });
    expect(lista.find((i) => i.doc.includes('Memorial'))!.doc).toContain('5.31');
    expect(lista.find((i) => i.doc.includes('Planta de Situação'))!.doc).toContain('5.31');
  });

  it('Memorial Descritivo e Planta de Situação citam ND CEMIG 5.30 para cliente Grupo B (baixa tensão) ou sem grupoTensao informado', () => {
    const semGrupo = checklistDocumentosCEMIG({});
    expect(semGrupo.find((i) => i.doc.includes('Memorial'))!.doc).toContain('5.30');
    expect(semGrupo.find((i) => i.doc.includes('Planta de Situação'))!.doc).toContain('5.30');

    const grupoB = checklistDocumentosCEMIG({ consumo: { grupoTensao: 'B' } });
    expect(grupoB.find((i) => i.doc.includes('Memorial'))!.doc).toContain('5.30');
    expect(grupoB.find((i) => i.doc.includes('Planta de Situação'))!.doc).toContain('5.30');
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
