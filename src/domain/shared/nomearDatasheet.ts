import { normalizarNomeArquivo } from './normalizarNomeArquivo';

/**
 * EXTRAÍDO (set/2026, feature "anexar datasheet do equipamento" — pedido
 * direto do usuário) de dentro do componente `ImportarDatasheet` (App.tsx) —
 * lá a lógica de montar o nome do arquivo estava inline dentro de
 * `salvarCopiaDatasheet`, sem nenhum teste próprio (só era exercitada
 * indiretamente pelo diagnóstico E2E manual, que roda o Electron real e não
 * fica no repositório). Extraída para uma função pura para ter teste
 * unitário de verdade, sem precisar montar todo o app pra validar uma regra
 * de nomenclatura.
 *
 * Formato do nome final: `Datasheet_<Modulo|Inversor>_<nome-normalizado>_<AAAA-MM-DD>.pdf`
 * — usa a data para não sobrescrever silenciosamente uma cópia anterior do
 * mesmo equipamento reimportada em outro dia (ex: revisão do orçamento com
 * um datasheet atualizado do fabricante).
 */
export function nomeArquivoDatasheet(
  tipo: 'modulo' | 'inversor',
  nomeOriginalDoArquivo: string,
  data: Date = new Date(),
): string {
  const semExtensao = nomeOriginalDoArquivo.replace(/\.pdf$/i, '');
  const rotuloTipo = tipo === 'modulo' ? 'Modulo' : 'Inversor';
  const marca = normalizarNomeArquivo(semExtensao) || rotuloTipo;
  const dataISO = data.toISOString().slice(0, 10);
  return `Datasheet_${rotuloTipo}_${marca}_${dataISO}.pdf`;
}
