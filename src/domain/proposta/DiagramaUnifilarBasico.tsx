/**
 * DUB — DIAGRAMA UNIFILAR BÁSICO
 * ================================
 * Diagrama simplificado (rede → padrão → proteção CA → inversor → strings CC
 * → módulos) com os valores REAIS calculados para o projeto. Reaproveita as
 * mesmas funções já usadas no passo "Kit Solar" da UI e no Memorial
 * Descritivo — nada aqui é recalculado com uma fórmula paralela:
 *   - lado CA: @domain/dimensionamento/calcularCaboCA
 *   - lado CC + DPS: @domain/dimensionamento/calcularProtecaoCC
 *
 * LIMITAÇÃO DECLARADA (ver checklist.ts): este é um diagrama SIMPLIFICADO —
 * mostra topologia e as grandezas elétricas dimensionadas, mas não substitui
 * um projeto elétrico completo com simbologia normalizada (NBR 5444) revisado
 * por um responsável técnico. O documento traz esse aviso de forma visível
 * na própria página, não só em um campo interno — é o mesmo princípio da
 * ART: o software prepara os dados, não assume a responsabilidade técnica.
 */
import type { ReactNode } from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Line, Rect, Circle, Path } from '@react-pdf/renderer';
import { calcularCaboCA } from '@domain/dimensionamento/calcularCaboCA';
import { calcularProtecaoCC, calcularDPSCA } from '@domain/dimensionamento/calcularProtecaoCC';
import { Sup } from './Superscript';
import { PRESETS_MODULO } from '@data/presetsModulo';
import { DISTRIBUIDORAS } from '@data/distribuidoras';

const DARK = '#0a0a1e';
const GOLD = '#c9a227';
const BLUE = '#1a3a6e';
const TEXT = '#1a1a1a';
const MUTED = '#666';
const LINE = '#2a2a2a';

// BUG CORRIGIDO (ago/2026): esta função convertia todo acentuado (e °, ², ³,
// travessão) para ASCII, sob a premissa de que "react-pdf com Helvetica não
// cobre todo Unicode". Premissa falsa PARA ACENTOS — ver o comentário
// completo em `Procuracao.tsx` (mesma correção aplicada lá primeiro): o
// Helvetica padrão do @react-pdf/renderer usa WinAnsiEncoding (cp1252), que
// cobre acentuação PT-BR; MemorialDescritivo.tsx e PropostaComercialPDF.tsx
// já renderizavam acentos corretamente com a mesma fontFamily. Isso fazia o
// nome do cliente ("Ana Maria Vieira de Sá e Silva"), a distribuidora, a
// descrição do DPS e os alertas saírem sem acento no DUB, mesmo com o dado
// de origem correto. Mantida só como guarda contra undefined/null.
//
// RESSALVA (set/2026): "²"/"³" especificamente NÃO seguem essa mesma regra
// — ver Superscript.tsx. Apesar de fazerem parte de cp1252, o glifo desses
// dois símbolos não desenha em NENHUMA fonte core (confirmado rasterizando
// um PDF real, não só lendo código/pdftotext). Por isso "mm²" neste arquivo
// usa o componente <Sup>, nunca o caractere "²" cru — não reintroduzir.
const safe = (s?: string) => s || '';

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:9, color:TEXT, backgroundColor:'#fff', padding:'26 30 40 30' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:2, borderBottomColor:BLUE, paddingBottom:8, marginBottom:14 },
  titulo: { fontSize:14, fontFamily:'Helvetica-Bold', color:BLUE },
  subtitulo: { fontSize:9, color:MUTED, marginTop:2 },
  avisoBox: { backgroundColor:'#fef3c7', borderLeftWidth:4, borderLeftColor:'#d97706', padding:'8 12', marginBottom:14 },
  avisoTxt: { fontSize:8, color:'#78350f', lineHeight:1.5 },
  legendaTitulo: { fontSize:10, fontFamily:'Helvetica-Bold', color:BLUE, marginTop:16, marginBottom:6, borderBottomWidth:1, borderBottomColor:BLUE, paddingBottom:2 },
  tbl: { borderWidth:1, borderColor:'#999', marginBottom:10 },
  tblHead: { backgroundColor:BLUE, flexDirection:'row' },
  tblHeadCell: { color:'#fff', fontFamily:'Helvetica-Bold', fontSize:8, padding:'5 8', flex:1, textAlign:'center' },
  tblRow: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc' },
  tblRowAlt: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc', backgroundColor:'#f0f0f0' },
  tblCellLeft: { flex:2, padding:'4 8', fontSize:8, color:TEXT, fontFamily:'Helvetica-Bold' },
  tblCellRight: { flex:2, padding:'4 8', fontSize:8, color:TEXT },
  alertaBox: { backgroundColor:'#fee2e2', borderLeftWidth:4, borderLeftColor:'#dc2626', padding:'8 12', marginTop:8 },
  alertaTxt: { fontSize:8, color:'#7f1d1d', lineHeight:1.5, marginBottom:2 },
  footer: { position:'absolute', bottom:16, left:30, right:30, borderTopWidth:1, borderTopColor:'#ccc', paddingTop:4, flexDirection:'row', justifyContent:'space-between' },
  footerTxt: { fontSize:7, color:MUTED },
});

const N = (v: number, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

interface BlocoProps { x: number; y: number; w: number; h: number; label: string; sub?: string; }
function Bloco({ x, y, w, h, label, sub }: BlocoProps) {
  // <Rect> só é válido dentro de um <Svg> — cada bloco carrega o seu próprio,
  // posicionado de forma absoluta, em vez de compartilhar o <Svg> das linhas
  // (que teria que anular o strokeDasharray/coordenadas relativas do resto).
  return (
    <>
      <Svg width={w} height={h} style={{ position:'absolute', left:x, top:y }}>
        <Rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={LINE} strokeWidth={1.2} />
      </Svg>
      <Text style={{ position:'absolute', left:x, top:y+h/2-(sub?12:5), width:w, fontSize:7.5, fontFamily:'Helvetica-Bold', textAlign:'center', color:TEXT }}>
        {label}
      </Text>
      {!!sub && (
        <Text style={{ position:'absolute', left:x, top:y+h/2+2, width:w, fontSize:6.5, textAlign:'center', color:MUTED }}>
          {sub}
        </Text>
      )}
    </>
  );
}

function DiagramaSvg({ dados }: { dados: ReturnType<typeof montarDadosDiagrama> }) {
  const { potCA, secaoCA, disjCA, dpsCA, nStrings, modPorString, potModulo, qtdModulos, secaoCC, fusivel, dpsCC, nomeDistribuidora } = dados;
  const bW = 100, bH = 34, gap = 42;
  const xs = [10, 10+bW+gap, 10+2*(bW+gap), 10+3*(bW+gap)];
  const W = xs[3] + bW + 10, H = 220;
  const yLine = 60;
  const midY = yLine + bH/2;

  // Rótulo centrado sob um segmento de linha (entre o fim de um bloco e o início do próximo)
  function RotuloSegmento({ entreIdx, offsetY, texto, cor, bold }: { entreIdx: number; offsetY: number; texto: ReactNode; cor: string; bold?: boolean }) {
    const segX = xs[entreIdx] + bW;
    const segW = gap;
    return (
      <Text style={{ position:'absolute', left:segX, top:midY+offsetY, width:segW, fontSize:6, lineHeight:1, textAlign:'center', color:cor, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica' }}>
        {texto}
      </Text>
    );
  }

  // Fronteira de responsabilidade REDE (acessada) / ACESSANTE — no ponto de
  // conexao, logo apos o padrao de entrada (medidor bidirecional), seguindo
  // o mesmo local usado no exemplo oficial de DUB da CEMIG (Anexo 1) — o
  // layout do diagrama segue esse modelo independente da distribuidora real
  // do projeto, mas o RÓTULO exibido reflete a distribuidora real (ver
  // BUG CORRIGIDO abaixo).
  const fronteiraX = xs[1] + bW + gap / 2;

  return (
    <View style={{ position:'relative', width:W, height:H, marginTop:6, marginBottom:6 }}>
      <Svg width={W} height={H}>
        {/* Fronteira de responsabilidade CEMIG / Acessante (ponto de conexao) */}
        <Line x1={fronteiraX} y1={4} x2={fronteiraX} y2={H-4} stroke="#7f1d1d" strokeWidth={1} strokeDasharray="5,3" />
        {/* Linha CA: rede -> padrao -> disjuntor -> inversor -> strings */}
        <Line x1={xs[0]+bW} y1={midY} x2={xs[1]} y2={midY} stroke={LINE} strokeWidth={1.5} />
        <Line x1={xs[1]+bW} y1={midY} x2={xs[2]} y2={midY} stroke={LINE} strokeWidth={1.5} />
        <Line x1={xs[2]+bW} y1={midY} x2={xs[3]} y2={midY} stroke={LINE} strokeWidth={1.5} strokeDasharray="3,2" />
        {/* Disjuntor: simbolo (X) no meio do segmento padrao->inversor */}
        <Line x1={xs[1]+bW+gap/2-6} y1={midY-6} x2={xs[1]+bW+gap/2+6} y2={midY+6} stroke={BLUE} strokeWidth={1.5} />
        <Line x1={xs[1]+bW+gap/2-6} y1={midY+6} x2={xs[1]+bW+gap/2+6} y2={midY-6} stroke={BLUE} strokeWidth={1.5} />
        {/* DPS CA: triangulo pendurado abaixo do padrao de entrada */}
        <Path d={`M ${xs[1]+14} ${yLine+bH+10} L ${xs[1]+24} ${yLine+bH+26} L ${xs[1]+4} ${yLine+bH+26} Z`} fill="none" stroke="#d97706" strokeWidth={1} />
        <Line x1={xs[1]+14} y1={yLine+bH} x2={xs[1]+14} y2={yLine+bH+10} stroke="#d97706" strokeWidth={1} />

        {/* Terra / aterramento simbolico no padrao de entrada */}
        <Line x1={xs[1]+bW-16} y1={yLine+bH} x2={xs[1]+bW-16} y2={yLine+bH+10} stroke="#15803d" strokeWidth={1} />
        <Line x1={xs[1]+bW-23} y1={yLine+bH+10} x2={xs[1]+bW-9} y2={yLine+bH+10} stroke="#15803d" strokeWidth={1.4} />
        <Line x1={xs[1]+bW-20} y1={yLine+bH+13} x2={xs[1]+bW-12} y2={yLine+bH+13} stroke="#15803d" strokeWidth={1} />
        <Line x1={xs[1]+bW-17} y1={yLine+bH+16} x2={xs[1]+bW-15} y2={yLine+bH+16} stroke="#15803d" strokeWidth={0.8} />

        {/* Fusivel de string: simbolo no meio do segmento inversor->strings (tracejado, lado CC) */}
        <Rect x={xs[2]+bW+gap/2-9} y={midY-4} width={18} height={8} fill="#ffffff" stroke={BLUE} strokeWidth={1} />
      </Svg>

      {/* Zonas de responsabilidade, acima dos blocos, separadas pela linha tracejada da fronteira */}
      <Text style={{ position:'absolute', left:xs[0], top:0, width:(xs[1]+bW)-xs[0], fontSize:6.3, fontFamily:'Helvetica-Bold', textAlign:'center', color:'#7f1d1d' }}>
        {`REDE ${nomeDistribuidora} (ACESSADA)`}
      </Text>
      <Text style={{ position:'absolute', left:xs[2], top:0, width:(xs[3]+bW)-xs[2], fontSize:6.3, fontFamily:'Helvetica-Bold', textAlign:'center', color:'#7f1d1d' }}>
        {'ACESSANTE'}
      </Text>

      <Bloco x={xs[0]} y={yLine} w={bW} h={bH} label={`REDE ${nomeDistribuidora}`} sub="Concessionária" />
      <Bloco x={xs[1]} y={yLine} w={bW} h={bH} label="PADRÃO DE ENTRADA" sub="Medidor bidirecional" />
      <Bloco x={xs[2]} y={yLine} w={bW} h={bH} label={`INVERSOR${potCA?` ${N(potCA,1)}kW`:''}`} sub={dados.marcaInversor} />
      <Bloco x={xs[3]} y={yLine} w={bW} h={bH} label={`STRING(S) FV (CC)`} sub={`${nStrings}x${modPorString}=${qtdModulos} mod. ${potModulo?`${potModulo}Wp`:''}`} />

      {/* Aviso obrigatorio de retorno de energia junto ao medidor bidirecional
          (padrao CEMIG para pontos de conexao com geracao distribuida) */}
      <View style={{ position:'absolute', left:xs[1]-6, top:yLine-13, width:bW+12, borderWidth:0.8, borderColor:'#b91c1c', backgroundColor:'#fee2e2', paddingVertical:1 }}>
        <Text style={{ fontSize:5.4, fontFamily:'Helvetica-Bold', textAlign:'center', color:'#7f1d1d' }}>
          {'CUIDADO - RETORNO DE ENERGIA'}
        </Text>
      </View>

      {/* Rótulos de proteção — sempre centrados sob o segmento a que se referem, nunca sobre um bloco */}
      {/* "mm²" usa <Sup> (./Superscript.tsx), não o caractere "²" cru — ver
          o comentário completo lá: o glifo de "²" não desenha em nenhuma
          fonte core deste app (Helvetica), mesmo com o caractere certo
          codificado no PDF (bug só visível rasterizando o PDF, não com
          pdftotext nem com os testes de extração de texto deste projeto). */}
      <RotuloSegmento entreIdx={1} offsetY={-16} texto={`Disjuntor ${disjCA}A`} cor={BLUE} bold />
      <RotuloSegmento entreIdx={1} offsetY={4} texto={<>Cabo CA {secaoCA}mm<Sup base={6}>2</Sup></>} cor={MUTED} />
      <RotuloSegmento entreIdx={2} offsetY={-16} texto={`Fusível ${fusivel||'-'}A`} cor={BLUE} bold />
      <RotuloSegmento entreIdx={2} offsetY={4} texto={<>Cabo CC {secaoCC}mm<Sup base={6}>2</Sup></>} cor={MUTED} />
      <RotuloSegmento entreIdx={2} offsetY={17} texto={`DPS CC ${dpsCC}kA`} cor={BLUE} />

      <Text style={{ position:'absolute', left:xs[1]-14, top:yLine+bH+29, width:56, fontSize:6.3, textAlign:'center', color:'#d97706' }}>
        {`DPS CA ${dpsCA}kA`}
      </Text>
      <Text style={{ position:'absolute', left:xs[1]+bW-58, top:yLine+bH+19, width:60, fontSize:5.6, textAlign:'right', color:'#15803d' }}>
        {'Terra/aterramento'}
      </Text>
    </View>
  );
}

function montarDadosDiagrama(data: any) {
  const kit = data.kit || {};
  // BUG CORRIGIDO (ago/2026): os rótulos "REDE CEMIG" no diagrama eram
  // hardcoded, ignorando data.consumo.codigoDistribuidora — um projeto de
  // outra distribuidora (ex: outra concessionária de MG, ou de outro
  // estado) gerava um DUB identificando a rede errada, documento que é
  // efetivamente enviado à distribuidora real. Mesmo padrão de busca já
  // usado em MemorialDescritivo.tsx/Procuracao.tsx (fallback CEMIG, mercado
  // primário da Lumen Soluções, mantendo consistência com o resto do app).
  const distrib = DISTRIBUIDORAS.find((d: any) => d.codigo === data.consumo?.codigoDistribuidora) ?? { nomeAbreviado: 'CEMIG' };
  const nomeDistribuidora = safe((distrib.nomeAbreviado || 'CEMIG').toUpperCase());
  const potCA = kit.potenciaInversorKW || 0;
  const tensaoCA = kit.tensaoSaidaV || 220;
  const fp = parseFloat(String(kit.fatorPotencia || '>0.99').replace('>','')) || 0.99;
  const icaNominal = potCA > 0 ? (potCA * 1000) / (tensaoCA * fp) : 0;
  const icaProjeto = icaNominal * 1.25;

  // BUG CORRIGIDO (ago/2026): tipoLigacao estava hardcoded em 'bifasica', ignorando
  // o valor real (data.consumo.tipoLigacao) — mesmo bug corrigido em
  // ComponentesRecomendados (App.tsx). Para trifásico, α=1,73 em vez de 2.
  // BUG CORRIGIDO (ago/2026): mesmo bug do ComponentesRecomendados em App.tsx —
  // `kit.corrMaxSaidaA || icaProjeto/1.25` nunca aplicava o fator 1,25 (NBR 16690
  // §5.4) em nenhum dos dois caminhos. Ver comentário completo em App.tsx.
  const caboCA = calcularCaboCA({
    corrMaxSaidaA: kit.corrMaxSaidaA > 0 ? kit.corrMaxSaidaA * 1.25 : icaProjeto,
    tensaoSaidaV: tensaoCA,
    tipoLigacao: (data.consumo?.tipoLigacao as 'monofasica'|'bifasica'|'trifasica') || 'bifasica',
    temperaturaAmbienteC: kit.temperaturaInstalacaoC || 40,
    comprimentoCaboCAm: kit.comprimentoCaboCAm || 10,
  });
  const dpsCAResult = calcularDPSCA(potCA);
  const coefVoc = PRESETS_MODULO[kit.tipoModulo as keyof typeof PRESETS_MODULO]?.coef ?? -0.34;
  const protecaoCC = calcularProtecaoCC({
    iscA: kit.iscA || 0,
    vocV: kit.vocV || 0,
    numStrings: kit.numStrings || 1,
    modulosPorString: kit.modulosPorString || 1,
    coeficienteTemperaturaPercentPorC: coefVoc,
    temperaturaInstalacaoC: kit.temperaturaInstalacaoC || 40,
  });

  return {
    potCA, secaoCA: caboCA.secaoMm2, disjCA: caboCA.disjuntorA, dpsCA: dpsCAResult.classeKA,
    marcaInversor: safe(`${kit.marcaInversor||''} ${kit.modeloInversor||''}`).trim(),
    nStrings: kit.numStrings || 1, modPorString: kit.modulosPorString || 1,
    qtdModulos: kit.quantidade || 0, potModulo: kit.potenciaModuloWp || 0,
    secaoCC: protecaoCC.secaoCaboMm2, fusivel: protecaoCC.fusivelStringA, dpsCC: protecaoCC.dpsClasseKA,
    caboCA, protecaoCC, nomeDistribuidora,
  };
}

export function DiagramaUnifilarBasico({ data }: { data: any }) {
  const { empresa = {}, cliente = {}, localizacao = {} } = data;
  const dados = montarDadosDiagrama(data);
  const alertas: string[] = [...(dados.caboCA.alertas||[]), ...(dados.protecaoCC.alertas||[])];

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.titulo}>DIAGRAMA UNIFILAR BÁSICO (DUB)</Text>
            <Text style={S.subtitulo}>{safe(cliente.nome || 'Cliente')} - {safe(cliente.cidade||'')}{cliente.uf?`/${cliente.uf}`:''} {localizacao.numeroUC?`- UC ${localizacao.numeroUC}`:''}</Text>
          </View>
          <Text style={{ fontSize:8, color:MUTED }}>{safe(empresa.nomeFantasia || empresa.razaoSocial || '')}</Text>
        </View>

        <View style={S.avisoBox}>
          <Text style={S.avisoTxt}>
            AVISO: Diagrama unifilar SIMPLIFICADO gerado automaticamente a partir dos dados do projeto (potências,
            correntes, proteções calculadas conforme NBR 5410 e NBR 16690). Não substitui um projeto elétrico
            completo com simbologia normalizada (NBR 5444) e exige revisão e assinatura (ART) de um responsável
            técnico habilitado antes de submissão à distribuidora. Conforme exemplo oficial de DUB da CEMIG (Anexo
            1), o diagrama deve representar TODOS os módulos fotovoltaicos e inversores da central geradora — para
            sistemas com mais de um inversor, edite manualmente o PDF (ou o diagrama fonte) para acrescentar as
            unidades adicionais antes do envio, pois este gerador automático desenha apenas 1 bloco de inversor.
          </Text>
        </View>

        <DiagramaSvg dados={dados} />

        <Text style={S.legendaTitulo}>PROTEÇÃO E CABEAMENTO — LADO CA (calculado: NBR 5410, curso Processo Homologatório)</Text>
        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={S.tblHeadCell}>GRANDEZA</Text>
            <Text style={S.tblHeadCell}>VALOR</Text>
          </View>
          {[
            ['Corrente de projeto (Ib)', `${N(dados.caboCA.ibA)} A`],
            ['Seção do cabo CA', <>{dados.caboCA.secaoMm2} mm<Sup base={8}>2</Sup></>],
            ['Disjuntor CA (In)', `${dados.caboCA.disjuntorA} A`],
            ['DPS CA', `${dados.dpsCA} kA — ${safe(calcularDPSCA(dados.potCA).descricao)}`],
            ['Queda de tensão CA', `${N(dados.caboCA.quedaTensaoPct,2)}% ${dados.caboCA.quedaTensaoOk ? '(<= 4%, OK)' : '(> 4%, ATENÇÃO)'}`],
          ].map(([lbl,val],i) => (
            <View key={i} style={i%2===1?S.tblRowAlt:S.tblRow}>
              <Text style={S.tblCellLeft}>{lbl}</Text>
              <Text style={S.tblCellRight}>{val}</Text>
            </View>
          ))}
        </View>

        <Text style={S.legendaTitulo}>PROTEÇÃO E CABEAMENTO — LADO CC (calculado: NBR 16690:2019)</Text>
        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={S.tblHeadCell}>GRANDEZA</Text>
            <Text style={S.tblHeadCell}>VALOR</Text>
          </View>
          {[
            ['Configuração das strings', `${dados.nStrings} string(s) x ${dados.modPorString} módulo(s) = ${dados.qtdModulos} módulos`],
            ['Corrente de curto-circuito total (Isc)', `${N(dados.protecaoCC.correnteCurtoCircuitoTotalA)} A`],
            ['Seção do cabo CC (solar)', <>{dados.protecaoCC.secaoCaboMm2} mm<Sup base={8}>2</Sup></>],
            ['Fusível de string', dados.protecaoCC.fusivelStringA > 0 ? `${dados.protecaoCC.fusivelStringA} A` : 'a definir'],
            ['DPS CC', `${dados.protecaoCC.dpsClasseKA} kA`],
            ['Voc do sistema (STC)', `${N(dados.protecaoCC.vocSistemaV,0)} V`],
            ['Voc máximo no frio (5°C)', `${N(dados.protecaoCC.vocMaximoFrioV,0)} V de ${dados.protecaoCC.limiteTensaoV} V ${dados.protecaoCC.dentroDoLimiteTensao ? '(OK)' : '(EXCEDE O LIMITE)'}`],
          ].map(([lbl,val],i) => (
            <View key={i} style={i%2===1?S.tblRowAlt:S.tblRow}>
              <Text style={S.tblCellLeft}>{lbl}</Text>
              <Text style={S.tblCellRight}>{val}</Text>
            </View>
          ))}
        </View>

        {alertas.length > 0 && (
          <View style={S.alertaBox}>
            {alertas.map((a, i) => <Text key={i} style={S.alertaTxt}>ATENÇÃO: {safe(a)}</Text>)}
          </View>
        )}

        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>{safe(empresa.razaoSocial||'')} - CNPJ: {empresa.cnpj||'-'}</Text>
          <Text style={S.footerTxt}>Diagrama simplificado — requer revisão de responsável técnico (ART)</Text>
        </View>
      </Page>
    </Document>
  );
}
