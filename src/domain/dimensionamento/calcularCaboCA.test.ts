import { describe, it, expect } from 'vitest';
import { calcularCaboCA } from './calcularCaboCA';

// Este arquivo não existia antes da auditoria de ago/2026 — calcularCaboCA.ts
// (cabo CA, disjuntor e queda de tensão, NBR 5410 + NBR 16690 5.4) já tinha
// tido UM bug real corrigido em sessão anterior (queda de tensão com divisão
// dupla), mas nunca ganhou um arquivo de teste dedicado — só era exercitado
// indiretamente por auditoria_completa_v2.test.ts, que não cobre o cenário
// abaixo. Valores hand-verified (calculados independentemente, não copiados
// da implementação) antes de rodar os testes.

describe('calcularCaboCA — seleção normal de cabo/disjuntor', () => {
  it('Ib=14A, 40°C, bifásica, L=15m, U=220V — seleciona 2,5mm²/16A, queda 1,375%', () => {
    // fta(40°C) = 0.87 (valor tabelado exato)
    // Iz_req = 14/0.87 = 16,09A
    // 1,5mm²(17,5A): izCorr=17,5×0,87=15,23 → nenhum disjuntor com 14≤d≤15,23 → pula
    // 2,5mm²(24A): izCorr=24×0,87=20,88 → disjuntor 16A (14≤16≤20,88) → seleciona
    // ΔU(V) = α×ρ×Ib×L/S = 2×0,018×14×15/2,5 = 3,024V
    // ΔU% = 3,024/220×100 = 1,375%
    const r = calcularCaboCA({
      corrMaxSaidaA: 14, tensaoSaidaV: 220, tipoLigacao: 'bifasica',
      temperaturaAmbienteC: 40, comprimentoCaboCAm: 15,
    });
    expect(r.fta).toBeCloseTo(0.87, 4);
    expect(r.izRequeridoA).toBeCloseTo(16.09, 2);
    expect(r.secaoMm2).toBe(2.5);
    expect(r.izCaboA).toBe(24);
    expect(r.izCorrigidaA).toBeCloseTo(20.88, 2);
    expect(r.disjuntorA).toBe(16);
    expect(r.quedaTensaoV).toBeCloseTo(3.024, 3);
    expect(r.quedaTensaoPct).toBeCloseTo(1.375, 3);
    expect(r.quedaTensaoOk).toBe(true);
    expect(r.alertas).toEqual([]);
  });

  it('Ib=85A, 40°C, trifásica — avança para 35mm² e não dispara alerta de disjuntor faltando', () => {
    // fta=0.87, Iz_req=85/0.87=97.70
    // 25mm²(101A): izCorr=101×0,87=87,87 → nenhum disjuntor com 85≤d≤87,87 → pula
    // 35mm²(125A): izCorr=125×0,87=108,75 → disjuntor 100A (85≤100≤108,75) → seleciona
    const r = calcularCaboCA({
      corrMaxSaidaA: 85, tensaoSaidaV: 380, tipoLigacao: 'trifasica',
      temperaturaAmbienteC: 40,
    });
    expect(r.secaoMm2).toBe(35);
    expect(r.disjuntorA).toBe(100);
    expect(r.izCorrigidaA).toBeCloseTo(108.75, 2);
    expect(r.alertas).toEqual([]);
  });
});

describe('calcularCaboCA — [REGRESSÃO ago/2026] disjuntor abaixo de Ib sem alerta', () => {
  // Bug encontrado nesta auditoria: quando NENHUMA bitola da tabela tem um
  // disjuntor padrão que satisfaça Ib≤In≤Iz' (Ib grande o bastante para
  // passar do maior disjuntor IEC padrão de 100A, mas ainda dentro da faixa
  // de Iz_req coberta pela maior bitola de 50mm²), o código antes entregava
  // o disjuntor default (100A) mesmo quando 100A < Ib, sem alerta nenhum —
  // faixa real para inversores comerciais/industriais maiores.
  it('Ib=110A, 40°C, trifásica — nenhum disjuntor padrão cobre Ib, alerta obrigatório', () => {
    // fta=0.87, Iz_req=110/0.87=126,44 (≤151, não dispara "acima da tabela")
    // 35mm²(125A): 125<126,44 → insuficiente, pula
    // 50mm²(151A): izCorr=151×0,87=131,37 → nenhum disjuntor IEC com 110≤d≤131,37
    //   (maior disponível é 100A) → sem match no loop
    // fallback: bitola 50mm², disjuntor = menor ≥110A disponível = nenhum → 100A (default)
    // 100A < 110A → alerta obrigatório
    const r = calcularCaboCA({
      corrMaxSaidaA: 110, tensaoSaidaV: 380, tipoLigacao: 'trifasica',
      temperaturaAmbienteC: 40,
    });
    expect(r.izRequeridoA).toBeCloseTo(126.44, 2);
    expect(r.secaoMm2).toBe(50);
    expect(r.izCorrigidaA).toBeCloseTo(131.37, 2);
    expect(r.disjuntorA).toBe(100);
    expect(r.disjuntorA).toBeLessThan(r.ibA); // a condição perigosa em si
    expect(r.alertas.some(a => a.includes('Nenhum disjuntor padrão'))).toBe(true);
  });

  it('Ib=200A — acima da maior bitola tabelada: só o alerta de "acima da tabela" dispara (não duplica com o de disjuntor)', () => {
    const r = calcularCaboCA({
      corrMaxSaidaA: 200, tensaoSaidaV: 380, tipoLigacao: 'trifasica',
      temperaturaAmbienteC: 40,
    });
    expect(r.izRequeridoA).toBeGreaterThan(151);
    expect(r.alertas).toEqual(['Corrente acima da tabela — consultar engenheiro especialista']);
  });
});

describe('calcularCaboCA — [REGRESSÃO ago/2026] temperatura fora da faixa tabelada', () => {
  it('temperaturaAmbienteC=65°C (acima de 60) — alerta de faixa fora do tabelado', () => {
    const r = calcularCaboCA({
      corrMaxSaidaA: 20, tensaoSaidaV: 220, tipoLigacao: 'bifasica',
      temperaturaAmbienteC: 65,
    });
    expect(r.fta).toBeCloseTo(0.50, 4); // satura no valor de 60°C
    expect(r.alertas.some(a => a.includes('fora da faixa tabelada'))).toBe(true);
  });

  it('temperaturaAmbienteC=40°C (dentro da faixa) — não dispara o alerta de faixa', () => {
    const r = calcularCaboCA({
      corrMaxSaidaA: 20, tensaoSaidaV: 220, tipoLigacao: 'bifasica',
      temperaturaAmbienteC: 40,
    });
    expect(r.alertas.some(a => a.includes('fora da faixa tabelada'))).toBe(false);
  });
});

describe('calcularCaboCA — [REGRESSÃO ago/2026] FTA(25°C) corrigido', () => {
  it('FTA(25°C) = 1.06 (era 1.04) — bate com a fórmula sqrt((70-T)/(70-30)) documentada', () => {
    const r = calcularCaboCA({
      corrMaxSaidaA: 10, tensaoSaidaV: 220, tipoLigacao: 'bifasica',
      temperaturaAmbienteC: 25,
    });
    expect(r.fta).toBeCloseTo(Math.sqrt((70 - 25) / (70 - 30)), 2);
    expect(r.fta).toBeCloseTo(1.06, 2);
  });
});

describe('calcularCaboCA — queda de tensão acima do limite', () => {
  it('cabo fino + comprimento grande → ΔU% > 4%, dispara alerta', () => {
    const r = calcularCaboCA({
      corrMaxSaidaA: 14, tensaoSaidaV: 220, tipoLigacao: 'bifasica',
      temperaturaAmbienteC: 40, comprimentoCaboCAm: 100, // 100m em vez de 15m
    });
    expect(r.quedaTensaoOk).toBe(false);
    expect(r.alertas.some(a => a.includes('Queda de tensão'))).toBe(true);
  });
});
