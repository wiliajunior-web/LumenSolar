/**
 * PROPOSTA COMERCIAL - para envio ao cliente.
 * NÃO mostra: ART, estrutura, materiais, impostos, margem, custos internos.
 * Foco: benefícios, economia, sistema, financiamento, validade.
 */
import {
  Document, Page, Text, View, StyleSheet, Image, Svg, Rect, G, Path, Line, Circle, Polyline,
} from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';
import { IMG_CAPA, IMG_APOIO } from '../../assets/imagens';
import { MESES_LABELS } from '../../data/hspMensal';
import { PRESETS_MODULO } from '../../data/presetsModulo';
import { formatarNomeModulo, formatarTipoModulo } from '../kit/formatarModulo';
import { formatarCrea } from '../empresa/cadastroEmpresa';

// ── Paleta Lumen ─────────────────────────────────────────────────────────────
const C = {
  dark:    '#0a0b10',
  navy:    '#10131e',
  gold:    '#c9a227',
  goldSft: '#e8c547',
  bg:      '#fdfcf8',
  white:   '#ffffff',
  border:  '#e8e3d6',
  text:    '#1a1a28',
  muted:   '#7a7690',
  success: '#1a7a40',
  card:    '#f7f5f0',
};

const S = StyleSheet.create({
  page:  { fontFamily: 'Helvetica', backgroundColor: C.bg, fontSize: 10, color: C.text },
  pageD: { fontFamily: 'Helvetica', backgroundColor: C.dark, fontSize: 10, color: C.white },

  // ── Layout com faixa lateral ──
  row:  { flexDirection: 'row' },
  col:  { flex: 1 },
  band: { width: 14, backgroundColor: C.navy },
  bandGold: { width: 14, backgroundColor: C.gold },
  body: { flex: 1, padding: '24 28' },

  // ── Capa ──
  capaHero: { flex: 1, padding: '0 40', justifyContent: 'space-between' },
  capaBadge: { backgroundColor: C.gold, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  capaBadgeTxt: { color: C.dark, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  capaTitulo: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: C.white, lineHeight: 1.1, marginBottom: 6 },
  capaCliente: { fontSize: 20, color: C.gold, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  capaLocal: { fontSize: 11, color: '#9090b0', marginBottom: 40 },
  capaMetrics: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  metric: { flex: 1, backgroundColor: '#161825', borderRadius: 10, padding: '14 16', borderLeftWidth: 3, borderLeftColor: C.gold },
  metricVal: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.gold, marginBottom: 4 },
  metricLbl: { fontSize: 9, color: '#8080a0', letterSpacing: 0.5 },
  capaRodape: { borderTopWidth: 1, borderTopColor: '#2a2d3e', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  capaEmpNome: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.white },
  capaEmpInfo: { fontSize: 9, color: '#7080a0', marginTop: 3 },
  capaValidade: { fontSize: 9, color: '#5060a0', textAlign: 'right' },

  // ── Seções internas ──
  secTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 3 },
  secTitleBig: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 },
  secSub: { fontSize: 10, color: C.muted, marginBottom: 14, lineHeight: 1.5 },
  secBar: { height: 3, backgroundColor: C.gold, width: 40, marginBottom: 16 },

  // ── Cards de benefício ──
  benefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  benefCard: { width: '47%', backgroundColor: C.card, borderRadius: 8, padding: '14 16', borderLeftWidth: 3, borderLeftColor: C.gold },
  benefTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 5 },
  benefText: { fontSize: 9, color: C.muted, lineHeight: 1.5 },
  benefIcon: { fontSize: 16, marginBottom: 8 },

  // ── Tabela de equipamentos ──
  // BUG CORRIGIDO (ago/2026): auditoria de design encontrou a coluna
  // ESPECIFICAÇÃO colidindo visualmente com QUANTIDADE ("(TOP-7 un.\nCon)")
  // sempre que o texto da especificação precisa quebrar em 2 linhas — as 3
  // colunas (flex 2/3/1) ficavam coladas, sem nenhum espaçamento entre elas,
  // então uma leve imprecisão do motor de layout do react-pdf-renderer ao
  // quebrar uma "palavra" sem espaço (ex.: "(TOPCon)") bastava para o texto
  // invadir visualmente a coluna vizinha. `gap` reserva uma margem fixa
  // entre colunas — corrige este caso e protege qualquer texto de
  // especificação futuro que também precise quebrar linha.
  tblHead: { flexDirection: 'row', backgroundColor: C.dark, padding: '7 10', gap: 10 },
  tblHeadTxt: { color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  tblRow: { flexDirection: 'row', padding: '7 10', borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  tblRowAlt: { flexDirection: 'row', padding: '7 10', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card, gap: 10 },
  tblCell: { fontSize: 9, color: C.text },
  tblCellB: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },

  // ── Métricas do sistema ──
  sysGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sysStat: { flex: 1, backgroundColor: C.card, borderRadius: 8, padding: '12 14', alignItems: 'center' },
  sysStatVal: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 3 },
  sysStatLbl: { fontSize: 8, color: C.muted, textAlign: 'center' },

  // ── Análise financeira ──
  finGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  finCard: { flex: 1, borderRadius: 10, padding: '14 16' },
  finCardGold: { flex: 1, backgroundColor: C.gold, borderRadius: 10, padding: '14 16' },
  finVal: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  finLbl: { fontSize: 9 },

  // ── Row financeiro ──
  fRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  fRowLbl: { fontSize: 9, color: C.muted },
  fRowVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },
  fRowValGreen: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.success },

  // ── Financiamento cards ──
  finOpt: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: '14 16', borderTopWidth: 3, borderTopColor: C.gold },
  finOptParcela: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 2 },
  finOptDesc: { fontSize: 8, color: C.muted, marginBottom: 10 },
  finOptDetail: { fontSize: 8, color: C.muted, marginBottom: 2 },

  // ── Serviços ──
  svcRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8, width: '47%' },
  svcDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  svcDotTxt: { color: C.dark, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  svcTxt: { flex: 1, fontSize: 9, color: C.text, lineHeight: 1.5 },

  // ── Rodapé fixo ──
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  footerTxt: { fontSize: 7, color: C.muted },
  pageNum: { fontSize: 7, color: C.muted },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const R = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const N = (v: number, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const hoje = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// BUG CORRIGIDO (ago/2026): quando telefone/email da empresa estavam vazios,
// o rodapé e a faixa da capa imprimiam o separador " - " nu, sem o valor —
// ex: "Lumen Solar - - " e "Válida por 15 dias - 28 de agosto de 2026 - -".
// juntar() só inclui no resultado os segmentos realmente preenchidos.
const juntar = (...partes: (string | false | undefined | null)[]) =>
  partes.filter((p): p is string => !!p && p.trim() !== '').join(' - ');

const Footer = ({ empresa }: { empresa: any }) => (
  <View style={S.footer} fixed>
    <Text style={S.footerTxt}>{juntar(empresa.nomeFantasia || empresa.razaoSocial, empresa.telefone, empresa.email)}</Text>
    <Text style={S.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
  </View>
);

// BUG CORRIGIDO (ago/2026): os círculos de "Por que investir em energia
// solar?" mostravam texto cru como se fosse ícone ("R$", "%", "UP", "CO",
// "60x", "25") — não havia nenhuma fonte de ícones tentada nem quebrada,
// o texto abreviado sempre foi o conteúdo real do círculo. Substituído por
// ícones vetoriais de verdade (Svg/Path do próprio @react-pdf/renderer, já
// importado neste arquivo para o gráfico de geração — sem fonte externa,
// sem risco de não embutir). Estilo de traço simples (stroke, sem fill),
// mesmo padrão usado por bibliotecas de ícone open-source comuns (Feather).
// Ver auditoria "geração de documentos", item 3.
const ICON_PROPS = { stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

const IconEconomia = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Line x1={12} y1={1} x2={12} y2={23} {...ICON_PROPS} />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...ICON_PROPS} />
  </Svg>
);
const IconProtecao = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...ICON_PROPS} />
  </Svg>
);
const IconValorizacao = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...ICON_PROPS} />
    <Polyline points="9 22 9 12 15 12 15 22" {...ICON_PROPS} />
  </Svg>
);
const IconSustentabilidade = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Circle cx={12} cy={12} r={4} {...ICON_PROPS} />
    <Line x1={12} y1={1} x2={12} y2={4} {...ICON_PROPS} />
    <Line x1={12} y1={20} x2={12} y2={23} {...ICON_PROPS} />
    <Line x1={3} y1={12} x2={6} y2={12} {...ICON_PROPS} />
    <Line x1={18} y1={12} x2={21} y2={12} {...ICON_PROPS} />
    <Line x1={5.6} y1={5.6} x2={7.7} y2={7.7} {...ICON_PROPS} />
    <Line x1={16.3} y1={16.3} x2={18.4} y2={18.4} {...ICON_PROPS} />
    <Line x1={5.6} y1={18.4} x2={7.7} y2={16.3} {...ICON_PROPS} />
    <Line x1={16.3} y1={7.7} x2={18.4} y2={5.6} {...ICON_PROPS} />
  </Svg>
);
const IconFinanciamento = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Rect x={1} y={4} width={22} height={16} rx={2} ry={2} {...ICON_PROPS} />
    <Line x1={1} y1={10} x2={23} y2={10} {...ICON_PROPS} />
  </Svg>
);
const IconVidaUtil = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Circle cx={12} cy={12} r={10} {...ICON_PROPS} />
    <Polyline points="12 6 12 12 16 14" {...ICON_PROPS} />
  </Svg>
);
// ADICIONADO (set/2026): usado no lugar do card "Financiamento facilitado"
// quando `opcoesProposta.mostrarFinanciamentoNaProposta` é false — ver
// comentário completo no bloco de benefícios da página 1.
const IconManutencao = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" {...ICON_PROPS} />
  </Svg>
);

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={S.secTitleBig}>{title}</Text>
    <View style={S.secBar} />
    {sub && <Text style={S.secSub}>{sub}</Text>}
  </View>
);

// ── Gráfico de barras (SVG) ───────────────────────────────────────────────────
// BUG CORRIGIDO (set/2026, usuário relatou "o gráfico de barras não ocupa
// sequer toda a largura da página"): CONFIRMADO renderizando o PDF real e
// medindo — `W=460` já era menor que a área útil de conteúdo da página A4
// (band 14pt + padding 28pt cada lado ⇒ ~525pt disponíveis, não 460), e pior:
// as 12 barras (gap=26, barW=13) nem preenchiam os 460 declarados — a última
// barra terminava perto de x≈313, deixando ~30% do próprio SVG em branco à
// direita, além do SVG inteiro já ficar ~12% mais estreito que a página.
// Resultado real: o gráfico ocupava uns 60% da largura útil da página.
// Corrigido calculando a geometria das barras A PARTIR da largura realmente
// disponível (`largura`, passada pelo chamador — ver PÁG 2 abaixo), em vez
// de constantes fixas que não tinham relação nenhuma com o layout real.
// Aproveitado para também aumentar a altura, adicionar linhas de grade leves
// e rótulo de valor (kWh) acima de cada barra de geração — parte do mesmo
// pedido do usuário sobre o PDF parecer "muito genérico".
const GraficoGeracaoConsumo = ({ geracaoMensal, consumoMedio, largura = 520 }: { geracaoMensal: number[], consumoMedio: number, largura?: number }) => {
  const maxVal = Math.max(...geracaoMensal, consumoMedio) * 1.28; // 28% de folga acima da maior barra p/ caber o rótulo de valor
  const W = largura, H = 130;
  const margemLateral = 6;
  const areaUtil = W - margemLateral * 2;
  const gap = areaUtil / 12;   // largura do "slot" de cada mês — preenche toda a área útil
  const barW = gap * 0.6;      // largura do par de barras (consumo+geração) dentro do slot
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return (
    <View>
      <Svg width={W} height={H + 26}>
        {/* Linhas de grade leves (25/50/75/100% do eixo) — referência visual sem poluir */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <Line key={f} x1={0} y1={H - H * f} x2={W} y2={H - H * f} stroke="#ece9dd" strokeWidth={0.5} />
        ))}
        {geracaoMensal.map((gen, i) => {
          const hGen  = Math.max(2, (gen / maxVal) * H);
          const hCons = Math.max(2, (consumoMedio / maxVal) * H);
          const x = margemLateral + i * gap + (gap - barW) / 2;
          return (
            <G key={i}>
              <Rect x={x}                y={H - hCons} width={barW * 0.46} height={hCons} fill="#d8d4c8" rx={2} />
              <Rect x={x + barW * 0.54}  y={H - hGen}  width={barW * 0.46} height={hGen}  fill="#c9a227" rx={2} />
              <Text style={{ fontSize: 6, fill: '#8a8776' }} x={x + barW / 2} y={H - hGen - 4} textAnchor="middle">{Math.round(gen)}</Text>
              <Text style={{ fontSize: 7.5, fill: '#9590a8' }} x={x + barW / 2} y={H + 15} textAnchor="middle">{meses[i]}</Text>
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 6, backgroundColor: '#d8d4c8', borderRadius: 2 }} />
          <Text style={{ fontSize: 8, color: C.muted }}>Consumo médio</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 6, backgroundColor: C.gold, borderRadius: 2 }} />
          <Text style={{ fontSize: 8, color: C.muted }}>Geração estimada (kWh/mês)</Text>
        </View>
      </View>
    </View>
  );
};

// ── Gráfico de economia acumulada / ponto de equilíbrio (SVG) ────────────────
// ADICIONADO (set/2026, auditoria de design — usuário relatou "o PDF ficou
// muito genérico"): a página "Análise financeira" tinha ~55% de espaço em
// branco (confirmado renderizando o PDF real). Um gráfico de economia
// acumulada/payback é o gráfico mais padrão de qualquer proposta financeira
// de energia solar — e os dados já existiam prontos em `fluxo.fluxoAnual`
// (calcularFluxoCaixa, chamado por calcularTudo() em useProjetoStore.ts), só
// nunca tinham saído da função. Formalizados em
// `IndicadoresFinanceiros.fluxoAnualHorizonte` (ver comentário completo lá).
// `fluxo[0]` é o investimento inicial NEGATIVO; `fluxo[1..N]` é a economia
// líquida de cada ano (já com degradação dos módulos + reajuste tarifário +
// escalonamento real do Fio B, Lei 14.300/2022 — não uma aproximação nova).
const GraficoEconomiaAcumulada = ({ fluxoAnual, largura = 520 }: { fluxoAnual: number[], largura?: number }) => {
  if (!fluxoAnual || fluxoAnual.length < 2) return null;
  const investimento = -fluxoAnual[0];
  const anos = fluxoAnual.length - 1; // fluxoAnual[0] é o ano 0 (investimento)
  const acumulado: number[] = [];
  let soma = fluxoAnual[0];
  for (let i = 1; i < fluxoAnual.length; i++) { soma += fluxoAnual[i]; acumulado.push(soma); }
  const minVal = Math.min(0, ...acumulado);
  const maxVal = Math.max(...acumulado) * 1.1;
  const range = maxVal - minVal;
  const W = largura, H = 150;
  const margemLateral = 6;
  const areaUtil = W - margemLateral * 2;
  const anoZeroY = H - ((0 - minVal) / range) * H; // posição da linha "R$ 0" (referência do ponto de equilíbrio)
  const passoX = areaUtil / anos;
  const pontos = acumulado.map((v, i) => {
    const x = margemLateral + (i + 1) * passoX;
    const y = H - ((v - minVal) / range) * H;
    return { x, y, v, ano: i + 1 };
  });
  // Ano em que o saldo acumulado cruza zero pela primeira vez (payback visual)
  const anoPayback = pontos.find(p => p.v >= 0);
  // Ponto inicial da linha (ano 0 = investimento, sempre negativo)
  const y0 = H - ((fluxoAnual[0] - minVal) / range) * H;
  const pathPoints = [{ x: margemLateral, y: y0 }, ...pontos];
  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Alguns rótulos de ano no eixo X (a cada 5 anos, mais o último) — 25 rótulos colidiriam
  const anosRotulo = new Set([1, 5, 10, 15, 20, anos]);
  return (
    <View>
      <Svg width={W} height={H + 26}>
        {/* Linha de referência "zero" — abaixo dela o investimento ainda não voltou */}
        <Line x1={0} y1={anoZeroY} x2={W} y2={anoZeroY} stroke="#d8d4c8" strokeWidth={0.75} />
        <Text style={{ fontSize: 6.5, fill: '#9590a8' }} x={W - 2} y={anoZeroY - 3} textAnchor="end">R$ 0</Text>
        <Path d={pathD} stroke={C.gold} strokeWidth={2} fill="none" />
        {anoPayback && (
          <G>
            <Line x1={anoPayback.x} y1={0} x2={anoPayback.x} y2={H} stroke={C.success} strokeWidth={0.75} strokeDasharray="3,2" />
            <Circle cx={anoPayback.x} cy={anoPayback.y} r={3} fill={C.success} />
          </G>
        )}
        {/* BUG CORRIGIDO (set/2026, achado conferindo o PDF real gerado, não
            só o código): o rótulo do ÚLTIMO ano ficava centralizado
            exatamente na borda direita do SVG (textAnchor="middle") — metade
            do texto ("Ano 25") saía cortado fora da área visível, sobrando só
            "Ano 2" visível. Ancorado em "end" só pro último ponto, que fica
            exatamente na borda direita por construção (`pontos[last].x =
            margemLateral + areaUtil`, ver definição de `pontos` acima). */}
        {pontos.filter(p => anosRotulo.has(p.ano)).map(p => (
          <Text key={p.ano} style={{ fontSize: 7, fill: '#9590a8' }} x={p.x} y={H + 15} textAnchor={p.ano === anos ? 'end' : 'middle'}>{`Ano ${p.ano}`}</Text>
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 14, height: 2, backgroundColor: C.gold }} />
          <Text style={{ fontSize: 8, color: C.muted }}>Saldo acumulado (economia menos investimento)</Text>
        </View>
        {anoPayback && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.success }} />
            <Text style={{ fontSize: 8, color: C.muted }}>Ponto de equilíbrio (payback) — ano {anoPayback.ano}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Aviso Grupo A ────────────────────────────────────────────────────────────
// ADICIONADO ago/2026: até então, um cliente Grupo A (Média Tensão) recebia
// esta proposta com potência/economia/payback calculados como Grupo B
// (tarifa única, sem demanda contratada) sem qualquer aviso — silenciosamente
// incorreto. Não remapeamos os números de `dimensionamento`/`custosRecorrentes`
// (usados no resto do documento) para os de Grupo A porque os dois modelos
// têm campos com semântica diferente (ver README, Auditoria ago/2026); em vez
// disso, esta página torna o erro visível e mostra os números certos.
const AvisoGrupoA = ({ empresa, cliente, r }: { empresa: any; cliente: any; r: any }) => (
  <Page size="A4" style={S.page}>
    <View style={S.row}>
      <View style={{ width: 14, backgroundColor: '#b91c1c' }} />
      <View style={S.body}>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#b91c1c', marginBottom: 4 }}>
          ⚠ Cliente Grupo A (Média Tensão)
        </Text>
        <Text style={{ fontSize: 10, color: C.muted, marginBottom: 14 }}>
          {cliente.nome} — verifique estes números antes de enviar a proposta
        </Text>
        <Text style={{ fontSize: 9, color: C.text, marginBottom: 14, lineHeight: 1.6 }}>
          As páginas seguintes (potência, módulos, geração, economia, payback, financiamento)
          foram calculadas como Grupo B — tarifa única, sem demanda contratada. Para este
          cliente de média tensão isso subestima ou superestima a conta real, porque a fatura de
          Grupo A cobra energia em TE Ponta/Fora Ponta separadas mais demanda contratada (kW) —
          muitas vezes o maior item da conta. Os valores abaixo foram calculados corretamente
          para Grupo A.
        </Text>
        <View style={{ marginBottom: 14 }}>
          <View style={S.tblHead}>
            <Text style={[S.tblHeadTxt, { flex: 2 }]}>INDICADOR (GRUPO A)</Text>
            <Text style={[S.tblHeadTxt, { flex: 1, textAlign: 'right' }]}>VALOR</Text>
          </View>
          {[
            ['Potência recomendada', `${N(r.potenciaRealKWp)} kWp`],
            ['Número de módulos', `${r.numeroModulos}`],
            ['Geração mensal estimada', `${N(r.geracaoMensalKWh, 0)} kWh`],
            ['Conta antes (Grupo A)', R(r.contaAntesRS)],
            ['Conta depois (Grupo A)', R(r.contaAposRS)],
            ['Economia mensal (Grupo A)', R(r.economiaMensalRS)],
            ['Economia anual (Grupo A)', R(r.economiaAnualRS)],
          ].map(([label, val]: [string, string], i: number) => (
            <View key={label} style={i % 2 ? S.tblRowAlt : S.tblRow}>
              <Text style={[S.tblCell, { flex: 2 }]}>{label}</Text>
              <Text style={[S.tblCellB, { flex: 1, textAlign: 'right' }]}>{val}</Text>
            </View>
          ))}
        </View>
        {r.houveUltrapassagemDemanda && (
          <Text style={{ fontSize: 8, color: '#92400e', marginBottom: 8, lineHeight: 1.4 }}>
            ⚠ Há ultrapassagem de demanda medida. A fórmula de cobrança de ultrapassagem usada
            aqui não foi confirmada contra o texto literal da REN ANEEL 1.000/2021 nem contra a
            ND da distribuidora — confirme antes de repassar este valor ao cliente.
          </Text>
        )}
        <Text style={{ fontSize: 8, color: C.muted, marginTop: 8 }}>
          Payback, TIR e simulações de financiamento das páginas seguintes NÃO foram
          recalculados com esses números.
        </Text>
      </View>
    </View>
  </Page>
);

// ── Componente principal ───────────────────────────────────────────────────────
export function PropostaComercialPDF({ data }: { data: any }) {
  const { empresa, cliente, kit, dimensionamento: dim, custosRecorrentes: cr,
    precificacao: pre, enquadramento: enq, percentuaisFioBPorAno: pfb,
    consumoMedioMensalKWh, valorMedioMensalRS, indicadores: ind } = data;
  const distrib = DISTRIBUIDORAS.find((d: any) => d.codigo === data.codigoDistribuidora);
  const anoAtual = new Date().getFullYear();
  const simul = ind?.simulacoesFinanciamento ?? [];
  const mostrarAvisoGrupoA = data.consumo?.grupoTensao === 'A' && !!data.resultadoGrupoA;
  // ADICIONADO (set/2026, pedido direto do usuário: "devo poder escolher se
  // as simulações de financiamento vão sair na proposta em cada caso
  // específico"): `?? true` preserva o comportamento antigo (sempre mostra)
  // para qualquer chamador que ainda não passe `opcoesProposta` — ver
  // `buildData()` em App.tsx e `OpcoesProposta` em useProjetoStore.ts.
  const mostrarFinanciamento = data.opcoesProposta?.mostrarFinanciamentoNaProposta ?? true;

  // BUG CORRIGIDO (ago/2026): ver auditoria "geração de documentos", item 5.
  // dim.percentualCompensacaoReal é a razão geração/consumo anual — pode
  // passar de 100% num sistema superdimensionado (kit.percentualCompensacaoDesejado
  // > 100%) e NÃO é a mesma grandeza que "reduza sua conta em até X%". A
  // redução real de conta é economia/conta-antes, com teto em 100% (não dá
  // para reduzir a conta em mais que o valor da própria conta). Verificado
  // com os valores reais do caso auditado: economiaMensalRS=204,97 /
  // contaAntesRS=360,24 => 56,9%, contra os 228% que saíam daqui antes.
  const percReducaoConta = cr?.contaAntesRS > 0
    ? Math.min(100, (cr.economiaMensalRS / cr.contaAntesRS) * 100)
    : 0;

  return (
    <Document title={`Proposta Solar - ${cliente.nome}`} author={empresa.razaoSocial}>

      {mostrarAvisoGrupoA && <AvisoGrupoA empresa={empresa} cliente={cliente} r={data.resultadoGrupoA} />}

      {/* ════ CAPA - foto Lumen como background full-bleed ════ */}
      <Page size="A4" style={{ fontFamily: 'Helvetica', padding: 0 }}>
        {/* Imagem de capa full-page */}
        <Image
          fixed
          src={empresa.fotoCapa || IMG_CAPA}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Overlay com info do cliente no rodapé */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.dark, padding: '18 32 22 32' }}>
          <Text style={{ color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 16, marginBottom: 4 }}>
            {cliente.nome || 'Cliente'}
          </Text>
          <Text style={{ color: '#c9a227', fontSize: 10, marginBottom: 10 }}>
            {cliente.cidade}{cliente.cidade && cliente.uf ? ` - ${cliente.uf}` : cliente.uf}
          </Text>
          {/* Métricas */}
          <View style={{ flexDirection: 'row', gap: 0, marginBottom: 10 }}>
            {[
              [N(dim.potenciaInstaladaRealKWp) + ' kWp', 'Potencia instalada'],
              [R(cr.economiaMensalRS) + '/mes', 'Economia estimada'],
              [ind?.paybackSimples ?? '-', 'Retorno do invest.'],
            ].map(([val, lbl], i) => (
              <View key={i} style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#c9a227', fontFamily: 'Helvetica-Bold', fontSize: 14 }}>{val}</Text>
                <Text style={{ color: '#aaaacc', fontSize: 8, marginTop: 2 }}>{lbl.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: '#666688', fontSize: 8 }}>
            {juntar(`Válida por ${empresa.validadeProposta} dias`, hoje(), empresa.email, empresa.telefone)}
          </Text>
        </View>
      </Page>

      {/* ════ PÁG 1: POR QUE SOLAR? ════ */}
      <Page size="A4" style={S.page}>
        {/* Banner de topo */}
        <Image src={empresa.fotoApoio || IMG_APOIO} style={{ width: '100%', height: 110, objectFit: 'cover', objectPosition: 'center 60%' }} />
        <View style={S.row} wrap={false}>
          <View style={S.band} />
          <View style={S.body}>
            <SectionHeader title="Por que investir em energia solar?" sub="Energia solar é o investimento mais rentável da atualidade - protege contra reajustes tarifários e gera retorno por décadas." />
            <View style={S.benefGrid}>
              {[
                { cor:'#c9a227', Icone:IconEconomia,         title:'Economia imediata',         text:`Reduza sua conta de energia em até ${N(percReducaoConta, 0)}%. A partir do primeiro mês após a conexão.` },
                { cor:'#2563eb', Icone:IconProtecao,         title:'Proteção contra reajustes', text:'A ANEEL reajusta as tarifas anualmente. Com energia solar, você gera sua própria energia e fica protegido.' },
                { cor:'#16a34a', Icone:IconValorizacao,      title:'Valorização do imóvel',     text:'Imóveis com sistema fotovoltaico valem em média 5-8% a mais no mercado. É uma benfeitoria permanente.' },
                { cor:'#059669', Icone:IconSustentabilidade, title:'Sustentabilidade',          text:'Energia 100% renovável, sem emissões de CO2. Cada kWh solar substitui energia de fontes fósseis.' },
                // ADICIONADO (set/2026): quando o toggle "mostrar financiamento"
                // (TabPreco, App.tsx) está desligado para este caso, o card de
                // financiamento aqui na página 1 tinha o MESMO problema que o da
                // página 4 — anunciar parcelamento fora do contexto que o
                // vendedor decidiu omitir. Troca por outro benefício real em vez
                // de deixar o grid com 5 cards (quebraria o layout 2 colunas × 3
                // linhas).
                mostrarFinanciamento
                  ? { cor:'#7c3aed', Icone:IconFinanciamento, title:'Financiamento facilitado', text:'Parcele em até 60x com carência de 60 dias. O sistema se paga com a economia antes de terminar de pagar.' }
                  : { cor:'#7c3aed', Icone:IconManutencao,    title:'Baixa manutenção',          text:'Sem partes móveis. Basta uma limpeza periódica dos módulos — o sistema opera sozinho, monitorado remotamente.' },
                { cor:'#dc2626', Icone:IconVidaUtil,         title:'Vida útil de 25+ anos',     text:'Módulos modernos têm garantia de 25 anos de potência linear. O sistema continua gerando por décadas.' },
              ].map((b, i) => (
                <View key={i} style={S.benefCard}>
                  <View style={{ width:36, height:36, borderRadius:8, backgroundColor:b.cor, alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                    <b.Icone />
                  </View>
                  <Text style={S.benefTitle}>{b.title}</Text>
                  <Text style={S.benefText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* ADICIONADO (set/2026, auditoria de design — usuário relatou "o
                PDF ficou muito genérico"): esta página tinha ~45% de espaço em
                branco abaixo dos cards de benefício (confirmado renderizando o
                PDF real e olhando a página, não só o código — ver metodologia
                de verificação visual desta auditoria). "Como funciona" é
                conteúdo padrão em qualquer proposta comercial de energia solar
                (muitos clientes não entendem geração distribuída/compensação de
                energia) — preenche o espaço com informação real, não enchimento
                decorativo. */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 20, marginBottom: 12 }}>Como funciona</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { n: '1', title: 'Geração', text: 'Os módulos captam a luz do sol e o inversor converte a energia gerada em corrente elétrica compatível com sua rede.' },
                { n: '2', title: 'Compensação', text: 'A energia gerada e não usada na hora vai para a rede da distribuidora, virando crédito no seu relógio (medidor bidirecional).' },
                { n: '3', title: 'Abatimento', text: 'Nos meses/horários de menor geração, você usa os créditos acumulados para abater o consumo da rede — sua conta cai.' },
              ].map((step) => (
                <View key={step.n} style={{ flex: 1, backgroundColor: C.card, borderRadius: 8, padding: '12 14' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text style={{ color: C.gold, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{step.n}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 }}>{step.title}</Text>
                  <Text style={{ fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ════ PÁG 2: SISTEMA PROPOSTO ════ */}
      <Page size="A4" style={S.page}>
        <View style={S.row}>
          <View style={S.band} />
          <View style={S.body}>
            <SectionHeader title="Seu sistema personalizado" sub={`Dimensionado especificamente para compensar o consumo médio de ${N(consumoMedioMensalKWh, 0)} kWh/mês.`} />

            {/* Métricas do sistema */}
            <View style={S.sysGrid}>
              {[
                [N(dim.potenciaInstaladaRealKWp) + ' kWp', 'Potência instalada'],
                [dim.numeroModulos + ' módulos', kit.marcaModulo || 'Fotovoltaicos'],
                [N(dim.geracaoMensalEstimadaKWh, 0) + ' kWh/mês', 'Geração estimada'],
                [N(ind?.areaNecessariaM2 ?? 0) + ' m²', 'Área no telhado'],
              ].map(([val, lbl], i) => (
                <View key={i} style={S.sysStat}>
                  <Text style={S.sysStatVal}>{val}</Text>
                  <Text style={S.sysStatLbl}>{lbl}</Text>
                </View>
              ))}
            </View>

            {/* Equipamentos */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 10 }}>Equipamentos</Text>
            <View style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
              <View style={S.tblHead}>
                <Text style={[S.tblHeadTxt, { flex: 2 }]}>COMPONENTE</Text>
                <Text style={[S.tblHeadTxt, { flex: 3 }]}>ESPECIFICAÇÃO</Text>
                <Text style={[S.tblHeadTxt, { flex: 1 }]}>QUANTIDADE</Text>
              </View>
              {[
                ['Módulo fotovoltaico', `${formatarNomeModulo(kit.marcaModulo, kit.modeloModulo)} - ${kit.potenciaModuloWp}Wp ${formatarTipoModulo(kit.tipoModulo, PRESETS_MODULO)}`, `${kit.quantidade} un.`],
                ['Inversor solar', `${kit.marcaInversor} ${kit.modeloInversor} - ${kit.potenciaInversorKW} kW`, '1 un.'],
                ['Estrutura de fixação', 'Alumínio anodizado - adequada ao tipo de telhado', '1 cj.'],
                ['Cabeamento e proteções', 'Cabos solar 6mm², DPS, disjuntores, conectores MC4', '1 cj.'],
                ['Projeto + documentação', 'Projeto elétrico, ART, memorial descritivo', '1 cj.'],
              ].map(([comp, spec, qty], i) => (
                <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                  <Text style={[S.tblCellB, { flex: 2 }]}>{comp}</Text>
                  <Text style={[S.tblCell, { flex: 3 }]}>{spec}</Text>
                  <Text style={[S.tblCell, { flex: 1 }]}>{qty}</Text>
                </View>
              ))}
            </View>

            {/* Gráfico geração mensal */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 10 }}>Geração x Consumo estimados por mês</Text>
            {ind?.geracaoMensalKWh && (
              <GraficoGeracaoConsumo geracaoMensal={ind.geracaoMensalKWh} consumoMedio={consumoMedioMensalKWh} />
            )}

            {/* ADICIONADO (set/2026, auditoria de design): garantias do
                fabricante já eram preenchidas no cadastro do Kit (TabKit,
                App.tsx) mas não apareciam em nenhum lugar da Proposta
                Comercial — dado real já coletado, relevante pro cliente,
                nunca exibido. */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 20, marginBottom: 10 }}>Garantias do fabricante</Text>
            <View style={S.sysGrid}>
              {[
                [`${kit.garantiaProdutoAnos} anos`, 'Garantia do produto'],
                [`${kit.garantiaPotenciaAnos} anos`, 'Garantia de potência linear'],
                [`${kit.potenciaGarantidaPercent}%`, 'Potência mínima garantida ao final'],
              ].map(([val, lbl], i) => (
                <View key={i} style={S.sysStat}>
                  <Text style={S.sysStatVal}>{val}</Text>
                  <Text style={S.sysStatLbl}>{lbl}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ════ PÁG 3: ANÁLISE FINANCEIRA ════ */}
      <Page size="A4" style={S.page}>
        <View style={S.row}>
          <View style={[S.band, { backgroundColor: C.gold }]} />
          <View style={S.body}>
            <SectionHeader title="Análise financeira" sub="Projeção realista com base no consumo histórico e nas tarifas da distribuidora local." />

            {/* Cards de destaque */}
            <View style={S.finGrid}>
              <View style={[S.finCard, { backgroundColor: C.card, borderRadius: 10, padding: '14 16' }]}>
                <Text style={[S.finLbl, { color: C.muted, marginBottom: 6 }]}>Sua conta hoje</Text>
                <Text style={[S.finVal, { color: C.text }]}>{R(cr.contaAntesRS)}<Text style={{ fontSize: 10 }}>/mês</Text></Text>
              </View>
              <View style={[S.finCard, { backgroundColor: '#f0fdf4', borderRadius: 10, padding: '14 16', borderWidth: 1, borderColor: '#bbf7d0' }]}>
                <Text style={[S.finLbl, { color: C.muted, marginBottom: 6 }]}>Com o sistema solar</Text>
                <Text style={[S.finVal, { color: C.success }]}>{R(cr.totalFixoMensalRS)}<Text style={{ fontSize: 10 }}>/mês</Text></Text>
              </View>
              <View style={S.finCardGold}>
                <Text style={[S.finLbl, { color: C.dark, marginBottom: 6, fontFamily: 'Helvetica-Bold' }]}>Economia imediata</Text>
                <Text style={[S.finVal, { color: C.dark }]}>{R(cr.economiaMensalRS)}<Text style={{ fontSize: 10 }}>/mês</Text></Text>
              </View>
            </View>

            {/* Projeção */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 10 }}>Indicadores de viabilidade</Text>
            <View style={{ backgroundColor: C.card, borderRadius: 10, padding: '14 16', marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              {[
                ['Payback simples', ind?.paybackSimples ?? '-', C.success],
                ['TIR - Taxa interna de retorno', ind?.tirAnualPercent != null ? `${N(ind.tirAnualPercent, 1)}% ao ano` : '-', C.success],
                ['Economia anual estimada (1º ano)', R(cr.economiaMensalRS * 12), C.success],
                ['Economia total em 25 anos', R(ind?.economia25Anos ?? 0), C.success],
                ['Conta mínima mensal após o solar', R(cr.totalFixoMensalRS), C.text],
              ].map(([lbl, val, col], i) => (
                <View key={i} style={S.fRow}>
                  <Text style={S.fRowLbl}>{lbl}</Text>
                  <Text style={[S.fRowVal, { color: col }]}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Economia acumulada / ponto de equilíbrio — ver comentário completo
                em GraficoEconomiaAcumulada acima. */}
            {ind?.fluxoAnualHorizonte && ind.fluxoAnualHorizonte.length > 1 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 10 }}>Economia acumulada ao longo de {ind.fluxoAnualHorizonte.length - 1} anos</Text>
                <GraficoEconomiaAcumulada fluxoAnual={ind.fluxoAnualHorizonte} />
              </View>
            )}

            {/* Nota Fio B */}
            <View style={{ backgroundColor: enq?.elegivelArt26 ? '#f0fdf4' : '#fffbeb', borderRadius: 8, padding: '10 12', borderLeftWidth: 3, borderLeftColor: enq?.elegivelArt26 ? C.success : C.gold }}>
              <Text style={{ fontSize: 9, color: enq?.elegivelArt26 ? '#14532d' : '#78350f', lineHeight: 1.5 }}>
                {enq?.elegivelArt26
                  ? '[OK] Componente Fio B isento sobre a energia compensada até 31/12/2045 (Lei 14.300/2022, art. 26). Máxima economia ao longo da vida útil do sistema.'
                  : `! Componente Fio B (Lei 14.300/2022): custo gradual de ${N((pfb[anoAtual] ?? 0)*100,0)}% em ${anoAtual}, aumentando até 100% em 2029. Já considerado na projeção financeira.`}
              </Text>
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ════ PÁG 4: INVESTIMENTO E FINANCIAMENTO ════ */}
      <Page size="A4" style={S.page}>
        <View style={S.row}>
          <View style={S.band} />
          <View style={S.body}>
            <SectionHeader title={mostrarFinanciamento ? 'Investimento e financiamento' : 'Investimento'} />

            {/* Valor total */}
            <View style={{ backgroundColor: C.dark, borderRadius: 12, padding: '20 24', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 10, color: '#6070a0', marginBottom: 6, letterSpacing: 1 }}>INVESTIMENTO TOTAL</Text>
                <Text style={{ fontSize: 30, fontFamily: 'Helvetica-Bold', color: C.gold }}>{R(pre.precoVenda)}</Text>
              </View>
              <View style={{ textAlign: 'right' }}>
                <Text style={{ fontSize: 9, color: '#6070a0' }}>À vista ou parcelado</Text>
                <Text style={{ fontSize: 9, color: '#8080a0', marginTop: 4 }}>Tudo incluso: equipamentos,{'\n'}instalação, projeto e ART</Text>
              </View>
            </View>

            {/* Opções de financiamento — ADICIONADO (set/2026, pedido direto
                do usuário: "devo poder escolher se as simulações de
                financiamento vão sair na proposta em cada caso específico"):
                os cards Solfácil 48×/60× só aparecem quando o toggle
                "Apresentação da proposta" (TabPreco, App.tsx) está ligado
                para este caso. Ver `mostrarFinanciamento` no topo do
                componente. */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 12 }}>{mostrarFinanciamento ? 'Opções de financiamento' : 'Condição de pagamento'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {/* À vista */}
              <View style={[S.finOpt, { borderTopColor: C.success }]}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>À vista</Text>
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.success, marginBottom: 4 }}>{R(pre.precoVenda)}</Text>
                <Text style={S.finOptDesc}>Melhor condição - sem juros</Text>
                <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                  <Text style={S.finOptDetail}>Payback: {ind?.paybackSimples}</Text>
                  <Text style={S.finOptDetail}>Economia 25 anos: {R(ind?.economia25Anos ?? 0)}</Text>
                </View>
              </View>

              {mostrarFinanciamento && simul[0] && (
                <View style={S.finOpt}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>{simul[0].descricao}</Text>
                  <Text style={S.finOptParcela}>{R(simul[0].parcelaMensal)}<Text style={{ fontSize: 10, fontFamily: 'Helvetica' }}>/mês</Text></Text>
                  <Text style={S.finOptDesc}>60 dias de carência</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={S.finOptDetail}>Total: {R(simul[0].totalPago)}</Text>
                    <Text style={S.finOptDetail}>Payback: {simul[0].paybackAnos != null ? N(simul[0].paybackAnos, 1) + ' anos' : '-'}</Text>
                  </View>
                </View>
              )}

              {mostrarFinanciamento && simul[1] && (
                <View style={S.finOpt}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>{simul[1].descricao}</Text>
                  <Text style={S.finOptParcela}>{R(simul[1].parcelaMensal)}<Text style={{ fontSize: 10, fontFamily: 'Helvetica' }}>/mês</Text></Text>
                  <Text style={S.finOptDesc}>60 dias de carência</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={S.finOptDetail}>Total: {R(simul[1].totalPago)}</Text>
                    <Text style={S.finOptDetail}>Payback: {simul[1].paybackAnos != null ? N(simul[1].paybackAnos, 1) + ' anos' : '-'}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Serviços inclusos */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 12 }}>O que está incluso</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                'Fornecimento e instalação de todos os equipamentos',
                'Estrutura de fixação adequada ao seu telhado',
                'Cabeamento e proteções elétricas (DPS, disjuntores)',
                'Projeto elétrico e ART do engenheiro responsável',
                'Registro e aprovação junto à distribuidora local',
                'Comissionamento e testes do sistema',
                'Suporte técnico pós-instalação',
                'Documentação completa do projeto',
              ].map((svc, i) => (
                <View key={i} style={S.svcRow}>
                  <View style={S.svcDot}><Text style={S.svcDotTxt}>{i+1}</Text></View>
                  <Text style={S.svcTxt}>{svc}</Text>
                </View>
              ))}
            </View>

            {/* ADICIONADO (set/2026, auditoria de design — usuário relatou "o
                PDF ficou muito genérico"): esta página tinha ~45% de espaço em
                branco abaixo de "O que está incluso" (confirmado renderizando
                o PDF real). "Próximos passos" só reorganiza informação que já
                existe em OUTRO ponto da própria proposta — item 4 de
                "Condições e validade" (pág. seguinte) já cita a vistoria
                técnica, e "O que está incluso" acima já lista "Registro e
                aprovação junto à distribuidora local" — nenhum prazo ou dado
                novo/não verificável é inventado aqui, só a sequência real do
                processo, que é padrão em qualquer venda de solar residencial. */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 20, marginBottom: 12 }}>Próximos passos após a aprovação</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { n: '1', title: 'Aprovação e assinatura', text: 'Você aprova a proposta e assina o contrato. Se optar por financiamento, a análise de crédito acontece nesta etapa.' },
                { n: '2', title: 'Projeto e protocolo', text: 'Elaboramos o projeto elétrico e a ART, e protocolamos a documentação junto à distribuidora local.' },
                { n: '3', title: 'Instalação', text: 'Nossa equipe técnica instala o sistema já dimensionado e revisado nesta proposta.' },
                { n: '4', title: 'Vistoria e homologação', text: 'A distribuidora vistoria e troca o medidor. Homologado, o sistema é ligado e passa a gerar energia.' },
              ].map((step) => (
                <View key={step.n} style={{ flex: 1, backgroundColor: C.card, borderRadius: 8, padding: '12 14' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text style={{ color: C.gold, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{step.n}</Text>
                  </View>
                  <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 }}>{step.title}</Text>
                  <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.5 }}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ════ PÁG 5: VALIDADE E ASSINATURAS ════ */}
      <Page size="A4" style={S.page}>
        <View style={S.row}>
          <View style={[S.band, { backgroundColor: C.dark }]} />
          <View style={S.body}>
            <SectionHeader title="Condições e validade" />

            <View style={{ backgroundColor: C.card, borderRadius: 10, padding: '16 20', marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
              {[
                'Os valores de geração de energia são estimativas baseadas no Atlas Solarimétrico CRESESB. A geração real varia conforme condições climáticas, sombreamento e manutenção.',
                'O sistema foi dimensionado para o perfil de consumo atual. Alterações significativas no consumo podem exigir reavaliação do dimensionamento.',
                'Não estão inclusos eventuais serviços de alvenaria, reforço estrutural do telhado ou adequações na rede da distribuidora.',
                'Após aprovação da proposta, será realizada vistoria técnica para confirmação das condições de instalação.',
              ].map((obs, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 8 }}>
                  <Text style={{ fontSize: 9, color: C.gold, fontFamily: 'Helvetica-Bold', width: 14 }}>{i+1}.</Text>
                  <Text style={{ flex: 1, fontSize: 9, color: C.muted, lineHeight: 1.5 }}>{obs}</Text>
                </View>
              ))}
            </View>

            {/* ADICIONADO (set/2026, auditoria de design — usuário relatou "o
                PDF ficou muito genérico"): esta era a última página do
                documento e tinha ~55% de espaço em branco abaixo da faixa de
                validade (confirmado renderizando o PDF real) — a pior página
                pra deixar vazia, é a última impressão antes da assinatura.
                Perguntas frequentes de venda de solar residencial, sem nenhum
                prazo/número não verificável: nada aqui contradiz ou duplica
                dado técnico já apresentado nas páginas anteriores. */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 12 }}>Perguntas frequentes</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {[
                { p: 'Preciso trocar o padrão de entrada de energia?', r: 'Depende da potência do sistema e do padrão atual da unidade. Isso é avaliado na vistoria técnica, sem custo adicional na análise.' },
                { p: 'O sistema funciona em dias nublados ou à noite?', r: 'Em dias nublados a geração é menor, mas não zero. À noite você consome da rede normalmente — os créditos gerados de dia abatem essa energia na fatura.' },
                { p: 'Quem cuida da manutenção do sistema?', r: 'O sistema não tem partes móveis e exige pouquíssima manutenção. Recomendamos limpeza periódica dos módulos; qualquer imprevisto é coberto pelo suporte técnico pós-instalação.' },
                { p: 'Quanto tempo leva até o sistema ser ligado?', r: 'O prazo depende da aprovação da distribuidora local, que foge do nosso controle — mas cuidamos de todo o projeto, ART e protocolo para agilizar ao máximo.' },
              ].map((f, i) => (
                <View key={i} style={{ width: '48%', backgroundColor: C.card, borderRadius: 8, padding: '12 14' }}>
                  <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 5 }}>{f.p}</Text>
                  <Text style={{ fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>{f.r}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: C.dark, borderRadius: 10, padding: '14 18', marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#8080a0' }}>Data de emissão: {hoje()}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.gold }}>Válida até: {new Date(Date.now() + empresa.validadeProposta * 86400000).toLocaleDateString('pt-BR')}</Text>
            </View>

            {/* Assinaturas */}
            <View style={{ flexDirection: 'row', gap: 40, marginTop: 20 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ borderTopWidth: 1.5, borderTopColor: C.dark, width: '100%', paddingTop: 10, marginTop: 40 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'center' }}>{empresa.razaoSocial}</Text>
                  {empresa.responsavelTecnico && <Text style={{ fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 3 }}>{empresa.responsavelTecnico}</Text>}
                  {empresa.crea && <Text style={{ fontSize: 8, color: C.muted, textAlign: 'center', marginTop: 2 }}>{formatarCrea(empresa)}</Text>}
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ borderTopWidth: 1.5, borderTopColor: C.dark, width: '100%', paddingTop: 10, marginTop: 40 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'center' }}>{cliente.nome}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 3 }}>Cliente</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

    </Document>
  );
}
