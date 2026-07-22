/**
 * Gerador de planilha de auditoria — LumenSolar
 * Usa SheetJS (xlsx) para criar um .xlsx com fórmulas vivas.
 * Cada cálculo feito no app é replicado como fórmula Excel referenciando
 * as células de entrada, permitindo segunda opinião e rastreabilidade.
 *
 * Estrutura:
 *   Aba 1 — Entradas           (inputs em azul)
 *   Aba 2 — Perdas             (IEC 61724-1)
 *   Aba 3 — Dimensionamento    (IEC 61724-1)
 *   Aba 4 — FioB_Economia      (Lei 14.300/2022)
 *   Aba 5 — Precificacao       (Preço = Custo/(1-imp-marg))
 *   Aba 6 — Tabela_Price       (amortização completa)
 *   Aba 7 — Fluxo_Caixa       (TIR, VPL, Payback — 25 anos)
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');

// ── Tipos SheetJS ─────────────────────────────────────────────────────────────
type WS  = Record<string, any>;
type WB  = { SheetNames: string[]; Sheets: Record<string,WS> };

type CellFmt = string;
const F_BRL    = '#,##0.00';
const F_INT    = '#,##0';
const F_PCT    = '0.00%';
const F_KWP    = '#,##0.000';
const F_KWH    = '#,##0.0';
const F_NONE   = '@';

// ── Utilitários ───────────────────────────────────────────────────────────────
function col(n: number): string {
  let s = '';
  while (n > 0) { s = String.fromCharCode(65 + ((n-1) % 26)) + s; n = Math.floor((n-1)/26); }
  return s;
}
function ref(r: number, c: number): string { return col(c) + r; }

function setStr(ws: WS, r: number, c: number, v: string) {
  ws[ref(r,c)] = { t:'s', v };
}
function setNum(ws: WS, r: number, c: number, v: number, fmt?: CellFmt) {
  ws[ref(r,c)] = { t:'n', v, z: fmt ?? 'General' };
}
function setFrm(ws: WS, r: number, c: number, f: string, fmt?: CellFmt, cached?: number) {
  ws[ref(r,c)] = { t:'n', f, v: cached ?? 0, z: fmt ?? 'General' };
}

function updateRef(ws: WS, maxR: number, maxC: number) {
  ws['!ref'] = `A1:${col(maxC)}${maxR}`;
}
function setCols(ws: WS, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ── Gerador principal ─────────────────────────────────────────────────────────
export function gerarExcelAuditoria(dados: any): void {
  const { empresa, cliente, consumo, localizacao, kit, preco,
          dimensionamento, custosRecorrentes, precificacao, indicadores } = dados;

  const wb: WB = XLSX.utils.book_new();

  // Extrair valores para preencher as células de entrada
  const contas: number[] = (consumo?.contas ?? []).slice(0, 12).map((c:any) => c.kWh || 0);
  while (contas.length < 12) contas.push(0);
  const mediaConsumo = contas.filter(k=>k>0).reduce((a:number,b:number)=>a+b,0) / Math.max(contas.filter((k:number)=>k>0).length, 1);
  const tarifa   = consumo?.tarifaRealKWhComICMS   ?? 1.18272801;
  const cip      = consumo?.cipMensalRS             ?? 0;
  const kwhMin   = consumo?.tipoLigacao === 'monofasica' ? 30 : consumo?.tipoLigacao === 'trifasica' ? 100 : 50;

  const hsp       = 5.4; // HSP MG — pode ser parametrizado
  const potWp     = kit?.potenciaModuloWp          ?? 550;
  const qtd       = kit?.quantidade                ?? 0;
  const eficInv   = kit?.eficienciaInversorPercent ?? 98.4;
  const potInv    = kit?.potenciaInversorKW        ?? 0;
  const vocMod    = kit?.vocV                      ?? 0;
  const iscMod    = kit?.iscA                      ?? 0;
  const numStr    = kit?.numStrings                ?? 1;
  const modStr    = kit?.modulosPorString          ?? qtd;
  const custoKit  = kit?.custoKitRS               ?? 0;
  const percComp  = kit?.percentualCompensacaoDesejado ?? 1.0;
  const coefTemp  = kit?.coeficienteTemperaturaPmax   ?? -0.34; // não está no kit padrão, usar default
  const noct      = 45;
  const tamb      = 24;
  const somb      = 2;
  const suj       = 2;
  const ganhoBI   = kit?.tipoModulo?.includes('bifacial') ? 5 : 0;

  const estrutura = preco?.estruturaRS             ?? 0;
  const matEl     = preco?.materiaisEletricosRS    ?? 0;
  const maoObra   = preco?.maoDeObraRS             ?? 0;
  const projART   = preco?.projetoArtRS            ?? 0;
  const outros    = preco?.outrosCustosRS          ?? 0;
  const aliqImp   = preco?.aliquotaImpostos        ?? 0.065;
  const margem    = preco?.margemDesejada          ?? 0.18;

  const degradacao = 0.005;
  const reajuste   = 0.07;
  const tma        = 0.08;
  const taxaSolf48 = 0.0199;
  const taxaSolf60 = 0.0199;
  const anoBase    = new Date().getFullYear();

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 1 — ENTRADAS
  // ═══════════════════════════════════════════════════════════════════════════
  const ws1: WS = {};
  setCols(ws1, [38, 20, 28]);

  let r = 1;
  setStr(ws1, r, 1, 'LumenSolar — Dados de Entrada'); r++;
  setStr(ws1, r, 1, 'Células em AZUL = você preenche. Fórmulas nas outras abas referenciam estas células.'); r+=2;

  // Cliente
  setStr(ws1, r, 1, '1. DADOS DO CLIENTE'); r++;
  setStr(ws1, r, 1, 'Nome do cliente');        setStr(ws1, r, 2, cliente?.nome ?? ''); r++;
  setStr(ws1, r, 1, 'Cidade');                 setStr(ws1, r, 2, cliente?.cidade ?? ''); r++;
  setStr(ws1, r, 1, 'UF');                     setStr(ws1, r, 2, cliente?.uf ?? 'MG'); r+=2;

  // Consumo
  setStr(ws1, r, 1, '2. CONSUMO (da conta de energia)'); r++;
  setStr(ws1, r, 1, 'Distribuidora');           setStr(ws1, r, 2, consumo?.codigoDistribuidora ?? 'CEMIG'); r++;
  setStr(ws1, r, 1, 'Tipo de ligação');         setStr(ws1, r, 2, consumo?.tipoLigacao ?? 'bifasica'); r++;
  setStr(ws1, r, 1, 'kWh mínimo disponib.');    setNum(ws1, r, 2, kwhMin, F_INT);
  setStr(ws1, r, 3, '30 monofásica / 50 bifásica / 100 trifásica'); r++;
  setStr(ws1, r, 1, 'Tarifa real (R$/kWh)');    setNum(ws1, r, 2, tarifa, F_BRL);
  setStr(ws1, r, 3, "Campo 'Preço Unit.' da conta CEMIG"); r++;
  setStr(ws1, r, 1, 'CIP / Ilum. pública (R$/mês)'); setNum(ws1, r, 2, cip, F_BRL); r++;

  const ROW_MES1 = r + 1; // linha do Mês 1
  setStr(ws1, r, 1, 'HISTÓRICO — Mês 1 = mais recente'); r++;
  for (let i = 0; i < 12; i++) {
    setStr(ws1, r, 1, `Mês ${i+1} (kWh)`);
    setNum(ws1, r, 2, contas[i], F_KWH); r++;
  }
  const ROW_MEDIA = r;
  setStr(ws1, r, 1, 'Média dos 12 meses (kWh/mês)');
  setFrm(ws1, r, 2, `=AVERAGE(B${ROW_MES1}:B${ROW_MES1+11})`, F_KWH, mediaConsumo); r+=2;

  // Local
  setStr(ws1, r, 1, '3. IRRADIAÇÃO');  r++;
  const ROW_HSP  = r; setStr(ws1, r, 1, 'HSP local (h/dia)'); setNum(ws1, r, 2, hsp); setStr(ws1, r, 3, 'MG=5.4 | SP=5.2 | BA=5.8'); r++;
  const ROW_DIAS = r; setStr(ws1, r, 1, 'Dias por mês (365/12)'); setNum(ws1, r, 2, 30.4167); r+=2;

  // Kit
  setStr(ws1, r, 1, '4. KIT SOLAR'); r++;
  const ROW_WP    = r; setStr(ws1, r, 1, 'Potência do módulo (Wp)');       setNum(ws1, r, 2, potWp, F_INT); r++;
  const ROW_QTD   = r; setStr(ws1, r, 1, 'Quantidade de módulos');           setNum(ws1, r, 2, qtd, F_INT); r++;
  const ROW_EFIC  = r; setStr(ws1, r, 1, 'Eficiência do inversor (%)');      setNum(ws1, r, 2, eficInv); r++;
  const ROW_POT_INV = r; setStr(ws1, r, 1, 'Potência do inversor (kW)');     setNum(ws1, r, 2, potInv); r++;
  const ROW_VOC   = r; setStr(ws1, r, 1, 'Voc (V)');                        setNum(ws1, r, 2, vocMod); r++;
  const ROW_ISC   = r; setStr(ws1, r, 1, 'Isc (A)');                        setNum(ws1, r, 2, iscMod); r++;
  const ROW_NSTR  = r; setStr(ws1, r, 1, 'Número de strings');               setNum(ws1, r, 2, numStr, F_INT); r++;
  const ROW_MSTR  = r; setStr(ws1, r, 1, 'Módulos por string');              setNum(ws1, r, 2, modStr, F_INT); r++;
  const ROW_CUSTO_KIT = r; setStr(ws1, r, 1, 'Custo do kit (R$)');          setNum(ws1, r, 2, custoKit, F_BRL); r++;
  const ROW_PERC  = r; setStr(ws1, r, 1, 'Percentual de compensação'); setNum(ws1, r, 2, percComp, F_PCT);
  setStr(ws1, r, 3, '1.0=100% | 1.2=120% de reserva'); r+=2;

  // Perdas
  setStr(ws1, r, 1, '5. PARÂMETROS DE PERDAS'); r++;
  const ROW_COEF  = r; setStr(ws1, r, 1, 'Coef. temp. Pmax (%/°C)'); setNum(ws1, r, 2, coefTemp); setStr(ws1, r, 3, 'Negativo. Ex: -0.34 monocristalino'); r++;
  const ROW_NOCT  = r; setStr(ws1, r, 1, 'NOCT (°C)'); setNum(ws1, r, 2, noct); r++;
  const ROW_TAMB  = r; setStr(ws1, r, 1, 'Temperatura ambiente (°C)'); setNum(ws1, r, 2, tamb); r++;
  const ROW_SOMB  = r; setStr(ws1, r, 1, 'Perda sombreamento (%)'); setNum(ws1, r, 2, somb/100, F_PCT); r++;
  const ROW_SUJ   = r; setStr(ws1, r, 1, 'Perda sujidade (%)'); setNum(ws1, r, 2, suj/100, F_PCT); r++;
  const ROW_BIF   = r; setStr(ws1, r, 1, 'Ganho bifacial (%) — 0 se mono'); setNum(ws1, r, 2, ganhoBI/100, F_PCT); r+=2;

  // Precificação
  setStr(ws1, r, 1, '6. PRECIFICAÇÃO'); r++;
  const ROW_ESTRU = r; setStr(ws1, r, 1, 'Custo estrutura (R$)');           setNum(ws1, r, 2, estrutura, F_BRL); r++;
  const ROW_MATEL = r; setStr(ws1, r, 1, 'Custo mat. elétricos (R$)');      setNum(ws1, r, 2, matEl, F_BRL); r++;
  const ROW_MAOBR = r; setStr(ws1, r, 1, 'Custo mão de obra (R$)');         setNum(ws1, r, 2, maoObra, F_BRL); r++;
  const ROW_PROJ  = r; setStr(ws1, r, 1, 'Custo projeto / ART (R$)');        setNum(ws1, r, 2, projART, F_BRL); r++;
  const ROW_OUTR  = r; setStr(ws1, r, 1, 'Outros custos (R$)');             setNum(ws1, r, 2, outros, F_BRL); r++;
  const ROW_IMP   = r; setStr(ws1, r, 1, 'Alíquota de impostos');           setNum(ws1, r, 2, aliqImp, F_PCT); r++;
  const ROW_MARG  = r; setStr(ws1, r, 1, 'Margem de lucro desejada');        setNum(ws1, r, 2, margem, F_PCT); r+=2;

  // Financeiro
  setStr(ws1, r, 1, '7. ANÁLISE FINANCEIRA'); r++;
  const ROW_DEG   = r; setStr(ws1, r, 1, 'Degradação anual dos módulos');   setNum(ws1, r, 2, degradacao, F_PCT); r++;
  const ROW_REA   = r; setStr(ws1, r, 1, 'Reajuste tarifário anual');        setNum(ws1, r, 2, reajuste, F_PCT); r++;
  const ROW_TMA   = r; setStr(ws1, r, 1, 'TMA — taxa mínima de atrativ.');   setNum(ws1, r, 2, tma, F_PCT); r++;
  const ROW_ANOB  = r; setStr(ws1, r, 1, 'Ano base');                        setNum(ws1, r, 2, anoBase, F_INT); r++;
  const ROW_SOLF48= r; setStr(ws1, r, 1, 'Taxa Solfácil 48× (%/mês)');      setNum(ws1, r, 2, taxaSolf48, F_PCT); r++;
  const ROW_SOLF60= r; setStr(ws1, r, 1, 'Taxa Solfácil 60× (%/mês)');      setNum(ws1, r, 2, taxaSolf60, F_PCT); r++;

  updateRef(ws1, r, 3);
  XLSX.utils.book_append_sheet(wb, ws1, 'Entradas');

  // Aliases para referências
  const E = (row: number) => `Entradas!B${row}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 2 — PERDAS
  // ═══════════════════════════════════════════════════════════════════════════
  const ws2: WS = {};
  setCols(ws2, [40, 18, 30]);
  r = 1;

  setStr(ws2, r, 1, 'CÁLCULO DE PERDAS — IEC 61724-1'); r+=2;

  setStr(ws2, r, 1, 'TEMPERATURA DE CÉLULA  Tcell = Tamb + (NOCT-20)×0.8'); r++;
  const P_TAMB = r; setStr(ws2, r, 1, 'Temperatura ambiente (°C)'); setFrm(ws2, r, 2, `=${E(ROW_TAMB)}`); setStr(ws2, r, 3, `Entradas!B${ROW_TAMB}`); r++;
  const P_NOCT = r; setStr(ws2, r, 1, 'NOCT (°C)'); setFrm(ws2, r, 2, `=${E(ROW_NOCT)}`); r++;
  const P_TCELL= r; setStr(ws2, r, 1, 'Tcell = Tamb + (NOCT-20)×0.8'); setFrm(ws2, r, 2, `=B${P_TAMB}+(B${P_NOCT}-20)*0.8`, 'General', tamb+(noct-20)*0.8); setStr(ws2, r, 3, 'IEC 61724-1 — irrad. ref. 800 W/m²'); r++;
  const P_DT   = r; setStr(ws2, r, 1, 'ΔT = Tcell - 25°C (STC)'); setFrm(ws2, r, 2, `=B${P_TCELL}-25`); r+=2;

  setStr(ws2, r, 1, 'COMPONENTES DE PERDA  [composição encadeada]'); r++;
  const P_COEF = r; setStr(ws2, r, 1, 'Coef. temp. Pmax (%/°C)'); setFrm(ws2, r, 2, `=${E(ROW_COEF)}`, F_PCT); r++;
  const P_PTMP = r; setStr(ws2, r, 1, '1. Perda de temperatura'); setFrm(ws2, r, 2, `=MAX(0,ABS(B${P_COEF})/100*B${P_DT})`, F_PCT); setStr(ws2, r, 3, 'MAX(0, |coef| × ΔT / 100)'); r++;
  const P_INV  = r; setStr(ws2, r, 1, '2. Perda do inversor'); setFrm(ws2, r, 2, `=1-${E(ROW_EFIC)}/100`, F_PCT); setStr(ws2, r, 3, '1 − eficiência'); r++;
  const P_SOMB = r; setStr(ws2, r, 1, '3. Perda por sombreamento'); setFrm(ws2, r, 2, `=${E(ROW_SOMB)}`, F_PCT); r++;
  const P_SUJ  = r; setStr(ws2, r, 1, '4. Perda por sujidade'); setFrm(ws2, r, 2, `=${E(ROW_SUJ)}`, F_PCT); r++;
  const P_CAB  = r; setStr(ws2, r, 1, '5. Perda por cabeamento'); setNum(ws2, r, 2, 0.02, F_PCT); setStr(ws2, r, 3, 'Fixo 2% — IEC 61724-1 §A.2'); r++;
  const P_BIF  = r; setStr(ws2, r, 1, '6. Ganho bifacial (+)'); setFrm(ws2, r, 2, `=${E(ROW_BIF)}`, F_PCT); setStr(ws2, r, 3, 'Positivo — reduz perdas'); r+=2;

  setStr(ws2, r, 1, 'FATOR DE EFICIÊNCIA  [encadeado = mais preciso que aditivo]'); r++;
  const P_FAT  = r; setStr(ws2, r, 1, 'Fator = (1-inv)(1-temp)(1-somb)(1-suj)(1-cab)(1+bif)');
  setFrm(ws2, r, 2, `=(1-B${P_INV})*(1-B${P_PTMP})*(1-B${P_SOMB})*(1-B${P_SUJ})*(1-B${P_CAB})*(1+B${P_BIF})`); r++;
  const P_PERDA= r; setStr(ws2, r, 1, 'PERDA TOTAL LÍQUIDA');
  setFrm(ws2, r, 2, `=MAX(0,1-B${P_FAT})`, F_PCT); setStr(ws2, r, 3, 'Clampada em 0 — bifacial não pode virar ganho negativo'); r+=2;

  setStr(ws2, r, 1, 'VOC MÁXIMO CORRIGIDO POR TEMPERATURA — NBR 16690 5.3.3'); r++;
  const P_TMIN = r; setStr(ws2, r, 1, 'Temperatura mínima local (°C)'); setNum(ws2, r, 2, 5); setStr(ws2, r, 3, 'Conservador para MG/GO: 5°C no inverno'); r++;
  const P_CVOC = r; setStr(ws2, r, 1, 'Coef. temp. Voc (%/°C)'); setNum(ws2, r, 2, -0.29); setStr(ws2, r, 3, 'Verificar datasheet — típico: -0.27 a -0.29'); r++;
  const P_VOC  = r; setStr(ws2, r, 1, 'Voc do módulo (V)'); setFrm(ws2, r, 2, `=${E(ROW_VOC)}`); r++;
  const P_MSTR = r; setStr(ws2, r, 1, 'Módulos por string'); setFrm(ws2, r, 2, `=${E(ROW_MSTR)}`); r++;
  const P_VOCM = r; setStr(ws2, r, 1, 'Voc_max módulo = Voc×[1+coef/100×(Tmin-25)]');
  setFrm(ws2, r, 2, `=B${P_VOC}*(1+B${P_CVOC}/100*(B${P_TMIN}-25))`); setStr(ws2, r, 3, 'Voc SOBE no frio (coef neg × ΔT neg = positivo)'); r++;
  const P_VSYS = r; setStr(ws2, r, 1, 'Voc máx. sistema (V) — deve ser < 1000V');
  setFrm(ws2, r, 2, `=B${P_VOCM}*B${P_MSTR}`); r++;
  setStr(ws2, r, 1, 'VERIFICAÇÃO tensão máxima');
  setFrm(ws2, r, 2, `=IF(B${P_VSYS}>1000,"ACIMA DE 1000V — REVER STRING","OK — dentro do limite")`); setStr(ws2, r, 3, 'NBR 16690: limite residencial = 1000 Vdc'); r++;

  updateRef(ws2, r, 3);
  XLSX.utils.book_append_sheet(wb, ws2, 'Perdas');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 3 — DIMENSIONAMENTO
  // ═══════════════════════════════════════════════════════════════════════════
  const ws3: WS = {};
  setCols(ws3, [40, 18, 30]);
  r = 1;
  setStr(ws3, r, 1, 'DIMENSIONAMENTO DO SISTEMA — IEC 61724-1'); r+=2;

  setStr(ws3, r, 1, 'DADOS DE ENTRADA'); r++;
  const D_CONS = r; setStr(ws3, r, 1, 'Consumo médio mensal (kWh/mês)'); setFrm(ws3, r, 2, `=Entradas!B${ROW_MEDIA}`, F_KWH, mediaConsumo); r++;
  const D_HSP  = r; setStr(ws3, r, 1, 'HSP local (h/dia)'); setFrm(ws3, r, 2, `=${E(ROW_HSP)}`); r++;
  const D_DIAS = r; setStr(ws3, r, 1, 'Dias por mês'); setFrm(ws3, r, 2, `=${E(ROW_DIAS)}`); r++;
  const D_PERD = r; setStr(ws3, r, 1, 'Perda total líquida'); setFrm(ws3, r, 2, `=Perdas!B${P_PERDA}`, F_PCT); r++;
  const D_PERC = r; setStr(ws3, r, 1, 'Percentual de compensação'); setFrm(ws3, r, 2, `=${E(ROW_PERC)}`, F_PCT); r+=2;

  setStr(ws3, r, 1, 'POTÊNCIA NECESSÁRIA  [kWp = consumo / (HSP × 30.4167 × (1−perdas))]'); r++;
  const D_ALVO = r; setStr(ws3, r, 1, 'Consumo alvo (kWh/mês)'); setFrm(ws3, r, 2, `=B${D_CONS}*B${D_PERC}`, F_KWH); setStr(ws3, r, 3, 'consumo × percentual desejado'); r++;
  const D_EFIC = r; setStr(ws3, r, 1, 'Eficiência do sistema'); setFrm(ws3, r, 2, `=1-B${D_PERD}`, F_PCT); r++;
  const D_KWPM = r; setStr(ws3, r, 1, 'kWp MÍNIMO necessário');
  setFrm(ws3, r, 2, `=B${D_ALVO}/(B${D_HSP}*B${D_DIAS}*B${D_EFIC})`, F_KWP); setStr(ws3, r, 3, 'Fórmula: consumo_alvo / (HSP × DIAS × efic)'); r+=2;

  setStr(ws3, r, 1, 'CONFIGURAÇÃO REAL DO KIT'); r++;
  const D_WPKU = r; setStr(ws3, r, 1, 'Potência do módulo (kWp)'); setFrm(ws3, r, 2, `=${E(ROW_WP)}/1000`, F_KWP); r++;
  const D_QTDU = r; setStr(ws3, r, 1, 'Quantidade de módulos'); setFrm(ws3, r, 2, `=${E(ROW_QTD)}`, F_INT); r++;
  const D_KWPR = r; setStr(ws3, r, 1, 'kWp instalado (real)'); setFrm(ws3, r, 2, `=B${D_WPKU}*B${D_QTDU}`, F_KWP); setStr(ws3, r, 3, 'Módulos × potência/módulo'); r++;
  setStr(ws3, r, 1, 'ADEQUAÇÃO — instalado vs mínimo');
  setFrm(ws3, r, 2, `=IF(B${D_KWPR}>=B${D_KWPM},"OK — cobre o consumo","INSUFICIENTE")`); r+=2;

  setStr(ws3, r, 1, 'GERAÇÃO ESTIMADA'); r++;
  const D_GERM = r; setStr(ws3, r, 1, 'Geração mensal estimada (kWh/mês)');
  setFrm(ws3, r, 2, `=B${D_KWPR}*B${D_HSP}*B${D_DIAS}*B${D_EFIC}`, F_KWH); setStr(ws3, r, 3, 'kWp_real × HSP × DIAS × eficiência'); r++;
  const D_GERA = r; setStr(ws3, r, 1, 'Geração anual estimada (kWh/ano)'); setFrm(ws3, r, 2, `=B${D_GERM}*12`, F_KWH); r++;
  setStr(ws3, r, 1, 'Percentual de compensação real'); setFrm(ws3, r, 2, `=B${D_GERM}/B${D_CONS}`, F_PCT); r++;
  setStr(ws3, r, 1, 'Energia injetada (excedente kWh/mês)'); setFrm(ws3, r, 2, `=MAX(0,B${D_GERM}-B${D_CONS})`, F_KWH); r++;

  updateRef(ws3, r, 3);
  XLSX.utils.book_append_sheet(wb, ws3, 'Dimensionamento');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 4 — FIOB E ECONOMIA
  // ═══════════════════════════════════════════════════════════════════════════
  const ws4: WS = {};
  setCols(ws4, [40, 18, 28]);
  r = 1;
  setStr(ws4, r, 1, 'FIO B E CUSTOS RECORRENTES — Lei 14.300/2022'); r+=2;

  const FE_TAR  = r; setStr(ws4, r, 1, 'Tarifa (R$/kWh)'); setFrm(ws4, r, 2, `=${E(ROW_MEDIA+3)}` /* tarifa row */, F_BRL); r++;
  // Corrija referência: buscar a linha certa da tarifa
  // Reseta com valor direto
  ws4[`B${FE_TAR}`] = { t:'n', f:`=Entradas!B${ROW_MEDIA+3}`, v:tarifa, z:F_BRL };
  const FE_CIP  = r; setStr(ws4, r, 1, 'CIP/COSIP (R$/mês)'); setFrm(ws4, r, 2, `=Entradas!B${ROW_MEDIA+4}`, F_BRL); r++;
  ws4[`B${FE_CIP}`] = { t:'n', f:`=Entradas!B${ROW_MEDIA+4}`, v:cip, z:F_BRL };
  const FE_KWMIN= r; setStr(ws4, r, 1, 'kWh disponibilidade mínima'); setFrm(ws4, r, 2, `=Entradas!B${ROW_MEDIA+2}`, F_INT); r++;

  // Usar referências absolutas corretas
  ws4[`B${FE_TAR}`] = { t:'n', v:tarifa, z:F_BRL };   // valor direto
  ws4[`B${FE_CIP}`] = { t:'n', v:cip, z:F_BRL };
  ws4[`B${FE_KWMIN}`]= { t:'n', v:kwhMin, z:F_INT };

  const FE_CONS = r; setStr(ws4, r, 1, 'Consumo médio (kWh/mês)'); setFrm(ws4, r, 2, `=Dimensionamento!B${D_CONS}`, F_KWH); r++;
  const FE_GER  = r; setStr(ws4, r, 1, 'Geração mensal (kWh/mês)'); setFrm(ws4, r, 2, `=Dimensionamento!B${D_GERM}`, F_KWH); r++;
  const FE_COMP = r; setStr(ws4, r, 1, 'Energia compensada (kWh)'); setFrm(ws4, r, 2, `=MIN(B${FE_CONS},B${FE_GER})`, F_KWH); setStr(ws4, r, 3, 'min(geração, consumo) — regra ANEEL'); r++;
  const FE_FRAC = r; setStr(ws4, r, 1, 'Fração tarifária FioB'); setNum(ws4, r, 2, 0.35, F_PCT); setStr(ws4, r, 3, '35% da tarifa — fixo em lei'); r++;
  const FE_ANOB = r; setStr(ws4, r, 1, 'Ano base'); setFrm(ws4, r, 2, `=${E(ROW_ANOB)}`, F_INT); r+=2;

  // FioB por ano — tabela Art.27
  setStr(ws4, r, 1, 'PERCENTUAL FIOB — Art. 27 Lei 14.300/2022'); r++;
  setStr(ws4, r, 1, 'Ano'); setStr(ws4, r, 2, '% FioB (Art.27)'); setStr(ws4, r, 3, '% FioB (Art.26 — prot. até 07/2023)'); r++;
  const FE_PTAB = r;
  const tabFioB = [[2023,0.15],[2024,0.30],[2025,0.45],[2026,0.60],[2027,0.75],[2028,0.90],[2029,1.00],[2030,1.00]];
  for (const [ano, pct] of tabFioB) {
    setNum(ws4, r, 1, ano, F_INT); setNum(ws4, r, 2, pct, F_PCT); setNum(ws4, r, 3, 0, F_PCT); r++;
  }

  r++;
  setStr(ws4, r, 1, 'Percentual FioB do ano base'); r++;
  const FE_PCT  = r;
  setFrm(ws4, r, 2,
    `=IF(B${FE_ANOB}<=2022,0,IF(B${FE_ANOB}=2023,0.15,IF(B${FE_ANOB}=2024,0.30,IF(B${FE_ANOB}=2025,0.45,IF(B${FE_ANOB}=2026,0.60,IF(B${FE_ANOB}=2027,0.75,IF(B${FE_ANOB}=2028,0.90,1.00)))))))`,
    F_PCT); r+=2;

  setStr(ws4, r, 1, 'CONTA DE ENERGIA — ANTES e APÓS O SOLAR'); r++;
  const FE_ANTS = r; setStr(ws4, r, 1, 'Conta ANTES do solar (R$/mês)');
  setFrm(ws4, r, 2, `=B${FE_CONS}*B${FE_TAR}+B${FE_CIP}`, F_BRL); setStr(ws4, r, 3, 'consumo × tarifa + CIP'); r++;
  const FE_DISP = r; setStr(ws4, r, 1, 'Taxa disponibilidade (R$/mês)');
  setFrm(ws4, r, 2, `=B${FE_KWMIN}*B${FE_TAR}`, F_BRL); setStr(ws4, r, 3, 'kWh_mín × tarifa'); r++;
  const FE_FIOB = r; setStr(ws4, r, 1, 'Custo FioB (R$/mês)');
  setFrm(ws4, r, 2, `=B${FE_COMP}*B${FE_TAR}*B${FE_FRAC}*B${FE_PCT}`, F_BRL); setStr(ws4, r, 3, 'energiaComp × tarifa × 35% × %FioB'); r++;
  const FE_TOTF = r; setStr(ws4, r, 1, 'Total fixo mensal (R$/mês)');
  setFrm(ws4, r, 2, `=B${FE_DISP}+B${FE_CIP}+B${FE_FIOB}`, F_BRL); r++;
  const FE_APOS = r; setStr(ws4, r, 1, 'Conta APÓS o solar (R$/mês)');
  setFrm(ws4, r, 2, `=MAX(B${FE_TOTF},B${FE_DISP}+B${FE_CIP})`, F_BRL); r++;
  const FE_ECO  = r; setStr(ws4, r, 1, 'ECONOMIA MENSAL (R$/mês)');
  setFrm(ws4, r, 2, `=B${FE_ANTS}-B${FE_APOS}`, F_BRL); r++;
  const FE_ECOA = r; setStr(ws4, r, 1, 'ECONOMIA ANUAL (R$/ano)');
  setFrm(ws4, r, 2, `=B${FE_ECO}*12`, F_BRL); r+=2;

  // Projeção 25 anos
  setStr(ws4, r, 1, 'PROJEÇÃO FIOB — Economia por ano (Art.27)'); r++;
  setStr(ws4, r, 1, 'Ano'); setStr(ws4, r, 2, '% FioB'); setStr(ws4, r, 3, 'Economia mensal (R$)'); r++;
  for (let i = 0; i < 25; i++) {
    const ano = anoBase + i;
    const pctFio = ano <= 2022 ? 0 : ano === 2023 ? 0.15 : ano === 2024 ? 0.30 : ano === 2025 ? 0.45 :
                   ano === 2026 ? 0.60 : ano === 2027 ? 0.75 : ano === 2028 ? 0.90 : 1.00;
    setNum(ws4, r, 1, ano, F_INT);
    setNum(ws4, r, 2, pctFio, F_PCT);
    setFrm(ws4, r, 3, `=B${FE_ANTS}-MAX(B${FE_DISP}+B${FE_CIP}+B${FE_COMP}*B${FE_TAR}*B${FE_FRAC}*${pctFio},B${FE_DISP}+B${FE_CIP})`, F_BRL);
    r++;
  }

  updateRef(ws4, r, 3);
  XLSX.utils.book_append_sheet(wb, ws4, 'FioB_Economia');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 5 — PRECIFICAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  const ws5: WS = {};
  setCols(ws5, [40, 18, 28]);
  r = 1;
  setStr(ws5, r, 1, 'PRECIFICAÇÃO — Preço = Custo / (1 − Impostos − Margem)'); r+=2;

  setStr(ws5, r, 1, 'COMPOSIÇÃO DE CUSTO'); r++;
  const PR_KIT  = r; setStr(ws5, r, 1, 'Custo do kit (R$)');            setFrm(ws5, r, 2, `=${E(ROW_CUSTO_KIT)}`, F_BRL); r++;
  const PR_EST  = r; setStr(ws5, r, 1, 'Custo estrutura (R$)');          setFrm(ws5, r, 2, `=${E(ROW_ESTRU)}`, F_BRL); r++;
  const PR_MAT  = r; setStr(ws5, r, 1, 'Custo mat. elétricos (R$)');     setFrm(ws5, r, 2, `=${E(ROW_MATEL)}`, F_BRL); r++;
  const PR_MOB  = r; setStr(ws5, r, 1, 'Custo mão de obra (R$)');        setFrm(ws5, r, 2, `=${E(ROW_MAOBR)}`, F_BRL); r++;
  const PR_ART  = r; setStr(ws5, r, 1, 'Custo projeto / ART (R$)');      setFrm(ws5, r, 2, `=${E(ROW_PROJ)}`, F_BRL); r++;
  const PR_OUT  = r; setStr(ws5, r, 1, 'Outros custos (R$)');            setFrm(ws5, r, 2, `=${E(ROW_OUTR)}`, F_BRL); r++;
  const PR_TOT  = r; setStr(ws5, r, 1, 'CUSTO TOTAL DIRETO (R$)');
  setFrm(ws5, r, 2, `=SUM(B${PR_KIT}:B${PR_OUT})`, F_BRL); r+=2;

  setStr(ws5, r, 1, 'FORMAÇÃO DO PREÇO'); r++;
  const PR_IMP  = r; setStr(ws5, r, 1, 'Alíquota de impostos'); setFrm(ws5, r, 2, `=${E(ROW_IMP)}`, F_PCT); r++;
  const PR_MARG = r; setStr(ws5, r, 1, 'Margem de lucro desejada'); setFrm(ws5, r, 2, `=${E(ROW_MARG)}`, F_PCT); r++;
  const PR_DIV  = r; setStr(ws5, r, 1, 'Divisor (1 − imp − margem)'); setFrm(ws5, r, 2, `=1-B${PR_IMP}-B${PR_MARG}`); r++;
  const PR_VER  = r; setStr(ws5, r, 1, 'VERIFICAÇÃO: divisor > 0');
  setFrm(ws5, r, 2, `=IF(B${PR_DIV}>0,"OK","IMPOSSIVEL — IMP+MARGEM >= 100%")`); r++;
  const PR_PREC = r; setStr(ws5, r, 1, 'PREÇO DE VENDA (R$)');
  setFrm(ws5, r, 2, `=IF(B${PR_DIV}>0,B${PR_TOT}/B${PR_DIV},0)`, F_BRL); setStr(ws5, r, 3, 'Preço = Custo / (1 − Impostos − Margem)'); r++;
  const PR_TIMPO= r; setStr(ws5, r, 1, 'Imposto sobre a venda (R$)'); setFrm(ws5, r, 2, `=B${PR_PREC}*B${PR_IMP}`, F_BRL); setStr(ws5, r, 3, 'Imposto = Preço × Alíquota'); r++;
  const PR_LUC  = r; setStr(ws5, r, 1, 'Lucro líquido (R$)'); setFrm(ws5, r, 2, `=B${PR_PREC}*B${PR_MARG}`, F_BRL); setStr(ws5, r, 3, 'Lucro = Preço × Margem'); r++;
  setStr(ws5, r, 1, 'Markup sobre o custo (%)'); setFrm(ws5, r, 2, `=(B${PR_PREC}-B${PR_TOT})/B${PR_TOT}`, F_PCT); setStr(ws5, r, 3, 'Markup > Margem — bases diferentes'); r+=2;

  setStr(ws5, r, 1, 'BALANÇO — custo + imposto + lucro = preço'); r++;
  setStr(ws5, r, 1, 'Custo + Imposto + Lucro'); setFrm(ws5, r, 2, `=B${PR_TOT}+B${PR_TIMPO}+B${PR_LUC}`, F_BRL); r++;
  setStr(ws5, r, 1, 'Diferença (deve ser zero)'); setFrm(ws5, r, 2, `=ABS(B${r-1}-B${PR_PREC})`, F_BRL); r++;
  setStr(ws5, r, 1, 'BALANÇO'); setFrm(ws5, r, 2, `=IF(B${r-1}<0.01,"OK","VERIFICAR")`); r++;

  updateRef(ws5, r, 3);
  XLSX.utils.book_append_sheet(wb, ws5, 'Precificacao');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 6 — TABELA PRICE
  // ═══════════════════════════════════════════════════════════════════════════
  const ws6: WS = {};
  setCols(ws6, [10, 16, 16, 16, 16, 18]);
  r = 1;
  setStr(ws6, r, 1, 'TABELA PRICE — PMT = PV × i × (1+i)^n / ((1+i)^n − 1)'); r+=2;

  setStr(ws6, r, 1, 'Valor financiado (R$)'); setFrm(ws6, r, 2, `=Precificacao!B${PR_PREC}`, F_BRL); r++;
  const PRC_TAX= r; setStr(ws6, r, 1, 'Taxa mensal (Solfácil 48×)'); setFrm(ws6, r, 2, `=${E(ROW_SOLF48)}`, F_PCT); r++;
  const PRC_N  = r; setStr(ws6, r, 1, 'Número de parcelas'); setNum(ws6, r, 2, 48, F_INT); r+=2;
  const PRC_PMT= r; setStr(ws6, r, 1, 'PARCELA MENSAL');
  setFrm(ws6, r, 2, `=-PMT(B${PRC_TAX},B${PRC_N},-B${r-4})`, F_BRL); r++;
  setStr(ws6, r, 1, 'Total pago'); setFrm(ws6, r, 2, `=B${PRC_PMT}*B${PRC_N}`, F_BRL); r++;
  setStr(ws6, r, 1, 'Juros totais'); setFrm(ws6, r, 2, `=B${r-1}-B${r-4}`, F_BRL); r+=2;

  for (let i = 1; i <= 6; i++) setStr(ws6, r, i, ['Parcela','Saldo Inicial','Juros','Amortização','Parcela Total','Saldo Final'][i-1]); r++;
  const PRC_T1 = r;
  for (let k = 1; k <= 48; k++) {
    const rr = PRC_T1 + k - 1;
    setNum(ws6, rr, 1, k, F_INT);
    ws6[`B${rr}`] = { t:'n', f: k===1 ? `=B${r-9}` : `=F${rr-1}`, v:0, z:F_BRL };
    ws6[`C${rr}`] = { t:'n', f:`=B${rr}*$B$${PRC_TAX}`, v:0, z:F_BRL };
    ws6[`D${rr}`] = { t:'n', f:`=$B$${PRC_PMT}-C${rr}`, v:0, z:F_BRL };
    ws6[`E${rr}`] = { t:'n', f:`=$B$${PRC_PMT}`, v:0, z:F_BRL };
    ws6[`F${rr}`] = { t:'n', f:`=MAX(0,B${rr}-D${rr})`, v:0, z:F_BRL };
  }

  updateRef(ws6, PRC_T1+48, 6);
  XLSX.utils.book_append_sheet(wb, ws6, 'Tabela_Price');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 7 — FLUXO DE CAIXA
  // ═══════════════════════════════════════════════════════════════════════════
  const ws7: WS = {};
  setCols(ws7, [8, 14, 16, 20, 18, 20]);
  r = 1;
  setStr(ws7, r, 1, 'FLUXO DE CAIXA — 25 anos — TIR | VPL | Payback'); r+=2;

  const FC_INV = r; setStr(ws7, r, 1, 'Investimento (R$)'); setFrm(ws7, r, 2, `=Precificacao!B${PR_PREC}`, F_BRL); r++;
  const FC_ECO = r; setStr(ws7, r, 1, 'Economia mensal Ano 1 (R$/mês)'); setFrm(ws7, r, 2, `=FioB_Economia!B${FE_ECO}`, F_BRL); r++;
  const FC_DEG = r; setStr(ws7, r, 1, 'Degradação anual'); setFrm(ws7, r, 2, `=${E(ROW_DEG)}`, F_PCT); r++;
  const FC_REA = r; setStr(ws7, r, 1, 'Reajuste tarifário anual'); setFrm(ws7, r, 2, `=${E(ROW_REA)}`, F_PCT); r++;
  const FC_TMA = r; setStr(ws7, r, 1, 'TMA'); setFrm(ws7, r, 2, `=${E(ROW_TMA)}`, F_PCT); r+=2;

  for (let i = 1; i <= 6; i++) setStr(ws7, r, i, ['Ano','Fator Degrad.','Fator Reajuste','Economia Anual (R$)','Fluxo (R$)','Fluxo Acum. (R$)'][i-1]); r++;
  const FC_T0 = r;
  setNum(ws7, r, 1, 0, F_INT);
  setNum(ws7, r, 2, 1); setNum(ws7, r, 3, 1); setNum(ws7, r, 4, 0, F_BRL);
  ws7[`E${r}`] = { t:'n', f:`=-B${FC_INV}`, v:0, z:F_BRL };
  ws7[`F${r}`] = { t:'n', f:`=E${r}`, v:0, z:F_BRL }; r++;

  for (let k = 1; k <= 25; k++) {
    const rr = FC_T0 + k;
    setNum(ws7, rr, 1, k, F_INT);
    ws7[`B${rr}`] = { t:'n', f:`=POWER(1-$B$${FC_DEG},${k-1})`, v:0, z:'0.000%' };
    ws7[`C${rr}`] = { t:'n', f:`=POWER(1+$B$${FC_REA},${k-1})`, v:0, z:'0.000%' };
    ws7[`D${rr}`] = { t:'n', f:`=$B$${FC_ECO}*12*B${rr}*C${rr}`, v:0, z:F_BRL };
    ws7[`E${rr}`] = { t:'n', f:`=D${rr}`, v:0, z:F_BRL };
    ws7[`F${rr}`] = { t:'n', f:`=F${rr-1}+E${rr}`, v:0, z:F_BRL };
  }

  r = FC_T0 + 27;
  setStr(ws7, r, 1, 'INDICADORES'); r++;
  setStr(ws7, r, 1, 'TIR (Taxa Interna de Retorno)');
  setFrm(ws7, r, 2, `=IRR(E${FC_T0}:E${FC_T0+25})`, F_PCT); r++;
  setStr(ws7, r, 1, 'VPL com TMA');
  setFrm(ws7, r, 2, `=NPV(B${FC_TMA},E${FC_T0+1}:E${FC_T0+25})+E${FC_T0}`, F_BRL); r++;
  setStr(ws7, r, 1, 'Economia total (25 anos)');
  setFrm(ws7, r, 2, `=SUM(E${FC_T0+1}:E${FC_T0+25})`, F_BRL); r++;
  setStr(ws7, r, 1, 'ROI (retorno sobre investimento)');
  setFrm(ws7, r, 2, `=(SUM(E${FC_T0+1}:E${FC_T0+25})-B${FC_INV})/B${FC_INV}`, F_PCT); r++;
  setStr(ws7, r, 1, 'Payback simples (anos)');
  setFrm(ws7, r, 2, `=IFERROR(MATCH(0,SIGN(F${FC_T0}:F${FC_T0+25}),0)-1,">25 anos")`); r++;

  updateRef(ws7, r, 6);
  XLSX.utils.book_append_sheet(wb, ws7, 'Fluxo_Caixa');

  // ── Download ─────────────────────────────────────────────────────────────
  const nomeCliente = (dados.cliente?.nome ?? 'Cliente').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
  const data = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Auditoria_${nomeCliente}_${data}.xlsx`);
}
