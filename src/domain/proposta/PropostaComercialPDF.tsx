/**
 * PROPOSTA COMERCIAL — para envio ao cliente.
 * NÃO mostra: ART, estrutura, materiais, impostos, margem, custos internos.
 * Foco: benefícios, economia, sistema, financiamento, validade.
 */
import {
  Document, Page, Text, View, StyleSheet, Image, Svg, Rect, G,
} from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';
import { MESES_LABELS } from '../../data/hspMensal';

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
  tblHead: { flexDirection: 'row', backgroundColor: C.dark, padding: '7 10' },
  tblHeadTxt: { color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  tblRow: { flexDirection: 'row', padding: '7 10', borderBottomWidth: 1, borderBottomColor: C.border },
  tblRowAlt: { flexDirection: 'row', padding: '7 10', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
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
  svcRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
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

const Footer = ({ empresa }: { empresa: any }) => (
  <View style={S.footer} fixed>
    <Text style={S.footerTxt}>{empresa.nomeFantasia || empresa.razaoSocial} · {empresa.telefone} · {empresa.email}</Text>
    <Text style={S.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
  </View>
);

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={S.secTitleBig}>{title}</Text>
    <View style={S.secBar} />
    {sub && <Text style={S.secSub}>{sub}</Text>}
  </View>
);

// ── Gráfico de barras (SVG) ───────────────────────────────────────────────────
const GraficoGeracaoConsumo = ({ geracaoMensal, consumoMedio }: { geracaoMensal: number[], consumoMedio: number }) => {
  const maxVal = Math.max(...geracaoMensal, consumoMedio) * 1.15;
  const W = 460, H = 90, barW = 13, gap = 26;
  const meses = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  return (
    <View>
      <Svg width={W} height={H + 22}>
        {geracaoMensal.map((gen, i) => {
          const hGen  = Math.max(2, (gen / maxVal) * H);
          const hCons = Math.max(2, (consumoMedio / maxVal) * H);
          const x = i * gap + 14;
          return (
            <G key={i}>
              <Rect x={x}              y={H - hCons} width={barW * 0.47} height={hCons} fill="#d8d4c8" rx={2} />
              <Rect x={x + barW * 0.5} y={H - hGen}  width={barW * 0.47} height={hGen}  fill="#c9a227" rx={2} />
              <Text style={{ fontSize: 7, fill: '#9590a8' }} x={x + barW / 2} y={H + 12}>{meses[i]}</Text>
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
          <Text style={{ fontSize: 8, color: C.muted }}>Geração estimada</Text>
        </View>
      </View>
    </View>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────
export function PropostaComercialPDF({ data }: { data: any }) {
  const { empresa, cliente, kit, dimensionamento: dim, custosRecorrentes: cr,
    precificacao: pre, enquadramento: enq, percentuaisFioBPorAno: pfb,
    consumoMedioMensalKWh, valorMedioMensalRS, indicadores: ind } = data;
  const distrib = DISTRIBUIDORAS.find((d: any) => d.codigo === data.codigoDistribuidora);
  const anoAtual = new Date().getFullYear();
  const simul = ind?.simulacoesFinanciamento ?? [];

  return (
    <Document title={`Proposta Solar — ${cliente.nome}`} author={empresa.razaoSocial}>

      {/* ════ CAPA ════ */}
      <Page size="A4" style={S.pageD}>
        <View style={{ flex: 1, padding: '36 40', justifyContent: 'space-between' }}>
          {/* Topo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 40 }}>
            {empresa.logoBase64
              ? <Image src={empresa.logoBase64} style={{ width: 48, height: 48, borderRadius: 24 }} />
              : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.dark, fontFamily: 'Helvetica-Bold', fontSize: 20 }}>L</Text>
                </View>
            }
            <View>
              <Text style={{ color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 14, letterSpacing: 2 }}>LUMEN SOLAR</Text>
              <Text style={{ color: '#6070a0', fontSize: 9 }}>{empresa.razaoSocial}</Text>
            </View>
          </View>

          {/* Título */}
          <View>
            <View style={S.capaBadge}><Text style={S.capaBadgeTxt}>PROPOSTA COMERCIAL</Text></View>
            <Text style={S.capaTitulo}>Energia Solar{'\n'}Personalizada</Text>
            <Text style={S.capaCliente}>{cliente.nome}</Text>
            <Text style={S.capaLocal}>{cliente.cidade}{cliente.cidade && cliente.uf ? ` — ${cliente.uf}` : cliente.uf} · {hoje()}</Text>
          </View>

          {/* Métricas de destaque */}
          <View style={S.capaMetrics}>
            <View style={S.metric}>
              <Text style={S.metricVal}>{N(dim.potenciaInstaladaRealKWp)} kWp</Text>
              <Text style={S.metricLbl}>POTÊNCIA INSTALADA</Text>
            </View>
            <View style={S.metric}>
              <Text style={S.metricVal}>{R(cr.economiaMensalRS)}</Text>
              <Text style={S.metricLbl}>ECONOMIA / MÊS</Text>
            </View>
            <View style={S.metric}>
              <Text style={[S.metricVal, { color: '#58d68d' }]}>{ind?.paybackSimples ?? '—'}</Text>
              <Text style={S.metricLbl}>RETORNO DO INVESTIMENTO</Text>
            </View>
          </View>

          {/* Rodapé da capa */}
          <View style={S.capaRodape}>
            <View>
              <Text style={S.capaEmpNome}>{empresa.nomeFantasia || empresa.razaoSocial}</Text>
              <Text style={S.capaEmpInfo}>{[empresa.telefone, empresa.email, empresa.crea && `CREA-${empresa.uf} ${empresa.crea}`].filter(Boolean).join('  ·  ')}</Text>
            </View>
            <Text style={S.capaValidade}>Válida por {empresa.validadeProposta} dias{'\n'}a partir de {hoje()}</Text>
          </View>
        </View>
      </Page>

      {/* ════ PÁG 1: POR QUE SOLAR? ════ */}
      <Page size="A4" style={S.page}>
        <View style={S.row} wrap={false}>
          <View style={S.band} />
          <View style={S.body}>
            <SectionHeader title="Por que investir em energia solar?" sub="Energia solar é o investimento mais rentável da atualidade — protege contra reajustes tarifários e gera retorno por décadas." />
            <View style={S.benefGrid}>
              {[
                ['💰', 'Economia imediata', `Reduza sua conta de energia em até ${N(dim.percentualCompensacaoReal * 100, 0)}%. A partir do primeiro mês após a conexão.`],
                ['📈', 'Proteção contra reajustes', 'A ANEEL reajusta as tarifas anualmente. Com energia solar, você gera sua própria energia e fica protegido.'],
                ['🏠', 'Valorização do imóvel', 'Imóveis com sistema fotovoltaico valem em média 5-8% a mais no mercado. É uma benfeitoria permanente.'],
                ['🌱', 'Sustentabilidade', 'Energia 100% renovável, sem emissões de CO₂. Cada kWh solar substitui energia de fontes fósseis.'],
                ['💳', 'Financiamento facilitado', 'Parcele em até 60× com carência de 60 dias. O sistema se paga com a economia antes de terminar de pagar.'],
                ['⏱', 'Vida útil de 25+ anos', 'Módulos modernos têm garantia de 25 anos de potência linear. O sistema continua gerando por décadas.'],
              ].map(([icon, title, text], i) => (
                <View key={i} style={S.benefCard}>
                  <Text style={S.benefIcon}>{icon}</Text>
                  <Text style={S.benefTitle}>{title}</Text>
                  <Text style={S.benefText}>{text}</Text>
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
                ['Módulo fotovoltaico', `${kit.marcaModulo} ${kit.modeloModulo} — ${kit.potenciaModuloWp}Wp ${kit.tipoModulo}`, `${kit.quantidade} un.`],
                ['Inversor solar', `${kit.marcaInversor} ${kit.modeloInversor} — ${kit.potenciaInversorKW} kW`, '1 un.'],
                ['Estrutura de fixação', 'Alumínio anodizado — adequada ao tipo de telhado', '1 cj.'],
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
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 10 }}>Geração × Consumo estimados por mês</Text>
            {ind?.geracaoMensalKWh && (
              <GraficoGeracaoConsumo geracaoMensal={ind.geracaoMensalKWh} consumoMedio={consumoMedioMensalKWh} />
            )}
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
                ['Payback simples', ind?.paybackSimples ?? '—', C.success],
                ['TIR — Taxa interna de retorno', ind?.tirAnualPercent != null ? `${N(ind.tirAnualPercent, 1)}% ao ano` : '—', C.success],
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

            {/* Nota Fio B */}
            <View style={{ backgroundColor: enq?.elegivelArt26 ? '#f0fdf4' : '#fffbeb', borderRadius: 8, padding: '10 12', borderLeftWidth: 3, borderLeftColor: enq?.elegivelArt26 ? C.success : C.gold }}>
              <Text style={{ fontSize: 9, color: enq?.elegivelArt26 ? '#14532d' : '#78350f', lineHeight: 1.5 }}>
                {enq?.elegivelArt26
                  ? '✅ Componente Fio B isenta sobre a energia compensada até 31/12/2045 (Lei 14.300/2022, art. 26). Máxima economia ao longo da vida útil do sistema.'
                  : `⚠️ Componente Fio B (Lei 14.300/2022): custo gradual de ${N((pfb[anoAtual] ?? 0)*100,0)}% em ${anoAtual}, aumentando até 100% em 2029. Já considerado na projeção financeira.`}
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
            <SectionHeader title="Investimento e financiamento" />

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

            {/* Opções de financiamento */}
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 12 }}>Opções de financiamento</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {/* À vista */}
              <View style={[S.finOpt, { borderTopColor: C.success }]}>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>À vista</Text>
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.success, marginBottom: 4 }}>{R(pre.precoVenda)}</Text>
                <Text style={S.finOptDesc}>Melhor condição — sem juros</Text>
                <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                  <Text style={S.finOptDetail}>Payback: {ind?.paybackSimples}</Text>
                  <Text style={S.finOptDetail}>Economia 25 anos: {R(ind?.economia25Anos ?? 0)}</Text>
                </View>
              </View>

              {/* Solfácil 48x */}
              {simul[0] && (
                <View style={S.finOpt}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>{simul[0].descricao}</Text>
                  <Text style={S.finOptParcela}>{R(simul[0].parcelaMensal)}<Text style={{ fontSize: 10, fontFamily: 'Helvetica' }}>/mês</Text></Text>
                  <Text style={S.finOptDesc}>60 dias de carência</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={S.finOptDetail}>Total: {R(simul[0].totalPago)}</Text>
                    <Text style={S.finOptDetail}>Payback: {simul[0].paybackAnos != null ? N(simul[0].paybackAnos, 1) + ' anos' : '—'}</Text>
                  </View>
                </View>
              )}

              {/* Solfácil 60x */}
              {simul[1] && (
                <View style={S.finOpt}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 }}>{simul[1].descricao}</Text>
                  <Text style={S.finOptParcela}>{R(simul[1].parcelaMensal)}<Text style={{ fontSize: 10, fontFamily: 'Helvetica' }}>/mês</Text></Text>
                  <Text style={S.finOptDesc}>60 dias de carência</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={S.finOptDetail}>Total: {R(simul[1].totalPago)}</Text>
                    <Text style={S.finOptDetail}>Payback: {simul[1].paybackAnos != null ? N(simul[1].paybackAnos, 1) + ' anos' : '—'}</Text>
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
                  {empresa.crea && <Text style={{ fontSize: 8, color: C.muted, textAlign: 'center', marginTop: 2 }}>CREA-{empresa.uf} {empresa.crea}</Text>}
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
