import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useProjetoStore } from './store/useProjetoStore';
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { HSP_MEDIO_POR_UF } from '@data/hspPorUF';
import { PropostaPDF } from '@domain/proposta/PropostaPDF';

type Aba = 'empresa' | 'cliente' | 'consumo' | 'kit' | 'custos' | 'resultado';
const ABAS: { id: Aba; label: string }[] = [
  { id: 'empresa', label: '⚙ Empresa' },
  { id: 'cliente', label: '1. Cliente' },
  { id: 'consumo', label: '2. Consumo' },
  { id: 'kit', label: '3. Kit Solar' },
  { id: 'custos', label: '4. Precificação' },
  { id: 'resultado', label: '5. Resultado' },
];

const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const N = (v: number, dec = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const btnBase: React.CSSProperties = { padding: '8px 18px', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const inputStyle: React.CSSProperties = { padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #ddd' };
const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 13, borderTop: '1px solid #f0f0f0' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, margin: '16px 0 8px' }}>{title}</h3>
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function Row({ label, value, destaque, positivo }: { label: string; value: string; destaque?: boolean; positivo?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 13, background: destaque ? '#f0f7ff' : undefined, borderTop: '1px solid #f0f0f0' }}>
      <span style={{ color: '#333' }}>{label}</span>
      <span style={{ fontWeight: destaque ? 700 : 400, color: positivo ? '#2e7d32' : '#111' }}>{value}</span>
    </div>
  );
}

export default function App() {
  const [aba, setAba] = useState<Aba>('cliente');
  const [gerando, setGerando] = useState(false);
  const s = useProjetoStore();

  const contasValidas = s.consumo.contas.filter(c => c.kWh > 0);
  const mediaKWh = contasValidas.length > 0 ? contasValidas.reduce((a, c) => a + c.kWh, 0) / contasValidas.length : 0;
  const mediaRS = contasValidas.filter(c => c.valorRS > 0).length > 0
    ? contasValidas.filter(c => c.valorRS > 0).reduce((a, c) => a + c.valorRS, 0) / contasValidas.filter(c => c.valorRS > 0).length
    : 0;

  async function gerarPDF() {
    if (!s.dimensionamento || !s.precificacao || !s.custosRecorrentes || !s.enquadramento) return;
    setGerando(true);
    try {
      const blob = await pdf(
        <PropostaPDF data={{
          empresa: s.empresa,
          cliente: s.cliente,
          codigoDistribuidora: s.consumo.codigoDistribuidora,
          kit: s.kit.especificacao,
          dimensionamento: s.dimensionamento,
          custosRecorrentes: s.custosRecorrentes,
          precificacao: s.precificacao,
          enquadramento: s.enquadramento,
          percentuaisFioBPorAno: s.percentuaisFioBPorAno,
          consumoMedioMensalKWh: s.consumoMedioMensalKWh ?? 0,
          valorMedioMensalRS: s.valorMedioMensalRS ?? 0,
          aliquotaImpostos: s.custosConfig.aliquotaImpostos,
          margemDesejada: s.custosConfig.margemDesejada,
        }} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_Solar_${(s.cliente.nome || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '16px 24px' }}>
      <h1 style={{ margin: '0 0 4px' }}>☀️ SolarPropV</h1>
      <p style={{ color: '#666', margin: '0 0 20px', fontSize: 14 }}>Dimensionamento · Proposta Econômica · Lei 14.300/2022</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e0e0e0' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 13, borderBottom: aba === a.id ? '2px solid #1a73e8' : '2px solid transparent', background: 'none', color: aba === a.id ? '#1a73e8' : '#555', fontWeight: aba === a.id ? 700 : 400 }}>{a.label}</button>
        ))}
      </div>

      {/* ABA EMPRESA */}
      {aba === 'empresa' && (
        <div>
          <h2 style={{ marginTop: 0 }}>Dados da sua empresa</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>Preencha uma vez — aparece em todas as propostas geradas.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Razão Social<input value={s.empresa.razaoSocial} onChange={e => s.atualizarEmpresa({ razaoSocial: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Nome Fantasia<input value={s.empresa.nomeFantasia} onChange={e => s.atualizarEmpresa({ nomeFantasia: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>CNPJ<input value={s.empresa.cnpj} onChange={e => s.atualizarEmpresa({ cnpj: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>CREA<input value={s.empresa.crea} onChange={e => s.atualizarEmpresa({ crea: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Responsável Técnico<input value={s.empresa.responsavelTecnico} onChange={e => s.atualizarEmpresa({ responsavelTecnico: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Telefone<input value={s.empresa.telefone} onChange={e => s.atualizarEmpresa({ telefone: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>E-mail<input value={s.empresa.email} onChange={e => s.atualizarEmpresa({ email: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Site<input value={s.empresa.site} onChange={e => s.atualizarEmpresa({ site: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Endereço<input value={s.empresa.endereco} onChange={e => s.atualizarEmpresa({ endereco: e.target.value })} style={inputStyle} /></label>
            <label style={{ ...labelStyle, gridColumn: 'span 1' }}>
              Validade da proposta (dias)
              <input type="number" min={1} max={90} value={s.empresa.validadeProposta} onChange={e => s.atualizarEmpresa({ validadeProposta: Number(e.target.value) })} style={inputStyle} />
            </label>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Logo da empresa</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {s.empresa.logoBase64 && (
                <img src={s.empresa.logoBase64} alt="Logo" style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'contain', border: '2px solid #e0e0e0' }} />
              )}
              <div>
                <label style={{ display: 'inline-block', padding: '8px 16px', background: '#1a73e8', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {s.empresa.logoBase64 ? '🔄 Trocar logo' : '📂 Carregar logo'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => s.atualizarEmpresa({ logoBase64: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {s.empresa.logoBase64 && (
                  <button onClick={() => s.atualizarEmpresa({ logoBase64: undefined })} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 13 }}>Remover</button>
                )}
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#777' }}>Formatos: JPG, PNG, WEBP. Aparece na capa e no cabeçalho do PDF.</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={() => setAba('cliente')} style={{ ...btnBase, background: '#1a73e8' }}>Iniciar proposta →</button>
          </div>
        </div>
      )}

      {/* ABA CLIENTE */}
      {aba === 'cliente' && (
        <div>
          <h2 style={{ marginTop: 0 }}>Dados do cliente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['nome','cpfCnpj','telefone','email','endereco','cidade'] as const).map(k => (
              <label key={k} style={labelStyle}>
                {{ nome:'Nome completo', cpfCnpj:'CPF / CNPJ', telefone:'Telefone', email:'E-mail', endereco:'Endereço', cidade:'Cidade' }[k]}
                <input value={s.cliente[k]} onChange={e => s.atualizarCliente({ [k]: e.target.value })} style={inputStyle} />
              </label>
            ))}
            <label style={labelStyle}>UF
              <select value={s.cliente.uf} onChange={e => s.atualizarCliente({ uf: e.target.value })} style={inputStyle}>
                {Object.keys(HSP_MEDIO_POR_UF).map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16 }}><button onClick={() => setAba('consumo')} style={{ ...btnBase, background: '#1a73e8' }}>Próximo →</button></div>
        </div>
      )}

      {/* ABA CONSUMO */}
      {aba === 'consumo' && (
        <div>
          <h2 style={{ marginTop: 0 }}>Contas de energia</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <label style={labelStyle}>Distribuidora
              <select value={s.consumo.codigoDistribuidora} onChange={e => s.atualizarConsumo({ codigoDistribuidora: e.target.value })} style={inputStyle}>
                {DISTRIBUIDORAS.map(d => <option key={d.codigo} value={d.codigo}>{d.nomeAbreviado}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Tipo de ligação
              <select value={s.consumo.tipoLigacao} onChange={e => s.atualizarConsumo({ tipoLigacao: e.target.value as 'monofasica'|'bifasica'|'trifasica' })} style={inputStyle}>
                <option value="monofasica">Monofásica (30 kWh mín.)</option>
                <option value="bifasica">Bifásica (50 kWh mín.)</option>
                <option value="trifasica">Trifásica (100 kWh mín.)</option>
              </select>
            </label>
            <label style={labelStyle}>CIP / COSIP mensal (R$)
              <input type="number" step="0.01" value={s.consumo.cipMensalRS} onChange={e => s.atualizarConsumo({ cipMensalRS: Number(e.target.value) })} style={inputStyle} />
            </label>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Mês / Referência</th><th style={thStyle}>kWh</th><th style={thStyle}>Valor da conta (R$)</th><th style={thStyle}></th>
            </tr></thead>
            <tbody>
              {s.consumo.contas.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}><input value={c.mes} onChange={e => s.atualizarConta(i, { mes: e.target.value })} style={{ ...inputStyle, width: '95%' }} /></td>
                  <td style={tdStyle}><input type="number" value={c.kWh || ''} onChange={e => s.atualizarConta(i, { kWh: Number(e.target.value) })} style={{ ...inputStyle, width: '95%' }} /></td>
                  <td style={tdStyle}><input type="number" step="0.01" value={c.valorRS || ''} onChange={e => s.atualizarConta(i, { valorRS: Number(e.target.value) })} style={{ ...inputStyle, width: '95%' }} /></td>
                  <td style={tdStyle}><button onClick={() => s.removerConta(i)} style={{ color: '#c00', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={s.adicionarConta} style={{ marginTop: 8, fontSize: 13, padding: '4px 10px' }}>+ Adicionar mês</button>
          {mediaKWh > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: '#f0f7ff', borderRadius: 6, fontSize: 13 }}>
              <strong>Média calculada:</strong> {N(mediaKWh, 0)} kWh/mês · {R(mediaRS)}/mês
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setAba('cliente')} style={{ ...btnBase, background: '#757575' }}>← Anterior</button>
            <button onClick={() => setAba('kit')} style={{ ...btnBase, background: '#1a73e8' }}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ABA KIT */}
      {aba === 'kit' && (
        <div>
          <h2 style={{ marginTop: 0 }}>Kit Solar — dados do fornecedor</h2>
          {mediaKWh > 0 && (
            <div style={{ padding: '8px 12px', background: '#e8f5e9', borderRadius: 6, fontSize: 13, marginBottom: 12, color: '#2e7d32' }}>
              <strong>Consumo médio:</strong> {N(mediaKWh, 0)} kWh/mês — procure um kit que gere em torno desse valor.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Marca do módulo<input value={s.kit.especificacao.marcaModulo} onChange={e => s.atualizarEspecificacaoKit({ marcaModulo: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Modelo do módulo<input value={s.kit.especificacao.modeloModulo} onChange={e => s.atualizarEspecificacaoKit({ modeloModulo: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Tipo
              <select value={s.kit.especificacao.tipoModulo} onChange={e => s.atualizarEspecificacaoKit({ tipoModulo: e.target.value as 'monocristalino'|'policristalino'|'bifacial' })} style={inputStyle}>
                <option value="monocristalino">Monocristalino</option>
                <option value="policristalino">Policristalino</option>
                <option value="bifacial">Bifacial</option>
              </select>
            </label>
            <label style={labelStyle}>Potência do módulo (Wp)<input type="number" value={s.kit.especificacao.potenciaModuloWp} onChange={e => s.atualizarEspecificacaoKit({ potenciaModuloWp: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Quantidade de módulos<input type="number" value={s.kit.especificacao.quantidade || ''} onChange={e => s.atualizarEspecificacaoKit({ quantidade: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Marca do inversor<input value={s.kit.especificacao.marcaInversor} onChange={e => s.atualizarEspecificacaoKit({ marcaInversor: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Modelo do inversor<input value={s.kit.especificacao.modeloInversor} onChange={e => s.atualizarEspecificacaoKit({ modeloInversor: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Potência do inversor (kW)<input type="number" step="0.1" value={s.kit.especificacao.potenciaInversorKW || ''} onChange={e => s.atualizarEspecificacaoKit({ potenciaInversorKW: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Custo do kit no fornecedor (R$)<input type="number" step="0.01" value={s.kit.especificacao.custoKitRS || ''} onChange={e => s.atualizarEspecificacaoKit({ custoKitRS: Number(e.target.value) })} style={inputStyle} /></label>
          </div>

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Especificações técnicas do módulo (da ficha do fabricante)</h3>
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
            Esses dados estão na ficha técnica do PDF do seu fornecedor — usados para calcular as perdas com precisão.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Coef. temperatura Pmax (%/°C)
              <input type="number" step="0.01" value={s.kit.especificacao.coeficienteTemperaturaPmax ?? -0.34}
                onChange={e => s.atualizarEspecificacaoKit({ coeficienteTemperaturaPmax: Number(e.target.value) })}
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              NOCT (°C)
              <input type="number" step="0.5" value={s.kit.especificacao.noct ?? 45}
                onChange={e => s.atualizarEspecificacaoKit({ noct: Number(e.target.value) })}
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Eficiência do inversor (%)
              <input type="number" step="0.1" value={s.kit.especificacao.eficienciaInversorPercent ?? 97}
                onChange={e => s.atualizarEspecificacaoKit({ eficienciaInversorPercent: Number(e.target.value) })}
                style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!s.kit.especificacao.bifacial}
                onChange={e => s.atualizarEspecificacaoKit({ bifacial: e.target.checked })} />
              Módulo bifacial
            </label>
            {s.kit.especificacao.bifacial && (
              <label style={labelStyle}>
                Fator de bifacialidade mínimo (%)
                <input type="number" step="1" value={s.kit.especificacao.ganhoBifacialPercent ?? 5}
                  onChange={e => s.atualizarEspecificacaoKit({ ganhoBifacialPercent: Number(e.target.value) })}
                  style={inputStyle} />
              </label>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setAba('consumo')} style={{ ...btnBase, background: '#757575' }}>← Anterior</button>
            <button onClick={() => setAba('custos')} style={{ ...btnBase, background: '#1a73e8' }}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ABA CUSTOS */}
      {aba === 'custos' && (
        <div>
          <h2 style={{ marginTop: 0 }}>Composição de custos e precificação</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Estrutura de fixação (R$)<input type="number" step="0.01" value={s.custosConfig.composicao.estruturaRS || ''} onChange={e => s.atualizarComposicao({ estruturaRS: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Materiais elétricos (R$)<input type="number" step="0.01" value={s.custosConfig.composicao.materiaisEletricosRS || ''} onChange={e => s.atualizarComposicao({ materiaisEletricosRS: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Mão de obra de instalação (R$)<input type="number" step="0.01" value={s.custosConfig.composicao.maoDeObraRS || ''} onChange={e => s.atualizarComposicao({ maoDeObraRS: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Projeto elétrico + ART (R$)<input type="number" step="0.01" value={s.custosConfig.composicao.projetoArtRS || ''} onChange={e => s.atualizarComposicao({ projetoArtRS: Number(e.target.value) })} style={inputStyle} /></label>
            <label style={labelStyle}>Outros (R$)<input type="number" step="0.01" value={s.custosConfig.composicao.outrosCustosRS || ''} onChange={e => s.atualizarComposicao({ outrosCustosRS: Number(e.target.value) })} style={inputStyle} /></label>
          </div>
          <h3 style={{ marginTop: 20 }}>Tributação e margem</h3>
          <div style={{ background: '#fffbe6', border: '1px solid #ffe066', borderRadius: 6, padding: 12, fontSize: 13, marginBottom: 12 }}>
            <strong>Simples Nacional:</strong> use a alíquota efetiva do seu DAS mensal (seu contador fornece). Ponto de partida: 6%.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Alíquota efetiva de impostos (%)<input type="number" step="0.1" min="0" max="33" value={Number((s.custosConfig.aliquotaImpostos * 100).toFixed(1))} onChange={e => s.atualizarCustos({ aliquotaImpostos: Number(e.target.value) / 100 })} style={inputStyle} /></label>
            <label style={labelStyle}>Margem de lucro desejada (% sobre o preço de venda)<input type="number" step="1" min="0" max="60" value={Number((s.custosConfig.margemDesejada * 100).toFixed(0))} onChange={e => s.atualizarCustos({ margemDesejada: Number(e.target.value) / 100 })} style={inputStyle} /></label>
          </div>
          <h3 style={{ marginTop: 20 }}>Enquadramento Lei 14.300/2022</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Data de protocolo de acesso na distribuidora<input type="date" value={s.enquadramentoConfig.dataProtocoloAcesso} onChange={e => s.atualizarEnquadramento({ dataProtocoloAcesso: e.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Reajuste tarifário esperado (%/ano)<input type="number" step="0.5" min="0" max="30" value={Number((s.enquadramentoConfig.reajusteTarifarioAnual * 100).toFixed(1))} onChange={e => s.atualizarEnquadramento({ reajusteTarifarioAnual: Number(e.target.value) / 100 })} style={inputStyle} /></label>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button onClick={() => setAba('kit')} style={{ ...btnBase, background: '#757575' }}>← Anterior</button>
            <button onClick={() => { s.calcularTudo(); setAba('resultado'); }} style={{ ...btnBase, background: '#2e7d32' }}>✓ Calcular e ver resultado</button>
          </div>
        </div>
      )}

      {/* ABA RESULTADO */}
      {aba === 'resultado' && !s.dimensionamento && (
        <div style={{ padding: 24, color: '#666' }}>
          <p>Nenhum cálculo realizado ainda.</p>
          <button onClick={() => setAba('custos')} style={{ ...btnBase, background: '#1a73e8' }}>← Ir para precificação</button>
        </div>
      )}

      {aba === 'resultado' && s.dimensionamento && s.precificacao && s.custosRecorrentes && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Resultado — {s.cliente.nome || 'Cliente'}</h2>
            <button
              onClick={gerarPDF}
              disabled={gerando}
              style={{ ...btnBase, background: gerando ? '#aaa' : '#c62828', fontSize: 13, padding: '8px 20px' }}
            >
              {gerando ? '⏳ Gerando PDF...' : '📄 Baixar Proposta PDF'}
            </button>
          </div>

          <Section title="📐 Sistema fotovoltaico">
            <Row label="Potência instalada" value={`${N(s.dimensionamento.potenciaInstaladaRealKWp)} kWp`} />
            <Row label="Módulos" value={`${s.dimensionamento.numeroModulos} × ${s.kit.especificacao.marcaModulo} ${s.kit.especificacao.modeloModulo} ${s.kit.especificacao.potenciaModuloWp}Wp`} />
            <Row label="Inversor" value={`${s.kit.especificacao.marcaInversor} ${s.kit.especificacao.modeloInversor} ${s.kit.especificacao.potenciaInversorKW}kW`} />
            <Row label="Geração mensal estimada" value={`${N(s.dimensionamento.geracaoMensalEstimadaKWh, 0)} kWh`} />
            <Row label="Geração anual estimada" value={`${N(s.dimensionamento.geracaoAnualEstimadaKWh, 0)} kWh`} />
            <Row label="Compensação alcançada" value={`${N(s.dimensionamento.percentualCompensacaoReal * 100, 0)}%`} destaque />
          </Section>

          {s.detalhamentoPerdas.length > 0 && (
            <Section title="⚙ Perdas do sistema — composição">
              {s.detalhamentoPerdas.map((linha, i) => {
                const isTotal = linha.includes('total');
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 12px', fontSize:12, borderTop:'1px solid #f0f0f0', background: isTotal ? '#f0f7ff' : undefined }}>
                    <span style={{ color:'#555', fontWeight: isTotal ? 700 : 400 }}>{linha.split(':')[0]}</span>
                    <span style={{ color: linha.includes('+') ? '#2e7d32' : isTotal ? '#1a5276' : '#c62828', fontWeight: isTotal ? 700 : 400 }}>{linha.split(':')[1]}</span>
                  </div>
                );
              })}
            </Section>
          )}

          <Section title="💡 O que o cliente paga todo mês (mesmo com solar instalado)">
            <Row label="Taxa de disponibilidade (mínimo faturável)" value={R(s.custosRecorrentes.taxaDisponibilidadeRS)} />
            <Row label="CIP / Iluminação pública" value={R(s.custosRecorrentes.cipRS)} />
            <Row label={`Fio B — Lei 14.300 (${N((s.percentuaisFioBPorAno[new Date().getFullYear()] ?? 0) * 100, 0)}% em ${new Date().getFullYear()})`} value={R(s.custosRecorrentes.custoBFioMensalRS)} />
            <Row label="Total fixo mensal após o solar" value={R(s.custosRecorrentes.totalFixoMensalRS)} destaque />
            <Row label="Conta antes do solar (referência)" value={R(s.custosRecorrentes.contaAntesRS)} />
            <Row label="Economia mensal estimada" value={R(s.custosRecorrentes.economiaMensalRS)} positivo />
          </Section>

          <Section title="📈 Evolução do Fio B — Lei 14.300/2022">
            {s.enquadramento?.elegivelArt26 ? (
              <div style={{ padding: 12, fontSize: 13, color: '#2e7d32' }}>✅ Regra de transição do art. 26 — Fio B isento até 31/12/2045.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f5f5f5' }}>
                  <th style={thStyle}>Ano</th><th style={thStyle}>% Fio B</th><th style={thStyle}>Custo adicional/mês est.</th>
                </tr></thead>
                <tbody>
                  {[2025,2026,2027,2028,2029,2030].map(ano => {
                    const distrib = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
                    const custo = s.dimensionamento!.geracaoMensalEstimadaKWh * distrib.tarifaKWhComICMS * 0.35 * (s.percentuaisFioBPorAno[ano] ?? 1);
                    return (<tr key={ano}>
                      <td style={tdStyle}>{ano}</td>
                      <td style={tdStyle}>{N((s.percentuaisFioBPorAno[ano] ?? 1) * 100, 0)}%</td>
                      <td style={tdStyle}>{R(custo)}</td>
                    </tr>);
                  })}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="💰 Precificação">
            <Row label="Custo do kit (fornecedor)" value={R(s.precificacao.custoKit)} />
            <Row label="Estrutura de fixação" value={R(s.precificacao.custoEstrutura)} />
            <Row label="Materiais elétricos" value={R(s.precificacao.custoMateriais)} />
            <Row label="Mão de obra" value={R(s.precificacao.custoMaoDeObra)} />
            <Row label="Projeto + ART" value={R(s.precificacao.custoProjetoArt)} />
            {s.precificacao.custoOutros > 0 && <Row label="Outros" value={R(s.precificacao.custoOutros)} />}
            <Row label="Custo total direto" value={R(s.precificacao.custoTotalDireto)} destaque />
            <Row label={`Impostos (${N(s.custosConfig.aliquotaImpostos * 100, 1)}% sobre o preço de venda)`} value={R(s.precificacao.impostoSobreVenda)} />
            <Row label={`Lucro líquido (margem de ${N(s.precificacao.margemPercentual, 0)}%)`} value={R(s.precificacao.lucroLiquido)} positivo />
            <Row label="Preço de venda à vista" value={R(s.precificacao.precoVenda)} destaque />
          </Section>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => setAba('custos')} style={{ ...btnBase, background: '#757575' }}>← Editar</button>
            <button
              onClick={gerarPDF}
              disabled={gerando}
              style={{ ...btnBase, background: gerando ? '#aaa' : '#c62828' }}
            >
              {gerando ? '⏳ Gerando PDF...' : '📄 Baixar Proposta PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
