import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useProjetoStore, PRESETS_MODULO, type TipoModuloPreset } from './store/useProjetoStore';
import { listarPropostas, salvarProposta, carregarProposta, excluirProposta, carregarEmpresa, salvarEmpresa, gerarId, type ProposalMeta } from './services/persistence';
import { validarCliente, validarConsumo, validarKit, validarPreco, validarProjetoCompleto, type StatusPasso } from './services/validation';
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { TIPO_TELHADO_LABELS, ORIENTACOES, type TipoTelhado } from '@data/localizacao';
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
const Campo = ({ label, hint, tip, children }: { label: string; hint?: string; tip?: string; children: React.ReactNode }) => (
  <label className="lbl">
    <span className="lbl-txt" style={{ display: 'flex', alignItems: 'center' }}>
      {label}{tip && <Tip text={tip} />}
    </span>
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

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const Tip = ({ text }: { text: string }) => {
  const [vis, setVis] = React.useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}
      onMouseEnter={() => setVis(true)} onMouseLeave={() => setVis(false)}>
      <span style={{
        cursor: 'help', color: D.textMuted, fontSize: 10, fontWeight: 800,
        border: `1.5px solid ${D.border}`, borderRadius: '50%',
        width: 15, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, lineHeight: 1, userSelect: 'none',
      }}>?</span>
      {vis && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: D.header, color: '#e0e0e0', borderRadius: 8, padding: '9px 13px',
          fontSize: 12, lineHeight: 1.55, width: 260, zIndex: 9999,
          boxShadow: '0 4px 24px rgba(0,0,0,.4)',
          whiteSpace: 'normal', pointerEvents: 'none',
          border: `1px solid #2a2d3e`,
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            border: '6px solid transparent', borderTopColor: D.header,
          }} />
        </div>
      )}
    </span>
  );
};

// ─── KPI ─────────────────────────────────────────────────────────────────────
const KPI = ({ label, val, sub, color }: { label: string; val: string; sub?: string; color?: string }) => (
  <div className="kpi">
    <div className="kpi-label">{label}</div>
    <div className="kpi-val" style={{ color: color ?? D.text }}>{val}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ─── Sidebar ─────────────────────────────────────────────────────────────────
type Aba = 'home' | 'cliente' | 'consumo' | 'local' | 'kit' | 'preco' | 'resultado';
const STEPS: { id: Aba; label: string; icon: string }[] = [
  { id: 'cliente',   label: 'Cliente',      icon: '◈' },
  { id: 'consumo',   label: 'Consumo',      icon: '⌁' },
  { id: 'local',     label: 'Local',        icon: '◧' },
  { id: 'kit',       label: 'Kit Solar',    icon: '◉' },
  { id: 'preco',     label: 'Precificação', icon: '◎' },
  { id: 'resultado', label: 'Resultado',    icon: '★' },
];

const Sidebar = ({ aba, setAba, logo, nomeEmpresa, onEmpresa, stepStatus }: {
  aba: Aba; setAba: (a: Aba) => void; logo?: string; nomeEmpresa: string; onEmpresa: () => void;
  stepStatus: Record<string, StatusPasso>;
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
                outline: stepStatus[step.id] === 'completo' && !done ? `2px solid #16a34a` : stepStatus[step.id] === 'parcial' ? `2px solid #eab308` : 'none',
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

// ─── SidebarContainer ────────────────────────────────────────────────────────
function SidebarContainer({ aba, setAba, onEmpresa, stepStatus, onHome }: {
  aba: Aba; setAba: (a: Aba) => void; onEmpresa: () => void;
  stepStatus: Record<string, StatusPasso>; onHome: () => void;
}) {
  const logo = useProjetoStore(s => s.empresa.logoBase64);
  const nome = useProjetoStore(s => s.empresa.nomeFantasia || s.empresa.razaoSocial);
  return <Sidebar aba={aba} setAba={setAba} logo={logo} nomeEmpresa={nome} onEmpresa={onEmpresa} stepStatus={stepStatus} />;
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<Aba>('home');
  const [showEmpresa, setShowEmpresa] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Carregar empresa do disco ao iniciar
  React.useEffect(() => {
    carregarEmpresa().then(emp => {
      if (emp) useProjetoStore.getState().atualizarEmpresa(emp);
    }).catch(() => {});
  }, []);

  // Status de validação por passo (granular — não assina o store inteiro)
  const calcStepStatus = (): Record<string, StatusPasso> => {
    const s = useProjetoStore.getState();
    return {
      cliente: validarCliente(s.cliente).status,
      consumo: validarConsumo(s.consumo).status,
      local: s.localizacao.utmE ? 'completo' : s.localizacao.tipoTelhado ? 'parcial' : 'vazio',
      kit: validarKit(s.kit).status,
      preco: validarPreco(s.preco, s.kit.custoKitRS).status,
      resultado: s.dimensionamento ? 'completo' : 'vazio',
    };
  };
  const [stepStatus, setStepStatus] = useState<Record<string, StatusPasso>>(calcStepStatus());
  // Atualizar status ao montar e ao mudar aba
  React.useEffect(() => { setStepStatus(calcStepStatus()); }, [aba, showEmpresa]);

  function novaProposta() {
    // Limpa o store para uma nova proposta
    useProjetoStore.setState({
      cliente: { nome:'', cpf:'', rg:'', estadoCivil:'solteiro', profissao:'', endereco:'', telefone:'', email:'', cidade:'', uf:'MG' },
      consumo: { contas: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map(m=>({mes:m,kWh:0,valorRS:0})), codigoDistribuidora:'CEMIG', tipoLigacao:'monofasica', cipMensalRS:18, tarifaRealKWhComICMS:0 },
      kit: useProjetoStore.getState().kit,
      preco: { estruturaRS:0, materiaisEletricosRS:0, maoDeObraRS:0, projetoArtRS:500, outrosCustosRS:0, aliquotaImpostos:useProjetoStore.getState().empresa.aliquotaImpostos, margemDesejada:useProjetoStore.getState().empresa.margemPadrao },
      dimensionamento: null, enquadramento: null, custosRecorrentes: null, precificacao: null, indicadores: null,
      percentuaisFioBPorAno: {}, detalhamentoPerdas: [],
    } as any);
    const newId = gerarId();
    setProposalId(newId);
    setSaving('idle');
    setAba('cliente');
  }

  async function salvar() {
    const s = useProjetoStore.getState();
    const id = proposalId ?? gerarId();
    if (!proposalId) setProposalId(id);
    setSaving('saving');
    const data = {
      id, nomeCliente: s.cliente.nome || 'Sem nome', cidade: s.cliente.cidade,
      uf: s.cliente.uf, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
      potenciaKWp: s.dimensionamento?.potenciaInstaladaRealKWp, precoVenda: s.precificacao?.precoVenda,
      empresa: s.empresa, cliente: s.cliente, consumo: s.consumo, localizacao: s.localizacao, kit: s.kit, preco: s.preco,
    };
    await salvarProposta(data).catch(console.error);
    // Salvar empresa também
    await salvarEmpresa(s.empresa).catch(console.error);
    setSaving('saved');
    setTimeout(() => setSaving('idle'), 2000);
  }

  async function abrirProposta(id: string) {
    const data = await carregarProposta(id).catch(() => null);
    if (!data) return;
    setProposalId(id);
    const store = useProjetoStore.getState();
    if (data.empresa) store.atualizarEmpresa(data.empresa);
    if (data.cliente) store.atualizarCliente(data.cliente);
    if (data.consumo) store.atualizarConsumo(data.consumo);
    if (data.localizacao) store.atualizarLocalizacao(data.localizacao);
    if (data.kit) store.atualizarKit(data.kit);
    if (data.preco) store.atualizarPreco(data.preco);
    setAba('cliente');
  }

  function tentarCalcular() {
    const { podeCalcular, erros } = validarProjetoCompleto(useProjetoStore.getState());
    if (!podeCalcular) {
      setValidationErrors(erros.map(e => e.mensagem));
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    setValidationErrors([]);
    useProjetoStore.getState().calcularTudo();
    setAba('resultado');
  }

  const temProposta = aba !== 'home';

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <SidebarContainer aba={aba} setAba={setAba} onEmpresa={() => setShowEmpresa(true)} stepStatus={stepStatus} onHome={() => setAba('home')} />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Barra de ações superior quando há proposta ativa */}
          {temProposta && !showEmpresa && (
            <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setAba('home')} style={{ background:'none', border:'none', color: D.textMuted, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>← Início</button>
              <span style={{ color: D.border }}>|</span>
              <span style={{ fontSize: 12, color: D.textMuted, flex: 1 }}>
                {useProjetoStore.getState().cliente.nome || 'Nova Proposta'}
                {proposalId && <span style={{ marginLeft: 8, fontSize: 10, color: D.textMuted }}>#{proposalId.slice(-6)}</span>}
              </span>
              {/* Erros de validação */}
              {validationErrors.length > 0 && (
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, padding:'4px 12px', fontSize:11, color:'#dc2626', maxWidth:400 }}>
                  ⚠️ {validationErrors[0]}{validationErrors.length > 1 ? ` (+${validationErrors.length-1})` : ''}
                </div>
              )}
              <button onClick={salvar} disabled={saving === 'saving'} style={{
                padding:'5px 14px', background: saving === 'saved' ? '#dcfce7' : D.bg, border:`1px solid ${D.border}`,
                borderRadius:6, fontSize:12, cursor:'pointer', color: saving === 'saved' ? '#15803d' : D.textSub, fontWeight:600,
              }}>
                {saving === 'saving' ? '⏳ Salvando...' : saving === 'saved' ? '✅ Salvo!' : '💾 Salvar'}
              </button>
            </div>
          )}
          <div style={{ padding: '28px 32px', flex: 1 }}>
            {showEmpresa && <TabEmpresa onClose={() => { setShowEmpresa(false); salvarEmpresa(useProjetoStore.getState().empresa).catch(()=>{}); }} />}
            {!showEmpresa && aba === 'home' && <TabHome onNovaProposta={novaProposta} onAbrirProposta={abrirProposta} />}
            {!showEmpresa && aba === 'cliente'   && <TabCliente   onNext={() => setAba('consumo')} />}
            {!showEmpresa && aba === 'consumo'   && <TabConsumo   onPrev={() => setAba('cliente')} onNext={() => setAba('local')} />}
            {!showEmpresa && aba === 'local'      && <TabLocal     onPrev={() => setAba('consumo')} onNext={() => setAba('kit')} />}
            {!showEmpresa && aba === 'kit'        && <TabKit       onPrev={() => setAba('local')} onNext={() => { useProjetoStore.getState().recalcularDefaultsPreco(); setAba('preco'); }} />}
            {!showEmpresa && aba === 'preco'      && <TabPreco     onPrev={() => setAba('kit')} onCalc={tentarCalcular} />}
            {!showEmpresa && aba === 'resultado'  && <TabResultado onPrev={() => setAba('preco')} />}
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Tab Home ─────────────────────────────────────────────────────────────────
function TabHome({ onNovaProposta, onAbrirProposta }: { onNovaProposta: ()=>void; onAbrirProposta: (id:string)=>void }) {
  const [propostas, setPropostas] = React.useState<any[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [excluindo, setExcluindo] = React.useState<string | null>(null);

  React.useEffect(() => {
    listarPropostas().then(p => { setPropostas(p); setCarregando(false); }).catch(() => setCarregando(false));
  }, []);

  async function handleExcluir(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Excluir esta proposta permanentemente?')) return;
    setExcluindo(id);
    await excluirProposta(id).catch(() => {});
    setPropostas(p => p.filter(x => x.id !== id));
    setExcluindo(null);
  }

  const fmtData = (iso: string) => {
    try {
      const d = new Date(iso);
      const hoje = new Date();
      const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
      if (diff === 0) return 'Hoje às ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      if (diff === 1) return 'Ontem';
      if (diff < 7) return `${diff} dias atrás`;
      return d.toLocaleDateString('pt-BR');
    } catch { return iso; }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:D.text }}>Propostas</h1>
          <p style={{ fontSize:13, color:D.textMuted, marginTop:4 }}>Gerencie seus projetos fotovoltaicos</p>
        </div>
        <Btn onClick={onNovaProposta}>+ Nova Proposta</Btn>
      </div>

      {carregando && <p style={{ color:D.textMuted, textAlign:'center', padding:40 }}>Carregando...</p>}

      {!carregando && propostas.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', background:D.card, borderRadius:16, border:`2px dashed ${D.border}` }}>
          <div style={{ fontSize:48, marginBottom:16 }}>☀️</div>
          <h2 style={{ fontSize:18, fontWeight:700, color:D.text, marginBottom:8 }}>Nenhuma proposta ainda</h2>
          <p style={{ fontSize:14, color:D.textMuted, marginBottom:24 }}>Crie sua primeira proposta para um cliente</p>
          <Btn onClick={onNovaProposta}>+ Nova Proposta</Btn>
        </div>
      )}

      {!carregando && propostas.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {propostas.map((p: any) => (
            <div key={p.id}
              onClick={() => onAbrirProposta(p.id)}
              style={{
                background:D.card, border:`1px solid ${D.border}`, borderRadius:12,
                padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:16,
                transition:'box-shadow .15s, border-color .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = D.gold; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 2px ${D.gold}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = D.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              {/* Ícone */}
              <div style={{ width:44, height:44, background:`${D.gold}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:20 }}>☀️</span>
              </div>
              {/* Info */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:D.text, marginBottom:3 }}>{p.nomeCliente || 'Sem nome'}</div>
                <div style={{ fontSize:12, color:D.textMuted }}>
                  {[p.cidade, p.uf].filter(Boolean).join(' · ')}
                  {p.cidade || p.uf ? ' · ' : ''}
                  {fmtData(p.atualizadoEm)}
                </div>
              </div>
              {/* Badges */}
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                {p.potenciaKWp && (
                  <div style={{ background:`${D.gold}15`, color:'#7a5c00', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                    {p.potenciaKWp.toFixed(1)} kWp
                  </div>
                )}
                {p.precoVenda && (
                  <div style={{ background:'#f0fdf4', color:'#15803d', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                    {p.precoVenda.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}
                  </div>
                )}
              </div>
              {/* Excluir */}
              <button
                onClick={(e) => handleExcluir(p.id, e)}
                disabled={excluindo === p.id}
                style={{ background:'none', border:'none', color:D.textMuted, cursor:'pointer', fontSize:18, padding:'4px 8px', borderRadius:6, flexShrink:0 }}
                title="Excluir proposta"
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
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
            <Campo label="CPF do engenheiro responsável" tip="Necessário para a Procuração. Formato: 000.000.000-00"><input className="inp" value={empresa.cpfEngenheiro} onChange={e => atualizarEmpresa({ cpfEngenheiro: e.target.value })} placeholder="000.000.000-00" /></Campo>
          </div>
          <div className="sep" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {empresa.logoBase64 && <img src={empresa.logoBase64} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'contain', border: `1px solid ${D.border}` }} />}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: D.gold, color: D.header, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              📂 {empresa.logoBase64 ? 'Trocar logo' : 'Carregar logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const r = new FileReader(); r.onload = ev => atualizarEmpresa({ logoBase64: ev.target?.result as string }); r.readAsDataURL(file);
              }} />
            </label>
            {empresa.logoBase64 && <button onClick={() => atualizarEmpresa({ logoBase64: undefined })} style={{ background:'none', border:'none', color: D.danger, cursor:'pointer', fontSize:12, fontWeight:600 }}>Remover logo</button>}
          </div>
          <div className="sep" />
          <p className="lbl-hint" style={{ marginBottom: 10 }}>Fotos para os PDFs — <strong>já vêm com a arte Lumen padrão</strong>, mas você pode personalizar:</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Foto de capa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {empresa.fotoCapa
                ? <img src={empresa.fotoCapa} style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, border: `1px solid ${D.border}` }} />
                : <div style={{ width: 72, height: 52, background: '#0d1117', borderRadius: 6, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: D.gold }}>CAPA</div>
              }
              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: D.gold, color: D.header, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  🖼 Foto de capa
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const r = new FileReader(); r.onload = ev => atualizarEmpresa({ fotoCapa: ev.target?.result as string }); r.readAsDataURL(file);
                  }} />
                </label>
                {empresa.fotoCapa && <button onClick={() => atualizarEmpresa({ fotoCapa: undefined })} style={{ marginLeft: 6, background: 'none', border: 'none', color: D.danger, cursor: 'pointer', fontSize: 11 }}>Remover</button>}
                <p className="lbl-hint">Portrait A4 — proposta do cliente</p>
              </div>
            </div>
            {/* Foto de apoio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {empresa.fotoApoio
                ? <img src={empresa.fotoApoio} style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, border: `1px solid ${D.border}` }} />
                : <div style={{ width: 72, height: 52, background: '#0d1117', borderRadius: 6, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: D.gold }}>BANNER</div>
              }
              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: D.gold, color: D.header, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  🖼 Foto de apoio
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const r = new FileReader(); r.onload = ev => atualizarEmpresa({ fotoApoio: ev.target?.result as string }); r.readAsDataURL(file);
                  }} />
                </label>
                {empresa.fotoApoio && <button onClick={() => atualizarEmpresa({ fotoApoio: undefined })} style={{ marginLeft: 6, background: 'none', border: 'none', color: D.danger, cursor: 'pointer', fontSize: 11 }}>Remover</button>}
                <p className="lbl-hint">Landscape wide — banner interno</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Valores-base de precificação</div>
        <div className="card-body">
          <p className="lbl-hint" style={{ marginBottom: 14 }}>Preenche automaticamente cada proposta. Editável por projeto na aba Precificação.</p>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Estrutura de fixação (R$/kWp)" hint="Padrão: R$150/kWp instalado"><input className="inp inp-num" type="number" value={empresa.valorEstruturaPorKWp} onChange={e => atualizarEmpresa({ valorEstruturaPorKWp: Number(e.target.value) })} /></Campo>
            <Campo label="Materiais elétricos (R$/kWp)" hint="Cabos, DPS, disjuntores, eletrodutos"><input className="inp inp-num" type="number" value={empresa.valorMateriaisPorKWp} onChange={e => atualizarEmpresa({ valorMateriaisPorKWp: Number(e.target.value) })} /></Campo>
            <Campo label="Mão de obra (R$/módulo)" hint="Instalação + comissionamento do inversor"><input className="inp inp-num" type="number" value={empresa.valorMaoDeObraPorModulo} onChange={e => atualizarEmpresa({ valorMaoDeObraPorModulo: Number(e.target.value) })} /></Campo>
            <Campo label="Projeto + ART CREA (R$)" hint="CREA-MG: R$69 (até 10k), R$130 (até 30k), R$250 (até 100k) + projeto ~R$400"><input className="inp inp-num" type="number" value={empresa.valorProjetoArt} onChange={e => atualizarEmpresa({ valorProjetoArt: Number(e.target.value) })} /></Campo>
            <Campo label="Alíquota Simples Nacional (%)" hint="Alíquota efetiva mensal do DAS — informe o valor do seu contador"><input className="inp inp-num" type="number" step="0.1" value={+(empresa.aliquotaImpostos * 100).toFixed(1)} onChange={e => atualizarEmpresa({ aliquotaImpostos: Number(e.target.value) / 100 })} /></Campo>
            <Campo label="Margem de lucro padrão (%)" hint="Sobre o preço de venda (não sobre o custo)"><input className="inp inp-num" type="number" step="1" value={+(empresa.margemPadrao * 100).toFixed(0)} onChange={e => atualizarEmpresa({ margemPadrao: Number(e.target.value) / 100 })} /></Campo>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Simulações de financiamento</div>
        <div className="card-body">
          <div className="info-box info-box-blue" style={{ marginBottom: 14 }}>
            ⚠️ <strong>Atenção:</strong> as taxas do Solfácil variam de 0,99% a 2,49% a.m. conforme o perfil de crédito do cliente. Atualize sempre com a taxa real aprovada para cada cliente. Taxa padrão de 1,99% a.m. é uma referência — não é garantida.
          </div>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Solfácil 48× — taxa mensal (%)" hint="Solfácil: 0,99% a 2,49% a.m. conforme perfil de crédito. 1,99% = referência.">
              <input className="inp inp-num" type="number" step="0.01" value={+(empresa.taxaSolfacil48Mensal*100).toFixed(2)} onChange={e => atualizarEmpresa({ taxaSolfacil48Mensal: Number(e.target.value)/100 })} />
            </Campo>
            <Campo label="Solfácil 60× — taxa mensal (%)" hint="Geralmente igual ou levemente superior às 48 parcelas.">
              <input className="inp inp-num" type="number" step="0.01" value={+(empresa.taxaSolfacil60Mensal*100).toFixed(2)} onChange={e => atualizarEmpresa({ taxaSolfacil60Mensal: Number(e.target.value)/100 })} />
            </Campo>
            <Campo label="3ª opção — descrição" hint='Ex: "Cartão 18×", "Banco do Brasil 72×", "BNDES"'>
              <input className="inp" value={empresa.descricaoOutroFinanciamento} onChange={e => atualizarEmpresa({ descricaoOutroFinanciamento: e.target.value })} />
            </Campo>
            <Campo label="3ª opção — parcelas">
              <input className="inp inp-num" type="number" value={empresa.parcelasOutroFinanciamento} onChange={e => atualizarEmpresa({ parcelasOutroFinanciamento: Number(e.target.value) })} />
            </Campo>
            <Campo label="3ª opção — taxa mensal (%)" hint="Cartão de crédito: geralmente 2,49% a 3,49% a.m.">
              <input className="inp inp-num" type="number" step="0.01" value={+(empresa.taxaOutroFinanciamento*100).toFixed(2)} onChange={e => atualizarEmpresa({ taxaOutroFinanciamento: Number(e.target.value)/100 })} />
            </Campo>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Parâmetros de análise financeira</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Reajuste tarifário esperado (%/ano)" hint="Média histórica ANEEL: 6% a 10%/ano. Conservador: 6%.">
              <input className="inp inp-num" type="number" step="0.5" value={+(empresa.reajusteTarifarioAnual*100).toFixed(1)} onChange={e => atualizarEmpresa({ reajusteTarifarioAnual: Number(e.target.value)/100 })} />
            </Campo>
            <Campo label="TMA — taxa mínima de atratividade (%/ano)" hint="Taxa de referência para payback descontado e VPL. CDI atual: ~10,5%/ano.">
              <input className="inp inp-num" type="number" step="0.5" value={+(empresa.taxaMinimaAtratividadeAnual*100).toFixed(1)} onChange={e => atualizarEmpresa({ taxaMinimaAtratividadeAnual: Number(e.target.value)/100 })} />
            </Campo>
            <Campo label="Fração Fio B na tarifa (%)" hint="Componente TUSD de distribuição sobre a tarifa total. CEMIG: ~32%, média nacional: ~35%.">
              <input className="inp inp-num" type="number" step="0.5" value={+(empresa.fracaoTarifaFioB*100).toFixed(1)} onChange={e => atualizarEmpresa({ fracaoTarifaFioB: Number(e.target.value)/100 })} />
            </Campo>
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
            <Campo label="Nome completo *" hint="Nome ou razão social do cliente" tip="Aparece na capa da proposta comercial. Pessoa física: nome completo. Empresa: razão social ou nome fantasia.">
              <input className="inp" value={cliente.nome} onChange={e => atualizarCliente({ nome: e.target.value })} placeholder="Ex: João Silva / Empresa Ltda" autoFocus />
            </Campo>
            <Campo label="Cidade">
              <input className="inp" value={cliente.cidade} onChange={e => atualizarCliente({ cidade: e.target.value })} />
            </Campo>
            <Campo label="UF" tip="A UF define a irradiação solar local usada no cálculo de geração. Estados com mais sol geram mais com o mesmo sistema.">
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
function TabConsumo({ onPrev, onNext }: { onPrev:()=>void; onNext:()=>void }) {
  const s = useProjetoStore();
  const validas = s.consumo.contas.filter(c => c.kWh > 0);
  const mediaKWh = validas.length > 0 ? validas.reduce((a, c) => a + c.kWh, 0) / validas.length : 0;
  const mediaRS  = validas.filter(c => c.valorRS > 0).length > 0
    ? validas.filter(c => c.valorRS > 0).reduce((a,c) => a + c.valorRS, 0) / validas.filter(c => c.valorRS > 0).length : 0;
  return (
    <div style={{ maxWidth: 700 }}>
      <PageTitle title="Consumo de energia" sub="Preencha com os dados das faturas do cliente dos últimos 12 meses." />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Distribuidora e tarifas</div>
        <div className="card-body">
          <div className="info-box info-box-blue" style={{ marginBottom: 14, fontSize: 12 }}>
            📄 <strong>Como preencher a partir da conta de energia:</strong><br/>
            <span style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
              • <strong>Distribuidora</strong> → logo no cabeçalho da conta (CEMIG, Equatorial, etc.)<br/>
              • <strong>Tipo de ligação</strong> → campo "Classe/Subclasse" — "Bifásico" ou "Trifásico" ou "Monofásico"<br/>
              • <strong>CIP/COSIP</strong> → linha "Contrib. Ilum. Publica Municipal" nos Valores Faturados<br/>
              • <strong>Tarifa real</strong> → coluna "Preço Unit." na linha "Energia Elétrica"<br/>
              • <strong>Nº da UC</strong> → "N.º DA UNIDADE CONSUMIDORA" (número grande em destaque)<br/>
              • <strong>Histórico</strong> → tabela "Histórico de Consumo" no canto inferior esquerdo
            </span>
          </div>
          <div className="g2" style={{ marginBottom: 12 }}>
            <Campo label="Distribuidora" tip="Distribuidora de energia elétrica da conta do cliente. O logo aparece no cabeçalho da fatura.">
              <select className="inp" value={s.consumo.codigoDistribuidora} onChange={e => s.atualizarConsumo({ codigoDistribuidora: e.target.value })}>
                {DISTRIBUIDORAS.map(d => <option key={d.codigo} value={d.codigo}>{d.nomeAbreviado}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo de ligação" tip="Está no campo 'Classe' da conta — Bifásico, Monofásico ou Trifásico. Determina o mínimo faturável: Mono=30kWh, Bi=50kWh, Tri=100kWh. ATENÇÃO: a maioria das contas residenciais em Araguari/CEMIG é BIFÁSICA.">
              <select className="inp" value={s.consumo.tipoLigacao} onChange={e => s.atualizarConsumo({ tipoLigacao: e.target.value as 'monofasica'|'bifasica'|'trifasica' })}>
                <option value="monofasica">Monofásica (30 kWh mín.)</option>
                <option value="bifasica">Bifásica (50 kWh mín.)</option>
                <option value="trifasica">Trifásica (100 kWh mín.)</option>
              </select>
            </Campo>
          </div>
          <div className="g2" style={{ marginBottom: 12 }}>
            <Campo
              label="Tarifa real da conta (R$/kWh)"
              hint="Coluna 'Preço Unit.' linha Energia Elétrica — ex: 1,18272801"
              tip="⭐ CAMPO MAIS IMPORTANTE para precisão. Copie o valor exato da coluna 'Preço Unit.' na linha 'Energia Elétrica'. É mais preciso que qualquer banco de dados, pois reflete a tarifa atual após revisão da ANEEL. Se deixar 0, usa a referência do banco de dados (menos preciso)."
            >
              <input className="inp inp-num" type="number" step="0.00001" value={s.consumo.tarifaRealKWhComICMS || ''} onChange={e => s.atualizarConsumo({ tarifaRealKWhComICMS: Number(e.target.value) })} placeholder="Ex: 1.18272801" />
            </Campo>
            <Campo label="CIP / Iluminação pública (R$/mês)" hint="Linha 'Contrib. Ilum. Publica Municipal'" tip="Contribuição municipal de iluminação pública. Na conta CEMIG aparece como 'Contrib. Ilum. Publica Municipal'. Persiste após instalação solar.">
              <input className="inp inp-num" type="number" step="0.01" value={s.consumo.cipMensalRS} onChange={e => s.atualizarConsumo({ cipMensalRS: Number(e.target.value) })} />
            </Campo>
          </div>
          {/* Aviso de tarifa */}
          {s.consumo.tarifaRealKWhComICMS === 0 && (() => {
            const d = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora);
            return d ? (
              <div className="info-box" style={{ marginBottom: 12 }}>
                ⚠️ Usando tarifa de referência do banco de dados ({d.nomeAbreviado}): <strong>R$ {d.tarifaKWhComICMS.toFixed(4)}/kWh</strong> ({d.referenciaAtualizacao}). Para máxima precisão, informe a tarifa real da conta acima.
              </div>
            ) : null;
          })()}
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
      {/* Validação consumo */}
      {(() => {
        const validas = s.consumo.contas.filter(c => c.kWh > 0);
        if (validas.length < 3) return (
          <div className="info-box" style={{ marginBottom:12 }}>
            ⚠️ Preencha pelo menos <strong>3 meses</strong> de consumo para dimensionar corretamente. ({validas.length}/3 meses preenchidos)
          </div>
        );
        return null;
      })()}
      <NavButtons onPrev={onPrev} onNext={onNext} nextLabel="Kit Solar →" />
    </div>
  );
}

// ─── Tab Local ───────────────────────────────────────────────────────────────
function TabLocal({ onPrev, onNext }: { onPrev:()=>void; onNext:()=>void }) {
  const s = useProjetoStore();
  const loc = s.localizacao;
  const upd = s.atualizarLocalizacao;
  return (
    <div style={{ maxWidth: 680 }}>
      <PageTitle title="Local de instalação" sub="Dados do telhado e coordenadas — necessários para o Memorial Descritivo (CEMIG/distribuidora)." />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Telhado</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Tipo de telhado" tip="Determina o tipo de estrutura de fixação e pode afetar o peso distribuído.">
              <select className="inp" value={loc.tipoTelhado} onChange={e => upd({ tipoTelhado: e.target.value as TipoTelhado })}>
                {Object.entries(TIPO_TELHADO_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            {loc.tipoTelhado === 'outro' && (
              <Campo label="Descreva o tipo de telhado">
                <input className="inp" value={loc.descTipoTelhado} onChange={e => upd({ descTipoTelhado: e.target.value })} />
              </Campo>
            )}
            <Campo label="Inclinação do telhado (°)" tip="Inclinação em graus da superfície onde os módulos serão instalados. Telhados coloniais tipicamente 20-30°; laje = 0-10°. Afeta a geração estimada.">
              <input className="inp inp-num" type="number" step="0.5" min="0" max="90" value={loc.inclinacaoGraus} onChange={e => upd({ inclinacaoGraus: Number(e.target.value) })} />
            </Campo>
            <Campo label="Orientação principal dos módulos" tip="Direção para onde os módulos ficam voltados. Norte = máxima geração no hemisfério sul. Nordeste e Noroeste também são boas opções.">
              <select className="inp" value={loc.orientacaoPrincipal} onChange={e => upd({ orientacaoPrincipal: e.target.value })}>
                {ORIENTACOES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Desvio azimutal (°)" hint="Positivo = desvio para Oeste, Negativo = desvio para Leste" tip="Ângulo de desvio em relação à orientação cardinal selecionada. Ex: Norte com desvio de +15° = Norte-Noroeste. Zero = orientação exata.">
              <input className="inp inp-num" type="number" step="1" min="-90" max="90" value={loc.desvioAzimuthalGraus} onChange={e => upd({ desvioAzimuthalGraus: Number(e.target.value) })} />
            </Campo>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Coordenadas e identificação da UC</div>
        <div className="card-body">
          <div className="info-box info-box-blue" style={{ marginBottom: 14 }}>
            💡 Coordenadas UTM são necessárias para o Memorial Descritivo. Obtenha no Google Maps (botão direito → "O que há aqui?") ou GPS. Use o conversor online de lat/long para UTM.
          </div>
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="UTM E — Abscissa" hint="Ex: 795209" tip="Coordenada UTM Leste (Easting). Obtida convertendo latitude/longitude para UTM. Necessária para o memorial.">
              <input className="inp" value={loc.utmE} onChange={e => upd({ utmE: e.target.value })} placeholder="Ex: 795209" />
            </Campo>
            <Campo label="UTM N — Ordenada" hint="Ex: 7933873" tip="Coordenada UTM Norte (Northing).">
              <input className="inp" value={loc.utmN} onChange={e => upd({ utmN: e.target.value })} placeholder="Ex: 7933873" />
            </Campo>
            <Campo label="Fuso UTM" hint="MG/GO/SP: Fuso 22 ou 23" tip="Zona UTM. Minas Gerais e Goiás usam fuso 22 ou 23 dependendo da longitude.">
              <input className="inp inp-num" type="number" value={loc.utmFuso} onChange={e => upd({ utmFuso: Number(e.target.value) })} />
            </Campo>
            <Campo label="Nº da UC (Unidade Consumidora)" hint="Número do cliente na distribuidora — está na conta de energia" tip="Código de identificação do cliente na distribuidora (CEMIG, Equatorial, etc.). Necessário para o pedido de acesso.">
              <input className="inp" value={loc.numeroUC} onChange={e => upd({ numeroUC: e.target.value })} placeholder="Ex: 1234567-8" />
            </Campo>
            <Campo label="Nº do Medidor" hint="Opcional">
              <input className="inp" value={loc.numeroMedidor} onChange={e => upd({ numeroMedidor: e.target.value })} />
            </Campo>
            <Campo label="Endereço da instalação" hint="Se diferente do endereço do cliente">
              <input className="inp" value={loc.enderecoInstalacao} onChange={e => upd({ enderecoInstalacao: e.target.value })} placeholder="Rua, número, bairro — CEP" />
            </Campo>
          </div>
        </div>
      </div>

      <NavButtons onPrev={onPrev} onNext={onNext} nextLabel="Kit Solar →" />
    </div>
  );
}

// ─── Tab Kit ──────────────────────────────────────────────────────────────────
function TabKit({ onPrev, onNext }: { onPrev:()=>void; onNext:()=>void }) {
  const s = useProjetoStore();
  const validas = s.consumo.contas.filter(c => c.kWh > 0);
  const mediaKWh = validas.length > 0 ? validas.reduce((a, c) => a + c.kWh, 0) / validas.length : 0;
  const potKWp = (s.kit.potenciaModuloWp * s.kit.quantidade) / 1000;
  return (
    <div style={{ maxWidth: 680 }}>
      <PageTitle title="Kit Solar" sub={mediaKWh > 0 ? `Consumo médio do cliente: ${fmtNum(mediaKWh,0)} kWh/mês — busque no fornecedor um kit que gere esse valor.` : 'Preencha com os dados do kit escolhido no fornecedor.'} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Módulos fotovoltaicos</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Tipo do módulo" hint="Define automaticamente os parâmetros de eficiência" tip="Monocristalino: mais eficiente, menos sensível ao calor. Bifacial N-TYPE: gera dos dois lados, melhor em dias nublados, menor degradação ao longo do tempo. Policristalino: tecnologia mais antiga, eficiência inferior, menos usada em 2025.">
              <select className="inp" value={s.kit.tipoModulo} onChange={e => s.atualizarKit({ tipoModulo: e.target.value as TipoModuloPreset })}>
                {(Object.entries(PRESETS_MODULO) as [TipoModuloPreset, typeof PRESETS_MODULO[TipoModuloPreset]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Marca"><input className="inp" value={s.kit.marcaModulo} onChange={e => s.atualizarKit({ marcaModulo: e.target.value })} placeholder="Ex: Leapton, DAH, JA Solar" /></Campo>
            <Campo label="Modelo"><input className="inp" value={s.kit.modeloModulo} onChange={e => s.atualizarKit({ modeloModulo: e.target.value })} placeholder="Ex: 620W BIF N-TYPE" /></Campo>
            <Campo label="Potência (Wp)" tip="Potência de pico de cada módulo em condições padrão (STC: 1000 W/m², 25°C). Em campo, a geração real é menor por temperatura, sujidade e sombreamento — o sistema de perdas do LumenSolar calcula isso automaticamente."><input className="inp inp-num" type="number" value={s.kit.potenciaModuloWp} onChange={e => s.atualizarKit({ potenciaModuloWp: Number(e.target.value) })} /></Campo>
            <Campo label="Quantidade de módulos" tip="Use o painel de sugestão acima para saber o mínimo recomendado. É comum superdimensionar em 5-10% para compensar meses com menos sol e futuro crescimento de consumo."><input className="inp inp-num" type="number" value={s.kit.quantidade || ''} onChange={e => s.atualizarKit({ quantidade: Number(e.target.value) })} /></Campo>
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
            <Campo label="Eficiência máxima (%)" hint="Growatt MIN X2: 98,4% · Fronius: 98,1%" tip="Percentual da energia CC dos painéis que o inversor converte em CA para a rede. Inversores modernos chegam a 98-99%. Está no datasheet do fabricante."><input className="inp inp-num" type="number" step="0.1" value={s.kit.eficienciaInversorPercent} onChange={e => s.atualizarKit({ eficienciaInversorPercent: Number(e.target.value) })} /></Campo>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Custo e enquadramento</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Custo do kit no fornecedor (R$)" hint="Módulos + inversor conforme orçamento" tip="Preço de custo do kit completo (módulos + inversor) conforme NF do fornecedor. Não inclui estrutura, materiais elétricos, mão de obra e projeto — esses são adicionados na aba Precificação.">
              <input className="inp inp-num" type="number" step="0.01" value={s.kit.custoKitRS || ''} onChange={e => s.atualizarKit({ custoKitRS: Number(e.target.value) })} style={!s.kit.custoKitRS ? {borderColor:'#fca5a5'} : {}} />
            </Campo>
            <Campo label="Data de protocolo de acesso" hint="Lei 14.300/2022: define a regra do Fio B" tip="Data em que você vai protocolar o pedido de acesso na distribuidora. Determinante para o enquadramento no art. 26 (isenção de Fio B até 2045) ou no art. 27 (cobrança gradual de 15% a 100%). Dentro de 12 meses da publicação da lei (até 07/01/2023) = art. 26. Após isso = art. 27.">
              <input className="inp" type="date" value={s.kit.dataProtocoloAcesso} onChange={e => s.atualizarKit({ dataProtocoloAcesso: e.target.value })} />
            </Campo>
          </div>
        </div>
      </div>
      {/* Specs técnicas — para Memorial Descritivo */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Especificações técnicas do módulo — do datasheet</div>
        <div className="card-body">
          <p className="lbl-hint" style={{ marginBottom: 14 }}>Dados do datasheet do fabricante — necessários para o Memorial Descritivo enviado à distribuidora.</p>
          <div className="g3" style={{ rowGap: 14 }}>
            <Campo label="Vmpp (V)" tip="Tensão de máxima potência em condições STC (1000 W/m², 25°C). Está na ficha técnica do módulo."><input className="inp inp-num" type="number" step="0.1" value={s.kit.vmppV || ''} onChange={e => s.atualizarKit({ vmppV: Number(e.target.value) })} /></Campo>
            <Campo label="Impp (A)" tip="Corrente de máxima potência em STC."><input className="inp inp-num" type="number" step="0.01" value={s.kit.imppA || ''} onChange={e => s.atualizarKit({ imppA: Number(e.target.value) })} /></Campo>
            <Campo label="Voc (V)" tip="Tensão de circuito aberto — usada para calcular tensão máxima do sistema CC."><input className="inp inp-num" type="number" step="0.1" value={s.kit.vocV || ''} onChange={e => s.atualizarKit({ vocV: Number(e.target.value) })} /></Campo>
            <Campo label="Isc (A)" tip="Corrente de curto-circuito — usada para dimensionar proteções CC."><input className="inp inp-num" type="number" step="0.01" value={s.kit.iscA || ''} onChange={e => s.atualizarKit({ iscA: Number(e.target.value) })} /></Campo>
            <Campo label="Comprimento (mm)"><input className="inp inp-num" type="number" value={s.kit.comprimentoMm || ''} onChange={e => s.atualizarKit({ comprimentoMm: Number(e.target.value) })} /></Campo>
            <Campo label="Largura (mm)"><input className="inp inp-num" type="number" value={s.kit.larguraMm || ''} onChange={e => s.atualizarKit({ larguraMm: Number(e.target.value) })} /></Campo>
            <Campo label="Peso por módulo (kg)"><input className="inp inp-num" type="number" step="0.1" value={s.kit.pesoKgModulo || ''} onChange={e => s.atualizarKit({ pesoKgModulo: Number(e.target.value) })} /></Campo>
            <Campo label="Garantia do produto (anos)"><input className="inp inp-num" type="number" value={s.kit.garantiaProdutoAnos} onChange={e => s.atualizarKit({ garantiaProdutoAnos: Number(e.target.value) })} /></Campo>
            <Campo label="Garantia de potência (anos)"><input className="inp inp-num" type="number" value={s.kit.garantiaPotenciaAnos} onChange={e => s.atualizarKit({ garantiaPotenciaAnos: Number(e.target.value) })} /></Campo>
          </div>
          <div className="g2" style={{ rowGap: 14, marginTop: 12 }}>
            <Campo label="Potência garantida ao final (%)" hint="Ex: 80% ao final de 25 anos"><input className="inp inp-num" type="number" value={s.kit.potenciaGarantidaPercent} onChange={e => s.atualizarKit({ potenciaGarantidaPercent: Number(e.target.value) })} /></Campo>
            <Campo label="Certificações" hint="Ex: INMETRO, IEC 61215, IEC 61730"><input className="inp" value={s.kit.certificacoes} onChange={e => s.atualizarKit({ certificacoes: e.target.value })} /></Campo>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Configuração de strings e specs do inversor — para Memorial</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="Número de strings (fileiras)" tip="Número de fileiras de módulos ligadas em paralelo. Sistemas residenciais pequenos geralmente usam 1 string."><input className="inp inp-num" type="number" min="1" value={s.kit.numStrings} onChange={e => s.atualizarKit({ numStrings: Number(e.target.value) })} /></Campo>
            <Campo label="Módulos por string" hint="Será preenchido automaticamente ao calcular" tip="Número de módulos ligados em série em cada string. Tensão do sistema CC = Voc × módulos por string."><input className="inp inp-num" type="number" min="1" value={s.kit.modulosPorString} onChange={e => s.atualizarKit({ modulosPorString: Number(e.target.value) })} /></Campo>
            <Campo label="Faixa MPPT mín. (V)" tip="Tensão mínima da faixa de rastreamento de potência máxima do inversor — do datasheet."><input className="inp inp-num" type="number" value={s.kit.faixaMpptMinV || ''} onChange={e => s.atualizarKit({ faixaMpptMinV: Number(e.target.value) })} /></Campo>
            <Campo label="Faixa MPPT máx. (V)"><input className="inp inp-num" type="number" value={s.kit.faixaMpptMaxV || ''} onChange={e => s.atualizarKit({ faixaMpptMaxV: Number(e.target.value) })} /></Campo>
            <Campo label="Tensão máx. entrada CC (V)" tip="Tensão máxima de entrada do inversor. O sistema deve ser projetado para ficar abaixo desse valor."><input className="inp inp-num" type="number" value={s.kit.tensaoMaxEntradaV || ''} onChange={e => s.atualizarKit({ tensaoMaxEntradaV: Number(e.target.value) })} /></Campo>
            <Campo label="Corrente máx. saída CA (A)"><input className="inp inp-num" type="number" step="0.1" value={s.kit.corrMaxSaidaA || ''} onChange={e => s.atualizarKit({ corrMaxSaidaA: Number(e.target.value) })} /></Campo>
            <Campo label="Número de MPPTs" hint="Rastreadores de ponto de máxima potência"><input className="inp inp-num" type="number" min="1" value={s.kit.numMppt} onChange={e => s.atualizarKit({ numMppt: Number(e.target.value) })} /></Campo>
            <Campo label="IP do gabinete" hint="Ex: IP65, IP67"><input className="inp" value={s.kit.ipGabinete} onChange={e => s.atualizarKit({ ipGabinete: e.target.value })} /></Campo>
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
            <Campo label="Estrutura de fixação (R$)" tip="Estrutura metálica (alumínio ou aço galvanizado) para fixar os módulos no telhado. Varia com o tipo de telhado: colonial, metálico, laje. R$150/kWp é um valor médio para telhado colonial." hint={`Auto: ${fmtNum((s.kit.potenciaModuloWp * s.kit.quantidade)/1000, 2)} kWp × R$${s.empresa.valorEstruturaPorKWp}/kWp`}><input className="inp inp-num" type="number" step="0.01" value={s.preco.estruturaRS || ''} onChange={e => s.atualizarPreco({ estruturaRS: Number(e.target.value) })} /></Campo>
            <Campo label="Materiais elétricos (R$)" hint="Cabos, DPS, string box, disjuntores" tip="Inclui: cabo solar 6mm² (±4m por módulo), conectores MC4, String Box com DPS, disjuntor CA, eletrodutos e calhas. R$120/kWp é uma estimativa conservadora."><input className="inp inp-num" type="number" step="0.01" value={s.preco.materiaisEletricosRS || ''} onChange={e => s.atualizarPreco({ materiaisEletricosRS: Number(e.target.value) })} /></Campo>
            <Campo label="Mão de obra (R$)" tip="Inclui: instalação da estrutura, fixação dos módulos, conexão do inversor, comissionamento e testes do sistema. R$280/módulo é referência para instalações residenciais com 1-2 técnicos." hint={`Auto: ${s.kit.quantidade} módulos × R$${s.empresa.valorMaoDeObraPorModulo}/módulo`}><input className="inp inp-num" type="number" step="0.01" value={s.preco.maoDeObraRS || ''} onChange={e => s.atualizarPreco({ maoDeObraRS: Number(e.target.value) })} /></Campo>
            <Campo label="Projeto + ART CREA (R$)" hint="ART CREA-MG (~R$130) + projeto de engenharia (~R$400)" tip="ART obrigatória para conexão à distribuidora. CREA-MG 2025: até R$30k de obra = R$130. Projeto elétrico inclui diagrama unifilar, memorial descritivo e documentação para a distribuidora."><input className="inp inp-num" type="number" step="0.01" value={s.preco.projetoArtRS || ''} onChange={e => s.atualizarPreco({ projetoArtRS: Number(e.target.value) })} /></Campo>
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
            <Campo label="Alíquota Simples Nacional (%)" hint="Alíquota efetiva mensal do DAS" tip="Alíquota efetiva que aparece no DAS (Documento de Arrecadação do Simples). Seu contador calcula mensalmente. Faixas 2025 (Anexo III serviços): até R$180k/ano = 6% | R$180k-R$360k ≈ 9-11%."><input className="inp inp-num" type="number" step="0.1" value={+(s.preco.aliquotaImpostos*100).toFixed(1)} onChange={e => s.atualizarPreco({ aliquotaImpostos: Number(e.target.value)/100 })} /></Campo>
            <Campo label="Margem de lucro (% sobre venda)" hint="Ex: 15% = R$0,15 de cada R$1,00 vendido" tip="Margem calculada SOBRE o preço de venda (não sobre o custo). Ou seja, 15% de margem significa que de cada R$100 recebidos, R$15 são lucro. É diferente do markup: margem 15% = markup ~25%. Setor solar: margem típica de 10% a 25%."><input className="inp inp-num" type="number" step="1" value={+(s.preco.margemDesejada*100).toFixed(0)} onChange={e => s.atualizarPreco({ margemDesejada: Number(e.target.value)/100 })} /></Campo>
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
function TabResultado({ onPrev }: { onPrev:()=>void }) {
  const s = useProjetoStore();
  const [gerando, setGerando] = React.useState(false);

  function buildData() {
    const { empresa, cliente, consumo, kit, dimensionamento, custosRecorrentes,
      precificacao, enquadramento, percentuaisFioBPorAno, consumoMedioMensalKWh,
      valorMedioMensalRS, preco, indicadores } = s;
    return {
      empresa, cliente, codigoDistribuidora: consumo.codigoDistribuidora,
      kit: {
        marcaModulo: kit.marcaModulo, modeloModulo: kit.modeloModulo,
        potenciaModuloWp: kit.potenciaModuloWp, quantidade: kit.quantidade,
        tipoModulo: (PRESETS_MODULO[kit.tipoModulo].bifacial ? 'bifacial' :
          kit.tipoModulo === 'policristalino' ? 'policristalino' : 'monocristalino') as 'monocristalino'|'policristalino'|'bifacial',
        marcaInversor: kit.marcaInversor, modeloInversor: kit.modeloInversor,
        potenciaInversorKW: kit.potenciaInversorKW, custoKitRS: kit.custoKitRS,
      },
      dimensionamento: dimensionamento!, custosRecorrentes: custosRecorrentes!,
      precificacao: precificacao!, enquadramento: enquadramento!,
      percentuaisFioBPorAno, consumoMedioMensalKWh: consumoMedioMensalKWh ?? 0,
      valorMedioMensalRS: valorMedioMensalRS ?? 0,
      aliquotaImpostos: preco.aliquotaImpostos, margemDesejada: preco.margemDesejada,
      indicadores: indicadores!, contas: consumo.contas,
    };
  }

  async function gerarPDFCliente() {
    if (!s.dimensionamento) return;
    setGerando(true);
    try {
      const { PropostaComercialPDF } = await import('@domain/proposta/PropostaComercialPDF');
      const blob = await pdf(<PropostaComercialPDF data={buildData()} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Proposta_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      a.click(); URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

  async function gerarPDFTecnico() {
    if (!s.dimensionamento) return;
    setGerando(true);
    try {
      const blob = await pdf(<PropostaPDF data={buildData()} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DocTecnica_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      a.click(); URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

  async function gerarMemorial() {
    if (!s.dimensionamento) return;
    setGerando(true);
    try {
      const { MemorialDescritivo } = await import('@domain/proposta/MemorialDescritivo');
      const d = buildData();
      const blob = await pdf(<MemorialDescritivo data={{...d, localizacao: s.localizacao, kit: s.kit}} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Memorial_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      a.click(); URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

  async function gerarProcuracao() {
    setGerando(true);
    try {
      const { Procuracao } = await import('@domain/proposta/Procuracao');
      const d = buildData();
      const blob = await pdf(<Procuracao data={{...d, localizacao: s.localizacao}} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Procuracao_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      a.click(); URL.revokeObjectURL(url);
    } finally { setGerando(false); }
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={onPDFCliente} disabled={gerando}>{gerando ? '⏳...' : '📄 Proposta Cliente'}</Btn>
              <Btn onClick={onPDFTecnico} disabled={gerando} variant="ghost">{gerando ? '⏳...' : '🔧 Doc. Técnica'}</Btn>
            </div>
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
        <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={onPDFCliente} disabled={gerando}>{gerando ? '⏳...' : '📄 Proposta Cliente'}</Btn>
              <Btn onClick={onPDFTecnico} disabled={gerando} variant="ghost">{gerando ? '⏳...' : '🔧 Doc. Técnica'}</Btn>
            </div>
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
