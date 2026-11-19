import { resolverClientes } from './clientes'
import type { Ymd } from './datas'
import { montarMovimentos } from './movimentos'
import { AJUSTES_PADRAO, calcularFiado, calcularFidelidade, resumirMeses, type AjustesFidelidade, type Fiado, type Fidelidade, type ResumoMes } from './relatorios'
import type { Cliente, LinhaBruta, Pagamento, Pendencia, Venda } from './tipos'

export interface Analise {
  clientes: Cliente[]
  vendas: Venda[]
  pagamentos: Pagamento[]
  fiado: Fiado
  fidelidade: Fidelidade[]
  meses: ResumoMes[]
  pendencias: Pendencia[]
}

/** Do CSV às respostas: tudo calculado a partir das linhas, sem estado escondido. */
export function analisar(linhas: LinhaBruta[], hoje: Ymd, ajustes: AjustesFidelidade = AJUSTES_PADRAO): Analise {
  const mov = montarMovimentos(linhas)
  const rc = resolverClientes(
    mov.origem.map((l) => ({ nome: l.cliente, telefone: l.telefone, aniversario: l.aniversario, arquivo: l.arquivo, linha: l.linha })),
  )
  const vendas: Venda[] = mov.vendas.map((v, i) => ({ ...v, clienteId: rc.ids[i] }))
  const clientePorVenda = new Map(vendas.map((v) => [v.id, v.clienteId]))
  const pagamentos = mov.pagamentos.map((p) => ({ ...p, clienteId: clientePorVenda.get(p.vendaId) ?? null }))
  const fiado = calcularFiado(vendas, pagamentos, hoje)
  return {
    clientes: rc.clientes,
    vendas,
    pagamentos,
    fiado,
    fidelidade: calcularFidelidade(rc.clientes, pagamentos, fiado, hoje, ajustes),
    meses: resumirMeses(vendas, pagamentos, fiado, hoje),
    pendencias: [...mov.pendencias, ...rc.pendencias].sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha),
  }
}

export * from './tipos'
export * from './relatorios'
export { lerCsv, ErroDeArquivo } from './leitura'
export { REGRAS } from './regras'
