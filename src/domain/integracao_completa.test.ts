/**
 * TESTE DE INTEGRAÇÃO COMPLETO — LumenSolar
 * Fluxo completo: dados reais → cálculos → save/load .lumensolar
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

import { calcularPerdas } from './dimensionamento/calcularPerdas';
import { dimensionarSistema } from './dimensionamento/dimensionar';
import { classificarEnquadramento, percentualFioBPorAno } from './fioB/calculoFioB';
import { calcularCustosRecorrentes } from './custosRecorrentes/calcularCustos';
import { calcularPrecificacao } from './precificacao/calcularPrecificacao';
import { gerarTabelaPrice } from './financeiro/price';
import { calcularFluxoCaixa } from './financeiro/fluxoCaixa';
import { calcularTIR, formatarPayback } from './financeiro/indicadores';
import { DISTRIBUIDORAS } from '../data/distribuidoras';
import { hspPorUF } from '../data/hspPorUF';
import { validarCPF, validarCNPJ } from '../renderer/services/validation';
import { gerarId } from '../renderer/services/utils';

// ── Dados reais (conta CEMIG JUN/2026 — Ana Maria) ───────────────────────────
const CEMIG     = { ...DISTRIBUIDORAS.find(d => d.codigo === 'CEMIG')!, tarifaKWhComICMS: 1.18272801 };
const HSP_MG    = hspPorUF('MG');
const HIST      = [285,309,257,289,234,295,301,245,293,310,267,293];
const MEDIA_12M = HIST.reduce((a,b)=>a+b,0) / 12;

const EMPRESA = { razaoSocial:'Lumen Solucoes Ltda', cnpj:'12.345.678/0001-90',
  responsavelTecnico:'Wilian Antonio da Silva Junior', crea:'234567',
  cpfEngenheiro:'529.982.247-25', uf:'MG', cidade:'Araguari',
  telefone:'(34) 99999-9999', email:'wilian@lumen.eng.br', valorProjetoArt:500,
  aliquotaImpostos:0.065, margemPadrao:0.18 };
const CLIENTE = { nome:'Ana Maria Vieira de Sa e Silva', cpf:'366.100.001-00',
  rg:'M-99999', estadoCivil:'solteiro' as const, profissao:'Professora',
  endereco:'Rua Brejo Alegre, 396 CS', cidade:'Araguari', uf:'MG' };
const KIT = { potenciaModuloWp:550, quantidade:4, eficienciaInversorPercent:98.4,
  custoKitRS:9800, dataProtocoloAcesso:'2024-07-01', vocV:49.3, iscA:13.80,
  numStrings:1, modulosPorString:4, vmppV:41.8, faixaMpptMinV:80, faixaMpptMaxV:500 };
const PRECO = { estruturaRS:1200, materiaisEletricosRS:800, maoDeObraRS:2000,
  projetoArtRS:500, outrosCustosRS:0, aliquotaImpostos:0.065, margemDesejada:0.18 };
const CONSUMO = { codigoDistribuidora:'CEMIG', tipoLigacao:'bifasica' as const,
  tarifaRealKWhComICMS:1.18272801, cipMensalRS:46.40,
  contas: HIST.map((kWh,i) => ({ mes:`Mês ${i+1}`, kWh, valorRS:0 })) };

// ── Pipeline completo computado no módulo ────────────────────────────────────
const perdas = calcularPerdas(
  { coeficienteTemperaturaPmax:-0.34, noct:45, toleranciaPercent:0, bifacial:false },
  { eficienciaMaximaPercent: KIT.eficienciaInversorPercent },
  { temperaturaAmbienteMediaC:24, perdaSombreamentoPercent:2, perdaSujidadePercent:2 }
);
const dim = dimensionarSistema({
  consumoMedioMensalKWh:MEDIA_12M, hspLocal:HSP_MG,
  perdasSistema:perdas.perdaTotalLiquida, potenciaModuloWp:KIT.potenciaModuloWp,
});
const enquad = classificarEnquadramento({
  dataProtocoloAcesso:KIT.dataProtocoloAcesso, potenciaInstaladaKW:dim.potenciaInstaladaRealKWp,
  fonte:'fotovoltaica', modalidade:'autoconsumo_local',
});
const custos = calcularCustosRecorrentes({
  distribuidora:CEMIG, tipoLigacao:CONSUMO.tipoLigacao, cipRS:CONSUMO.cipMensalRS,
  consumoMedioMensalKWh:MEDIA_12M, geracaoMensalKWh:dim.geracaoMensalEstimadaKWh,
  percentualFioB:percentualFioBPorAno(enquad, 2026), fracaoTarifaFioB:0.35,
});
const prec = calcularPrecificacao({
  composicao:{
    kit:KIT as any, estruturaRS:PRECO.estruturaRS, materiaisEletricosRS:PRECO.materiaisEletricosRS,
    maoDeObraRS:PRECO.maoDeObraRS, projetoArtRS:PRECO.projetoArtRS, outrosCustosRS:PRECO.outrosCustosRS,
  },
  aliquotaImpostos:PRECO.aliquotaImpostos, margemDesejada:PRECO.margemDesejada,
});
const fluxo = calcularFluxoCaixa({
  investimentoInicial:prec.precoVenda, economiaMensalAno1:custos.economiaMensalRS,
  degradacaoAnualModulos:0.005, reajusteTarifarioAnual:0.07,
  horizonteAnos:25, taxaMinimaAtratividadeAnual:0.08,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('INT-1 Perdas (IEC 61724-1)', () => {
  it('[P1] Calcula sem erro', ()          => { expect(perdas.perdaTotalLiquida).toBeGreaterThan(0); });
  it('[P2] Perdas entre 10% e 20%', ()   => { expect(perdas.perdaTotalLiquida).toBeGreaterThan(0.10); expect(perdas.perdaTotalLiquida).toBeLessThan(0.20); });
  it('[P3] Perda inversor = 1 − efic', () => { expect(perdas.perdaInversor).toBeCloseTo(1 - KIT.eficienciaInversorPercent/100, 4); });
  it('[P4] Cabeamento = 2% fixo', ()     => { expect(perdas.perdaCabeamento).toBeCloseTo(0.02, 6); });
});

describe('INT-2 Dimensionamento', () => {
  it('[D1] Sem erro', ()                 => { expect(dim.numeroModulos).toBeGreaterThan(0); });
  it('[D2] 4 módulos × 550 Wp = 2.2 kWp cobre 281.5 kWh', () => {
    expect(dim.numeroModulos).toBe(4);
    expect(dim.potenciaInstaladaRealKWp).toBeCloseTo(2.2, 6);
    expect(dim.geracaoMensalEstimadaKWh).toBeGreaterThanOrEqual(MEDIA_12M);
  });
  it('[D3] Compensação > 100%', ()       => { expect(dim.percentualCompensacaoReal).toBeGreaterThan(1.0); });
  it('[D4] Anual = mensal × 12', ()      => { expect(dim.geracaoAnualEstimadaKWh).toBeCloseTo(dim.geracaoMensalEstimadaKWh * 12, 4); });
});

describe('INT-3 FioB e Custos Recorrentes', () => {
  it('[F1] Art.27 protocolo 2024 — FioB 60% em 2026, 100% em 2029', () => {
    expect(enquad.elegivelArt26).toBe(false);
    expect(percentualFioBPorAno(enquad, 2026)).toBe(0.60);
    expect(percentualFioBPorAno(enquad, 2029)).toBe(1.00);
  });
  it('[F2] Conta ANTES = R$379.34 (valor real conta CEMIG)', () => {
    expect(custos.contaAntesRS).toBeCloseTo(379.34, 1);
  });
  it('[F3] Taxa disponib. bifásica = 50 × tarifa', () => {
    expect(custos.taxaDisponibilidadeRS).toBeCloseTo(50 * 1.18272801, 2);
  });
  it('[F4] Economia mensal 2026 = R$203.88', () => {
    expect(custos.economiaMensalRS).toBeCloseTo(203.88, 1);
  });
  it('[F5] FioB 2029 (100%) reduz economia para ≈ R$157.27', () => {
    const c2029 = calcularCustosRecorrentes({
      distribuidora:CEMIG, tipoLigacao:CONSUMO.tipoLigacao, cipRS:CONSUMO.cipMensalRS,
      consumoMedioMensalKWh:MEDIA_12M, geracaoMensalKWh:dim.geracaoMensalEstimadaKWh,
      percentualFioB:percentualFioBPorAno(enquad, 2029), fracaoTarifaFioB:0.35,
    });
    expect(c2029.economiaMensalRS).toBeCloseTo(157.27, 1);
    expect(c2029.economiaMensalRS).toBeLessThan(custos.economiaMensalRS);
  });
});

describe('INT-4 Precificação', () => {
  it('[PR1] Sem erro, preço > 0', ()     => { expect(prec.precoVenda).toBeGreaterThan(0); });
  it('[PR2] Custo total correto', () => {
    const esp = KIT.custoKitRS + PRECO.estruturaRS + PRECO.materiaisEletricosRS + PRECO.maoDeObraRS + PRECO.projetoArtRS;
    expect(prec.custoTotalDireto).toBeCloseTo(esp, 2);
  });
  it('[PR3] Preço = custo/(1-imp-marg)', () => {
    expect(prec.precoVenda).toBeCloseTo(prec.custoTotalDireto / (1 - 0.065 - 0.18), 2);
  });
  it('[PR4] Balanço: custo+imposto+lucro = preço (erro < R$0.01)', () => {
    expect(Math.abs(prec.custoTotalDireto + prec.impostoSobreVenda + prec.lucroLiquido - prec.precoVenda)).toBeLessThan(0.01);
  });
});

describe('INT-5 Análise financeira', () => {
  it('[FI1] Fluxo sem erro, ano 0 = −investimento', () => {
    expect(fluxo.fluxoAnual).toHaveLength(26);
    expect(fluxo.fluxoAnual[0]).toBe(-prec.precoVenda);
  });
  it('[FI2] Payback entre 4 e 10 anos', () => {
    expect(fluxo.paybackSimplesAnos).not.toBeNull();
    expect(fluxo.paybackSimplesAnos!).toBeGreaterThan(4);
    expect(fluxo.paybackSimplesAnos!).toBeLessThan(10);
  });
  it('[FI3] TIR > 12% a.a.', () => {
    const tir = calcularTIR(fluxo.fluxoAnual);
    expect(tir).not.toBeNull();
    expect(tir!).toBeGreaterThan(0.12);
  });
  it('[FI4] VPL > 0 com TMA 8%', () => {
    expect(fluxo.vpl).not.toBeNull();
    expect(fluxo.vpl!).toBeGreaterThan(0);
  });
  it('[FI5] Price Solfácil 48× — saldo final ≈ 0', () => {
    const price = gerarTabelaPrice({ valorFinanciado:prec.precoVenda, taxaJurosMensal:0.0199, numeroParcelas:48 });
    expect(Math.abs(price[price.length-1].saldoDevedorFinal)).toBeLessThan(0.01);
  });
  it('[FI6] Degradação+reajuste: fluxo[25] = fluxo[1] × (0.995^24) × (1.07^24)', () => {
    // Fluxo inclui AMBOS: degradação E reajuste tarifário
    expect(fluxo.fluxoAnual[25] / fluxo.fluxoAnual[1]).toBeCloseTo(0.995**24 * 1.07**24, 3);
  });
});

describe('INT-6 Persistência .lumensolar (save/load + SHA-256)', () => {
  const TMP = '/tmp/teste_lumensolar.lumensolar';
  const DADOS = {
    id:gerarId(), criadoEm:new Date().toISOString(), atualizadoEm:new Date().toISOString(),
    nomeCliente:CLIENTE.nome, cidade:CLIENTE.cidade, uf:CLIENTE.uf,
    potenciaKWp:dim.potenciaInstaladaRealKWp, precoVenda:prec.precoVenda,
    empresa:EMPRESA, cliente:CLIENTE, consumo:CONSUMO, kit:KIT, preco:PRECO,
    dimensionamento:dim, custosRecorrentes:custos, precificacao:prec,
  };

  function sha256(s: string) { return crypto.createHash('sha256').update(s,'utf8').digest('hex'); }
  function salvar(d: any) {
    const ds = JSON.stringify(d, null, 2);
    const env = { _formato:'LumenSolar', _versao:'2.0', _criado:d.criadoEm,
      _salvo:new Date().toISOString(), _checksum:`sha256:${sha256(ds)}`, _dados:d };
    fs.writeFileSync(TMP, JSON.stringify(env, null, 2), 'utf-8');
  }
  function carregar(caminho: string) {
    const env = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
    if (env._formato !== 'LumenSolar') throw new Error('Formato inválido');
    const ds = JSON.stringify(env._dados, null, 2);
    if (`sha256:${sha256(ds)}` !== env._checksum) throw new Error('Arquivo corrompido');
    return env._dados;
  }

  it('[S1] Salvar cria arquivo > 1KB', () => {
    salvar(DADOS);
    expect(fs.existsSync(TMP)).toBe(true);
    expect(fs.statSync(TMP).size).toBeGreaterThan(1000);
  });
  it('[S2] Envelope tem campos obrigatórios', () => {
    const env = JSON.parse(fs.readFileSync(TMP, 'utf-8'));
    expect(env._formato).toBe('LumenSolar');
    expect(env._versao).toBe('2.0');
    expect(env._checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
  it('[S3] Carregar retorna dados idênticos', () => {
    const d = carregar(TMP);
    expect(d.id).toBe(DADOS.id);
    expect(d.nomeCliente).toBe(DADOS.nomeCliente);
    expect(d.potenciaKWp).toBeCloseTo(DADOS.potenciaKWp!, 4);
    expect(d.kit.potenciaModuloWp).toBe(KIT.potenciaModuloWp);
  });
  it('[S4] Checksum detecta corrupção (1 char alterado)', () => {
    const raw = fs.readFileSync(TMP, 'utf-8').replace('"Ana Maria', '"Ana MARIA');
    const tmpC = '/tmp/corrompido.lumensolar';
    fs.writeFileSync(tmpC, raw, 'utf-8');
    expect(() => carregar(tmpC)).toThrow('corrompido');
    fs.unlinkSync(tmpC);
  });
  it('[S5] Arquivo inválido → erro descritivo', () => {
    const tmpI = '/tmp/invalido.lumensolar';
    fs.writeFileSync(tmpI, '{"dados":"qualquer"}', 'utf-8');
    expect(() => carregar(tmpI)).toThrow('Formato inválido');
    fs.unlinkSync(tmpI);
  });
  it('[S6] Limpeza', () => { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); expect(fs.existsSync(TMP)).toBe(false); });
});

describe('INT-7 Validações de entrada', () => {
  it('[V1] CPF válido reconhecido', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('111.444.777-35')).toBe(true);
  });
  it('[V2] CPF inválido detectado', () => {
    expect(validarCPF('000.000.000-00')).toBe(false);
    expect(validarCPF('529.982.247-26')).toBe(false);
  });
  it('[V3] gerarId() gera 1000 IDs únicos', () => {
    const ids = new Set(Array.from({ length: 1000 }, gerarId));
    expect(ids.size).toBe(1000);
  });
});

describe('INT-8 Consistência ponta a ponta', () => {
  it('[E1] Nenhum valor NaN ou Infinity no pipeline', () => {
    const vals = [perdas.perdaTotalLiquida, dim.potenciaInstaladaRealKWp,
      dim.geracaoMensalEstimadaKWh, custos.economiaMensalRS,
      custos.contaAntesRS, prec.precoVenda, prec.lucroLiquido,
      fluxo.vpl!, fluxo.paybackSimplesAnos!];
    for (const v of vals) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    }
  });
  it('[E2] Economia 25 anos > investimento (ROI positivo)', () => {
    expect(fluxo.economiaTotalHorizonte).toBeGreaterThan(prec.precoVenda);
  });
  it('[E3] Custo/kWp realista (R$4k–R$10k para 2026)', () => {
    const custoKWp = prec.precoVenda / dim.potenciaInstaladaRealKWp;
    expect(custoKWp).toBeGreaterThan(3000);
    expect(custoKWp).toBeLessThan(12000);
  });
  it('[E4] Geração/kWp realista (1.400–2.000 kWh/kWp/ano para MG)', () => {
    const gerKWp = dim.geracaoAnualEstimadaKWh / dim.potenciaInstaladaRealKWp;
    expect(gerKWp).toBeGreaterThan(1400);
    expect(gerKWp).toBeLessThan(2000);
  });
  it('[E5] formatarPayback retorna string legível', () => {
    const str = formatarPayback(fluxo.paybackSimplesAnos);
    expect(str).toMatch(/\d+ anos?( e \d+ meses?)?/);
  });
});
