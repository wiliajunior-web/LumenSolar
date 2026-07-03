import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useProjetoStore, PRESETS_MODULO, type TipoModuloPreset } from './store/useProjetoStore';
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { HSP_MEDIO_POR_UF } from '@data/hspPorUF';
import { PropostaPDF } from '@domain/proposta/PropostaPDF';

// ─── Sistema de Design ───────────────────────────────────────────────────────
const D = {
  // Cores
  sidebar:  '#0a0b0f',
  header:   '#0d1117',
  gold:     '#c9a227',
  goldLight:'#e8c547',
  goldMuted:'#c9a22730',
  bg:       '#f5f4f0',
  card:     '#ffffff',
  border:   '#e8e3d8',
  borderLight: '#f0ece4',
  text:     '#1a1a28',
  textSub:  '#5a5670',
  textMuted:'#9590a8',
  success:  '#16803d',
  danger:   '#c0392b',
  blue:     '#2563eb',
  // Shadows
  shadow: '0 1px 4px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.04)',
  shadowMd: '0 2px 8px rgba(0,0,0,.10)',
};

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-size: 14px; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: ${D.bg}; color: ${D.text}; -webkit-font-smoothing: antialiased; }
input, select, textarea { font-family: inherit; }
input[type=number] { font-variant-numeric: tabular-nums; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${D.border}; border-radius: 3px; }

/* Input */
.inp {
  width: 100%; padding: 8px 10px;
  border: 1.5px solid ${D.border}; border-radius: 7px;
  font-size: 13px; color: ${D.text}; background: #fff;
  transition: border-color .15s, box-shadow .15s;
  outline: none;
}
.inp:focus { border-color: ${D.gold}; box-shadow: 0 0 0 3px ${D.goldMuted}; }
.inp::placeholder { color: ${D.textMuted}; }
.inp-num { text-align: right; }

/* Label */
.lbl { display: flex; flex-direction: column; gap: 5px; }
.lbl-txt { font-size: 11px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: ${D.textMuted}; }
.lbl-hint { font-size: 11px; color: ${D.textMuted}; margin-top: 2px; line-height: 1.4; }

/* Card */
.card { background: ${D.card}; border: 1px solid ${D.border};
  border-radius: 12px; box-shadow: ${D.shadow}; overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 10px;
  padding: 13px 18px; border-bottom: 1px solid ${D.borderLight};
  font-size: 13px; font-weight: 700; color: ${D.text}; }
.card-head::before { content:''; display:block; width:3px; height:16px;
  background: ${D.gold}; border-radius: 2px; flex-shrink: 0; }
.card-body { padding: 16px 18px; }

/* Grid */
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }

/* Separador */
.sep { height: 1px; background: ${D.borderLight}; margin: 14px 0; }

/* KPI card */
.kpi { background: ${D.card}; border: 1px solid ${D.border};
  border-radius: 12px; padding: 16px 18px; }
.kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: ${D.textMuted}; margin-bottom: 8px; }
.kpi-val { font-size: 22px; font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums; }
.kpi-sub { font-size: 11px; color: ${D.textMuted}; margin-top: 5px; }

/* Row */
.row { display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid ${D.borderLight}; font-size: 13px; }
.row:last-child { border-bottom: none; }
.row-val { font-variant-numeric: tabular-nums; font-weight: 500; }

/* Tabela */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em; color: ${D.textMuted};
  background: ${D.bg}; border-bottom: 1px solid ${D.border}; }
.tbl td { padding: 7px 12px; border-bottom: 1px solid ${D.borderLight}; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: #fafaf8; }

/* Info box */
.info-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 10px 14px; font-size: 12px; color: #78350f; line-height: 1.5; }
.info-box-green { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
.info-box-blue { background: #eff6ff; border-color: #bfdbfe; color: #1e3a5f; }

/* Badge */
.badge { display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-gold { background: ${D.goldMuted}; color: #7a5c00; }
.badge-green { background: #dcfce7; color: #15803d; }
.badge-blue  { background: #dbeafe; color: #1e40af; }
`;

// ─── Utilitários ─────────────────────────────────────────────────────────────
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v: number, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ─── Botões ──────────────────────────────────────────────────────────────────
const Btn = ({ onClick, children, variant = 'primary', disabled = false, small = false }: {
  onClick: () => void; children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean;
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: small ? '6px 14px' : '9px 20px',
    border: 'none', borderRadius: 8, fontWeight: 700,
    fontSize: small ? 12 : 13, cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '.01em', transition: 'opacity .15s',
    opacity: disabled ? 0.5 : 1,
  };
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: D.gold, color: D.header },
    ghost:   { ...base, background: 'transparent', color: D.textSub, border: `1.5px solid ${D.border}` },
    danger:  { ...base, background: D.danger, color: '#fff' },
  };
  return <button onClick={onClick} disabled={disabled} style={styles[variant]}>{children}</button>;
};

// ─── Campo de formulário ─────────────────────────────────────────────────────
const Campo = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="lbl">
    <span className="lbl-txt">{label}</span>
    {children}
    {hint && <span className="lbl-hint">{hint}</span>}
  </label>
);

// ─── Row de resultado ─────────────────────────────────────────────────────────
const LR = ({ label, val, color }: { label: string; val: string; color?: string }) => (
  <div className="row">
    <span style={{ color: D.textSub }}>{label}</span>
    <span className="row-val" style={{ color: color ?? D.text }}>{val}</span>
  </div>
);

// ─── KPI ─────────────────────────────────────────────────────────────────────
const KPI = ({ label, val, sub, color }: { label: string; val: string; sub?: string; color?: string }) => (
  <div className="kpi">
    <div className="kpi-label">{label}</div>
    <div className="kpi-val" style={{ color: color ?? D.text }}>{val}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ─── Sidebar ─────────────────────────────────────────────────────────────────
type Aba = 'cliente' | 'consumo' | 'kit' | 'preco' | 'resultado';
const STEPS: { id: Aba; label: string; icon: string }[] = [
  { id: 'cliente',    label: 'Cliente',     icon: '◈' },
  { id: 'consumo',    label: 'Consumo',     icon: '⌁' },
  { id: 'kit',        label: 'Kit Solar',   icon: '◉' },
  { id: 'preco',      label: 'Precificação',icon: '◎' },
  { id: 'resultado',  label: 'Resultado',   icon: '★' },
];

const Sidebar = ({ aba, setAba, empresa, onEmpresa }: {
  aba: Aba; setAba: (a: Aba) => void; empresa: any; onEmpresa: () => void;
}) => {
  const abaIdx = STEPS.findIndex(s => s.id === aba);
  return (
    <aside style={{
      width: 200, background: D.sidebar, display: 'flex', flexDirection: 'column',
      padding: '20px 0', flexShrink: 0, height: '100%',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 20px', borderBottom: `1px solid #1e2030` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {empresa.logoBase64
            ? <img src={empresa.logoBase64} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain' }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: D.header }}>L</div>
          }
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '.06em' }}>LUMEN</div>
            <div style={{ color: D.gold, fontWeight: 600, fontSize: 11, letterSpacing: '.04em' }}>SOLAR</div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <nav style={{ flex: 1, padding: '20px 0', position: 'relative' }}>
        {/* Linha de progresso vertical */}
        <div style={{
          position: 'absolute', left: 36, top: 28, width: 2,
          height: `calc(100% - 56px)`, background: '#1e2030',
        }} />
        <div style={{
          position: 'absolute', left: 36, top: 28, width: 2,
          height: `${(abaIdx / (STEPS.length - 1)) * 100}%`,
          background: D.gold, transition: 'height .4s ease',
        }} />

        {STEPS.map((step, idx) => {
          const done    = idx < abaIdx;
          const current = idx === abaIdx;
          const future  = idx > abaIdx;
          return (
            <div
              key={step.id}
              onClick={() => setAba(step.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 20px', cursor: 'pointer', position: 'relative',
                transition: 'background .15s',
              }}
            >
              {/* Círculo do step */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 900, zIndex: 1,
                background: done ? D.gold : current ? D.gold : '#1e2030',
                border: current ? `none` : done ? 'none' : `2px solid #2a2d3e`,
                color: done || current ? D.header : '#3a3d54',
                boxShadow: current ? `0 0 0 4px ${D.goldMuted}` : 'none',
                transition: 'all .2s',
              }}>
                {done ? '✓' : idx + 1}
              </div>
              <span style={{
                fontSize: 12, fontWeight: current ? 700 : 500,
                color: current ? '#fff' : done ? D.gold : '#5a5d72',
                transition: 'color .15s',
              }}>{step.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Empresa button */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid #1e2030` }}>
        <button onClick={onEmpresa} style={{
          width: '100%', padding: '8px 12px', background: '#1a1c28',
          border: `1px solid #2a2d3e`, borderRadius: 8, color: '#8a8d9e',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '.03em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚙</span> Configurações
        </button>
      </div>
    </aside>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<Aba>('cliente');
  const [showEmpresa, setShowEmpresa] = useState(false);
  const [gerando, setGerando] = useState(false);
  const s = useProjetoStore();

  const validas = s.consumo.contas.filter(c => c.kWh > 0);
  const mediaKWh = validas.length > 0 ? validas.reduce((a, c) => a + c.kWh, 0) / validas.length : 0;
  const mediaRS  = validas.filter(c => c.valorRS > 0).length > 0
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
            tipoModulo: PRESETS_MODULO[s.kit.tipoModulo].bifacial ? 'bifacial' :
              s.kit.tipoModulo === 'policristalino' ? 'policristalino' : 'monocristalino',
            marcaInversor: s.kit.marcaInversor, modeloInversor: s.kit.modeloInversor,
            potenciaInversorKW: s.kit.potenciaInversorKW, custoKitRS: s.kit.custoKitRS,
          },
          dimensionamento: s.dimensionamento, custosRecorrentes: s.custosRecorrentes,
          precificacao: s.precificacao, enquadramento: s.enquadramento,
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
      a.download = `Proposta_Lumen_${(s.cliente.nome || 'Cliente').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

  function calcularEIr() { s.calcularTudo(); setAba('resultado'); }

  // ─── Conteúdo por aba ───────────────────────────────────────────────────
  const Content = () => {
    if (showEmpresa) return <TabEmpresa onClose={() => setShowEmpresa(false)} />;
    switch(aba) {
      case 'cliente':    return <TabCliente onNext={() => setAba('consumo')} />;
      case 'consumo':    return <TabConsumo onPrev={() => setAba('cliente')} onNext={() => setAba('kit')} mediaKWh={mediaKWh} mediaRS={mediaRS} />;
      case 'kit':        return <TabKit onPrev={() => setAba('consumo')} onNext={() => { s.recalcularDefaultsPreco(); setAba('preco'); }} mediaKWh={mediaKWh} />;
      case 'preco':      return <TabPreco onPrev={() => setAba('kit')} onCalc={calcularEIr} />;
      case 'resultado':  return <TabResultado onPrev={() => setAba('preco')} onPDF={gerarPDF} gerando={gerando} />;
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar aba={aba} setAba={setAba} empresa={s.empresa} onEmpresa={() => setShowEmpresa(true)} />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '28px 32px', flex: 1 }}>
            <Content />
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Tab Empresa ─────────────────────────────────────────────────────────────
function TabEmpresa({ onClose }: { onClose: () => void }) {
  const { empresa, atualizarEmpresa } = useProjetoStore();
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a28' }}>Configurações da empresa</h1>
          <p style={{ fontSize: 13, color: '#9590a8', marginTop: 4 }}>Dados que aparecem em todas as propostas geradas.</p>
        </div>
        <Btn onClick={onClose} variant="ghost">← Voltar</Btn>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Dados institucionais</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Razão Social"><input className="inp" value={empresa.razaoSocial} onChange={e => atualizarEmpresa({ razaoSocial: e.target.value })} /></Campo>
            <Campo label="Nome Fantasia"><input className="inp" value={empresa.nomeFantasia} onChange={e => atualizarEmpresa({ nomeFantasia: e.target.value })} /></Campo>
            <Campo label="CNPJ"><input className="inp" value={empresa.cnpj} onChange={e => atualizarEmpresa({ cnpj: e.target.value })} /></Campo>
            <Campo label="CREA"><input className="inp" value={empresa.crea} onChange={e => atualizarEmpresa({ crea: e.target.value })} /></Campo>
            <Campo label="Responsável Técnico"><input className="inp" value={empresa.responsavelTecnico} onChange={e => atualizarEmpresa({ responsavelTecnico: e.target.value })} /></Campo>
            <Campo label="Telefone"><input className="inp" value={empresa.telefone} onChange={e => atualizarEmpresa({ telefone: e.target.value })} /></Campo>
            <Campo label="E-mail" hint="Aparece na proposta"><input className="inp" value={empresa.email} onChange={e => atualizarEmpresa({ email: e.target.value })} /></Campo>
            <Campo label="Validade padrão (dias)"><input className="inp inp-num" type="number" value={empresa.validadeProposta} onChange={e => atualizarEmpresa({ validadeProposta: Number(e.target.value) })} /></Campo>
          </div>
          <div className="sep" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {empresa.logoBase64 && <img src={empresa.logoBase64} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'contain', border: `1px solid ${D.border}` }} />}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: D.gold, color: D.header, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              📂 {empresa.logoBase64 ? 'Trocar logo' : 'Carregar logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const r = new FileReader(); r.onload = ev => atualizarEmpresa({ logoBase64: ev.target?.result as string }); r.readAsDataURL(file);
              }} />
            </label>
            {empresa.logoBase64 && <button onClick={() => atualizarEmpresa({ logoBase64: undefined })} style={{ background:'none', border:'none', color: D.danger, cursor:'pointer', fontSize:12, fontWeight:600 }}>Remover</button>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Valores-base de precificação</div>
        <div className="card-body">
          <p className="lbl-hint" style={{ marginBottom: 14 }}>Preenche automaticamente cada proposta. Editável por projeto na aba Precificação.</p>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Estrutura de fixação (R$/kWp)" hint="Padrão: R$150/kWp instalado"><input className="inp inp-num" type="number" value={empresa.valorEstruturaPorKWp} onChange={e => atualizarEmpresa({ valorEstruturaPorKWp: Number(e.target.value) })} /></Campo>
            <Campo label="Materiais elétricos (R$/kWp)" hint="Cabos, DPS, disjuntores, eletrodutos"><input className="inp inp-num" type="number" value={empresa.valorMateriaisPorKWp} onChange={e => atualizarEmpresa({ valorMateriaisPorKWp: Number(e.target.value) })} /></Campo>
            <Campo label="Mão de obra (R$/módulo)" hint="Instalação + comissionamento do inversor"><input className="inp inp-num" type="number" value={empresa.valorMaoDeObraPorModulo} onChange={e => atualizarEmpresa({ valorMaoDeObraPorModulo: Number(e.target.value) })} /></Campo>
            <Campo label="Projeto + ART CREA (R$)" hint="ART CREA-MG ~R$130 + projeto ~R$400 = R$530 típico"><input className="inp inp-num" type="number" value={empresa.valorProjetoArt} onChange={e => atualizarEmpresa({ valorProjetoArt: Number(e.target.value) })} /></Campo>
            <Campo label="Alíquota Simples Nacional (%)" hint="Alíquota efetiva do DAS — seu contador informa"><input className="inp inp-num" type="number" step="0.1" value={+(empresa.aliquotaImpostos * 100).toFixed(1)} onChange={e => atualizarEmpresa({ aliquotaImpostos: Number(e.target.value) / 100 })} /></Campo>
            <Campo label="Margem de lucro padrão (%)" hint="Sobre o preço de venda (não sobre o custo)"><input className="inp inp-num" type="number" step="1" value={+(empresa.margemPadrao * 100).toFixed(0)} onChange={e => atualizarEmpresa({ margemPadrao: Number(e.target.value) / 100 })} /></Campo>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Cliente ──────────────────────────────────────────────────────────────
function TabCliente({ onNext }: { onNext: () => void }) {
  const { cliente, atualizarCliente } = useProjetoStore();
  return (
    <div style={{ maxWidth: 600 }}>
      <PageTitle title="Dados do cliente" sub="Informações que aparecem na capa da proposta." />
      <div className="card">
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Nome completo *" hint="Nome ou razão social do cliente">
              <input className="inp" value={cliente.nome} onChange={e => atualizarCliente({ nome: e.target.value })} placeholder="Ex: João Silva / Empresa Ltda" autoFocus />
            </Campo>
            <Campo label="Cidade">
              <input className="inp" value={cliente.cidade} onChange={e => atualizarCliente({ cidade: e.target.value })} />
            </Campo>
            <Campo label="UF">
              <select className="inp" value={cliente.uf} onChange={e => atualizarCliente({ uf: e.target.value })}>
                {Object.keys(HSP_MEDIO_POR_UF).map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Campo>
            <Campo label="Telefone">
              <input className="inp" value={cliente.telefone} onChange={e => atualizarCliente({ telefone: e.target.value })} placeholder="(34) 9 9999-9999" />
            </Campo>
            <Campo label="E-mail" hint="Opcional — para contato">
              <input className="inp" value={cliente.email} onChange={e => atualizarCliente({ email: e.target.value })} placeholder="email@exemplo.com" type="email" />
            </Campo>
          </div>
        </div>
      </div>
      <NavButtons onNext={onNext} nextLabel="Consumo →" />
    </div>
  );
}

// ─── Tab Consumo ──────────────────────────────────────────────────────────────
function TabConsumo({ onPrev, onNext, mediaKWh, mediaRS }: { onPrev:()=>void; onNext:()=>void; mediaKWh:number; mediaRS:number }) {
  const s = useProjetoStore();
  return (
    <div style={{ maxWidth: 700 }}>
      <PageTitle title="Consumo de energia" sub="Preencha com os dados das faturas do cliente dos últimos 12 meses." />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Distribuidora e tarifas</div>
        <div className="card-body">
          <div className="g3">
            <Campo label="Distribuidora" hint="">
              <select className="inp" value={s.consumo.codigoDistribuidora} onChange={e => s.atualizarConsumo({ codigoDistribuidora: e.target.value })}>
                {DISTRIBUIDORAS.map(d => <option key={d.codigo} value={d.codigo}>{d.nomeAbreviado}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo de ligação">
              <select className="inp" value={s.consumo.tipoLigacao} onChange={e => s.atualizarConsumo({ tipoLigacao: e.target.value as 'monofasica'|'bifasica'|'trifasica' })}>
                <option value="monofasica">Monofásica (30 kWh mín.)</option>
                <option value="bifasica">Bifásica (50 kWh mín.)</option>
                <option value="trifasica">Trifásica (100 kWh mín.)</option>
              </select>
            </Campo>
            <Campo label="CIP / Iluminação pública (R$)" hint="Valor mensal fixo da conta">
              <input className="inp inp-num" type="number" step="0.01" value={s.consumo.cipMensalRS} onChange={e => s.atualizarConsumo({ cipMensalRS: Number(e.target.value) })} />
            </Campo>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          Histórico de consumo
          {mediaKWh > 0 && <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>Média: {fmtNum(mediaKWh, 0)} kWh/mês · {fmtBRL(mediaRS)}/mês</span>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Mês</th>
                <th style={{ textAlign: 'right' }}>kWh consumido</th>
                <th style={{ textAlign: 'right' }}>Valor da conta (R$)</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {s.consumo.contas.map((c, i) => (
                <tr key={i}>
                  <td><input className="inp" value={c.mes} onChange={e => s.atualizarConta(i, { mes: e.target.value })} style={{ width: 80, padding: '4px 6px' }} /></td>
                  <td style={{ textAlign: 'right' }}><input className="inp inp-num" type="number" value={c.kWh || ''} onChange={e => s.atualizarConta(i, { kWh: Number(e.target.value) })} style={{ width: 100, padding: '4px 8px' }} /></td>
                  <td style={{ textAlign: 'right' }}><input className="inp inp-num" type="number" step="0.01" value={c.valorRS || ''} onChange={e => s.atualizarConta(i, { valorRS: Number(e.target.value) })} style={{ width: 120, padding: '4px 8px' }} /></td>
                  <td><button onClick={() => s.removerConta(i)} style={{ background:'none', border:'none', color: D.textMuted, cursor:'pointer', fontSize: 16, padding: '2px 4px' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '8px 12px' }}>
            <button onClick={s.adicionarConta} style={{ background:'none', border:`1px dashed ${D.border}`, color: D.textMuted, borderRadius: 6, padding:'4px 12px', fontSize: 12, cursor:'pointer' }}>+ mês</button>
          </div>
        </div>
      </div>
      <NavButtons onPrev={onPrev} onNext={onNext} nextLabel="Kit Solar →" />
    </div>
  );
}

// ─── Tab Kit ──────────────────────────────────────────────────────────────────
function TabKit({ onPrev, onNext, mediaKWh }: { onPrev:()=>void; onNext:()=>void; mediaKWh:number }) {
  const s = useProjetoStore();
  const potKWp = (s.kit.potenciaModuloWp * s.kit.quantidade) / 1000;
  return (
    <div style={{ maxWidth: 680 }}>
      <PageTitle title="Kit Solar" sub={mediaKWh > 0 ? `Consumo médio do cliente: ${fmtNum(mediaKWh,0)} kWh/mês — busque no fornecedor um kit que gere esse valor.` : 'Preencha com os dados do kit escolhido no fornecedor.'} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Módulos fotovoltaicos</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Tipo do módulo" hint="Define automaticamente os parâmetros de eficiência">
              <select className="inp" value={s.kit.tipoModulo} onChange={e => s.atualizarKit({ tipoModulo: e.target.value as TipoModuloPreset })}>
                {(Object.entries(PRESETS_MODULO) as [TipoModuloPreset, typeof PRESETS_MODULO[TipoModuloPreset]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Marca"><input className="inp" value={s.kit.marcaModulo} onChange={e => s.atualizarKit({ marcaModulo: e.target.value })} placeholder="Ex: Leapton, DAH, JA Solar" /></Campo>
            <Campo label="Modelo"><input className="inp" value={s.kit.modeloModulo} onChange={e => s.atualizarKit({ modeloModulo: e.target.value })} placeholder="Ex: 620W BIF N-TYPE" /></Campo>
            <Campo label="Potência (Wp)"><input className="inp inp-num" type="number" value={s.kit.potenciaModuloWp} onChange={e => s.atualizarKit({ potenciaModuloWp: Number(e.target.value) })} /></Campo>
            <Campo label="Quantidade de módulos"><input className="inp inp-num" type="number" value={s.kit.quantidade || ''} onChange={e => s.atualizarKit({ quantidade: Number(e.target.value) })} /></Campo>
            {potKWp > 0 && (
              <div style={{ gridColumn: 'span 2', background: D.bg, borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 24 }}>
                <div><span style={{ color: D.textMuted }}>Potência do sistema: </span><strong>{fmtNum(potKWp, 2)} kWp</strong></div>
                <div><span style={{ color: D.textMuted }}>{s.kit.quantidade} × {s.kit.potenciaModuloWp}Wp</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Inversor</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Marca"><input className="inp" value={s.kit.marcaInversor} onChange={e => s.atualizarKit({ marcaInversor: e.target.value })} placeholder="Ex: Growatt, Fronius, Deye" /></Campo>
            <Campo label="Modelo"><input className="inp" value={s.kit.modeloInversor} onChange={e => s.atualizarKit({ modeloInversor: e.target.value })} placeholder="Ex: MIN 6000TL-X2" /></Campo>
            <Campo label="Potência nominal (kW)"><input className="inp inp-num" type="number" step="0.1" value={s.kit.potenciaInversorKW || ''} onChange={e => s.atualizarKit({ potenciaInversorKW: Number(e.target.value) })} /></Campo>
            <Campo label="Eficiência máxima (%)" hint="Growatt MIN X2: 98,4% · Fronius: 98,1%"><input className="inp inp-num" type="number" step="0.1" value={s.kit.eficienciaInversorPercent} onChange={e => s.atualizarKit({ eficienciaInversorPercent: Number(e.target.value) })} /></Campo>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Custo e enquadramento</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Custo do kit no fornecedor (R$)" hint="Módulos + inversor conforme orçamento">
              <input className="inp inp-num" type="number" step="0.01" value={s.kit.custoKitRS || ''} onChange={e => s.atualizarKit({ custoKitRS: Number(e.target.value) })} />
            </Campo>
            <Campo label="Data de protocolo de acesso" hint="Lei 14.300/2022: define a regra do Fio B">
              <input className="inp" type="date" value={s.kit.dataProtocoloAcesso} onChange={e => s.atualizarKit({ dataProtocoloAcesso: e.target.value })} />
            </Campo>
          </div>
        </div>
      </div>
      <NavButtons onPrev={onPrev} onNext={onNext} nextLabel="Precificação →" />
    </div>
  );
}

// ─── Tab Preço ───────────────────────────────────────────────────────────────
function TabPreco({ onPrev, onCalc }: { onPrev:()=>void; onCalc:()=>void }) {
  const s = useProjetoStore();
  const custoTotal = s.kit.custoKitRS + s.preco.estruturaRS + s.preco.materiaisEletricosRS + s.preco.maoDeObraRS + s.preco.projetoArtRS + s.preco.outrosCustosRS;
  const precoVenda = s.preco.aliquotaImpostos + s.preco.margemDesejada < 1
    ? custoTotal / (1 - s.preco.aliquotaImpostos - s.preco.margemDesejada) : 0;
  const lucro  = precoVenda * s.preco.margemDesejada;
  const imposto = precoVenda * s.preco.aliquotaImpostos;

  return (
    <div style={{ maxWidth: 680 }}>
      <PageTitle title="Precificação" sub="Valores preenchidos automaticamente pelos parâmetros da empresa. Ajuste se necessário." />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Composição de custos</div>
        <div className="card-body">
          {/* Kit — fixo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: D.bg, borderRadius: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: D.textSub }}>Kit solar (custo do fornecedor)</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{fmtBRL(s.kit.custoKitRS)}</strong>
          </div>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Estrutura de fixação (R$)" hint={`Auto: ${fmtNum((s.kit.potenciaModuloWp * s.kit.quantidade)/1000, 2)} kWp × R$${s.empresa.valorEstruturaPorKWp}/kWp`}><input className="inp inp-num" type="number" step="0.01" value={s.preco.estruturaRS || ''} onChange={e => s.atualizarPreco({ estruturaRS: Number(e.target.value) })} /></Campo>
            <Campo label="Materiais elétricos (R$)" hint="Cabos, DPS, string box, disjuntores"><input className="inp inp-num" type="number" step="0.01" value={s.preco.materiaisEletricosRS || ''} onChange={e => s.atualizarPreco({ materiaisEletricosRS: Number(e.target.value) })} /></Campo>
            <Campo label="Mão de obra (R$)" hint={`Auto: ${s.kit.quantidade} módulos × R$${s.empresa.valorMaoDeObraPorModulo}/módulo`}><input className="inp inp-num" type="number" step="0.01" value={s.preco.maoDeObraRS || ''} onChange={e => s.atualizarPreco({ maoDeObraRS: Number(e.target.value) })} /></Campo>
            <Campo label="Projeto + ART CREA (R$)" hint="ART CREA-MG (~R$130) + projeto de engenharia (~R$400)"><input className="inp inp-num" type="number" step="0.01" value={s.preco.projetoArtRS || ''} onChange={e => s.atualizarPreco({ projetoArtRS: Number(e.target.value) })} /></Campo>
            <Campo label="Outros — frete, deslocamento (R$)"><input className="inp inp-num" type="number" step="0.01" value={s.preco.outrosCustosRS || ''} onChange={e => s.atualizarPreco({ outrosCustosRS: Number(e.target.value) })} /></Campo>
          </div>
          <div className="sep" />
          <div className="row"><span style={{ color: D.textSub }}>Custo total direto</span><strong style={{ fontVariantNumeric:'tabular-nums', fontSize:15 }}>{fmtBRL(custoTotal)}</strong></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Tributação e margem</div>
        <div className="card-body">
          <div className="info-box" style={{ marginBottom: 14 }}>
            <strong>Fórmula correta:</strong> Preço = Custo ÷ (1 − impostos − margem) — garante que o imposto e o lucro incidem sobre o preço de venda, não sobre o custo.
          </div>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Alíquota Simples Nacional (%)" hint="Alíquota efetiva mensal do DAS"><input className="inp inp-num" type="number" step="0.1" value={+(s.preco.aliquotaImpostos*100).toFixed(1)} onChange={e => s.atualizarPreco({ aliquotaImpostos: Number(e.target.value)/100 })} /></Campo>
            <Campo label="Margem de lucro (% sobre venda)" hint="Ex: 15% = R$0,15 de cada R$1,00 vendido"><input className="inp inp-num" type="number" step="1" value={+(s.preco.margemDesejada*100).toFixed(0)} onChange={e => s.atualizarPreco({ margemDesejada: Number(e.target.value)/100 })} /></Campo>
          </div>
        </div>
      </div>

      {/* Preview do preço */}
      {precoVenda > 0 && (
        <div style={{ background: D.header, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8a8d9e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Preço de venda</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: D.gold, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(precoVenda)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#5a5d72' }}>Impostos: <span style={{ color: '#8a8d9e' }}>{fmtBRL(imposto)}</span></div>
            <div style={{ fontSize: 12, color: '#5a5d72' }}>Lucro: <span style={{ color: '#4ade80' }}>{fmtBRL(lucro)}</span></div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <Btn onClick={onPrev} variant="ghost">← Kit</Btn>
        <Btn onClick={onCalc}>✓ Calcular resultado completo →</Btn>
      </div>
    </div>
  );
}

// ─── Tab Resultado ────────────────────────────────────────────────────────────
function TabResultado({ onPrev, onPDF, gerando }: { onPrev:()=>void; onPDF:()=>void; gerando:boolean }) {
  const s = useProjetoStore();
  if (!s.dimensionamento || !s.precificacao || !s.custosRecorrentes || !s.indicadores) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: D.textMuted, marginBottom: 16 }}>Preencha as etapas e clique em Calcular.</p>
        <Btn onClick={onPrev} variant="ghost">← Voltar à Precificação</Btn>
      </div>
    );
  }
  const { dimensionamento: dim, custosRecorrentes: cr, precificacao: pre, indicadores: ind, enquadramento: enq, percentuaisFioBPorAno: pfb } = s;
  const MESES_L = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const maxGen = Math.max(...ind.geracaoMensalKWh, s.consumoMedioMensalKWh ?? 1);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 2 }}>{s.cliente.nome || 'Resultado'}</h1>
          <p style={{ fontSize: 13, color: D.textMuted }}>{s.cliente.cidade}{s.cliente.cidade && s.cliente.uf ? ` · ${s.cliente.uf}` : s.cliente.uf}</p>
        </div>
        <Btn onClick={onPDF} disabled={gerando}>{gerando ? '⏳ Gerando...' : '📄 Baixar Proposta PDF'}</Btn>
      </div>

      {/* KPIs principais */}
      <div className="g4" style={{ marginBottom: 16 }}>
        <KPI label="Potência instalada" val={`${fmtNum(dim.potenciaInstaladaRealKWp)} kWp`} sub={`${dim.numeroModulos} módulos`} color={D.text} />
        <KPI label="Geração mensal" val={`${fmtNum(dim.geracaoMensalEstimadaKWh, 0)} kWh`} sub={`${fmtNum(dim.percentualCompensacaoReal*100,0)}% de compensação`} />
        <KPI label="Economia mensal" val={fmtBRL(cr.economiaMensalRS)} sub={`${fmtBRL(cr.economiaMensalRS*12)}/ano`} color={D.success} />
        <KPI label="Preço à vista" val={fmtBRL(pre.precoVenda)} sub={`Payback: ${ind.paybackSimples}`} color={D.gold} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Gráfico mensal */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head">Geração × Consumo mensal estimado</div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120, padding: '0 4px' }}>
              {MESES_L.map((mes, i) => {
                const gen = ind.geracaoMensalKWh[i] ?? 0;
                const cons = s.consumoMedioMensalKWh ?? 0;
                return (
                  <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 100 }}>
                      <div title={`Consumo: ${fmtNum(cons,0)} kWh`} style={{ flex: 1, background: '#e8e3d8', borderRadius: '3px 3px 0 0', height: `${(cons/maxGen)*100}%`, minHeight: 2 }} />
                      <div title={`Geração: ${fmtNum(gen,0)} kWh`} style={{ flex: 1, background: D.gold, borderRadius: '3px 3px 0 0', height: `${(gen/maxGen)*100}%`, minHeight: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: D.textMuted }}>{mes}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: D.textMuted }}>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'#e8e3d8', borderRadius:2, marginRight:4 }}></span>Consumo</span>
              <span><span style={{ display:'inline-block', width:10, height:10, background: D.gold, borderRadius:2, marginRight:4 }}></span>Geração estimada</span>
            </div>
          </div>
        </div>

        {/* Sistema */}
        <div className="card">
          <div className="card-head">Sistema fotovoltaico</div>
          <div className="card-body">
            <LR label="Módulos" val={`${s.kit.marcaModulo || ''} ${s.kit.modeloModulo || dim.numeroModulos + '× ' + s.kit.potenciaModuloWp + 'Wp'}`} />
            <LR label="Inversor" val={`${s.kit.marcaInversor} ${s.kit.modeloInversor}`} />
            <LR label="Potência instalada" val={`${fmtNum(dim.potenciaInstaladaRealKWp)} kWp`} color={D.gold} />
            <LR label="Geração anual" val={`${fmtNum(dim.geracaoAnualEstimadaKWh, 0)} kWh/ano`} />
            <LR label="Área necessária" val={`${fmtNum(ind.areaNecessariaM2)} m²`} />
            <LR label="Peso distribuído" val={`${fmtNum(ind.pesoDistribuidoKgM2)} kg/m²`} />
            <LR label="Perdas do sistema" val={s.detalhamentoPerdas[s.detalhamentoPerdas.length - 1]?.split(': ')[1] ?? '-'} />
          </div>
        </div>

        {/* Indicadores de viabilidade */}
        <div className="card">
          <div className="card-head">Indicadores de viabilidade</div>
          <div className="card-body">
            <LR label="Payback simples" val={ind.paybackSimples} color={D.success} />
            <LR label="TIR (taxa interna de retorno)" val={ind.tirAnualPercent !== null ? `${fmtNum(ind.tirAnualPercent, 1)}% a.a.` : 'N/A'} color={D.success} />
            <LR label="ROI em 25 anos" val={`${fmtNum(ind.roiMultiplo * 100, 0)}%`} />
            <LR label="Economia total em 25 anos" val={fmtBRL(ind.economia25Anos)} color={D.success} />
            <LR label="Conta mínima após o solar" val={fmtBRL(cr.totalFixoMensalRS) + '/mês'} />
            <LR label="Conta antes do solar" val={fmtBRL(cr.contaAntesRS) + '/mês'} />
            <LR label="Economia mensal" val={fmtBRL(cr.economiaMensalRS) + '/mês'} color={D.success} />
          </div>
        </div>

        {/* Fio B */}
        <div className="card">
          <div className="card-head">Fio B — Lei 14.300/2022</div>
          <div className="card-body">
            {enq?.elegivelArt26
              ? <div className="info-box info-box-green">✅ Regra de transição art. 26 — Fio B isento sobre a energia compensada até 31/12/2045.</div>
              : <>
                  <div className="info-box" style={{ marginBottom: 10 }}>⚠️ Fora da regra de transição. O custo do Fio B aumenta anualmente até 100% em 2029.</div>
                  <table className="tbl">
                    <thead><tr><th>Ano</th><th style={{ textAlign:'center' }}>Fio B</th><th style={{ textAlign:'right' }}>Custo/mês est.</th></tr></thead>
                    <tbody>
                      {[2025,2026,2027,2028,2029].map(ano => {
                        const distrib = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
                        const custo = dim.geracaoMensalEstimadaKWh * distrib.tarifaKWhComICMS * 0.35 * (pfb[ano] ?? 1);
                        return (
                          <tr key={ano}>
                            <td>{ano}</td>
                            <td style={{ textAlign:'center', fontWeight:700, color: ano >= 2029 ? D.danger : D.text }}>{fmtNum((pfb[ano]??1)*100,0)}%</td>
                            <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtBRL(custo)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
            }
          </div>
        </div>

        {/* Precificação */}
        <div className="card">
          <div className="card-head">Composição do preço</div>
          <div className="card-body">
            <LR label="Kit solar (fornecedor)" val={fmtBRL(pre.custoKit)} />
            <LR label="Estrutura + materiais" val={fmtBRL(pre.custoEstrutura + pre.custoMateriais)} />
            <LR label="Mão de obra" val={fmtBRL(pre.custoMaoDeObra)} />
            <LR label="Projeto + ART" val={fmtBRL(pre.custoProjetoArt)} />
            {pre.custoOutros > 0 && <LR label="Outros" val={fmtBRL(pre.custoOutros)} />}
            <div className="sep" />
            <LR label="Custo total direto" val={fmtBRL(pre.custoTotalDireto)} />
            <LR label={`Impostos (${fmtNum(s.preco.aliquotaImpostos*100,1)}%)`} val={fmtBRL(pre.impostoSobreVenda)} />
            <LR label={`Lucro (margem ${fmtNum(pre.margemPercentual,0)}%)`} val={fmtBRL(pre.lucroLiquido)} color={D.success} />
            <LR label="Preço de venda à vista" val={fmtBRL(pre.precoVenda)} color={D.gold} />
          </div>
        </div>

        {/* Financiamento */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head">Simulações de financiamento</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {ind.simulacoesFinanciamento.map(sim => (
                <div key={sim.descricao} style={{ background: D.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: D.text, marginBottom: 10 }}>{sim.descricao}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: D.gold, fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>
                    {fmtBRL(sim.parcelaMensal)}<span style={{ fontSize: 12, fontWeight: 400, color: D.textMuted }}>/mês</span>
                  </div>
                  <div className="sep" />
                  <div style={{ fontSize: 12, color: D.textMuted, display:'flex', flexDirection:'column', gap:3 }}>
                    <span>Total pago: <strong style={{ color: D.text }}>{fmtBRL(sim.totalPago)}</strong></span>
                    <span>Payback: <strong style={{ color: D.text }}>{sim.paybackAnos !== null ? `${fmtNum(sim.paybackAnos,1)} anos` : '>25 anos'}</strong></span>
                    <span>Economia líquida: <strong style={{ color: D.success }}>{fmtBRL(Math.max(0, sim.economiaTotalLiquida))}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <Btn onClick={onPrev} variant="ghost">← Editar</Btn>
        <Btn onClick={onPDF} disabled={gerando}>{gerando ? '⏳ Gerando...' : '📄 Baixar Proposta PDF'}</Btn>
      </div>
    </div>
  );
}

// ─── Componentes utilitários ─────────────────────────────────────────────────
function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, marginBottom: sub ? 4 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: D.textMuted, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function NavButtons({ onPrev, onNext, nextLabel = 'Próximo →' }: { onPrev?: ()=>void; onNext?: ()=>void; nextLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: onPrev ? 'space-between' : 'flex-end', marginTop: 20 }}>
      {onPrev && <Btn onClick={onPrev} variant="ghost">← Anterior</Btn>}
      {onNext && <Btn onClick={onNext}>{nextLabel}</Btn>}
    </div>
  );
}
