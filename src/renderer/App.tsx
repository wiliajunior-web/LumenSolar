import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useProjetoStore, PRESETS_MODULO, type TipoModuloPreset } from './store/useProjetoStore';
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { HSP_MEDIO_POR_UF } from '@data/hspPorUF';
import { PropostaPDF } from '@domain/proposta/PropostaPDF';

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  dark:    '#0d1117',
  navy:    '#1a1a2e',
  gold:    '#c9a227',
  goldSoft:'#f0d878',
  bg:      '#f4f3ef',
  card:    '#ffffff',
  border:  '#e0ddd4',
  text:    '#1a202c',
  muted:   '#718096',
  success: '#15803d',
  danger:  '#dc2626',
  info:    '#1d4ed8',
};

// ─── Estilos base ────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui,-apple-system,sans-serif; background:${C.bg}; color:${C.text}; }
  input, select { font-family: inherit; font-size: 13px; }
  input[type=number] { font-variant-numeric: tabular-nums; }
  .ls-input {
    width: 100%; padding: 7px 10px; border: 1.5px solid ${C.border};
    border-radius: 6px; font-size: 13px; background: #fff;
    transition: border-color .15s;
    color: ${C.text};
  }
  .ls-input:focus { outline: none; border-color: ${C.gold}; box-shadow: 0 0 0 3px ${C.gold}22; }
  .ls-label { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:600;
    color:${C.muted}; text-transform:uppercase; letter-spacing:.04em; }
  .ls-card { background:${C.card}; border-radius:12px; border:1px solid ${C.border};
    box-shadow:0 1px 4px rgba(0,0,0,.06); overflow:hidden; margin-bottom:14px; }
  .ls-card-head { padding:14px 18px; border-bottom:1px solid ${C.border};
    font-size:13px; font-weight:700; color:${C.navy}; display:flex; align-items:center; gap:8px; }
  .ls-card-head::before { content:''; display:block; width:3px; height:18px;
    background:${C.gold}; border-radius:2px; flex-shrink:0; }
  .ls-card-body { padding:16px 18px; }
  .ls-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .ls-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .ls-row { display:flex; justify-content:space-between; align-items:center;
    padding:8px 0; border-bottom:1px solid ${C.border}22; font-size:13px; }
  .ls-row:last-child { border-bottom:none; }
  .ls-row-label { color:${C.muted}; }
  .ls-row-val { font-variant-numeric:tabular-nums; font-weight:500; }
  .ls-row-val.gold { color:${C.gold}; font-weight:700; font-size:15px; }
  .ls-row-val.green { color:${C.success}; font-weight:700; }
  .ls-row-val.strong { font-weight:700; color:${C.navy}; }
  .ls-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .ls-badge-gold { background:${C.gold}22; color:#7a5c00; }
  .ls-badge-green { background:#dcfce7; color:#15803d; }
  .ls-badge-blue { background:#dbeafe; color:#1d4ed8; }
  .ls-hint { font-size:11px; color:${C.muted}; margin-top:3px; }
  .ls-divider { height:1px; background:${C.border}; margin:12px 0; }
  .ls-tag-default { display:inline-flex; align-items:center; gap:5px; font-size:11px;
    color:${C.muted}; background:${C.bg}; border:1px solid ${C.border}; border-radius:4px; padding:2px 7px; }
`;

// ─── Utilitários ─────────────────────────────────────────────────────────────
const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const N = (v: number, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ─── Botões ──────────────────────────────────────────────────────────────────
function BtnPrimary({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 22px', background: disabled ? '#ccc' : C.gold, color: C.dark,
      border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
      cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '.02em',
    }}>{children}</button>
  );
}
function BtnSecondary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 22px', background: 'transparent', color: C.muted,
      border: `1.5px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    }}>{children}</button>
  );
}

// ─── Campo com valor padrão editável ─────────────────────────────────────────
function CampoValor({ label, value, onChange, hint, prefix = 'R$', suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; prefix?: string; suffix?: string;
}) {
  return (
    <label className="ls-label">
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {prefix && <span style={{ fontSize: 12, color: C.muted }}>{prefix}</span>}
        <input
          className="ls-input" type="number" step="0.01"
          value={value || ''}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        {suffix && <span style={{ fontSize: 12, color: C.muted }}>{suffix}</span>}
      </div>
      {hint && <span className="ls-hint">{hint}</span>}
    </label>
  );
}

// ─── Tabela de resultados ────────────────────────────────────────────────────
function LinhaResultado({ label, valor, tipo = 'normal' }: { label: string; valor: string; tipo?: 'normal' | 'strong' | 'gold' | 'green' }) {
  return (
    <div className="ls-row">
      <span className="ls-row-label">{label}</span>
      <span className={`ls-row-val ${tipo}`}>{valor}</span>
    </div>
  );
}

// ─── Abas ────────────────────────────────────────────────────────────────────
type Aba = 'empresa' | 'cliente' | 'consumo' | 'kit' | 'precificacao' | 'resultado';
const ABAS: { id: Aba; label: string; emoji: string }[] = [
  { id: 'empresa', label: 'Empresa', emoji: '⚙' },
  { id: 'cliente', label: 'Cliente', emoji: '👤' },
  { id: 'consumo', label: 'Consumo', emoji: '⚡' },
  { id: 'kit', label: 'Kit Solar', emoji: '☀️' },
  { id: 'precificacao', label: 'Preço', emoji: '💰' },
  { id: 'resultado', label: 'Resultado', emoji: '📊' },
];

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<Aba>('cliente');
  const [gerando, setGerando] = useState(false);
  const s = useProjetoStore();

  const validas = s.consumo.contas.filter(c => c.kWh > 0);
  const mediaKWh = validas.length > 0 ? validas.reduce((a, c) => a + c.kWh, 0) / validas.length : 0;
  const mediaRS = validas.filter(c => c.valorRS > 0).length > 0
    ? validas.filter(c => c.valorRS > 0).reduce((a, c) => a + c.valorRS, 0) / validas.filter(c => c.valorRS > 0).length : 0;

  async function gerarPDF() {
    if (!s.dimensionamento || !s.precificacao || !s.custosRecorrentes || !s.enquadramento) return;
    setGerando(true);
    try {
      const blob = await pdf(
        <PropostaPDF data={{
          empresa: s.empresa, cliente: s.cliente,
          codigoDistribuidora: s.consumo.codigoDistribuidora,
          kit: {
            marcaModulo: s.kit.marcaModulo, modeloModulo: s.kit.modeloModulo,
            potenciaModuloWp: s.kit.potenciaModuloWp, quantidade: s.kit.quantidade,
            tipoModulo: s.kit.tipoModulo === 'policristalino' ? 'policristalino' : PRESETS_MODULO[s.kit.tipoModulo].bifacial ? 'bifacial' : 'monocristalino',
            marcaInversor: s.kit.marcaInversor, modeloInversor: s.kit.modeloInversor,
            potenciaInversorKW: s.kit.potenciaInversorKW, custoKitRS: s.kit.custoKitRS,
          },
          dimensionamento: s.dimensionamento,
          custosRecorrentes: s.custosRecorrentes,
          precificacao: s.precificacao,
          enquadramento: s.enquadramento,
          percentuaisFioBPorAno: s.percentuaisFioBPorAno,
          consumoMedioMensalKWh: s.consumoMedioMensalKWh ?? 0,
          valorMedioMensalRS: s.valorMedioMensalRS ?? 0,
          aliquotaImpostos: s.preco.aliquotaImpostos,
          margemDesejada: s.preco.margemDesejada,
        }} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_${(s.cliente.nome || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

  function irParaResultado() {
    s.calcularTudo();
    setAba('resultado');
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header style={{ background: C.dark, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 52, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {s.empresa.logoBase64
              ? <img src={s.empresa.logoBase64} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'contain' }} />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.dark }}>L</div>
            }
            <div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '.04em' }}>LUMEN</span>
              <span style={{ color: C.gold, fontWeight: 600, fontSize: 15, marginLeft: 1 }}>SOLAR</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Indicador de progresso */}
          <div style={{ display: 'flex', gap: 3 }}>
            {ABAS.filter(a => a.id !== 'empresa').map((a, i) => (
              <div key={a.id} onClick={() => setAba(a.id)} style={{
                width: 28, height: 4, borderRadius: 2, cursor: 'pointer',
                background: aba === a.id ? C.gold : aba === 'resultado' && i < 4 ? '#3a3a3a' : '#2a2a2a',
              }} title={a.label} />
            ))}
          </div>
          <button onClick={() => setAba('empresa')} style={{
            background: 'none', border: `1px solid ${C.gold}44`, color: C.gold,
            padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600,
          }}>⚙ Empresa</button>
        </header>

        {/* ── Navegação de abas ─────────────────────────────────────────────── */}
        <div style={{ background: C.navy, display: 'flex', padding: '0 24px', gap: 2, flexShrink: 0 }}>
          {ABAS.filter(a => a.id !== 'empresa').map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, letterSpacing: '.03em',
              color: aba === a.id ? C.gold : '#8892a4',
              borderBottom: aba === a.id ? `2px solid ${C.gold}` : '2px solid transparent',
              transition: 'color .15s',
            }}>{a.emoji} {a.label}</button>
          ))}
        </div>

        {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

          {/* ══ ABA EMPRESA ════════════════════════════════════════════════ */}
          {aba === 'empresa' && (
            <div style={{ maxWidth: 700 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.navy }}>Configurações da empresa</h2>

              <div className="ls-card">
                <div className="ls-card-head">Dados institucionais</div>
                <div className="ls-card-body">
                  <div className="ls-grid-2" style={{ marginBottom: 12 }}>
                    <label className="ls-label">Razão Social<input className="ls-input" value={s.empresa.razaoSocial} onChange={e => s.atualizarEmpresa({ razaoSocial: e.target.value })} /></label>
                    <label className="ls-label">Nome Fantasia<input className="ls-input" value={s.empresa.nomeFantasia} onChange={e => s.atualizarEmpresa({ nomeFantasia: e.target.value })} /></label>
                    <label className="ls-label">CNPJ<input className="ls-input" value={s.empresa.cnpj} onChange={e => s.atualizarEmpresa({ cnpj: e.target.value })} /></label>
                    <label className="ls-label">CREA<input className="ls-input" value={s.empresa.crea} onChange={e => s.atualizarEmpresa({ crea: e.target.value })} /></label>
                    <label className="ls-label">Responsável Técnico<input className="ls-input" value={s.empresa.responsavelTecnico} onChange={e => s.atualizarEmpresa({ responsavelTecnico: e.target.value })} /></label>
                    <label className="ls-label">Telefone<input className="ls-input" value={s.empresa.telefone} onChange={e => s.atualizarEmpresa({ telefone: e.target.value })} /></label>
                    <label className="ls-label" style={{ gridColumn: 'span 2' }}>E-mail<input className="ls-input" value={s.empresa.email} onChange={e => s.atualizarEmpresa({ email: e.target.value })} /></label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                    {s.empresa.logoBase64 && <img src={s.empresa.logoBase64} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'contain', border: `2px solid ${C.border}` }} />}
                    <label style={{ display: 'inline-block', padding: '7px 14px', background: C.gold, color: C.dark, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      {s.empresa.logoBase64 ? '🔄 Trocar logo' : '📂 Carregar logo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => s.atualizarEmpresa({ logoBase64: ev.target?.result as string });
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    {s.empresa.logoBase64 && <button onClick={() => s.atualizarEmpresa({ logoBase64: undefined })} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remover</button>}
                  </div>
                </div>
              </div>

              <div className="ls-card">
                <div className="ls-card-head">Valores-base de precificação</div>
                <div className="ls-card-body">
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Estes valores preenchem a proposta automaticamente. Você pode ajustar por projeto.</p>
                  <div className="ls-grid-2" style={{ gap: 14 }}>
                    <CampoValor label="Estrutura de fixação (por kWp)" value={s.empresa.valorEstruturaPorKWp} onChange={v => s.atualizarEmpresa({ valorEstruturaPorKWp: v })} hint="Padrão: R$150/kWp instalado" suffix="/kWp" prefix="R$" />
                    <CampoValor label="Materiais elétricos (por kWp)" value={s.empresa.valorMateriaisPorKWp} onChange={v => s.atualizarEmpresa({ valorMateriaisPorKWp: v })} hint="Cabos, DPS, disjuntores. Padrão: R$120/kWp" suffix="/kWp" prefix="R$" />
                    <CampoValor label="Mão de obra (por módulo)" value={s.empresa.valorMaoDeObraPorModulo} onChange={v => s.atualizarEmpresa({ valorMaoDeObraPorModulo: v })} hint="Instalação + comissionamento. Padrão: R$280/módulo" suffix="/módulo" prefix="R$" />
                    <CampoValor label="Projeto + ART CREA" value={s.empresa.valorProjetoArt} onChange={v => s.atualizarEmpresa({ valorProjetoArt: v })} hint="ART CREA-MG ~R$130 + projeto elétrico ~R$400" prefix="R$" />
                    <CampoValor label="Alíquota Simples Nacional" value={s.empresa.aliquotaImpostos * 100} onChange={v => s.atualizarEmpresa({ aliquotaImpostos: v / 100 })} hint="Alíquota efetiva do DAS mensal (seu contador informa)" suffix="%" prefix="" />
                    <CampoValor label="Margem de lucro padrão" value={s.empresa.margemPadrao * 100} onChange={v => s.atualizarEmpresa({ margemPadrao: v / 100 })} hint="% sobre o preço de venda (não sobre o custo)" suffix="%" prefix="" />
                  </div>
                </div>
              </div>
              <label className="ls-label" style={{ marginTop: 12 }}>
                Validade padrão das propostas (dias)
                <input className="ls-input" type="number" value={s.empresa.validadeProposta} onChange={e => s.atualizarEmpresa({ validadeProposta: Number(e.target.value) })} style={{ width: 120 }} />
              </label>
            </div>
          )}

          {/* ══ ABA CLIENTE ════════════════════════════════════════════════ */}
          {aba === 'cliente' && (
            <div style={{ maxWidth: 620 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.navy }}>Dados do cliente</h2>
              <div className="ls-card">
                <div className="ls-card-body">
                  <div className="ls-grid-2">
                    <label className="ls-label" style={{ gridColumn: 'span 2' }}>
                      Nome completo <span style={{ color: C.danger }}>*</span>
                      <input className="ls-input" value={s.cliente.nome} onChange={e => s.atualizarCliente({ nome: e.target.value })} placeholder="Nome do cliente ou empresa" />
                    </label>
                    <label className="ls-label">Telefone<input className="ls-input" value={s.cliente.telefone} onChange={e => s.atualizarCliente({ telefone: e.target.value })} placeholder="(34) 9 9999-9999" /></label>
                    <label className="ls-label">E-mail<input className="ls-input" value={s.cliente.email} onChange={e => s.atualizarCliente({ email: e.target.value })} placeholder="email@exemplo.com" /></label>
                    <label className="ls-label">Cidade<input className="ls-input" value={s.cliente.cidade} onChange={e => s.atualizarCliente({ cidade: e.target.value })} /></label>
                    <label className="ls-label">UF
                      <select className="ls-input" value={s.cliente.uf} onChange={e => s.atualizarCliente({ uf: e.target.value })}>
                        {Object.keys(HSP_MEDIO_POR_UF).map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <BtnPrimary onClick={() => setAba('consumo')}>Próximo: Consumo →</BtnPrimary>
              </div>
            </div>
          )}

          {/* ══ ABA CONSUMO ════════════════════════════════════════════════ */}
          {aba === 'consumo' && (
            <div style={{ maxWidth: 720 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.navy }}>Consumo de energia</h2>

              <div className="ls-card">
                <div className="ls-card-head">Distribuidora</div>
                <div className="ls-card-body">
                  <div className="ls-grid-3">
                    <label className="ls-label" style={{ gridColumn: 'span 2' }}>Distribuidora
                      <select className="ls-input" value={s.consumo.codigoDistribuidora} onChange={e => s.atualizarConsumo({ codigoDistribuidora: e.target.value })}>
                        {DISTRIBUIDORAS.map(d => <option key={d.codigo} value={d.codigo}>{d.nomeAbreviado}</option>)}
                      </select>
                    </label>
                    <label className="ls-label">Tipo de ligação
                      <select className="ls-input" value={s.consumo.tipoLigacao} onChange={e => s.atualizarConsumo({ tipoLigacao: e.target.value as 'monofasica' | 'bifasica' | 'trifasica' })}>
                        <option value="monofasica">Monofásica (30 kWh mín.)</option>
                        <option value="bifasica">Bifásica (50 kWh mín.)</option>
                        <option value="trifasica">Trifásica (100 kWh mín.)</option>
                      </select>
                    </label>
                  </div>
                  <div style={{ marginTop: 12, maxWidth: 200 }}>
                    <CampoValor label="CIP / Iluminação Pública" value={s.consumo.cipMensalRS} onChange={v => s.atualizarConsumo({ cipMensalRS: v })} hint="Valor municipal — ver conta de energia" />
                  </div>
                </div>
              </div>

              <div className="ls-card">
                <div className="ls-card-head">Histórico de consumo
                  {mediaKWh > 0 && <span className="ls-badge ls-badge-gold" style={{ marginLeft: 'auto' }}>Média: {N(mediaKWh, 0)} kWh/mês · {R(mediaRS)}/mês</span>}
                </div>
                <div className="ls-card-body" style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>Mês</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>kWh</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>Valor (R$)</th>
                        <th style={{ width: 32 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {s.consumo.contas.map((c, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '5px 14px' }}><input className="ls-input" value={c.mes} onChange={e => s.atualizarConta(i, { mes: e.target.value })} style={{ width: 90, padding: '4px 6px' }} /></td>
                          <td style={{ padding: '5px 14px', textAlign: 'right' }}><input className="ls-input" type="number" value={c.kWh || ''} onChange={e => s.atualizarConta(i, { kWh: Number(e.target.value) })} style={{ width: 90, textAlign: 'right', padding: '4px 6px' }} /></td>
                          <td style={{ padding: '5px 14px', textAlign: 'right' }}><input className="ls-input" type="number" step="0.01" value={c.valorRS || ''} onChange={e => s.atualizarConta(i, { valorRS: Number(e.target.value) })} style={{ width: 110, textAlign: 'right', padding: '4px 6px' }} /></td>
                          <td style={{ padding: '5px 8px' }}><button onClick={() => s.removerConta(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '8px 14px' }}>
                    <button onClick={s.adicionarConta} style={{ background: 'none', border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>+ mês</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <BtnSecondary onClick={() => setAba('cliente')}>← Cliente</BtnSecondary>
                <BtnPrimary onClick={() => setAba('kit')}>Próximo: Kit Solar →</BtnPrimary>
              </div>
            </div>
          )}

          {/* ══ ABA KIT ════════════════════════════════════════════════════ */}
          {aba === 'kit' && (
            <div style={{ maxWidth: 680 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: C.navy }}>Kit Solar</h2>
              {mediaKWh > 0 && <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Consumo médio do cliente: <strong style={{ color: C.navy }}>{N(mediaKWh, 0)} kWh/mês</strong> — encontre um kit que gere esse valor no site do fornecedor.</p>}

              <div className="ls-card">
                <div className="ls-card-head">Módulos fotovoltaicos</div>
                <div className="ls-card-body">
                  <div className="ls-grid-2" style={{ marginBottom: 12 }}>
                    <label className="ls-label">Tipo do módulo
                      <select className="ls-input" value={s.kit.tipoModulo} onChange={e => s.atualizarKit({ tipoModulo: e.target.value as TipoModuloPreset })}>
                        {(Object.entries(PRESETS_MODULO) as [TipoModuloPreset, typeof PRESETS_MODULO[TipoModuloPreset]][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <span className="ls-hint">Define automaticamente os parâmetros de perda</span>
                    </label>
                    <label className="ls-label">Marca<input className="ls-input" value={s.kit.marcaModulo} onChange={e => s.atualizarKit({ marcaModulo: e.target.value })} placeholder="Ex: Leapton, DAH, JA Solar" /></label>
                    <label className="ls-label">Modelo<input className="ls-input" value={s.kit.modeloModulo} onChange={e => s.atualizarKit({ modeloModulo: e.target.value })} placeholder="Ex: 620W BIF N-TYPE" /></label>
                    <label className="ls-label">Potência (Wp)
                      <input className="ls-input" type="number" value={s.kit.potenciaModuloWp} onChange={e => s.atualizarKit({ potenciaModuloWp: Number(e.target.value) })} />
                    </label>
                    <label className="ls-label">Quantidade de módulos
                      <input className="ls-input" type="number" value={s.kit.quantidade || ''} onChange={e => s.atualizarKit({ quantidade: Number(e.target.value) })} />
                    </label>
                    {s.kit.potenciaModuloWp > 0 && s.kit.quantidade > 0 && (
                      <div style={{ gridColumn: 'span 2', background: C.bg, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                        <span style={{ color: C.muted }}>Potência do sistema: </span>
                        <strong style={{ color: C.navy }}>{N((s.kit.potenciaModuloWp * s.kit.quantidade) / 1000, 2)} kWp</strong>
                        <span style={{ color: C.muted, marginLeft: 16 }}>({s.kit.quantidade} × {s.kit.potenciaModuloWp}Wp)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ls-card">
                <div className="ls-card-head">Inversor</div>
                <div className="ls-card-body">
                  <div className="ls-grid-2">
                    <label className="ls-label">Marca<input className="ls-input" value={s.kit.marcaInversor} onChange={e => s.atualizarKit({ marcaInversor: e.target.value })} placeholder="Ex: Growatt, Fronius, SMA" /></label>
                    <label className="ls-label">Modelo<input className="ls-input" value={s.kit.modeloInversor} onChange={e => s.atualizarKit({ modeloInversor: e.target.value })} placeholder="Ex: MIN 6000TL-X2" /></label>
                    <label className="ls-label">Potência (kW)<input className="ls-input" type="number" step="0.1" value={s.kit.potenciaInversorKW || ''} onChange={e => s.atualizarKit({ potenciaInversorKW: Number(e.target.value) })} /></label>
                    <label className="ls-label">Eficiência máxima (%)
                      <input className="ls-input" type="number" step="0.1" value={s.kit.eficienciaInversorPercent} onChange={e => s.atualizarKit({ eficienciaInversorPercent: Number(e.target.value) })} />
                      <span className="ls-hint">Growatt MIN X2: 98,4% · Fronius: 98,1% · Padrão: 97%</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="ls-card">
                <div className="ls-card-head">Custo do kit e enquadramento</div>
                <div className="ls-card-body">
                  <div className="ls-grid-2">
                    <CampoValor label="Custo do kit no fornecedor" value={s.kit.custoKitRS} onChange={v => s.atualizarKit({ custoKitRS: v })} hint="Módulos + inversor conforme orçamento do fornecedor" />
                    <label className="ls-label">Data do protocolo de acesso
                      <input className="ls-input" type="date" value={s.kit.dataProtocoloAcesso} onChange={e => s.atualizarKit({ dataProtocoloAcesso: e.target.value })} />
                      <span className="ls-hint">Define a regra de Fio B (Lei 14.300/2022)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <BtnSecondary onClick={() => setAba('consumo')}>← Consumo</BtnSecondary>
                <BtnPrimary onClick={() => { s.recalcularDefaultsPreco(); setAba('precificacao'); }}>Próximo: Preço →</BtnPrimary>
              </div>
            </div>
          )}

          {/* ══ ABA PRECIFICAÇÃO ═══════════════════════════════════════════ */}
          {aba === 'precificacao' && (
            <div style={{ maxWidth: 680 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: C.navy }}>Precificação</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Valores calculados automaticamente pelos seus parâmetros de empresa. Ajuste se necessário.</p>

              <div className="ls-card">
                <div className="ls-card-head">Composição de custos</div>
                <div className="ls-card-body">
                  <div className="ls-grid-2" style={{ gap: 14 }}>
                    <div>
                      <div className="ls-label" style={{ marginBottom: 6 }}>Kit solar (fornecedor)</div>
                      <div style={{ padding: '8px 10px', background: C.bg, borderRadius: 6, fontSize: 13, fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>{R(s.kit.custoKitRS)}</div>
                      <span className="ls-hint">Fixo — vem do orçamento do fornecedor</span>
                    </div>
                    <CampoValor label="Estrutura de fixação" value={s.preco.estruturaRS} onChange={v => s.atualizarPreco({ estruturaRS: v })} hint={`Auto: ${N(s.kit.potenciaModuloWp * s.kit.quantidade / 1000, 2)} kWp × R$${s.empresa.valorEstruturaPorKWp}/kWp`} />
                    <CampoValor label="Materiais elétricos" value={s.preco.materiaisEletricosRS} onChange={v => s.atualizarPreco({ materiaisEletricosRS: v })} hint="Cabos, DPS, string box, disjuntores, eletrodutos" />
                    <CampoValor label="Mão de obra de instalação" value={s.preco.maoDeObraRS} onChange={v => s.atualizarPreco({ maoDeObraRS: v })} hint={`Auto: ${s.kit.quantidade} módulos × R$${s.empresa.valorMaoDeObraPorModulo}/módulo`} />
                    <CampoValor label="Projeto elétrico + ART CREA" value={s.preco.projetoArtRS} onChange={v => s.atualizarPreco({ projetoArtRS: v })} hint="ART CREA-MG (~R$130) + projeto de engenharia (~R$400)" />
                    <CampoValor label="Outros (frete, deslocamento...)" value={s.preco.outrosCustosRS} onChange={v => s.atualizarPreco({ outrosCustosRS: v })} hint="Deixe 0 se já embutido nos itens acima" />
                  </div>

                  <div className="ls-divider" />

                  {/* Resumo do custo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Custo total direto</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>
                      {R(s.kit.custoKitRS + s.preco.estruturaRS + s.preco.materiaisEletricosRS + s.preco.maoDeObraRS + s.preco.projetoArtRS + s.preco.outrosCustosRS)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ls-card">
                <div className="ls-card-head">Impostos e margem</div>
                <div className="ls-card-body">
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#78350f', marginBottom: 14 }}>
                    <strong>Fórmula correta:</strong> Preço = Custo ÷ (1 − impostos − margem) — garante que imposto e lucro incidem sobre o preço de venda, não sobre o custo.
                  </div>
                  <div className="ls-grid-2">
                    <label className="ls-label">Alíquota Simples Nacional (%)
                      <input className="ls-input" type="number" step="0.1" value={Number((s.preco.aliquotaImpostos * 100).toFixed(1))} onChange={e => s.atualizarPreco({ aliquotaImpostos: Number(e.target.value) / 100 })} />
                      <span className="ls-hint">Alíquota efetiva do DAS — informe o valor do mês</span>
                    </label>
                    <label className="ls-label">Margem de lucro (%)
                      <input className="ls-input" type="number" step="1" value={Number((s.preco.margemDesejada * 100).toFixed(0))} onChange={e => s.atualizarPreco({ margemDesejada: Number(e.target.value) / 100 })} />
                      <span className="ls-hint">Percentual sobre o preço de venda final</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <BtnSecondary onClick={() => setAba('kit')}>← Kit</BtnSecondary>
                <BtnPrimary onClick={irParaResultado}>✓ Calcular resultado →</BtnPrimary>
              </div>
            </div>
          )}

          {/* ══ ABA RESULTADO ══════════════════════════════════════════════ */}
          {aba === 'resultado' && !s.dimensionamento && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: C.muted, marginBottom: 16 }}>Preencha as abas anteriores e clique em Calcular.</p>
              <BtnPrimary onClick={() => setAba('precificacao')}>← Ir para Preço</BtnPrimary>
            </div>
          )}

          {aba === 'resultado' && s.dimensionamento && s.precificacao && s.custosRecorrentes && (
            <div style={{ maxWidth: 820 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
                    {s.cliente.nome || 'Resultado'}
                  </h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{s.cliente.cidade}{s.cliente.cidade && s.cliente.uf ? ` · ${s.cliente.uf}` : s.cliente.uf}</span>
                </div>
                <BtnPrimary onClick={gerarPDF} disabled={gerando}>
                  {gerando ? '⏳ Gerando PDF...' : '📄 Baixar Proposta PDF'}
                </BtnPrimary>
              </div>

              {/* Cards de destaque */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Potência instalada', val: `${N(s.dimensionamento.potenciaInstaladaRealKWp)} kWp`, sub: `${s.dimensionamento.numeroModulos} módulos` },
                  { label: 'Geração mensal', val: `${N(s.dimensionamento.geracaoMensalEstimadaKWh, 0)} kWh`, sub: `${N(s.dimensionamento.percentualCompensacaoReal * 100, 0)}% de compensação` },
                  { label: 'Economia mensal', val: R(s.custosRecorrentes.economiaMensalRS), sub: `${R(s.custosRecorrentes.economiaMensalRS * 12)}/ano`, green: true },
                  { label: 'Preço da proposta', val: R(s.precificacao.precoVenda), sub: `Lucro: ${R(s.precificacao.lucroLiquido)}`, gold: true },
                ].map((c, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.gold ? C.gold : c.green ? C.success : C.navy, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{c.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* Sistema */}
                <div className="ls-card">
                  <div className="ls-card-head">Sistema fotovoltaico</div>
                  <div className="ls-card-body">
                    <LinhaResultado label="Módulos" valor={`${s.kit.marcaModulo} ${s.kit.modeloModulo}` || `${s.kit.quantidade}× ${s.kit.potenciaModuloWp}Wp`} />
                    <LinhaResultado label="Tipo" valor={PRESETS_MODULO[s.kit.tipoModulo].label} />
                    <LinhaResultado label="Inversor" valor={`${s.kit.marcaInversor} ${s.kit.modeloInversor} ${s.kit.potenciaInversorKW}kW`} />
                    <LinhaResultado label="Perdas do sistema" valor={s.detalhamentoPerdas[s.detalhamentoPerdas.length - 1]?.split(': ')[1] ?? '-'} />
                    <LinhaResultado label="Potência instalada" valor={`${N(s.dimensionamento.potenciaInstaladaRealKWp)} kWp`} tipo="strong" />
                    <LinhaResultado label="Geração anual" valor={`${N(s.dimensionamento.geracaoAnualEstimadaKWh, 0)} kWh`} />
                  </div>
                </div>

                {/* Conta após o solar */}
                <div className="ls-card">
                  <div className="ls-card-head">Conta mínima após o solar</div>
                  <div className="ls-card-body">
                    <LinhaResultado label="Taxa de disponibilidade (ANEEL)" valor={R(s.custosRecorrentes.taxaDisponibilidadeRS) + '/mês'} />
                    <LinhaResultado label="CIP / Iluminação pública" valor={R(s.custosRecorrentes.cipRS) + '/mês'} />
                    <LinhaResultado label={`Fio B ${new Date().getFullYear()} (${N((s.percentuaisFioBPorAno[new Date().getFullYear()] ?? 0) * 100, 0)}%)`} valor={R(s.custosRecorrentes.custoBFioMensalRS) + '/mês'} />
                    <div className="ls-divider" />
                    <LinhaResultado label="Total fixo mensal" valor={R(s.custosRecorrentes.totalFixoMensalRS) + '/mês'} tipo="strong" />
                    <LinhaResultado label="Conta antes do solar" valor={R(s.custosRecorrentes.contaAntesRS) + '/mês'} />
                    <LinhaResultado label="Economia mensal estimada" valor={R(s.custosRecorrentes.economiaMensalRS) + '/mês'} tipo="green" />
                  </div>
                </div>

                {/* Fio B */}
                <div className="ls-card">
                  <div className="ls-card-head">Fio B — Lei 14.300/2022</div>
                  <div className="ls-card-body">
                    {s.enquadramento?.elegivelArt26
                      ? <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.success }}>✅ Regra de transição art. 26 — Fio B isento até 31/12/2045</div>
                      : <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr style={{ background: C.bg }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600 }}>Ano</th>
                              <th style={{ padding: '6px 10px', textAlign: 'center', color: C.muted, fontWeight: 600 }}>Fio B</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, fontWeight: 600 }}>Custo/mês est.</th>
                            </tr></thead>
                            <tbody>
                              {[2025,2026,2027,2028,2029,2030].map(ano => {
                                const distrib = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
                                const custo = s.dimensionamento!.geracaoMensalEstimadaKWh * distrib.tarifaKWhComICMS * 0.35 * (s.percentuaisFioBPorAno[ano] ?? 1);
                                return (<tr key={ano} style={{ borderTop: `1px solid ${C.border}` }}>
                                  <td style={{ padding: '6px 10px' }}>{ano}</td>
                                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: ano >= 2029 ? C.danger : C.text }}>{N((s.percentuaisFioBPorAno[ano] ?? 1) * 100, 0)}%</td>
                                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{R(custo)}</td>
                                </tr>);
                              })}
                            </tbody>
                          </table>
                        </div>
                    }
                  </div>
                </div>

                {/* Precificação */}
                <div className="ls-card">
                  <div className="ls-card-head">Composição do preço</div>
                  <div className="ls-card-body">
                    <LinhaResultado label="Kit solar (fornecedor)" valor={R(s.precificacao.custoKit)} />
                    <LinhaResultado label="Estrutura + materiais" valor={R(s.precificacao.custoEstrutura + s.precificacao.custoMateriais)} />
                    <LinhaResultado label="Mão de obra" valor={R(s.precificacao.custoMaoDeObra)} />
                    <LinhaResultado label="Projeto + ART" valor={R(s.precificacao.custoProjetoArt)} />
                    {s.precificacao.custoOutros > 0 && <LinhaResultado label="Outros" valor={R(s.precificacao.custoOutros)} />}
                    <div className="ls-divider" />
                    <LinhaResultado label="Custo total direto" valor={R(s.precificacao.custoTotalDireto)} tipo="strong" />
                    <LinhaResultado label={`Impostos (${N(s.preco.aliquotaImpostos * 100, 1)}%)`} valor={R(s.precificacao.impostoSobreVenda)} />
                    <LinhaResultado label={`Margem (${N(s.preco.margemDesejada * 100, 0)}%)`} valor={R(s.precificacao.lucroLiquido)} tipo="green" />
                    <LinhaResultado label="Preço de venda à vista" valor={R(s.precificacao.precoVenda)} tipo="gold" />
                  </div>
                </div>

              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <BtnSecondary onClick={() => setAba('precificacao')}>← Editar</BtnSecondary>
                <BtnPrimary onClick={gerarPDF} disabled={gerando}>
                  {gerando ? '⏳ Gerando...' : '📄 Baixar Proposta PDF'}
                </BtnPrimary>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
