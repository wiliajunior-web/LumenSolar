/**
 * Formatação do nome/tipo do módulo fotovoltaico para exibição em documentos
 * (Proposta Comercial, Doc. Técnica, Memorial Descritivo, Excel de
 * Auditoria).
 *
 * BUG CORRIGIDO (ago/2026): auditoria de design/conteúdo dos documentos
 * gerados encontrou dois problemas reais no caso Ana Maria Vieira de Sá e
 * Silva:
 *
 *  1. `PropostaComercialPDF.tsx` e `PropostaPDF.tsx` interpolavam
 *     `kit.tipoModulo` (a CHAVE interna do preset, ex. "bifacial_ntype") "
 *     direto no PDF em vez do rótulo em português ("Bifacial N-TYPE
 *     (TOPCon)") — o cliente literalmente lia "620Wp bifacial_ntype" na
 *     Proposta Comercial. `MemorialDescritivo.tsx` (linha ~329) já fazia a
 *     tradução certa via `PRESETS_MODULO[...]?.label` — os outros dois
 *     documentos simplesmente não reaproveitaram esse padrão.
 *
 *  2. Todo lugar que monta "marca + modelo" (`${kit.marcaModulo}
 *     ${kit.modeloModulo}`) duplica o nome da marca quando o usuário digita
 *     o modelo já incluindo a marca — comportamento comum no setor (ex.:
 *     Marca="LEAPTON", Modelo="LEAPTON LP182210-M-66-NB", como no caso real
 *     auditado) produzia "LEAPTON  LEAPTON LP182210-M-66-NB" no PDF.
 *
 * As duas funções abaixo centralizam a formatação correta, para não deixar
 * cada documento reimplementar (e possivelmente esquecer) a mesma regra.
 */

export function formatarNomeModulo(
  marcaModulo?: string | null,
  modeloModulo?: string | null
): string {
  const marca = String(marcaModulo ?? '').trim();
  const modelo = String(modeloModulo ?? '').trim();
  let resultado: string;
  if (!marca) resultado = modelo;
  else if (!modelo) resultado = marca;
  else if (modelo.toLowerCase().startsWith(marca.toLowerCase())) resultado = modelo;
  else resultado = `${marca} ${modelo}`;
  return resultado.replace(/\s+/g, ' ').trim();
}

export function formatarTipoModulo(
  tipoModulo: string | null | undefined,
  presetsModulo: Record<string, { label: string }>
): string {
  const chave = String(tipoModulo ?? '').trim();
  if (!chave) return '';
  return presetsModulo[chave]?.label ?? chave;
}
