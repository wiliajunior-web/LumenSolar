/**
 * GERADOR DO FORMULÁRIO CEMIG — MicroGD Rev. N4
 * Preenche automaticamente o formulário oficial de solicitação de acesso
 * com os dados do projeto cadastrados no LumenSolar.
 *
 * Formulário: "Formulário de Solicitação de Acesso para Microgeração Distribuída"
 * Revisão: N4 (03/12/2024)
 * Responsável CEMIG: EM/PE — geracaodistribuida@cemig.com.br
 *
 * Base legal: REN ANEEL 1.000/2021 (Art. 9 — procuração obrigatória)
 * Lei 14.300/2022 (SCEE — Microgeração)
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');

/**
 * Mapa de células do formulário CEMIG MicroGD Rev. N4.
 * Obtido por análise direta do arquivo xlsx oficial.
 * Células com valores default da CEMIG são mantidas; apenas campos
 * editáveis pelo solicitante são preenchidos.
 */
const MAPA_CELULAS = {
  // ── Seção 1 — Identificação da UC ──────────────────────────────────────
  uc_numero:        'J12',   // Número da Instalação (UC)
  uc_titular:       'B17',   // Nome do Titular da UC
  uc_cpf:           'Z18',   // CPF/CNPJ do Titular
  uc_logradouro:    'B21',   // Logradouro
  uc_num_ender:     'AF21',  // Número do imóvel
  uc_complemento:   'AM21',  // Complemento
  uc_bairro:        'B23',   // Bairro
  uc_municipio:     'Q23',   // Município
  uc_cep:           'AR23',  // CEP
  uc_celular:       'M25',   // Celular do titular
  uc_email:         'W25',   // E-mail do titular

  // ── Seção 2 — Dados da UC ───────────────────────────────────────────────
  utm_fuso:         'V30',   // Fuso UTM
  utm_e:            'AB30',  // E Abscissa (UTM)
  utm_n:            'AH30',  // N Ordenada (UTM)
  tipo_solicitacao: 'I41',   // Tipo de solicitação (dropdown CEMIG)
  tipo_edificacao:  'I43',   // Tipo de edificação (dropdown CEMIG)
  tensao_atend:     'X55',   // Tensão de atendimento (127/220 ou 220/380)

  // ── Seção 4 — Dados da Geração (Fotovoltaica) ──────────────────────────
  // Módulos (coluna B/C)
  mod_modelo:       'C109',  // Modelo dos Módulos
  mod_fabricante:   'C111',  // Fabricante dos Módulos
  mod_pot_w:        'C113',  // Potência Nominal do Módulo (W)
  mod_qtde:         'C115',  // Quantidade de Módulos
  mod_pot_total_kw: 'C117',  // Potência Total Módulos (kW)
  mod_area:         'C119',  // Área dos Arranjos (m²)

  // Inversores (coluna Y)
  inv_modelo:       'Y109',  // Modelo dos Inversores
  inv_fabricante:   'Y111',  // Fabricante dos Inversores
  inv_pot_kw:       'Y113',  // Potência Nominal Inversor (kW)
  inv_qtde:         'Y115',  // Quantidade de Inversores
  inv_pot_total_kw: 'Y117',  // Potência Total Inversores (kW)
  inv_tensao:       'Y119',  // Tensão de Conexão do Inversor (V)

  // ── Seção 9 — Solicitante (Engenheiro/Procurador) ──────────────────────
  // Conforme REN 1.000/2021 Art. 9: procurador deve ser identificado
  sol_nome:         'B219',  // Nome do Consumidor ou Procurador Legal
  sol_endereco:     'B221',  // Endereço de Correspondência
  sol_celular:      'M225',  // Celular do solicitante
  sol_email:        'W225',  // E-mail do solicitante
  sol_data:         'B234',  // Local e data de assinatura
};

/** Valores padrão para campos CEMIG que raramente mudam */
const DEFAULTS_CEMIG = {
  tipo_solicitacao: 'Conexão de GD em Unidade Consumidora Existente SEM Alteração de Potência Disponibilizada',
  tipo_edificacao:  'Edificação Individual',
  grid_zero:        'Não',    // O14 — padrão
  fast_track:       'Não',    // AL12 — padrão
  motor_gerador:    'Não',    // AD33 — padrão
  armazenamento:    'Não',    // R134 — padrão
  telhado_arrendado:'Não',    // AF61 — padrão
};

export function gerarFormularioCemigMicroGD(dados: any): void {
  const { cliente, consumo, localizacao, kit, dimensionamento, empresa } = dados;

  // ── Derivar dados calculados ───────────────────────────────────────────
  const hoje = new Date();
  const dataFormatada = `${cliente?.cidade || 'Local'}, ${hoje.getDate().toString().padStart(2,'0')}/${(hoje.getMonth()+1).toString().padStart(2,'0')}/${hoje.getFullYear()}`;
  const potTotalModulos = ((kit?.potenciaModuloWp || 0) * (kit?.quantidade || 0) / 1000);
  const potTotalInversores = (kit?.potenciaInversorKW || 0) * (kit?.numInversores || 1);
  const areaMod = kit?.comprimentoMm && kit?.larguraMm
    ? (kit.comprimentoMm / 1000) * (kit.larguraMm / 1000) * (kit.quantidade || 1) * 1.1
    : (dimensionamento?.areaNecessariaM2 || 0);
  const tensao = consumo?.tipoLigacao === 'trifasica' ? '220/380' : '127/220';

  // ── Criar workbook com os valores do projeto ───────────────────────────
  const wb = XLSX.utils.book_new();
  const ws: Record<string, any> = {};

  // Helper: escrever célula simples (valor, sem fórmula)
  const escrever = (celula: string, valor: any, tipo: 'n'|'s' = typeof valor === 'number' ? 'n' : 's') => {
    ws[celula] = { t: tipo, v: valor };
  };

  // ── Seção 1 ──────────────────────────────────────────────────────────
  escrever(MAPA_CELULAS.uc_numero,    localizacao?.numeroUC || '');
  escrever(MAPA_CELULAS.uc_titular,   cliente?.nome || '');
  escrever(MAPA_CELULAS.uc_cpf,       cliente?.cpf || '');
  escrever(MAPA_CELULAS.uc_logradouro,cliente?.endereco || localizacao?.enderecoInstalacao || '');
  escrever(MAPA_CELULAS.uc_bairro,    cliente?.bairro || '');
  escrever(MAPA_CELULAS.uc_municipio, cliente?.cidade || '');
  escrever(MAPA_CELULAS.uc_cep,       cliente?.cep || '');
  escrever(MAPA_CELULAS.uc_celular,   cliente?.telefone || '');
  escrever(MAPA_CELULAS.uc_email,     cliente?.email || '');

  // ── Seção 2 ──────────────────────────────────────────────────────────
  if (localizacao?.fusoUtm)  escrever(MAPA_CELULAS.utm_fuso, localizacao.fusoUtm, 'n');
  if (localizacao?.utmE)     escrever(MAPA_CELULAS.utm_e,    localizacao.utmE, 'n');
  if (localizacao?.utmN)     escrever(MAPA_CELULAS.utm_n,    localizacao.utmN, 'n');
  escrever(MAPA_CELULAS.tipo_solicitacao, DEFAULTS_CEMIG.tipo_solicitacao);
  escrever(MAPA_CELULAS.tipo_edificacao,  DEFAULTS_CEMIG.tipo_edificacao);
  escrever(MAPA_CELULAS.tensao_atend,     tensao);

  // ── Seção 4 — Módulos ────────────────────────────────────────────────
  escrever(MAPA_CELULAS.mod_modelo,       kit?.modeloModulo || '');
  escrever(MAPA_CELULAS.mod_fabricante,   kit?.marcaModulo || '');
  escrever(MAPA_CELULAS.mod_pot_w,        kit?.potenciaModuloWp || 0, 'n');
  escrever(MAPA_CELULAS.mod_qtde,         kit?.quantidade || 0, 'n');
  escrever(MAPA_CELULAS.mod_pot_total_kw, potTotalModulos, 'n');
  escrever(MAPA_CELULAS.mod_area,         parseFloat(areaMod.toFixed(1)), 'n');

  // ── Seção 4 — Inversores ─────────────────────────────────────────────
  escrever(MAPA_CELULAS.inv_modelo,       kit?.modeloInversor || '');
  escrever(MAPA_CELULAS.inv_fabricante,   kit?.marcaInversor || '');
  escrever(MAPA_CELULAS.inv_pot_kw,       kit?.potenciaInversorKW || 0, 'n');
  escrever(MAPA_CELULAS.inv_qtde,         kit?.numInversores || 1, 'n');
  escrever(MAPA_CELULAS.inv_pot_total_kw, potTotalInversores, 'n');
  escrever(MAPA_CELULAS.inv_tensao,       kit?.tensaoSaidaV || 220, 'n');

  // ── Seção 9 — Solicitante/Procurador ────────────────────────────────
  escrever(MAPA_CELULAS.sol_nome,     empresa?.responsavelTecnico || '');
  escrever(MAPA_CELULAS.sol_endereco, [empresa?.razaoSocial, empresa?.cidade, empresa?.uf].filter(Boolean).join(' — '));
  escrever(MAPA_CELULAS.sol_celular,  empresa?.telefone || '');
  escrever(MAPA_CELULAS.sol_email,    empresa?.email || '');
  escrever(MAPA_CELULAS.sol_data,     dataFormatada);

  ws['!ref'] = 'A1:AT295';

  XLSX.utils.book_append_sheet(wb, ws, 'Formulario_Preenchido');

  // Aba de instruções
  const wsInst: Record<string, any> = {};
  const instrucoes = [
    ['INSTRUÇÕES DE USO — Formulário CEMIG MicroGD'],
    [''],
    ['1. Abra o arquivo ORIGINAL do formulário CEMIG (Formulario-MicroGD_Rev_N4.xlsx)'],
    ['2. Copie os valores da aba "Formulario_Preenchido" para as células correspondentes no formulário original'],
    ['3. Verifique os campos de dropdown (Tipo de Solicitação, Tipo de Edificação) — selecionar na lista'],
    ['4. Assine digitalmente ou imprima para assinatura manual (Seção 9)'],
    [''],
    ['DOCUMENTOS OBRIGATÓRIOS — REN ANEEL 1.000/2021 + ND CEMIG 5.30:'],
    ['  ☐  Este formulário preenchido e assinado'],
    ['  ☐  Procuração (gerada pelo LumenSolar — Art. 9 REN 1.000/2021)'],
    ['  ☐  Memorial Descritivo técnico (gerado pelo LumenSolar)'],
    ['  ☐  DUB — Diagrama Unifilar Básico (conforme modelo CEMIG)'],
    ['  ☐  Planta de Situação (com coordenadas UTM e satélite)'],
    ['  ☐  ART do responsável técnico (CREA)'],
    ['  ☐  RG + CPF do titular da UC'],
    ['  ☐  Comprovante de propriedade/posse do imóvel'],
    ['  ☐  Certif. INMETRO dos módulos e inversores'],
    [''],
    ['PRAZO CEMIG: protocolo → vistoria → conexão: ~30-60 dias úteis'],
    ['CONTATO: geracaodistribuida@cemig.com.br | 0800 721 0167'],
  ];
  instrucoes.forEach((row, i) => {
    if (row[0]) wsInst[`A${i+1}`] = { t: 's', v: row[0] };
  });
  wsInst['!ref'] = `A1:A${instrucoes.length}`;
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucoes');

  // Download
  const nomeCliente = (cliente?.nome || 'Cliente').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
  XLSX.writeFile(wb, `FormularioCEMIG_MicroGD_${nomeCliente}.xlsx`);
}

/**
 * Checklist de documentos CEMIG por tipo de instalação.
 *
 * CORRIGIDO (ago/2026): a versão anterior tinha 4 condicionais do tipo
 * `condicao ? 'pendente' : 'pendente'` — os dois ramos retornavam o MESMO
 * valor, ou seja, "pendente" sempre, independente da condição (código morto
 * nunca coberto por teste, encontrado ao auditar este arquivo por causa do
 * DUB/Planta de Situação). Corrigido delegando para o checklist com estado
 * real (`@domain/documentacaoCemig/checklist`), que é a mesma lista que
 * alimenta a UI — os itens "gerado_automaticamente" agora refletem
 * `dados.checklistDocumentacao` de verdade (preenchido pelo app quando cada
 * documento é gerado), e os "anexo_manual" (ART, RG/CPF, INMETRO) mostram
 * 'pendente' honestamente até o usuário confirmar que anexou, em vez de uma
 * fórmula que fingia checar algo que não tinha como checar a partir de `dados`.
 */
import {
  CHECKLIST_PADRAO_CEMIG_MICROGD,
  type ItemChecklistDocumentacao,
} from '../documentacaoCemig/checklist';

export function checklistDocumentosCEMIG(dados: any): Array<{doc: string; obrigatorio: boolean; geradoPeloApp: boolean; status: 'ok'|'pendente'|'nao_aplicavel'}> {
  const checklist: ItemChecklistDocumentacao[] = dados?.checklistDocumentacao ?? CHECKLIST_PADRAO_CEMIG_MICROGD;
  const porId = (id: string) => checklist.find((i) => i.id === id);
  const concluido = (id: string) => {
    const item = porId(id);
    if (!item) return false;
    return item.tipo === 'gerado_automaticamente' ? !!item.geradoEm : !!item.anexado;
  };

  return [
    { doc: 'Formulário MicroGD CEMIG (Rev. N4)', obrigatorio: true, geradoPeloApp: true, status: concluido('formulario_microgd') ? 'ok' : 'pendente' },
    { doc: 'Procuração (Art. 9 REN 1.000/2021)', obrigatorio: true, geradoPeloApp: true, status: concluido('procuracao') ? 'ok' : 'pendente' },
    { doc: 'Memorial Descritivo Técnico (ND 5.30)', obrigatorio: true, geradoPeloApp: true, status: concluido('memorial_descritivo') ? 'ok' : 'pendente' },
    { doc: 'DUB — Diagrama Unifilar Básico', obrigatorio: true, geradoPeloApp: true, status: concluido('dub') ? 'ok' : 'pendente' },
    { doc: 'Planta de Situação (satélite + UTM)', obrigatorio: true, geradoPeloApp: true, status: concluido('planta_situacao') ? 'ok' : 'pendente' },
    { doc: 'ART do Responsável Técnico', obrigatorio: true, geradoPeloApp: false, status: concluido('art') ? 'ok' : 'pendente' },
    { doc: 'RG + CPF do Titular da UC', obrigatorio: true, geradoPeloApp: false, status: concluido('rg_cpf_comprovante') ? 'ok' : 'pendente' },
    { doc: 'Comprovante de Propriedade/Posse do Imóvel', obrigatorio: true, geradoPeloApp: false, status: concluido('rg_cpf_comprovante') ? 'ok' : 'pendente' },
    { doc: 'Certificado INMETRO — Módulos e Inversores', obrigatorio: true, geradoPeloApp: false, status: concluido('certificados_inmetro') ? 'ok' : 'pendente' },
    { doc: 'CAR (Cadastro Ambiental Rural)', obrigatorio: false, geradoPeloApp: false, status: 'nao_aplicavel' }, // apenas imóveis rurais
    { doc: 'Formulário de Análise de Carga (ligação nova)', obrigatorio: false, geradoPeloApp: false, status: 'nao_aplicavel' }, // apenas para ligação nova ou aumento de carga
  ];
}
