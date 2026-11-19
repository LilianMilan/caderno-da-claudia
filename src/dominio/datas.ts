/** Datas como texto ISO 'AAAA-MM-DD': sem fuso horário, comparáveis como string. */
export type Ymd = string

export interface DataParcial {
  dia: number
  mes: number
  ano: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

export function ymd(ano: number, mes: number, dia: number): Ymd {
  return `${ano}-${pad(mes)}-${pad(dia)}`
}

export function dataValida(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

function paraUtc(data: Ymd): number {
  const [a, m, d] = data.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

/** Quantos dias de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: Ymd, ate: Ymd): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / 86_400_000)
}

export function somarMeses(data: Ymd, meses: number): Ymd {
  const [a, m, d] = data.split('-').map(Number)
  const total = a * 12 + (m - 1) + meses
  const ano = Math.floor(total / 12)
  const mes = (total % 12) + 1
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return ymd(ano, mes, Math.min(d, ultimoDia))
}

export const mesDe = (data: Ymd) => Number(data.slice(5, 7))
export const anoMes = (data: Ymd) => data.slice(0, 7)

/**
 * Lê as datas do caderno: '02/11/2024', '2024-11-04', '1/11' (sem ano).
 * Devolve null se não reconhecer.
 */
export function lerData(texto: string): DataParcial | null {
  const s = texto.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return validar(Number(m[3]), Number(m[2]), Number(m[1]))
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) {
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return validar(Number(m[1]), Number(m[2]), ano)
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m) return validar(Number(m[1]), Number(m[2]), null)
  return null
}

function validar(dia: number, mes: number, ano: number | null): DataParcial | null {
  // 2024 é bissexto: aceita 29/02 quando não há ano
  return dataValida(ano ?? 2024, mes, dia) ? { dia, mes, ano } : null
}

/**
 * Data sem ano: escolhe o ano que deixa a venda mais perto das vendas vizinhas
 * no arquivo (o caderno foi passado mais ou menos em ordem).
 */
export function inferirAno(
  parcial: DataParcial,
  vizinhos: Ymd[],
  janela: { min: Ymd; max: Ymd },
): Ymd | null {
  const anoMin = Number(janela.min.slice(0, 4))
  const anoMax = Number(janela.max.slice(0, 4))
  let melhor: Ymd | null = null
  let melhorCusto = Infinity
  for (let ano = anoMin; ano <= anoMax; ano++) {
    if (!dataValida(ano, parcial.mes, parcial.dia)) continue
    const candidata = ymd(ano, parcial.mes, parcial.dia)
    const foraDaJanela = candidata < janela.min || candidata > janela.max
    const custo =
      (foraDaJanela ? 100_000 : 0) +
      (vizinhos.length ? Math.min(...vizinhos.map((v) => Math.abs(diasEntre(v, candidata)))) : 0)
    if (custo < melhorCusto) {
      melhorCusto = custo
      melhor = candidata
    }
  }
  return melhor
}

/** Data de pagamento sem ano: a primeira data igual ou depois da venda. */
export function anoDoPagamento(parcial: DataParcial, dataVenda: Ymd): Ymd | null {
  if (parcial.ano !== null) return ymd(parcial.ano, parcial.mes, parcial.dia)
  const anoVenda = Number(dataVenda.slice(0, 4))
  for (const ano of [anoVenda, anoVenda + 1]) {
    if (!dataValida(ano, parcial.mes, parcial.dia)) continue
    const c = ymd(ano, parcial.mes, parcial.dia)
    if (c >= dataVenda) return c
  }
  return null
}

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export const NOME_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export interface Aniversario {
  dia: number | null
  mes: number
}

/** Aniversário: '11/11', '1968-11-27', '14 de maio', 'julho'. O ano de nascimento é descartado. */
export function lerAniversario(texto: string): Aniversario | null {
  const s = semAcento(texto.trim().toLowerCase())
  if (!s) return null
  const data = lerData(s)
  if (data) return { dia: data.dia, mes: data.mes }
  let m = s.match(/^(\d{1,2}) de ([a-z]+)$/)
  if (m) {
    const mes = MESES.indexOf(m[2]) + 1
    return mes && dataValida(2024, mes, Number(m[1])) ? { dia: Number(m[1]), mes } : null
  }
  m = s.match(/^([a-z]+)$/)
  if (m) {
    const mes = MESES.indexOf(m[1]) + 1
    return mes ? { dia: null, mes } : null
  }
  return null
}

export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
