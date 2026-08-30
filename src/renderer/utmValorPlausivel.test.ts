import { describe, it, expect } from 'vitest';
import { utmValorPlausivel } from './App';

// ADICIONADO (ago/2026): App.tsx não tem infraestrutura de teste de UI
// (sem React Testing Library / simulação de eventos no projeto — só o
// padrão pdfTextTestHelper, que serve para os componentes de PDF, não para
// telas interativas do Electron). Por isso o efeito visual do aviso de
// "isso parece lat/long, não UTM" (renderizado condicionalmente em TabLocal,
// App.tsx) NÃO é coberto por teste automatizado — só a função pura que
// decide a condição, exportada especificamente para isto. Ver comentário em
// App.tsx junto à função e auditoria "geração de documentos", item 1.
describe('utmValorPlausivel', () => {
  it('rejeita o caso real auditado: lat/long do Google Maps digitada nos campos UTM', () => {
    // Ponto real do caso auditado (Ana Maria Vieira de Sá e Silva, Araguari-MG):
    // Google Maps: -18,636501 / -48,205023 — foi parar direto em utmE/utmN.
    expect(utmValorPlausivel('-18.636501')).toBe(false);
    expect(utmValorPlausivel('-48.205023')).toBe(false);
    expect(utmValorPlausivel('-48,2049444')).toBe(false); // hífen-menos ASCII comum
  });

  // BUG CORRIGIDO (ago/2026): o teste acima usa hífen-menos ASCII comum
  // ('-', U+002D) no valor, mas o .lumensolar REAL do caso auditado grava
  // "−48,2049444" — sinal de MENOS UNICODE (−, U+2212 MINUS SIGN), que
  // é o caractere que o Google Maps usa ao copiar coordenadas, e que
  // `Number()` não reconhece como parte de um número (retorna NaN). O teste
  // acima, apesar do comentário anterior dizer "formato exato gravado no
  // .lumensolar do caso", na prática nunca exercitava esse caractere —
  // conferido byte a byte no arquivo real com
  // `[hex(ord(c)) for c in loc['utmE']]` → primeiro byte é 0x2212, não
  // 0x2D — e por isso a função continuava com o defeito (retornava `true`,
  // sem aviso) mesmo com este teste "cobrindo" o caso. Este teste usa o
  // caractere Unicode de fato, via escape, para não haver ambiguidade.
  it('caso real EXATO (sinal de menos Unicode do Google Maps, não hífen-menos ASCII): também rejeita', () => {
    const menosUnicode = '−'; // sinal de menos Unicode, U+2212 (Google Maps)
    expect(utmValorPlausivel(`${menosUnicode}48,2049444`)).toBe(false);
    expect(utmValorPlausivel(`${menosUnicode}18,6366583`)).toBe(false);
  });

  it('aceita coordenadas UTM reais (6-7 dígitos)', () => {
    // UTM real do mesmo ponto (zona 22S, SIRGAS2000/WGS84 — verificado com
    // pyproj na auditoria): E=794.897,61 N=7.937.092,29.
    expect(utmValorPlausivel('794897.61')).toBe(true);
    expect(utmValorPlausivel('7937092.29')).toBe(true);
    expect(utmValorPlausivel('795209')).toBe(true); // placeholder do campo
    expect(utmValorPlausivel('7933873')).toBe(true); // placeholder do campo
  });

  it('não acusa erro em campo vazio/em edição (evita alarme falso a cada tecla digitada)', () => {
    expect(utmValorPlausivel('')).toBe(true);
    expect(utmValorPlausivel('-')).toBe(true);
    expect(utmValorPlausivel('7')).toBe(false); // "7" sozinho já é implausível p/ UTM (abaixo de 1000)
  });
});
