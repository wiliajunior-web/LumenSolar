import { describe, expect, it } from 'vitest';
import { calcularCustosRecorrentes } from './calcularCustos';
import { DISTRIBUIDORAS } from '../../data/distribuidoras';

const cemig = DISTRIBUIDORAS.find((d) => d.codigo === 'CEMIG')!;

describe('calcularCustosRecorrentes', () => {
  it('calcula taxa de disponibilidade corretamente para ligação monofásica', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig,
      tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500,
      geracaoMensalKWh: 520,
      percentualFioB: 0.6,
    });
    expect(r.taxaDisponibilidadeRS).toBeCloseTo(30 * cemig.tarifaKWhComICMS, 1);
  });

  it('taxa de disponibilidade para trifásica é maior que monofásica', () => {
    const mono = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    const tri = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'trifasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    expect(tri.taxaDisponibilidadeRS).toBeGreaterThan(mono.taxaDisponibilidadeRS);
  });

  it('custo do Fio B é zero quando percentual é 0 (art. 26)', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    expect(r.custoBFioMensalRS).toBe(0);
  });

  it('custo total fixo é soma de disponibilidade + CIP + Fio B', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0.6,
    });
    expect(r.totalFixoMensalRS).toBeCloseTo(
      r.taxaDisponibilidadeRS + r.cipRS + r.custoBFioMensalRS, 4
    );
  });

  it('economia mensal é positiva quando solar gera mais do que o mínimo de disponibilidade', () => {
    const r = calcularCustosRecorrentes({
      distribuidora: cemig, tipoLigacao: 'monofasica',
      cipRS: 18,
      consumoMedioMensalKWh: 500, geracaoMensalKWh: 500, percentualFioB: 0,
    });
    expect(r.economiaMensalRS).toBeGreaterThan(0);
  });
});
