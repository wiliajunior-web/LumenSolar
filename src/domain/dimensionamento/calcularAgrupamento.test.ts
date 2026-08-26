import { describe, it, expect } from 'vitest';
import { calcularAgrupamento, type UnidadeConsumidora } from './calcularAgrupamento';

// Este arquivo não existia antes da auditoria de ago/2026 — calcularAgrupamento.ts
// tinha ZERO cobertura de teste E é um módulo "morto" (nenhuma tela na UI
// usa este cálculo — pior que o Grupo A antes da correção desta sessão, que
// ao menos tinha um painel; aqui não existe nem um stub). Mesmo desconectado
// da UI, tinha um bug real de ordem de clamp: o consumo compensável AGREGADO
// era `max(ΣmediaUC - ΣdispUC, 0)` — subtração agregada, clampada uma única
// vez — enquanto o compensável de cada UC (usado na distribuição de créditos,
// logo abaixo) é `max(mediaUC - dispUC, 0)` clampado UC A UC. Como
// max(a,0)+max(b,0) ≥ max(a+b,0) sempre que a ou b pode ser negativo, o
// agregado antigo subdimensionava o sistema sempre que alguma UC tem consumo
// médio abaixo da própria disponibilidade mínima. Corrigido para somar as
// compensáveis já clampadas por UC. Valores hand-verified abaixo.

function uc(id: string, mediaConstante: number, tipoLigacao: UnidadeConsumidora['tipoLigacao'], percentualCredito: number): UnidadeConsumidora {
  return { id, historico: Array(12).fill(mediaConstante), tipoLigacao, percentualCredito };
}

describe('calcularAgrupamento — [REGRESSÃO ago/2026] ordem de clamp na compensável agregada', () => {
  it('UC com consumo abaixo da disponibilidade mínima: agregado usa a SOMA das compensáveis por UC, não a subtração agregada', () => {
    // UC1: media=20, trifásica (disp=100) → compensável individual = max(20-100,0) = 0
    // UC2: media=500, monofásica (disp=30) → compensável individual = max(500-30,0) = 470
    // Soma das compensáveis por UC = 0 + 470 = 470  (comportamento CORRETO, esperado)
    // Agregado ANTIGO (bug): max((20+500) - (100+30), 0) = max(520-130,0) = 390 (subdimensionava)
    const r = calcularAgrupamento({
      unidades: [
        uc('UC1', 20, 'trifasica', 10),
        uc('UC2', 500, 'monofasica', 90),
      ],
      hspLocal: 5,
      perdasSistema: 0.20,
      potenciaModuloWp: 550,
    });

    expect(r.consumoTotalKWh).toBeCloseTo(520, 1);
    // O valor corrigido (470) — se o bug antigo estivesse presente, este campo seria 390
    expect(r.geracaoNecessariaKWh).toBeCloseTo(470, 1);
    expect(r.geracaoNecessariaKWh).not.toBeCloseTo(390, 1);

    // potMinKWp = 470 / (5 × 30.41667 × 0.80) = 3.8631...
    expect(r.potenciaMinKWp).toBeCloseTo(3.863, 2);
    expect(r.numeroModulos).toBe(8); // ceil(3.863/0.550)
    expect(r.potenciaRealKWp).toBeCloseTo(4.4, 2);
    // geracaoMensal = 4.4 × 5 × 30.41667 × 0.80 = 535.33
    expect(r.geracaoMensalKWh).toBeCloseTo(535.3, 1);

    const ucr1 = r.resultadosPorUC.find(u => u.id === 'UC1')!;
    const ucr2 = r.resultadosPorUC.find(u => u.id === 'UC2')!;
    expect(ucr1.consumoCompensavelKWh).toBe(0);
    expect(ucr2.consumoCompensavelKWh).toBeCloseTo(470, 1);
    expect(ucr2.atendimentoPercent).toBe(100); // clampado em 100%

    expect(r.classificacao).toBe('microgeracao');
    expect(r.modalidade).toBe('geracao_compartilhada');
    expect(r.distribuicaoOk).toBe(true);

    // UC1 recebe 10% dos créditos mas quase não tem consumo compensável →
    // acumula saldo positivo muito acima do próprio consumo médio, e fica
    // com atendimento 0% (porque sua compensável de referência é 0)
    expect(r.alertas.some(a => a.includes('geração excede consumo em >100%') && a.includes('UC1'))).toBe(true);
    expect(r.alertas.some(a => a.includes('UC1: atendimento 0%'))).toBe(true);
  });
});

describe('calcularAgrupamento — distribuição de créditos inválida', () => {
  it('percentuais que não somam 100% disparam alerta e distribuicaoOk=false', () => {
    const r = calcularAgrupamento({
      unidades: [
        uc('UC1', 300, 'trifasica', 50),
        uc('UC2', 300, 'trifasica', 40), // soma 90%, não 100%
      ],
      hspLocal: 5,
      perdasSistema: 0.20,
      potenciaModuloWp: 550,
    });
    expect(r.distribuicaoOk).toBe(false);
    expect(r.totalCreditosDistribuidos).toBe(90);
    expect(r.alertas.some(a => a.includes('90.0%'))).toBe(true);
  });
});

describe('calcularAgrupamento — UC única (autoconsumo remoto) e classificação minigeração', () => {
  it('uma UC só → modalidade autoconsumo_remoto; potência real > 75kWp → minigeracao', () => {
    // media alta o bastante para exigir mais de 75kWp reais
    const r = calcularAgrupamento({
      unidades: [uc('UC1', 15000, 'trifasica', 100)],
      hspLocal: 5,
      perdasSistema: 0.20,
      potenciaModuloWp: 550,
    });
    expect(r.modalidade).toBe('autoconsumo_remoto');
    expect(r.potenciaRealKWp).toBeGreaterThan(75);
    expect(r.classificacao).toBe('minigeracao');
    expect(r.alertas.some(a => a.includes('mesmo CPF/CNPJ'))).toBe(false); // só dispara com >1 UC
  });
});
