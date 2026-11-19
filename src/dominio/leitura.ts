import Papa from 'papaparse'
import type { LinhaBruta } from './tipos'

const COLUNAS = ['data', 'cliente', 'telefone', 'produto', 'valor', 'pagamento', 'pago_em', 'aniversario', 'obs'] as const

export class ErroDeArquivo extends Error {}

/** Lê o texto de um CSV no formato do caderno da Lu. */
export function lerCsv(texto: string, arquivo: string): LinhaBruta[] {
  const r = Papa.parse<Record<string, string>>(texto.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  const faltando = COLUNAS.filter((c) => !r.meta.fields?.includes(c))
  if (faltando.length) {
    throw new ErroDeArquivo(`O arquivo "${arquivo}" não tem as colunas: ${faltando.join(', ')}.`)
  }
  return r.data.map((obj, i) => {
    const linha = { arquivo, linha: i + 2 } as LinhaBruta
    for (const c of COLUNAS) linha[c] = (obj[c] ?? '').trim()
    return linha
  })
}
