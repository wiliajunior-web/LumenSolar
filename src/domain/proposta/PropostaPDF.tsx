import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer';
import { DadosCliente } from '../../renderer/store/useProjetoStore';
import { DadosEmpresa } from '@data/empresa';
import { ResultadoDimensionamento } from '@domain/dimensionamento/types';
import { ResultadoCustosRecorrentes } from '@domain/custosRecorrentes/calcularCustos';
import { ResultadoPrecificacao } from '@domain/precificacao/types';
import { ResultadoEnquadramento } from '@domain/fioB/calculoFioB';
import { EspecificacaoKit } from '@domain/precificacao/types';
import { DISTRIBUIDORAS } from '@data/distribuidoras';

// Cores institucionais
const COR_PRIMARIA = '#1a5276';
const COR_ACENTO = '#f39c12';
const COR_POSITIVO = '#1e8449';
const COR_TEXTO = '#2c3e50';
const COR_CINZA_CLARO = '#f2f3f4';
const COR_CINZA = '#7f8c8d';

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: COR_TEXTO, backgroundColor: '#ffffff', padding: 0 },

  // Capa
  capa: { flex: 1, backgroundColor: COR_PRIMARIA },
  capaFaixa: { backgroundColor: COR_ACENTO, height: 8 },
  capaConteudo: { padding: 40, flex: 1, justifyContent: 'space-between' },
  capaTitulo: { fontSize: 28, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  capaSubtitulo: { fontSize: 14, color: '#aed6f1', marginBottom: 40 },
  capaCliente: { fontSize: 20, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  capaData: { fontSize: 11, color: '#aed6f1', marginTop: 4 },
  capaRodape: { borderTopWidth: 1, borderTopColor: '#2e86c1', paddingTop: 16 },
  capaEmpresa: { fontSize: 13, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  capaEmpresaInfo: { fontSize: 10, color: '#aed6f1', marginTop: 4 },

  // Páginas internas
  pageInterna: { fontFamily: 'Helvetica', fontSize: 10, color: COR_TEXTO, backgroundColor: '#ffffff', paddingBottom: 50 },
  header: { backgroundColor: COR_PRIMARIA, padding: '16 32 12 32', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitulo: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  headerEmpresa: { fontSize: 10, color: '#aed6f1' },
  faixaAcento: { backgroundColor: COR_ACENTO, height: 4 },
  body: { padding: '20 32 0 32' },

  secaoTitulo: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COR_PRIMARIA, marginTop: 20, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: COR_ACENTO, paddingBottom: 4 },

  // Destaque / card
  destaque: { backgroundColor: COR_CINZA_CLARO, borderRadius: 4, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-around' },
  destaqueItem: { alignItems: 'center' },
  destaqueValor: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COR_PRIMARIA },
  destaqueLabel: { fontSize: 9, color: COR_CINZA, marginTop: 2 },

  // Tabelas
  tabela: { marginBottom: 12 },
  tabelaHeader: { flexDirection: 'row', backgroundColor: COR_PRIMARIA, padding: '6 8' },
  tabelaHeaderCell: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tabelaRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  tabelaRowAlt: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#e8e8e8', backgroundColor: COR_CINZA_CLARO },
  tabelaCell: { fontSize: 9, color: COR_TEXTO },
  tabelaCellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COR_TEXTO },

  // Total row
  tabelaTotal: { flexDirection: 'row', padding: '7 8', backgroundColor: COR_PRIMARIA },
  tabelaTotalCell: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tabelaPreco: { flexDirection: 'row', padding: '10 8', backgroundColor: COR_ACENTO },
  tabelaPrecoCell: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Linha simples
  linhaItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linhaItemLabel: { fontSize: 10, color: COR_TEXTO, flex: 2 },
  linhaItemValor: { fontSize: 10, color: COR_TEXTO, flex: 1, textAlign: 'right' },
  linhaItemBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COR_PRIMARIA, flex: 1, textAlign: 'right' },
  linhaPositivo: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COR_POSITIVO, flex: 1, textAlign: 'right' },

  // Alerta
  alerta: { backgroundColor: '#fef9e7', borderLeftWidth: 4, borderLeftColor: COR_ACENTO, padding: '8 12', marginTop: 8, marginBottom: 8 },
  alertaVerde: { backgroundColor: '#eafaf1', borderLeftWidth: 4, borderLeftColor: COR_POSITIVO, padding: '8 12', marginTop: 8, marginBottom: 8 },
  alertaTexto: { fontSize: 9, color: COR_TEXTO, lineHeight: 1.5 },

  // Rodapé
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e8e8e8', paddingTop: 6 },
  footerTexto: { fontSize: 8, color: COR_CINZA },
  pageNumber: { fontSize: 8, color: COR_CINZA },
});

const R = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const N = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const hoje = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

interface FooterProps { empresa: DadosEmpresa; }

function Footer({ empresa }: FooterProps) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerTexto}>{empresa.nomeFantasia || empresa.razaoSocial} · {empresa.telefone} · {empresa.email}</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Header({ titulo, empresa }: { titulo: string; empresa: DadosEmpresa }) {
  return (
    <>
      <View style={S.header}>
        <Text style={S.headerTitulo}>{titulo}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {empresa.logoBase64 && (
            <Image src={empresa.logoBase64} style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'contain' }} />
          )}
          <Text style={S.headerEmpresa}>{empresa.nomeFantasia || empresa.razaoSocial}</Text>
        </View>
      </View>
      <View style={S.faixaAcento} />
    </>
  );
}

export interface PropostaData {
  empresa: DadosEmpresa;
  cliente: DadosCliente;
  codigoDistribuidora: string;
  kit: EspecificacaoKit;
  dimensionamento: ResultadoDimensionamento;
  custosRecorrentes: ResultadoCustosRecorrentes;
  precificacao: ResultadoPrecificacao;
  enquadramento: ResultadoEnquadramento;
  percentuaisFioBPorAno: Record<number, number>;
  consumoMedioMensalKWh: number;
  valorMedioMensalRS: number;
  aliquotaImpostos: number;
  margemDesejada: number;
  indicadores?: any;
  contas?: any[];
}

export function PropostaPDF({ data }: { data: PropostaData }) {
  const { empresa, cliente, kit, dimensionamento, custosRecorrentes, precificacao, enquadramento, percentuaisFioBPorAno } = data;
  const distrib = DISTRIBUIDORAS.find(d => d.codigo === data.codigoDistribuidora);
  const anoAtual = new Date().getFullYear();

  return (
    <Document title={`Proposta Solar — ${cliente.nome}`} author={empresa.razaoSocial}>

      {/* ===== CAPA ===== */}
      <Page size="A4" style={S.page}>
        <View style={S.capa}>
          <View style={S.capaFaixa} />
          <View style={S.capaConteudo}>
            <View>
              {data.empresa.logoBase64 && (
                <Image src={data.empresa.logoBase64} style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 20, objectFit: 'contain' }} />
              )}
              <Text style={S.capaTitulo}>Proposta Comercial</Text>
              <Text style={S.capaSubtitulo}>Sistema de Energia Solar Fotovoltaica</Text>
              <Text style={S.capaCliente}>{cliente.nome}</Text>
              <Text style={S.capaData}>{cliente.cidade}{cliente.cidade && cliente.uf ? ` — ${cliente.uf}` : cliente.uf} · {hoje()}</Text>
            </View>
            <View>
              {/* Números de destaque na capa */}
              <View style={{ flexDirection: 'row', marginBottom: 32, gap: 24 }}>
                <View style={{ backgroundColor: '#1a5276', borderRadius: 6, padding: '12 20', flex: 1, borderWidth: 1, borderColor: '#2e86c1' }}>
                  <Text style={{ fontSize: 22, color: '#f39c12', fontFamily: 'Helvetica-Bold' }}>{N(dimensionamento.potenciaInstaladaRealKWp)} kWp</Text>
                  <Text style={{ fontSize: 10, color: '#aed6f1', marginTop: 4 }}>Potência instalada</Text>
                </View>
                <View style={{ backgroundColor: '#1a5276', borderRadius: 6, padding: '12 20', flex: 1, borderWidth: 1, borderColor: '#2e86c1' }}>
                  <Text style={{ fontSize: 22, color: '#f39c12', fontFamily: 'Helvetica-Bold' }}>{N(dimensionamento.geracaoMensalEstimadaKWh, 0)} kWh</Text>
                  <Text style={{ fontSize: 10, color: '#aed6f1', marginTop: 4 }}>Geração mensal estimada</Text>
                </View>
                <View style={{ backgroundColor: '#1a5276', borderRadius: 6, padding: '12 20', flex: 1, borderWidth: 1, borderColor: '#2e86c1' }}>
                  <Text style={{ fontSize: 22, color: '#58d68d', fontFamily: 'Helvetica-Bold' }}>{R(custosRecorrentes.economiaMensalRS)}</Text>
                  <Text style={{ fontSize: 10, color: '#aed6f1', marginTop: 4 }}>Economia mensal estimada</Text>
                </View>
              </View>
              <View style={S.capaRodape}>
                <Text style={S.capaEmpresa}>{empresa.razaoSocial}</Text>
                <Text style={S.capaEmpresaInfo}>
                  {[empresa.cnpj && `CNPJ: ${empresa.cnpj}`, empresa.crea && `CREA: ${empresa.crea}`, empresa.telefone, empresa.email].filter(Boolean).join('  ·  ')}
                </Text>
                <Text style={{ fontSize: 9, color: '#7fb3d3', marginTop: 6 }}>
                  Esta proposta é válida por {empresa.validadeProposta} dias a partir da data de emissão.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>

      {/* ===== PÁGINA 1: SISTEMA E CONSUMO ===== */}
      <Page size="A4" style={S.pageInterna}>
        <Header titulo="Sistema Proposto" empresa={empresa} />
        <View style={S.body}>

          <Text style={S.secaoTitulo}>Especificação do Sistema</Text>
          <View style={S.destaque}>
            <View style={S.destaqueItem}>
              <Text style={S.destaqueValor}>{N(dimensionamento.potenciaInstaladaRealKWp)} kWp</Text>
              <Text style={S.destaqueLabel}>Potência de pico</Text>
            </View>
            <View style={S.destaqueItem}>
              <Text style={S.destaqueValor}>{dimensionamento.numeroModulos}</Text>
              <Text style={S.destaqueLabel}>Módulos fotovoltaicos</Text>
            </View>
            <View style={S.destaqueItem}>
              <Text style={S.destaqueValor}>{N(dimensionamento.geracaoMensalEstimadaKWh, 0)} kWh</Text>
              <Text style={S.destaqueLabel}>Geração/mês estimada</Text>
            </View>
            <View style={S.destaqueItem}>
              <Text style={S.destaqueValor}>{N(dimensionamento.geracaoAnualEstimadaKWh, 0)} kWh</Text>
              <Text style={S.destaqueLabel}>Geração/ano estimada</Text>
            </View>
          </View>

          {/* Tabela de equipamentos */}
          <View style={S.tabela}>
            <View style={S.tabelaHeader}>
              <Text style={[S.tabelaHeaderCell, { flex: 1 }]}>Componente</Text>
              <Text style={[S.tabelaHeaderCell, { flex: 2 }]}>Especificação</Text>
              <Text style={[S.tabelaHeaderCell, { flex: 1, textAlign: 'right' }]}>Qtd.</Text>
            </View>
            <View style={S.tabelaRow}>
              <Text style={[S.tabelaCell, { flex: 1 }]}>Módulo fotovoltaico</Text>
              <Text style={[S.tabelaCellBold, { flex: 2 }]}>{kit.marcaModulo} {kit.modeloModulo} — {kit.potenciaModuloWp}Wp {kit.tipoModulo}</Text>
              <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>{kit.quantidade} un.</Text>
            </View>
            <View style={S.tabelaRowAlt}>
              <Text style={[S.tabelaCell, { flex: 1 }]}>Inversor solar</Text>
              <Text style={[S.tabelaCellBold, { flex: 2 }]}>{kit.marcaInversor} {kit.modeloInversor} — {kit.potenciaInversorKW} kW</Text>
              <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>1 un.</Text>
            </View>
            <View style={S.tabelaRow}>
              <Text style={[S.tabelaCell, { flex: 1 }]}>Estrutura de fixação</Text>
              <Text style={[S.tabelaCell, { flex: 2 }]}>Conforme laudo de telhado</Text>
              <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>1 cj.</Text>
            </View>
            <View style={S.tabelaRowAlt}>
              <Text style={[S.tabelaCell, { flex: 1 }]}>Instalação elétrica</Text>
              <Text style={[S.tabelaCell, { flex: 2 }]}>Cabos, conectores, DPS, string box, disjuntores</Text>
              <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>1 cj.</Text>
            </View>
            <View style={S.tabelaRow}>
              <Text style={[S.tabelaCell, { flex: 1 }]}>Projeto + ART</Text>
              <Text style={[S.tabelaCell, { flex: 2 }]}>Projeto elétrico, memorial descritivo e ART CREA{empresa.crea ? ` nº ${empresa.crea}` : ''}</Text>
              <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>1 cj.</Text>
            </View>
          </View>

          <Text style={S.secaoTitulo}>Análise do Consumo</Text>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Consumo médio mensal atual</Text>
            <Text style={S.linhaItemValor}>{N(data.consumoMedioMensalKWh, 0)} kWh</Text>
          </View>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Valor médio da conta atual</Text>
            <Text style={S.linhaItemValor}>{R(data.valorMedioMensalRS)}</Text>
          </View>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Distribuidora</Text>
            <Text style={S.linhaItemValor}>{distrib?.nome ?? data.codigoDistribuidora}</Text>
          </View>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Compensação solar alcançada</Text>
            <Text style={S.linhaItemBold}>{N(dimensionamento.percentualCompensacaoReal * 100, 0)}%</Text>
          </View>
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ===== PÁGINA 2: ANÁLISE ECONÔMICA ===== */}
      <Page size="A4" style={S.pageInterna}>
        <Header titulo="Análise Econômica" empresa={empresa} />
        <View style={S.body}>

          <Text style={S.secaoTitulo}>Custos mensais após a instalação do sistema solar</Text>
          <Text style={{ fontSize: 9, color: COR_CINZA, marginBottom: 8 }}>
            Mesmo com o sistema solar instalado, a distribuidora continua cobrando os valores abaixo:
          </Text>

          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Taxa de disponibilidade (mínimo faturável da distribuidora)</Text>
            <Text style={S.linhaItemValor}>{R(custosRecorrentes.taxaDisponibilidadeRS)}/mês</Text>
          </View>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>CIP / Contribuição de Iluminação Pública</Text>
            <Text style={S.linhaItemValor}>{R(custosRecorrentes.cipRS)}/mês</Text>
          </View>
          <View style={S.linhaItem}>
            <Text style={S.linhaItemLabel}>Componente Fio B — TUSD Distribuição ({N((percentuaisFioBPorAno[anoAtual] ?? 0) * 100, 0)}% em {anoAtual})</Text>
            <Text style={S.linhaItemValor}>{R(custosRecorrentes.custoBFioMensalRS)}/mês</Text>
          </View>
          <View style={{ ...S.linhaItem, borderBottomWidth: 0 }}>
            <Text style={[S.linhaItemLabel, { fontFamily: 'Helvetica-Bold', color: COR_PRIMARIA }]}>Total fixo mensal (mínimo da sua conta)</Text>
            <Text style={S.linhaItemBold}>{R(custosRecorrentes.totalFixoMensalRS)}/mês</Text>
          </View>
          <View style={{ backgroundColor: COR_POSITIVO, borderRadius: 4, padding: '10 14', marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#ffffff' }}>Economia mensal estimada</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{R(custosRecorrentes.economiaMensalRS)}/mês</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <View style={{ flex: 1, backgroundColor: '#f2f3f4', borderRadius: 4, padding: '8 12' }}>
              <Text style={{ fontSize: 9, color: COR_CINZA }}>Economia anual estimada</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: COR_POSITIVO, marginTop: 2 }}>{R(custosRecorrentes.economiaMensalRS * 12)}/ano</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f2f3f4', borderRadius: 4, padding: '8 12' }}>
              <Text style={{ fontSize: 9, color: COR_CINZA }}>Economia em 25 anos (est.)</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: COR_POSITIVO, marginTop: 2 }}>{R(custosRecorrentes.economiaMensalRS * 12 * 25)}</Text>
            </View>
          </View>

          <Text style={S.secaoTitulo}>Impacto do Fio B — Lei nº 14.300/2022</Text>
          {enquadramento.elegivelArt26 ? (
            <View style={S.alertaVerde}>
              <Text style={S.alertaTexto}>
                ✅  Este sistema está enquadrado na regra de transição do art. 26 da Lei 14.300/2022.{'\n'}
                O Fio B (componente de distribuição) não incide sobre a energia compensada até 31/12/2045, garantindo máxima economia ao longo de toda a vida útil do sistema.
              </Text>
            </View>
          ) : (
            <>
              <View style={S.alerta}>
                <Text style={S.alertaTexto}>
                  A Lei 14.300/2022 estabelece uma cobrança gradual sobre a energia compensada (componente Fio B). Os percentuais aumentam anualmente conforme a tabela abaixo.
                </Text>
              </View>
              <View style={S.tabela}>
                <View style={S.tabelaHeader}>
                  <Text style={[S.tabelaHeaderCell, { flex: 1 }]}>Ano</Text>
                  <Text style={[S.tabelaHeaderCell, { flex: 1 }]}>% Fio B incidente</Text>
                  <Text style={[S.tabelaHeaderCell, { flex: 2, textAlign: 'right' }]}>Custo adicional mensal estimado</Text>
                </View>
                {[anoAtual, anoAtual+1, anoAtual+2, anoAtual+3, 2029, 2030].filter((v,i,a) => a.indexOf(v)===i && v<=2035).map((ano, idx) => {
                  const pct = percentuaisFioBPorAno[ano] ?? 1;
                  const custo = dimensionamento.geracaoMensalEstimadaKWh * (distrib?.tarifaKWhComICMS ?? 0.87) * 0.35 * pct;
                  const isAlt = idx % 2 === 1;
                  return (
                    <View key={ano} style={isAlt ? S.tabelaRowAlt : S.tabelaRow}>
                      <Text style={[S.tabelaCell, { flex: 1 }]}>{ano}</Text>
                      <Text style={[S.tabelaCell, { flex: 1 }]}>{N(pct * 100, 0)}%</Text>
                      <Text style={[S.tabelaCellBold, { flex: 2, textAlign: 'right' }]}>{R(custo)}/mês</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
        <Footer empresa={empresa} />
      </Page>

      {/* ===== PÁGINA 3: INVESTIMENTO ===== */}
      <Page size="A4" style={S.pageInterna}>
        <Header titulo="Investimento e Precificação" empresa={empresa} />
        <View style={S.body}>

          <Text style={S.secaoTitulo}>Composição do investimento</Text>
          <View style={S.tabela}>
            <View style={S.tabelaHeader}>
              <Text style={[S.tabelaHeaderCell, { flex: 3 }]}>Item</Text>
              <Text style={[S.tabelaHeaderCell, { flex: 1, textAlign: 'right' }]}>Valor</Text>
            </View>
            {[
              ['Kit solar (módulos + inversor)', precificacao.custoKit],
              ['Estrutura de fixação', precificacao.custoEstrutura],
              ['Materiais elétricos', precificacao.custoMateriais],
              ['Mão de obra de instalação', precificacao.custoMaoDeObra],
              ['Projeto elétrico + ART CREA', precificacao.custoProjetoArt],
              ...(precificacao.custoOutros > 0 ? [['Outros', precificacao.custoOutros]] as [string, number][] : []),
            ].map(([label, valor], idx) => (
              <View key={idx} style={idx % 2 === 0 ? S.tabelaRow : S.tabelaRowAlt}>
                <Text style={[S.tabelaCell, { flex: 3 }]}>{label as string}</Text>
                <Text style={[S.tabelaCell, { flex: 1, textAlign: 'right' }]}>{R(valor as number)}</Text>
              </View>
            ))}
            <View style={S.tabelaTotal}>
              <Text style={[S.tabelaTotalCell, { flex: 3 }]}>Custo total direto</Text>
              <Text style={[S.tabelaTotalCell, { flex: 1, textAlign: 'right' }]}>{R(precificacao.custoTotalDireto)}</Text>
            </View>
            <View style={S.tabelaPreco}>
              <Text style={[S.tabelaPrecoCell, { flex: 3 }]}>VALOR TOTAL DA PROPOSTA</Text>
              <Text style={[S.tabelaPrecoCell, { flex: 1, textAlign: 'right' }]}>{R(precificacao.precoVenda)}</Text>
            </View>
          </View>

          <Text style={S.secaoTitulo}>Retorno do investimento</Text>
          <View style={S.destaque}>
            <View style={S.destaqueItem}>
              <Text style={[S.destaqueValor, { color: COR_POSITIVO }]}>{R(custosRecorrentes.economiaMensalRS)}</Text>
              <Text style={S.destaqueLabel}>Economia mensal</Text>
            </View>
            <View style={S.destaqueItem}>
              <Text style={[S.destaqueValor, { color: COR_ACENTO }]}>{N(precificacao.precoVenda / (custosRecorrentes.economiaMensalRS * 12), 1)} anos</Text>
              <Text style={S.destaqueLabel}>Payback estimado</Text>
            </View>
            <View style={S.destaqueItem}>
              <Text style={[S.destaqueValor, { color: COR_POSITIVO }]}>{R(custosRecorrentes.economiaMensalRS * 12 * 25 - precificacao.precoVenda)}</Text>
              <Text style={S.destaqueLabel}>Lucro líquido em 25 anos</Text>
            </View>
          </View>

          <Text style={S.secaoTitulo}>Condições comerciais</Text>
          <View style={S.alerta}>
            <Text style={S.alertaTexto}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Forma de pagamento: </Text>À vista ou financiado em até 72x. Consulte condições de parcelamento.{'\n'}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Prazo de instalação: </Text>A combinar após aprovação do projeto pela distribuidora.{'\n'}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Validade desta proposta: </Text>{empresa.validadeProposta} dias a partir de {hoje()}.{'\n'}
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Garantias: </Text>Módulos {kit.marcaModulo}: 25 anos de potência linear. Inversor {kit.marcaInversor}: conforme fabricante. Instalação: 1 ano.
            </Text>
          </View>

          {empresa.responsavelTecnico && (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <View style={{ borderTopWidth: 1, borderTopColor: '#ccc', width: 200, paddingTop: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: COR_TEXTO }}>{empresa.responsavelTecnico}</Text>
                <Text style={{ fontSize: 8, color: COR_CINZA }}>{empresa.razaoSocial}</Text>
                {empresa.crea && <Text style={{ fontSize: 8, color: COR_CINZA }}>CREA-{empresa.uf} nº {empresa.crea}</Text>}
              </View>
            </View>
          )}
        </View>
        <Footer empresa={empresa} />
      </Page>

    </Document>
  );
}
