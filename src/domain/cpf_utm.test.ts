/**
 * Testes: CPF/CNPJ (Receita Federal) + Conversão UTM (WGS84)
 */
import { describe, expect, it } from 'vitest';
import { validarCPF, validarCNPJ, formatarCPF } from '../renderer/services/validation';

describe('CPF — Algoritmo Receita Federal', () => {
  it('[CPF01] CPF válido real: 366.1**.***-** (Ana Maria da conta CEMIG)', () => {
    // CPF da conta: 366.1**.***-** → usar um CPF válido conhecido
    expect(validarCPF('529.982.247-25')).toBe(true);  // CPF válido (dígitos públicos)
    expect(validarCPF('111.444.777-35')).toBe(true);  // outro CPF válido
  });
  it('[CPF02] CPF inválido: dígito verificador errado', () => {
    expect(validarCPF('529.982.247-26')).toBe(false); // último dígito errado
    expect(validarCPF('111.444.777-36')).toBe(false);
  });
  it('[CPF03] CPF com todos os dígitos iguais → inválido (111.111.111-11)', () => {
    for (const d of '0123456789') {
      expect(validarCPF(d.repeat(11))).toBe(false);
    }
  });
  it('[CPF04] CPF com menos de 11 dígitos → inválido', () => {
    expect(validarCPF('123.456.789-0')).toBe(false);
    expect(validarCPF('')).toBe(false);
  });
  it('[CPF05] formatarCPF formata enquanto digita', () => {
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
    expect(formatarCPF('529982')).toBe('529.982');
    // formatarCPF para 10 dígitos: 529.982.247-2 — padrão progressivo
    const r = formatarCPF('5299822472');
    expect(r.replace(/[.-]/g,'')).toBe('5299822472'); // dígitos preservados
  });
  it('[CPF06] formatarCPF aceita entrada já formatada', () => {
    expect(formatarCPF('529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('CNPJ — Algoritmo Receita Federal', () => {
  it('[CNPJ01] CNPJ válido (Lumen Soluções fictício)', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
  });
  it('[CNPJ02] CNPJ inválido', () => {
    expect(validarCNPJ('11.222.333/0001-82')).toBe(false);
  });
  it('[CNPJ03] CNPJ com todos iguais → inválido', () => {
    expect(validarCNPJ('11.111.111/1111-11')).toBe(false);
  });
  it('[CNPJ04] CNPJ com menos de 14 dígitos → inválido', () => {
    expect(validarCNPJ('11.222.333/0001')).toBe(false);
  });
});

describe('Conversão Lat/Lon → UTM WGS84', () => {
  // Araguari/MG: aproximadamente -18.65, -48.19
  // UTM: Fuso 22, E≈805000, N≈7933000

  function latLonToUTM(lat: number, lon: number) {
    const a=6378137.0, f=1/298.257223563, b=a*(1-f), e2=1-(b/a)**2;
    const k0=0.9996, E0=500000;
    const fuso=Math.floor((lon+180)/6)+1;
    const lon0=((fuso-1)*6-180+3)*Math.PI/180;
    const phi=lat*Math.PI/180, lam=lon*Math.PI/180;
    const N=a/Math.sqrt(1-e2*Math.sin(phi)**2);
    const T=Math.tan(phi)**2, C=(e2/(1-e2))*Math.cos(phi)**2;
    const A=Math.cos(phi)*(lam-lon0);
    const e4=e2**2, e6=e2**3;
    const M=a*((1-e2/4-3*e4/64-5*e6/256)*phi-(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*phi)+(15*e4/256+45*e6/1024)*Math.sin(4*phi)-(35*e6/3072)*Math.sin(6*phi));
    const utmE=Math.round(k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*(e2/(1-e2)))*A**5/120)+E0);
    const utmNraw=Math.round(k0*(M+N*Math.tan(phi)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*(e2/(1-e2)))*A**6/720)));
    const utmN=utmNraw+(lat<0?10_000_000:0);
    return { utmE, utmN, fuso };
  }

  it('[UTM01] Araguari/MG: fuso 22, E≈805km, N≈7933km', () => {
    const { utmE, utmN, fuso } = latLonToUTM(-18.6476, -48.1936);
    expect(fuso).toBe(22);
    expect(utmE).toBeGreaterThan(780000); expect(utmE).toBeLessThan(820000);
    expect(utmN).toBeGreaterThan(7920000); expect(utmN).toBeLessThan(7960000);
  });

  it('[UTM02] Belo Horizonte/MG: fuso 23', () => {
    const { fuso } = latLonToUTM(-19.9167, -43.9345);
    expect(fuso).toBe(23);
  });

  it('[UTM03] São Paulo/SP: fuso 23', () => {
    const { fuso } = latLonToUTM(-23.5505, -46.6333);
    expect(fuso).toBe(23);
  });

  it('[UTM04] Equador (lat=0, lon=0): E=166022, N=0, fuso=31', () => {
    const { utmE, utmN, fuso } = latLonToUTM(0, 0);
    expect(fuso).toBe(31);
    expect(Math.abs(utmE - 166022)).toBeLessThan(10);
    expect(Math.abs(utmN)).toBeLessThan(10);
  });
});
