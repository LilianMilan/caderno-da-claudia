import { semAcento } from './datas'

/** Centavos inteiros: sem erro de arredondamento em dinheiro. */
export type Centavos = number

/** 'R$ 249,90', '89.9', '45', '-79,90', '1.234,56' → centavos. '?' ou vazio → null. */
export function lerValor(texto: string): Centavos | null {
  let s = texto.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!/\d/.test(s)) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}

export function formatarReais(c: Centavos): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Chave de comparação de nomes: sem acento, minúsculo, espaços únicos. */
export function chaveNome(nome: string): string {
  return semAcento(nome).toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Telefone sem DDI/DDD: os 9 dígitos do celular. '(11) 93210-5432', '+55 11 932105432',
 * '93210-5432' → '932105432'. Todas as clientes são de São Paulo (DDD 11).
 */
export function chaveTelefone(texto: string): string | null {
  let d = texto.replace(/\D/g, '')
  if (d.startsWith('55') && d.length === 13) d = d.slice(2)
  if (d.length === 11) d = d.slice(2)
  return d.length === 9 ? d : null
}

/** Nome para exibir: 'luciana martins ' → 'Luciana Martins'. Mantém os acentos. */
export function nomeBonito(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)(\S)/g, (_, esp, letra) => esp + letra.toUpperCase())
    .replace(/ (Da|De|Do|Das|Dos|E) /g, (m) => m.toLowerCase())
}
