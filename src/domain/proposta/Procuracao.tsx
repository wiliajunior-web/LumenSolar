/**
 * PROCURAÇÃO — Instrumento Particular de Mandato
 * Usa apenas caracteres ASCII/Latin-1 para garantir renderização correta no PDF.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';

const GOLD  = '#c9a227';
const BLUE  = '#1a3a6e';
const TEXT  = '#1a1a1a';
const MUTED = '#555555';

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:11, color:TEXT, backgroundColor:'#ffffff', padding:'45 55 55 55', lineHeight:1.65 },
  header:    { alignItems:'center', marginBottom:30 },
  logo:      { width:80, height:80, objectFit:'contain', marginBottom:10 },
  logoBox:   { width:60, height:60, backgroundColor:GOLD, borderRadius:30, alignItems:'center', justifyContent:'center', marginBottom:10 },
  logoL:     { color:'#1a1a1a', fontFamily:'Helvetica-Bold', fontSize:26 },
  razao:     { fontSize:14, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center' },
  cnpj:      { fontSize:9, color:MUTED, textAlign:'center', marginTop:2 },
  faixa:     { height:3, backgroundColor:GOLD, width:100, marginTop:10, alignSelf:'center' },
  titulo:    { fontSize:19, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center', letterSpacing:4, marginTop:22, marginBottom:4 },
  subtit:    { fontSize:10, textAlign:'center', color:MUTED, marginBottom:26, letterSpacing:1 },
  secLabel:  { fontSize:11, fontFamily:'Helvetica-Bold', color:BLUE, marginTop:18, marginBottom:5, borderBottomWidth:1, borderBottomColor:'#dddddd', paddingBottom:3 },
  corpo:     { fontSize:11, color:TEXT, textAlign:'justify', lineHeight:1.7 },
  bold:      { fontFamily:'Helvetica-Bold' },
  validBox:  { marginTop:18, padding:'10 14', backgroundColor:'#f8f8f8', borderRadius:6 },
  localData: { textAlign:'center', marginTop:26, fontSize:11, color:MUTED },
  assinatRow:{ flexDirection:'row', justifyContent:'space-around', marginTop:48 },
  assinatBox:{ alignItems:'center', width:'44%' },
  linha:     { borderTopWidth:1, borderTopColor:TEXT, width:'100%', paddingTop:8, alignItems:'center', marginTop:28 },
  assinatNome:   { fontSize:10, fontFamily:'Helvetica-Bold', textAlign:'center' },
  assinatDetalhe:{ fontSize:9, color:MUTED, textAlign:'center', marginTop:2 },
  rodape:    { position:'absolute', bottom:20, left:55, right:55, borderTopWidth:1, borderTopColor:'#eeeeee', paddingTop:5, flexDirection:'row', justifyContent:'space-between' },
  rodapeTxt: { fontSize:7, color:'#aaaaaa' },
});

// Formatar apenas caracteres seguros para PDF
const safe = (s?: string) => (s || '').replace(/[À-Å]/g,'A').replace(/[à-å]/g,'a').replace(/Ç/g,'C').replace(/ç/g,'c').replace(/[È-Ë]/g,'E').replace(/[è-ë]/g,'e').replace(/[Ì-Ï]/g,'I').replace(/[ì-ï]/g,'i').replace(/[Ò-Ö]/g,'O').replace(/[ò-ö]/g,'o').replace(/[Ù-Ü]/g,'U').replace(/[ù-ü]/g,'u').replace(/Ñ/g,'N').replace(/ñ/g,'n').replace(/º/g,'o').replace(/ª/g,'a');

const fmtCPF = (v?: string) => {
  const d = (v||'').replace(/\D/g,'');
  return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : (v||'___.___.___-__');
};

const hoje = () => {
  const d = new Date();
  const M = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`;
};

export function Procuracao({ data }: { data: any }) {
  const empresa  = data?.empresa  || {};
  const cliente  = data?.cliente  || {};
  const consumo  = data?.consumo  || {};
  const loc      = data?.localizacao || {};

  const distrib = DISTRIBUIDORAS.find((d:any) => d.codigo === consumo.codigoDistribuidora);
  const distribNome = safe(distrib?.nome?.toUpperCase() || 'CEMIG - COMPANHIA ENERGETICA DE MINAS GERAIS');

  const ecMap: Record<string,string> = { solteiro:'solteiro(a)', casado:'casado(a)', divorciado:'divorciado(a)', viuvo:'viuvo(a)', outro:'' };

  const nomeCliente = safe(cliente.nome || '___________________________').toUpperCase();
  const cpfCliente  = fmtCPF(cliente.cpf);
  const rgCliente   = safe(cliente.rg || '______________');
  const profissao   = safe(cliente.profissao || '______________');
  const ecCivil     = ecMap[cliente.estadoCivil] || 'solteiro(a)';
  const endereco    = safe(cliente.endereco || '___________________________');
  const cidade      = safe([cliente.cidade, cliente.uf].filter(Boolean).join(' - ') || '_______________');
  const ucNum       = loc.numeroUC || '';
  const endInst     = safe(loc.enderecoInstalacao || endereco);

  const razaoSoc    = safe(empresa.razaoSocial || 'Lumen Solucoes Ltda');
  const cnpjEmp     = empresa.cnpj || '__.___.___/____-__';
  const cidadeEmp   = safe([empresa.cidade, empresa.uf].filter(Boolean).join(' - ') || '');
  const nomeEng     = safe(empresa.responsavelTecnico || '___________________________');
  const cpfEng      = fmtCPF(empresa.cpfEngenheiro);
  const creaEng     = empresa.crea ? `CREA-${empresa.uf || 'MG'} ${empresa.crea}` : '____________';
  const cidadeLoc   = safe(cliente.cidade || empresa.cidade || '_________________');

  return (
    <Document title={`Procuracao - ${cliente.nome || ''}`} author={razaoSoc}>
      <Page size="A4" style={S.page}>

        {/* Cabecalho */}
        <View style={S.header}>
          {empresa.logoBase64
            ? <Image src={empresa.logoBase64} style={S.logo} />
            : <View style={S.logoBox}><Text style={S.logoL}>L</Text></View>
          }
          <Text style={S.razao}>{razaoSoc}</Text>
          <Text style={S.cnpj}>CNPJ: {cnpjEmp}{cidadeEmp ? ` - ${cidadeEmp}` : ''}</Text>
          <View style={S.faixa} />
        </View>

        {/* Titulo */}
        <Text style={S.titulo}>PROCURACAO</Text>
        <Text style={S.subtit}>INSTRUMENTO PARTICULAR DE MANDATO</Text>

        {/* OUTORGANTE */}
        <Text style={S.secLabel}>OUTORGANTE:</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{nomeCliente}</Text>
          {`, brasileiro(a), ${ecCivil}, ${profissao}, inscrito(a) no RG no: `}
          <Text style={S.bold}>{rgCliente}</Text>
          {` e no CPF sob o no: `}
          <Text style={S.bold}>{cpfCliente}</Text>
          {`, residente e domiciliado(a) `}
          <Text style={S.bold}>{endereco}</Text>
          {`, na cidade de `}
          <Text style={S.bold}>{cidade}</Text>
          {'.'}
        </Text>

        {/* OUTORGADO */}
        <Text style={S.secLabel}>OUTORGADO(S):</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{razaoSoc}</Text>
          {`, CNPJ no ${cnpjEmp}${cidadeEmp ? `, com sede em ${cidadeEmp}` : ''}, na pessoa do(a) Engenheiro(a) `}
          <Text style={S.bold}>{nomeEng}</Text>
          {cpfEng !== '___.___.___-__' ? `, CPF no ${cpfEng}` : ''}
          {`, inscrito(a) no `}
          <Text style={S.bold}>{creaEng}</Text>
          {'.'}
        </Text>

        {/* PODERES */}
        <Text style={S.secLabel}>PODERES:</Text>
        <Text style={S.corpo}>
          {'Atraves do presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui como seu(s) procurador(es) o(s) OUTORGADO(S), a quem confere '}
          <Text style={S.bold}>amplos poderes</Text>
          {' para efetuar requerimentos, juntar documentos, verificar andamento de processos, solicitar informacoes, satisfazer exigencias, retirar copias, certidoes, extratos, guias, documentos e informacoes, regularizar, enfim, praticar todos os atos necessarios para representar e defender os direitos e interesses do(a) OUTORGANTE relativos a '}
          <Text style={S.bold}>{distribNome}</Text>
          {', referentes a solicitacao de acesso ao Sistema de Compensacao de Energia Eletrica (SCEE) e a instalacao do sistema de microgeracao solar fotovoltaica no imovel situado em '}
          <Text style={S.bold}>{endInst}</Text>
          {ucNum ? `, UC no ${ucNum}` : ''}
          {', nos termos da Lei no 14.300/2022 e das normas da ANEEL.'}
        </Text>

        {/* Validade */}
        <View style={S.validBox}>
          <Text style={S.corpo}>
            <Text style={S.bold}>A presente Procuracao tem validade indeterminada</Text>
            {', permanecendo em vigor ate o cumprimento integral do seu objeto ou ate revogacao expressa pelo(a) Outorgante.'}
          </Text>
        </View>

        {/* Local e data */}
        <Text style={S.localData}>{cidadeLoc}, {hoje()}.</Text>

        {/* Assinaturas */}
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

        {/* Rodape */}
        <View style={S.rodape}>
          <Text style={S.rodapeTxt}>{razaoSoc} - CNPJ: {cnpjEmp}</Text>
          <Text style={S.rodapeTxt}>{safe(empresa.email || '')} - {safe(empresa.telefone || '')}</Text>
        </View>

      </Page>
    </Document>
  );
}
