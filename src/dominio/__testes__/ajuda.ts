import type { LinhaBruta } from '../tipos'

/** Monta uma linha do caderno só com o que importa para o teste. */
export function linha(campos: Partial<LinhaBruta>, n = 2): LinhaBruta {
  return {
    arquivo: 'teste.csv', linha: n, data: '2026-01-10', cliente: 'Maria Silva', telefone: '',
    produto: 'Batom Matte', valor: '45', pagamento: 'pago', pago_em: '', aniversario: '', obs: '',
    ...campos,
  }
}

export const linhas = (...xs: Partial<LinhaBruta>[]) => xs.map((x, i) => linha(x, i + 2))
