/** Utilitários puros sem dependências externas — testáveis em Node.js */

/** Gera um ID único para uma proposta (timestamp base36 + random). */
export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
