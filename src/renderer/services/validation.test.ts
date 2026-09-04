/**
 * Testes dos serviços de validação e persistência.
 * Não testa IPC (requer Electron), mas testa toda a lógica de validação.
 */

import { describe, expect, it } from 'vitest';
import {
  validarCliente, validarConsumo, validarKit, validarPreco,
  validarProjetoCompleto,
} from './validation';
import { gerarId } from './utils';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const clienteCompleto = { nome:'João Silva', cpf:'123.456.789-00', rg:'M-123456', estadoCivil:'solteiro' as const, profissao:'Engenheiro', endereco:'Rua A, 123', telefone:'(34)99999-9999', email:'j@j.com', cidade:'Araguari', uf:'MG' };
const clienteVazio    = { nome:'', cpf:'', rg:'', estadoCivil:'solteiro' as const, profissao:'', endereco:'', telefone:'', email:'', cidade:'', uf:'MG' };

const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const contas12 = meses.map((mes, i) => ({ mes, kWh: 280 + i*5, valorRS: 350 + i*6 }));
const contas2  = meses.map((mes, i) => ({ mes, kWh: i < 2 ? 280 : 0, valorRS: i < 2 ? 350 : 0 }));
const contas0  = meses.map(mes => ({ mes, kWh: 0, valorRS: 0 }));

const consumoCompleto = { contas: contas12, codigoDistribuidora:'CEMIG', tipoLigacao:'bifasica' as const, cipMensalRS:46.40, tarifaRealKWhComICMS:1.1827 };
const consumoVazio    = { contas: contas0,  codigoDistribuidora:'CEMIG', tipoLigacao:'monofasica' as const, cipMensalRS:18, tarifaRealKWhComICMS:0 };
const consumo2meses   = { contas: contas2,  codigoDistribuidora:'CEMIG', tipoLigacao:'monofasica' as const, cipMensalRS:18, tarifaRealKWhComICMS:0 };

const kitCompleto  = { tipoModulo:'bifacial_ntype' as const, marcaModulo:'Leapton', modeloModulo:'LP182M72H-595M', potenciaModuloWp:595, quantidade:8, marcaInversor:'Growatt', modeloInversor:'MIN 6000TL-X2', potenciaInversorKW:6, custoKitRS:12500, eficienciaInversorPercent:98.4, dataProtocoloAcesso:'2024-07-01', vmppV:45.1, imppA:13.2, vocV:53.8, iscA:14.0, comprimentoMm:2278, larguraMm:1134, pesoKgModulo:28, certificacoes:'INMETRO, IEC 61215', garantiaProdutoAnos:12, garantiaPotenciaAnos:25, potenciaGarantidaPercent:80, numStrings:1, modulosPorString:8, faixaMpptMinV:80, faixaMpptMaxV:550, tensaoMaxEntradaV:600, tensaoSaidaV:220, corrMaxSaidaA:27.3, numMppt:2, ipGabinete:'IP65', fatorPotencia:'>0.99', thd:'<3%' };
const kitVazio     = { ...kitCompleto, marcaModulo:'', potenciaModuloWp:0, quantidade:0, marcaInversor:'', potenciaInversorKW:0, custoKitRS:0 };
const kitParcial   = { ...kitCompleto, marcaModulo:'Leapton', quantidade:0, custoKitRS:0 };

const precoCompleto = { estruturaRS:1200, materiaisEletricosRS:800, maoDeObraRS:2000, projetoArtRS:500, outrosCustosRS:0, aliquotaImpostos:0.06, margemDesejada:0.15 };
// Mesmos valores-padrão de DADOS_EMPRESA_PADRAO (src/data/empresa.ts) — estado
// real da store sempre tem `empresa` preenchido (nunca undefined na prática).
const empresaCompleta = { taxaOutroFinanciamento: 0.0299, parcelasOutroFinanciamento: 18, descricaoOutroFinanciamento: 'Cartão 18×' };
const precoInvalido = { ...precoCompleto, aliquotaImpostos:0.50, margemDesejada:0.60 }; // soma >= 1

// ═══════════════════════════════════════════════════════════════════════════════
describe('Validação — Cliente', () => {
  it('[V01] Cliente completo → status = completo, sem erros', () => {
    const r = validarCliente(clienteCompleto);
    expect(r.status).toBe('completo');
    expect(r.erros).toHaveLength(0);
  });

  it('[V02] Cliente vazio → status = vazio', () => {
    const r = validarCliente(clienteVazio);
    expect(r.status).toBe('vazio');
    expect(r.erros.some(e => e.campo === 'nome')).toBe(true);
  });

  it('[V03] Cliente com só o nome → status = parcial', () => {
    const r = validarCliente({ ...clienteVazio, nome: 'João' });
    expect(r.status).toBe('parcial');
  });

  it('[V04] Nome com espaços apenas → inválido', () => {
    const r = validarCliente({ ...clienteVazio, nome: '   ' });
    expect(r.erros.some(e => e.campo === 'nome')).toBe(true);
  });

  it('[V05] Cidade obrigatória — cliente sem cidade → erro', () => {
    const r = validarCliente({ ...clienteCompleto, cidade: '' });
    expect(r.erros.some(e => e.campo === 'cidade')).toBe(true);
    expect(r.status).not.toBe('completo');
  });

  it('[V06] UF sempre tem valor — não deve aparecer como erro', () => {
    const r = validarCliente({ ...clienteCompleto, uf: 'MG' });
    expect(r.erros.some(e => e.campo === 'uf')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Validação — Consumo', () => {
  it('[V07] 12 meses preenchidos → status = completo', () => {
    const r = validarConsumo(consumoCompleto);
    expect(r.status).toBe('completo');
    expect(r.erros).toHaveLength(0);
  });

  it('[V08] 0 meses preenchidos → status = vazio', () => {
    const r = validarConsumo(consumoVazio);
    expect(r.status).toBe('vazio');
    expect(r.erros.some(e => e.campo === 'contas')).toBe(true);
  });

  it('[V09] 2 meses preenchidos (< 3) → status = parcial', () => {
    const r = validarConsumo(consumo2meses);
    expect(r.status).toBe('parcial');
    expect(r.erros[0].mensagem).toContain('2/3');
  });

  it('[V10] Exatamente 3 meses → status = completo (mínimo aceito)', () => {
    const contas3 = meses.map((mes,i) => ({ mes, kWh: i<3?280:0, valorRS:i<3?350:0 }));
    const r = validarConsumo({ ...consumoCompleto, contas: contas3 });
    expect(r.status).toBe('completo');
  });

  it('[V11] CIP negativo → erro de validação', () => {
    const r = validarConsumo({ ...consumoCompleto, cipMensalRS: -10 });
    expect(r.erros.some(e => e.campo === 'cip')).toBe(true);
  });

  // [REGRESSÃO ago/2026] Havia dois `if` idênticos checando `cipMensalRS < 0`
  // em `validarConsumo`, empurrando o MESMO erro duas vezes — o usuário via
  // "CIP/COSIP não pode ser negativo" listado 1. e 2. no alerta. O teste V11
  // acima usa `.some(...)`, que não detecta duplicatas; este exige exatamente
  // UM erro de campo 'cip'.
  it('[V11b] CIP negativo → exatamente UM erro de campo "cip" (não duplicado)', () => {
    const r = validarConsumo({ ...consumoCompleto, cipMensalRS: -10 });
    expect(r.erros.filter(e => e.campo === 'cip').length).toBe(1);
  });

  it('[V12] CIP = 0 → válido (município pode não cobrar)', () => {
    const r = validarConsumo({ ...consumoCompleto, cipMensalRS: 0 });
    expect(r.erros.some(e => e.campo === 'cip')).toBe(false);
  });

  // ADICIONADO (set/2026, auditoria "rode com valores absurdos"): cliente
  // Grupo A (média tensão) tinha ZERO validação dos campos que só ele usa
  // (histórico Ponta/Fora Ponta, tarifas TE, demanda contratada/tarifa de
  // demanda) — marcar "Grupo A" e calcular sem preencher nada passava direto
  // (só os campos de Grupo B, já cobertos acima, eram checados), produzindo
  // um ResultadoGrupoA inteiramente zerado sem nenhum aviso. Ver comentário
  // completo em validarConsumo (validation.ts) e o teste irmão em
  // calcularGrupoA.test.ts.
  describe('Grupo A (média tensão) — campos próprios exigidos', () => {
    const consumoGrupoAVazio = {
      ...consumoCompleto, // Grupo B continua exigido mesmo p/ cliente Grupo A — ver comentário em validation.ts
      grupoTensao: 'A',
      historicoFP: [], historicoP: [],
      tePontaKWh: 0, teForaPontaKWh: 0, demandaContratadaKW: 0, tarifaDemandaKW: 0,
    };
    const consumoGrupoACompleto = {
      ...consumoCompleto,
      grupoTensao: 'A',
      historicoFP: [1000, 1050, 980, 0,0,0,0,0,0,0,0,0],
      historicoP: [200, 210, 195, 0,0,0,0,0,0,0,0,0],
      tePontaKWh: 0.60, teForaPontaKWh: 0.40,
      demandaContratadaKW: 100, tarifaDemandaKW: 20,
    };

    it('grupoTensao "A" sem nenhum campo Grupo A preenchido → 4 erros distintos (histórico FP, histórico P, TE Ponta, TE Fora Ponta, demanda contratada, tarifa de demanda)', () => {
      const r = validarConsumo(consumoGrupoAVazio);
      expect(r.erros.some(e => e.campo === 'historicoFP')).toBe(true);
      expect(r.erros.some(e => e.campo === 'historicoP')).toBe(true);
      expect(r.erros.some(e => e.campo === 'tePontaKWh')).toBe(true);
      expect(r.erros.some(e => e.campo === 'teForaPontaKWh')).toBe(true);
      expect(r.erros.some(e => e.campo === 'demandaContratadaKW')).toBe(true);
      expect(r.erros.some(e => e.campo === 'tarifaDemandaKW')).toBe(true);
    });

    it('grupoTensao "A" com todos os campos Grupo A preenchidos (e Grupo B também) → completo, sem erros', () => {
      const r = validarConsumo(consumoGrupoACompleto);
      expect(r.status).toBe('completo');
      expect(r.erros).toHaveLength(0);
    });

    it('grupoTensao "A" com Grupo B completo mas histórico Grupo A com só 2 meses (< 3) → erro específico com contagem', () => {
      const r = validarConsumo({
        ...consumoGrupoACompleto,
        historicoFP: [1000, 1050, 0,0,0,0,0,0,0,0,0,0], // só 2 meses válidos
      });
      const erroFP = r.erros.find(e => e.campo === 'historicoFP');
      expect(erroFP?.mensagem).toContain('2/3');
    });

    it('grupoTensao "B" (padrão) NÃO exige nenhum campo Grupo A — continua se comportando exatamente como antes', () => {
      const r = validarConsumo({ ...consumoCompleto, grupoTensao: 'B' });
      expect(r.status).toBe('completo');
      expect(r.erros).toHaveLength(0);
    });

    it('grupoTensao ausente (undefined) — mesma compatibilidade retroativa de "B" (não exige campos Grupo A)', () => {
      const r = validarConsumo(consumoCompleto); // consumoCompleto não define grupoTensao
      expect(r.status).toBe('completo');
      expect(r.erros).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Validação — Kit Solar', () => {
  it('[V13] Kit completo → status = completo', () => {
    const r = validarKit(kitCompleto);
    expect(r.status).toBe('completo');
    expect(r.erros).toHaveLength(0);
  });

  it('[V14] Kit vazio → status = vazio', () => {
    const r = validarKit(kitVazio);
    expect(r.status).toBe('vazio');
    expect(r.erros.length).toBeGreaterThan(3);
  });

  it('[V15] Kit parcial (marca + sem quantidade) → status = parcial', () => {
    const r = validarKit(kitParcial);
    expect(r.status).toBe('parcial');
  });

  it('[V16] Custo zero → erro obrigatório', () => {
    const r = validarKit({ ...kitCompleto, custoKitRS: 0 });
    expect(r.erros.some(e => e.campo === 'custoKitRS')).toBe(true);
  });

  it('[V17] Potência zero → erro', () => {
    const r = validarKit({ ...kitCompleto, potenciaModuloWp: 0 });
    expect(r.erros.some(e => e.campo === 'potenciaModuloWp')).toBe(true);
  });

  it('[V18] Quantidade zero → erro', () => {
    const r = validarKit({ ...kitCompleto, quantidade: 0 });
    expect(r.erros.some(e => e.campo === 'quantidade')).toBe(true);
  });

  it('[V19] Marca do inversor vazia → erro', () => {
    const r = validarKit({ ...kitCompleto, marcaInversor: '' });
    expect(r.erros.some(e => e.campo === 'marcaInversor')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Validação — Preço', () => {
  it('[V20] Preço completo → status = completo', () => {
    const r = validarPreco(precoCompleto, 12500);
    expect(r.status).toBe('completo');
    expect(r.erros).toHaveLength(0);
  });

  it('[V21] Custo do kit = 0 → erro (kit não informado)', () => {
    const r = validarPreco(precoCompleto, 0);
    expect(r.erros.some(e => e.campo === 'custoKit')).toBe(true);
    expect(r.status).toBe('vazio');
  });

  it('[V22] Imposto + margem = 110% → erro (impossível matematicamente)', () => {
    const r = validarPreco(precoInvalido, 12500);
    expect(r.erros.some(e => e.campo === 'impostos')).toBe(true);
  });

  it('[V23] Imposto 0.50 + margem 0.49 = 0.99 < 1.0 → NÃO é erro (preço = custo/0.01, caro mas válido)', () => {
    // A validação bloqueia apenas quando imp+marg >= 1.0 (divisão por zero)
    const r = validarPreco({ ...precoCompleto, aliquotaImpostos: 0.50, margemDesejada: 0.49 }, 12500);
    // 0.99 < 1.0 → sem erro de impostos (só alíquota > 50%)
    expect(r.erros.some(e => e.campo === 'impostos')).toBe(false);
    // Mas alíquota > 50% gera erro de range
    // aliquota = 0.50 não dispara erro (condição é > 0.50, não >= 0.50)
    expect(r.erros.some(e => e.campo === 'aliquota')).toBe(false);
    // Em suma: imp=0.50+marg=0.49=0.99 é incomum mas passa
    expect(r.status).toBe('completo');
  });

  it('[V24] Alíquota > 50% → erro de validação de range', () => {
    // 0.51 > 0.50 → condição 'aliquotaImpostos > 0.50' dispara erro
    const r = validarPreco({ ...precoCompleto, aliquotaImpostos: 0.51 }, 12500);
    expect(r.erros.some(e => e.campo === 'aliquota')).toBe(true);
    expect(r.status).not.toBe('completo');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Validação — Projeto Completo', () => {
  const estadoCompleto = {
    cliente: clienteCompleto, consumo: consumoCompleto,
    kit: kitCompleto, preco: precoCompleto, empresa: empresaCompleta,
  };

  it('[V25] Estado completo → podeCalcular = true', () => {
    const r = validarProjetoCompleto(estadoCompleto);
    expect(r.podeCalcular).toBe(true);
    expect(r.erros).toHaveLength(0);
  });

  it('[V26] Cliente vazio → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, cliente: clienteVazio });
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'nome')).toBe(true);
  });

  it('[V27] Kit sem custo → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, kit: { ...kitCompleto, custoKitRS: 0 } });
    expect(r.podeCalcular).toBe(false);
  });

  it('[V28] Consumo insuficiente → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, consumo: consumo2meses });
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'contas')).toBe(true);
  });

  it('[V29] Múltiplos erros → todos listados', () => {
    const r = validarProjetoCompleto({
      cliente: clienteVazio, consumo: consumoVazio,
      kit: kitVazio, preco: { ...precoCompleto, aliquotaImpostos:0.60, margemDesejada:0.60 },
    });
    expect(r.erros.length).toBeGreaterThan(5);
    expect(r.podeCalcular).toBe(false);
  });

  // REGRESSÃO (set/2026, auditoria de robustez): campo "Nº parcelas" da 3ª
  // opção de financiamento (aba Empresa) não era validado — limpar o campo
  // vira 0 (Number('')) e fazia simularFinanciamento() (indicadores.ts)
  // dividir por zero silenciosamente. Ver comentário completo lá.
  it('[V32] Nº de parcelas da 3ª opção de financiamento = 0 → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, empresa: { ...empresaCompleta, parcelasOutroFinanciamento: 0 } });
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'parcelasOutroFinanciamento')).toBe(true);
  });

  it('[V33] Nº de parcelas da 3ª opção de financiamento negativo → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, empresa: { ...empresaCompleta, parcelasOutroFinanciamento: -5 } });
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'parcelasOutroFinanciamento')).toBe(true);
  });

  it('[V34] Taxa de juros da 3ª opção de financiamento negativa → não pode calcular', () => {
    const r = validarProjetoCompleto({ ...estadoCompleto, empresa: { ...empresaCompleta, taxaOutroFinanciamento: -0.01 } });
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'taxaOutroFinanciamento')).toBe(true);
  });

  it('[V35] empresa ausente do estado → trata como inválido (não deixa passar silenciosamente)', () => {
    const { empresa, ...semEmpresa } = estadoCompleto as any;
    const r = validarProjetoCompleto(semEmpresa);
    expect(r.podeCalcular).toBe(false);
    expect(r.erros.some(e => e.campo === 'parcelasOutroFinanciamento')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Persistência — gerarId()', () => {
  it('[V30] gerarId() gera IDs únicos', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => gerarId()));
    expect(ids.size).toBe(1000); // todos únicos
  });

  it('[V31] gerarId() nunca gera string vazia', () => {
    for (let i = 0; i < 100; i++) {
      expect(gerarId().length).toBeGreaterThan(5);
    }
  });

  it('[V32] gerarId() só gera caracteres alfanuméricos', () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarId()).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('[V33] Dois gerarId() consecutivos geram valores diferentes', () => {
    const a = gerarId();
    const b = gerarId();
    expect(a).not.toBe(b);
  });
});
