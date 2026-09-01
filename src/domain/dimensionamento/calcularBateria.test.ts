import { describe, it, expect } from 'vitest';
import { calcularBancoBaterias } from './calcularBateria';

// Este arquivo não existia antes da auditoria de ago/2026 — calcularBateria.ts
// tinha ZERO cobertura de teste E é um módulo "morto" (não conectado a
// useProjetoStore/UI — App.tsx reimplementa as fórmulas de bateria inline,
// divergindo deste módulo). Mesmo sem estar conectado, o módulo é exportado e
// pode ser usado por outra parte do código ou reaproveitado futuramente, e
// tinha um bug real: `tensoesSerie[0]` era usado como "a tensão da bateria"
// para TODOS os perfis, mas para litio_lifepo4 (tensoesSerie=[48,24,12] —
// tensões de PACK PRONTO, não uma lista ordenada) isso sempre pegava 48V
// mesmo configurando um banco de 12V ou 24V. Corrigido para selecionar o pack
// que bate com Vsist quando há mais de uma opção de tensão no perfil; perfis
// de célula/monobloco único (Pb-ácido, OPzS/OPzV) continuam empilhando em
// série livremente, como sempre foi correto fazer. Valores hand-verified
// (calculados independentemente) abaixo.

describe('calcularBancoBaterias — backup_hybrid + Pb-ácido estacionária', () => {
  it('4h de backup, banco 48V com monoblocos 12V — dimensionamento correto', () => {
    // energiaAutonomia = (4/24)×10 = 1.6667 kWh
    // dod (recomendado) = 0.40
    // capacidadeBruta_Wh = 1666.7/0.40 = 4166.7 Wh → 4167
    // capacidadeBruta_Ah = 4166.7/48 = 86.81 Ah → 87
    // tensaoBateria = 12 (única opção) → bateriasSerie = ceil(48/12) = 4
    // bateriasParalelo = ceil(86.81/100) = 1 → total = 4
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 10,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'backup_hybrid',
      autonomia: 4,
      tensaoSistemaV: 48,
      capacidadeBateriaAh: 100,
    });
    expect(r.energiaDiaria_kWh).toBeCloseTo(10, 2);
    expect(r.capacidadeBruta_Wh).toBeCloseTo(4167, 0);
    expect(r.capacidadeBruta_Ah).toBeCloseTo(87, 0);
    expect(r.dodUsado).toBe(0.40);
    expect(r.bateriasSerie).toBe(4);
    expect(r.bateriasParalelo).toBe(1);
    expect(r.bateriasTotal).toBe(4);
    expect(r.capacidadeRealAh).toBe(100);
    expect(r.capacidadeRealKWh).toBeCloseTo(4.8, 2);
    expect(r.autonomiaDias).toBeUndefined();
    // Sem mismatch de tensão (perfil de célula única sempre empilha em série)
    expect(r.alertas).toEqual([]);
  });
});

describe('calcularBancoBaterias — [REGRESSÃO ago/2026] litio_lifepo4 com tensão de pack correspondente', () => {
  it('offgrid 24V, pack de 24V disponível — usa o pack certo, sem alerta de mismatch', () => {
    // energiaAutonomia = 5×3 = 15 kWh; dod=0.80
    // capacidadeBruta_Wh = 15000/0.80 = 18750; capacidadeBruta_Ah bruto = 18750/24 = 781.25 (retornado arredondado: 781)
    // tensaoBateria = 24 (match exato) → bateriasSerie = ceil(24/24) = 1
    // bateriasParalelo = ceil(781.25/200) = 4 → total = 4 (usa o valor bruto, não o arredondado)
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 5,
      tipoBateria: 'litio_lifepo4',
      tipoSistema: 'offgrid_sfi',
      autonomia: 3,
      tensaoSistemaV: 24,
      capacidadeBateriaAh: 200,
      iscArranjoA: 10,
      nStringsParalelo: 2,
      potenciaMaxCargasW: 3000,
      hspMinimo: 4,
    });
    // capacidadeBruta_Ah é retornado arredondado a 0 casas decimais (toFixed(0))
    expect(r.capacidadeBruta_Ah).toBe(781);
    expect(r.bateriasSerie).toBe(1);
    expect(r.bateriasParalelo).toBe(4);
    expect(r.bateriasTotal).toBe(4);
    expect(r.capacidadeRealAh).toBe(800);
    expect(r.capacidadeRealKWh).toBeCloseTo(19.2, 2);
    expect(r.corrMaxControlador_A).toBeCloseTo(25.0, 1);
    expect(r.tensaoMaxControlador_V).toBeCloseTo(31, 0);
    expect(r.potMinInversor_W).toBe(3000);
    expect(r.autonomiaEmpirica).toBeCloseTo(6.5, 1);
    // Sem alerta de mismatch de tensão (24V bate exato com um dos packs)
    expect(r.alertas.some(a => a.includes('Nenhum pack'))).toBe(false);
    // Mas os dois alertas fixos de litio + tensão baixa/corrente elevada continuam
    expect(r.alertas.some(a => a.includes('BMS dedicado'))).toBe(true);
    expect(r.alertas.some(a => a.includes('correntes elevadas'))).toBe(true);
  });

  it('backup 13V (sem pack exato) — cai no pack mais próximo (12V) e avisa o instalador', () => {
    // energiaAutonomia = (2/24)×2 = 0.16667 kWh; dod=0.80
    // capacidadeBruta_Wh = 166.67/0.80 = 208.33; capacidadeBruta_Ah = 208.33/13 = 16.03
    // distâncias: |48-13|=35, |24-13|=11, |12-13|=1 → mais próximo = 12V
    // bateriasSerie = ceil(13/12) = 2
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 2,
      tipoBateria: 'litio_lifepo4',
      tipoSistema: 'backup_hybrid',
      autonomia: 2,
      tensaoSistemaV: 13,
      capacidadeBateriaAh: 100,
    });
    expect(r.capacidadeBruta_Ah).toBe(16); // arredondado (toFixed(0)); valor bruto = 16,03
    expect(r.bateriasSerie).toBe(2);
    expect(r.bateriasParalelo).toBe(1);
    expect(r.capacidadeRealKWh).toBeCloseTo(1.3, 2);
    expect(r.alertas.some(a => a.includes('Nenhum pack de 13V disponível') && a.includes('12V'))).toBe(true);
  });
});

describe('calcularBancoBaterias — perfis de célula única com banco grande (OPzS)', () => {
  it('offgrid 48V com células 2V — bateriasParalelo>6 dispara alerta', () => {
    // energiaAutonomia = 20×2 = 40 kWh; dod=0.70
    // capacidadeBruta_Wh = 40000/0.70 = 57142.86; capacidadeBruta_Ah = 57142.86/48 = 1190.48
    // tensaoBateria=2 → bateriasSerie=ceil(48/2)=24; bateriasParalelo=ceil(1190.48/50)=24 (>6)
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 20,
      tipoBateria: 'ciclo_profundo_opzs',
      tipoSistema: 'offgrid_sfi',
      autonomia: 2,
      tensaoSistemaV: 48,
      capacidadeBateriaAh: 50,
    });
    expect(r.bateriasSerie).toBe(24);
    expect(r.bateriasParalelo).toBe(24);
    expect(r.bateriasTotal).toBe(576);
    expect(r.alertas.some(a => a.includes('excede o máximo recomendado'))).toBe(true);
    // Perfil de célula única: nunca dispara o alerta de mismatch de pack
    expect(r.alertas.some(a => a.includes('Nenhum pack'))).toBe(false);
  });
});

describe('calcularBancoBaterias — autonomia empírica (offgrid) abaixo do mínimo recomendado', () => {
  it('autonomia=1 dia (< 2 dias recomendado) dispara alerta', () => {
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 5,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'offgrid_sfi',
      autonomia: 1,
      tensaoSistemaV: 12,
      capacidadeBateriaAh: 100,
      hspMinimo: 2,
    });
    expect(r.autonomiaDias).toBe(1);
    // N = 0.48×2 + 4.58 = 5.54 → 5.5
    expect(r.autonomiaEmpirica).toBeCloseTo(5.5, 1);
    expect(r.alertas.some(a => a.includes('Autonomia mínima recomendada'))).toBe(true);
  });

  // BUG CORRIGIDO (ago/2026): o alerta acima só era calculado DENTRO do
  // `if (p.hspMinimo)` — um parâmetro opcional que o único call site real do
  // app (App.tsx, painel "Dimensionamento de Banco de Baterias") NUNCA
  // passava (confirmado por grep em App.tsx antes do fix). Resultado: em
  // produção, um sistema offgrid configurado com autonomia insuficiente
  // nunca disparava alerta nenhum — o teste acima só passava porque passa
  // `hspMinimo` manualmente, cenário que a produção jamais reproduzia. Este
  // teste reproduz exatamente a chamada real (sem `hspMinimo`), incluindo o
  // caso extremo de autonomia=0 dias citado na auditoria.
  it('[REGRESSÃO] autonomia insuficiente dispara alerta MESMO SEM hspMinimo (chamada real de App.tsx)', () => {
    const r1dia = calcularBancoBaterias({
      consumoDiarioKWh: 5,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'offgrid_sfi',
      autonomia: 1,
      tensaoSistemaV: 12,
      capacidadeBateriaAh: 100,
      // sem hspMinimo — é assim que App.tsx chama
    });
    expect(r1dia.autonomiaEmpirica).toBeUndefined(); // não dá pra calcular sem HSP
    expect(r1dia.alertas.some(a => a.includes('Autonomia mínima recomendada'))).toBe(true);

    const r0dias = calcularBancoBaterias({
      consumoDiarioKWh: 5,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'offgrid_sfi',
      autonomia: 0,
      tensaoSistemaV: 12,
      capacidadeBateriaAh: 100,
    });
    expect(r0dias.alertas.some(a => a.includes('Autonomia mínima recomendada'))).toBe(true);
  });
});

// REGRESSÃO (set/2026, auditoria de robustez): App.tsx chama esta função
// DENTRO do corpo de renderização (não num handler de clique) — autonomia
// negativa (input sem validação real, só min="1" de dica visual) propagava
// direto até Math.ceil(negativo), exibindo "-N unidades" ao vivo no painel,
// sem nenhum erro. Verificado manualmente (node -e) antes de escrever este
// teste: Math.max(1, -5) = 1 → energiaAutonomia_kWh = (1/24)×10 ≈ 0,41667.
describe('calcularBancoBaterias — [REGRESSÃO set/2026] autonomia inválida (negativa) é clampada, não produz baterias negativas', () => {
  it('autonomia=-5 (backup_hybrid): clampa para 1h, avisa, e nunca produz bateriasTotal negativo', () => {
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 10,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'backup_hybrid',
      autonomia: -5,
      tensaoSistemaV: 48,
      capacidadeBateriaAh: 100,
    });
    // energiaAutonomia_kWh não é exposta no retorno — verificada indiretamente
    // via capacidadeBruta_Wh, que deriva dela: (1/24)×10 = 0,41667 kWh ×
    // 1000 / dod(0,40) = 1041,67 Wh → arredonda para 1042.
    expect(r.capacidadeBruta_Wh).toBeCloseTo(1042, 0);
    expect(r.bateriasParalelo).toBeGreaterThan(0);
    expect(r.bateriasTotal).toBeGreaterThan(0);
    expect(r.alertas.some(a => a.includes('não é um valor válido'))).toBe(true);
  });

  it('autonomia=0 (offgrid): clampa para 1 dia (não 0), nunca produz banco de tamanho zero/negativo', () => {
    const r = calcularBancoBaterias({
      consumoDiarioKWh: 5,
      tipoBateria: 'estacionaria_comum',
      tipoSistema: 'offgrid_sfi',
      autonomia: -1,
      tensaoSistemaV: 12,
      capacidadeBateriaAh: 100,
    });
    expect(r.autonomiaDias).toBe(1);
    expect(r.bateriasTotal).toBeGreaterThan(0);
  });
});
