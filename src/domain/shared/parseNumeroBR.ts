/**
 * BUG CORRIGIDO (ago/2026, auditoria de design): caso real (Ana Maria Vieira
 * de Sá e Silva) tinha `localizacao.utmE = "−48,2049444"` — uma
 * latitude/longitude colada do Google Maps nos campos de UTM por engano
 * (ver comentário completo em App.tsx, próximo a `utmValorPlausivel`).
 * O Google Maps copia coordenadas usando SINAL DE MENOS UNICODE (−,
 * U+2212 MINUS SIGN), não o hífen-menos ASCII (-, U+002D) que
 * `Number()`/`parseFloat()` reconhecem. Dois efeitos, os dois corrigidos
 * aqui com a mesma função:
 *
 * 1. `utmValorPlausivel()` (App.tsx) fazia `Number(s.replace(',','.'))`,
 *    que retorna NaN para esse valor — e a função trata "não numérico" como
 *    "não acusar erro" (assumindo que é só um campo em edição, ex: "-" ou
 *    "."), então o aviso de "isso parece ser lat/long, não UTM" NUNCA
 *    aparecia justamente no caso que o motivou (coordenada colada do Google
 *    Maps). Verificado com `node -e` antes da correção: `Number('−48,20'
 *    .replace(',','.'))` → NaN.
 *
 * 2. `gerarFormularioCemig.ts` escrevia `localizacao.utmE` direto numa
 *    célula XLSX com tipo 'n' (numérico) sem validar que o valor É um
 *    número — para essa string, a célula viola a especificação OOXML.
 *    Verificado de duas formas contra o .xlsx gerado pelo código antigo:
 *    openpyxl (Python) recusava abrir o arquivo ("invalid literal for
 *    int(): '−48,2049444'"); o SheetJS (lib usada pelo app) não lançava,
 *    mas lia a célula de volta como v:null/w:"NAN" — perda silenciosa do
 *    dado. Nos dois casos, sem nenhum indício de qual campo estava errado
 *    — e este É o Formulário oficial enviado à CEMIG.
 *
 * `parseNumeroBR` normaliza o sinal de menos Unicode e a vírgula decimal
 * PT-BR antes de tentar converter para número, então "−48,2049444" agora é
 * corretamente reconhecido como -48.2049444 (tanto para acusar o aviso de
 * plausibilidade quanto para decidir se pode ir numa célula 'n' do Excel).
 */
export function parseNumeroBR(valor: string | number | undefined | null): number {
  if (typeof valor === 'number') return valor;
  const s = String(valor ?? '').trim()
    .replace(/−/g, '-') // sinal de menos Unicode (Google Maps) → hífen-menos ASCII
    .replace(',', '.');
  return Number(s);
}
