/**
 * PLANTA DE SITUAÇÃO — imagem de satélite georreferenciada + UTM
 * ==================================================================
 * Documento exigido pela CEMIG (ND 5.30) para localizar a instalação. O
 * mosaico de satélite e o marcador já vêm prontos (bitmap) do serviço
 * `@renderer/services/satelliteMosaic` — este componente só monta a página
 * em volta da imagem: título, dados da UC, coordenadas e a conferência
 * entre a UTM que o usuário digitou (passo "Local") e a UTM do endereço
 * geocodificado (mesma fórmula do botão "Buscar coordenadas UTM" — ver
 * @domain/geografia/converterCoordenadas).
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { latLonParaUTM, distanciaUTM } from '@domain/geografia/converterCoordenadas';
import type { ResultadoMosaicoSatelite } from '../../renderer/services/satelliteMosaic';

const BLUE = '#1a3a6e';
const GOLD = '#c9a227';
const TEXT = '#1a1a1a';
const MUTED = '#666';

const safe = (s?: string) => (s || '')
  .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[àáâãä]/g,'a')
  .replace(/Ç/g,'C').replace(/ç/g,'c')
  .replace(/[ÈÉÊË]/g,'E').replace(/[èéêë]/g,'e')
  .replace(/[ÌÍÎÏ]/g,'I').replace(/[ìíîï]/g,'i')
  .replace(/[ÒÓÔÕÖ]/g,'O').replace(/[òóôõö]/g,'o')
  .replace(/[ÙÚÛÜ]/g,'U').replace(/[ùúûü]/g,'u')
  .replace(/Ñ/g,'N').replace(/ñ/g,'n')
  .replace(/°/g,'o').replace(/²/g,'2').replace(/³/g,'3')
  .replace(/×/g,'x').replace(/–/g,'-').replace(/—/g,'-');

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:9, color:TEXT, backgroundColor:'#fff', padding:'26 30 40 30' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:2, borderBottomColor:BLUE, paddingBottom:8, marginBottom:14 },
  titulo: { fontSize:14, fontFamily:'Helvetica-Bold', color:BLUE },
  subtitulo: { fontSize:9, color:MUTED, marginTop:2 },
  imgBox: { borderWidth:1.5, borderColor:'#999', marginTop:6, marginBottom:10, alignItems:'center' },
  img: { width:420, height:420 },
  legendaImg: { fontSize:7, color:MUTED, textAlign:'center', marginTop:4, marginBottom:12 },
  tbl: { borderWidth:1, borderColor:'#999', marginBottom:10 },
  tblHead: { backgroundColor:BLUE, flexDirection:'row' },
  tblHeadCell: { color:'#fff', fontFamily:'Helvetica-Bold', fontSize:8, padding:'5 8', flex:1, textAlign:'center' },
  tblRow: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc' },
  tblRowAlt: { flexDirection:'row', borderTopWidth:1, borderTopColor:'#ccc', backgroundColor:'#f0f0f0' },
  tblCellLeft: { flex:2, padding:'4 8', fontSize:8, color:TEXT, fontFamily:'Helvetica-Bold' },
  tblCellRight: { flex:2, padding:'4 8', fontSize:8, color:TEXT },
  avisoBox: { backgroundColor:'#fef3c7', borderLeftWidth:4, borderLeftColor:'#d97706', padding:'8 12', marginTop:10 },
  avisoTxt: { fontSize:8, color:'#78350f', lineHeight:1.5 },
  footer: { position:'absolute', bottom:16, left:30, right:30, borderTopWidth:1, borderTopColor:'#ccc', paddingTop:4, flexDirection:'row', justifyContent:'space-between' },
  footerTxt: { fontSize:7, color:MUTED },
});

const N6 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

export function PlantaDeSituacao({ data, mosaico }: { data: any; mosaico: ResultadoMosaicoSatelite }) {
  const { empresa = {}, cliente = {}, localizacao = {} } = data;

  const utmGeocodificado = latLonParaUTM(mosaico.latitude, mosaico.longitude);
  const temUtmDigitada = !!(localizacao.utmE && localizacao.utmN);
  const utmDigitada = temUtmDigitada
    ? { utmE: localizacao.utmE, utmN: localizacao.utmN, fuso: localizacao.utmFuso || utmGeocodificado.fuso }
    : null;
  const divergenciaM = utmDigitada ? distanciaUTM(utmDigitada, utmGeocodificado) : null;
  // Tolerância: um lote/terreno grande pode ter várias dezenas de metros
  // entre o pino do endereço (geocodificação por rua) e o ponto exato da
  // instalação — só alerta acima de 300m, que já indica endereço/UTM
  // possivelmente trocados, não apenas imprecisão normal de geocodificação.
  const divergenciaSuspeita = divergenciaM !== null && divergenciaM > 300;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.titulo}>PLANTA DE SITUACAO</Text>
            <Text style={S.subtitulo}>{safe(cliente.nome || 'Cliente')} - {safe(cliente.cidade||'')}{cliente.uf?`/${cliente.uf}`:''} {localizacao.numeroUC?`- UC ${localizacao.numeroUC}`:''}</Text>
          </View>
          <Text style={{ fontSize:8, color:MUTED }}>{safe(empresa.nomeFantasia || empresa.razaoSocial || '')}</Text>
        </View>

        <View style={S.imgBox}>
          <Image src={mosaico.dataUri} style={S.img} />
        </View>
        <Text style={S.legendaImg}>
          {`Imagem de satelite: Esri World Imagery (fonte publica, sem chave de API) — zoom ${mosaico.zoom} — marcador nas coordenadas geocodificadas do endereco`}
        </Text>

        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={S.tblHeadCell}>DADO</Text>
            <Text style={S.tblHeadCell}>VALOR</Text>
          </View>
          {[
            ['Endereco buscado', safe(mosaico.enderecoEncontrado)],
            ['Latitude / Longitude', `${N6(mosaico.latitude)}, ${N6(mosaico.longitude)}`],
            ['UTM (do endereco geocodificado)', `Fuso ${utmGeocodificado.fuso}S — E=${utmGeocodificado.utmE.toLocaleString('pt-BR')} N=${utmGeocodificado.utmN.toLocaleString('pt-BR')}`],
            ['UTM digitada no projeto (passo Local)', temUtmDigitada ? `Fuso ${utmDigitada!.fuso}S — E=${utmDigitada!.utmE.toLocaleString('pt-BR')} N=${utmDigitada!.utmN.toLocaleString('pt-BR')}` : 'nao preenchida'],
            ['No da UC', localizacao.numeroUC || '-'],
          ].map(([lbl,val],i) => (
            <View key={i} style={i%2===1?S.tblRowAlt:S.tblRow}>
              <Text style={S.tblCellLeft}>{lbl}</Text>
              <Text style={S.tblCellRight}>{val}</Text>
            </View>
          ))}
        </View>

        {divergenciaSuspeita && (
          <View style={S.avisoBox}>
            <Text style={S.avisoTxt}>
              {`ATENCAO: a UTM digitada no projeto esta a aproximadamente ${Math.round(divergenciaM!)}m da UTM do endereco geocodificado (mesmo fuso). Isso pode indicar UTM digitada incorretamente, ou apenas que o endereco textual (geocodificacao por rua) nao aponta para o ponto exato da instalacao dentro do lote — confira antes de enviar a distribuidora.`}
            </Text>
          </View>
        )}

        <View style={S.avisoBox}>
          <Text style={S.avisoTxt}>
            AVISO: imagem de satelite e geocodificacao de fontes publicas gratuitas (Esri World Imagery + OpenStreetMap
            Nominatim), sem garantia de atualizacao recente da imagem nem de precisao abaixo de poucos metros. Confira
            visualmente que o marcador esta sobre o imovel correto antes de anexar este documento.
          </Text>
        </View>

        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>{safe(empresa.razaoSocial||'')} - CNPJ: {empresa.cnpj||'-'}</Text>
          <Text style={S.footerTxt}>Fonte: Esri World Imagery + OpenStreetMap Nominatim (gratuitos)</Text>
        </View>
      </Page>
    </Document>
  );
}
