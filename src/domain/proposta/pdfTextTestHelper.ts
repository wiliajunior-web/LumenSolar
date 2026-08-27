/**
 * Helper de teste (ago/2026): extrai todo o texto de uma árvore de elementos
 * React retornada por um componente @react-pdf/renderer, SEM renderizar o
 * PDF de verdade. Os componentes desta pasta são funções puras que retornam
 * `React.createElement(...)` (via JSX) — chamar a função diretamente (ex:
 * `MemorialDescritivo({ data })`) já dá o objeto `{ type, props, ... }`
 * completo, sem precisar do motor de paginação/fontes do react-pdf.
 *
 * Isso permite testes de REGRESSÃO DE TEXTO exatos (ex: "deve conter
 * 'Minigeração', não deve conter 'Microgeração'") sem depender de uma
 * biblioteca de extração de texto de PDF (nenhuma está no projeto) nem de
 * checks frágeis tipo `expect(buf).toBeTruthy()`, que não pegam palavra
 * errada nenhuma — só "não lançou exceção".
 */
export function extractPdfText(node: any): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(extractPdfText);
  if (node && typeof node === 'object' && 'props' in node) {
    // Primitivos do @react-pdf/renderer (Document/Page/Text/View/Svg/...) são
    // simples STRINGS como `node.type` (ex: 'Text'), não funções — então só
    // recursar em `props.children` já é suficiente para eles. Mas um
    // componente customizado deste projeto (ex: <PageHeader/>, <Footer/>,
    // <DiagramaSvg/>) tem `node.type` como FUNÇÃO — chamar o componente
    // diretamente (`MemorialDescritivo({data})`) só desdobra o primeiro
    // nível da árvore; qualquer texto que more DENTRO de um subcomponente
    // customizado só aparece invocando essa função também, recursivamente
    // (é o que o React faria ao renderizar de verdade).
    if (typeof node.type === 'function') {
      try {
        return extractPdfText(node.type(node.props ?? {}));
      } catch {
        return [];
      }
    }
    return extractPdfText(node.props?.children);
  }
  return [];
}

export function extractPdfTextJoined(node: any): string {
  return extractPdfText(node).join(' ');
}
