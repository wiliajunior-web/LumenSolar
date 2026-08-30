import { describe, it, expect } from 'vitest';
import { calcularPosicaoPopupCopiar } from './App';

// ADICIONADO (ago/2026): implementação do popup "Copiar" que aparece ao
// selecionar texto em qualquer lugar do app (pedido do usuário). App.tsx não
// tem infra de teste de componente/DOM (vitest roda em ambiente `node`, não
// `jsdom` — mesma limitação documentada em
// `camposEmpresaParaPreencherAoImportar.test.ts`), então só a matemática pura
// de posicionamento (clamp para não estourar a janela) é testável — a lógica
// de listeners de `mouseup`/`keyup`/`scroll` e o próprio `window.getSelection()`
// dependem do DOM real e não são cobertos por teste automatizado; isso foi
// verificado manualmente no app empacotado (seleção com mouse e com
// Shift+Setas, em texto perto das 4 bordas da janela).
//
// Todos os valores esperados abaixo foram calculados manualmente a partir da
// fórmula (top = max(8, rect.top - 38); left = clamp(rect.left + rect.width/2
// - larguraPopup/2, 8, larguraJanela - larguraPopup - 8)), não copiados da
// implementação.
describe('calcularPosicaoPopupCopiar', () => {
  it('seleção no meio da tela: centraliza acima do texto, sem tocar nenhum limite', () => {
    const pos = calcularPosicaoPopupCopiar({ top: 200, left: 400, width: 120 }, 1200);
    expect(pos).toEqual({ top: 162, left: 412 });
  });

  it('seleção perto do topo da janela: "top" satura em 8 (não passa acima da tela)', () => {
    const pos = calcularPosicaoPopupCopiar({ top: 20, left: 100, width: 50 }, 1200);
    expect(pos).toEqual({ top: 8, left: 77 });
  });

  it('seleção perto da borda direita: "left" satura para não estourar a janela', () => {
    const pos = calcularPosicaoPopupCopiar({ top: 300, left: 1150, width: 80 }, 1200);
    expect(pos).toEqual({ top: 262, left: 1096 }); // 1200 - 96 (largura padrão) - 8
  });

  it('seleção perto da borda esquerda: "left" satura em 8 (não passa para fora à esquerda)', () => {
    const pos = calcularPosicaoPopupCopiar({ top: 300, left: 10, width: 20 }, 1200);
    expect(pos).toEqual({ top: 262, left: 8 });
  });

  it('aceita largura de popup customizada em vez do padrão de 96px', () => {
    const pos = calcularPosicaoPopupCopiar({ top: 100, left: 500, width: 100 }, 1000, 150);
    expect(pos).toEqual({ top: 62, left: 475 });
  });
});
