import { Text } from '@react-pdf/renderer';

/**
 * Sobrescrito seguro para documentos @react-pdf/renderer (set/2026).
 *
 * BUG ENCONTRADO auditando o DUB de um caso real já em produção (Ana Maria
 * Vieira de Sá e Silva) DEPOIS de renderizado o PDF de verdade e convertido
 * pra PNG (pdftoppm) pra inspeção visual — não só lendo o código-fonte nem
 * só extraindo texto: o caractere Unicode "²" (SUPERSCRIPT TWO, U+00B2, e o
 * mesmo vale pra "³", U+00B3) NÃO desenha glifo NENHUM nas fontes core
 * Helvetica/Helvetica-Bold/Times-Roman/Times-Bold do @react-pdf/renderer —
 * o texto sai em branco exatamente onde o caractere deveria aparecer (ex.:
 * "Cabo CC 4mm²" vira visualmente "Cabo CC 4mm", sem nem um retângulo de
 * glifo ausente ".notdef" que ao menos chamasse atenção). Confirmado
 * empiricamente gerando um PDF de teste isolado com uma amostra de
 * caracteres, rasterizando com `pdftoppm -r 150` e inspecionando os pixels
 * — Courier/Courier-Bold têm o glifo (não são as fontes usadas no app,
 * então não ajuda aqui). Mesma família de bug do "MINUS SIGN não renderiza"
 * já documentado (parseNumeroBR.ts) — mas esse já tinha correção (usar
 * hífen ASCII); "²"/"³" não tinham nenhuma até agora.
 *
 * A "verificação empírica" que motivou a introdução de "²" no código no
 * primeiro lugar (ver comentário em Procuracao.tsx, ago/2026) usou só
 * `pdftotext -layout` pra comparar os caracteres extraídos de volta do PDF
 * — isso prova que o CARACTERE certo está no mapa ToUnicode do PDF (então
 * copiar/colar do PDF funciona, e os testes automatizados deste projeto,
 * que usam extractPdfTextJoined sobre a ÁRVORE DE ELEMENTOS REACT, nunca
 * tocam o motor de fontes de verdade), mas não prova que existe um GLIFO
 * desenhado pra esse caractere na fonte — são coisas diferentes, e foi
 * exatamente essa lacuna que escondeu o bug até esta auditoria.
 *
 * Fix: nunca usar o caractere "²"/"³" sozinho. Compor um dígito ASCII
 * normal (que renderiza em QUALQUER fonte, incluindo Helvetica) como um
 * <Text> aninhado com `verticalAlign:'super'` — propriedade de verdade do
 * @react-pdf/renderer (@react-pdf/textkit, não uma gambiarra de CSS), que
 * eleva a linha de base do texto — mais um fontSize reduzido pra ficar no
 * tamanho proporcional correto de um sobrescrito tipográfico (a elevação
 * sozinha não encolhe a fonte).
 */
export function Sup({ children, base }: { children: string | number; base: number }) {
  return (
    <Text style={{ fontSize: base * 0.72, verticalAlign: 'super' }}>{children}</Text>
  );
}
