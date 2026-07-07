/**
 * MEMORIAL DESCRITIVO — documento técnico para aprovação junto à distribuidora.
 * Baseado no modelo exigido pela CEMIG (ND 5.30) e padrões ANEEL.
 * Referência normativa: Lei 14.300/2022, REN ANEEL 1000/2021.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';
import { TIPO_TELHADO_LABELS } from '../../data/localizacao';

const DARK = '#0a0a1e';
const GOLD = '#c9a227';
const BLUE = '#1a3a6e';
const GRAY = '#f0f0f0';
const TEXT = '#1a1a1a';
const MUTED = '#666';

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:9, color:TEXT, backgroundColor:'#fff', paddingBottom:40 },
  // Header de página
  pageHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:2, borderBottomColor:BLUE, paddingBottom:6, marginBottom:14, padding:'8 28 6 28' },
  pageHeaderLogo: { width:40, height:40, objectFit:'contain' },
  pageHeaderTitle: { fontSize:10, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center', flex:1 },
  pageHeaderPage: { fontSize:8, color:MUTED, minWidth:60, textAlign:'right' },
  body: { padding:'0 28 0 28' },
  // Capa
  capaContainer: { flex:1, padding:'40 50', justifyContent:'space-between' },
  capaLogo: { width:120, alignSelf:'center', marginBottom:30 },
  capaTitleBox: { backgroundColor:'#f0f0f0', padding:'20 24', marginBottom:30, borderLeftWidth:4, borderLeftColor:GOLD },
  capaTitle: { fontSize:14, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center', marginBottom:8 },
  capaSub: { fontSize:11, color:TEXT, textAlign:'center', lineHeight:1.5 },
  capaHighlight: { color:GOLD, fontFamily:'Helvetica-Bold' },
  capaDate: { fontSize:11, textAlign:'center', color:MUTED, marginTop:20 },
  // Tabela empresa responsável
  empTable: { borderWidth:1, borderColor:'#333', marginBottom:16 },
  empTableTitle: { backgroundColor:BLUE, padding:'7 10' },
  empTableTitleTxt: { color:'#fff', fontFamily:'Helvetica-Bold', fontSize:10, textAlign:'center' },
  empRow: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#999' },
  empCell: { flex:1, padding:'5 8', borderRightWidth:1, borderRightColor:'#999' },
  empCellLast: { flex:1, padding:'5 8' },
  empLabel: { fontSize:8, fontFamily:'Helvetica-Bold', color:MUTED, marginBottom:2 },
  empVal: { fontSize:9, color:TEXT },
  empRevRow: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#999', backgroundColor:GRAY },
  empRevHead: { flex:1, padding:'5 8', fontFamily:'Helvetica-Bold', fontSize:8, color:MUTED, borderRightWidth:1, borderRightColor:'#999', textAlign:'center' },
  empRevHeadL: { flex:1, padding:'5 8', fontFamily:'Helvetica-Bold', fontSize:8, color:MUTED, textAlign:'center' },
  empRevData: { flex:1, padding:'5 8', fontSize:9, borderRightWidth:1, borderRightColor:'#999', textAlign:'center' },
  empRevDataL: { flex:1, padding:'5 8', fontSize:9, textAlign:'center' },
  // Seções
  secNum: { fontSize:13, fontFamily:'Helvetica-Bold', color:BLUE, marginTop:18, marginBottom:6, borderBottomWidth:1.5, borderBottomColor:BLUE, paddingBottom:3 },
  secNumSub: { fontSize:11, fontFamily:'Helvetica-Bold', color:BLUE, marginTop:12, marginBottom:5 },
  para: { fontSize:9, color:TEXT, lineHeight:1.6, marginBottom:8, textAlign:'justify' },
  bold: { fontFamily:'Helvetica-Bold' },
  // Tabelas técnicas
  tblTitle: { fontFamily:'Helvetica-Bold', fontSize:9, textAlign:'center', marginBottom:4, color:TEXT },
  tbl: { borderWidth:1, borderColor:'#888', marginBottom:12 },
  tblHead: { backgroundColor:BLUE, flexDirection:'row' },
  tblHeadCell: { color:'#fff', fontFamily:'Helvetica-Bold', fontSize:8, padding:'5 8', flex:1, textAlign:'center' },
  tblRow: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc' },
  tblRowAlt: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc', backgroundColor:GRAY },
  tblCellLeft: { flex:2, padding:'4 8', fontSize:8, color:TEXT, fontFamily:'Helvetica-Bold' },
  tblCellRight: { flex:2, padding:'4 8', fontSize:8, color:TEXT },
  // Previsão de geração
  genChart: { marginTop:8, marginBottom:16 },
  genTitle: { fontSize:10, fontFamily:'Helvetica-Bold', textAlign:'center', color:BLUE, marginBottom:8 },
  // Rodapé
  footer: { position:'absolute', bottom:12, left:28, right:28, flexDirection:'row', justifyContent:'space-between', borderTopWidth:1, borderTopColor:'#ccc', paddingTop:4 },
  footerTxt: { fontSize:7, color:MUTED },
});

const fmtN = (v: number, d=1) => v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const hoje = () => new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

function PageHeader({ title, empresa, logo }: { title:string; empresa:any; logo?:string }) {
  return (
    <View style={S.pageHeader} fixed>
      {logo
        ? <Image src={logo} style={{width:36,height:36,objectFit:'contain'}} />
        : <View style={{width:36,height:36,backgroundColor:GOLD,borderRadius:18,alignItems:'center',justifyContent:'center'}}>
            <Text style={{color:DARK,fontFamily:'Helvetica-Bold',fontSize:14}}>L</Text>
          </View>
      }
      <Text style={S.pageHeaderTitle}>MEMORIAL DESCRITIVO</Text>
      <Text style={S.pageHeaderPage} render={({pageNumber,totalPages})=>`Pág. ${pageNumber}/${totalPages}`} />
    </View>
  );
}

function Footer({ empresa }: { empresa:any }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerTxt}>{empresa.razaoSocial} · CNPJ: {empresa.cnpj}</Text>
      <Text style={S.footerTxt}>{empresa.responsavelTecnico} · CREA-{empresa.uf} {empresa.crea}</Text>
    </View>
  );
}

function SpecRow({ label, val, alt }: { label:string; val:string; alt?:boolean }) {
  return (
    <View style={alt ? S.tblRowAlt : S.tblRow}>
      <Text style={S.tblCellLeft}>{label}</Text>
      <Text style={S.tblCellRight}>{val}</Text>
    </View>
  );
}

// Gráfico de barras SVG simples como retângulos View
function GeracaoBarChart({ geracaoMensal }: { geracaoMensal:number[] }) {
  const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const maxV = Math.max(...geracaoMensal) * 1.1;
  const H = 70;
  return (
    <View style={{flexDirection:'row', alignItems:'flex-end', height:H+20, gap:2, paddingHorizontal:4}}>
      {geracaoMensal.map((v,i) => (
        <View key={i} style={{flex:1, alignItems:'center'}}>
          <Text style={{fontSize:6,color:MUTED,marginBottom:2}}>{fmtN(v,0)}</Text>
          <View style={{backgroundColor:GOLD, width:'100%', height:Math.max(3,(v/maxV)*H), borderRadius:2}} />
          <Text style={{fontSize:6,color:MUTED,marginTop:3}}>{meses[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function MemorialDescritivo({ data }: { data:any }) {
  const { empresa, cliente, localizacao, kit, dimensionamento:dim, consumo, indicadores:ind } = data;
  if (!dim) return null;

  const distrib = DISTRIBUIDORAS.find((d:any)=>d.codigo===consumo.codigoDistribuidora) ?? {nome:'', nomeAbreviado:'CEMIG'};
  const potKWp = dim.potenciaInstaladaRealKWp;
  const geracaoAnual = Math.round(dim.geracaoAnualEstimadaKWh);
  const geracaoMensal = Math.round(dim.geracaoMensalEstimadaKWh);
  const area = fmtN(dim.numeroModulos * (kit.comprimentoMm/1000) * (kit.larguraMm/1000) || ind?.areaNecessariaM2 || 0);
  const tensaoSistCC = kit.vocV * kit.modulosPorString;

  return (
    <Document title={`Memorial Descritivo — ${cliente.nome}`} author={empresa.razaoSocial}>

      {/* ═══ CAPA ═══ */}
      <Page size="A4" style={S.page}>
        <View style={S.capaContainer}>
          <View style={{alignItems:'center'}}>
            {empresa.logoBase64
              ? <Image src={empresa.logoBase64} style={{width:130,height:130,objectFit:'contain',marginBottom:20}} />
              : <View style={{width:80,height:80,backgroundColor:GOLD,borderRadius:40,alignItems:'center',justifyContent:'center',marginBottom:20}}>
                  <Text style={{color:DARK,fontFamily:'Helvetica-Bold',fontSize:32}}>L</Text>
                </View>
            }
            <Text style={{fontSize:13,fontFamily:'Helvetica-Bold',color:BLUE,marginBottom:4}}>{empresa.razaoSocial}</Text>
            <Text style={{fontSize:9,color:MUTED}}>{empresa.email} · {empresa.telefone}</Text>
          </View>

          <View style={S.capaTitleBox}>
            <Text style={S.capaTitle}>Memorial descritivo de Sistema de{'\n'}Microgeração Fotovoltaica conectado à rede{'\n'}elétrica de BT com potência instalada de</Text>
            <Text style={[S.capaSub,{marginTop:6}]}>
              <Text style={S.capaHighlight}>{fmtN(potKWp)} kWp em {cliente.cidade}, {cliente.uf}</Text>
            </Text>
          </View>

          <Text style={S.capaDate}>{cliente.cidade}, {hoje()}</Text>
        </View>
      </Page>

      {/* ═══ PÁG 2: EMPRESA + OBJETIVO ═══ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="MEMORIAL DESCRITIVO" empresa={empresa} logo={empresa.logoBase64} />
        <View style={S.body}>

          {/* Empresa responsável */}
          <View style={S.empTable}>
            <View style={S.empTableTitle}><Text style={S.empTableTitleTxt}>EMPRESA RESPONSÁVEL PELO DOCUMENTO</Text></View>
            <View style={S.empRow}>
              <View style={S.empCell}>
                <Text style={S.empLabel}>Razão social:</Text>
                <Text style={S.empVal}>{empresa.razaoSocial}</Text>
              </View>
              <View style={S.empCellLast}>
                <Text style={S.empLabel}>Responsável:</Text>
                <Text style={S.empVal}>{empresa.responsavelTecnico} – CREA {empresa.crea}</Text>
              </View>
            </View>
            <View style={S.empRow}>
              <View style={S.empCell}>
                <Text style={S.empLabel}>CNPJ:</Text>
                <Text style={S.empVal}>{empresa.cnpj}</Text>
              </View>
              <View style={S.empCellLast}>
                <Text style={S.empLabel}>Cargo:</Text>
                <Text style={S.empVal}>Engenheiro Eletricista</Text>
              </View>
            </View>
            <View style={S.empRow}>
              <View style={S.empCell}>
                <Text style={S.empLabel}>Telefone:</Text>
                <Text style={S.empVal}>{empresa.telefone}</Text>
              </View>
              <View style={S.empCellLast}>
                <Text style={S.empLabel}>E-mail:</Text>
                <Text style={S.empVal}>{empresa.email}</Text>
              </View>
            </View>
            {empresa.cidade && <View style={S.empRow}>
              <View style={[S.empCellLast,{flex:2}]}>
                <Text style={S.empLabel}>Endereço para correspondência:</Text>
                <Text style={S.empVal}>{empresa.cidade} – {empresa.uf}</Text>
              </View>
            </View>}
            <View style={S.empRevRow}>
              <Text style={S.empRevHead}>REVISÃO</Text>
              <Text style={S.empRevHead}>DATA</Text>
              <Text style={S.empRevHead}>NATUREZA DA REVISÃO</Text>
              <Text style={S.empRevHeadL}>ELABORAÇÃO</Text>
            </View>
            <View style={S.empRow}>
              <Text style={S.empRevData}>1</Text>
              <Text style={S.empRevData}>{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</Text>
              <Text style={S.empRevData}>EMISSÃO INICIAL</Text>
              <Text style={S.empRevDataL}>{empresa.responsavelTecnico?.split(' ').slice(-1)[0]?.toUpperCase() ?? empresa.razaoSocial}</Text>
            </View>
          </View>

          {/* Objetivo */}
          <Text style={S.secNum}>OBJETIVO DO PROJETO</Text>
          <Text style={S.para}>
            O objetivo deste projeto é a INSTALAÇÃO DE UMA UNIDADE DE MICROGERAÇÃO DE ENERGIA SOLAR FOTOVOLTAICA CONECTADA À REDE ELÉTRICA COM POTÊNCIA INSTALADA DE{' '}
            <Text style={S.bold}>{fmtN(potKWp)} kWp</Text>, cuja finalidade é a geração de energia elétrica e injeção do excedente de energia, se houver, na rede de Baixa Tensão da concessionária distribuidora de energia, caracterizando o sistema de compensação de energia elétrica previsto na Lei nº 14.300/2022 e na RN nº 482 da ANEEL.
          </Text>
          <Text style={S.para}>
            O presente documento descreve os principais aspectos técnicos deste sistema fotovoltaico de capacidade já referida a ser instalado, daqui em diante denominado "UFV (Unidade Fotovoltaica) <Text style={S.bold}>{cliente.nome}</Text>", para fins de consulta de acesso junto à{' '}
            <Text style={S.bold}>{distrib.nome || distrib.nomeAbreviado}</Text>, considerando o disposto na Lei nº 14.300, de 6 de janeiro de 2022, e nas normas da distribuidora local.
          </Text>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ═══ PÁG 3: LOCALIZAÇÃO + DESCRIÇÃO GERAL ═══ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="MEMORIAL DESCRITIVO" empresa={empresa} logo={empresa.logoBase64} />
        <View style={S.body}>

          <Text style={S.secNum}>1  LOCALIZAÇÃO DO SISTEMA FOTOVOLTAICO</Text>
          <Text style={S.para}>
            A instalação irá ocupar aproximadamente <Text style={S.bold}>{area} m²</Text> do telhado, área esta a ser coberta pelos módulos fotovoltaicos que estarão distribuídos em um arranjo com{' '}
            <Text style={S.bold}>{dim.numeroModulos} módulos</Text>. A instalação será realizada no{' '}
            <Text style={S.bold}>{TIPO_TELHADO_LABELS[localizacao.tipoTelhado] ?? localizacao.tipoTelhado}</Text> do(a){' '}
            <Text style={S.bold}>{cliente.nome}</Text>, no município de{' '}
            <Text style={S.bold}>{cliente.cidade}, {cliente.uf}</Text>, com inclinação de{' '}
            <Text style={S.bold}>{localizacao.inclinacaoGraus}°</Text> e orientada ao{' '}
            <Text style={S.bold}>{localizacao.orientacaoPrincipal}</Text>
            {localizacao.desvioAzimuthalGraus !== 0 ? ` com desvio azimutal de ${Math.abs(localizacao.desvioAzimuthalGraus)}°` : ''}.
          </Text>
          {(localizacao.utmE || localizacao.utmN) && (
            <Text style={S.para}>
              A instalação será realizada com as seguintes coordenadas geográficas UTM E (Abscissa):{' '}
              <Text style={S.bold}>{localizacao.utmE}</Text> N (Ordenada):{' '}
              <Text style={S.bold}>{localizacao.utmN}</Text> e Fuso:{' '}
              <Text style={S.bold}>{localizacao.utmFuso}</Text>.
            </Text>
          )}
          {localizacao.numeroUC && (
            <Text style={S.para}>Número da Unidade Consumidora (UC): <Text style={S.bold}>{localizacao.numeroUC}</Text>{localizacao.numeroMedidor ? ` · Nº do medidor: ${localizacao.numeroMedidor}` : ''}.</Text>
          )}

          <Text style={S.secNum}>2  DESCRIÇÃO GERAL DO SISTEMA SOLAR FOTOVOLTAICO</Text>
          <Text style={S.para}>
            Um sistema fotovoltaico montado sobre o telhado é constituído pelos seguintes elementos: o sistema de geração fotovoltaica (módulos fotovoltaicos), os cabos de conexão, o inversor (podendo ser mais de um inversor ou microinversores) e o medidor bidirecional.
          </Text>
          <Text style={S.para}>
            Por meio de cabos a corrente contínua dos módulos fotovoltaicos passa pelo Dispositivo contra Surtos – DPS, chega ao inversor onde é convertida em corrente alternada. Esta energia é consumida localmente e o excedente é injetado na rede pública, mensurado pelo medidor bidirecional.
          </Text>
          <Text style={S.para}>
            Os módulos fotovoltaicos são montados sobre suportes ou trilhos fixos, que por sua vez são fixados sobre o telhado de forma adequada. Os cabos provenientes dos conjuntos de módulos podem ser conectados diretamente ao inversor ou por meio de String Box, dependendo do número de fileiras (strings).
          </Text>
          <Text style={S.para}>
            Os inversores transformam a corrente contínua em corrente alternada sincronizada com a rede elétrica. Em caso de falta de energia na rede, o inversor desliga automaticamente (proteção anti-ilhamento), garantindo a segurança dos técnicos que operam a rede.
          </Text>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ═══ PÁG 4: DESCRIÇÃO DA UFV — MÓDULOS + INVERSOR ═══ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="MEMORIAL DESCRITIVO" empresa={empresa} logo={empresa.logoBase64} />
        <View style={S.body}>

          <Text style={S.secNum}>3  DESCRIÇÃO GERAL DA UFV {cliente.nome?.toUpperCase()}</Text>
          <Text style={S.para}>
            A Usina Fotovoltaica (UFV) sobre {TIPO_TELHADO_LABELS[localizacao.tipoTelhado] ?? 'telhado'} a ser instalada tem como função gerar energia elétrica de origem renovável. Esta energia produzida será parcialmente injetada na rede da concessionária distribuidora ({distrib.nomeAbreviado}).
          </Text>
          <Text style={S.para}>
            O sistema fotovoltaico terá uma potência de pico de <Text style={S.bold}>{fmtN(potKWp)} kWp</Text>, composto por{' '}
            <Text style={S.bold}>{dim.numeroModulos} módulos fotovoltaicos</Text> com potência de{' '}
            <Text style={S.bold}>{kit.potenciaModuloWp} Wp</Text> cada um (modelo <Text style={S.bold}>{kit.marcaModulo} {kit.modeloModulo}</Text>).
            {kit.numStrings > 0 && ` O arranjo é composto por ${kit.numStrings} fileira(s) (string) de ${kit.modulosPorString} módulos cada.`}
          </Text>

          <Text style={S.secNumSub}>3.1  Módulos fotovoltaicos</Text>
          <Text style={S.para}>
            Os módulos fotovoltaicos são do tipo <Text style={S.bold}>{PRESETS_MODULO[kit.tipoModulo as keyof typeof PRESETS_MODULO]?.label ?? kit.tipoModulo}</Text>, protegidos por vidro antirreflexo texturizado.
            {kit.garantiaPotenciaAnos > 0 && ` A garantia de potência tem duração de ${kit.garantiaPotenciaAnos} anos, com ${kit.potenciaGarantidaPercent}% de potência garantida ao final do período.`}
            {kit.garantiaProdutoAnos > 0 && ` Garantia contra defeitos de fabricação: ${kit.garantiaProdutoAnos} anos.`}
          </Text>

          <Text style={S.tblTitle}>Tabela I – Características técnicas do módulo {kit.marcaModulo} {kit.modeloModulo}</Text>
          <View style={S.tbl}>
            <View style={S.tblHead}>
              <Text style={[S.tblHeadCell,{flex:2}]}>CARACTERÍSTICA TÉCNICA</Text>
              <Text style={[S.tblHeadCell,{flex:2}]}>VALOR</Text>
            </View>
            {[
              ['Marca',                           kit.marcaModulo || '—'],
              ['Modelo',                           kit.modeloModulo || '—'],
              ['Potência Nominal (Pmax)',           `${kit.potenciaModuloWp} Wp`],
              ['Tensão de Máxima Potência (Vmpp)', kit.vmppV > 0 ? `${kit.vmppV} V` : '—'],
              ['Corrente de Máxima Potência (Impp)',kit.imppA > 0 ? `${kit.imppA} A` : '—'],
              ['Tensão de Circuito Aberto (Voc)',  kit.vocV > 0 ? `${kit.vocV} V` : '—'],
              ['Corrente de Curto-Circuito (Isc)', kit.iscA > 0 ? `${kit.iscA} A` : '—'],
              ['Comprimento',                      kit.comprimentoMm > 0 ? `${kit.comprimentoMm} mm` : '—'],
              ['Largura',                          kit.larguraMm > 0 ? `${kit.larguraMm} mm` : '—'],
              ['Área do Módulo',                   kit.comprimentoMm > 0 && kit.larguraMm > 0 ? `${fmtN((kit.comprimentoMm*kit.larguraMm)/1e6,4)} m²` : '—'],
              ['Peso',                             kit.pesoKgModulo > 0 ? `${kit.pesoKgModulo} kg` : '—'],
              ['Coef. Temperatura Pmax',           `${PRESETS_MODULO[kit.tipoModulo as keyof typeof PRESETS_MODULO]?.coef ?? -0.34}%/°C`],
              ['Garantia de Potência',             kit.garantiaPotenciaAnos > 0 ? `${kit.garantiaPotenciaAnos} anos (${kit.potenciaGarantidaPercent}%)` : '25 anos'],
              ['Garantia do Produto',              kit.garantiaProdutoAnos > 0 ? `${kit.garantiaProdutoAnos} anos` : '10 anos'],
              ['Certificações',                    kit.certificacoes || 'INMETRO, IEC 61215, IEC 61730'],
            ].map(([lbl,val],i) => <SpecRow key={i} label={lbl} val={val} alt={i%2===1} />)}
          </View>

          <Text style={S.secNumSub}>3.2  Inversor</Text>
          <Text style={S.para}>
            O inversor solar realiza a conversão da energia elétrica em corrente contínua (CC), gerada pelos módulos fotovoltaicos, em corrente alternada (CA), sincronizada com a rede elétrica local. O equipamento é dotado de proteções que impedem o funcionamento em modo ilhado.
          </Text>

          <Text style={S.tblTitle}>Tabela II – Características técnicas do inversor {kit.marcaInversor} {kit.modeloInversor}</Text>
          <View style={S.tbl}>
            <View style={S.tblHead}>
              <Text style={[S.tblHeadCell,{flex:2}]}>CARACTERÍSTICA TÉCNICA</Text>
              <Text style={[S.tblHeadCell,{flex:2}]}>VALOR</Text>
            </View>
            {[
              ['Marca',                    kit.marcaInversor || '—'],
              ['Modelo',                   kit.modeloInversor || '—'],
              ['Potência Nominal de Saída', `${kit.potenciaInversorKW} kW`],
              ['Faixa de Tensão MPPT',     kit.faixaMpptMinV > 0 ? `${kit.faixaMpptMinV}V – ${kit.faixaMpptMaxV}V` : '—'],
              ['Tensão Máxima de Entrada', kit.tensaoMaxEntradaV > 0 ? `${kit.tensaoMaxEntradaV} V` : '—'],
              ['Número de MPPTs',          `${kit.numMppt}`],
              ['Tensão Nominal de Saída',  `${kit.tensaoSaidaV} V CA`],
              ['Corrente Máxima de Saída', kit.corrMaxSaidaA > 0 ? `${kit.corrMaxSaidaA} A` : '—'],
              ['Frequência Nominal',       '60 Hz'],
              ['Fator de Potência',        kit.fatorPotencia || '>0.99'],
              ['Distorção Harmônica (THD)', kit.thd || '<3%'],
              ['Eficiência Máxima',        `${kit.eficienciaInversorPercent}%`],
              ['Classificação do Gabinete', kit.ipGabinete || 'IP65'],
              ['Tensão Máx. CC do Sistema',tensaoSistCC > 0 ? `${fmtN(tensaoSistCC,0)} V` : '—'],
            ].map(([lbl,val],i) => <SpecRow key={i} label={lbl} val={val} alt={i%2===1} />)}
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ═══ PÁG 5: PROTEÇÕES + PREVISÃO ═══ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="MEMORIAL DESCRITIVO" empresa={empresa} logo={empresa.logoBase64} />
        <View style={S.body}>

          <Text style={S.secNumSub}>3.3  Estrutura metálica</Text>
          <Text style={S.para}>
            A estrutura metálica será projetada para uma melhor disposição dos painéis, garantindo durabilidade e resistência quanto a fenômenos naturais, como chuvas fortes e ventos. O material utilizado é alumínio anodizado e aço galvanizado, com tempo de vida semelhante ao dos módulos. Cada módulo fotovoltaico é fixado à estrutura por meio de 4 pontos de fixação, garantindo que os efeitos de dilatação térmica e flexão não causem danos.
          </Text>

          <Text style={S.secNumSub}>3.4  Dispositivos de proteção CC e CA</Text>
          <Text style={S.para}>
            Serão instalados Dispositivos de Proteção contra Surtos (DPS) no lado CA da instalação, entre o inversor e o quadro de distribuição, conforme recomendações da NBR 5410 e normas da distribuidora. Caso a distância entre os módulos e a entrada do inversor seja superior a 15 metros no lado CC, serão instalados DPS também no lado CC. O sistema contará ainda com disjuntor termomagnético de proteção no Quadro de Distribuição Geral de Baixa Tensão.
          </Text>

          <Text style={S.secNumSub}>3.5  Aterramento</Text>
          <Text style={S.para}>
            Todos os módulos fotovoltaicos, estruturas metálicas e carcaças dos inversores serão devidamente aterrados, com a conexão feita junto ao terra da instalação. O sistema de aterramento seguirá as prescrições da NBR 5410 e do fabricante do inversor, conforme Diagrama Unifilar do projeto.
          </Text>

          <Text style={S.secNumSub}>3.6  Medidor bidirecional</Text>
          <Text style={S.para}>
            Será utilizado medidor bidirecional certificado pelo INMETRO e homologado pela concessionária de energia elétrica local ({distrib.nomeAbreviado}), conforme determinação da distribuidora após aprovação do pedido de acesso.
          </Text>

          <Text style={S.secNum}>4  PREVISÃO DA PRODUÇÃO DE ENERGIA</Text>
          <Text style={S.para}>
            O sistema solar fotovoltaico da UFV <Text style={S.bold}>{cliente.nome}</Text> de{' '}
            <Text style={S.bold}>{fmtN(potKWp)} kWp</Text> possui uma estimativa de geração de{' '}
            <Text style={S.bold}>{geracaoAnual.toLocaleString('pt-BR')} kWh/ano</Text>, tendo como média mensal uma geração de{' '}
            <Text style={S.bold}>{geracaoMensal.toLocaleString('pt-BR')} kWh/mês</Text>. Os dados de irradiação solar utilizados são baseados no Atlas Solarimétrico CRESESB para a localidade de {cliente.cidade}, {cliente.uf}.
          </Text>

          {ind?.geracaoMensalKWh && (
            <View style={S.genChart}>
              <Text style={S.genTitle}>Figura – Expectativa de Geração Mensal (kWh)</Text>
              <GeracaoBarChart geracaoMensal={ind.geracaoMensalKWh} />
            </View>
          )}

          {/* Assinatura */}
          <View style={{marginTop:30, alignItems:'center'}}>
            <Text style={{fontSize:9,color:MUTED,marginBottom:4}}>{cliente.cidade}, {hoje()}</Text>
            <View style={{borderTopWidth:1,borderTopColor:TEXT,width:250,paddingTop:8,alignItems:'center',marginTop:20}}>
              <Text style={{fontSize:9,fontFamily:'Helvetica-Bold'}}>{empresa.responsavelTecnico}</Text>
              <Text style={{fontSize:8,color:MUTED}}>{empresa.razaoSocial}</Text>
              {empresa.crea && <Text style={{fontSize:8,color:MUTED}}>CREA-{empresa.uf} {empresa.crea}</Text>}
            </View>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>
    </Document>
  );
}
