/**
 * PLANTA DE SITUAÇÃO — imagem de satélite georreferenciada + UTM
 * ==================================================================
 * Documento exigido pela CEMIG (ND 5.30 para conexão em baixa tensão, ND
 * 5.31 para média tensão — grupo A; confirmado no texto do portal Cemig
 * Atende, set/2026, ver `normaConexaoCemig` em
 * documentacaoCemig/checklist.ts) para localizar a instalação. O
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

// BUG CORRIGIDO (ago/2026): esta função convertia todo acentuado (e °, ², ³,
// travessão) para ASCII, sob a premissa de que "react-pdf com Helvetica não
// cobre todo Unicode". Premissa falsa — ver o comentário completo em
// `Procuracao.tsx` (mesma correção aplicada lá primeiro): o Helvetica padrão
// do @react-pdf/renderer usa WinAnsiEncoding (cp1252), que cobre acentuação
// PT-BR e esses símbolos; MemorialDescritivo.tsx e PropostaComercialPDF.tsx
// já renderizavam acentos corretamente com a mesma fontFamily. Isso fazia o
// nome do cliente sair sem acento na Planta de Situação, mesmo com o dado de
// origem correto. Mantida só como guarda contra undefined/null.
const safe = (s?: string) => s || '';

const S = StyleSheet.create({
  page: { fontFamily:'Helvetica', fontSize:9, color:TEXT, backgroundColor:'#fff', padding:'26 30 40 30' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:2, borderBottomColor:BLUE, paddingBottom:8, marginBottom:14 },
  titulo: { fontSize:14, fontFamily:'Helvetica-Bold', color:BLUE },
  subtitulo: { fontSize:9, color:MUTED, marginTop:2 },
  imgBox: { borderWidth:1.5, borderColor:'#999', marginTop:6, marginBottom:10, alignItems:'center' },
  img: { width:340, height:340 },
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
// BUG CORRIGIDO (ago/2026): localizacao.utmE/utmN são `string` (DadosLocalizacao,
// campo de texto livre) — chamar String.prototype.toLocaleString() nelas é um
// no-op (retorna a própria string, sem separador de milhar), diferente de
// Number.prototype.toLocaleString() usado em utmGeocodificado (numérico, calculado
// por latLonParaUTM). Convertida para número antes de formatar; se não for um
// número válido (usuário digitou algo fora do padrão), mostra o texto bruto.
const fmtUtm = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR') : v;
};

export function PlantaDeSituacao({ data, mosaico }: { data: any; mosaico: ResultadoMosaicoSatelite }) {
  const { empresa = {}, cliente = {}, localizacao = {} } = data;

  const utmGeocodificado = latLonParaUTM(mosaico.latitude, mosaico.longitude);
  const temUtmDigitada = !!(localizacao.utmE && localizacao.utmN);
  // CORRIGIDO (ago/2026): a letra do hemisfério vinha hardcoded "S" nas duas
  // linhas da tabela — errada para Roraima e partes do norte do
  // Amapá/Amazonas (lat >= 0, hemisfério N; ver converterCoordenadas.ts). A
  // UTM digitada pelo usuário não carrega lat/lon próprio (é texto livre do
  // passo "Local"), então não há como calcular seu hemisfério de forma
  // exata — usa-se o hemisfério do endereço geocodificado como aproximação,
  // já que ambos representam o mesmo local (é a mesma premissa já usada pelo
  // alerta de divergência abaixo, que só compara os dois quando "mesmo fuso").
  const utmDigitada = temUtmDigitada
    ? { utmE: localizacao.utmE, utmN: localizacao.utmN, fuso: localizacao.utmFuso || utmGeocodificado.fuso, hemisferio: utmGeocodificado.hemisferio }
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
            <Text style={S.titulo}>PLANTA DE SITUAÇÃO</Text>
            <Text style={S.subtitulo}>{safe(cliente.nome || 'Cliente')} - {safe(cliente.cidade||'')}{cliente.uf?`/${cliente.uf}`:''} {localizacao.numeroUC?`- UC ${localizacao.numeroUC}`:''}</Text>
          </View>
          <Text style={{ fontSize:8, color:MUTED }}>{safe(empresa.nomeFantasia || empresa.razaoSocial || '')}</Text>
        </View>

        <View style={S.imgBox}>
          <Image src={mosaico.dataUri} style={S.img} />
        </View>
        <Text style={S.legendaImg}>
          {`Imagem de satélite: Esri World Imagery (fonte pública, sem chave de API) — zoom ${mosaico.zoom}. Marcador vermelho: local do padrão de entrada / medidor (referência: endereço geocodificado da UC).`}
        </Text>

        <View style={S.avisoBox}>
          <Text style={S.avisoTxt}>
            {'IMPORTANTE (conforme modelos de planta de situação da CEMIG): o marcador vermelho indica o endereço da UC, usado aqui como referência para o local do padrão de entrada. A CEMIG também exige a demarcação do local de instalação das placas solares (e, em caso de mudança de local do padrão, a distância entre o local atual e o novo local) — este software não tem como inferir automaticamente o polígono do telhado/área de instalação a partir apenas do endereço. Demarque manualmente essas áreas sobre esta imagem (ex.: em um editor de PDF/imagem) antes de enviar este documento à distribuidora.'}
          </Text>
        </View>

        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={S.tblHeadCell}>DADO</Text>
            <Text style={S.tblHeadCell}>VALOR</Text>
          </View>
          {[
            ['Endereço buscado', safe(mosaico.enderecoEncontrado)],
            ['Latitude / Longitude', `${N6(mosaico.latitude)}, ${N6(mosaico.longitude)}`],
            ['UTM (do endereço geocodificado)', `Fuso ${utmGeocodificado.fuso}${utmGeocodificado.hemisferio} — E=${utmGeocodificado.utmE.toLocaleString('pt-BR')} N=${utmGeocodificado.utmN.toLocaleString('pt-BR')}`],
            ['UTM digitada no projeto (passo Local)', temUtmDigitada ? `Fuso ${utmDigitada!.fuso}${utmDigitada!.hemisferio} — E=${fmtUtm(utmDigitada!.utmE)} N=${fmtUtm(utmDigitada!.utmN)}` : 'não preenchida'],
            ['Nº da UC', localizacao.numeroUC || '-'],
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
              {`ATENÇÃO: a UTM digitada no projeto está a aproximadamente ${Math.round(divergenciaM!)}m da UTM do endereço geocodificado (mesmo fuso). Isso pode indicar UTM digitada incorretamente, ou apenas que o endereço textual (geocodificação por rua) não aponta para o ponto exato da instalação dentro do lote — confira antes de enviar à distribuidora.`}
            </Text>
          </View>
        )}

        <View style={S.avisoBox}>
          <Text style={S.avisoTxt}>
            AVISO: imagem de satélite e geocodificação de fontes públicas gratuitas (Esri World Imagery + OpenStreetMap
            Nominatim), sem garantia de atualização recente da imagem nem de precisão abaixo de poucos metros. Confira
            visualmente que o marcador está sobre o imóvel correto antes de anexar este documento.
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
