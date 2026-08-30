/**
 * VALIDAÇÃO DE CADASTRO DA EMPRESA — dados obrigatórios do outorgado/engenheiro
 * responsável em qualquer documento com efeito legal/técnico gerado pelo app.
 *
 * ADICIONADO (ago/2026): até esta correção, gerar um documento com o cadastro
 * da empresa vazio (aba Configurações) produzia um PDF/planilha "válido" do
 * ponto de vista de código — sem erro, sem exceção — mas com o nome do
 * engenheiro, CREA e CNPJ saindo como placeholders em branco
 * ("___________________________"). O único aviso existente (Procuracao.tsx)
 * era uma faixa vermelha DENTRO do PDF já gerado — fácil de não notar antes
 * de assinar/protocolar. Usuário relatou o caso real (Procuração da Ana
 * Maria Vieira de Sá e Silva saiu com "Engenheiro(a) ___________________________"):
 * um aviso depois de gerado não é suficiente — "todos os documentos devem
 * estar preenchidos, nada de _________". A correção é impedir a geração
 * (mesmo padrão de guard já usado para `calculoDesatualizado`), não apenas
 * avisar depois. Esta função é a fonte única da regra, reaproveitada pelo
 * guard de geração (App.tsx `buildData()`/`gerarExcel()`) e pelo próprio
 * PDF da Procuração (mantido como segunda camada de defesa, caso o
 * componente seja renderizado por outro caminho que não passe pelo guard —
 * ex.: `scripts/testarGeracaoPdf.tsx`).
 */

export interface EmpresaCadastro {
  responsavelTecnico?: string;
  crea?: string;
  cnpj?: string;
}

export interface CampoFaltante {
  campo: string;
  label: string;
}

const CAMPOS_OBRIGATORIOS: CampoFaltante[] = [
  { campo: 'responsavelTecnico', label: 'Responsável Técnico' },
  { campo: 'crea', label: 'CREA' },
  { campo: 'cnpj', label: 'CNPJ' },
];

/** Lista os campos obrigatórios do cadastro da empresa que estão vazios/ausentes. */
export function camposFaltantesCadastroEmpresa(empresa: EmpresaCadastro | undefined | null): CampoFaltante[] {
  const e = empresa || {};
  return CAMPOS_OBRIGATORIOS.filter(({ campo }) => !String((e as any)[campo] || '').trim());
}

export function cadastroEmpresaIncompleto(empresa: EmpresaCadastro | undefined | null): boolean {
  return camposFaltantesCadastroEmpresa(empresa).length > 0;
}

/** Mensagem de erro para o guard de geração de documentos (App.tsx). */
export function mensagemCadastroEmpresaIncompleto(empresa: EmpresaCadastro | undefined | null): string {
  const faltantes = camposFaltantesCadastroEmpresa(empresa).map((f) => f.label);
  return (
    `Cadastro da empresa incompleto — preencha ${faltantes.join(', ')} em ⚙ Configurações ` +
    '(barra lateral) antes de gerar qualquer documento. Sem esses dados, a Procuração e o ' +
    'Formulário CEMIG saem com o outorgado/engenheiro responsável não identificado — o que ' +
    'invalida os documentos para protocolo.'
  );
}

/**
 * Formata o CREA do responsável técnico para exibição em documentos
 * (Procuração, Proposta Comercial).
 *
 * BUG CORRIGIDO (ago/2026): auditoria de design/conteúdo dos documentos
 * gerados encontrou "CREA-MG CREA-MG 123456" na assinatura da Proposta
 * Comercial e da Procuração — `Procuracao.tsx`/`PropostaComercialPDF.tsx`
 * sempre prefixavam `CREA-${empresa.uf} ` na frente do valor de
 * `empresa.crea`, mas o campo "CREA" em ⚙ Configurações (App.tsx) não tem
 * hint nenhum dizendo para digitar só o número — é comum (e foi o caso real
 * que revelou isto) o usuário digitar o registro como normalmente aparece em
 * carimbos/ARTs, já com o prefixo ("CREA-MG 123456"). Esta função central
 * evita duplicar o prefixo quando o valor já vem com ele.
 */
export function formatarCrea(empresa: { crea?: string; uf?: string } | undefined | null): string {
  const crea = String(empresa?.crea ?? '').trim();
  if (!crea) return '';
  if (/^crea[\s-]/i.test(crea)) return crea;
  const uf = String(empresa?.uf ?? '').trim() || 'MG';
  return `CREA-${uf} ${crea}`;
}
