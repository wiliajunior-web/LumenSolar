/**
 * PROCURAÇÃO — Instrumento Particular de Mandato
 * Folha única (A4).
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';
import { cadastroEmpresaIncompleto, formatarCrea } from '../empresa/cadastroEmpresa';

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
  avisoBox:   { marginTop:8, marginBottom:4, padding:'7 12', backgroundColor:'#fef2f2',
                borderRadius:5, borderLeftWidth:3, borderLeftColor:'#dc2626' },
  avisoTxt:   { fontSize:8.5, color:'#991b1b', lineHeight:1.4, fontFamily:'Helvetica-Bold' },
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

// BUG CORRIGIDO (ago/2026): esta função convertia todo acentuado (e nº, °,
// ², ³, travessão, aspas curvas) para ASCII, sob a premissa afirmada no
// comentário original do topo do arquivo de que "react-pdf com Helvetica
// nao suporta Unicode completo". Essa premissa é falsa: o Helvetica padrão
// do @react-pdf/renderer é embutido com /Encoding WinAnsiEncoding (cp1252,
// grep em node_modules/@react-pdf/pdfkit/lib/pdfkit.js), que cobre toda a
// acentuação PT-BR e os demais símbolos citados — MemorialDescritivo.tsx e
// PropostaComercialPDF.tsx já usam a mesma fontFamily:'Helvetica' sem
// nenhum stripping e renderizam acento corretamente. Verificado de forma
// empírica (não só por leitura do código-fonte do pdfkit): gerado um PDF
// real via @react-pdf/renderer com uma amostra de todos esses caracteres e
// extraído de volta com `pdftotext -layout` — todos os glifos saíram
// corretos, byte a byte. Mantida só como guarda contra undefined/null.
const safe = (s?: string) => s || '';

const fmtCPF = (v?: string) => {
  const d = (v || '').replace(/\D/g, '');
  return d.length === 11
    ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    : (v && v.trim() ? safe(v) : '___.___.___-__');
};

const hoje = () => {
  const d = new Date();
  const M = ['janeiro','fevereiro','março','abril','maio','junho',
             'julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`;
};

export function Procuracao({ data }: { data: any }) {
  const empresa = data?.empresa  || {};
  const cliente = data?.cliente  || {};
  const consumo = data?.consumo  || {};
  const loc     = data?.localizacao || {};
  const enquadramento = data?.enquadramento || {};

  const distrib = DISTRIBUIDORAS.find((d: any) => d.codigo === consumo.codigoDistribuidora);
  const distribNome = safe(distrib?.nome?.toUpperCase() || 'CEMIG - COMPANHIA ENERGÉTICA DE MINAS GERAIS');

  // BUG CORRIGIDO (ago/2026): 'outro' mapeava para '' (falsy) e caia no
  // fallback '|| solteiro(a)' — e o mesmo fallback também cobria
  // silenciosamente qualquer estadoCivil ausente/não reconhecido. Resultado:
  // TODA procuração gerada afirmava "solteiro(a)" como fato juridico, mesmo
  // quando o dado nunca foi de fato informado pelo usuário (não há campo de
  // estado civil na UI — só existe o valor-padrão 'solteiro' do store). Um
  // documento com efeito legal não deve afirmar um dado não confirmado.
  // Corrigido para cair no mesmo padrão de placeholder em branco já usado
  // neste arquivo para outros dados ausentes (ver rgCliente/endCliente
  // abaixo), em vez de uma afirmação não verificada.
  const ecMap: Record<string,string> = {
    solteiro:'solteiro(a)', casado:'casado(a)',
    divorciado:'divorciado(a)', viuvo:'viuvo(a)',
  };

  // Dados do OUTORGANTE (cliente)
  const nomeCliente = safe(cliente.nome || '').toUpperCase() || '___________________________';
  const cpfCliente  = fmtCPF(cliente.cpf);
  const rgCliente   = safe(cliente.rg  || '______________');
  const profissao   = safe(cliente.profissao || '______________');
  const ecCivil     = ecMap[cliente.estadoCivil] || '____________';
  const endCliente  = safe(cliente.endereco || '___________________________');
  const cidadeCliente = safe([cliente.cidade, cliente.uf].filter(Boolean).join(' - ') || '_______________');
  const endInstalacao = safe(loc.enderecoInstalacao || cliente.endereco || '___________________________');
  const ucNum       = loc.numeroUC || '';

  // Dados do OUTORGADO (empresa/engenheiro)
  const razaoSoc  = safe(empresa.razaoSocial || 'Lumen Soluções Ltda');
  const cnpjEmp   = empresa.cnpj || '__.___.___/____-__';
  const cidadeEmp = safe([empresa.cidade, empresa.uf].filter(Boolean).join(' - ') || '');
  const nomeEng   = safe(empresa.responsavelTecnico || '___________________________');
  const cpfEng    = fmtCPF(empresa.cpfEngenheiro);
  // BUG CORRIGIDO (ago/2026): auditoria de design dos documentos encontrou
  // "CREA-MG CREA-MG 123456" na assinatura — ver comentário completo em
  // `formatarCrea()` (domain/empresa/cadastroEmpresa.ts).
  const creaEng   = empresa.crea ? formatarCrea(empresa) : '____________';
  const cidadeLoc = safe(cliente.cidade || empresa.cidade || '_________________');

  // BUG CORRIGIDO (ago/2026): texto sempre dizia "sistema de microgeracao",
  // mesmo quando enquadramento.classe (LIMITE_MICROGERACAO_KW=75kWp, ver
  // fioB/types.ts) classificava o projeto como minigeração — uma procuração
  // com objeto juridico diferente do enquadramento real do projeto.
  const classeGD = enquadramento.classe === 'minigeracao' ? 'minigeração' : 'microgeração';

  // BUG CORRIGIDO (ago/2026): uma procuração (instrumento de representação
  // legal) sem outorgado pessoa física identificável saía sem aviso nenhum
  // — só com os placeholders em branco ('___________'), fáceis de passar
  // despercebidos numa revisão rápida antes de assinar/protocolar. Caso real
  // relatado pelo usuário (Ana Maria Vieira de Sá e Silva): "Engenheiro(a)
  // ___________________________" saiu assim mesmo depois do primeiro aviso
  // (banner dentro do PDF) — usuário deixou claro que aviso depois de gerado
  // não basta: "todos os documentos devem estar preenchidos, nada de
  // _________". A geração em si agora é BLOQUEADA antes de chegar aqui
  // (App.tsx `buildData()`, usando a mesma regra de `cadastroEmpresaIncompleto`
  // — fonte única em `domain/empresa/cadastroEmpresa.ts`). Este banner fica
  // como segunda camada de defesa, para o caso deste componente ser
  // renderizado por um caminho que não passe pelo guard (ex.:
  // `scripts/testarGeracaoPdf.tsx`, usado só para conferir layout).
  const cadastroIncompleto = cadastroEmpresaIncompleto(empresa);

  return (
    <Document title={`Procuração - ${cliente.nome || ''}`} author={razaoSoc}>
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
        <Text style={S.titulo}>PROCURAÇÃO</Text>
        <Text style={S.subtit}>INSTRUMENTO PARTICULAR DE MANDATO</Text>

        {cadastroIncompleto && (
          <View style={S.avisoBox}>
            <Text style={S.avisoTxt}>
              ATENÇÃO — CADASTRO DA EMPRESA INCOMPLETO: preencha nome do responsável técnico, CREA e CNPJ na aba Empresa antes de assinar ou protocolar este documento. Sem esses dados o outorgado não está identificado e a procuração é juridicamente incompleta.
            </Text>
          </View>
        )}

        {/* ─ OUTORGANTE ─ */}
        <Text style={S.secLabel}>Outorgante (Cliente):</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{nomeCliente}</Text>
          {`, brasileiro(a), ${ecCivil}, ${profissao}, portador(a) do RG nº `}
          <Text style={S.bold}>{rgCliente}</Text>
          {` e do CPF nº `}
          <Text style={S.bold}>{cpfCliente}</Text>
          {`, residente e domiciliado(a) na `}
          <Text style={S.bold}>{endCliente}</Text>
          {`, município de `}
          <Text style={S.bold}>{cidadeCliente}</Text>
          {'.'}
        </Text>

        {/* ─ OUTORGADO ─ */}
        <Text style={S.secLabel}>Outorgado(s) (Empresa Responsável):</Text>
        <Text style={S.corpo}>
          <Text style={S.bold}>{razaoSoc}</Text>
          {`, CNPJ nº `}
          <Text style={S.bold}>{cnpjEmp}</Text>
          {cidadeEmp ? `, com sede em ${cidadeEmp}` : ''}
          {', na pessoa do(a) Engenheiro(a) '}
          <Text style={S.bold}>{nomeEng}</Text>
          {cpfEng !== '___.___.___-__' ? `, CPF nº ${cpfEng},` : ','}
          {` inscrito(a) no `}
          <Text style={S.bold}>{creaEng}</Text>
          {'.'}
        </Text>

        {/* ─ PODERES ─ */}
        <Text style={S.secLabel}>Poderes Outorgados:</Text>
        <Text style={S.corpo}>
          {'Através do presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui como seu(s) procurador(es) o(s) OUTORGADO(S), conferindo-lhe(s) '}
          <Text style={S.bold}>amplos poderes</Text>
          {' para efetuar requerimentos, juntar documentos, verificar andamento de processos, solicitar informações, satisfazer exigências, retirar cópias, certidões e documentos, praticar todos os atos necessários para representar o(a) OUTORGANTE perante a '}
          <Text style={S.bold}>{distribNome}</Text>
          {`, referentes ao acesso ao Sistema de Compensação de Energia Elétrica (SCEE) e à instalação do sistema de ${classeGD} fotovoltaica localizado em `}
          <Text style={S.bold}>{endInstalacao}</Text>
          {ucNum ? `, UC nº ${ucNum}` : ''}
          {', conforme Lei nº 14.300/2022 e normas da ANEEL.'}
        </Text>

        {/* ─ Validade ─ */}
        <View style={S.validBox}>
          <Text style={S.corpo}>
            <Text style={S.bold}>Validade: </Text>
            {'Esta Procuração tem validade indeterminada, permanecendo em vigor até o cumprimento integral do seu objeto ou até revogação expressa pelo(a) Outorgante.'}
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
