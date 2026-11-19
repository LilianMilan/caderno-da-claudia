import { anoMes, diasEntre, mesDe, somarMeses, type Ymd } from './datas'
import { MENSAGEM_ANIVERSARIO_PADRAO, REGRAS } from './regras'
import type { Centavos } from './texto'
import type { Cliente, Pagamento, Venda } from './tipos'

// ───────────────────────── Fiado ─────────────────────────

export interface Divida {
  venda: Venda
  emAberto: Centavos
  dias: number
  atrasada: boolean
  /** o valor pago foi estimado ("pagou metade") */
  estimada: boolean
}

export interface FiadoDaCliente {
  clienteId: string
  total: Centavos
  diasDaMaisAntiga: number
  atrasada: boolean
  dividas: Divida[]
}

export interface Fiado {
  porCliente: FiadoDaCliente[]
  semCliente: Divida[]
  total: Centavos
}

/** Quem deve, quanto e há quantos dias. Os 30 dias contam da data da compra. */
export function calcularFiado(vendas: Venda[], pagamentos: Pagamento[], hoje: Ymd): Fiado {
  const pagoPorVenda = new Map<string, { valor: Centavos; estimado: boolean }>()
  for (const p of pagamentos) {
    if (p.data > hoje) continue
    const atual = pagoPorVenda.get(p.vendaId) ?? { valor: 0, estimado: false }
    pagoPorVenda.set(p.vendaId, { valor: atual.valor + p.valor, estimado: atual.estimado || p.estimado })
  }

  const dividas: Divida[] = []
  for (const v of vendas) {
    if (v.tipo !== 'venda' || v.valor === null || v.data === null || v.data > hoje) continue
    const pago = pagoPorVenda.get(v.id)
    const emAberto = v.valor - (pago?.valor ?? 0)
    if (emAberto <= 0) continue
    const dias = diasEntre(v.data, hoje)
    dividas.push({ venda: v, emAberto, dias, atrasada: dias > REGRAS.diasParaAtraso, estimada: pago?.estimado ?? false })
  }

  const grupos = new Map<string, Divida[]>()
  const semCliente: Divida[] = []
  for (const d of dividas) {
    if (!d.venda.clienteId) semCliente.push(d)
    else grupos.set(d.venda.clienteId, [...(grupos.get(d.venda.clienteId) ?? []), d])
  }

  const porCliente = [...grupos].map(([clienteId, ds]) => ({
    clienteId,
    total: soma(ds.map((d) => d.emAberto)),
    diasDaMaisAntiga: Math.max(...ds.map((d) => d.dias)),
    atrasada: ds.some((d) => d.atrasada),
    dividas: ds.sort((a, b) => b.dias - a.dias),
  }))
  porCliente.sort((a, b) => b.total - a.total)
  return { porCliente, semCliente, total: soma(dividas.map((d) => d.emAberto)) }
}

// ─────────────────────── Fidelidade ───────────────────────

export type Nivel = 'Bronze' | 'Prata' | 'Ouro'

export interface Fidelidade {
  clienteId: string
  pontos: number
  /** nível pelos pontos */
  nivelPelosPontos: Nivel
  /** nível que vale hoje (Bronze se tiver dívida atrasada) */
  nivel: Nivel
  bloqueadaPorDivida: boolean
  desconto: number
  faltamParaProximo: number | null
}

/** O que a Cláudia pode ajustar na tela de regras, sem programador. */
export interface AjustesFidelidade {
  prata: number
  ouro: number
  /** null = pontos não vencem */
  mesesDeValidade: number | null
}

export const AJUSTES_PADRAO: AjustesFidelidade = {
  prata: REGRAS.niveis.prata,
  ouro: REGRAS.niveis.ouro,
  mesesDeValidade: REGRAS.mesesDeValidadeDosPontos,
}

export function nivelPorPontos(pontos: number, ajustes: AjustesFidelidade = AJUSTES_PADRAO): Nivel {
  if (pontos >= ajustes.ouro) return 'Ouro'
  if (pontos >= ajustes.prata) return 'Prata'
  return 'Bronze'
}

/**
 * Pontos de um pagamento, em "milésimos de ponto" para os centavos irem somando
 * entre compras (R$ 45 + R$ 55 = 10 pontos).
 */
export function pontosDoPagamento(p: Pagamento, cliente: Cliente | undefined): number {
  const aniversario = cliente?.aniversario && cliente.aniversario.mes === mesDe(p.data)
  // devolução tira só o valor simples (não sabemos em que mês foi a compra original)
  const mult = aniversario && p.valor > 0 ? REGRAS.multiplicadorAniversario : 1
  return p.valor * mult
}

export function calcularFidelidade(
  clientes: Cliente[],
  pagamentos: Pagamento[],
  fiado: Fiado,
  hoje: Ymd,
  ajustes: AjustesFidelidade = AJUSTES_PADRAO,
): Fidelidade[] {
  const inicio = ajustes.mesesDeValidade === null ? '0000-00-00' : somarMeses(hoje, -ajustes.mesesDeValidade)
  const porId = new Map(clientes.map((c) => [c.id, c]))
  const acumulado = new Map<string, number>()
  for (const p of pagamentos) {
    if (!p.clienteId || p.data <= inicio || p.data > hoje) continue
    acumulado.set(p.clienteId, (acumulado.get(p.clienteId) ?? 0) + pontosDoPagamento(p, porId.get(p.clienteId)))
  }
  const atrasadas = new Set(fiado.porCliente.filter((f) => f.atrasada).map((f) => f.clienteId))

  return clientes.map((c) => {
    const pontos = Math.max(0, Math.floor((acumulado.get(c.id) ?? 0) / REGRAS.centavosPorPonto))
    const nivelPelosPontos = nivelPorPontos(pontos, ajustes)
    const bloqueada = atrasadas.has(c.id) && nivelPelosPontos !== 'Bronze'
    const nivel: Nivel = atrasadas.has(c.id) ? 'Bronze' : nivelPelosPontos
    return {
      clienteId: c.id,
      pontos,
      nivelPelosPontos,
      nivel,
      bloqueadaPorDivida: bloqueada,
      desconto: nivel === 'Ouro' ? REGRAS.descontoOuro : 0,
      faltamParaProximo:
        nivelPelosPontos === 'Ouro' ? null : (nivelPelosPontos === 'Prata' ? ajustes.ouro : ajustes.prata) - pontos,
    }
  })
}

// ───────────────────────── Mês ─────────────────────────

export interface ResumoMes {
  mes: string // 'AAAA-MM'
  vendido: Centavos
  recebido: Centavos
  /** quanto das vendas deste mês ainda está em aberto */
  ficouNoFiado: Centavos
  mediaRecebidaAnterior: Centavos | null
  /** null quando não há 3 meses anteriores para comparar */
  valeuAPena: boolean | null
}

export function resumirMeses(vendas: Venda[], pagamentos: Pagamento[], fiado: Fiado, hoje: Ymd): ResumoMes[] {
  const vendido = new Map<string, Centavos>()
  const recebido = new Map<string, Centavos>()
  const noFiado = new Map<string, Centavos>()
  const add = (m: Map<string, Centavos>, k: string, v: Centavos) => m.set(k, (m.get(k) ?? 0) + v)

  for (const v of vendas) if (v.data && v.data <= hoje && v.valor !== null && v.tipo !== 'troca') add(vendido, anoMes(v.data), v.valor)
  for (const p of pagamentos) if (p.data <= hoje) add(recebido, anoMes(p.data), p.valor)
  for (const d of [...fiado.porCliente.flatMap((f) => f.dividas), ...fiado.semCliente]) add(noFiado, anoMes(d.venda.data!), d.emAberto)

  const todos = [...vendido.keys(), ...recebido.keys()].sort()
  if (!todos.length) return []
  const meses: string[] = []
  for (let m = todos[0]; m <= todos.at(-1)!; m = anoMes(somarMeses(`${m}-01`, 1))) meses.push(m)

  return meses.map((mes, i) => {
    const anteriores = meses.slice(Math.max(0, i - REGRAS.mesesParaMedia), i)
    const media =
      anteriores.length === REGRAS.mesesParaMedia
        ? Math.round(soma(anteriores.map((a) => recebido.get(a) ?? 0)) / REGRAS.mesesParaMedia)
        : null
    const rec = recebido.get(mes) ?? 0
    return {
      mes,
      vendido: vendido.get(mes) ?? 0,
      recebido: rec,
      ficouNoFiado: noFiado.get(mes) ?? 0,
      mediaRecebidaAnterior: media,
      valeuAPena: media === null ? null : rec > media,
    }
  })
}

// ─────────────────────── Aniversários ───────────────────────

export interface Aniversariante {
  cliente: Cliente
  linkWhatsapp: string | null
  mensagem: string
}

export function aniversariantesDoMes(clientes: Cliente[], mes: number, modelo = MENSAGEM_ANIVERSARIO_PADRAO): Aniversariante[] {
  return clientes
    .filter((c) => c.aniversario?.mes === mes)
    .sort((a, b) => (a.aniversario!.dia ?? 99) - (b.aniversario!.dia ?? 99))
    .map((cliente) => {
      const mensagem = modelo.replace(/\{nome\}/g, cliente.nome.split(' ')[0])
      return {
        cliente,
        mensagem,
        linkWhatsapp: cliente.telefone
          ? `https://wa.me/55${REGRAS.dddPadrao}${cliente.telefone}?text=${encodeURIComponent(mensagem)}`
          : null,
      }
    })
}

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
