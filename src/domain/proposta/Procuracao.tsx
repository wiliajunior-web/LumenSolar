/**
 * PROCURAÇÃO — instrumento particular de mandato.
 * Autoriza o engenheiro/empresa a representar o cliente perante a distribuidora.
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const BLUE = '#1a3a6e';
const GOLD = '#c9a227';
const TEXT = '#1a1a1a';
const DARK = '#0a0a1e';
const MUTED = '#666';

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:10, color:TEXT, backgroundColor:'#fff', padding:'40 50 50 50' },
  header: { alignItems:'center', marginBottom:30 },
  logo: { width:100, height:100, objectFit:'contain', marginBottom:12 },
  empresa: { fontSize:13, fontFamily:'Helvetica-Bold', color:BLUE, marginBottom:2 },
  subEmpresa: { fontSize:9, color:MUTED },
  faixa: { height:3, backgroundColor:GOLD, width:200, alignSelf:'center', marginTop:12 },
  titulo: { fontSize:18, fontFamily:'Helvetica-Bold', color:BLUE, textAlign:'center', marginTop:24, marginBottom:6, letterSpacing:3 },
  subtitulo: { fontSize:10, textAlign:'center', color:MUTED, marginBottom:24, letterSpacing:1 },
  secao: { marginBottom:16 },
  secaoTitulo: { fontSize:10, fontFamily:'Helvetica-Bold', color:BLUE, marginBottom:6, borderBottomWidth:1, borderBottomColor:BLUE, paddingBottom:3 },
  para: { fontSize:10, lineHeight:1.7, textAlign:'justify', color:TEXT },
  bold: { fontFamily:'Helvetica-Bold' },
  itemPoder: { flexDirection:'row', marginBottom:5, gap:6 },
  itemBullet: { fontSize:10, color:GOLD, width:12 },
  itemTxt: { flex:1, fontSize:10, lineHeight:1.5 },
  assinaturas: { flexDirection:'row', justifyContent:'space-around', marginTop:50 },
  assinaturaBox: { alignItems:'center', width:'45%' },
  assinaturaLinha: { borderTopWidth:1, borderTopColor:TEXT, width:'100%', paddingTop:8, alignItems:'center', marginTop:40 },
  assinaturaNome: { fontSize:10, fontFamily:'Helvetica-Bold', textAlign:'center' },
  assinaturaDetalhe: { fontSize:8, color:MUTED, textAlign:'center', marginTop:3 },
  rodape: { position:'absolute', bottom:20, left:50, right:50, borderTopWidth:1, borderTopColor:'#ddd', paddingTop:6, flexDirection:'row', justifyContent:'space-between' },
  rodapeTxt: { fontSize:7, color:MUTED },
  destaque: { backgroundColor:'#f8f0d0', padding:'8 12', borderRadius:4, marginBottom:10, borderLeftWidth:3, borderLeftColor:GOLD },
  destaqueTxt: { fontSize:9, color:'#5a3a00', lineHeight:1.5 },
});

const hoje = () => new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
const fmtCPF = (cpf:string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');

export function Procuracao({ data }: { data:any }) {
  const { empresa, cliente, consumo, localizacao } = data;
  const distrib = (() => {
    try {
      const { DISTRIBUIDORAS } = require('../../data/distribuidoras');
      return DISTRIBUIDORAS.find((d:any)=>d.codigo===consumo.codigoDistribuidora)?.nome ?? 'distribuidora local';
    } catch { return 'distribuidora local'; }
  })();

  const estadoCivilMap: Record<string,string> = {
    solteiro:'solteiro(a)', casado:'casado(a)', divorciado:'divorciado(a)', viuvo:'viúvo(a)', outro:'—'
  };

  return (
    <Document title={`Procuração — ${cliente.nome}`} author={empresa.razaoSocial}>
      <Page size="A4" style={S.page}>

        {/* Cabeçalho */}
        <View style={S.header}>
          {empresa.logoBase64
            ? <Image src={empresa.logoBase64} style={S.logo} />
            : <View style={{width:70,height:70,backgroundColor:GOLD,borderRadius:35,alignItems:'center',justifyContent:'center',marginBottom:10}}>
                <Text style={{color:DARK,fontFamily:'Helvetica-Bold',fontSize:28}}>L</Text>
              </View>
          }
          <Text style={S.empresa}>{empresa.razaoSocial}</Text>
          <Text style={S.subEmpresa}>CNPJ: {empresa.cnpj} · CREA-{empresa.uf} {empresa.crea}</Text>
          <View style={S.faixa} />
        </View>

        {/* Título */}
        <Text style={S.titulo}>PROCURAÇÃO</Text>
        <Text style={S.subtitulo}>INSTRUMENTO PARTICULAR DE MANDATO</Text>

        {/* Outorgante */}
        <View style={S.secao}>
          <Text style={S.secaoTitulo}>OUTORGANTE (CLIENTE)</Text>
          <Text style={S.para}>
            <Text style={S.bold}>{cliente.nome || '[Nome do cliente]'}</Text>
            {cliente.estadoCivil ? `, ${estadoCivilMap[cliente.estadoCivil] ?? cliente.estadoCivil}` : ''}
            {cliente.profissao ? `, ${cliente.profissao}` : ''}
            {cliente.rg ? `, portador(a) do RG nº ${cliente.rg}` : ''}
            {cliente.cpf ? ` e do CPF nº ${fmtCPF(cliente.cpf.replace(/\D/g,'').padEnd(11,'0'))}` : ''}
            {(cliente.endereco || (localizacao?.enderecoInstalacao) || cliente.cidade)
              ? `, residente e domiciliado(a) ${(cliente.endereco || localizacao?.enderecoInstalacao) ? `à ${cliente.endereco || localizacao?.enderecoInstalacao}` : ''}, no município de ${cliente.cidade} – ${cliente.uf}`
              : ''}.
          </Text>
        </View>

        {/* Outorgado */}
        <View style={S.secao}>
          <Text style={S.secaoTitulo}>OUTORGADO (EMPRESA RESPONSÁVEL)</Text>
          <Text style={S.para}>
            <Text style={S.bold}>{empresa.razaoSocial}</Text>, CNPJ nº{' '}
            <Text style={S.bold}>{empresa.cnpj}</Text>
            {empresa.cidade ? `, com sede em ${empresa.cidade} – ${empresa.uf}` : ''}
            , na pessoa do(a) Engenheiro(a) Responsável{' '}
            <Text style={S.bold}>{empresa.responsavelTecnico}</Text>
            {empresa.cpfEngenheiro ? `, CPF nº ${fmtCPF(empresa.cpfEngenheiro.replace(/\D/g,'').padEnd(11,'0'))}` : ''}
            {empresa.crea ? `, inscrito(a) no CREA sob o nº ${empresa.crea}` : ''}.
          </Text>
        </View>

        {/* Poderes */}
        <View style={S.secao}>
          <Text style={S.secaoTitulo}>PODERES OUTORGADOS</Text>
          <Text style={[S.para,{marginBottom:10}]}>
            Pelo presente instrumento particular de mandato, o(a) <Text style={S.bold}>OUTORGANTE</Text> nomeia e constitui seu bastante procurador(a) o(a) <Text style={S.bold}>OUTORGADO</Text>, a quem confere amplos poderes para representá-lo(a) perante a concessionária de energia elétrica <Text style={S.bold}>{distrib}</Text>, especialmente para:
          </Text>
          {[
            'Protocolar, requerer e acompanhar o pedido de acesso ao Sistema de Compensação de Energia Elétrica (SCEE), nos termos da Lei nº 14.300/2022 e normas da ANEEL;',
            'Assinar documentos, formulários e termos de responsabilidade técnica referentes ao sistema de microgeração fotovoltaica a ser instalado no imóvel do(a) Outorgante;',
            'Providenciar e assinar o Formulário de Solicitação de Acesso (FSA) e demais documentos exigidos pela distribuidora para aprovação do projeto;',
            'Retirar, depositar, apresentar e receber documentos e correspondências relacionadas ao processo de acesso junto à distribuidora;',
            'Representar o(a) Outorgante em reuniões, vistorias técnicas e diligências necessárias à aprovação e conexão do sistema fotovoltaico à rede elétrica;',
            'Praticar todos os demais atos necessários ao fiel cumprimento deste mandato, relacionados à instalação e conexão do sistema de energia solar fotovoltaica.',
          ].map((poder,i) => (
            <View key={i} style={S.itemPoder}>
              <Text style={S.itemBullet}>☑</Text>
              <Text style={S.itemTxt}>{poder}</Text>
            </View>
          ))}
        </View>

        {/* Objeto */}
        {(localizacao?.enderecoInstalacao || cliente.endereco || cliente.cidade) && (
          <View style={S.destaque}>
            <Text style={S.destaqueTxt}>
              <Text style={{fontFamily:'Helvetica-Bold'}}>Objeto: </Text>
              Sistema de microgeração de energia solar fotovoltaica a ser instalado em:{' '}
              {localizacao?.enderecoInstalacao || cliente.endereco || `${cliente.cidade} – ${cliente.uf}`}.
              {localizacao?.numeroUC ? ` UC nº ${localizacao.numeroUC}.` : ''}
            </Text>
          </View>
        )}

        {/* Validade */}
        <Text style={[S.para,{marginBottom:20}]}>
          Esta procuração é outorgada para fins específicos de representação perante a concessionária de energia elétrica, sendo válida pelo prazo necessário à conclusão dos procedimentos de acesso ao SCEE.
        </Text>

        {/* Data e local */}
        <Text style={[S.para,{textAlign:'center',marginBottom:4}]}>
          {cliente.cidade || empresa.cidade}, {hoje()}
        </Text>

        {/* Assinaturas */}
        <View style={S.assinaturas}>
          <View style={S.assinaturaBox}>
            <View style={S.assinaturaLinha}>
              <Text style={S.assinaturaNome}>{cliente.nome || '[Nome do Cliente]'}</Text>
              <Text style={S.assinaturaDetalhe}>OUTORGANTE</Text>
              {cliente.cpf && <Text style={S.assinaturaDetalhe}>CPF: {fmtCPF(cliente.cpf.replace(/\D/g,'').padEnd(11,'0'))}</Text>}
            </View>
          </View>
          <View style={S.assinaturaBox}>
            <View style={S.assinaturaLinha}>
              <Text style={S.assinaturaNome}>{empresa.razaoSocial}</Text>
              <Text style={S.assinaturaDetalhe}>OUTORGADO</Text>
              <Text style={S.assinaturaDetalhe}>{empresa.responsavelTecnico}</Text>
              {empresa.crea && <Text style={S.assinaturaDetalhe}>CREA-{empresa.uf} {empresa.crea}</Text>}
            </View>
          </View>
        </View>

        {/* Rodapé */}
        <View style={S.rodape}>
          <Text style={S.rodapeTxt}>{empresa.razaoSocial} · CNPJ: {empresa.cnpj}</Text>
          <Text style={S.rodapeTxt}>{empresa.email} · {empresa.telefone}</Text>
        </View>
      </Page>
    </Document>
  );
}
