/**
 * PROCURAÇÃO — Instrumento Particular de Mandato
 * Folha única (A4). Apenas ASCII para garantir renderização.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';

const GOLD = '#c9a227';
const BLUE = '#1a3a6e';
const TEXT = '#1a1a1a';
const MUTED= '#555555';

const S = StyleSheet.create({
  page:       { fontFamily:'Helvetica', fontSize:10, color:TEXT, backgroundColor:'#ffffff',
                padding:'30 50 40 50', lineHeight:1.55 },
  header:     { flexDirection:'row', alignItems:'center', gap:14, marginBottom:16,
                borderBottomWidth:2, borderBottomColor:GOLD, paddingBottom:12 },
  logo:       { width:52, height:52, objectFit:'contain' },
  logoBox:    { width:52, height:52, backgroundColor:GOLD, borderRadius:26,
                alignItems:'center', justifyContent:'center' },
  logoL:      { color:'#1a1a1a', fontFamily:'Helvetica-Bold', fontSize:22 },
  headerText: { flex:1 },
  razao:      { fontSize:13, fontFamily:'Helvetica-Bold', color:BLUE },
  cnpjTxt:    { fontSize:8, color:MUTED, marginTop:2 },
  faixaH:     { height:2, backgroundColor:GOLD, width:60, marginTop:6 },
  titulo:     { fontSize:16, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center',
                letterSpacing:3, marginTop:12, marginBottom:2 },
  subtit:     { fontSize:8.5, textAlign:'center', color:MUTED, marginBottom:14, letterSpacing:0.8 },
  secLabel:   { fontSize:9, fontFamily:'Helvetica-Bold', color:BLUE, marginTop:12,
                marginBottom:3, textTransform:'uppercase', letterSpacing:0.5 },
  corpo:      { fontSize:10, color:TEXT, textAlign:'justify', lineHeight:1.6 },
  bold:       { fontFamily:'Helvetica-Bold' },
  validBox:   { marginTop:12, padding:'7 12', backgroundColor:'#f5f5f5',
                borderRadius:5, borderLeftWidth:3, borderLeftColor:GOLD },
  localData:  { textAlign:'center', marginTop:18, fontSize:10, color:MUTED },
  assinatRow: { flexDirection:'row', justifyContent:'space-around', marginTop:30 },
  assinatBox: { alignItems:'center', width:'44%' },
  linha:      { borderTopWidth:1, borderTopColor:TEXT, width:'100%',
                paddingTop:6, alignItems:'center', marginTop:24 },
  assinatNome:    { fontSize:9.5, fontFamily:'Helvetica-Bold', textAlign:'center' },
  assinatDetalhe: { fontSize:8.5, color:MUTED, textAlign:'center', marginTop:1.5 },
  rodape:     { position:'absolute', bottom:16, left:50, right:50,
                borderTopWidth:1, borderTopColor:'#eeeeee', paddingTop:4,
                flexDirection:'row', justifyContent:'space-between' },
  rodapeTxt:  { fontSize:7, color:'#aaaaaa' },
});

// Converte acentuados para ASCII (react-pdf com Helvetica nao suporta Unicode completo)
const safe = (s?: string) => (s || '')
  .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[àáâãä]/g,'a')
  .replace(/Ç/g,'C').replace(/ç/g,'c')
  .replace(/[ÈÉÊË]/g,'E').replace(/[èéêë]/g,'e')
  .replace(/[ÌÍÎÏ]/g,'I').replace(/[ìíîï]/g,'i')
  .replace(/[ÒÓÔÕÖ]/g,'O').replace(/[òóôõö]/g,'o')
  .replace(/[ÙÚÛÜ]/g,'U').replace(/[ùúûü]/g,'u')
  .replace(/Ñ/g,'N').replace(/ñ/g,'n')
  .replace(/°/g,'o').replace(/²/g,'2').replace(/³/g,'3')
  .replace(/×/g,'x').replace(/–/g,'-').replace(/—/g,'-')
  .replace(/[""]/g,'"').replace(/['']/g,"'");

const fmtCPF = (v?: string) => {
  const d = (v || '').replace(/\D/g, '');
  return d.length === 11
    ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    : (v && v.trim() ? safe(v) : '___.___.___-__');
};

const hoje = () => {
  const d = new Date();
  const M = ['janeiro','fevereiro','marco','abril','maio','junho',
             'julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`;
};

export function Procuracao({ data }: { data: any }) {
  const empresa = data?.empresa  || {};
  const cliente = data?.cliente  || {};
  const consumo = data?.consumo  || {};
  const loc     = data?.localizacao || {};

  const distrib = DISTRIBUIDORAS.find((d: any) => d.codigo === consumo.codigoDistribuidora);
  const distribNome = safe(distrib?.nome?.toUpperCase() || 'CEMIG - COMPANHIA ENERGETICA DE MINAS GERAIS');

  const ecMap: Record<string,string> = {
    solteiro:'solteiro(a)', casado:'casado(a)',
    divorciado:'divorciado(a)', viuvo:'viuvo(a)', outro:''
  };

  // Dados do OUTORGANTE (cliente)
  const nomeCliente = safe(cliente.nome || '').toUpperCase() || '___________________________';
  const cpfCliente  = fmtCPF(cliente.cpf);
  const rgCliente   = safe(cliente.rg  || '______________');
  const profissao   = safe(cliente.profissao || '______________');
  const ecCivil     = ecMap[cliente.estadoCivil] || 'solteiro(a)';
  const endCliente  = safe(cliente.endereco || '___________________________');
  const cidadeCliente = safe([cliente.cidade, cliente.uf].filter(Boolean).join(' - ') || '_______________');
  const endInstalacao = safe(loc.enderecoInstalacao || cliente.endereco || '___________________________');
  const ucNum       = loc.numeroUC || '';

  // Dados do OUTORGADO (empresa/engenheiro)
  const razaoSoc  = safe(empresa.razaoSocial || 'Lumen Solucoes Ltda');
  const cnpjEmp   = empresa.cnpj || '__.___.___/____-__';
  const cidadeEmp = safe([empresa.cidade, empresa.uf].filter(Boolean).join(' - ') || '');
  const nomeEng   = safe(empresa.responsavelTecnico || '___________________________');
  const cpfEng    = fmtCPF(empresa.cpfEngenheiro);
  const creaEng   = empresa.crea ? `CREA-${empresa.uf || 'MG'} ${empresa.crea}` : '____________';
  const cidadeLoc = safe(cliente.cidade || empresa.cidade || '_________________');

  return (
    <Document title={`Procuracao - ${cliente.nome || ''}`} author={razaoSoc}>
      <Page size="A4" style={S.page}>

        {/* ─ Cabeçalho compacto ─ */}
        <View style={S.header}>
          {empresa.logoBase64
            ? <Image src={empresa.logoBase64} style={S.logo} />
            : <View style={S.logoBox}><Text style={S.logoL}>L</Text></View>}
          <View style={S.headerText}>
            <Text style={S.razao}>{razaoSoc}</Text>
            <Text style={S.cnpjTxt}>CNPJ: {cnpjEmp}{cidadeEmp ? ` - ${cidadeEmp}` : ''}</Text>
            {empresa.telefone ? <Text style={S.cnpjTxt}>{safe(empresa.telefone)}{empresa.email ? ` - ${safe(empresa.email)}` : ''}</Text> : null}
            <View style={S.faixaH} />
          </View>
        </View>

        {/* ─ Título ─ */}
        <Text style={S.titulo}>PROCURACAO</Text>
        <Text style={S.subtit}>INSTRUMENTO PARTICULAR DE MANDATO</Text>

        {/* ─ OUTORGANTE ─ */}
        <Text style={S.secLabel}>Outorgante (Cliente):</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{nomeCliente}</Text>
          {`, brasileiro(a), ${ecCivil}, ${profissao}, portador(a) do RG no `}
          <Text style={S.bold}>{rgCliente}</Text>
          {` e do CPF no `}
          <Text style={S.bold}>{cpfCliente}</Text>
          {`, residente e domiciliado(a) na `}
          <Text style={S.bold}>{endCliente}</Text>
          {`, municipio de `}
          <Text style={S.bold}>{cidadeCliente}</Text>
          {'.'}
        </Text>

        {/* ─ OUTORGADO ─ */}
        <Text style={S.secLabel}>Outorgado(s) (Empresa Responsavel):</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{razaoSoc}</Text>
          {`, CNPJ no `}
          <Text style={S.bold}>{cnpjEmp}</Text>
          {cidadeEmp ? `, com sede em ${cidadeEmp}` : ''}
          {', na pessoa do(a) Engenheiro(a) '}
          <Text style={S.bold}>{nomeEng}</Text>
          {cpfEng !== '___.___.___-__' ? `, CPF no ${cpfEng},` : ','}
          {` inscrito(a) no `}
          <Text style={S.bold}>{creaEng}</Text>
          {'.'}
        </Text>

        {/* ─ PODERES ─ */}
        <Text style={S.secLabel}>Poderes Outorgados:</Text>
        <Text style={S.corpo}>
          {'Atraves do presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui como seu(s) procurador(es) o(s) OUTORGADO(S), conferindo-lhe(s) '}
          <Text style={S.bold}>amplos poderes</Text>
          {' para efetuar requerimentos, juntar documentos, verificar andamento de processos, solicitar informacoes, satisfazer exigencias, retirar copias, certidoes e documentos, praticar todos os atos necessarios para representar o(a) OUTORGANTE perante a '}
          <Text style={S.bold}>{distribNome}</Text>
          {', referentes ao acesso ao Sistema de Compensacao de Energia Eletrica (SCEE) e a instalacao do sistema de microgeracao fotovoltaica localizado em '}
          <Text style={S.bold}>{endInstalacao}</Text>
          {ucNum ? `, UC no ${ucNum}` : ''}
          {', conforme Lei no 14.300/2022 e normas da ANEEL.'}
        </Text>

        {/* ─ Validade ─ */}
        <View style={S.validBox}>
          <Text style={S.corpo}>
            <Text style={S.bold}>Validade: </Text>
            {'Esta Procuracao tem validade indeterminada, permanecendo em vigor ate o cumprimento integral do seu objeto ou ate revogacao expressa pelo(a) Outorgante.'}
          </Text>
        </View>

        {/* ─ Local e data ─ */}
        <Text style={S.localData}>{cidadeLoc}, {hoje()}.</Text>

        {/* ─ Assinaturas ─ */}
        <View style={S.assinatRow}>
          <View style={S.assinatBox}>
            <View style={S.linha}>
              <Text style={S.assinatNome}>{nomeCliente}</Text>
              <Text style={S.assinatDetalhe}>OUTORGANTE</Text>
              {cpfCliente !== '___.___.___-__' && <Text style={S.assinatDetalhe}>CPF: {cpfCliente}</Text>}
            </View>
          </View>
          <View style={S.assinatBox}>
            <View style={S.linha}>
              <Text style={S.assinatNome}>{razaoSoc}</Text>
              <Text style={S.assinatDetalhe}>OUTORGADO</Text>
              <Text style={S.assinatDetalhe}>{nomeEng}</Text>
              <Text style={S.assinatDetalhe}>{creaEng}</Text>
            </View>
          </View>
        </View>

        {/* ─ Rodapé ─ */}
        <View style={S.rodape}>
          <Text style={S.rodapeTxt}>{razaoSoc} - CNPJ: {cnpjEmp}</Text>
          <Text style={S.rodapeTxt}>{safe(empresa.email || '')} {safe(empresa.telefone || '')}</Text>
        </View>

      </Page>
    </Document>
  );
}
