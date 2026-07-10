/**
 * PROCURAÇÃO — Instrumento Particular de Mandato
 * Estrutura conforme modelo enviado pelo cliente (Lumen Soluções)
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';

const DARK = '#0a0a1e';
const GOLD = '#c9a227';
const TEXT = '#1a1a1a';
const BLUE = '#1a3a6e';
const MUTED = '#555';

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: TEXT,
    backgroundColor: '#fff',
    padding: '40 60 50 60',
    lineHeight: 1.6,
  },
  // Cabeçalho
  header: { alignItems: 'center', marginBottom: 32 },
  logo:   { width: 90, height: 90, objectFit: 'contain', marginBottom: 8 },
  logoPlaceholder: { width: 70, height: 70, backgroundColor: GOLD, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoLetter: { color: DARK, fontFamily: 'Helvetica-Bold', fontSize: 28 },
  empresaNome: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLUE },
  empresaSub:  { fontSize: 9,  color: MUTED },
  linha: { height: 2, backgroundColor: GOLD, width: 120, marginTop: 10, alignSelf: 'center' },

  // Título
  titulo: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE, textAlign: 'center', letterSpacing: 4, marginTop: 20, marginBottom: 6 },
  subtitulo: { fontSize: 10, textAlign: 'center', color: MUTED, marginBottom: 28 },

  // Seções
  secaoLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4, marginTop: 18 },
  bloco: { textAlign: 'justify', fontSize: 11, color: TEXT, lineHeight: 1.7 },
  bold: { fontFamily: 'Helvetica-Bold' },
  underline: { textDecoration: 'underline' },

  // Validade
  validadeBox: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ddd' },

  // Local e data
  localData: { textAlign: 'center', marginTop: 28, fontSize: 11 },

  // Assinaturas
  assinaturasRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 50 },
  assinaturaBox: { alignItems: 'center', width: '44%' },
  assinaturaLinha: { borderTopWidth: 1, borderTopColor: TEXT, width: '100%', paddingTop: 8, alignItems: 'center', marginTop: 30 },
  assinaturaNome: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  assinaturaDetalhe: { fontSize: 9, color: MUTED, textAlign: 'center', marginTop: 2 },

  // Rodapé
  rodape: { position: 'absolute', bottom: 18, left: 60, right: 60, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  rodapeTxt: { fontSize: 7, color: '#aaa' },
});

const hoje = () => {
  const d = new Date();
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

const fmtCPF = (cpf: string) => {
  const s = (cpf || '').replace(/\D/g, '');
  if (s.length === 11) return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`;
  return cpf || '___.___.___-__';
};

export function Procuracao({ data }: { data: any }) {
  const { empresa, cliente, consumo, localizacao } = data;

  // Distribuidora
  const distribItem = DISTRIBUIDORAS.find((d: any) => d.codigo === consumo?.codigoDistribuidora);
  const distribNome = distribItem?.nome?.toUpperCase() || 'CEMIG – COMPANHIA ENERGÉTICA DE MINAS GERAIS';

  const estadoCivilMap: Record<string, string> = {
    solteiro: 'solteiro(a)', casado: 'casado(a)', divorciado: 'divorciado(a)', viuvo: 'viúvo(a)', outro: '',
  };

  const nomeCliente    = (cliente?.nome || '___________________________').toUpperCase();
  const cpfCliente     = fmtCPF(cliente?.cpf || '');
  const rgCliente      = cliente?.rg   || '______________';
  const profCliente    = cliente?.profissao || '______________';
  const ecCliente      = estadoCivilMap[cliente?.estadoCivil] || 'solteiro(a)';
  const endCliente     = cliente?.endereco || '___________________________';
  const cidadeCliente  = [cliente?.cidade, cliente?.uf].filter(Boolean).join(' – ') || '_______________';
  const endInstalacao  = localizacao?.enderecoInstalacao || endCliente;
  const ucNumero       = localizacao?.numeroUC || '';

  const nomeEng   = empresa?.responsavelTecnico || '___________________________';
  const cpfEng    = fmtCPF(empresa?.cpfEngenheiro || '');
  const creaEng   = empresa?.crea   ? `CREA-${empresa.uf || 'MG'} ${empresa.crea}` : '____________';
  const razaoSoc  = empresa?.razaoSocial  || '___________________________';
  const cnpjEmp   = empresa?.cnpj   || '__.___.___/____-__';
  const cidadeEmp = [empresa?.cidade, empresa?.uf].filter(Boolean).join(' – ') || '_______________';

  return (
    <Document title={`Procuração – ${cliente?.nome || ''}`} author={razaoSoc}>
      <Page size="A4" style={S.page}>

        {/* ── Cabeçalho ── */}
        <View style={S.header}>
          {empresa?.logoBase64
            ? <Image src={empresa.logoBase64} style={S.logo} />
            : <View style={S.logoPlaceholder}><Text style={S.logoLetter}>L</Text></View>
          }
          <Text style={S.empresaNome}>{razaoSoc}</Text>
          <Text style={S.empresaSub}>CNPJ: {cnpjEmp}{empresa?.cidade ? ` · ${empresa.cidade}` : ''}</Text>
          <View style={S.linha} />
        </View>

        {/* ── Título ── */}
        <Text style={S.titulo}>PROCURAÇÃO</Text>
        <Text style={S.subtitulo}>INSTRUMENTO PARTICULAR DE MANDATO</Text>

        {/* ── OUTORGANTE ── */}
        <Text style={S.secaoLabel}>OUTORGANTE:</Text>
        <Text style={S.bloco}>
          <Text style={S.bold}>{nomeCliente}</Text>
          {`, brasileiro(a), ${ecCliente}, ${profCliente}, `}
          {`inscrito(a) no RG nº: `}<Text style={S.bold}>{rgCliente}</Text>
          {` e no CPF sob o nº: `}<Text style={S.bold}>{cpfCliente}</Text>
          {`, residente e domiciliado(a) `}
          <Text style={S.bold}>{endCliente}</Text>
          {`, na cidade de `}<Text style={S.bold}>{cidadeCliente}</Text>.
        </Text>

        {/* ── OUTORGADO ── */}
        <Text style={S.secaoLabel}>OUTORGADO(S):</Text>
        <Text style={S.bloco}>
          <Text style={S.bold}>{razaoSoc}</Text>
          {`, CNPJ nº `}<Text style={S.bold}>{cnpjEmp}</Text>
          {empresa?.cidade ? `, com sede em ${cidadeEmp}` : ''}
          {`, na pessoa do(a) Engenheiro(a) `}
          <Text style={S.bold}>{nomeEng}</Text>
          {cpfEng ? `, inscrito(a) no CPF sob o nº `  : ''}
          {cpfEng ? <Text style={S.bold}>{cpfEng}</Text> : ''}
          {`, e no `}<Text style={S.bold}>{creaEng}</Text>.
        </Text>

        {/* ── PODERES ── */}
        <Text style={S.secaoLabel}>PODERES:</Text>
        <Text style={S.bloco}>
          {'Através do presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui como seu(s) procurador(es) o(s) OUTORGADO(S), a quem confere '}
          <Text style={S.bold}>amplos poderes</Text>
          {' para efetuar requerimentos, juntar documentos, verificar andamento de processos, solicitar informações, satisfazer exigências, retirar cópias, certidões, extratos, guias, documentos e informações, regularizar, enfim, praticar todos os atos necessários para representar e defender os direitos e interesses do(a) OUTORGANTE relativos à '}
          <Text style={S.bold}>{distribNome}</Text>
          {', referentes à solicitação de acesso ao Sistema de Compensação de Energia Elétrica (SCEE) e à instalação do sistema de microgeração solar fotovoltaica no imóvel situado em '}
          <Text style={S.bold}>{endInstalacao}</Text>
          {ucNumero ? `, UC nº ${ucNumero}` : ''}
          {', nos termos da Lei nº 14.300/2022 e das normas da ANEEL.'}
        </Text>

        {/* ── Validade ── */}
        <View style={S.validadeBox}>
          <Text style={S.bloco}>
            <Text style={S.bold}>A presente Procuração tem validade indeterminada</Text>
            {', permanecendo em vigor até o cumprimento integral do seu objeto ou até revogação expressa pelo(a) Outorgante.'}
          </Text>
        </View>

        {/* ── Local e Data ── */}
        <Text style={S.localData}>
          {cliente?.cidade || empresa?.cidade || '_________________'}, {hoje()}.
        </Text>

        {/* ── Assinaturas ── */}
        <View style={S.assinaturasRow}>
          <View style={S.assinaturaBox}>
            <View style={S.assinaturaLinha}>
              <Text style={S.assinaturaNome}>{nomeCliente}</Text>
              <Text style={S.assinaturaDetalhe}>OUTORGANTE</Text>
              <Text style={S.assinaturaDetalhe}>CPF: {cpfCliente}</Text>
            </View>
          </View>
          <View style={S.assinaturaBox}>
            <View style={S.assinaturaLinha}>
              <Text style={S.assinaturaNome}>{razaoSoc}</Text>
              <Text style={S.assinaturaDetalhe}>OUTORGADO</Text>
              <Text style={S.assinaturaDetalhe}>{nomeEng}</Text>
              <Text style={S.assinaturaDetalhe}>{creaEng}</Text>
            </View>
          </View>
        </View>

        {/* ── Rodapé ── */}
        <View style={S.rodape}>
          <Text style={S.rodapeTxt}>{razaoSoc} · CNPJ: {cnpjEmp}</Text>
          <Text style={S.rodapeTxt}>{empresa?.email || ''} · {empresa?.telefone || ''}</Text>
        </View>

      </Page>
    </Document>
  );
}
