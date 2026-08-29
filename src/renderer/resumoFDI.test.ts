import { describe, it, expect } from 'vitest';
import { calcularFDI, type ParamsFDI } from '@domain/dimensionamento/calcularFDI';
import { resumoFDI } from './App';

// ADICIONADO (ago/2026): antes desta rodada, o painel FDI de App.tsx montava a
// frase de resumo em pt-BR inline, dentro do bloco JSX/IIFE do FDI — sem
// nenhum teste, e o usuário relatou "FDI está confuso, não sei o que
// acontece" ao ver o painel no app real. A lógica foi extraída para a função
// pura `resumoFDI`, exportada de App.tsx só para viabilizar este teste (mesma
// estratégia de utmValorPlausivel.test.ts — não há infra de teste de UI/JSX
// neste projeto). Os cenários abaixo usam SEMPRE o `calcularFDI` real (já
// coberto por seus próprios testes) como fonte da verdade — nunca um
// ResultadoFDI fabricado à mão — para não correr o risco de "ajustar o
// esperado até bater com a implementação" sem verificação independente.
//
// Módulo/inversor de referência usados nos cenários (valores plausíveis de
// datasheet real, não inventados para forçar o resultado):
//   Módulo: 550 Wp, Voc=49,5 V, Vmpp=41,5 V, Isc=13,85 A
//   Inversor: 5 kW, faixa MPPT 80–550 V, Vmáx entrada 550 V
//   nSerieMin = ceil(80×1,1/41,5) = 3 · nSerieMax = floor(min(550/41,5, 550/49,5)) = 11
//   (conferido também via `node -e` fora do runner de teste, item 5 da auditoria)

const BASE: ParamsFDI = {
  potenciaModuloWp: 550,
  vocV: 49.5,
  vmpV: 41.5,
  iscA: 13.85,
  potenciaInversorKW: 5,
  faixaMpptMinV: 80,
  faixaMpptMaxV: 550,
  tensaoMaxEntradaV: 550,
  corrMaxMpptA: 15,
  numMppt: 1,
  quantidade: 10,
  numStrings: 1,
  modulosPorString: 10,
};

describe('resumoFDI — dimensionamento aprovado', () => {
  it('10 módulos de 550Wp / inversor 5kW (FDI=1,1, dentro da faixa ideal): aprova sem ressalvas', () => {
    const r = calcularFDI(BASE);
    expect(r.aprovado).toBe(true);
    expect(r.statusFDI).toBe('ideal');
    expect(resumoFDI(r)).toBe(
      '✓ Este inversor está bem dimensionado para este conjunto de módulos — nenhum ajuste necessário.'
    );
  });
});

describe('resumoFDI — Critério 1 (potência) reprovado', () => {
  it('FDI baixo (arranjo pequeno demais p/ o inversor): explica que o inversor vai ficar ocioso', () => {
    const r = calcularFDI({ ...BASE, quantidade: 5, modulosPorString: 5, numStrings: 1 });
    expect(r.aprovado).toBe(false);
    expect(r.statusFDI).toBe('baixo');
    expect(r.criterio1Ok).toBe(false);
    expect(r.criterio2Ok).toBe(true);
    expect(r.criterio3Ok).toBe(true);
    expect(resumoFDI(r)).toBe(
      '✗ Ajuste necessário: o inversor está grande demais para os módulos (vai ficar ocioso).'
    );
  });

  it('FDI inválido (arranjo grande demais p/ o inversor): explica risco de clipping', () => {
    const r = calcularFDI({
      ...BASE, quantidade: 20, modulosPorString: 10, numStrings: 2, corrMaxMpptA: 30,
    });
    expect(r.aprovado).toBe(false);
    expect(r.statusFDI).toBe('invalido');
    expect(r.criterio1Ok).toBe(false);
    expect(r.criterio2Ok).toBe(true);
    expect(r.criterio3Ok).toBe(true);
    expect(resumoFDI(r)).toBe(
      '✗ Ajuste necessário: os módulos geram mais do que o inversor aguenta (risco de perda por clipping).'
    );
  });
});

describe('resumoFDI — Critério 2 (tensão) reprovado', () => {
  it('módulos/string acima do máximo aceito pelo inversor: aponta faixa de tensão', () => {
    const r = calcularFDI({ ...BASE, modulosPorString: 15 });
    expect(r.aprovado).toBe(false);
    expect(r.criterio1Ok).toBe(true);
    expect(r.criterio2Ok).toBe(false);
    expect(r.criterio3Ok).toBe(true);
    expect(resumoFDI(r)).toBe(
      '✗ Ajuste necessário: o número de módulos em série está fora da faixa de tensão que o inversor aceita.'
    );
  });
});

describe('resumoFDI — Critério 3 (corrente) reprovado', () => {
  it('strings por MPPT acima do limite de corrente: aponta excesso de strings na MPPT', () => {
    const r = calcularFDI({ ...BASE, numStrings: 3 });
    expect(r.aprovado).toBe(false);
    expect(r.criterio1Ok).toBe(true);
    expect(r.criterio2Ok).toBe(true);
    expect(r.criterio3Avaliado).toBe(true);
    expect(r.criterio3Ok).toBe(false);
    expect(resumoFDI(r)).toBe(
      '✗ Ajuste necessário: há strings demais ligadas na mesma entrada MPPT para a corrente que ela suporta.'
    );
  });

  it('Critério 3 não avaliado (Imax_MPPT não informado): NÃO entra na lista de problemas mesmo com muitas strings', () => {
    // Mesma config de "muitas strings" do teste acima, mas sem corrMaxMpptA —
    // confirma que a ausência do dado do datasheet não vira alarme de corrente
    // (ver comentário de criterio3Avaliado em calcularFDI.ts), e some da frase
    // mesmo quando o dimensionamento já reprova por outro critério (baixo, aqui).
    const r = calcularFDI({
      ...BASE, quantidade: 5, modulosPorString: 10, numStrings: 5, corrMaxMpptA: 0,
    });
    expect(r.criterio3Avaliado).toBe(false);
    expect(r.criterio3Ok).toBe(true); // não avaliado não conta contra
    expect(r.aprovado).toBe(false); // reprovado só pelo Critério 1 (FDI baixo)
    expect(resumoFDI(r)).toBe(
      '✗ Ajuste necessário: o inversor está grande demais para os módulos (vai ficar ocioso).'
    );
  });
});
