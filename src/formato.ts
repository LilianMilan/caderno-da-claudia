import { NOME_MES, type Ymd } from './dominio/datas'

export { formatarReais as reais } from './dominio/texto'

export const dataBr = (d: Ymd | null) => (d ? d.split('-').reverse().join('/') : 'sem data')

export const nomeDoMes = (anoMes: string) => {
  const [a, m] = anoMes.split('-').map(Number)
  return `${NOME_MES[m - 1]}/${a}`
}

export const hojeLocal = (): Ymd => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)
