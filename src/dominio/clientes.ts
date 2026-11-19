import { lerAniversario, type Aniversario } from './datas'
import { APELIDOS } from './regras'
import { chaveNome, chaveTelefone, nomeBonito } from './texto'
import type { Cliente, Pendencia } from './tipos'

export interface RegistroCliente {
  nome: string
  telefone: string
  aniversario: string
  arquivo: string
  linha: number
}

export interface ResultadoClientes {
  /** clienteId de cada registro, na mesma ordem (null = não identificada). */
  ids: (string | null)[]
  clientes: Cliente[]
  pendencias: Pendencia[]
}

const nomeCompleto = (tokens: string[]) => {
  const ultimo = tokens.at(-1) ?? ''
  return tokens.length >= 2 && !ultimo.endsWith('.') && ultimo.length >= 3
}

/**
 * Descobre quem é quem. Ordem de confiança:
 * 1. nome completo (sem acento/maiúscula), depois de aplicar os apelidos confirmados;
 * 2. nome abreviado ('Luciana M.') que bate com um único nome completo;
 * 3. telefone já visto com um nome completo.
 * Se ainda houver dúvida, não chuta: marca como não identificada.
 */
export function resolverClientes(registros: RegistroCliente[]): ResultadoClientes {
  const chaves = registros.map((r) => {
    const k = chaveNome(r.nome)
    return APELIDOS[k] ?? k
  })

  const canonicos = new Set<string>()
  chaves.forEach((k) => nomeCompleto(k.split(' ')) && canonicos.add(k))

  // telefone → nome completo (descarta telefone que aparece com duas pessoas)
  const porTelefone = new Map<string, string | null>()
  registros.forEach((r, i) => {
    const tel = chaveTelefone(r.telefone)
    if (!tel || !canonicos.has(chaves[i])) return
    const atual = porTelefone.get(tel)
    porTelefone.set(tel, atual === undefined || atual === chaves[i] ? chaves[i] : null)
  })

  const pendencias: Pendencia[] = []
  const ids = registros.map((r, i) => {
    const k = chaves[i]
    if (canonicos.has(k)) return k
    const tokens = k.split(' ')
    const inicial = tokens.length > 1 ? tokens.at(-1)![0] : null
    const candidatos = [...canonicos].filter((c) => {
      const t = c.split(' ')
      return t[0] === tokens[0] && (inicial === null || t.slice(1).some((x) => x.startsWith(inicial)))
    })
    if (candidatos.length === 1) return candidatos[0]
    const tel = chaveTelefone(r.telefone)
    const peloTel = tel ? porTelefone.get(tel) : null
    if (peloTel && (candidatos.length === 0 || candidatos.includes(peloTel))) return peloTel
    pendencias.push({
      tipo: 'cliente_nao_identificada',
      arquivo: r.arquivo,
      linha: r.linha,
      cliente: r.nome,
      mensagem: candidatos.length
        ? `"${r.nome.trim()}" pode ser: ${candidatos.map(nomeBonito).join(' ou ')}.`
        : `Não achei nenhuma cliente com o nome "${r.nome.trim()}".`,
      precisaRevisar: true,
    })
    return null
  })

  // monta o cadastro de cada cliente
  const grupos = new Map<string, number[]>()
  ids.forEach((id, i) => id && grupos.set(id, [...(grupos.get(id) ?? []), i]))

  const clientes: Cliente[] = []
  for (const [id, idx] of grupos) {
    const nomes = idx.map((i) => registros[i].nome.trim()).filter((n) => nomeCompleto(chaveNome(n).split(' ')))
    clientes.push({
      id,
      nome: melhorNome(nomes.length ? nomes : [id]),
      telefone: maisFrequente(idx.map((i) => chaveTelefone(registros[i].telefone)).filter(Boolean) as string[]),
      aniversario: escolherAniversario(id, idx.map((i) => registros[i]), pendencias),
    })
  }
  clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return { ids, clientes, pendencias }
}

function maisFrequente<T>(xs: T[]): T | null {
  const c = new Map<T, number>()
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1))
  let melhor: T | null = null
  let n = 0
  for (const [x, q] of c) if (q > n) [melhor, n] = [x, q]
  return melhor
}

/** Prefere a grafia com acentos e maiúsculas certas ('Lúcia Moreira' em vez de 'LUCIA MOREIRA'). */
function melhorNome(nomes: string[]): string {
  const nota = (n: string) =>
    (n !== n.toUpperCase() && n !== n.toLowerCase() ? 2 : 0) + (/[^\x00-\x7f]/.test(n) ? 1 : 0)
  const freq = new Map<string, number>()
  nomes.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1))
  const ordenados = [...freq.keys()].sort((a, b) => nota(b) - nota(a) || freq.get(b)! - freq.get(a)!)
  return nomeBonito(ordenados[0])
}

function escolherAniversario(id: string, regs: RegistroCliente[], pendencias: Pendencia[]): Aniversario | null {
  const lidos = regs
    .map((r) => ({ r, a: lerAniversario(r.aniversario) }))
    .filter((x): x is { r: RegistroCliente; a: Aniversario } => x.a !== null)
  if (!lidos.length) return null

  const completos = lidos.filter((x) => x.a.dia !== null)
  const diaMes = maisFrequente(completos.map((x) => `${x.a.dia}/${x.a.mes}`))
  const distintos = new Set(completos.map((x) => `${x.a.dia}/${x.a.mes}`))
  const meses = new Set(lidos.map((x) => x.a.mes))

  if (distintos.size > 1 || meses.size > 1) {
    const ultimo = lidos.at(-1)!.r
    pendencias.push({
      tipo: 'aniversario_conflitante',
      arquivo: ultimo.arquivo,
      linha: ultimo.linha,
      cliente: nomeBonito(id),
      mensagem: `Aniversário anotado de jeitos diferentes: ${[...new Set(lidos.map((x) => x.r.aniversario))].join(', ')}. Usei ${diaMes ?? 'o mês mais citado'}.`,
      precisaRevisar: true,
    })
  }
  if (diaMes) {
    const [dia, mes] = diaMes.split('/').map(Number)
    return { dia, mes }
  }
  return { dia: null, mes: maisFrequente(lidos.map((x) => x.a.mes))! }
}
