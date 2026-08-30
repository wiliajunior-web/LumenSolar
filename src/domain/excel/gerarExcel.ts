/**
 * Gerador de planilha de auditoria — LumenSolar
 * Usa SheetJS (xlsx) para criar um .xlsx com fórmulas vivas.
 * Cada cálculo feito no app é replicado como fórmula Excel referenciando
 * as células de entrada, permitindo segunda opinião e rastreabilidade.
 *
 * Estrutura:
 *   Aba 1 — Entradas           (inputs em azul)
 *   Aba 2 — Perdas             (fórmulas de engenharia FV padrão — Sandia/PVsyst/Duffie & Beckman;
 *                                ver comentário em calcularPerdas.ts)
 *   Aba 3 — Dimensionamento    (mesmas fórmulas de engenharia FV padrão)
 *   Aba 4 — FioB_Economia      (Lei 14.300/2022)
 *   Aba 5 — Precificacao       (Preço = Custo/(1-imp-marg))
 *   Aba 6 — Tabela_Price       (amortização completa)
 *   Aba 7 — Fluxo_Caixa       (TIR, VPL, Payback — 25 anos)
 *
 * CORRIGIDO (ago/2026): o cabeçalho citava "IEC 61724-1" para as abas Perdas/
 * Dimensionamento — mesma citação incorreta já removida de calcularPerdas.ts
 * numa rodada anterior desta auditoria (essa norma trata de monitoramento de
 * desempenho de sistemas FV em operação, não das fórmulas de perdas/
 * dimensionamento usadas aqui).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX: typeof import('xlsx') = require('xlsx');
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { HSP_MEDIO_POR_UF } from '@data/hspPorUF';
import { formatarNomeModulo } from '@domain/kit/formatarModulo';
import { formatarCrea } from '@domain/empresa/cadastroEmpresa';
import { normalizarNomeArquivo } from '@domain/shared/normalizarNomeArquivo';

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
// BUG CORRIGIDO (ago/2026, auditoria de design): todas as 86 chamadas a
// `setFrm()` neste arquivo passam a fórmula com "=" na frente (ex:
// `=AVERAGE(B16:B27)`), mas a propriedade `.f` de uma célula SheetJS é
// documentada como o TEXTO da fórmula SEM o sinal de igual — quem adiciona
// o "=" na hora de gravar é a própria lib. Isso fazia toda célula de
// fórmula da planilha "Auditoria" sair com "==" duplicado no XML
// (confirmado inspecionando o .xlsx gerado, descompactado: `<f>=AVERAGE
// (B16:B27)</f>` — o "=" de dentro do texto da fórmula É esse bug, o "="
// que aparece antes dele no XLSX vem da própria lib). Não é uma violação
// cosmética: viola a especificação OOXML (ECMA-376) para o elemento <f>.
// Testado com LibreOffice Calc real (não só o SheetJS que gerou o arquivo):
// abre e calcula sem erro (ERROR:0, valor correto), então o "==" não
// quebrava visivelmente nas ferramentas testadas — mas escrever XML fora da
// especificação é sempre um risco desnecessário (comportamento não
// garantido entre versões/aplicativos), e a correção é trivial: remove o
// "=" inicial antes de gravar, deixando `.f` no formato que a própria
// biblioteca espera.
function setFrm(ws: WS, r: number, c: number, f: string, fmt?: CellFmt, cached?: number) {
  const formula = f.startsWith('=') ? f.slice(1) : f;
  ws[ref(r,c)] = { t:'n', f: formula, v: cached ?? 0, z: fmt ?? 'General' };
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
          dimensionamento, custosRecorrentes, precificacao, indicadores,
          resultadoGrupoA, enquadramento, percentuaisFioBPorAno } = dados;

  const wb: WB = XLSX.utils.book_new();

  // BUG CORRIGIDO: a aba "Resumo" (ws0, construída primeiro) referenciava
  // FC_T0 — a linha inicial dos dados na aba "Fluxo_Caixa" (ws7) — antes de
  // FC_T0 ser calculado, mais abaixo, quando ws7 é montada. Isso é
  // `const FC_T0` usada antes de declarada: ReferenceError garantido em
  // toda execução de gerarExcelAuditoria (ou seja, toda exportação de
  // Excel quebrava). FC_T0 depende só de incrementos fixos de linha
  // (não de dados variáveis) — por isso pode ser calculado aqui como uma
  // constante estável, replicando exatamente a sequência da aba
  // Fluxo_Caixa: título(+2) → FC_INV,FC_ECO,FC_DEG,FC_REA(+1 cada) →
  // FC_TMA(+2) → linha de cabeçalho(+1) = 1+2+1+1+1+1+2+1 = 10.
  const FC_T0 = 10;

  // Extrair valores para preencher as células de entrada
  const contas: number[] = (consumo?.contas ?? []).slice(0, 12).map((c:any) => c.kWh || 0);
  while (contas.length < 12) contas.push(0);
  const mediaConsumo = contas.filter(k=>k>0).reduce((a:number,b:number)=>a+b,0) / Math.max(contas.filter((k:number)=>k>0).length, 1);
  // BUG CORRIGIDO (ago/2026): `?? 1.18272801` só cai no fallback quando o
  // valor é null/undefined — mas o default real do campo é `0` (número,
  // não undefined; ver consumoPadrao() em useProjetoStore.ts), então
  // sempre que o usuário deixava a tarifa em branco (bem comum — é um
  // campo opcional), o Excel usava tarifa=0, zerando toda a planilha
  // (Entradas, FioB_Economia, Fluxo_Caixa, VPL, TIR, Payback). O fallback
  // fixo também assumia CEMIG (1.18272801 ≈ DISTRIBUIDORAS.CEMIG.
  // tarifaKWhComICMS=1.1827) mesmo para outra distribuidora. Corrigido para
  // o mesmo padrão já usado pelo app real (useProjetoStore.ts ~L459):
  // usa a tarifa real se > 0, senão a tarifa de referência da
  // distribuidora selecionada pelo cliente (ou CEMIG, se nenhuma bater).
  const distribuidoraExcel = DISTRIBUIDORAS.find((d: any) => d.codigo === consumo?.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
  const tarifa   = (consumo?.tarifaRealKWhComICMS ?? 0) > 0
    ? consumo.tarifaRealKWhComICMS
    : distribuidoraExcel.tarifaKWhComICMS;
  const cip      = consumo?.cipMensalRS             ?? 0;
  const kwhMin   = consumo?.tipoLigacao === 'monofasica' ? 30 : consumo?.tipoLigacao === 'trifasica' ? 100 : 50;

  // BUG CORRIGIDO (ago/2026): HSP fixo em 5.4 (valor de MG), ignorando
  // cliente.uf (disponível no escopo desta função) — o app real usa
  // HSP_MEDIO_POR_UF[cliente.uf] (useProjetoStore.ts, via hspPorUF()). Para
  // qualquer cliente fora de MG a geração/dimensionamento estimados nesta
  // planilha divergiam do valor real do app (ex.: AM=4.4 vs 5.4 usado
  // aqui — ~23% de diferença).
  const hsp       = (cliente?.uf && HSP_MEDIO_POR_UF[String(cliente.uf).toUpperCase()]) || 5.4; // fallback MG (mercado primário) se UF ausente/desconhecida
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

  const degradacao = 0.005; // não é campo editável em DadosEmpresa — mesma constante DEGRADACAO_ANUAL usada em useProjetoStore.ts
  // BUG CORRIGIDO (ago/2026): os 4 valores abaixo eram fixos, ignorando os
  // campos reais e editáveis de `empresa` (aba Empresa da UI) — mesmo
  // `empresa` já estando disponível no escopo desta função. O próprio
  // fallback de `reajuste` (0.07) nem batia com o default real
  // (empresa.reajusteTarifarioAnual=0.06, ver @data/empresa.ts) — ou seja,
  // mesmo o caso "sem nenhuma configuração customizada" já saía errado.
  const reajuste   = empresa?.reajusteTarifarioAnual      ?? 0.06;
  const tma        = empresa?.taxaMinimaAtratividadeAnual ?? 0.08;
  const taxaSolf48 = empresa?.taxaSolfacil48Mensal        ?? 0.0199;
  const taxaSolf60 = empresa?.taxaSolfacil60Mensal        ?? 0.0199;
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
  const ROW_KWMIN = r; setStr(ws1, r, 1, 'kWh mínimo disponib.');    setNum(ws1, r, 2, kwhMin, F_INT);
  setStr(ws1, r, 3, '30 monofásica / 50 bifásica / 100 trifásica'); r++;
  const ROW_TARIFA = r; setStr(ws1, r, 1, 'Tarifa real (R$/kWh)');    setNum(ws1, r, 2, tarifa, F_BRL);
  setStr(ws1, r, 3, "Campo 'Preço Unit.' da conta CEMIG"); r++;
  const ROW_CIP = r; setStr(ws1, r, 1, 'CIP / Ilum. pública (R$/mês)'); setNum(ws1, r, 2, cip, F_BRL); r++;

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
  // BUG CORRIGIDO (ago/2026): a nota estática "MG=5.4 | SP=5.2 | BA=5.8"
  // nem batia com a própria tabela de referência do app (HSP_MEDIO_POR_UF:
  // SP=5.0, BA=5.6, não 5.2/5.8) — trocada por uma nota que reflete a UF
  // real do cliente usada no cálculo (ver `hsp` acima).
  const ROW_HSP  = r; setStr(ws1, r, 1, 'HSP local (h/dia)'); setNum(ws1, r, 2, hsp); setStr(ws1, r, 3, `Referência p/ UF do cliente (${cliente?.uf ?? 'MG'}) — @data/hspPorUF.ts`); r++;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 0 — RESUMO VISUAL (primeira aba — para o cliente)
  // Design 60-30-10: #0F1117 (fundo) / #1A1D2B (cards) / #C9A227 (ouro)
  // ═══════════════════════════════════════════════════════════════════════════
  const ws0: WS = {};
  setCols(ws0, [1, 2, 32, 18, 18, 18, 2]);

  // Helpers de estilo inline (SheetJS usa propriedade 's' para estilos — mas no
  // SheetJS CE os estilos são ignorados. Usamos cabeçalhos texto bem estruturados.)
  // A aba funciona como "executive summary" — dados reais do projeto.

  const ecoMes   = custosRecorrentes?.economiaMensalRS    ?? 0;
  const ecoAno   = ecoMes * 12;
  const precoVnd  = precificacao?.precoVenda               ?? 0;
  // BUG CORRIGIDO (ago/2026): os nomes de campo usados aqui (`paybackSimplesAnos`
  // direto na raiz de `indicadores`, e `indicadores.tir`) nunca existiram no objeto
  // real (ver IndicadoresFinanceiros em useProjetoStore.ts: os campos reais são
  // `paybackSimplesAnos` — agora adicionado à interface — e `tirAnualPercent`, já em
  // formato percentual). O `?? 0` mascarava o erro fazendo a aba "Resumo" (primeira
  // aba, voltada ao cliente) sempre exibir Payback 0,00 anos e TIR 0,00%.
  const pbAnos    = indicadores?.paybackSimplesAnos        ?? null;
  const tirVal    = indicadores?.tirAnualPercent            ?? 0;
  const kwpReal   = dimensionamento?.potenciaInstaladaRealKWp ?? 0;
  const gerMens   = dimensionamento?.geracaoMensalEstimadaKWh ?? 0;
  const contaAntes = custosRecorrentes?.contaAntesRS       ?? 0;
  const contaApos  = custosRecorrentes?.contaAposRS        ?? 0;
  // BUG CORRIGIDO (ago/2026): `dimensionamento?.areaNecessariaM2` não existe em
  // ResultadoDimensionamento (sempre undefined) — o valor real vem de
  // `indicadores.areaNecessariaM2` (areaTotalNecessariaM2, já usado em
  // MemorialDescritivo.tsx). O fallback grosseiro `kwpReal*4.4` só entra se nem
  // isso estiver disponível.
  const areaNec    = (indicadores?.areaNecessariaM2 ?? (kwpReal * 4.4));
  const hoje = new Date();
  const dataFmt = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
  const pctFioB26 = 0.60;
  const pctFioB29 = 1.00;

  let r0 = 1;

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  setStr(ws0, r0, 2, 'LUMEN SOLUÇÕES — PROPOSTA FOTOVOLTAICA'); r0++;
  setStr(ws0, r0, 2, dados.cliente?.nome ?? ''); r0++;
  setStr(ws0, r0, 2, `${dados.cliente?.cidade ?? ''} / ${dados.cliente?.uf ?? 'MG'}`);
  setStr(ws0, r0, 5, `Data: ${dataFmt}`); r0+=2;

  // ── Aviso Grupo A ─────────────────────────────────────────────────────────
  // ADICIONADO ago/2026: os KPIs abaixo ("RESUMO DO PROJETO"/"IMPACTO NA
  // CONTA DE ENERGIA") são sempre calculados como Grupo B (tarifa única,
  // sem demanda contratada) — nunca alertavam quando o cliente era Grupo A,
  // deixando a aba "Resumo" (primeira aba, voltada ao cliente) silenciosamente
  // errada para esse caso. Não remapeamos os KPIs porque os dois modelos têm
  // campos com semântica diferente (ver README, Auditoria ago/2026); em vez
  // disso, este bloco torna o erro visível e mostra os números certos.
  if (consumo?.grupoTensao === 'A' && resultadoGrupoA) {
    const rga = resultadoGrupoA;
    setStr(ws0, r0, 2, '⚠ CLIENTE GRUPO A (MÉDIA TENSÃO) — VERIFIQUE ANTES DE ENVIAR'); r0++;
    setStr(ws0, r0, 2, 'Os KPIs abaixo (Resumo do Projeto / Impacto na Conta) foram calculados como');
    r0++;
    setStr(ws0, r0, 2, 'Grupo B (tarifa única). Use os valores Grupo A corretos abaixo em seu lugar:');
    r0++;
    setStr(ws0, r0, 2, 'Potência recomendada (Grupo A)'); setNum(ws0, r0, 3, rga.potenciaRealKWp, F_KWP); r0++;
    setStr(ws0, r0, 2, 'Número de módulos (Grupo A)'); setNum(ws0, r0, 3, rga.numeroModulos, F_INT); r0++;
    setStr(ws0, r0, 2, 'Conta ANTES (Grupo A)'); setNum(ws0, r0, 3, rga.contaAntesRS, F_BRL); r0++;
    setStr(ws0, r0, 2, 'Conta DEPOIS (Grupo A)'); setNum(ws0, r0, 3, rga.contaAposRS, F_BRL); r0++;
    setStr(ws0, r0, 2, 'Economia mensal (Grupo A)'); setNum(ws0, r0, 3, rga.economiaMensalRS, F_BRL); r0++;
    setStr(ws0, r0, 2, 'Economia anual (Grupo A)'); setNum(ws0, r0, 3, rga.economiaAnualRS, F_BRL); r0++;
    if (rga.houveUltrapassagemDemanda) {
      setStr(ws0, r0, 2, '⚠ Há ultrapassagem de demanda — fórmula não confirmada contra REN 1.000/2021');
      r0++;
    }
    r0++;
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  setStr(ws0, r0, 2, '▌ RESUMO DO PROJETO'); r0++;
  setStr(ws0, r0, 2, 'Sistema instalado (kWp)');  setNum(ws0, r0, 3, kwpReal,   F_KWP); r0++;
  setStr(ws0, r0, 2, 'Geração mensal estimada');   setNum(ws0, r0, 3, gerMens,   F_KWH);
  setStr(ws0, r0, 4, 'kWh/mês'); r0++;
  setStr(ws0, r0, 2, 'Área necessária (m²)');      setNum(ws0, r0, 3, areaNec,   '#,##0.0'); r0++;
  setStr(ws0, r0, 2, 'Módulos');  setNum(ws0, r0, 3, kit?.quantidade ?? 0, F_INT);
  setStr(ws0, r0, 4, (kit?.potenciaModuloWp ?? 0) + ' Wp cada'); r0++;
  setStr(ws0, r0, 2, 'Modelo módulo');  setStr(ws0, r0, 3, formatarNomeModulo(kit?.marcaModulo, kit?.modeloModulo)); r0++;
  setStr(ws0, r0, 2, 'Inversor');       setStr(ws0, r0, 3, `${kit?.marcaInversor ?? ''} ${kit?.modeloInversor ?? ''}`); r0+=2;

  // ── Conta de energia ──────────────────────────────────────────────────────
  setStr(ws0, r0, 2, '▌ IMPACTO NA CONTA DE ENERGIA'); r0++;
  setStr(ws0, r0, 2, 'Consumo médio mensal');   setNum(ws0, r0, 3, mediaConsumo, F_KWH);
  setStr(ws0, r0, 4, 'kWh/mês'); r0++;
  setStr(ws0, r0, 2, 'Conta ANTES do solar');   setNum(ws0, r0, 3, contaAntes,  F_BRL);
  setStr(ws0, r0, 4, 'R$/mês'); r0++;
  setStr(ws0, r0, 2, 'Conta APÓS o solar (2026)'); setNum(ws0, r0, 3, contaApos, F_BRL);
  setStr(ws0, r0, 4, 'R$/mês'); r0++;
  setStr(ws0, r0, 2, '★ Economia mensal 2026');  setNum(ws0, r0, 3, ecoMes,     F_BRL);
  setStr(ws0, r0, 4, 'R$/mês'); r0++;
  setStr(ws0, r0, 2, 'Economia anual 2026');      setNum(ws0, r0, 3, ecoAno,     F_BRL);
  setStr(ws0, r0, 4, 'R$/ano'); r0+=2;

  // ── FioB projeção ─────────────────────────────────────────────────────────
  // BUG CORRIGIDO (ago/2026): esta tabela ignorava por completo o enquadramento
  // real do cliente (`enquadramento`/`percentuaisFioBPorAno`, calculados por
  // classificarEnquadramento()/percentualFioBPorAno() em calculoFioB.ts, já
  // usados no resto do app) — nem `enquadramento` nem `percentuaisFioBPorAno`
  // eram sequer passados a esta função pelo chamador (App.tsx `gerarExcel()`).
  // Sempre assumia o escalonamento do Art. 27 a partir de 60% em 2026, mesmo
  // para um cliente elegível à regra de transição do Art. 26 (isento até
  // 2045) — nesse caso a aba "Resumo" (primeira aba, voltada ao cliente)
  // mostraria uma tabela de custo crescente de Fio B totalmente fictícia.
  // Também usava fracTUSD=0.35 fixo em vez de empresa.fracaoTarifaFioB
  // (configurável) — mesmo bug já corrigido em App.tsx/TabResultado e em
  // PropostaPDF.tsx nesta mesma auditoria.
  const tarifaLocal = tarifa;
  const kwhDispLocal = kwhMin;
  const fracTUSD = empresa?.fracaoTarifaFioB ?? 0.35;
  const compLocal = Math.min(gerMens, mediaConsumo);
  const contaBaseSemEco = mediaConsumo * tarifaLocal + cip;

  if (enquadramento?.elegivelArt26) {
    setStr(ws0, r0, 2, '▌ FIO-B — LEI 14.300/2022 (Art. 26 — regra de transição)'); r0++;
    setStr(ws0, r0, 2, 'Sistema enquadrado na regra de transição do art. 26: Fio B isento sobre a');
    r0++;
    setStr(ws0, r0, 2, 'energia compensada até 31/12/2045. Sem escalonamento de custo a projetar.');
    r0++;
  } else {
    setStr(ws0, r0, 2, '▌ PROJEÇÃO FIO-B — LEI 14.300/2022 (Art. 27)'); r0++;
    setStr(ws0, r0, 2, 'Ano'); setStr(ws0, r0, 3, 'FioB (%)');
    setStr(ws0, r0, 4, 'Economia/mês'); setStr(ws0, r0, 5, 'Obs.'); r0++;

    // Percentuais reais do enquadramento do cliente quando disponíveis
    // (percentuaisFioBPorAno, calculado em calcularTudo()); os valores do
    // escalonamento-padrão da lei ficam como fallback só se não vierem.
    const anoAtualLocal = new Date().getFullYear();
    const anosProjecao = [anoAtualLocal, anoAtualLocal+1, anoAtualLocal+2, anoAtualLocal+3, 2029]
      .filter((v,i,a) => a.indexOf(v)===i && v<=2035)
      .sort((a,b)=>a-b);
    const fallbackPct: Record<number,number> = { 2025:0.15, 2026:0.60, 2027:0.75, 2028:0.90, 2029:1.00 };

    for (const ano of anosProjecao) {
      const pctFioB = percentuaisFioBPorAno?.[ano] ?? fallbackPct[ano] ?? 1.00;
      const fiob = compLocal * tarifaLocal * fracTUSD * pctFioB;
      const contaAposAno = kwhDispLocal * tarifaLocal + cip + fiob;
      const ecoAno2 = contaBaseSemEco - contaAposAno;
      setNum(ws0, r0, 2, ano,     F_INT);
      setNum(ws0, r0, 3, pctFioB, F_PCT);
      setNum(ws0, r0, 4, ecoAno2, F_BRL);
      setStr(ws0, r0, 5, pctFioB >= 1.00 ? 'Regra plena (Art.27)' : '');
      r0++;
    }
  }
  r0++;

  // ── Análise Financeira ────────────────────────────────────────────────────
  setStr(ws0, r0, 2, '▌ ANÁLISE FINANCEIRA'); r0++;
  setStr(ws0, r0, 2, 'Investimento total');         setNum(ws0, r0, 3, precoVnd,  F_BRL); r0++;
  setStr(ws0, r0, 2, '★ Payback simples');
  // pbAnos é null quando o sistema não se paga dentro do horizonte de 25 anos —
  // nesse caso escreve texto em vez de forçar um número enganoso (0 pareceria
  // "payback instantâneo").
  if (pbAnos === null) { setStr(ws0, r0, 3, 'Acima de 25 anos'); }
  else { setNum(ws0, r0, 3, pbAnos, '#,##0.00'); setStr(ws0, r0, 4, 'anos'); }
  r0++;
  setStr(ws0, r0, 2, 'TIR (Taxa Interna de Retorno)'); setNum(ws0, r0, 3, tirVal/100, F_PCT); r0++;
  // BUG CORRIGIDO (ago/2026): TMA estava hardcoded em 0.08 na fórmula do VPL desta
  // aba (Resumo), divergindo do VPL da aba Fluxo_Caixa — que corretamente referencia
  // Entradas!B{ROW_TMA} — sempre que o usuário mudasse a TMA na aba Entradas. Ambas
  // as células agora referenciam a mesma célula viva de TMA.
  setStr(ws0, r0, 2, 'VPL (TMA — ver aba Entradas)');
  setFrm(ws0, r0, 3, `=NPV(Entradas!B${ROW_TMA},Fluxo_Caixa!E${FC_T0+1}:Fluxo_Caixa!E${FC_T0+25})+Fluxo_Caixa!E${FC_T0}`, F_BRL); r0++;
  setStr(ws0, r0, 2, 'Economia total em 25 anos');
  setFrm(ws0, r0, 3, `=SUM(Fluxo_Caixa!E${FC_T0+1}:Fluxo_Caixa!E${FC_T0+25})`, F_BRL); r0+=2;

  // ── Checklist CEMIG ───────────────────────────────────────────────────────
  setStr(ws0, r0, 2, '▌ DOCUMENTOS CEMIG (REN 1.000/2021 + ND 5.30)'); r0++;
  const docsCemig = [
    ['✅', 'Formulário MicroGD CEMIG Rev. N4',      '(gerado pelo LumenSolar)'],
    ['✅', 'Procuração — Art. 9 REN 1.000/2021',    '(gerado pelo LumenSolar)'],
    ['✅', 'Memorial Descritivo — ND 5.30',         '(gerado pelo LumenSolar)'],
    ['⬜', 'DUB — Diagrama Unifilar Básico',        '(elaborar manualmente)'],
    ['⬜', 'Planta de Situação (satélite + UTM)',    '(elaborar manualmente)'],
    ['⬜', 'ART do Responsável Técnico',             '(emitir no CREA)'],
    ['⬜', 'RG + CPF titular + Comprovante imóvel', '(documentos do cliente)'],
    ['⬜', 'Certificados INMETRO módulos/inversores','(solicitar ao fornecedor)'],
  ];
  for (const [icone, doc, instrucao] of docsCemig) {
    setStr(ws0, r0, 2, `${icone}  ${doc}`);
    setStr(ws0, r0, 5, instrucao);
    r0++;
  }
  r0++;

  // ── Rodapé ────────────────────────────────────────────────────────────────
  // BUG CORRIGIDO (ago/2026): auditoria de design encontrou dois problemas
  // aqui — "CREA-MG" estava fixo no código (ignorava empresa.uf; um cliente
  // fora de MG saía com o estado errado no rodapé) e duplicava o prefixo
  // quando empresa.crea já vinha com ele — ver `formatarCrea()`
  // (domain/empresa/cadastroEmpresa.ts).
  setStr(ws0, r0, 2, `${dados.empresa?.razaoSocial ?? 'Lumen Soluções Ltda'}  |  ${dados.empresa?.responsavelTecnico ?? ''}  |  ${formatarCrea(dados.empresa)}  |  Gerado pelo LumenSolar`);
  r0++;
  setStr(ws0, r0, 2, 'Os valores de VPL e Economia 25 anos são calculados ao vivo pela aba Fluxo_Caixa — altere qualquer premissa em Entradas para ver o impacto.');
  r0++;

  updateRef(ws0, r0, 6);
  XLSX.utils.book_append_sheet(wb, ws0, 'Resumo');


    XLSX.utils.book_append_sheet(wb, ws1, 'Entradas');

  // Aliases para referências
  const E = (row: number) => `Entradas!B${row}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 2 — PERDAS
  // ═══════════════════════════════════════════════════════════════════════════
  const ws2: WS = {};
  setCols(ws2, [40, 18, 30]);
  r = 1;

  // CORRIGIDO (ago/2026): "IEC 61724-1" era citada nesta aba (título e duas notas
  // de célula) como se fosse a norma que define estas fórmulas de perdas — não é;
  // essa norma trata de monitoramento de desempenho de sistemas FV em operação.
  // Mesma citação incorreta já removida de calcularPerdas.ts numa rodada anterior
  // desta auditoria. São fórmulas de engenharia FV padrão (Sandia/PVsyst/Duffie &
  // Beckman); os cálculos em si não mudam.
  setStr(ws2, r, 1, 'CÁLCULO DE PERDAS'); r+=2;

  // BUG CORRIGIDO (ago/2026): esta aba reintroduzia o mesmo bug do fator
  // ×0.8 já corrigido em calcularPerdas.ts numa rodada anterior desta
  // auditoria — misturava a irradiância de referência do próprio ensaio
  // NOCT (800 W/m²) com a de STC (1000 W/m²). G=800 W/m² É a irradiância
  // do próprio ensaio NOCT (não a de STC), então o fator correto é
  // G/800=800/800=1 — ou seja, Tcélula = Tamb + (NOCT-20) diretamente, sem
  // multiplicar por 0.8. Ver comentário completo em calcularPerdas.ts.
  setStr(ws2, r, 1, 'TEMPERATURA DE CÉLULA  Tcell = Tamb + (NOCT-20)'); r++;
  const P_TAMB = r; setStr(ws2, r, 1, 'Temperatura ambiente (°C)'); setFrm(ws2, r, 2, `=${E(ROW_TAMB)}`); setStr(ws2, r, 3, `Entradas!B${ROW_TAMB}`); r++;
  const P_NOCT = r; setStr(ws2, r, 1, 'NOCT (°C)'); setFrm(ws2, r, 2, `=${E(ROW_NOCT)}`); r++;
  const P_TCELL= r; setStr(ws2, r, 1, 'Tcell = Tamb + (NOCT-20)'); setFrm(ws2, r, 2, `=B${P_TAMB}+(B${P_NOCT}-20)`, 'General', tamb+(noct-20)); setStr(ws2, r, 3, 'G=800 W/m² é a própria irradiância do ensaio NOCT — fator G/800=1, ver calcularPerdas.ts'); r++;
  const P_DT   = r; setStr(ws2, r, 1, 'ΔT = Tcell - 25°C (STC)'); setFrm(ws2, r, 2, `=B${P_TCELL}-25`); r+=2;

  setStr(ws2, r, 1, 'COMPONENTES DE PERDA  [composição encadeada]'); r++;
  const P_COEF = r; setStr(ws2, r, 1, 'Coef. temp. Pmax (%/°C)'); setFrm(ws2, r, 2, `=${E(ROW_COEF)}`, F_PCT); r++;
  const P_PTMP = r; setStr(ws2, r, 1, '1. Perda de temperatura'); setFrm(ws2, r, 2, `=MAX(0,ABS(B${P_COEF})/100*B${P_DT})`, F_PCT); setStr(ws2, r, 3, 'MAX(0, |coef| × ΔT / 100)'); r++;
  const P_INV  = r; setStr(ws2, r, 1, '2. Perda do inversor'); setFrm(ws2, r, 2, `=1-${E(ROW_EFIC)}/100`, F_PCT); setStr(ws2, r, 3, '1 − eficiência'); r++;
  const P_SOMB = r; setStr(ws2, r, 1, '3. Perda por sombreamento'); setFrm(ws2, r, 2, `=${E(ROW_SOMB)}`, F_PCT); r++;
  const P_SUJ  = r; setStr(ws2, r, 1, '4. Perda por sujidade'); setFrm(ws2, r, 2, `=${E(ROW_SUJ)}`, F_PCT); r++;
  const P_CAB  = r; setStr(ws2, r, 1, '5. Perda por cabeamento'); setNum(ws2, r, 2, 0.02, F_PCT); setStr(ws2, r, 3, 'Fixo 2% — estimativa padrão de engenharia FV'); r++;
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
  // CORRIGIDO (ago/2026): mesma citação incorreta de "IEC 61724-1" removida do
  // título desta aba — ver comentário na aba "Perdas" acima.
  setStr(ws3, r, 1, 'DIMENSIONAMENTO DO SISTEMA'); r+=2;

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

  // BUG CORRIGIDO (ago/2026): as tentativas de referência aqui (ROW_MEDIA+2/+3/+4)
  // apontavam para as linhas erradas da aba Entradas (ROW_MEDIA é a linha da "Média
  // dos 12 meses", não de Tarifa/CIP/kWh mínimo — essas ficam mais acima, seção "2.
  // CONSUMO"). O código antigo percebeu que a referência estava errada e "corrigiu"
  // travando em valores estáticos (sem fórmula), quebrando a promessa do cabeçalho
  // do arquivo ("cada cálculo é replicado como fórmula Excel... permitindo segunda
  // opinião") — se o usuário mudasse Tarifa/CIP/kWh mínimo na aba Entradas para
  // testar um cenário, esta aba (e toda a cadeia dependente: Fluxo_Caixa, VPL, TIR,
  // Payback) não recalculava. Agora usa as linhas certas (ROW_TARIFA/ROW_CIP/
  // ROW_KWMIN, capturadas na montagem da aba Entradas), com fórmula viva.
  const FE_TAR  = r; setStr(ws4, r, 1, 'Tarifa (R$/kWh)'); setFrm(ws4, r, 2, `=Entradas!B${ROW_TARIFA}`, F_BRL, tarifa); r++;
  const FE_CIP  = r; setStr(ws4, r, 1, 'CIP/COSIP (R$/mês)'); setFrm(ws4, r, 2, `=Entradas!B${ROW_CIP}`, F_BRL, cip); r++;
  const FE_KWMIN= r; setStr(ws4, r, 1, 'kWh disponibilidade mínima'); setFrm(ws4, r, 2, `=Entradas!B${ROW_KWMIN}`, F_INT, kwhMin); r++;

  const FE_CONS = r; setStr(ws4, r, 1, 'Consumo médio (kWh/mês)'); setFrm(ws4, r, 2, `=Dimensionamento!B${D_CONS}`, F_KWH); r++;
  const FE_GER  = r; setStr(ws4, r, 1, 'Geração mensal (kWh/mês)'); setFrm(ws4, r, 2, `=Dimensionamento!B${D_GERM}`, F_KWH); r++;
  const FE_COMP = r; setStr(ws4, r, 1, 'Energia compensada (kWh)'); setFrm(ws4, r, 2, `=MIN(B${FE_CONS},B${FE_GER})`, F_KWH); setStr(ws4, r, 3, 'min(geração, consumo) — regra ANEEL'); r++;
  // BUG CORRIGIDO (ago/2026): rótulo dizia "fixo em lei" — falso; é uma
  // estimativa configurável (empresa.fracaoTarifaFioB, padrão 35%), não um
  // percentual definido pela Lei 14.300/2022. Valor inicial da célula também
  // passou a vir de empresa.fracaoTarifaFioB (o usuário pode sobrescrever a
  // célula manualmente, como o cabeçalho do arquivo já promete).
  const FE_FRAC = r; setStr(ws4, r, 1, 'Fração tarifária FioB'); setNum(ws4, r, 2, empresa?.fracaoTarifaFioB ?? 0.35, F_PCT); setStr(ws4, r, 3, 'Estimativa (editável) — não é percentual definido em lei'); r++;
  const FE_ANOB = r; setStr(ws4, r, 1, 'Ano base'); setFrm(ws4, r, 2, `=${E(ROW_ANOB)}`, F_INT); r+=2;

  // BUG CORRIGIDO (ago/2026): esta aba (FioB_Economia) ignorava por
  // completo `enquadramento`/`percentuaisFioBPorAno` — sempre assumia o
  // escalonamento do Art. 27 a partir de 2026, mesmo para um cliente
  // elegível à regra de transição do Art. 26 (isento até 31/12/2045,
  // classificarEnquadramento()/percentualFioBPorAno() em calculoFioB.ts).
  // A aba "Resumo" (ws0, primeira aba) já tinha sido corrigida numa
  // rodada anterior para checar `enquadramento?.elegivelArt26` — mas essa
  // aba só mostra texto explicativo; os números "ao vivo" desta aba
  // (FE_PCT/FE_FIOB/FE_APOS/FE_ECO) é que alimentam
  // FioB_Economia→Fluxo_Caixa→VPL/TIR/Payback, e continuavam calculados
  // como se o cliente pagasse Fio B crescente — contradição interna no
  // mesmo documento entre o texto do Resumo e os números do Fluxo_Caixa.
  // `enquadramento`/`percentuaisFioBPorAno` são fatos fixos deste projeto
  // (não algo que o usuário reconfigura ao vivo na aba Entradas — não há
  // célula de "data de protocolo" nem "elegível Art.26" nas Entradas),
  // por isso, assim como no Resumo, a decisão Art.26-vs-Art.27 é tomada em
  // JS na geração do arquivo (mesmo padrão), mas a célula "Ano base" (que
  // É editável nas Entradas) continua reagindo ao vivo dentro do caso
  // Art.27, para não perder a promessa de "fórmula viva" do cabeçalho.
  const artIsento = !!enquadramento?.elegivelArt26;
  const formulaEscalonamentoArt27 =
    `IF(B${FE_ANOB}<=2022,0,IF(B${FE_ANOB}=2023,0.15,IF(B${FE_ANOB}=2024,0.30,IF(B${FE_ANOB}=2025,0.45,IF(B${FE_ANOB}=2026,0.60,IF(B${FE_ANOB}=2027,0.75,IF(B${FE_ANOB}=2028,0.90,1.00)))))))`;
  // pctFioBReal(ano): mesma lógica de percentualFioBPorAno() (calculoFioB.ts) —
  // usa percentuaisFioBPorAno (pré-calculado pelo store) quando disponível
  // para o ano, senão cai no escalonamento-padrão do Art.27 como fallback.
  function pctFioBReal(ano: number): number {
    if (artIsento && ano <= 2045) return 0;
    if (percentuaisFioBPorAno?.[ano] !== undefined) return percentuaisFioBPorAno[ano];
    if (ano <= 2022) return 0;
    if (ano === 2023) return 0.15;
    if (ano === 2024) return 0.30;
    if (ano === 2025) return 0.45;
    if (ano === 2026) return 0.60;
    if (ano === 2027) return 0.75;
    if (ano === 2028) return 0.90;
    return 1.00;
  }

  setStr(ws4, r, 1, artIsento
    ? 'PERCENTUAL FIOB — cliente elegível ao Art. 26 (isento até 31/12/2045)'
    : 'PERCENTUAL FIOB — Art. 27 Lei 14.300/2022'); r++;
  setStr(ws4, r, 1, 'Ano'); setStr(ws4, r, 2, '% FioB (Art.27)'); setStr(ws4, r, 3, '% FioB (Art.26 — regra de transição)'); r++;
  const FE_PTAB = r;
  const tabFioB = [[2023,0.15],[2024,0.30],[2025,0.45],[2026,0.60],[2027,0.75],[2028,0.90],[2029,1.00],[2030,1.00]];
  for (const [ano, pct] of tabFioB) {
    setNum(ws4, r, 1, ano, F_INT); setNum(ws4, r, 2, pct, F_PCT); setNum(ws4, r, 3, ano <= 2045 ? 0 : pct, F_PCT); r++;
  }

  r++;
  setStr(ws4, r, 1, artIsento ? 'Percentual FioB do ano base (isento — Art. 26)' : 'Percentual FioB do ano base'); r++;
  const FE_PCT  = r;
  setFrm(ws4, r, 2,
    artIsento ? `=IF(B${FE_ANOB}<=2045,0,${formulaEscalonamentoArt27})` : `=${formulaEscalonamentoArt27}`,
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

  // Projeção 25 anos — BUG CORRIGIDO (ago/2026): mesmo bug do bloco acima,
  // aqui é onde mais importa: esta tabela alimenta diretamente FC_ECO na
  // aba Fluxo_Caixa (`=FioB_Economia!B${FE_ECO}` usa só o ano 1, mas o
  // padrão de escalonamento errado também distorcia a lógica de qualquer
  // extensão futura que reprojete ano-a-ano). Agora usa pctFioBReal(ano),
  // que respeita Art.26/percentuaisFioBPorAno.
  setStr(ws4, r, 1, artIsento
    ? 'PROJEÇÃO FIOB — Economia por ano (Art. 26 — isento até 2045)'
    : 'PROJEÇÃO FIOB — Economia por ano (Art.27)'); r++;
  setStr(ws4, r, 1, 'Ano'); setStr(ws4, r, 2, '% FioB'); setStr(ws4, r, 3, 'Economia mensal (R$)'); r++;
  for (let i = 0; i < 25; i++) {
    const ano = anoBase + i;
    const pctFio = pctFioBReal(ano);
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
  setFrm(ws5, r, 2, `=IF(B${PR_DIV}>0,"OK","IMPOSSÍVEL — IMP+MARGEM >= 100%")`); r++;
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
  XLSX.utils.book_append_sheet(wb, ws5, 'Precificação');

  // ═══════════════════════════════════════════════════════════════════════════
  // ABA 6 — TABELA PRICE
  // ═══════════════════════════════════════════════════════════════════════════
  const ws6: WS = {};
  setCols(ws6, [10, 16, 16, 16, 16, 18]);
  r = 1;
  setStr(ws6, r, 1, 'TABELA PRICE — PMT = PV × i × (1+i)^n / ((1+i)^n − 1)'); r+=2;

  setStr(ws6, r, 1, 'Valor financiado (R$)'); setFrm(ws6, r, 2, `=Precificação!B${PR_PREC}`, F_BRL); r++;
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

  const FC_INV = r; setStr(ws7, r, 1, 'Investimento (R$)'); setFrm(ws7, r, 2, `=Precificação!B${PR_PREC}`, F_BRL); r++;
  const FC_ECO = r; setStr(ws7, r, 1, 'Economia mensal Ano 1 (R$/mês)'); setFrm(ws7, r, 2, `=FioB_Economia!B${FE_ECO}`, F_BRL); r++;
  const FC_DEG = r; setStr(ws7, r, 1, 'Degradação anual'); setFrm(ws7, r, 2, `=${E(ROW_DEG)}`, F_PCT); r++;
  const FC_REA = r; setStr(ws7, r, 1, 'Reajuste tarifário anual'); setFrm(ws7, r, 2, `=${E(ROW_REA)}`, F_PCT); r++;
  const FC_TMA = r; setStr(ws7, r, 1, 'TMA'); setFrm(ws7, r, 2, `=${E(ROW_TMA)}`, F_PCT); r+=2;

  for (let i = 1; i <= 6; i++) setStr(ws7, r, i, ['Ano','Fator Degrad.','Fator Reajuste','Economia Anual (R$)','Fluxo (R$)','Fluxo Acum. (R$)'][i-1]); r++;
  // FC_T0 já foi declarado (constante) no início da função — checagem de
  // consistência: se a sequência de linhas acima mudar, este assert falha
  // alto e rápido em vez de silenciosamente desalinhar as fórmulas do Resumo.
  if (r !== FC_T0) throw new Error(`gerarExcelAuditoria: layout do Fluxo_Caixa mudou (r=${r}, FC_T0=${FC_T0}) — atualize a constante FC_T0 no início da função.`);
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
  // BUG CORRIGIDO (ago/2026): a fórmula procurava SIGN(fluxo acumulado)
  // EXATAMENTE IGUAL a 0 (MATCH(0,...)) para achar o ano do payback — com
  // valores monetários reais, o fluxo acumulado praticamente nunca cai
  // exatamente em zero (cruza de negativo pra positivo entre dois meses),
  // então SIGN(F) nunca retorna 0 e o MATCH sempre falhava, caindo no
  // IFERROR e mostrando ">25 anos" mesmo quando o payback real era de
  // 4-5 anos. Corrigido para procurar o primeiro ano com SIGN=1 (fluxo
  // acumulado positivo) — SIGN(x) para x>0 sempre retorna exatamente 1,
  // então este MATCH é confiável (o "-1" já compensava a linha extra do
  // ano 0 nesta mesma fórmula, continua correto).
  setStr(ws7, r, 1, 'Payback simples (anos)');
  setFrm(ws7, r, 2, `=IFERROR(MATCH(1,SIGN(F${FC_T0}:F${FC_T0+25}),0)-1,">25 anos")`); r++;

  updateRef(ws7, r, 6);
  XLSX.utils.book_append_sheet(wb, ws7, 'Fluxo_Caixa');

  // ── Download ─────────────────────────────────────────────────────────────
  const nomeCliente = normalizarNomeArquivo(dados.cliente?.nome ?? 'Cliente');
  const data = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Auditoria_${nomeCliente}_${data}.xlsx`);
}
