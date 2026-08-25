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
 *
 * CORRIGIDO (ago/2026): a versão anterior deste mapa (28 de 31 células)
 * estava ERRADA — apontava sistematicamente para a linha ABAIXO do rótulo,
 * na mesma coluna do texto do rótulo, quando na verdade o arquivo oficial
 * usa "rótulo e caixa de preenchimento na MESMA linha, algumas colunas à
 * direita" na maior parte do formulário (só a Seção 9 usa um layout
 * diferente ainda, com a caixa 1-2 linhas abaixo do rótulo). O caso mais
 * grave: a célula antiga de `sol_data` (B234) não era uma célula em
 * branco — era a PRÓPRIA célula do rótulo "Local e data*:" no arquivo
 * oficial, ou seja, o valor gerado teria sobrescrito o rótulo do campo se
 * colado por posição de célula em vez de por leitura visual.
 *
 * Encontrado ao auditar este arquivo (que já tinha um bug conhecido nos
 * ternários mortos do checklist — ver `checklistDocumentosCEMIG` abaixo) e
 * ao finalmente ter acesso ao arquivo oficial `Formulario-MicroGD_Rev_N4.xlsx`
 * fornecido pelo usuário. Cada célula abaixo foi reverificada linha por
 * linha com `openpyxl`, localizando a caixa de preenchimento real (borda
 * `left:medium` = caixa de formulário impresso) mais próxima de cada
 * rótulo de texto — não apenas "célula vazia perto do rótulo".
 *
 * Apenas 3 células já estavam certas: uc_numero (J12), tipo_solicitacao
 * (I41) e tipo_edificacao (I43) — coincidentemente os únicos 3 campos cujo
 * padrão real (mesma linha do rótulo) bateu com o padrão assumido no
 * mapa antigo.
 */
export const MAPA_CELULAS = {
  // ── Seção 1 — Identificação da UC ──────────────────────────────────────
  uc_numero:        'J12',   // Número da Instalação (UC) — rótulo B12, mesma linha
  uc_titular:       'N16',   // Nome do Titular da UC — rótulo B16, mesma linha
  uc_cpf:           'AC18',  // CPF/CNPJ do Titular — rótulo Y18, mesma linha
  uc_logradouro:    'G20',   // Logradouro — rótulo B20, mesma linha
  uc_num_ender:     'AI20',  // Número do imóvel — rótulo AE20, mesma linha
  uc_complemento:   'AR20',  // Complemento — rótulo AL20, mesma linha
  uc_bairro:        'E22',   // Bairro — rótulo B22, mesma linha
  uc_municipio:     'T22',   // Município — rótulo P22, mesma linha
  uc_cep:           'AS22',  // CEP — rótulo AQ22, mesma linha
  uc_celular:       'O24',   // Celular do titular — rótulo L24, mesma linha
  uc_email:         'Y24',   // E-mail do titular — rótulo V24, mesma linha

  // ── Seção 2 — Dados da UC ───────────────────────────────────────────────
  utm_fuso:         'V29',   // Fuso UTM — rótulo T29, mesma linha
  utm_e:            'AC29',  // E Abscissa (UTM) — rótulo X29, mesma linha
  utm_n:            'AL29',  // N Ordenada (UTM) — rótulo AG29, mesma linha
  tipo_solicitacao: 'I41',   // Tipo de solicitação (dropdown CEMIG) — rótulo B41, mesma linha
  tipo_edificacao:  'I43',   // Tipo de edificação (dropdown CEMIG) — rótulo B43, mesma linha
  tensao_atend:     'L55',   // Tensão de atendimento (127/220 ou 220/380) — rótulo B55, mesma linha

  // ── Seção 4 — Dados da Geração (Fotovoltaica) ──────────────────────────
  // Módulos — cada rótulo e sua caixa ficam na MESMA linha (108,110,...118),
  // não na linha seguinte como o mapa antigo assumia.
  mod_modelo:       'L108',  // Modelo dos Módulos
  mod_fabricante:   'L110',  // Fabricante dos Módulos
  mod_pot_w:        'L112',  // Potência Nominal do Módulo (W)
  mod_qtde:         'L114',  // Quantidade de Módulos
  mod_pot_total_kw: 'L116',  // Potência Total Módulos (kW)
  mod_area:         'L118',  // Área dos Arranjos (m²)

  // Inversores — mesmo padrão, coluna AI em vez de L
  inv_modelo:       'AI108', // Modelo dos Inversores
  inv_fabricante:   'AI110', // Fabricante dos Inversores
  inv_pot_kw:       'AI112', // Potência Nominal Inversor (kW)
  inv_qtde:         'AI114', // Quantidade de Inversores
  inv_pot_total_kw: 'AI116', // Potência Total Inversores (kW)
  inv_tensao:       'AI118', // Tensão de Conexão do Inversor (V)

  // ── Seção 9 — Solicitante (Engenheiro/Procurador) ──────────────────────
  // Conforme REN 1.000/2021 Art. 9: procurador deve ser identificado.
  // Único trecho do formulário com caixa 1-2 linhas ABAIXO do rótulo (em
  // vez de na mesma linha) — confirmado célula a célula.
  sol_nome:         'Q220',  // Nome do Consumidor ou Procurador Legal — rótulo B220, mesma linha
  sol_endereco:     'O222',  // Endereço de Correspondência — rótulo B222:N224, mesma linha
  sol_celular:      'O226',  // Celular do solicitante — rótulo L226, mesma linha
  sol_email:        'Y226',  // E-mail do solicitante — rótulo V226:X226, mesma linha
  sol_data:         'C236',  // Local e data — rótulo B234; caixa fica 2 linhas abaixo (B234 é só o rótulo)
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
