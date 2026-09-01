import React, { useState } from 'react';
import { useProjetoStore, PRESETS_MODULO, MESES, type TipoModuloPreset, clientePadrao, consumoPadrao, kitPadrao, precoPadrao, assinaturaEntradasCalculo } from './store/useProjetoStore';
import { salvarArquivo, importarArquivo, listarRecentes, removerRecente, carregarEmpresa, salvarEmpresa, gerarId, type MetadataProposta } from './services/persistence';
import { validarCliente, validarConsumo, validarKit, validarPreco, validarProjetoCompleto, validarCPF, validarCNPJ, formatarCPF, type StatusPasso } from './services/validation';
import { DISTRIBUIDORAS } from '@data/distribuidoras';
import { TIPO_TELHADO_LABELS, ORIENTACOES, type TipoTelhado, LOCALIZACAO_PADRAO } from '@data/localizacao';
import { HSP_MEDIO_POR_UF } from '@data/hspPorUF';
import { CHECKLIST_PADRAO_CEMIG_MICROGD, resumoChecklist, type ItemChecklistDocumentacao } from '@domain/documentacaoCemig/checklist';
import { cadastroEmpresaIncompleto, mensagemCadastroEmpresaIncompleto } from '@domain/empresa/cadastroEmpresa';
import { latLonParaUTM } from '@domain/geografia/converterCoordenadas';
import { parseNumeroBR } from '@domain/shared/parseNumeroBR';
import { calcularCaboCA } from '@domain/dimensionamento/calcularCaboCA';
import { calcularDPSCA, calcularProtecaoCC } from '@domain/dimensionamento/calcularProtecaoCC';
import { calcularFDI, type ResultadoFDI } from '@domain/dimensionamento/calcularFDI';
import { calcularBancoBaterias, type TipoBateria, type TipoSistema } from '@domain/dimensionamento/calcularBateria';
// Excel gerarExcel importado dinamicamente para não impactar o bundle inicial

// ─── Sistema de Design ───────────────────────────────────────────────────────
// Tema claro (trocado a pedido do usuário em 25/08/2026 — era dark antes).
// D.header permanece um tom escuro deliberado: é usado só em "chips" pequenos
// (texto sobre botão dourado, fundo do tooltip) — nunca como fundo de página —
// então continuar escuro ali é um padrão de UI comum (ex.: tooltip escuro sobre
// página clara), não uma sobra do tema antigo.
const D = {
  // Paleta Lumen Soluções — fundo claro + texto escuro + ouro
  // Ref: logo oficial (ChatGPT_Image_7_de_jul__de_2026__10_57_52.png)
  //
  // 60% — fundo claro (bege/creme quente, sem branco puro estéril)
  bg:         '#f2f0e8',
  // 30% — cards e painéis (branco, "elevado" em relação ao fundo)
  card:       '#ffffff',
  sidebar:    '#ffffff',
  header:     '#1a1a1a',
  // 10% — ouro Lumen (igual ao logo)
  gold:       '#c9a227',
  goldLight:  '#e8c547',
  goldMuted:  '#c9a22720',
  // Texto — escuro sobre fundo claro
  text:       '#1a1a1a',   // quase preto — legível, alto contraste no fundo claro
  textSub:    '#5c5a52',   // cinza médio quente
  textMuted:  '#8a8776',   // placeholders, hints
  // Bordas
  border:     '#e4e1d6',   // sutil, não distrai
  borderLight:'#ece9dd',
  // Semânticas
  success:    '#22c55e',
  danger:     '#ef4444',
  blue:       '#3b82f6',
  // Shadows — suaves no tema claro (não precisa do peso do dark)
  shadow: '0 1px 3px rgba(20,18,10,.05), 0 6px 18px rgba(20,18,10,.06)',
  shadowMd: '0 3px 12px rgba(20,18,10,.08)',
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

/* Input — fundo escuro (tema dark), texto branco limpo */
.inp {
  width: 100%; padding: 8px 10px;
  border: 1.5px solid ${D.border}; border-radius: 7px;
  font-size: 13px; color: ${D.text}; background: #f7f6f1;
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

// ─── Tooltip com detecção de borda ─────────────────────────────────────────
const Tip = ({ text }: { text: string }) => {
  const [vis, setVis]   = React.useState(false);
  const [dir, setDir]   = React.useState<'above'|'below'|'right'>('above');
  const wrapRef = React.useRef<HTMLSpanElement>(null);

  function detectarDirecao() {
    if (!wrapRef.current) { setVis(true); return; }
    const r = wrapRef.current.getBoundingClientRect();
    const TIP_H = 120; // altura estimada do tooltip
    const TIP_W = 270;
    // Se não tem espaço acima → mostrar abaixo
    if (r.top < TIP_H + 16) { setDir('below'); }
    // Se tooltip sairia pela direita → alinhar à direita do ícone
    else if (r.left + TIP_W / 2 > window.innerWidth - 20) { setDir('right'); }
    else { setDir('above'); }
    setVis(true);
  }

  const tipStyle: React.CSSProperties = {
    position: 'absolute',
    background: D.header, color: '#e0e0e0', borderRadius: 8, padding: '9px 13px',
    fontSize: 12, lineHeight: 1.55, width: 260, zIndex: 9999,
    boxShadow: '0 4px 24px rgba(0,0,0,.5)', whiteSpace: 'normal', pointerEvents: 'none',
    border: '1px solid #ddd9cb',
    ...(dir === 'above' ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
        dir === 'below' ? { top:    'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
                          { bottom: 'calc(100% + 8px)', right: 0,    transform: 'none' }),
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    border: '6px solid transparent',
    ...(dir === 'above' ? { top: '100%', borderTopColor: D.header } :
        dir === 'below' ? { bottom: '100%', borderBottomColor: D.header } :
                          { top: '100%', borderTopColor: D.header, left: '85%' }),
  };

  return (
    <span ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}
      onMouseEnter={detectarDirecao} onMouseLeave={() => setVis(false)}>
      <span style={{
        cursor: 'help', color: D.textMuted, fontSize: 10, fontWeight: 800,
        border: `1.5px solid ${D.border}`, borderRadius: '50%',
        width: 15, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, lineHeight: 1, userSelect: 'none',
      }}>?</span>
      {vis && (
        <div style={tipStyle}>
          {text}
          <div style={arrowStyle} />
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

// ─── Checklist de documentação CEMIG ────────────────────────────────────────
// Itens "gerado_automaticamente" (Formulário, Procuração, Memorial, DUB,
// Planta) se marcam sozinhos quando o botão correspondente gera o PDF —
// ver marcarDocumentoGerado nas funções gerarX(). Itens "anexo_manual"
// (ART, RG/CPF, INMETRO) são documentos de terceiro que o app não pode
// gerar (ver checklist.ts) — o usuário confirma manualmente aqui.
function ChecklistDocumentacaoCard({ checklist }: { checklist: ItemChecklistDocumentacao[] }) {
  // BUG CORRIGIDO (ago/2026): o card começava FECHADO, mostrando só um
  // contador ("3/8 — 37%") sem explicação nenhuma do que falta ou do que
  // aqueles números significam — a única pista de que dava pra clicar era um
  // "▼ ver detalhes" pequeno, fácil de perder no meio da tela (ainda mais
  // antes da reorganização dos 17 botões de ação, ver auditoria "Resultado —
  // layout"). Usuário relatou "checklist confuso, não sei o que acontece" —
  // mesma classe de problema já corrigida no painel FDI (dado escondido por
  // padrão em vez de explicado). Agora abre expandido por padrão.
  const [aberto, setAberto] = React.useState(true);
  const resumo = resumoChecklist(checklist);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
        onClick={() => setAberto(!aberto)}>
        <span>📋 Checklist de documentação CEMIG (MicroGD) — {resumo.concluidos}/{resumo.total} ({resumo.percentualCompleto}%)</span>
        <span style={{ fontSize:12, color:D.textMuted }}>{aberto ? '▲ ocultar' : '▼ ver detalhes'}</span>
      </div>
      <div style={{ height:6, background:D.borderLight, borderRadius:3, margin:'0 16px 12px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${resumo.percentualCompleto}%`, background: resumo.percentualCompleto===100 ? D.success : D.gold, borderRadius:3, transition:'width .3s' }} />
      </div>
      {aberto && (
        <div className="card-body" style={{ paddingTop:0 }}>
          {checklist.map((item) => {
            const concluido = item.tipo === 'gerado_automaticamente' ? !!item.geradoEm : !!item.anexado;
            return (
              <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:`1px solid ${D.borderLight}` }}>
                {item.tipo === 'anexo_manual' ? (
                  <input type="checkbox" checked={!!item.anexado} style={{ marginTop:3, cursor:'pointer' }}
                    onChange={(e) => useProjetoStore.getState().marcarDocumentoAnexado(item.id, e.target.checked)} />
                ) : (
                  <span style={{ fontSize:14, marginTop:1 }}>{concluido ? '✅' : '⬜'}</span>
                )}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:D.text, fontWeight:600 }}>
                    {item.label}
                    {item.tipo === 'anexo_manual' && <span style={{ fontSize:10, color:D.textMuted, fontWeight:400 }}> — anexo do usuário/terceiro, não gerado pelo app</span>}
                  </div>
                  <div style={{ fontSize:11, color:D.textMuted }}>
                    {item.normaBase}
                    {item.tipo === 'gerado_automaticamente' && item.geradoEm && ` — gerado em ${new Date(item.geradoEm).toLocaleString('pt-BR')}`}
                  </div>
                </div>
              </div>
            );
          })}
          <p style={{ fontSize:11, color:D.textMuted, marginTop:10, lineHeight:1.5 }}>
            ART, RG/CPF/comprovante e certificados INMETRO não são gerados pelo LumenSolar de propósito —
            são documentos de terceiro (o profissional responsável técnico e o cliente) ou exigem
            assinatura/responsabilidade que o software não pode assumir.
          </p>
        </div>
      )}
    </div>
  );
}

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
      <div style={{ padding: '0 20px 20px', borderBottom: `1px solid #e6e3d6` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logo
            ? <img src={logo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain' }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: D.header }}>L</div>
          }
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 13, letterSpacing: '.06em' }}>LUMEN</div>
            <div style={{ color: D.gold, fontWeight: 600, fontSize: 11, letterSpacing: '.04em' }}>SOLAR</div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <nav style={{ flex: 1, padding: '20px 0', position: 'relative' }}>
        {/* Linha de progresso vertical */}
        <div style={{
          position: 'absolute', left: 36, top: 28, width: 2,
          height: `calc(100% - 56px)`, background: '#e6e3d6',
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
                background: done ? D.gold : current ? D.gold : '#e6e3d6',
                border: current ? `none` : done ? 'none' : `2px solid #ddd9cb`,
                color: done || current ? D.header : '#c7c3b3',
                boxShadow: current ? `0 0 0 4px ${D.goldMuted}` : 'none',
                transition: 'all .2s',
                outline: stepStatus[step.id] === 'completo' && !done ? `2px solid #16a34a` : stepStatus[step.id] === 'parcial' ? `2px solid #eab308` : 'none',
              }}>
                {done ? '✓' : idx + 1}
              </div>
              <span style={{
                fontSize: 12, fontWeight: current ? 700 : 500,
                color: current ? '#1a1a1a' : done ? D.gold : '#666666',
                transition: 'color .15s',
              }}>{step.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Empresa button */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid #e6e3d6` }}>
        <button onClick={onEmpresa} style={{
          width: '100%', padding: '8px 12px', background: '#eeece2',
          border: `1px solid #ddd9cb`, borderRadius: 8, color: '#6f6d63',
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

// ─── Popup flutuante de copiar seleção ───────────────────────────────────────
// ADICIONADO (ago/2026): a pedido do usuário — "implemente o copiar e colar
// aparecendo assim que eu seleciono algum texto". "Colar" (Ctrl+V) já
// funciona nativamente em todo <input>/<textarea> do Chromium/Electron sem
// nenhum código adicional, e não existe um destino coerente para um botão de
// "colar" disparado por SELEÇÃO de texto (colar sempre acontece dentro de um
// campo de edição, nunca sobre um texto selecionado) — por isso esta feature
// cobre a parte que o gatilho "selecionei texto" realmente habilita: copiar.
// Só reage a seleções feitas com a Selection API do documento — texto
// selecionado DENTRO de <input>/<textarea> usa `selectionStart/End` (API
// diferente) e não aciona este popup; esses campos já têm Ctrl+C nativo e
// menu de contexto do Chromium, então nada de funcionalidade é perdido, é um
// recorte de escopo deliberado.
function copiarViaExecCommand(texto: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('document.execCommand("copy") retornou false'));
    } catch (e) {
      reject(e);
    }
  });
}

function copiarTextoClipboard(texto: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    // Fallback: alguns empacotamentos do Electron podem negar a permissão de
    // clipboard-write à navigator.clipboard — não custa ter um plano B.
    return navigator.clipboard.writeText(texto).catch(() => copiarViaExecCommand(texto));
  }
  return copiarViaExecCommand(texto);
}

const LARGURA_POPUP_COPIAR = 96;

// Extraída como função pura só para ser testável sem infra de teste de DOM
// (este projeto roda os testes em ambiente `node`, não `jsdom` — ver nota em
// `camposEmpresaParaPreencherAoImportar.test.ts`). Recebe um retângulo
// "achatado" (as 4 medidas que `getBoundingClientRect()` devolve) em vez do
// objeto DOMRect real, para não depender do DOM no teste.
export function calcularPosicaoPopupCopiar(
  rectSelecao: { top: number; left: number; width: number },
  larguraJanela: number,
  larguraPopup: number = LARGURA_POPUP_COPIAR
): { top: number; left: number } {
  const top = Math.max(8, rectSelecao.top - 38);
  const left = Math.min(
    Math.max(8, rectSelecao.left + rectSelecao.width / 2 - larguraPopup / 2),
    larguraJanela - larguraPopup - 8
  );
  return { top, left };
}

function SelectionCopyToolbar() {
  const [estado, setEstado] = useState<{ top: number; left: number; texto: string; copiado: boolean } | null>(null);

  React.useEffect(() => {
    function atualizarDaSelecao() {
      const sel = window.getSelection();
      const texto = sel ? sel.toString() : '';
      if (!sel || sel.isCollapsed || !texto.trim() || sel.rangeCount === 0) {
        setEstado(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setEstado(null); return; }
      const { top, left } = calcularPosicaoPopupCopiar(rect, window.innerWidth);
      setEstado({ top, left, texto, copiado: false });
    }
    function aoSoltarMouse() { requestAnimationFrame(atualizarDaSelecao); }
    function aoSoltarTecla(e: KeyboardEvent) {
      // Seleção via teclado: Shift+Setas, Shift+Home/End/PageUp/PageDown, Ctrl/Cmd+A
      if (e.shiftKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')) {
        requestAnimationFrame(atualizarDaSelecao);
      }
    }
    function aoTeclaEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setEstado(null);
    }
    function aoRolarOuRedimensionar() { setEstado(null); }
    // `scroll` não borbulha (bubble) — capture:true garante que a rolagem de
    // QUALQUER contêiner descendente (ex.: o <main> com overflow:auto) seja
    // detectada, não só a da janela.
    document.addEventListener('mouseup', aoSoltarMouse);
    document.addEventListener('keyup', aoSoltarTecla);
    document.addEventListener('keydown', aoTeclaEscape);
    document.addEventListener('scroll', aoRolarOuRedimensionar, true);
    window.addEventListener('resize', aoRolarOuRedimensionar);
    return () => {
      document.removeEventListener('mouseup', aoSoltarMouse);
      document.removeEventListener('keyup', aoSoltarTecla);
      document.removeEventListener('keydown', aoTeclaEscape);
      document.removeEventListener('scroll', aoRolarOuRedimensionar, true);
      window.removeEventListener('resize', aoRolarOuRedimensionar);
    };
  }, []);

  if (!estado) return null;

  return (
    <div
      style={{
        position: 'fixed', top: estado.top, left: estado.left, zIndex: 9999,
        // Impede que o próprio mousedown no popup colapse a seleção de texto
        // antes do clique no botão ser processado (truque padrão desse tipo
        // de toolbar flutuante).
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <button
        onClick={() => {
          copiarTextoClipboard(estado.texto)
            .then(() => {
              setEstado(prev => (prev ? { ...prev, copiado: true } : prev));
              setTimeout(() => setEstado(null), 900);
            })
            .catch(() => alert('Não foi possível copiar automaticamente. Use Ctrl+C.'));
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: D.header, color: '#fff', border: 'none', borderRadius: 6,
          padding: '6px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          boxShadow: D.shadowMd, whiteSpace: 'nowrap',
        }}
      >
        {estado.copiado ? '✓ Copiado' : '📋 Copiar'}
      </button>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<Aba>('home');
  const [showEmpresa, setShowEmpresa] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [nomeArquivoAtual, setNomeArquivoAtual] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Carregar empresa ao iniciar (carregarEmpresa é síncrona)
  React.useEffect(() => {
    try {
      const emp = carregarEmpresa();
      if (emp) useProjetoStore.getState().atualizarEmpresa(emp);
    } catch { /* ignora */ }
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
    // Limpa o store para uma nova proposta.
    // BUG CORRIGIDO (ago/2026): este reset usava um literal parcial próprio
    // (com `as any` escondendo do TypeScript os campos que faltavam) em vez
    // das fábricas de estado padrão da store — ver comentário de
    // `assinaturaEntradasCalculo`/`kitPadrao` em useProjetoStore.ts para o
    // histórico completo. Reusar as MESMAS fábricas usadas pelo estado
    // inicial da store garante que os dois nunca mais divergem, e permite
    // tipagem completa (sem `as any`).
    const empresaAtual = useProjetoStore.getState().empresa;
    useProjetoStore.setState({
      cliente: clientePadrao(),
      consumo: consumoPadrao(),
      // BUG CORRIGIDO (ago/2026): `localizacao` também não era resetada — a
      // nova proposta começava com telhado/UTM/nº de UC/medidor do CLIENTE
      // ANTERIOR ainda preenchidos. Coordenadas UTM erradas ou um número de
      // UC de outro cliente são o tipo de erro que só aparece quando o
      // Memorial Descritivo/Formulário CEMIG já foi protocolado.
      localizacao: LOCALIZACAO_PADRAO,
      kit: kitPadrao(),
      preco: precoPadrao(empresaAtual),
      dimensionamento: null, enquadramento: null, custosRecorrentes: null, precificacao: null, indicadores: null,
      // resultadoGrupoA também faltava no reset antigo — uma proposta Grupo A
      // seguida de "Nova Proposta" deixava o resultado do cliente ANTERIOR no
      // store até o primeiro cálculo da nova proposta.
      resultadoGrupoA: null,
      percentuaisFioBPorAno: {}, detalhamentoPerdas: [],
      ultimoCalculoAssinatura: null,
    });
    useProjetoStore.getState().resetarChecklistDocumentacao();
    const newId = gerarId();
    setProposalId(newId);
    setSaving('idle');
    setValidationErrors([]);
    setAba('cliente');
  }

  async function salvar() {
    const s = useProjetoStore.getState();
    const id = proposalId ?? gerarId();
    if (!proposalId) setProposalId(id);
    setSaving('saving');
    // Preservar criadoEm original via localStorage
    const criadoEmOriginal = localStorage.getItem('lumen:criado:' + id) || new Date().toISOString();
    localStorage.setItem('lumen:criado:' + id, criadoEmOriginal);
    const data = {
      id, nomeCliente: s.cliente.nome || 'Sem nome', cidade: s.cliente.cidade,
      uf: s.cliente.uf, criadoEm: criadoEmOriginal, atualizadoEm: new Date().toISOString(),
      potenciaKWp: s.dimensionamento?.potenciaInstaladaRealKWp, precoVenda: s.precificacao?.precoVenda,
      empresa: s.empresa, cliente: s.cliente, consumo: s.consumo, localizacao: s.localizacao, kit: s.kit, preco: s.preco,
      checklistDocumentacao: s.checklistDocumentacao,
    };
    const nomeArq = await salvarArquivo(data);
    setNomeArquivoAtual(nomeArq);
    // Salvar empresa também
    salvarEmpresa(s.empresa);
    setSaving('saved');
    setTimeout(() => setSaving('idle'), 2000);
  }

  function restaurarDados(data: any) {
    // BUG CORRIGIDO (ago/2026): auditoria encontrou a mesma classe de bug já
    // corrigida em `novaProposta()` (ver comentário lá), deixada sem correção
    // neste caminho irmão. `atualizarCliente`/`atualizarConsumo`/etc fazem
    // MERGE raso (`{...atual, ...p}`), não substituição — importar um
    // arquivo .lumensolar mais antigo (ou qualquer arquivo cujo JSON não
    // tenha uma chave que o estado atual já tem preenchida, inclusive por
    // `JSON.stringify` descartar chaves com valor `undefined`) deixava sobrar
    // dado do cliente ANTERIOR (UTM, histórico de tarifa, grupo de tensão,
    // nº de UC) misturado com os dados do cliente recém-importado.
    // `calculoDesatualizado()` não detecta isso — ele só compara "os dados
    // atuais batem com o que foi calculado", não "os dados atuais são uma
    // mistura de dois clientes diferentes". Corrigido reaproveitando as
    // MESMAS fábricas de estado padrão de `novaProposta()`: substituição
    // completa (fábrica + dados do arquivo por cima), nunca merge sobre o
    // que sobrou na store.
    //
    // `empresa` é tratado diferente de propósito: não é dado por-proposta, é
    // configuração da EMPRESA (⚙ Configurações), com fonte própria
    // (`carregarEmpresa()`/`salvarEmpresa()`, localStorage, carregada uma
    // vez no boot do app — ver App.tsx ~435). O snapshot de empresa
    // embutido no arquivo .lumensolar é só uma cópia de quando o arquivo foi
    // salvo — pode estar desatualizado ou (no caso real que motivou esta
    // correção) com Responsável Técnico/CREA/CNPJ ainda vazios, de antes do
    // usuário preencher Configurações. Sobrescrever a config atual (já
    // preenchida) com esse snapshot velho reintroduziria exatamente o bug de
    // "Procuração sai com nome do engenheiro em branco" corrigido nesta
    // mesma sessão, só que pelo caminho de importar um arquivo antigo em vez
    // de nunca ter preenchido. Por isso: o snapshot do arquivo só preenche
    // campos que a config atual não tem — nunca substitui um valor já
    // preenchido.
    const empresaAtual = useProjetoStore.getState().empresa;
    const empresaFaltante = camposEmpresaParaPreencherAoImportar(empresaAtual, data.empresa);

    useProjetoStore.setState({
      cliente: { ...clientePadrao(), ...(data.cliente || {}) },
      consumo: { ...consumoPadrao(), ...(data.consumo || {}) },
      localizacao: { ...LOCALIZACAO_PADRAO, ...(data.localizacao || {}) },
      kit: { ...kitPadrao(), ...(data.kit || {}) },
      preco: { ...precoPadrao(empresaAtual), ...(data.preco || {}) },
      empresa: Object.keys(empresaFaltante).length ? { ...empresaAtual, ...empresaFaltante } : empresaAtual,
      // Um arquivo .lumensolar salvo (ver `salvar()` acima) nunca inclui
      // dimensionamento/precificação/indicadores — só as entradas. Qualquer
      // valor calculado que sobrasse aqui seria do cliente ANTERIOR, e o
      // step "Resultado" da barra lateral mostraria "completo" para um
      // cliente que ainda não foi calculado nenhuma vez.
      dimensionamento: null, enquadramento: null, custosRecorrentes: null,
      precificacao: null, indicadores: null, resultadoGrupoA: null,
      percentuaisFioBPorAno: {}, detalhamentoPerdas: [],
      ultimoCalculoAssinatura: null,
      // Arquivos .lumensolar salvos antes desta funcionalidade não têm esse
      // campo — cair no padrão (nada gerado/anexado ainda) em vez de undefined.
      checklistDocumentacao: data.checklistDocumentacao ?? CHECKLIST_PADRAO_CEMIG_MICROGD,
    } as any);
    setProposalId(data.id || gerarId());
    setNomeArquivoAtual('');
    setValidationErrors([]);
    setStepStatus(calcStepStatus());
    setAba('cliente');
  }

  async function abrirImportado() {
    try {
      const data = await importarArquivo();
      if (!data) return;
      restaurarDados(data);
    } catch (e: any) {
      alert('Erro ao importar:\n\n' + String(e));
    }
  }

  // Recentes: o arquivo está no disco — usuário deve importar manualmente
  async function abrirProposta(_id: string) {
    await abrirImportado();
  }

  function tentarCalcular() {
    setStepStatus(calcStepStatus()); // atualizar dots antes de validar
    const { podeCalcular, erros } = validarProjetoCompleto(useProjetoStore.getState());
    if (!podeCalcular) {
      setValidationErrors(erros.map(e => e.mensagem));
      // Mostrar modal de erros em vez de barra que some
      const msgs = erros.map((e, i) => `${i+1}. ${e.mensagem}`).join('\n');
      alert('Preencha os campos obrigatórios antes de calcular:\n\n' + msgs);
      setTimeout(() => setValidationErrors([]), 8000);
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
          <div style={{ padding: '20px 24px', flex: 1 }}>
            {showEmpresa && <TabEmpresa onClose={() => { setShowEmpresa(false); salvarEmpresa(useProjetoStore.getState().empresa); }} />}
            {!showEmpresa && aba === 'home' && <TabHome onNovaProposta={novaProposta} onAbrirProposta={abrirProposta} onImportar={abrirImportado} />}
            {!showEmpresa && aba === 'cliente'   && <TabCliente   onNext={() => setAba('consumo')} />}
            {!showEmpresa && aba === 'consumo'   && <TabConsumo   onPrev={() => setAba('cliente')} onNext={() => setAba('local')} />}
            {!showEmpresa && aba === 'local'      && <TabLocal     onPrev={() => setAba('consumo')} onNext={() => setAba('kit')} />}
            {!showEmpresa && aba === 'kit'        && <TabKit       onPrev={() => setAba('local')} onNext={() => { useProjetoStore.getState().recalcularDefaultsPreco(); setAba('preco'); }} />}
            {!showEmpresa && aba === 'preco'      && <TabPreco     onPrev={() => setAba('kit')} onCalc={tentarCalcular} />}
            {!showEmpresa && aba === 'resultado'  && <TabResultado onPrev={() => setAba('preco')} onEmpresa={() => setShowEmpresa(true)} />}
          </div>
        </main>
      </div>
      <SelectionCopyToolbar />
    </>
  );
}

// ─── Tab Home ─────────────────────────────────────────────────────────────────
// BUG CORRIGIDO (ago/2026): não existia NENHUM jeito de importar um
// .lumensolar salvo em disco a não ser clicando num card de "proposta
// recente" já existente na lista (que só existe se os metadados ainda
// estiverem no localStorage desta máquina/navegador). Um arquivo salvo e
// levado para outra máquina, reaberto depois de limpar o navegador, ou
// recebido de outra pessoa (o próprio texto de persistence.ts descreve isso
// como recurso: "pode copiar, enviar por e-mail, Google Drive, múltiplas
// máquinas") não tinha como ser importado — a função `abrirImportado()` já
// existia e funcionava (seletor de arquivo + validação de checksum), só
// faltava um botão que a chamasse fora do fluxo de "recentes".
function TabHome({ onNovaProposta, onAbrirProposta, onImportar }: { onNovaProposta: ()=>void; onAbrirProposta: (id:string)=>void; onImportar: ()=>void }) {
  const [propostas, setPropostas] = React.useState<any[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [excluindo, setExcluindo] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const p = listarRecentes().map((meta:any) => ({
        ...meta,
        status: (localStorage.getItem('lumen:status:' + meta.id) || 'rascunho') as StatusProposta,
      }));
      setPropostas(p);
    } catch { /* ignora */ }
    setCarregando(false);
  }, []);

  function handleDuplicar(id: string) {
    const raw = localStorage.getItem('lumen:proposal:' + id);
    if (!raw) { alert('Proposta não encontrada no localStorage'); return; }
    try {
      const original = JSON.parse(raw);
      const novoId = gerarId();
      const copia = {
        ...original,
        id: novoId,
        nomeCliente: (original.nomeCliente || 'Proposta') + ' (cópia)',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        cliente: { ...original.cliente, nome: (original.cliente?.nome || '') + ' (cópia)' },
      };
      localStorage.setItem('lumen:proposal:' + novoId, JSON.stringify(copia));
      // Atualizar lista
      setPropostas(prev => [{
        id: novoId, nomeCliente: copia.nomeCliente, cidade: copia.cidade,
        uf: copia.uf, criadoEm: copia.criadoEm, atualizadoEm: copia.atualizadoEm,
        potenciaKWp: copia.potenciaKWp, precoVenda: copia.precoVenda, status:'rascunho'
      }, ...prev]);
    } catch(e) { alert('Erro ao duplicar: ' + e); }
  }

  async function handleExcluir(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Excluir esta proposta permanentemente?')) return;
    setExcluindo(id);
    removerRecente(id);
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
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:D.text }}>Propostas</h1>
          <p style={{ fontSize:13, color:D.textMuted, marginTop:4 }}>Gerencie seus projetos fotovoltaicos</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={onImportar} variant="ghost">📂 Importar arquivo</Btn>
          <Btn onClick={onNovaProposta}>+ Nova Proposta</Btn>
        </div>
      </div>

      {carregando && <p style={{ color:D.textMuted, textAlign:'center', padding:40 }}>Carregando...</p>}

      {!carregando && propostas.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', background:D.card, borderRadius:16, border:`2px dashed ${D.border}` }}>
          <div style={{ fontSize:48, marginBottom:16 }}>☀️</div>
          <h2 style={{ fontSize:18, fontWeight:700, color:D.text, marginBottom:8 }}>Nenhuma proposta ainda</h2>
          <p style={{ fontSize:14, color:D.textMuted, marginBottom:24 }}>Crie sua primeira proposta para um cliente ou importe um arquivo .lumensolar salvo anteriormente</p>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            <Btn onClick={onNovaProposta}>+ Nova Proposta</Btn>
            <Btn onClick={onImportar} variant="ghost">📂 Importar arquivo</Btn>
          </div>
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
    <div>
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
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
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
          <div style={{ marginTop:16 }}>
            <Campo label="Chave API Anthropic" hint="Para importar datasheets automaticamente — sk-ant-..." tip="Necessário para extrair dados de datasheets de módulos e inversores com IA. Obtenha em console.anthropic.com. Armazenada localmente no seu computador, nunca enviada a terceiros.">
              <input className="inp" type="password" value={(empresa as any).anthropicApiKey || ''} onChange={e => atualizarEmpresa({ anthropicApiKey: e.target.value } as any)} placeholder="sk-ant-api03-..." />
            </Campo>
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
                : <div style={{ width: 72, height: 52, background: '#f2f0e8', borderRadius: 6, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: D.gold }}>CAPA</div>
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
                : <div style={{ width: 72, height: 52, background: '#f2f0e8', borderRadius: 6, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: D.gold }}>BANNER</div>
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
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
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
    <div>
      <PageTitle title="Dados do cliente" sub="Informações que aparecem na capa da proposta." />
      <div className="card">
        <div className="card-body">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
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
            {/*
              CORRIGIDO (ago/2026): CPF/Endereço/Bairro/CEP nunca tinham input
              nenhum nesta aba, mesmo já existindo em DadosCliente (cpf) ou
              sendo lidos por gerarFormularioCemig.ts (bairro/cep, células
              obrigatórias E22/AS22 do Formulário CEMIG MicroGD) — as células
              saíam sempre em branco em qualquer formulário gerado pelo app,
              porque não havia onde o usuário preencher esses dados. Campos
              opcionais (não bloqueiam avançar) — só afetam o Formulário
              CEMIG e a Procuração, não o dimensionamento/proposta comercial.
            */}
            <Campo label="CPF" hint="Obrigatório para o Formulário CEMIG e a Procuração">
              <input className="inp" value={cliente.cpf} onChange={e => atualizarCliente({ cpf: formatarCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} />
            </Campo>
            <Campo label="Endereço (rua e número)">
              <input className="inp" value={cliente.endereco} onChange={e => atualizarCliente({ endereco: e.target.value })} placeholder="Ex: Rua Principal, 123" />
            </Campo>
            <Campo label="Bairro">
              <input className="inp" value={cliente.bairro} onChange={e => atualizarCliente({ bairro: e.target.value })} />
            </Campo>
            <Campo label="CEP">
              <input className="inp" value={cliente.cep} onChange={e => atualizarCliente({ cep: e.target.value })} placeholder="00000-000" maxLength={9} />
            </Campo>
            {/*
              CORRIGIDO (ago/2026): mesma classe de bug de bairro/CEP acima —
              RG/Profissão/Estado civil já existiam em DadosCliente e já eram
              lidos por Procuracao.tsx, mas sem nenhum input aqui. Resultado:
              a Procuração saía SEMPRE com "______________" no RG/profissão
              (nunca havia como preencher) e afirmava "solteiro(a)" pra todo
              cliente sem exceção (valor-padrão do store, nunca escolhido de
              fato). Ver comentário de `estadoCivil` em useProjetoStore.ts.
            */}
            <Campo label="RG" hint="Obrigatório para a Procuração">
              <input className="inp" value={cliente.rg} onChange={e => atualizarCliente({ rg: e.target.value })} placeholder="00.000.000-0" />
            </Campo>
            <Campo label="Profissão" hint="Obrigatório para a Procuração">
              <input className="inp" value={cliente.profissao} onChange={e => atualizarCliente({ profissao: e.target.value })} placeholder="Ex: Professora, Comerciante" />
            </Campo>
            <Campo label="Estado civil" hint="Obrigatório para a Procuração">
              <select className="inp" value={cliente.estadoCivil} onChange={e => atualizarCliente({ estadoCivil: e.target.value as typeof cliente.estadoCivil })}>
                <option value="">Selecione...</option>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
                <option value="outro">Outro / não informar</option>
              </select>
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
    <div>
      <PageTitle title="Consumo de energia" sub="Preencha com os dados das faturas do cliente dos últimos 12 meses." />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Distribuidora e tarifas</div>
        <div className="card-body">
          <div className="info-box info-box-blue" style={{ marginBottom: 14, fontSize: 12 }}>
            📄 <strong>Como preencher a partir da conta de energia:</strong><br/>
            <span style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
              • <strong>Distribuidora</strong> → logo no cabeçalho da conta (CEMIG, Equatorial, etc.)<br/>
              • <strong>Tipo de ligação</strong> → campo "Classe/Subclasse" — "Bifásico" ou "Trifásico" ou "Monofásico"<br/>
              • <strong>CIP/COSIP</strong> → linha "Contrib. Ilum. Pública Municipal" nos Valores Faturados<br/>
              • <strong>Tarifa real</strong> → coluna "Preço Unit." na linha "Energia Elétrica"<br/>
              • <strong>Nº da UC</strong> → "N.º DA UNIDADE CONSUMIDORA" (número grande em destaque)<br/>
              • <strong>Histórico</strong> → tabela "Histórico de Consumo" no canto inferior esquerdo
            </span>
          </div>
          {/* Toggle Grupo B / A */}
          <div style={{ marginBottom:12, display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#6f6d63', textTransform:'uppercase', letterSpacing:'.05em' }}>Grupo de tensão:</span>
            {(['B','A'] as const).map(g => (
              <button key={g} onClick={() => s.atualizarConsumo({ grupoTensao: g } as any)}
                style={{ padding:'4px 16px', borderRadius:20, fontSize:12, fontWeight:700,
                  cursor:'pointer', border:'1.5px solid',
                  background:(s.consumo as any).grupoTensao === g ? '#c9a22722' : 'transparent',
                  borderColor:(s.consumo as any).grupoTensao === g ? '#c9a227' : '#e4e1d6',
                  color:(s.consumo as any).grupoTensao === g ? '#c9a227' : '#6f6d63' }}>
                Grupo {g} — {g==='B' ? 'Baixa Tensão (residencial/comercial)' : 'Média Tensão (industrial)'}
              </button>
            ))}
          </div>

          {/* Grupo A — tarifas específicas P/FP e histórico separado */}
          {(s.consumo as any).grupoTensao === 'A' && (
            <div style={{ background:'#faf9f5', border:'1px solid #f59e0b44', borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginBottom:12, textTransform:'uppercase', letterSpacing:'.05em' }}>
                ⚡ Grupo A — Tarifas Média Tensão (P/FP)
              </div>
              <div className="g2" style={{ rowGap:12, marginBottom:14 }}>
                <Campo label="TE Ponta (R$/kWh)" tip="Tarifa de Energia no horário de Ponta (18h–21h). Usar SOMENTE a parcela TE, sem TUSD. Fator de compensação Fc = TE_P / TE_FP.">
                  <input className="inp inp-num" type="number" step="0.0001" value={(s.consumo as any).tePontaKWh || ''} onChange={e => s.atualizarConsumo({ tePontaKWh: Number(e.target.value) } as any)} placeholder="Ex: 0.5432" />
                </Campo>
                <Campo label="TE Fora Ponta (R$/kWh)" tip="Tarifa de Energia fora de ponta. Sistema FV gera principalmente neste período (horário solar).">
                  <input className="inp inp-num" type="number" step="0.0001" value={(s.consumo as any).teForaPontaKWh || ''} onChange={e => s.atualizarConsumo({ teForaPontaKWh: Number(e.target.value) } as any)} placeholder="Ex: 0.2345" />
                </Campo>
                <Campo label="TUSD Ponta (R$/kWh)" tip="Tarifa de Uso do Sistema de Distribuição — posto ponta.">
                  <input className="inp inp-num" type="number" step="0.0001" value={(s.consumo as any).tusdPontaKWh || ''} onChange={e => s.atualizarConsumo({ tusdPontaKWh: Number(e.target.value) } as any)} placeholder="Ex: 0.3210" />
                </Campo>
                <Campo label="TUSD Fora Ponta (R$/kWh)" tip="Tarifa de Uso do Sistema de Distribuição — posto fora ponta.">
                  <input className="inp inp-num" type="number" step="0.0001" value={(s.consumo as any).tusdForaPontaKWh || ''} onChange={e => s.atualizarConsumo({ tusdForaPontaKWh: Number(e.target.value) } as any)} placeholder="Ex: 0.1543" />
                </Campo>
                <Campo label="Tarifa Demanda (R$/kW)" tip="Tarifa da demanda contratada. Paga integralmente independente de uso. Solar raramente reduz demanda diretamente.">
                  <input className="inp inp-num" type="number" step="0.01" value={(s.consumo as any).tarifaDemandaKW || ''} onChange={e => s.atualizarConsumo({ tarifaDemandaKW: Number(e.target.value) } as any)} placeholder="Ex: 35.00" />
                </Campo>
                <Campo label="Demanda contratada (kW)" tip="Potência máxima contratada com a distribuidora.">
                  <input className="inp inp-num" type="number" step="1" value={(s.consumo as any).demandaContratadaKW || ''} onChange={e => s.atualizarConsumo({ demandaContratadaKW: Number(e.target.value) } as any)} placeholder="Ex: 100" />
                </Campo>
                {/* ADICIONADO (ago/2026): campo que faltava — `demandaMedidaFPkW` já
                    existia formalizado em EntradaConsumo e era passado para
                    calcularDimensionamentoGrupoA (useProjetoStore.ts calcularTudo()),
                    mas não havia NENHUM input na UI para preenchê-lo. Como o campo
                    tem default 0 e a store usa `consumo.demandaMedidaFPkW || undefined`,
                    ele SEMPRE chegava como `undefined`, e calcularCustoDemanda cai de
                    volta em `medida = demandaContratadaKW` — que nunca é maior que o
                    próprio limite tolerável (105% de si mesmo). Resultado:
                    `houveUltrapassagemDemanda` NUNCA poderia ser `true` na prática,
                    mesmo com a tolerância de 5% corrigida (e testada) nesta mesma
                    auditoria — a lógica estava certa, mas inatingível por falta deste
                    campo. */}
                <Campo label="Demanda medida (kW)" tip="Maior demanda registrada na fatura (kW). Opcional — deixe em branco se ainda não tiver a fatura em mãos. Usado para calcular ultrapassagem de demanda (tolerância de 5% sobre a contratada).">
                  <input className="inp inp-num" type="number" step="1" value={(s.consumo as any).demandaMedidaFPkW || ''} onChange={e => s.atualizarConsumo({ demandaMedidaFPkW: Number(e.target.value) } as any)} placeholder="Ex: 105" />
                </Campo>
              </div>
              {(s.consumo as any).tePontaKWh > 0 && (s.consumo as any).teForaPontaKWh > 0 && (
                <div style={{ padding:'8px 12px', background:'#1a2510', border:'1px solid #22c55e44', borderRadius:8, fontSize:12, color:'#86efac' }}>
                  Fc = TE_P/TE_FP = <strong>{((s.consumo as any).tePontaKWh/(s.consumo as any).teForaPontaKWh).toFixed(4)}</strong> — cada kWh gerado equivale a{' '}
                  <strong>{((s.consumo as any).tePontaKWh/(s.consumo as any).teForaPontaKWh).toFixed(2)} kWh</strong> de energia ponta compensada.
                  Geração necessária = Média_FP + {((s.consumo as any).tePontaKWh/(s.consumo as any).teForaPontaKWh).toFixed(2)} × Média_P
                </div>
              )}

              {/* Histórico de consumo Ponta/Fora Ponta — 12 meses.
                  ADICIONADO (ago/2026): antes não existia UI nenhuma para preencher
                  historicoFP/historicoP, então calcularDimensionamentoGrupoA nunca
                  tinha dados reais para trabalhar mesmo depois de conectado. */}
              <div style={{ marginTop:14, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#6f6d63', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
                  Histórico de consumo — Fora Ponta / Ponta (kWh, últimos 12 meses)
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {MESES.map((mes, i) => {
                    const histFP = s.consumo.historicoFP.length === 12 ? s.consumo.historicoFP : Array(12).fill(0);
                    const histP  = s.consumo.historicoP.length  === 12 ? s.consumo.historicoP  : Array(12).fill(0);
                    const setFP = (v: number) => { const n = [...histFP]; n[i] = v; s.atualizarConsumo({ historicoFP: n }); };
                    const setP  = (v: number) => { const n = [...histP];  n[i] = v; s.atualizarConsumo({ historicoP: n }); };
                    return (
                      <div key={mes} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        <span style={{ fontSize:10, color:'#8a8776' }}>{mes}</span>
                        <input className="inp inp-num" type="number" step="1" value={histFP[i] || ''} onChange={e => setFP(Number(e.target.value))} placeholder="FP" title="Consumo fora ponta (kWh)" style={{ fontSize:11, padding:'4px 6px' }} />
                        <input className="inp inp-num" type="number" step="1" value={histP[i] || ''} onChange={e => setP(Number(e.target.value))} placeholder="P" title="Consumo ponta (kWh)" style={{ fontSize:11, padding:'4px 6px' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resultado Grupo A — ADICIONADO (ago/2026): calcularDimensionamentoGrupoA
                  agora roda de verdade (useProjetoStore.calcularTudo), com os dados acima.
                  Ainda NÃO alimenta dimensionamento/custosRecorrentes/indicadores nem os
                  PDFs/Excel — ver aviso abaixo. */}
              {/* BUG CORRIGIDO (ago/2026): este painel mostrava s.resultadoGrupoA sem checar
                  se os dados de tarifa/demanda/histórico acima ainda batem com o último
                  cálculo — diferente de TabResultado, que já usa calculoDesatualizado() para
                  isso. Como o próprio aviso vermelho abaixo instrui o vendedor a copiar esses
                  números MANUALMENTE para a proposta do cliente de média tensão (fluxo que
                  não passa pelos guards de buildData()/gerarExcel()), um número desatualizado
                  aqui ia direto pro cliente sem nenhum aviso — o guard que protege os outros
                  documentos do app não cobria este painel. Corrigido reaproveitando
                  calculoDesatualizado(), mesmo padrão/botão já usado em TabResultado. */}
              {s.resultadoGrupoA && (
                <div style={{ background:'#0f1a0f', border:'1px solid #22c55e44', borderRadius:8, padding:12, marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#86efac', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
                    Cálculo Grupo A (preview)
                  </div>
                  {calculoDesatualizado(s) && (
                    <div style={{
                      marginBottom: 10, padding: '8px 12px', background: '#3a1414',
                      border: '1px solid #dc2626', borderRadius: 6, color: '#fca5a5',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                        ⚠️ <strong>Dados desatualizados</strong> — tarifa/demanda/histórico foram alterados
                        depois do último cálculo. Os números abaixo NÃO refletem os dados atuais.
                      </span>
                      <Btn onClick={() => { try { useProjetoStore.getState().calcularTudo(); } catch (e) { alert('Erro ao recalcular: ' + (e instanceof Error ? e.message : String(e))); } }}>
                        🔄 Recalcular agora
                      </Btn>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'6px 16px', fontSize:12, color:'#d1d5db' }}>
                    <div>Potência mínima: <strong>{s.resultadoGrupoA.potenciaMinKWp.toFixed(2)} kWp</strong></div>
                    <div>Potência real: <strong>{s.resultadoGrupoA.potenciaRealKWp.toFixed(2)} kWp</strong></div>
                    <div>Módulos: <strong>{s.resultadoGrupoA.numeroModulos}</strong></div>
                    <div>Conta antes: <strong>R$ {s.resultadoGrupoA.contaAntesRS.toFixed(2)}</strong></div>
                    <div>Conta depois: <strong>R$ {s.resultadoGrupoA.contaAposRS.toFixed(2)}</strong></div>
                    <div>Economia mensal: <strong style={{color:'#86efac'}}>R$ {s.resultadoGrupoA.economiaMensalRS.toFixed(2)}</strong></div>
                  </div>
                  {s.resultadoGrupoA.alertas.length > 0 && (
                    <div style={{ marginTop:8, fontSize:11, color:'#fbbf24' }}>
                      {s.resultadoGrupoA.alertas.map((a, i) => <div key={i}>⚠ {a}</div>)}
                    </div>
                  )}
                  {s.resultadoGrupoA.houveUltrapassagemDemanda && (
                    <div style={{ marginTop:6, fontSize:10, color:'#8a8776', fontStyle:'italic' }}>
                      Cobrança de ultrapassagem de demanda: fórmula não verificada contra a ND
                      da CEMIG/REN 1.000/2021 — confirme antes de repassar ao cliente (ver
                      comentário em calcularGrupoA.ts).
                    </div>
                  )}
                </div>
              )}

              {/* AVISO (ago/2026): o cálculo acima já é REAL (não é mais só o Fc estático) —
                  mas dimensionamento/custosRecorrentes/indicadores (o que alimenta os PDFs,
                  o Excel e o Formulário CEMIG) ainda são sempre calculados como Grupo B.
                  Conectar de fato exigiria redefinir o significado de vários campos
                  compartilhados (ex: "taxa de disponibilidade" não existe em Grupo A, que
                  cobra demanda contratada) em cada documento — feito com cuidado, não às
                  pressas, para não gerar documento com rótulo errado. */}
              <div style={{ padding:'10px 12px', background:'#3a1414', border:'1.5px solid #ef4444', borderRadius:8, fontSize:12, color:'#fca5a5', marginTop:8, fontWeight:600 }}>
                ⚠ ATENÇÃO — o cálculo acima é real, mas ainda NÃO alimenta os documentos.
                Dimensionamento, economia, payback e TIR da Proposta/Excel/Formulário CEMIG
                continuam sendo calculados como Grupo B (tarifa única, sem demanda contratada).
                NÃO gere proposta para cliente de média tensão a partir deste app — use os
                números deste painel manualmente até a integração com os documentos ser concluída.
              </div>
            </div>
          )}

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
              <div style={{ display:'flex', gap:8 }}>
                <input className="inp inp-num" type="number" step="0.00001" value={s.consumo.tarifaRealKWhComICMS || ''} onChange={e => s.atualizarConsumo({ tarifaRealKWhComICMS: Number(e.target.value) })} placeholder="Ex: 1.18272801" style={{ flex:1 }} />
                {/* BUG CORRIGIDO (ago/2026): link antigo 'aneel.gov.br/tarifas' — reportado
                    pelo usuário como falhando ao clicar. O domínio aneel.gov.br antigo foi
                    migrado para o portal unificado gov.br (a versão antiga agora vive em
                    'antigo.aneel.gov.br'); a página de tarifas atual e indexada é
                    gov.br/aneel/pt-br/assuntos/tarifas. */}
                <button onClick={() => window.open('https://www.gov.br/aneel/pt-br/assuntos/tarifas', '_blank')} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #ddd9cb', background:'#eeece2', color:'#6f6d63', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }} title="Consultar tarifas vigentes no portal ANEEL (gov.br)">⚡ ANEEL</button>
              </div>
            </Campo>
            <Campo label="CIP / Iluminação pública (R$/mês)" hint="Linha 'Contrib. Ilum. Pública Municipal'" tip="Contribuição municipal de iluminação pública. Na conta CEMIG aparece como 'Contrib. Ilum. Pública Municipal'. Persiste após instalação solar.">
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
        <div className="card-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Histórico de Consumo</span>
          {mediaKWh > 0 && <span className="badge badge-gold">Média: {fmtNum(mediaKWh, 0)} kWh/mês</span>}
        </div>
        <div className="card-body">
          <div className="info-box info-box-blue" style={{ marginBottom: 12, fontSize: 12 }}>
            📄 Digite os valores de <strong>kWh</strong> da tabela "Histórico de Consumo" da conta. Mês 1 = o mais recente, Mês 2 = o anterior, e assim por diante. Só o kWh importa.
          </div>
          {/* Tabela no estilo da conta CEMIG */}
          {/* Grade compacta de kWh — 3 colunas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {s.consumo.contas.map((conta, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, background:'#f7f6f0', borderRadius: 8, padding:'8px 12px', border:`1px solid ${conta.kWh > 0 ? D.gold+'33' : D.border}` }}>
                <span style={{ fontSize: 11, color: D.textMuted, minWidth: 42, fontWeight: 600 }}>Mês {i+1}</span>
                <input
                  className="inp inp-num"
                  type="number" min="0" step="1"
                  value={conta.kWh || ''}
                  onChange={e => s.atualizarConta(i, { kWh: Number(e.target.value) })}
                  placeholder="kWh"
                  autoFocus={i===0}
                  style={{ flex: 1, padding:'4px 8px', fontSize: 14, fontWeight: conta.kWh > 0 ? 700 : 400, textAlign:'right', color:'#2a2a3a', background:'transparent', border:'none', borderBottom:`1px solid ${D.border}`, borderRadius: 0, minWidth: 0, outline:'none' }}
                />
                {s.consumo.contas.length > 3 && (
                  <button onClick={() => s.removerConta(i)}
                    style={{ background:'none', border:'none', color:'#c7c3b3', cursor:'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                    title="Remover">×</button>
                )}
              </div>
            ))}
          </div>
          {/* Média */}
          {mediaKWh > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:`${D.gold}11`, border:`1px solid ${D.gold}33`, borderRadius: 8, padding:'10px 16px', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: D.textMuted, fontWeight: 700 }}>Média dos {s.consumo.contas.filter(c=>c.kWh>0).length} meses preenchidos</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: D.gold, fontVariantNumeric:'tabular-nums' }}>{fmtNum(mediaKWh, 0)} kWh/mês</span>
            </div>
          )}
          <button onClick={s.adicionarConta}
            style={{ background:'none', border:`1px dashed ${D.border}`, color: D.textMuted, borderRadius: 6, padding:'5px 14px', fontSize: 12, cursor:'pointer' }}>
            + Adicionar mês
          </button>
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

// ADICIONADO (ago/2026): traduz o resultado técnico de calcularFDI() (3
// critérios: potência/FDI, tensão/N_série, corrente/MPPT) para uma frase em
// linguagem simples. Antes, o painel de FDI (TabKit) só mostrava os 3
// critérios lado a lado com jargão técnico (FDI, N_série, MPPT) e um badge
// "APROVADO"/"AJUSTAR" sem explicar o que fazer — extraído como função pura
// para poder testar contra saídas reais de calcularFDI(), não fixtures
// inventadas do zero.
export function resumoFDI(r: Pick<ResultadoFDI, 'aprovado' | 'statusFDI' | 'criterio1Ok' | 'criterio2Ok' | 'criterio3Avaliado' | 'criterio3Ok'>): string {
  if (r.aprovado) return '✓ Este inversor está bem dimensionado para este conjunto de módulos — nenhum ajuste necessário.';
  const problemas: string[] = [];
  if (!r.criterio1Ok) problemas.push(
    r.statusFDI === 'baixo'
      ? 'o inversor está grande demais para os módulos (vai ficar ocioso)'
      : 'os módulos geram mais do que o inversor aguenta (risco de perda por clipping)'
  );
  if (!r.criterio2Ok) problemas.push('o número de módulos em série está fora da faixa de tensão que o inversor aceita');
  if (r.criterio3Avaliado && !r.criterio3Ok) problemas.push('há strings demais ligadas na mesma entrada MPPT para a corrente que ela suporta');
  return `✗ Ajuste necessário: ${problemas.join('; ')}.`;
}

// ADICIONADO (ago/2026): decide quais campos do snapshot de `empresa` embutido
// num arquivo .lumensolar importado devem preencher a config ATUAL da
// empresa (⚙ Configurações) — ver comentário completo em `restaurarDados()`,
// App.tsx. Regra: o arquivo só PREENCHE lacunas (campo vazio/ausente na
// config atual); nunca SOBRESCREVE um valor já preenchido. Extraída como
// função pura exportada para ser testável — mesmo padrão de
// utmValorPlausivel/resumoFDI, já que este projeto não tem infraestrutura de
// teste de componente/interação de UI.
export function camposEmpresaParaPreencherAoImportar(
  empresaAtual: Record<string, any> | undefined | null,
  empresaArquivo: Record<string, any> | undefined | null
): Record<string, any> {
  const atual = empresaAtual || {};
  const arquivo = empresaArquivo || {};
  const faltantes: Record<string, any> = {};
  for (const chave of Object.keys(arquivo)) {
    const valorAtual = atual[chave];
    const valorArquivo = arquivo[chave];
    if ((valorAtual === undefined || valorAtual === null || valorAtual === '') && valorArquivo) {
      faltantes[chave] = valorArquivo;
    }
  }
  return faltantes;
}

// ADICIONADO (ago/2026): checagem de plausibilidade para os campos UTM E/N
// digitados manualmente (ver comentário em BuscadorCoordenadas acima do uso).
// UTM E (Easting) válido numa zona fica entre ~100.000 e ~900.000; UTM N
// (Northing) no hemisfério sul (Brasil) fica entre ~7.000.000 e ~9.999.000.
// Latitude/longitude decimais nunca passam de 180 em módulo — por isso um
// limiar de 1.000 já separa com folga um valor de coordenada geográfica
// colado por engano num campo UTM, sem falso positivo em nenhum caso real.
export function utmValorPlausivel(v: string): boolean {
  const s = String(v).trim();
  if (s === '') return true; // campo vazio — não acusa erro aqui
  // BUG CORRIGIDO (ago/2026): usava `Number(s.replace(',','.'))`, que retorna
  // NaN para um valor colado do Google Maps (sinal de menos Unicode −,
  // U+2212 — não o hífen-menos ASCII que Number() reconhece) — e todo NaN
  // aqui era tratado como "campo em edição", suprimindo o aviso. Resultado:
  // o aviso NUNCA aparecia justamente no caso que o motivou (lat/long colada
  // do Google Maps num campo UTM — ver parseNumeroBR.ts para o caso real e a
  // verificação). `parseNumeroBR` normaliza esse sinal antes de converter.
  const n = parseNumeroBR(s);
  if (!Number.isFinite(n)) return true; // valor não numérico/em edição (ex: "-", ".") — não acusa erro aqui
  return Math.abs(n) >= 1000;
}

// ─── Tab Local ───────────────────────────────────────────────────────────────
function TabLocal({ onPrev, onNext }: { onPrev:()=>void; onNext:()=>void }) {
  const s = useProjetoStore();
  const loc = s.localizacao;
  const upd = s.atualizarLocalizacao;
  return (
    <div>
      <PageTitle title="Local de instalação" sub="Dados do telhado e coordenadas — necessários para o Memorial Descritivo (CEMIG/distribuidora)." />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">Telhado</div>
        <div className="card-body">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
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
            💡 Coordenadas UTM são necessárias para o Memorial Descritivo. Use o botão abaixo para converter automaticamente (endereço → UTM). Preencha manualmente só se o endereço não for encontrado — não cole latitude/longitude direto nos campos UTM, são grandezas diferentes.
          </div>
          {/* BUG CORRIGIDO (ago/2026): este botão calcula UTM real (via geocodificação +
              latLonParaUTM, mesma função testada em @domain/geografia/converterCoordenadas)
              mas nunca era renderizado em lugar nenhum da UI — só existia como componente
              morto (BuscadorCoordenadas, definido mais abaixo neste arquivo). O único caminho
              que o usuário tinha era digitar manualmente nos campos abaixo, sem validação
              nenhuma — foi assim que uma lat/long do Google Maps (-18,63.../-48,20...) foi
              parar direto nos campos utmE/utmN de um caso real, e saiu impressa no Memorial
              Descritivo como se fosse UTM (ver auditoria "geração de documentos", item 1). */}
          <BuscadorCoordenadas
            endereco={loc.enderecoInstalacao || s.cliente.endereco || ''}
            cidade={s.cliente.cidade || ''}
            uf={s.cliente.uf || ''}
            onEncontrado={(utmE, utmN, fuso) => upd({ utmE: utmE.toFixed(2), utmN: utmN.toFixed(2), utmFuso: fuso })}
          />
          <div className="g2" style={{ rowGap: 14 }}>
            <Campo label="UTM E — Abscissa" hint="Ex: 795209" tip="Coordenada UTM Leste (Easting). Preenchida automaticamente pelo botão acima; se digitar manualmente, é o resultado da conversão lat/long → UTM, não a longitude em si.">
              <input className="inp" value={loc.utmE} onChange={e => upd({ utmE: e.target.value })} placeholder="Ex: 795209" />
              {loc.utmE && !utmValorPlausivel(loc.utmE) && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  ⚠ Este valor parece ser uma latitude/longitude, não uma coordenada UTM (que tem 6-7 dígitos, ex: 795209). Use o botão "Buscar coordenadas UTM" acima.
                </div>
              )}
            </Campo>
            <Campo label="UTM N — Ordenada" hint="Ex: 7933873" tip="Coordenada UTM Norte (Northing). Preenchida automaticamente pelo botão acima.">
              <input className="inp" value={loc.utmN} onChange={e => upd({ utmN: e.target.value })} placeholder="Ex: 7933873" />
              {loc.utmN && !utmValorPlausivel(loc.utmN) && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  ⚠ Este valor parece ser uma latitude/longitude, não uma coordenada UTM (que tem 6-7 dígitos, ex: 7933873). Use o botão "Buscar coordenadas UTM" acima.
                </div>
              )}
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

// ─── Estratégia de dimensionamento ──────────────────────────────────────────
const ESTRATEGIAS = [
  { label: '100%', perc: 1.00, cor: '#16a34a', desc: 'Consumo exato',    tip: 'Compensa exatamente o consumo atual. Recomendado quando o consumo é estável e não há planos de crescimento.' },
  { label: '110%', perc: 1.10, cor: '#2563eb', desc: 'Reserva pequena',  tip: 'Cobre sazonalidade e pequenas variações. Ideal para consumo estável com margem de segurança.' },
  { label: '120%', perc: 1.20, cor: '#7c3aed', desc: 'Reserva moderada', tip: 'Para crescimento de até 20%: novos aparelhos, uso maior no verão, pequena expansão.' },
  { label: '130%', perc: 1.30, cor: '#b45309', desc: 'Reserva segura',   tip: 'Crescimento previsto de consumo: novo ar-condicionado, expansão da residência.' },
  { label: '150%', perc: 1.50, cor: '#b91c1c', desc: 'Reserva grande',   tip: 'Carga futura relevante: veículo elétrico, chuveiro solar, expansão comercial.' },
] as const;

const MOTIVOS_PRESET = [
  { label: '— Selecione o motivo —',                   val: '' },
  { label: 'Compensação do consumo atual (100%)',        val: 'Sistema dimensionado para compensar 100% do consumo médio atual.' },
  { label: 'Reserva para crescimento do consumo',        val: 'Reserva dimensionada para crescimento previsto do consumo (novos equipamentos, expansão).' },
  { label: 'Reserva para novo ar-condicionado',          val: 'Reserva dimensionada prevendo instalação de sistema de ar-condicionado.' },
  { label: 'Reserva para veículo elétrico',              val: 'Reserva dimensionada para futura instalação de carregador de veículo elétrico (EVSE).' },
  { label: 'Créditos para meses de menor irradiação',   val: 'Geração excedente nos meses mais ensolarados para compensar meses com menor irradiação.' },
  { label: 'Múltiplas unidades consumidoras (SCEE)',     val: 'Sistema dimensionado para compartilhar geração entre múltiplas unidades consumidoras.' },
  { label: 'Crescimento do negócio previsto',            val: 'Reserva dimensionada para crescimento previsto da operação comercial.' },
];

function StrategiaKwp({ mediaKWh, uf, s }: { mediaKWh: number; uf: string; s: any }) {
  const hsp = (HSP_MEDIO_POR_UF as Record<string,number>)[uf] ?? 5.0;
  const perdasPadrao = 0.20;
  const perc = s.kit.percentualCompensacaoDesejado ?? 1.0;
  const kWpMinimo = mediaKWh / (hsp * 30.4167 * (1 - perdasPadrao));
  const kWpAlvo   = kWpMinimo * perc;

  const estratAtiva = ESTRATEGIAS.find(e => Math.abs(e.perc - perc) < 0.01);
  const isLivre = !estratAtiva;

  const sugestoes = [400, 500, 550, 595, 620, 670, 700].map(wp => {
    const mod = Math.ceil(kWpAlvo / (wp / 1000));
    return { wp, mod, pot: mod * wp / 1000, pct: Math.round(mod * wp / 1000 / kWpMinimo * 100) };
  }).filter(sg => sg.mod >= 1 && sg.mod <= 40);

  return (
    <div style={{ background: D.header, border: `1px solid #ddd9cb`, borderRadius: 14, padding: '18px 22px', marginBottom: 18 }}>

      {/* Linha de potência mínima */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: '#6f6d63', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Dimensionamento mínimo</span>
        <span style={{ color: D.gold, fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(kWpMinimo, 2)} kWp</span>
        <span style={{ color: '#666666', fontSize: 12 }}>para {fmtNum(mediaKWh,0)} kWh/mês em {uf}</span>
        {/* CORRIGIDO (ago/2026): rotulava esta fórmula de dimensionamento básico (kWp =
            consumo / (HSP × dias × eficiência)) como "Fórmula IEC 61724-1" — essa norma
            trata de monitoramento de desempenho de sistemas FV, não define fórmula de
            dimensionamento nenhuma. Citação removida; a fórmula em si não muda. */}
        <Tip text={`${fmtNum(mediaKWh,0)} kWh ÷ (${fmtNum(hsp,1)} h/dia × 30,42 dias × 80% eficiência) = ${fmtNum(kWpMinimo,2)} kWp`} />
      </div>

      {/* Seletor de estratégia */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#666666', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Estratégia — quanto gerar acima do consumo?
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
          {ESTRATEGIAS.map(e => {
            const ativa = Math.abs(e.perc - perc) < 0.01;
            return (
              <button key={e.label}
                onClick={() => s.atualizarKit({ percentualCompensacaoDesejado: e.perc })}
                title={e.tip}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
                  fontSize: 13, lineHeight: 1, transition: 'all .15s',
                  background: ativa ? e.cor : '#eeece2',
                  color: ativa ? '#fff' : '#666666',
                  outline: ativa ? `2px solid ${e.cor}66` : 'none',
                }}
              >
                {e.label}
                <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: .85 }}>{e.desc}</div>
              </button>
            );
          })}
          <button
            onClick={() => s.atualizarKit({ percentualCompensacaoDesejado: isLivre ? perc : 1.40 })}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: 13, lineHeight: 1, transition: 'all .15s',
              background: isLivre ? D.gold : '#eeece2', color: isLivre ? D.header : '#666666',
            }}
          >
            Livre
            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>Personalizado</div>
          </button>
        </div>

        {isLivre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#6f6d63' }}>Percentual:</span>
            <input className="inp inp-num" type="number" step="5" min="100" max="300"
              value={Math.round(perc * 100)}
              onChange={e => s.atualizarKit({ percentualCompensacaoDesejado: Number(e.target.value) / 100 })}
              style={{ width: 80, padding: '4px 8px' }}
            />
            <span style={{ fontSize: 12, color: '#6f6d63' }}>% do consumo atual</span>
          </div>
        )}

        {/* Indicador do alvo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f2f0e6', borderRadius: 8, marginTop: 10 }}>
          <div>
            <span style={{ fontSize: 10, color: '#666666', display: 'block', marginBottom: 2 }}>Alvo com essa estratégia</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: estratAtiva?.cor ?? '#5b6478', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(kWpAlvo, 2)} kWp</span>
          </div>
          {perc > 1.005 && (
            <div style={{ borderLeft: `1px solid #ddd9cb`, paddingLeft: 12 }}>
              <span style={{ fontSize: 10, color: '#666666', display: 'block', marginBottom: 2 }}>Reserva de energia</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#5b6478' }}>+{fmtNum((perc-1)*100,0)}% → {fmtNum(mediaKWh*(perc-1),0)} kWh/mês extras</span>
            </div>
          )}
        </div>
      </div>

      {/* Motivo */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: '#666666', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Motivo (aparece na proposta)
        </div>
        <select
          style={{ width: '100%', padding: '7px 10px', background: '#eeece2', border: `1px solid #ddd9cb`, borderRadius: 7, color: '#33323a', fontSize: 12 }}
          value={s.kit.motivoSuperdimensionamento}
          onChange={e => s.atualizarKit({ motivoSuperdimensionamento: e.target.value })}
        >
          {MOTIVOS_PRESET.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      {/* Sugestões de kit */}
      <div style={{ fontSize: 10, color: '#666666', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 7 }}>
        Sugestões de kit — clique para preencher
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {sugestoes.map(sg => (
          <div key={sg.wp}
            onClick={() => s.atualizarKit({ potenciaModuloWp: sg.wp, quantidade: sg.mod })}
            style={{ background: '#f2f0e6', border: `1px solid ${sg.pct >= Math.round(perc*100)-5 && sg.pct <= Math.round(perc*100)+10 ? D.gold+'44' : '#e6e3d6'}`, borderRadius: 9, padding: '9px 13px', cursor: 'pointer', minWidth: 95, transition: 'border-color .15s' }}
          >
            <div style={{ fontSize: 10, color: '#666666', marginBottom: 2 }}>{sg.wp} Wp/módulo</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#2a2a33', fontVariantNumeric: 'tabular-nums' }}>{sg.mod} mod.</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.gold }}>{fmtNum(sg.pot, 2)} kWp</div>
            <div style={{ fontSize: 10, color: sg.pct >= 100 ? '#16a34a' : '#ef4444' }}>
              {sg.pct}% do consumo
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componentes Recomendados (NBR 5410) ─────────────────────────────────────
/**
 * Dimensionamento automático de componentes elétricos.
 * Referências: NBR 5410:2004 (instalações CA) + ABNT NBR 16690 (CC fotovoltaico)
 */
function ComponentesRecomendados({ kit, tipoLigacao }: { kit: any; tipoLigacao?: 'monofasica'|'bifasica'|'trifasica' }) {
  // ── Lado CA ──────────────────────────────────────────────────────────────
  const potCA_kW = kit.potenciaInversorKW || 0;
  const tensaoCA = kit.tensaoSaidaV || 220;
  const fp = parseFloat((kit.fatorPotencia || '>0.99').replace('>','')) || 0.99;
  const nInv = kit.numMppt || 1; // número de inversores (aproximação pelo MPPT)

  // Corrente nominal CA = P / (V × FP)
  const icaNominal = potCA_kW > 0 ? (potCA_kW * 1000) / (tensaoCA * fp) : 0;
  // Corrente de projeto CA (NBR 5410: fator 1.25 para carga contínua)
  const icaProjeto = icaNominal * 1.25;

  // Seções de cabo e capacidades de corrente em eletroduto, cabos 70°C, instalação B2
  // (Tabela 36 da NBR 5410 — condutores em eletroduto embutido em parede)
  // Cabo CA com correção de temperatura (NBR 5410 + curso slide 48-58)
  // BUG CORRIGIDO (ago/2026): as três funções abaixo eram carregadas com
  // require('@domain/...') dentro do componente. Isso funciona em dev (Vite
  // resolve o alias @domain), mas no .exe empacotado o `require` vira uma
  // chamada real do Node em runtime — que não conhece o alias @domain/@data
  // (é só uma configuração do bundler) — e quebra com "Cannot find module" ao
  // abrir a aba Kit. Corrigido usando import estático no topo do arquivo, como
  // o resto do App.tsx já faz.
  const caboCAResult = (() => {
    try {
      return calcularCaboCA({
        // BUG CORRIGIDO (ago/2026): passava `kit.corrMaxSaidaA` (corrente NOMINAL
        // do datasheet, sem o fator 1,25) direto como Ib — o `|| icaProjeto/1.25`
        // só entrava se corrMaxSaidaA fosse 0, e mesmo aí dividia icaProjeto por
        // 1.25 de volta, cancelando o fator. Nos dois caminhos, o fator de carga
        // contínua da NBR 16690 §5.4 (citado nos rótulos da UI logo abaixo, ex.:
        // "Ib = In × 1.25") nunca chegava em calcularCaboCA — a seleção de
        // cabo/disjuntor sempre rodava com a corrente nominal, não a de projeto.
        // Agora: aplica ×1.25 sobre o valor real do datasheet quando informado
        // (mais confiável que o nominal derivado de P/V/FP), com fallback para
        // icaProjeto (que já embute o ×1.25) quando o campo não foi preenchido.
        corrMaxSaidaA: kit.corrMaxSaidaA > 0 ? kit.corrMaxSaidaA * 1.25 : icaProjeto,
        tensaoSaidaV: kit.tensaoSaidaV || 220,
        // BUG CORRIGIDO (ago/2026): tipoLigacao estava hardcoded em 'bifasica',
        // ignorando o valor real escolhido pelo cliente (s.consumo.tipoLigacao).
        // Para trifásico, α=1,73 em vez de 2 — o hardcode superestimava a queda de
        // tensão CA em ~15,6% para todo sistema trifásico.
        tipoLigacao: tipoLigacao || 'bifasica',
        temperaturaAmbienteC: kit.temperaturaInstalacaoC || 40,
        comprimentoCaboCAm: kit.comprimentoCaboCAm || 10,
      });
    } catch { return null; }
  })();
  const secaoCA = caboCAResult?.secaoMm2 ?? 2.5;
  const disjCA  = caboCAResult?.disjuntorA ?? 25;
  const quedaCA = caboCAResult?.quedaTensaoPct ?? 0;

  // DPS CA + proteção CC — extraído para @domain/dimensionamento/calcularProtecaoCC
  // (mesma fórmula que já rodava aqui, agora testada — ver calcularProtecaoCC.test.ts).
  // O Diagrama Unifilar Básico (DUB) usa a mesma função, então os valores
  // exibidos aqui e no DUB nunca podem divergir.
  const { classeKA: dpskA, descricao: dpsDesc } = calcularDPSCA(potCA_kW);

  // ── Lado CC (string) ──────────────────────────────────────────────────────
  const isc = kit.iscA || 0;
  const nStrings = kit.numStrings || 1;
  const tempTelhado = kit.temperaturaInstalacaoC || 40; // reutiliza campo do cabo CA
  const vocMod = kit.vocV || 0;
  const nModStr = kit.modulosPorString || 1;
  // O datasheet do kit hoje só guarda o coeficiente de temperatura de Pmax
  // (PRESETS_MODULO — usado em calcularPerdas), não um coeficiente de Voc
  // dedicado. calcularProtecaoCC usa o de Pmax como aproximação: na prática
  // |β_Voc| é menor que |γ_Pmax|, então isso SUPERESTIMA a alta de Voc no
  // frio — conservador (nunca subestima o risco de passar de 1000V), mas
  // não é o coeficiente real do módulo. Para precisão, adicionar um campo
  // coefTempVocPercent dedicado ao datasheet do kit.
  const coefVoc = PRESETS_MODULO[kit.tipoModulo]?.coef ?? -0.34;
  const LIMITE_VDC = 1000; // NBR 16690:2019 5.3.3 — tensão CC máxima admissível

  const protecaoCC = calcularProtecaoCC({
    iscA: isc, vocV: vocMod, numStrings: nStrings, modulosPorString: nModStr,
    coeficienteTemperaturaPercentPorC: coefVoc, temperaturaInstalacaoC: tempTelhado,
  });
  const iccProjeto = protecaoCC.correnteProjetoA;
  const ftaCC = protecaoCC.fta;
  const iccProjetoComFTA = protecaoCC.correnteProjetoComFtaA;
  const cableCC = { secao: protecaoCC.secaoCaboMm2, imax: protecaoCC.izCaboA };
  const izCorrCC = protecaoCC.izCorrigidaA;
  const dpsCC_kA = protecaoCC.dpsClasseKA;
  const vocSistema = protecaoCC.vocSistemaV;
  const vocMax = protecaoCC.vocMaximoFrioV;
  const fuseIdeal = protecaoCC.fusivelStringA;

  const naoPreenchido = potCA_kW === 0;

  const Tag = ({ cor, children }: { cor: string; children: React.ReactNode }) => (
    <span style={{ background: cor+'22', color: cor, border: `1px solid ${cor}44`, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );

  const [linhaHover, setLinhaHover] = React.useState<string|null>(null);
  const Linha = ({ label, valor, sub, destaque, norma, slide, formula }:
    { label:string; valor:string; sub?:string; destaque?:string; norma?:string; slide?:string; formula?:string }) => {
    const id = label;
    const temRastreio = !!(norma || slide || formula);
    return (
      <div style={{ borderBottom:`1px solid #e6e3d8` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ fontSize:13, color:'#3a3a3a', fontWeight:600 }}>{label}</div>
              {temRastreio && (
                <button onClick={() => setLinhaHover(linhaHover===id?null:id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color: linhaHover===id ? '#c9a227' : '#444444',
                    fontSize:11, padding:'0 2px', lineHeight:1, transition:'color .15s' }}
                  title="Ver norma e fórmula">📐</button>
              )}
            </div>
            {sub && <div style={{ fontSize:11, color:'#555555', marginTop:2 }}>{sub}</div>}
          </div>
          <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#1a1a1a', fontVariantNumeric:'tabular-nums' }}>{valor}</div>
            {destaque && <Tag cor="#c9a227">{destaque}</Tag>}
          </div>
        </div>
        {linhaHover===id && temRastreio && (
          <div style={{ background:'#f7f6f1', border:'1px solid #c9a22744', borderRadius:8, padding:'10px 14px', marginBottom:8, fontSize:11 }}>
            {norma  && <div style={{ color:'#15803d', marginBottom:4 }}>📋 <strong>Norma:</strong> {norma}</div>}
            {slide  && <div style={{ color:'#1e40af', marginBottom:4 }}>📖 <strong>Referência:</strong> {slide}</div>}
            {formula && <div style={{ color:'#7a5c00', fontFamily:'monospace', background:'#f5f3ea', padding:'4px 8px', borderRadius:4 }}>∑ {formula}</div>}
          </div>
        )}
      </div>
    );
  };

  if (naoPreenchido) {
    return (
      <div style={{ background:'#f5f4ea', border:`1px dashed #ddd9cb`, borderRadius:12, padding:'20px 24px', marginBottom:18, textAlign:'center' }}>
        <div style={{ fontSize:14, color:'#444444' }}>⚡ Preencha a potência do inversor para ver os componentes recomendados</div>
      </div>
    );
  }

  return (
    <div style={{ background:'#f5f4ea', border:`1px solid #e2dfd0`, borderRadius:14, padding:'18px 24px', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <span style={{ fontSize:16 }}>⚡</span>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'#1a1a1a' }}>Componentes Recomendados — NBR 5410 / NBR 16690</div>
          <div style={{ fontSize:11, color:'#555555' }}>Calculado automaticamente para {potCA_kW} kW CA / {tensaoCA} V</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* Lado CA */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#c9a227', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>
            ▸ Lado CA (inversor → quadro)
          </div>
          <Linha
            label="Corrente nominal CA"
            valor={`${icaNominal.toFixed(1)} A`}
            sub={`P/(V×FP) = ${potCA_kW}kW / (${tensaoCA}V × ${fp})`}
            norma="NBR 5410:2004 — item 6.3.1 (circuitos terminais)"
            slide="Curso slide 48 — Caixa de proteção CA"
            formula={`In = P / (V × FP) = ${(potCA_kW*1000).toFixed(0)}W / (${tensaoCA}V × ${fp}) = ${icaNominal.toFixed(1)}A`}
          />
          <Linha
            label="Corrente de projeto (×1,25)"
            valor={`${icaProjeto.toFixed(1)} A`}
            sub="NBR 5410 — carga contínua"
            norma="NBR 5410:2004 — Tabela 1 (fator 1.25 para carga contínua > 3h)"
            slide="Curso slide 50 — Ib = corrente de projeto"
            formula={`Ib = In × 1.25 = ${icaNominal.toFixed(1)}A × 1.25 = ${icaProjeto.toFixed(1)}A`}
          />
          <Linha
            label="Cabo CA (fase, neutro, PE)"
            valor={`${secaoCA} mm²`}
            sub={caboCAResult ? `Iz'=${caboCAResult.izCorrigidaA}A (FTA=${caboCAResult.fta}@${caboCAResult.temperaturaAmbienteC}°C) | ΔU=${caboCAResult.quedaTensaoPct.toFixed(2)}% ${caboCAResult.quedaTensaoOk?'✓':'⚠️'}` : `Ib=${icaProjeto.toFixed(1)}A`}
            destaque="3 condutores (NBR 5410)"
            norma="NBR 5410:2004 — Tabela 36, Método C (cobre, PVC 70°C) + Tabela 40 (FTA temperatura)"
            slide="Curso slides 48–58 — algoritmo: 1) Iz_req=Ib/FTA 2) cabo onde Iz≥Iz_req 3) Ib≤In≤Iz'"
            formula={caboCAResult ? `Iz'=${caboCAResult.izCaboA}A × FTA(${caboCAResult.temperaturaAmbienteC}°C)=${caboCAResult.fta} = ${caboCAResult.izCorrigidaA}A | ΔU=α×ρ×Ib×L/(U×S)=${caboCAResult.quedaTensaoPct.toFixed(2)}%` : `Iz_req = ${icaProjeto.toFixed(1)}A / FTA`}
          />
          <Linha
            label="Disjuntor bipolar CA"
            valor={`${disjCA} A`}
            sub={caboCAResult ? `Faixa válida: ${caboCAResult.ibA.toFixed(1)}A ≤ In ≤ ${caboCAResult.izCorrigidaA}A` : `In ≥ ${icaProjeto.toFixed(1)}A`}
            destaque="Bipolar curva C"
            norma="NBR 5410:2004 — condição 1: In≥Ib, condição 2: In≤Iz'"
            slide="Curso slide 53–54 — seleção do disjuntor após verificar Ib ≤ In ≤ Iz'"
            formula={`Ib(${caboCAResult?.ibA.toFixed(1)||icaProjeto.toFixed(1)}A) ≤ In(${disjCA}A) ≤ Iz'(${caboCAResult?.izCorrigidaA||'?'}A) — padrões IEC: 6,10,16,20,25,32,40,50,63,80,100A`}
          />
          <Linha
            label="DPS CA — 275 V"
            valor={`${dpskA} kA — Classe II`}
            sub={dpsDesc}
            norma="NBR 5410 + NBR IEC 62305-3 — Classe II para proteção surtos atmosféricos induzidos"
            slide="Curso slide 55 — DPS CA: Uc ≥ 1.1 × V_max_saída_inversor"
            formula={`Uc_min = 1.1 × ${tensaoCA}V = ${(tensaoCA*1.1).toFixed(0)}V → usar DPS 275V. Imax=${dpskA}kA classe II`}
          />
        </div>

        {/* Lado CC */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#4ea8de', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>
            ▸ Lado CC (módulos → inversor)
          </div>
          {isc > 0 ? (<>
            <Linha
              label="Isc por string"
              valor={`${isc} A`}
              sub="Do datasheet do módulo (STC: 1000 W/m², 25°C)"
              norma="NBR 16690:2019 — item 5.3.1 (corrente de curto-circuito)"
              slide="Curso slide 39 — Isc_módulo do datasheet"
              formula={`Isc = ${isc}A por string × ${nStrings} string(s) = ${protecaoCC.correnteCurtoCircuitoTotalA.toFixed(1)}A total`}
            />
            <Linha
              label="Corrente de projeto CC (×1,25)"
              valor={`${iccProjeto.toFixed(1)} A`}
              sub={`Isc × N_strings × 1.25 = ${isc}A × ${nStrings} × 1.25`}
              norma="NBR 16690:2019 — item 5.3.1: Ib_cc = Isc × 1.25 (fator irradiância até 1.250 W/m²)"
              slide="Curso slide 39-40 — IEC 60364-7-712: fator 1.25"
              formula={`Ib_CC = ${isc}A × ${nStrings} × 1.25 = ${iccProjeto.toFixed(1)}A`}
            />
            <Linha
              label="Cabo CC solar (PV1-F)"
              valor={`${cableCC.secao} mm²`}
              sub={`Iz'=${izCorrCC}A (FTA=${ftaCC}@${tempTelhado}°C) | Ib=${iccProjeto.toFixed(1)}A ${izCorrCC >= iccProjeto ? '✓' : '⚠️'}`}
              destaque="Unipolar XLPE 90°C"
              norma="NBR 16690:2019 Tab. 5 + NBR 16612 Tab. C.2 (XLPE 90°C, unipolar, ao ar)"
              slide="Curso slides 39–43 — FTA para cabo CC: telhados atingem 70-80°C no verão"
              formula={`FTA_XLPE90(${tempTelhado}°C)=${ftaCC} | Iz_req=${iccProjeto.toFixed(1)}A/${ftaCC}=${iccProjetoComFTA.toFixed(1)}A | Iz'=${cableCC.imax}A×${ftaCC}=${izCorrCC}A ≥ Ib ✓`}
            />
            <Linha
              label="Voc STC do sistema"
              valor={`${vocSistema.toFixed(0)} V`}
              sub={`${vocMod}V × ${nModStr} módulos/string (condições STC)`}
            />
            <Linha
              label="Voc máx. corrigido (Tmin=5°C)"
              valor={`${vocMax.toFixed(1)} V`}
              sub={`NBR 16690 5.3.3: Voc_STC × [1 + ${coefVoc}%/°C × (5-25)] = +${((vocMax/vocSistema-1)*100).toFixed(1)}% vs STC`}
              destaque={vocMax > LIMITE_VDC ? "⚠ >1000V" : "< 1000V ✓"}
            />
            {dpsCC_kA > 0 && (
              <Linha
                label="DPS CC (opcional)"
                valor={`${dpsCC_kA} kA`}
                sub="Recomendado quando cabo CC > 10m (NBR 16690)"
              />
            )}
            {/* Compatibilidade MPPT */}
            {kit.vmppV > 0 && kit.faixaMpptMinV > 0 && (() => {
              const vmppSist = kit.vmppV * (kit.modulosPorString || 1);
              const dentroMin = vmppSist >= kit.faixaMpptMinV;
              const dentroMax = vmppSist <= kit.faixaMpptMaxV;
              const ok = dentroMin && dentroMax;
              return (
                <Linha
                  label="Vmpp do sistema"
                  valor={`${vmppSist.toFixed(0)} V`}
                  sub={ok
                    ? `Dentro da faixa MPPT: [${kit.faixaMpptMinV}V – ${kit.faixaMpptMaxV}V] ✓`
                    : `FORA da faixa MPPT! [${kit.faixaMpptMinV}V – ${kit.faixaMpptMaxV}V] ← REVISAR STRING`}
                  destaque={ok ? undefined : "⚠️ FORA MPPT"}
                />
              );
            })()}
            <Linha
              label="String box / Fusíveis"
              valor={nStrings >= 2 ? "Necessária" : "Não necessária"}
              sub={nStrings >= 2
                ? `NBR 16690 5.4.2: ${nStrings} strings em paralelo exigem proteção individual de string`
                : "1 string: proteção direto no QDG — sem string box necessária"}
              destaque={nStrings >= 2 ? "NBR 16690" : "QDG"}
            />
            {nStrings >= 2 && fuseIdeal > 0 && (
              <Linha
                label="Fusível por string"
                valor={`${fuseIdeal} A`}
                sub={`${isc.toFixed(1)} A (Isc) ≤ ${fuseIdeal} A ≤ ${(2.5*isc).toFixed(1)} A (2.5×Isc)`}
                destaque="PV Fuse"
              />
            )}
          </>) : (
            <div style={{ fontSize:13, color:'#444444', paddingTop:12 }}>
              Preencha Isc e nº de strings para ver o dimensionamento CC
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop:14, padding:'8px 12px', background:'#f7f6f1', borderRadius:8, fontSize:11, color:'#444444', lineHeight:1.6 }}>
        <strong style={{ color:'#57566a' }}>Notas:</strong> Cabo CA: Tabela 36 NBR 5410 (eletroduto embutido, 70°C) + FTA temperatura.
        Cabo CC: NBR 16690 / IEC 60364-7-712 (cabo solar XLPE 90°C) + FTA.
        DPS CA: NBR IEC 62305-3 Classe II.
      </div>

      {/* ── FDI — 3 critérios ── */}
      {kit.vocV > 0 && kit.faixaMpptMinV > 0 && kit.potenciaInversorKW > 0 && (() => {
        // ADICIONADO (ago/2026): quando o campo Vmpp do datasheet não está
        // preenchido, este painel silenciosamente usava uma ESTIMATIVA
        // (85% de Voc) sem avisar — um usuário lendo "FDI = 1,082" ou
        // "Faixa: 8–14 módulos" não tinha como saber que esses números vêm
        // de um valor chutado, não do datasheet real do módulo.
        const vmppReal = (kit as any).vmppV || (kit as any).vmpV || 0;
        const vmppEstimado = vmppReal <= 0;
        try {
          const r = calcularFDI({
            potenciaModuloWp: kit.potenciaModuloWp,
            quantidade: kit.quantidade,
            vocV: kit.vocV,
            vmpV: vmppReal || kit.vocV * 0.85,
            iscA: kit.iscA,
            potenciaInversorKW: kit.potenciaInversorKW,
            faixaMpptMinV: kit.faixaMpptMinV,
            faixaMpptMaxV: kit.faixaMpptMaxV,
            tensaoMaxEntradaV: kit.tensaoMaxEntradaV,
            // BUG CORRIGIDO (ago/2026): caía em `kit.corrMaxSaidaA` (corrente CA de
            // saída do inversor — grandeza diferente de corrente CC por MPPT) e depois
            // em `99` (aprova qualquer configuração de strings silenciosamente) quando o
            // campo "Imax por MPPT" não era preenchido. Agora passa 0 nesse caso, e
            // calcularFDI marca o Critério 3 como "não avaliado" (nem aprovado nem
            // reprovado) em vez de aprovar às cegas — ver criterio3Avaliado.
            corrMaxMpptA: kit.corrMaxMpptA || 0,
            numMppt: kit.numMppt || 1,
            numStrings: kit.numStrings || 1,
            modulosPorString: kit.modulosPorString || 1,
          });
          const corStatus: Record<string,string> = {
            ideal:'#22c55e', aceitavel:'#f59e0b', alto:'#f97316', baixo:'#f97316', invalido:'#ef4444',
          };
          // ADICIONADO (ago/2026): resumo em linguagem simples do que os 3
          // critérios técnicos (①②③) significam na prática, para quem não
          // decora a nomenclatura FDI/N_série/MPPT de cabeça — a pergunta
          // que este painel deve responder de cara é "esse inversor serve
          // para esse conjunto de módulos, ou preciso trocar algo?" (ver
          // resumoFDI(), testado em App.resumoFDI.test.ts).
          const resumo = resumoFDI(r);
          return (
            <div style={{ marginTop:16, padding:'14px 16px', background:'#f7f6f1',
              border:`1px solid ${r.aprovado ? '#22c55e44' : '#ef444444'}`, borderRadius:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#c9a227', textTransform:'uppercase', letterSpacing:'.05em' }}>
                  FDI — Fator de Dimensionamento do Inversor
                </span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
                  background: r.aprovado ? '#14321a' : '#3b0a0a',
                  color: r.aprovado ? '#22c55e' : '#ef4444' }}>
                  {r.aprovado ? '✓ APROVADO' : '✗ AJUSTAR'}
                </span>
              </div>
              <div style={{ fontSize:12, color: r.aprovado ? '#166534' : '#991b1b', marginBottom:10, lineHeight:1.5 }}>
                {resumo}
              </div>
              {vmppEstimado && (
                <div style={{ fontSize:11, color:'#92400e', marginBottom:12, padding:'5px 10px', background:'#3b2a0a', borderRadius:6 }}>
                  ⚠ Vmpp do módulo não preenchido — os números abaixo usam uma ESTIMATIVA (85% de Voc), não o valor real do datasheet. Preencha "Tensão de Máxima Potência (Vmpp)" no kit para um resultado preciso.
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
                {[
                  {
                    n:'① Potência', ok:r.criterio1Ok,
                    val:`FDI = ${r.fdi.toFixed(3)}`,
                    sub:`Pinv válido: ${r.pinvMinKW}–${r.pinvMaxKW} kW`,
                    badge:r.statusFDI.toUpperCase(), cor:corStatus[r.statusFDI],
                  },
                  {
                    n:'② Tensão', ok:r.criterio2Ok,
                    val:`${r.nSerieCfg} mód/string`,
                    sub:`Faixa: ${r.nSerieMin}–${r.nSerieMax} módulos`,
                    badge:r.criterio2Ok?'OK':'AJUSTAR', cor:r.criterio2Ok?'#22c55e':'#ef4444',
                  },
                  {
                    // CORRIGIDO (ago/2026): quando Imax_MPPT não foi informado, o critério
                    // fica "não avaliado" (cinza), não "OK" (verde) — antes um badge verde
                    // aparecia mesmo sem o dado real do datasheet, por causa do fallback
                    // que caía num valor de outra grandeza ou em 99A arbitrário.
                    n:'③ Corrente', ok:!r.criterio3Avaliado || r.criterio3Ok,
                    val:`${r.stringsPerMppt} str/MPPT`,
                    sub: r.criterio3Avaliado ? `Máx: ${r.nStringsMaxMppt} strings por MPPT` : 'Preencha Imax por MPPT para avaliar',
                    badge: !r.criterio3Avaliado ? 'N/AVALIADO' : (r.criterio3Ok?'OK':'AJUSTAR'),
                    cor: !r.criterio3Avaliado ? '#888888' : (r.criterio3Ok?'#22c55e':'#ef4444'),
                  },
                ].map(({ n, ok, val, sub, badge, cor }) => (
                  <div key={n} style={{ background:'#faf9f5', borderRadius:8, padding:'10px 12px',
                    border:`1px solid ${ok?'#22c55e33':'#ef444433'}` }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:4 }}>{n}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:'#1a1a1a' }}>{val}</div>
                    <div style={{ fontSize:10, color:'#666', marginBottom:6 }}>{sub}</div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:10,
                      background:`${cor}22`, color:cor }}>{badge}</span>
                  </div>
                ))}
              </div>
              {r.alertas.map((a, i) => (
                <div key={i} style={{ padding:'5px 10px', background:'#3b0a0a', borderRadius:6,
                  fontSize:11, color:'#fca5a5', marginBottom:4 }}>⚠️ {a}</div>
              ))}
              {r.sugestoes.map((sg, i) => (
                <div key={i} style={{ padding:'5px 10px', background:'#1a2010', borderRadius:6,
                  fontSize:11, color:'#86efac', marginBottom:4 }}>💡 {sg}</div>
              ))}
              <div style={{ fontSize:10, color:'#444', marginTop:6 }}>
                Ref: Pre_dimensionamento_FDI.xlsx (Toolbox de Elite 2024) — overload 0,90–1,35 | N_série ROUNDUP(Vmppt_min×1,1/Vmp) | Ic ROUNDDOWN(Imax/Isc)
              </div>
            </div>
          );
        } catch (e) {
          // BUG CORRIGIDO (ago/2026): qualquer erro no cálculo do FDI fazia
          // o painel inteiro desaparecer em silêncio (return null), sem
          // nenhuma indicação do motivo — exatamente o tipo de comportamento
          // que faz um painel parecer "quebrado sem explicação". Agora mostra
          // o motivo real em vez de sumir.
          return (
            <div style={{ marginTop:16, padding:'10px 14px', background:'#3b0a0a', border:'1px solid #ef444444', borderRadius:10 }}>
              <span style={{ fontSize:11, color:'#fca5a5' }}>
                ⚠️ Não foi possível calcular o FDI: {e instanceof Error ? e.message : String(e)}. Confira os dados do módulo e do inversor (Voc, Vmpp, Isc, faixa MPPT).
              </span>
            </div>
          );
        }
      })()}
    </div>
  );
}

// ─── Importar Datasheet via IA ───────────────────────────────────────────────
function ImportarDatasheet({ tipo, onExtracted }: { tipo: 'modulo' | 'inversor'; onExtracted: (dados: any) => void }) {
  const [estado, setEstado] = React.useState<'idle' | 'lendo' | 'extraindo' | 'ok' | 'erro'>('idle');
  const [erro, setErro] = React.useState('');
  const apiKey = useProjetoStore(s => (s.empresa as any).anthropicApiKey || '');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const PROMPT_MODULO = `Analise este datasheet de módulo fotovoltaico e extraia APENAS as especificações técnicas em JSON puro (sem markdown, sem backticks, sem explicações).
Retorne SOMENTE este JSON:
{
  "marcaModulo": "nome do fabricante",
  "modeloModulo": "modelo exato",
  "potenciaModuloWp": 0,
  "vmppV": 0,
  "imppA": 0,
  "vocV": 0,
  "iscA": 0,
  "coefTempPmaxPorCent": 0,
  "coefTempVocPorCent": 0,
  "coefTempIscPorCent": 0,
  "noct": 0,
  "comprimentoMm": 0,
  "larguraMm": 0,
  "pesoKg": 0,
  "garantiaProdutoAnos": 0,
  "garantiaPotenciaAnos": 0,
  "potenciaGarantidaPercent": 80
}
Use valores numéricos reais. coefTempPmax deve ser negativo (ex: -0.35). Se não encontrar um valor, use 0.`;

  const PROMPT_INVERSOR = [
    'Analise este datasheet de inversor solar fotovoltaico e extraia APENAS as especificacoes tecnicas em JSON puro (sem markdown, sem backticks, sem explicacoes).',
    '',
    'PASSO 1: Identifique o tipo de inversor:',
    '  - microinversor: um inversor por modulo ou par de modulos (ex: Enphase IQ7, APsystems, Hoymiles)',
    '  - string: um inversor central para uma ou mais strings (ex: Growatt, SMA, Fronius)',
    '  - hibrido: inversor string com entrada para bateria',
    '',
    'Retorne SOMENTE este JSON (sem texto antes ou depois):',
    '{',
    '  "tipoInversor": "string | microinversor | hibrido",',
    '  "marcaInversor": "fabricante",',
    '  "modeloInversor": "modelo",',
    '  "potenciaInversorKW": 0,',
    '  "faixaMpptMinV": 0,',
    '  "faixaMpptMaxV": 0,',
    '  "tensaoMaxEntradaV": 0,',
    '  "tensaoSaidaV": 220,',
    '  "corrMaxSaidaA": 0,',
    '  "eficienciaInversorPercent": 0,',
    '  "numMppt": 1,',
    '  "ipGabinete": "IP65",',
    '  "fatorPotencia": ">0.99",',
    '  "thd": "<3%",',
    '',
    '  "_configuracao": {',
    '    "modulosPorUnidade": 0,',
    '    "maxModulosParalelo": 0,',
    '    "minModulosSerie": 0,',
    '    "maxModulosSerie": 0,',
    '    "stringsRecomendadas": 0,',
    '    "observacoesFabricante": ""',
    '  }',
    '}',
    '',
    'Para "_configuracao":',
    '  - microinversor: "modulosPorUnidade" = quantos modulos por microinversor (geralmente 1 ou 2)',
    '    "maxModulosParalelo" = maximo de microinversores em paralelo no mesmo ramo CA',
    '    "observacoesFabricante" = copiar a recomendacao de configuracao do datasheet se existir',
    '  - string: "minModulosSerie" e "maxModulosSerie" = faixa recomendada de modulos por string',
    '    "stringsRecomendadas" = numero de strings sugerido (se o datasheet indicar)',
    '    "observacoesFabricante" = copiar a recomendacao de configuracao do datasheet se existir',
    '  - Se nao encontrar um valor numerico, use 0. Se nao encontrar texto, use string vazia.',
    '  - Valores numericos devem ser numeros, nao strings.',
  ].join('\n');

  async function processar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) { setEstado('erro'); setErro('Chave API Anthropic não configurada. Vá em ⚙ Empresa e cadastre a chave sk-ant-...'); return; }
    setEstado('lendo');
    try {
      // Ler PDF como base64
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setEstado('extraindo');
      // Chamar Anthropic API
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: tipo === 'modulo' ? PROMPT_MODULO : PROMPT_INVERSOR },
            ],
          }],
        }),
      });
      if (!resp.ok) throw new Error(`API erro ${resp.status}: ${await resp.text()}`);
      const data = await resp.json();
      const texto = data.content?.[0]?.text || '';
      const jsonStr = texto.replace(/```json?|```/g, '').trim();
      const extraido = JSON.parse(jsonStr);
      onExtracted(extraido);
      setEstado('ok');
      setTimeout(() => setEstado('idle'), 3000);
    } catch(err) {
      setEstado('erro');
      setErro(err instanceof Error ? err.message : String(err));
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const label = tipo === 'modulo' ? '📋 Importar Datasheet do Módulo' : '📋 Importar Datasheet do Inversor';
  const colors = { idle:'#ddd9cb', lendo:'#1a3a6e', extraindo:'#7c3aed', ok:'#166534', erro:'#7f1d1d' };
  const texts  = { idle: label, lendo:'📖 Lendo PDF...', extraindo:'🤖 Extraindo dados...', ok:'✅ Dados importados!', erro:`❌ ${erro.slice(0,60)}` };

  return (
    <div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={processar} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={estado === 'lendo' || estado === 'extraindo'}
        style={{
          padding:'7px 16px', borderRadius:8, border:`1px solid ${colors[estado]}`,
          background: estado !== 'idle' ? colors[estado]+'44' : 'transparent',
          color: estado === 'ok' ? '#15803d' : estado === 'erro' ? '#dc2626' : estado === 'idle' ? '#6f6d63' : '#4c4fb0',
          fontSize:12, fontWeight:600, cursor: estado === 'idle' ? 'pointer' : 'default',
          transition:'all .2s', whiteSpace:'nowrap',
        }}
        title={estado === 'erro' ? erro : `Faça upload do PDF do datasheet ${tipo === 'modulo' ? 'do módulo' : 'do inversor'}`}
      >
        {texts[estado]}
      </button>
    </div>
  );
}

// ─── Buscador de Coordenadas UTM via Nominatim (OpenStreetMap, gratuito) ────────
// Conversão lat/lon -> UTM: ver @domain/geografia/converterCoordenadas (extraída
// daqui em ago/2026 — era duplicada uma segunda vez dentro de cpf_utm.test.ts,
// que testava a cópia, não esta função; agora há uma função só, testada, também
// usada pela Planta de Situação para conferir a UTM digitada contra a geocodificada).

function BuscadorCoordenadas({ endereco, cidade, uf, onEncontrado }: {
  endereco: string; cidade: string; uf: string;
  onEncontrado: (utmE: number, utmN: number, fuso: number) => void;
}) {
  const [estado, setEstado] = React.useState<'idle'|'buscando'|'ok'|'erro'>('idle');
  const [msg, setMsg] = React.useState('');

  async function buscar() {
    const q = [endereco, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
    if (!q.trim()) { setEstado('erro'); setMsg('Preencha o endereço primeiro'); return; }
    setEstado('buscando');
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;
      const r = await fetch(url, { headers: { 'User-Agent': 'LumenSolar/2.0 (wilianjunior@lumen.eng.br)' } });
      const data = await r.json();
      if (!data.length) { setEstado('erro'); setMsg('Endereço não encontrado — ajuste e tente novamente'); return; }
      const { lat, lon } = data[0];
      const { utmE, utmN, fuso, hemisferio } = latLonParaUTM(parseFloat(lat), parseFloat(lon));
      onEncontrado(utmE, utmN, fuso);
      // CORRIGIDO (ago/2026): letra do hemisfério vinha hardcoded "S" — errada
      // para Roraima e partes do norte do Amapá/Amazonas (lat >= 0, hemisfério N).
      setEstado('ok'); setMsg(`UTM ${fuso}${hemisferio}: E=${utmE.toLocaleString()} N=${utmN.toLocaleString()}`);
      setTimeout(() => setEstado('idle'), 4000);
    } catch { setEstado('erro'); setMsg('Sem conexão ou erro na busca'); }
  }

  return (
    <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
      <button onClick={buscar} disabled={estado==='buscando'}
        style={{ padding:'6px 16px', borderRadius:8, border:`1px solid #ddd9cb`,
          background: estado==='ok' ? '#166534' : '#eeece2',
          color: estado==='ok' ? '#15803d' : estado==='erro' ? '#dc2626' : '#6f6d63',
          fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
        {estado==='buscando' ? '🔍 Buscando...' : '🗺️ Buscar coordenadas UTM'}
      </button>
      {msg && <span style={{ fontSize:12, color: estado==='erro' ? '#dc2626' : '#15803d' }}>{msg}</span>}
      <span style={{ fontSize:11, color:'#444444' }}>Via OpenStreetMap — gratuito, sem API key</span>
    </div>
  );
}

// ─── Status de Proposta ─────────────────────────────────────────────────────
type StatusProposta = 'rascunho' | 'enviada' | 'negociacao' | 'aprovada' | 'perdida';
const STATUS_LABELS: Record<StatusProposta,{label:string;cor:string}> = {
  rascunho:   { label:'Rascunho',      cor:'#6b7280' },
  enviada:    { label:'Enviada',        cor:'#2563eb' },
  negociacao: { label:'Em negociação',  cor:'#d97706' },
  aprovada:   { label:'Aprovada ✓',    cor:'#16a34a' },
  perdida:    { label:'Perdida',        cor:'#dc2626' },
};

function BadgeStatus({ status, onChange }: { status: StatusProposta; onChange: (s: StatusProposta) => void }) {
  const [open, setOpen] = React.useState(false);
  const { label, cor } = STATUS_LABELS[status];
  return (
    <div style={{ position:'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
          background: cor+'22', color: cor, border:`1px solid ${cor}55`, cursor:'pointer' }}>
        {label} ▾
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:100, background:'#eeece2',
          border:`1px solid #ddd9cb`, borderRadius:8, padding:6, minWidth:160, marginTop:4 }}>
          {(Object.entries(STATUS_LABELS) as [StatusProposta,{label:string;cor:string}][]).map(([k,v]) => (
            <div key={k} onClick={e => { e.stopPropagation(); onChange(k); setOpen(false); }}
              style={{ padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:12,
                fontWeight:700, color:v.cor, background: k===status ? v.cor+'22' : 'transparent' }}>
              {v.label}
            </div>
          ))}
        </div>
      )}
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
    <div>
      <PageTitle title="Kit Solar" sub={mediaKWh > 0 ? `Consumo médio do cliente: ${fmtNum(mediaKWh,0)} kWh/mês` : 'Preencha com os dados do kit escolhido no fornecedor.'} />

      {/* ── Estratégia de dimensionamento ── */}
      {mediaKWh > 0 && <StrategiaKwp mediaKWh={mediaKWh} uf={s.cliente.uf} s={s} />}

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
      {/* ── Expansão de Usina Existente ── */}
      <div className="card">
        <div className="card-head">🔄 Expansão de Usina Existente (opcional)</div>
        <div className="card-body">
          <div className="g2" style={{ rowGap:14 }}>
            <Campo label="Potência atual instalada (kWp)" tip="Preencher SOMENTE se o cliente já tem sistema solar e quer aumentar. Deixar 0 para instalação nova. Tipo de solicitação CEMIG: GD Existente COM Alteração de Potência (REN 1.000/2021).">
              <input className="inp inp-num" type="number" min="0" step="0.1"
                value={s.kit.potenciaAtualKWp || ''}
                onChange={e => s.atualizarKit({ potenciaAtualKWp: Number(e.target.value) })}
                placeholder="0 — instalação nova" />
            </Campo>
            <Campo label="Data do protocolo original" tip="Data do protocolo do sistema atual. Define o FioB da potência já instalada. A potência ADICIONAL receberá o FioB da data do protocolo novo — pode ter percentual diferente.">
              <input className="inp" type="date"
                value={s.kit.dataProtocoloOriginal || ''}
                onChange={e => s.atualizarKit({ dataProtocoloOriginal: e.target.value })} />
            </Campo>
          </div>
          {s.kit.potenciaAtualKWp > 0 && (
            <div style={{ marginTop:10, padding:'8px 12px', background:'#251f0a',
              border:'1px solid #c9a22766', borderRadius:8, fontSize:12, color:'#fcd34d', lineHeight:1.6 }}>
              ⚠️ <strong>Expansão detectada</strong> — potência adicional:{' '}
              <strong>{((s.kit.potenciaModuloWp * s.kit.quantidade / 1000) - s.kit.potenciaAtualKWp).toFixed(2)} kWp</strong>.{' '}
              O formulário CEMIG usará tipo "GD Existente COM Alteração de Potência".
              A potência adicional recebe FioB da data do NOVO protocolo.
            </div>
          )}
        </div>
      </div>

      <ComponentesRecomendados kit={s.kit} tipoLigacao={s.consumo?.tipoLigacao} />

      {/* ── Dimensionamento de Bateria (opcional) ── */}
      {/* BUG CORRIGIDO (ago/2026): este painel (configuração + resultados de
          banco de baterias) aparecia em TODO projeto com consumo médio
          preenchido — inclusive na grande maioria dos casos, que são
          on-grid comuns sem bateria nenhuma. Isso empurra pra baixo o resto
          da tela do Kit com um bloco irrelevante na maior parte das vezes.
          Agora fica escondido atrás de um checkbox explícito, que só quem
          está de fato projetando um sistema com backup/híbrido ou off-grid
          precisa marcar. */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: (s.kit as any).temBancoBaterias ? 10 : 16 }}>
        <input type="checkbox" id="temBancoBaterias" checked={!!(s.kit as any).temBancoBaterias}
          onChange={e => s.atualizarKit({ temBancoBaterias: e.target.checked } as any)}
          style={{ width:16, height:16, cursor:'pointer' }} />
        <label htmlFor="temBancoBaterias" style={{ fontSize:13, color:D.textSub, cursor:'pointer' }}>
          🔋 Este projeto inclui banco de baterias (backup/híbrido ou off-grid)
        </label>
      </div>
      {mediaKWh > 0 && (s.kit as any).temBancoBaterias && (() => {
        // CORRIGIDO (ago/2026): este painel reimplementava as fórmulas de
        // calcularBancoBaterias() (@domain/dimensionamento/calcularBateria.ts)
        // inline, à parte do módulo de domínio testado — divergindo dele e
        // perdendo alertas reais que o módulo já calcula (BMS obrigatório
        // para lítio, degradação térmica do OPzV, correntes elevadas em
        // 12V/24V, autonomia mínima de 2 dias no offgrid, e o alerta de
        // pack de tensão sem correspondência exata que corrigiu um bug real
        // nesta mesma sessão). Agora chama a função de domínio de verdade —
        // um único lugar para a lógica, coberto pelos 5 testes de
        // calcularBateria.test.ts.
        const DIAS_MES = 365 / 12; // 30.4167 — mesma convenção usada nos módulos de domínio
        const consumoDiario = mediaKWh / DIAS_MES;
        const tipoBat: TipoBateria = (s.kit as any).tipoBateria2 || 'estacionaria_comum';
        const tipoSist: TipoSistema = (s.kit as any).tipoSistemaBat || 'backup_hybrid';
        const autonomia = (s.kit as any).autonomiaBat || (tipoSist === 'backup_hybrid' ? 4 : 2);
        const tensaoSist = (s.kit as any).tensaoSistemaBat || 48;
        const capBatAh = (s.kit as any).capacidadeBateriaAh || 100;
        const r = calcularBancoBaterias({
          consumoDiarioKWh: consumoDiario,
          tipoBateria: tipoBat,
          tipoSistema: tipoSist,
          autonomia,
          tensaoSistemaV: tensaoSist,
          capacidadeBateriaAh: capBatAh,
          iscArranjoA: s.kit.iscA,
          nStringsParalelo: s.kit.numStrings || 1,
          // CORRIGIDO (ago/2026): faltava esse parâmetro — sem ele, o alerta
          // de autonomia empírica (Eq. 6.13) nunca era calculado aqui (o
          // alerta de "autonomia mínima 2 dias" agora é independente disso,
          // ver calcularBateria.ts, mas a autonomia EMPÍRICA continua
          // precisando de HSP para aparecer). Mesma tabela usada por
          // `calcularTudo()` (useProjetoStore.ts) para o dimensionamento
          // principal — `HSP_MEDIO_POR_UF` indexado direto (não `hspPorUF()`,
          // que lança exceção para UF vazia/desconhecida; aqui precisa ser
          // silenciosamente `undefined` até o usuário preencher a UF).
          hspMinimo: s.cliente.uf ? HSP_MEDIO_POR_UF[s.cliente.uf.toUpperCase()] : undefined,
        });
        const nomes: Record<string,string> = {
          estacionaria_comum:'Pb-ácido estacionária', ciclo_profundo_opzs:'OPzS ciclo profundo',
          ciclo_profundo_opzv:'OPzV ciclo profundo (gel)', litio_lifepo4:'Lítio LiFePO4'
        };
        return (
          <div style={{ background:D.card, border:'1px solid #e2dfd0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:800, color:D.gold, marginBottom:14, textTransform:'uppercase', letterSpacing:'.05em' }}>
              🔋 Dimensionamento de Banco de Baterias
            </div>

            {/* Configuração */}
            <div className="g2" style={{ rowGap:10, marginBottom:14 }}>
              <Campo label="Tipo de sistema" tip="Backup/Híbrido: horas de autonomia sem rede. Offgrid/SFI: dias de autonomia completa (sem conexão à rede).">
                <select className="inp" value={tipoSist}
                  onChange={e => s.atualizarKit({ tipoSistemaBat: e.target.value } as any)}>
                  <option value="backup_hybrid">Backup / Híbrido (horas sem rede)</option>
                  <option value="offgrid_sfi">Offgrid / SFI (dias de autonomia)</option>
                </select>
              </Campo>
              <Campo label="Tipo de bateria" tip="DOD recomendado — Estacionária: 40% | OPzS/OPzV: 70% | LiFePO4: 80%">
                <select className="inp" value={tipoBat}
                  onChange={e => s.atualizarKit({ tipoBateria2: e.target.value } as any)}>
                  <option value="estacionaria_comum">Pb-ácido estacionária — DOD 40%</option>
                  <option value="ciclo_profundo_opzs">OPzS ciclo profundo — DOD 70%</option>
                  <option value="ciclo_profundo_opzv">OPzV ciclo profundo (gel) — DOD 70%</option>
                  <option value="litio_lifepo4">Lítio LiFePO4 — DOD 80%</option>
                </select>
              </Campo>
              <Campo label={tipoSist === 'backup_hybrid' ? 'Autonomia (horas)' : 'Autonomia (dias)'}
                tip={tipoSist === 'backup_hybrid' ? 'Horas de backup sem energia da rede.' : 'Dias de autonomia sem geração solar. Recomendado: 2–4 dias (Brasil). Fórmula empírica: N = 0.48×HSPmin + 4.58'}>
                <input className="inp inp-num" type="number" min="1" max={tipoSist==='backup_hybrid'?24:7}
                  value={(s.kit as any).autonomiaBat || ''}
                  onChange={e => s.atualizarKit({ autonomiaBat: Number(e.target.value) } as any)}
                  placeholder={tipoSist==='backup_hybrid'?'4':'2'} />
              </Campo>
              <Campo label="Tensão do sistema CC (V)" tip="12V para sistemas pequenos. 24V intermediário. 48V recomendado para > 1 kWh — reduz correntes e perdas.">
                <select className="inp" value={tensaoSist}
                  onChange={e => s.atualizarKit({ tensaoSistemaBat: Number(e.target.value) } as any)}>
                  <option value={12}>12 V</option>
                  <option value={24}>24 V</option>
                  <option value={48}>48 V (recomendado)</option>
                </select>
              </Campo>
              <Campo label="Capacidade da bateria (Ah @ C/20)" tip="Capacidade nominal de cada unidade (monobloco ou célula). Verifique o datasheet na taxa C/20 (20 horas de descarga).">
                <input className="inp inp-num" type="number" min="50" max="5000"
                  value={(s.kit as any).capacidadeBateriaAh || ''}
                  onChange={e => s.atualizarKit({ capacidadeBateriaAh: Number(e.target.value) } as any)}
                  placeholder="100" />
              </Campo>
            </div>

            {/* Resultados */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
              {[
                { label:'Capacidade mínima', valor:`${(r.capacidadeBruta_Wh/1000).toFixed(2)} kWh`, sub:`DOD ${(r.dodUsado*100).toFixed(0)}% — ${nomes[tipoBat]}` },
                { label:'Em Ah @ C/20', valor:`${r.capacidadeBruta_Ah} Ah`, sub:`sistema ${tensaoSist}V` },
                { label:`Banco de baterias`, valor:`${r.bateriasSerie}S × ${r.bateriasParalelo}P`, sub:`${r.bateriasTotal} unidades total` },
                { label:'Capacidade real', valor:`${r.capacidadeRealKWh.toFixed(2)} kWh`, sub:`${r.capacidadeRealAh} Ah @ ${tensaoSist}V` },
                { label:'Controlador de carga', valor:`≥ ${r.corrMaxControlador_A} A`, sub:`Ic = 1.25 × Isc × ${s.kit.numStrings||1} strings` },
                { label:`Autonomia (${tipoSist==='backup_hybrid'?'horas':'dias'})`, valor:`${autonomia}${tipoSist==='backup_hybrid'?'h':'d'}`, sub:`${tipoSist==='backup_hybrid'?'sem rede elétrica':'sem geração solar'}` },
              ].map(({ label, valor, sub }) => (
                <div key={label} style={{ background:'#f7f6f1', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:D.textMuted, marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:D.text }}>{valor}</div>
                  <div style={{ fontSize:10, color:D.textMuted }}>{sub}</div>
                </div>
              ))}
            </div>

            {r.alertas.map((a, i) => (
              <div key={i} style={{ padding:'6px 12px', background:'#3b0a0a', border:'1px solid #ef4444', borderRadius:8, fontSize:11, color:'#fca5a5', marginBottom:8 }}>
                ⚠️ {a}
              </div>
            ))}
            <div style={{ fontSize:10, color:D.textMuted }}>
              Fórmulas: CBC20 = Energia × Autonomia / DOD (Eq. 6.10) | CBIC20 = CBC20 / Vsist (Eq. 6.11) | Ic = 1.25 × Isc × N_strings (Eq. 6.18) — Manual Fotovoltaico CEPEL/INPE
            </div>
          </div>
        );
      })()}

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
            <Campo label="Imax por MPPT (A)" tip="Corrente máxima por entrada MPPT — datasheet do inversor. Critério 3 do FDI: N_strings × Isc ≤ Imax_MPPT. Planilha: Pre_dimensionamento_FDI.xlsx"><input className="inp inp-num" type="number" step="0.1" value={s.kit.corrMaxMpptA || ''} onChange={e => s.atualizarKit({ corrMaxMpptA: Number(e.target.value) })} placeholder="Ex: 13.5" /></Campo>
            <Campo label="IP do gabinete" hint="Ex: IP65, IP67"><input className="inp" value={s.kit.ipGabinete} onChange={e => s.atualizarKit({ ipGabinete: e.target.value })} /></Campo>
            <Campo label="Comprimento cabo CA (m)" tip="Distância do inversor ao quadro de distribuição (QDG) — necessário para calcular queda de tensão (NBR 5410). Considere o trajeto real pelo eletroduto.">
              <input className="inp inp-num" type="number" min="1" max="500"
                value={s.kit.comprimentoCaboCAm || ''}
                onChange={e => s.atualizarKit({ comprimentoCaboCAm: Number(e.target.value) })}
                placeholder="10" />
            </Campo>
            <Campo label="Temperatura máx. instalação (°C)" tip="Temperatura ambiente máxima no local de instalação do cabo CA. Afeta o fator de correção FTA (NBR 5410 Tabela 40). Telhados podem atingir 50–60°C no verão.">
              <input className="inp inp-num" type="number" min="25" max="60"
                value={s.kit.temperaturaInstalacaoC || ''}
                onChange={e => s.atualizarKit({ temperaturaInstalacaoC: Number(e.target.value) })}
                placeholder="40" />
            </Campo>
          </div>

          {/* Tipo do inversor (extraído do datasheet) */}
          {(s.kit as any).tipoInversor && (
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20,
                background:(s.kit as any).tipoInversor === 'microinversor' ? '#7c3aed22' : (s.kit as any).tipoInversor === 'hibrido' ? '#d9770622' : '#2563eb22',
                color:      (s.kit as any).tipoInversor === 'microinversor' ? '#a78bfa'   : (s.kit as any).tipoInversor === 'hibrido' ? '#fb923c'   : '#60a5fa',
                border:     '1px solid currentColor',
              }}>
                {(s.kit as any).tipoInversor === 'microinversor' ? '⚡ Microinversor' :
                 (s.kit as any).tipoInversor === 'hibrido' ? '🔋 Híbrido' : '🔌 Inversor String'}
              </span>
            </div>
          )}

          {/* Recomendação do fabricante (extraída do datasheet) */}
          {(s.kit as any).recomendacaoFabricante && (
            <div style={{ marginTop:10, padding:'10px 14px', background:'#f2f0e8',
              border:'1px solid #c9a22755', borderRadius:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#c9a227', marginBottom:5,
                textTransform:'uppercase', letterSpacing:'.06em' }}>
                📋 Recomendação do fabricante (datasheet)
              </div>
              <div style={{ fontSize:12, color:'#5c5a68', lineHeight:1.6 }}>
                {(s.kit as any).recomendacaoFabricante}
              </div>
            </div>
          )}
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
    <div>
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
            <div style={{ fontSize: 11, color: '#6f6d63', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Preço de venda</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: D.gold, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(precoVenda)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#666666' }}>Impostos: <span style={{ color: '#6f6d63' }}>{fmtBRL(imposto)}</span></div>
            <div style={{ fontSize: 12, color: '#666666' }}>Lucro: <span style={{ color: '#4ade80' }}>{fmtBRL(lucro)}</span></div>
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

// BUG CORRIGIDO (ago/2026): calcularTudo() só roda no clique de "Calcular
// resultado completo" — nada impedia o usuário de editar Cliente/Consumo/
// Kit/Preço DEPOIS de calcular e ir direto para Resultado ou gerar um
// documento, deixando dimensionamento/indicadores desatualizados em relação
// aos dados agora exibidos no resto do mesmo documento. Ver comentário de
// `ultimoCalculoAssinatura` em useProjetoStore.ts para o histórico completo.
// Só é "desatualizado" se já existe UM cálculo — antes do primeiro cálculo
// `s.dimensionamento` é null e o guard antigo (`!s.dimensionamento`) já cobre
// esse caso.
function calculoDesatualizado(s: Pick<ReturnType<typeof useProjetoStore.getState>, 'cliente'|'consumo'|'kit'|'empresa'|'preco'|'dimensionamento'|'ultimoCalculoAssinatura'>): boolean {
  return s.dimensionamento !== null && assinaturaEntradasCalculo(s) !== s.ultimoCalculoAssinatura;
}

// ─── Tab Resultado ────────────────────────────────────────────────────────────
function TabResultado({ onPrev, onEmpresa }: { onPrev:()=>void; onEmpresa:()=>void }) {
  const s = useProjetoStore();
  const [gerando, setGerando] = React.useState(false);
  const desatualizado = calculoDesatualizado(s);
  const empresaIncompleta = cadastroEmpresaIncompleto(s.empresa);

  function buildData() {
    const { empresa, cliente, consumo, kit, dimensionamento, custosRecorrentes,
      precificacao, enquadramento, percentuaisFioBPorAno, consumoMedioMensalKWh,
      valorMedioMensalRS, preco, indicadores, resultadoGrupoA } = s;
    if (!dimensionamento || !custosRecorrentes || !precificacao || !enquadramento || !indicadores) {
      throw new Error('Calcule o projeto (aba Preço → "Calcular resultado completo") antes de gerar documentos.');
    }
    // BUG CORRIGIDO (ago/2026): documentos saíam com Responsável Técnico/CREA/
    // CNPJ em branco ("___________________________") sempre que o cadastro da
    // empresa (⚙ Configurações) não estava preenchido — sem bloqueio nenhum,
    // só um aviso dentro do próprio PDF já gerado (Procuracao.tsx). Usuário
    // relatou o caso real e foi direto: "todos os documentos devem estar
    // preenchidos, nada de _________". Geração agora é bloqueada aqui, antes
    // de qualquer PDF/planilha ser montado — mesmo padrão do guard de
    // `calculoDesatualizado` abaixo. Ver `domain/empresa/cadastroEmpresa.ts`.
    if (cadastroEmpresaIncompleto(empresa)) {
      throw new Error(mensagemCadastroEmpresaIncompleto(empresa));
    }
    if (calculoDesatualizado(s)) {
      throw new Error(
        'Os dados de Cliente/Consumo/Kit/Empresa/Preço foram alterados depois do último cálculo. ' +
        'Volte à aba Preço e clique em "Calcular resultado completo" novamente antes de gerar este ' +
        'documento — do contrário ele pode mostrar números que não batem com os dados atuais do projeto.'
      );
    }
    const distribuidoraObj = DISTRIBUIDORAS.find(d => d.codigo === consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
    return {
      empresa, cliente,
      // Consumo completo + distribuidora (usados por Memorial e Procuracao)
      consumo,
      // Grupo A (ago/2026): usado por PropostaPDF/PropostaComercialPDF para
      // exibir a página de aviso quando consumo.grupoTensao==='A' — ver
      // comentário de AvisoGrupoA nos dois arquivos.
      resultadoGrupoA,
      codigoDistribuidora: consumo.codigoDistribuidora,
      distribuidora: distribuidoraObj,
      // Localizacao (Memorial Descritivo)
      localizacao: s.localizacao,
      // Kit completo (Memorial usa vocV, iscA, garantias, etc.)
      kit,
      // Dimensionamento e financeiro (não-nulos: verificado no guard acima)
      dimensionamento, custosRecorrentes,
      precificacao, enquadramento,
      percentuaisFioBPorAno, consumoMedioMensalKWh: consumoMedioMensalKWh ?? 0,
      valorMedioMensalRS: valorMedioMensalRS ?? 0,
      aliquotaImpostos: preco.aliquotaImpostos, margemDesejada: preco.margemDesejada,
      indicadores, contas: consumo.contas,
      // Perdas detalhadas (Memorial)
      detalhamentoPerdas: s.detalhamentoPerdas,
      // Checklist de documentação CEMIG (para o checklist real e o pacote completo)
      checklistDocumentacao: s.checklistDocumentacao,
    };
  }

  async function gerarPDFCliente(silencioso = false) {
    setGerando(true);
    try {
      // BUG CORRIGIDO (ago/2026, profissionalização): `pdf` (o motor de
      // renderização do @react-pdf/renderer — PDFKit + layout + fontes) e
      // `PropostaPDF` eram importados de forma ESTÁTICA no topo do arquivo,
      // mesmo só sendo usados dentro destas funções assíncronas — junto com
      // os outros 6 componentes de documento, que já eram importados de
      // forma dinâmica. Isso forçava todo o motor do react-pdf (a maior
      // dependência do projeto) para dentro do bundle principal (index.js),
      // carregado mesmo que o usuário nunca gere nenhum documento na sessão.
      // Convertido para import dinâmico, no mesmo padrão já usado ao lado.
      const { pdf } = await import('@react-pdf/renderer');
      const { PropostaComercialPDF } = await import('@domain/proposta/PropostaComercialPDF');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const blob = await pdf(<PropostaComercialPDF data={buildData()} />).toBlob();
      const nomeArquivo = 'Proposta_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
    } catch(e) { if (silencioso) throw e; alert('Erro ao gerar Proposta: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarPDFTecnico() {
    setGerando(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PropostaPDF } = await import('@domain/proposta/PropostaPDF');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const blob = await pdf(<PropostaPDF data={buildData()} />).toBlob();
      const nomeArquivo = 'DocTecnica_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
    } catch(e) { alert('Erro ao gerar Doc. Técnica: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  function abrirWhatsApp() {
    const st = useProjetoStore.getState();
    // Mesmo guard de calculoDesatualizado() dos documentos — esta mensagem
    // também cita kWp/preço calculados, então também pode ficar desatualizada
    // depois de uma edição pós-cálculo.
    if (calculoDesatualizado(st)) {
      alert('Os dados foram alterados depois do último cálculo. Recalcule (aba Preço) antes de enviar — os valores de kWp/preço na mensagem podem estar desatualizados.');
      return;
    }
    const tel = (st.cliente.telefone || '').replace(/\D/g, '');
    const nome = st.cliente.nome || 'cliente';
    const kwp  = st.dimensionamento?.potenciaInstaladaRealKWp?.toFixed(2) ?? '';
    const preco = st.precificacao?.precoVenda
      ? `R$ ${st.precificacao.precoVenda.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '';
    const msg = encodeURIComponent(
      `Olá ${nome}! Segue a proposta do sistema fotovoltaico de ${kwp} kWp` +
      `${preco ? ` no valor de ${preco}` : ''}.\n\nGerado pelo LumenSolar — Lumen Soluções Engenharia.`
    );
    const url = tel ? `https://wa.me/55${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }

  async function enviarEmailComPDF() {
    const st = useProjetoStore.getState();
    if (!st.dimensionamento) { alert('Calcule o projeto antes de enviar o email.'); return; }
    setGerando(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PropostaComercialPDF } = await import('@domain/proposta/PropostaComercialPDF');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const blob = await pdf(<PropostaComercialPDF data={buildData()} />).toBlob();
      // BUG CORRIGIDO (set/2026): este bloco convertia o PDF para base64 via
      // FileReader e nunca usava o resultado em lugar nenhum — mailto: não
      // suporta anexar arquivo (limitação real do protocolo/navegador, não
      // deste app), então essa conversão era trabalho jogado fora a cada
      // envio. Removida.
      const email = st.cliente.email || '';
      const nome  = st.cliente.nome  || 'cliente';
      const kwp   = st.dimensionamento?.potenciaInstaladaRealKWp?.toFixed(2) ?? '';
      const eco   = st.custosRecorrentes?.economiaMensalRS
        ? `R$ ${st.custosRecorrentes.economiaMensalRS.toFixed(2).replace('.',',')}` : '';
      const assunto = 'Proposta Energia Solar ' + kwp + ' kWp - Lumen Soluções';
      const nl = '\n';
      const corpo = [
        'Prezado(a) ' + nome + ',',
        '',
        'Segue em anexo a proposta comercial para instalação do sistema fotovoltaico de ' + kwp + ' kWp.',
        eco ? 'Economia estimada: ' + eco + '/mês.' : '',
        '',
        // CORRIGIDO (set/2026): faltava a crase — "ficar à disposição (de
        // alguém)" é regência com crase obrigatória ("a" preposição + "a"
        // artigo feminino de "disposição"), não "a disposição" sem crase.
        'Ficamos à disposição para esclarecimentos.',
        '',
        'Atenciosamente,',
        st.empresa.responsavelTecnico || 'Equipe Lumen Soluções',
        st.empresa.razaoSocial || 'Lumen Soluções Ltda',
        st.empresa.telefone || '',
      ].join(nl);
      const nomeArq = `Proposta_${(nome).replace(/\s+/g,'_')}.pdf`;

      if (!email) {
        alert('Cadastre o email do cliente na aba Cliente.');
        return;
      }
      // Salvar PDF localmente + abrir cliente de email
      const caminhoSalvo = await salvarPdfNativo(blob, nomeArq);
      const assuntoEnc = encodeURIComponent(assunto);
      const corpoEnc = encodeURIComponent(corpo + nl + nl + '[Anexe o PDF salvo em: ' + caminhoSalvo + ']');
      setTimeout(() => { window.location.href = `mailto:${email}?subject=${assuntoEnc}&body=${corpoEnc}`; }, 800);
      alert(`PDF salvo em:\n${caminhoSalvo}\n\nSeu cliente de email foi aberto para ${email}. Anexe o arquivo manualmente — mailto: não suporta anexo automático.`);
    } catch(e) { alert('Erro: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  function abrirEmail() { enviarEmailComPDF(); }

  function abrirBelenus() {
    window.open('https://belenus.com.br/energy', '_blank');
  }

  function abrirAldoSolar() {
    // BUG CORRIGIDO (ago/2026): domínio antigo 'aldosolar.com.br' não resolve mais
    // (falha de DNS, confirmado por busca — a empresa passou a operar em
    // 'aldo.com.br'). Encontrado ao investigar o mesmo relato do usuário sobre o
    // link da ANEEL falhando — aproveitei para checar os outros links externos do
    // app (Belenus segue resolvendo normalmente, sem alteração).
    window.open('https://www.aldo.com.br/categoria/energia-solar/gerador-de-energia-solar-fotovoltaico/on-grid', '_blank');
  }

  function abrirINMETRO() {
    const st = useProjetoStore.getState();
    const modelo = st.kit.modeloModulo || st.kit.marcaModulo || '';
    const url = modelo
      ? `https://www.inmetro.gov.br/crc/index.php?submit=Buscar&modelo=${encodeURIComponent(modelo)}`
      : 'https://www.inmetro.gov.br/crc/index.php';
    window.open(url, '_blank');
  }

  function abrirSolfacil() {
    // BUG CORRIGIDO (ago/2026): 'app.solfacil.com.br' hoje redireciona (302) para um
    // domínio de terceiro sem relação (solarinove.com.br) — confirmado por busca. O
    // simulador de financiamento real da Solfácil mudou para
    // financiamento.solfacil.com.br/simulation/new. O parâmetro `valor` de
    // pré-preenchimento não pôde ser confirmado nessa nova URL (formato do
    // simulador mudou), então foi removido em vez de arriscar um link quebrado —
    // o usuário preenche o valor manualmente no simulador.
    window.open('https://financiamento.solfacil.com.br/simulation/new', '_blank');
  }

  function abrirGoogleMaps() {
    const st = useProjetoStore.getState();
    const end = [
      st.localizacao?.enderecoInstalacao || st.cliente?.endereco,
      st.cliente?.cidade,
      st.cliente?.uf,
      'Brasil'
    ].filter(Boolean).join(', ');
    const url = `https://www.google.com/maps/search/${encodeURIComponent(end)}`;
    window.open(url, '_blank');
  }

  function abrirCEMIG() {
    // BUG CORRIGIDO (ago/2026): '/servicos/segunda-via-da-conta/' retorna 404 hoje —
    // caminho atual confirmado é '/como-solicitar-os-principais-servicos/
    // segunda-via-de-conta/'. Não há suporte a parâmetro `?uc=` documentado nessa
    // página (era uma suposição do código antigo), removido para não sugerir um
    // preenchimento automático que não existe.
    window.open('https://www.cemig.com.br/como-solicitar-os-principais-servicos/segunda-via-de-conta/', '_blank');
  }

  async function gerarCronograma() {
    setGerando(true);
    try {
      const { gerarCronograma: gc } = await import('@domain/excel/gerarCronograma');
      const { obterPastaDocumentos } = await import('./services/pastaDocumentos');
      const pastaDestino = await obterPastaDocumentos();
      const d = buildData();
      gc({
        nomeCliente: d.cliente?.nome || 'Cliente',
        enderecoInstalacao: [d.cliente?.endereco, d.cliente?.cidade, d.cliente?.uf].filter(Boolean).join(', '),
        dataInicio: new Date().toISOString().split('T')[0],
        potenciaKWp: d.dimensionamento?.potenciaInstaladaRealKWp || d.kit?.potenciaModuloWp * d.kit?.quantidade / 1000 || 0,
        numModulos: d.kit?.quantidade || 0,
        empresa: d.empresa?.razaoSocial || 'Lumen Soluções Ltda',
        responsavelTecnico: d.empresa?.responsavelTecnico || '',
        tipoSistema: (d.dimensionamento?.potenciaInstaladaRealKWp || 0) > 75 ? 'mini' : 'micro',
      }, pastaDestino);
    } catch(e) { alert('Erro ao gerar cronograma: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarFormularioCemig(silencioso = false) {
    setGerando(true);
    try {
      const { gerarFormularioCemigMicroGD, checklistDocumentosCEMIG } = await import('@domain/excel/gerarFormularioCemig');
      const { obterPastaDocumentos } = await import('./services/pastaDocumentos');
      const pastaDestino = await obterPastaDocumentos();
      const st = useProjetoStore.getState();
      const d = buildData();
      gerarFormularioCemigMicroGD(d, pastaDestino);
      st.marcarDocumentoGerado('formulario_microgd');
      // BUG CORRIGIDO (ago/2026): este alert() de resumo do checklist disparava
      // também dentro de "📦 Pacote Completo" — um popup a mais no meio de uma
      // sequência de 6 downloads, sem relação com o resumo único que o pacote já
      // mostra no final (ver gerarPacoteCompleto). Suprimido quando silencioso.
      if (!silencioso) {
        const lista = checklistDocumentosCEMIG(d);
        const pendentes = lista.filter(i => i.obrigatorio && i.status === 'pendente');
        const geradosApp = lista.filter(i => i.geradoPeloApp && i.obrigatorio);
        setTimeout(() => {
          alert(
            'Formulário CEMIG MicroGD gerado!\n\n' +
            '✅ Gerados pelo LumenSolar:\n' +
            geradosApp.map(i => '  • ' + i.doc).join('\n') +
            '\n\n📋 Ainda pendentes:\n' +
            pendentes.filter(i => !i.geradoPeloApp).map(i => '  • ' + i.doc).join('\n') +
            '\n\nContato CEMIG: geracaodistribuida@cemig.com.br | 0800 721 0167'
          );
        }, 500);
      }
    } catch(e) { if (silencioso) throw e; alert('Erro ao gerar formulário CEMIG: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarExcel(silencioso = false) {
    setGerando(true);
    try {
      const { gerarExcelAuditoria } = await import('@domain/excel/gerarExcel');
      const { obterPastaDocumentos } = await import('./services/pastaDocumentos');
      const pastaDestino = await obterPastaDocumentos();
      const st = useProjetoStore.getState();
      // BUG CORRIGIDO (ago/2026): único gerador de documento que não passa por
      // buildData() (que já ganhou este mesmo guard) — monta o payload direto
      // de useProjetoStore.getState(). Precisa do mesmo guard de desatualização,
      // senão o Excel escapava da proteção que todo o resto dos documentos tem.
      if (calculoDesatualizado(st)) {
        throw new Error(
          'Os dados de Cliente/Consumo/Kit/Empresa/Preço foram alterados depois do último cálculo. ' +
          'Volte à aba Preço e clique em "Calcular resultado completo" novamente antes de gerar o Excel.'
        );
      }
      // BUG CORRIGIDO (ago/2026): mesmo guard de cadastro de empresa incompleto
      // de `buildData()` — precisa estar duplicado aqui porque gerarExcel() é o
      // único gerador que não passa por buildData() (monta o payload direto do
      // store, ver comentário logo abaixo). Ver `domain/empresa/cadastroEmpresa.ts`.
      if (cadastroEmpresaIncompleto(st.empresa)) {
        throw new Error(mensagemCadastroEmpresaIncompleto(st.empresa));
      }
      gerarExcelAuditoria({
        empresa: st.empresa, cliente: st.cliente, consumo: st.consumo,
        localizacao: st.localizacao, kit: st.kit, preco: st.preco,
        dimensionamento: st.dimensionamento, custosRecorrentes: st.custosRecorrentes,
        precificacao: st.precificacao, indicadores: st.indicadores,
        resultadoGrupoA: st.resultadoGrupoA,
        // ADICIONADO (ago/2026): faltavam por completo — ver comentário "BUG
        // CORRIGIDO" no bloco "PROJEÇÃO FIO-B" de gerarExcel.ts.
        enquadramento: st.enquadramento, percentuaisFioBPorAno: st.percentuaisFioBPorAno,
      }, pastaDestino);
    } catch(e) { if (silencioso) throw e; alert('Erro ao gerar Excel: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarMemorial(silencioso = false) {
    setGerando(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { MemorialDescritivo } = await import('@domain/proposta/MemorialDescritivo');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const d = buildData();
      const blob = await pdf(<MemorialDescritivo data={d} />).toBlob();
      const nomeArquivo = 'Memorial_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
      useProjetoStore.getState().marcarDocumentoGerado('memorial_descritivo');
    } catch(e) {
      if (silencioso) throw e;
      alert('Erro ao gerar Memorial Descritivo: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarProcuracao(silencioso = false) {
    setGerando(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { Procuracao } = await import('@domain/proposta/Procuracao');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const d = buildData();
      const blob = await pdf(<Procuracao data={d} />).toBlob();
      const nomeArquivo = 'Procuracao_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
      useProjetoStore.getState().marcarDocumentoGerado('procuracao');
    } catch(e) {
      if (silencioso) throw e;
      alert('Erro ao gerar Procuração: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarDUB(silencioso = false) {
    setGerando(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { DiagramaUnifilarBasico } = await import('@domain/proposta/DiagramaUnifilarBasico');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const d = buildData();
      const blob = await pdf(<DiagramaUnifilarBasico data={d} />).toBlob();
      const nomeArquivo = 'DUB_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
      useProjetoStore.getState().marcarDocumentoGerado('dub');
    } catch(e) {
      if (silencioso) throw e;
      alert('Erro ao gerar DUB: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setGerando(false); }
  }

  async function gerarPlantaSituacao(silencioso = false) {
    setGerando(true);
    try {
      const { montarMosaicoSatelite } = await import('./services/satelliteMosaic');
      const { PlantaDeSituacao } = await import('@domain/proposta/PlantaDeSituacao');
      const d = buildData();
      const endereco = [d.cliente.endereco, d.cliente.cidade, d.cliente.uf].filter(Boolean).join(', ');
      if (!endereco.trim()) {
        const msg = 'Preencha ao menos cidade/UF do cliente (passo Cliente) antes de gerar a Planta de Situação — ela precisa localizar o endereço no mapa.';
        if (silencioso) throw new Error(msg);
        alert(msg);
        return;
      }
      const { pdf } = await import('@react-pdf/renderer');
      const { salvarPdfNativo } = await import('./services/pastaDocumentos');
      const mosaico = await montarMosaicoSatelite(endereco);
      const blob = await pdf(<PlantaDeSituacao data={d} mosaico={mosaico} />).toBlob();
      const nomeArquivo = 'PlantaSituacao_' + (s.cliente.nome||'Cliente').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
      await salvarPdfNativo(blob, nomeArquivo);
      useProjetoStore.getState().marcarDocumentoGerado('planta_situacao');
    } catch(e) {
      // BUG CORRIGIDO (ago/2026): esta função nunca relançava — quando chamada
      // de dentro de "📦 Pacote Completo", o `try{}catch{}` vazio ao redor dela
      // achava que qualquer falha aqui já tinha sido "avisada" (o alert() abaixo
      // de fato dispara), mas a Planta continuava contando como "concluída" no
      // pacote, sem entrar no resumo final. Depende de rede (busca tile de
      // satélite) — é o passo com maior chance real de falhar do pacote inteiro,
      // e era o único cujo erro o usuário não via resumido no final.
      if (silencioso) throw e;
      alert('Erro ao gerar Planta de Situação: ' + (e instanceof Error ? e.message : String(e)) + '\n\nVerifique sua conexão com a internet — este documento busca uma imagem de satélite pública (Esri World Imagery, sem necessidade de chave de API).');
    } finally { setGerando(false); }
  }

  async function gerarPacoteCompleto() {
    // BUG CORRIGIDO (ago/2026): auditoria de rotinas encontrou que NENHUM dos 6
    // passos abaixo relançava erro (cada um só fazia alert() + return dentro do
    // próprio catch) — então uma única causa raiz (ex.: cadastro de empresa
    // incompleto, ou dados desatualizados) disparava o MESMO alert() bloqueante
    // até 6 vezes seguidas (uma por documento), sem nunca mostrar um resumo do
    // que realmente funcionou. Agora cada passo roda em modo silencioso (lança
    // em vez de alertar), o pacote coleta o resultado de cada um, e mostra UM
    // resumo só no final — sucesso e falha por documento, causa raiz de cada
    // falha incluída.
    setGerando(true);
    const passos: { nome: string; rodar: () => Promise<void> }[] = [
      { nome: 'Proposta Comercial', rodar: () => gerarPDFCliente(true) },
      { nome: 'Memorial Descritivo', rodar: () => gerarMemorial(true) },
      { nome: 'Procuração', rodar: () => gerarProcuracao(true) },
      { nome: 'DUB', rodar: () => gerarDUB(true) },
      { nome: 'Formulário CEMIG', rodar: () => gerarFormularioCemig(true) },
      { nome: 'Planta de Situação', rodar: () => gerarPlantaSituacao(true) },
      { nome: 'Excel de Auditoria', rodar: () => gerarExcel(true) },
    ];
    const resultados: { nome: string; ok: boolean; erro?: string }[] = [];
    try {
      for (const passo of passos) {
        try {
          await passo.rodar();
          resultados.push({ nome: passo.nome, ok: true });
        } catch (e) {
          resultados.push({ nome: passo.nome, ok: false, erro: e instanceof Error ? e.message : String(e) });
        }
      }
    } finally {
      setGerando(false);
    }
    const falhas = resultados.filter(r => !r.ok);
    const sucessos = resultados.filter(r => r.ok);
    if (falhas.length === 0) {
      alert(`Pacote completo gerado! ${sucessos.length}/${resultados.length} documentos baixados com sucesso.`);
    } else {
      alert(
        `Pacote completo: ${sucessos.length}/${resultados.length} documentos gerados.\n\n` +
        (sucessos.length ? '✅ Gerados:\n' + sucessos.map(r => '  • ' + r.nome).join('\n') + '\n\n' : '') +
        '❌ Falharam:\n' + falhas.map(r => `  • ${r.nome}: ${r.erro}`).join('\n')
      );
    }
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
    <div>
      {/* BUG CORRIGIDO (ago/2026): aviso de dados desatualizados — ver
          `calculoDesatualizado`/`ultimoCalculoAssinatura`. Mostrado assim que
          Cliente/Consumo/Kit/Empresa/Preço mudam depois do último cálculo;
          os botões de documento abaixo também bloqueiam (buildData()/
          gerarExcel() lançam erro) até recalcular. */}
      {desatualizado && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', background: '#3a1414',
          border: '1px solid #dc2626', borderRadius: 8, color: '#fca5a5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>
            ⚠️ <strong>Dados desatualizados</strong> — Cliente/Consumo/Kit/Empresa/Preço foram alterados
            depois do último cálculo. Os números abaixo (e qualquer documento gerado agora) não refletem
            os dados atuais do projeto.
          </span>
          <Btn onClick={() => { try { useProjetoStore.getState().calcularTudo(); } catch (e) { alert('Erro ao recalcular: ' + (e instanceof Error ? e.message : String(e))); } }}>
            🔄 Recalcular agora
          </Btn>
        </div>
      )}
      {/* BUG CORRIGIDO (ago/2026): antes disto, o único aviso de cadastro de
          empresa incompleto ficava dentro do PDF da Procuração, depois de já
          gerado. Usuário relatou o caso real (engenheiro saindo em branco na
          Procuração) e foi direto: documento nenhum deve sair com campo
          vazio. A geração agora é bloqueada de verdade (buildData()/
          gerarExcel() lançam erro — ver `domain/empresa/cadastroEmpresa.ts`);
          este banner avisa ANTES de clicar em qualquer botão de documento,
          em vez do usuário só descobrir pelo alert() de erro. */}
      {empresaIncompleta && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', background: '#3a1414',
          border: '1px solid #dc2626', borderRadius: 8, color: '#fca5a5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>
            ⚠️ <strong>Cadastro da empresa incompleto</strong> — Responsável Técnico, CREA e/ou CNPJ não
            preenchidos. Nenhum documento pode ser gerado até isso ser corrigido — a Procuração e o
            Formulário CEMIG dependem desses dados para identificar o outorgado/engenheiro responsável.
          </span>
          <Btn onClick={onEmpresa}>⚙ Abrir Configurações</Btn>
        </div>
      )}
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 2 }}>{s.cliente.nome || 'Resultado'}</h1>
        <p style={{ fontSize: 13, color: D.textMuted }}>{s.cliente.cidade}{s.cliente.cidade && s.cliente.uf ? ` · ${s.cliente.uf}` : s.cliente.uf}</p>
      </div>

      {/* KPIs principais — linha única */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:16 }}>
        <KPI label="Potência instalada" val={`${fmtNum(dim.potenciaInstaladaRealKWp)} kWp`} sub={`${dim.numeroModulos} módulos`} color={D.text} />
        <KPI label="Geração mensal" val={`${fmtNum(dim.geracaoMensalEstimadaKWh, 0)} kWh`} sub={`${fmtNum(dim.percentualCompensacaoReal*100,0)}% de compensação`} />
        <KPI label="Economia mensal" val={fmtBRL(cr.economiaMensalRS)} sub={`${fmtBRL(cr.economiaMensalRS*12)}/ano`} color={D.success} />
        <KPI label="Preço à vista" val={fmtBRL(pre.precoVenda)} sub={`Payback: ${ind.paybackSimples}`} color={D.gold} />
      </div>

      <ChecklistDocumentacaoCard checklist={s.checklistDocumentacao} />

      {/* BUG CORRIGIDO (ago/2026): título e barra de 17 botões de ação (documentos +
          compartilhamento + links de terceiros, tudo misturado, sem rótulo) estavam
          lado a lado num mesmo flex row com justify-content:space-between e sem
          flexWrap na barra de botões. Numa tela comum (mesmo maximizada em Full HD)
          os botões sozinhos já passam de 1900px, e como o <div> do título não tinha
          flexShrink:0 nem minWidth, o layout flex encolhia ele até quase zero — nomes
          de cliente mais longos ("Ana Maria Vieira de Sá e Silva") quebravam palavra
          por palavra numa coluna estreitíssima. Corrigido: título isolado (acima), e
          a barra de ações movida para depois dos KPIs/checklist (resultado primeiro,
          ações depois) e reagrupada em 3 seções rotuladas — documentos gerados pelo
          app, compartilhamento com o cliente, e links de terceiros — em vez de uma
          lista plana de 17 botões sem hierarquia nenhuma. O bloco duplicado de 3
          botões (Proposta/Memorial/Procuração) que existia de novo lá embaixo, ao
          final da página, foi removido — pura repetição do que já está aqui. */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6f6d63', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Documentos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Btn onClick={gerarPDFCliente} disabled={gerando}>{gerando ? '⏳...' : '📄 Proposta'}</Btn>
              <Btn onClick={gerarMemorial}    disabled={gerando} variant="ghost">{gerando ? '⏳...' : '📋 Memorial'}</Btn>
              <Btn onClick={gerarProcuracao}  disabled={gerando} variant="ghost">{gerando ? '⏳...' : '✍ Procuração'}</Btn>
              <Btn onClick={gerarPDFTecnico}  disabled={gerando} variant="ghost">{gerando ? '⏳...' : '🔧 Técnica'}</Btn>
              <Btn onClick={gerarDUB} disabled={gerando} variant="ghost">{gerando ? '⏳...' : '⚡ DUB'}</Btn>
              <Btn onClick={gerarPlantaSituacao} disabled={gerando} variant="ghost">{gerando ? '⏳...' : '🛰️ Planta'}</Btn>
              <Btn onClick={gerarFormularioCemig} disabled={gerando} variant="ghost">📋 Form. CEMIG</Btn>
              <Btn onClick={gerarExcel}       disabled={gerando} variant="ghost">{gerando ? '⏳...' : '📊 Excel'}</Btn>
              <Btn onClick={gerarCronograma} disabled={gerando} variant="ghost">📅 Cronograma</Btn>
              <Btn onClick={gerarPacoteCompleto} disabled={gerando}>{gerando ? '⏳...' : '📦 Pacote Completo'}</Btn>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6f6d63', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Compartilhar com o cliente
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Btn onClick={abrirWhatsApp} variant="ghost">💬 WhatsApp</Btn>
              <Btn onClick={abrirEmail}   variant="ghost">📧 E-mail</Btn>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6f6d63', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Links úteis (sites de terceiros)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Btn onClick={abrirBelenus}  variant="ghost">🛒 Belenus</Btn>
              <Btn onClick={abrirSolfacil}  variant="ghost">💳 Solfácil</Btn>
              <Btn onClick={abrirGoogleMaps} variant="ghost">🗺️ Maps</Btn>
              <Btn onClick={abrirAldoSolar}  variant="ghost">☀️ Aldo Solar</Btn>
              <Btn onClick={abrirINMETRO}    variant="ghost">🏷️ INMETRO</Btn>
            </div>
          </div>
        </div>
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
                      <div title={`Consumo: ${fmtNum(cons,0)} kWh`} style={{ flex: 1, background: '#a39c8a', borderRadius: '3px 3px 0 0', height: `${(cons/maxGen)*100}%`, minHeight: 2 }} />
                      <div title={`Geração: ${fmtNum(gen,0)} kWh`} style={{ flex: 1, background: D.gold, borderRadius: '3px 3px 0 0', height: `${(gen/maxGen)*100}%`, minHeight: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: D.textMuted }}>{mes}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: D.textMuted }}>
              <span><span style={{ display:'inline-block', width:10, height:10, background:'#a39c8a', borderRadius:2, marginRight:4 }}></span>Consumo</span>
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
            {(ind.pesoDistribuidoKgM2 ?? 0) > 12 && (
              <div style={{ fontSize:11, color:'#f59e0b', padding:'4px 0', lineHeight:1.5 }}>
                ⚠️ Carga estrutural acima de 12 kg/m² — confirme com laudo de engenharia civil antes de instalar.
              </div>
            )}
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
                      {(() => {
                        const anoAtual = new Date().getFullYear();
                        return [anoAtual, anoAtual+1, anoAtual+2, anoAtual+3, 2029, 2030].filter((v,i,a) => a.indexOf(v)===i && v<=2035);
                      })().map(ano => {
                        // BUG CORRIGIDO (ago/2026): esta tabela reimplementava o cálculo de custo do
                        // Fio B com a mesma fórmula que já tinha sido corrigida em PropostaPDF.tsx
                        // (ver comentário lá) mas o fix não tinha sido propagado para cá — mesma
                        // classe de bug (UI divergindo do módulo de domínio) encontrada e corrigida
                        // várias vezes nesta auditoria. Usava geracaoMensalEstimadaKWh (energia total
                        // gerada) em vez da energia efetivamente compensada (min(geração, consumo) —
                        // mesma regra de calcularCustos.ts), e fração de tarifa do Fio B hardcoded em
                        // 0.35 em vez de empresa.fracaoTarifaFioB (configurável). Para sistemas
                        // superdimensionados isso superestimava o custo futuro do Fio B mostrado ao
                        // cliente em até ~50%.
                        const distrib = DISTRIBUIDORAS.find(d => d.codigo === s.consumo.codigoDistribuidora) ?? DISTRIBUIDORAS[0];
                        const energiaCompensadaKWh = Math.min(dim.geracaoMensalEstimadaKWh, s.consumoMedioMensalKWh ?? dim.geracaoMensalEstimadaKWh);
                        const custo = energiaCompensadaKWh * distrib.tarifaKWhComICMS * (s.empresa.fracaoTarifaFioB ?? 0.35) * (pfb[ano] ?? 1);
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

      <div style={{ marginTop: 16 }}>
        <Btn onClick={onPrev} variant="ghost">← Editar</Btn>
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
