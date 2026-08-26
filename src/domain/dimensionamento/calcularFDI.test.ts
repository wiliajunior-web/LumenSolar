import { describe, it, expect } from 'vitest';
import { calcularFDI, type ParamsFDI } from './calcularFDI';

// Este arquivo não existia antes da auditoria de ago/2026 — calcularFDI.ts
// tinha ZERO cobertura de teste, apesar de ter sido a origem de um bug real
// corrigido nesta sessão: App.tsx chamava com
// `corrMaxMpptA: (kit as any).corrMaxMpptA || kit.corrMaxSaidaA || 99` — sem
// o dado real do datasheet, o Critério 3 (corrente por MPPT) aprovava
// SILENCIOSAMENTE qualquer configuração usando corrente CA de saída (grandeza
// errada) ou o valor arbitrário 99A. Isso foi corrigido para
// `criterio3Avaliado=false` quando o dado não é informado (nem aprova nem
// reprova). Valores hand-verified (calculados independentemente) abaixo.

const BASE: ParamsFDI = {
  potenciaModuloWp: 550,
  quantidade: 20,
  vocV: 48,
  vmpV: 40,
  iscA: 14,
  potenciaInversorKW: 10,
  faixaMpptMinV: 100,
  faixaMpptMaxV: 550,
  tensaoMaxEntradaV: 600,
  corrMaxMpptA: 30,
  numMppt: 2,
  numStrings: 2,
  modulosPorString: 10,
};

describe('calcularFDI — cenário ideal (3 critérios OK)', () => {
  it('Pger=11kWp/Pinv=10kW (FDI=1,1, "ideal"), tensão e corrente dentro da faixa', () => {
    // FDI: pgerKWp = 550×20/1000 = 11; fdi = 11/10 = 1.1 → 1.00 < 1.1 ≤ 1.20 → 'ideal'
    // pinvMin = 11/1.35 = 8.148... → 8.15 | pinvMax = 11/0.90 = 12.222... → 12.22
    // Tensão: nSerieMin = ceil(100×1.1/40) = ceil(2.75) = 3
    //         nSerieMax = floor(min(550/40, 600/48)) = floor(min(13.75, 12.5)) = 12
    //         modulosPorString=10 está em [3,12] → OK
    // Corrente: stringsPerMppt = ceil(2/2) = 1; nStringsMaxMppt = floor(30/14) = 2 → 1≤2 OK
    const r = calcularFDI(BASE);
    expect(r.pgerKWp).toBeCloseTo(11, 3);
    expect(r.fdi).toBeCloseTo(1.1, 4);
    expect(r.statusFDI).toBe('ideal');
    expect(r.pinvMinKW).toBeCloseTo(8.15, 2);
    expect(r.pinvMaxKW).toBeCloseTo(12.22, 2);
    expect(r.criterio1Ok).toBe(true);
    expect(r.nSerieMin).toBe(3);
    expect(r.nSerieMax).toBe(12);
    expect(r.criterio2Ok).toBe(true);
    expect(r.stringsPerMppt).toBe(1);
    expect(r.nStringsMaxMppt).toBe(2);
    expect(r.criterio3Ok).toBe(true);
    expect(r.criterio3Avaliado).toBe(true);
    expect(r.aprovado).toBe(true);
    expect(r.alertas).toEqual([]);
  });
});

describe('calcularFDI — [REGRESSÃO ago/2026] Critério 3 não avaliado sem Imax por MPPT', () => {
  it('corrMaxMpptA=0 (campo vazio): criterio3Avaliado=false, não reprova nem aprova às cegas', () => {
    const r = calcularFDI({ ...BASE, corrMaxMpptA: 0 });
    expect(r.criterio3Avaliado).toBe(false);
    expect(r.criterio3Ok).toBe(true); // não conta contra `aprovado`
    expect(r.nStringsMaxMppt).toBe(0); // não calculado de verdade
    expect(r.aprovado).toBe(true); // critérios 1 e 2 continuam OK
    expect(r.sugestoes.some(s => s.includes('não avaliado'))).toBe(true);
  });
});

describe('calcularFDI — Critério 1 (potência) fora da faixa', () => {
  it('FDI < 0,90 (arranjo subdimensionado) → "baixo", reprovado', () => {
    // pgerKWp = 550×10/1000 = 5.5; fdi = 5.5/10 = 0.55 < 0.90
    const r = calcularFDI({ ...BASE, quantidade: 10, numStrings: 1, modulosPorString: 10 });
    expect(r.fdi).toBeCloseTo(0.55, 3);
    expect(r.statusFDI).toBe('baixo');
    expect(r.criterio1Ok).toBe(false);
    expect(r.aprovado).toBe(false);
    expect(r.alertas.some(a => a.includes('subdimensionado'))).toBe(true);
  });

  it('FDI > 1,35 (arranjo superdimensionado) → "invalido", reprovado', () => {
    // pgerKWp = 550×30/1000 = 16.5; fdi = 16.5/10 = 1.65 > 1.35
    const r = calcularFDI({ ...BASE, quantidade: 30, numStrings: 3, modulosPorString: 10 });
    expect(r.fdi).toBeCloseTo(1.65, 3);
    expect(r.statusFDI).toBe('invalido');
    expect(r.criterio1Ok).toBe(false);
    expect(r.aprovado).toBe(false);
    expect(r.alertas.some(a => a.includes('superdimensionado'))).toBe(true);
  });
});

describe('calcularFDI — Critério 2 (tensão) fora da faixa', () => {
  it('módulos/string abaixo do mínimo (2 < nSerieMin=3) → alerta de tensão baixa', () => {
    const r = calcularFDI({ ...BASE, modulosPorString: 2, numStrings: 10 });
    expect(r.nSerieMin).toBe(3);
    expect(r.criterio2Ok).toBe(false);
    expect(r.aprovado).toBe(false);
    expect(r.alertas.some(a => a.includes('< mínimo'))).toBe(true);
  });

  it('módulos/string acima do máximo (13 > nSerieMax=12) → alerta de tensão alta', () => {
    const r = calcularFDI({ ...BASE, modulosPorString: 13, numStrings: 2 });
    expect(r.nSerieMax).toBe(12);
    expect(r.criterio2Ok).toBe(false);
    expect(r.aprovado).toBe(false);
    expect(r.alertas.some(a => a.includes('> máximo'))).toBe(true);
  });
});

describe('calcularFDI — Critério 3 (corrente) excedido', () => {
  it('strings por MPPT > limite do inversor → reprovado com alerta', () => {
    // numStrings=5, numMppt=1 → stringsPerMppt=5; corrMaxMpptA=30, iscA=14 → nStringsMaxMppt=floor(30/14)=2
    const r = calcularFDI({ ...BASE, numStrings: 5, numMppt: 1, modulosPorString: 4, quantidade: 20 });
    expect(r.stringsPerMppt).toBe(5);
    expect(r.nStringsMaxMppt).toBe(2);
    expect(r.criterio3Avaliado).toBe(true);
    expect(r.criterio3Ok).toBe(false);
    expect(r.aprovado).toBe(false);
    expect(r.alertas.some(a => a.includes('Critério de corrente'))).toBe(true);
  });
});
