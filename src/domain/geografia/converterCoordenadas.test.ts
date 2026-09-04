import { describe, it, expect } from 'vitest';
import { latLonParaUTM, distanciaUTM } from './converterCoordenadas';

// Casos de referência migrados de cpf_utm.test.ts (onde uma cópia local da
// mesma fórmula era usada só para o teste — nunca testava a função real de
// produção). Mesmos valores, agora testando o módulo compartilhado de verdade.
describe('latLonParaUTM', () => {
  it('[UTM01] Araguari/MG: fuso 22, E≈805km, N≈7933km', () => {
    const { utmE, utmN, fuso } = latLonParaUTM(-18.6476, -48.1936);
    expect(fuso).toBe(22);
    expect(utmE).toBeGreaterThan(780000); expect(utmE).toBeLessThan(820000);
    expect(utmN).toBeGreaterThan(7920000); expect(utmN).toBeLessThan(7960000);
  });

  it('[UTM02] Belo Horizonte/MG: fuso 23', () => {
    expect(latLonParaUTM(-19.9167, -43.9345).fuso).toBe(23);
  });

  it('[UTM03] São Paulo/SP: fuso 23', () => {
    expect(latLonParaUTM(-23.5505, -46.6333).fuso).toBe(23);
  });

  it('[UTM04] Equador (lat=0, lon=0): E=166022, N=0, fuso=31', () => {
    const { utmE, utmN, fuso } = latLonParaUTM(0, 0);
    expect(fuso).toBe(31);
    expect(Math.abs(utmE - 166022)).toBeLessThan(10);
    expect(Math.abs(utmN)).toBeLessThan(10);
  });

  it('hemisfério sul soma a falsa origem de 10.000.000 em N; hemisfério norte não', () => {
    const sul = latLonParaUTM(-18.6476, -48.1936);
    const norte = latLonParaUTM(18.6476, -48.1936);
    expect(sul.utmN).toBeGreaterThan(5_000_000);
    expect(norte.utmN).toBeLessThan(5_000_000);
  });

  // [REGRESSÃO ago/2026] a letra do hemisfério não era retornada pela função —
  // quem exibia UTM (BuscadorCoordenadas em App.tsx, PlantaDeSituacao.tsx)
  // hardcodeava "S", presumindo Brasil = hemisfério sul sempre. Errado para
  // Roraima inteiro e partes do norte do Amapá/Amazonas (lat >= 0).
  it('[hemisferio] retorna "S" para latitude negativa (a maior parte do Brasil)', () => {
    expect(latLonParaUTM(-18.6476, -48.1936).hemisferio).toBe('S');
  });

  it('[hemisferio] retorna "N" para latitude positiva (ex: norte de Roraima)', () => {
    expect(latLonParaUTM(2.8, -60.7).hemisferio).toBe('N'); // Boa Vista/RR: lat +2,8°
  });

  it('[hemisferio] equador (lat=0) é convencionado como "N" (limite MGRS M/N é o próprio equador)', () => {
    expect(latLonParaUTM(0, -48).hemisferio).toBe('N');
  });

  // ADICIONADO (set/2026, auditoria "rode com valores absurdos"): lat/lon fora da
  // faixa fisicamente válida não crashava nem virava NaN antes deste guard — só
  // devolvia um UTM E/N "normal" só que geograficamente sem sentido nenhum.
  describe('[REGRESSÃO set/2026] guard contra lat/lon fisicamente inválidos', () => {
    it('lança erro para latitude > 90', () => {
      expect(() => latLonParaUTM(90.1, -48)).toThrow('Latitude inválida');
    });
    it('lança erro para latitude < -90', () => {
      expect(() => latLonParaUTM(-90.1, -48)).toThrow('Latitude inválida');
    });
    it('lança erro para longitude > 180', () => {
      expect(() => latLonParaUTM(-18, 180.1)).toThrow('Longitude inválida');
    });
    it('lança erro para longitude < -180', () => {
      expect(() => latLonParaUTM(-18, -180.1)).toThrow('Longitude inválida');
    });
    it('lança erro para valores absurdos fora de qualquer escala geográfica', () => {
      expect(() => latLonParaUTM(9999, 9999)).toThrow('Latitude inválida');
    });
    it('aceita os limites exatos -90/90 e -180/180 (inclusive, polos e antimeridiano são coordenadas válidas)', () => {
      expect(() => latLonParaUTM(90, 180)).not.toThrow();
      expect(() => latLonParaUTM(-90, -180)).not.toThrow();
    });
  });
});

describe('distanciaUTM', () => {
  it('retorna null quando os fusos são diferentes (E/N não comparáveis)', () => {
    const a = { utmE: 800000, utmN: 7930000, fuso: 22 };
    const b = { utmE: 800000, utmN: 7930000, fuso: 23 };
    expect(distanciaUTM(a, b)).toBeNull();
  });

  it('distância euclidiana simples quando o fuso é o mesmo (3-4-5 conferido na mão)', () => {
    const a = { utmE: 800000, utmN: 7930000, fuso: 22 };
    const b = { utmE: 800003, utmN: 7930004, fuso: 22 };
    expect(distanciaUTM(a, b)).toBe(5);
  });

  it('duas coordenadas iguais têm distância zero', () => {
    const a = { utmE: 800000, utmN: 7930000, fuso: 22 };
    expect(distanciaUTM(a, { ...a })).toBe(0);
  });
});
