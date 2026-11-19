/**
 * Os dados ficam só no navegador da Cláudia (localStorage). Nada vai para servidor.
 * Leitura e escrita protegidas: se o navegador bloquear, o app continua funcionando na sessão.
 */
export function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as T) : padrao
  } catch {
    return padrao
  }
}

export function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* sem espaço ou bloqueado: segue só em memória */
  }
}
