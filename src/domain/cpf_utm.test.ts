/**
 * Testes: CPF/CNPJ (Receita Federal)
 *
 * Os testes de conversão UTM (WGS84) que viviam aqui foram movidos para
 * `geografia/converterCoordenadas.test.ts` (ago/2026): antes havia uma cópia
 * LOCAL da fórmula colada só para este arquivo testar, então o teste nunca
 * checava de verdade a função `latLonToUTM` usada em produção (App.tsx). A
 * fórmula foi extraída para um módulo compartilhado e agora há um teste só,
 * testando a função real usada tanto pelo botão "Buscar coordenadas UTM"
 * quanto pela Planta de Situação.
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

// Testes de conversão UTM: ver src/domain/geografia/converterCoordenadas.test.ts
