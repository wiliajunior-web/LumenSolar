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

/**
 * Coleta todos os nós de um TIPO específico (ex: o componente <Sup> de
 * Superscript.tsx, ou <Image> de @react-pdf/renderer) numa árvore de
 * elementos react-pdf, junto com seus props e os filhos JÁ RENDERIZADOS
 * (component.type(component.props) foi chamado, então `children` aqui é a
 * árvore de saída do componente, não os children que ele recebeu).
 *
 * ADICIONADO (set/2026): nasceu de um bug real — texto extraído com
 * `extractPdfText` prova que o CARACTERE certo está na árvore/no PDF, mas
 * não prova que a fonte usada tem um GLIFO pra desenhar esse caractere (ver
 * comentário completo em Superscript.tsx: "²"/"³" não desenham em nenhuma
 * fonte core do @react-pdf/renderer, mesmo com o caractere certo
 * codificado). A correção usa um componente <Sup> em vez do caractere "²"
 * cru — então o teste de regressão certo não é mais "o texto extraído
 * contém uma string com ²", e sim "existe um nó <Sup> de verdade na árvore,
 * com o dígito certo dentro". Comparação por referência (`node.type ===
 * componente`) funciona pro mesmo motivo documentado abaixo do helper
 * `findImages` local de PropostaComercialPDF.test.ts: um componente
 * definido como função É a própria referência usada como `node.type` pelo
 * JSX compilado.
 */
export function findNodesOfType(node: any, tipo: any): any[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [];
  if (Array.isArray(node)) return node.flatMap((n) => findNodesOfType(n, tipo));
  if (node && typeof node === 'object' && 'props' in node) {
    if (node.type === tipo) {
      return [{ props: node.props, children: extractPdfText(node.type(node.props ?? {})) }];
    }
    if (typeof node.type === 'function') {
      try { return findNodesOfType(node.type(node.props ?? {}), tipo); } catch { return []; }
    }
    return findNodesOfType(node.props?.children, tipo);
  }
  return [];
}
