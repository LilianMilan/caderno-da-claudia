import { describe, expect, it } from 'vitest'
import { anoDoPagamento, inferirAno, lerAniversario, lerData, somarMeses } from '../datas'
import { ErroDeArquivo, lerCsv } from '../leitura'
import { chaveTelefone, lerValor } from '../texto'

describe('valor em dinheiro', () => {
  it.each([
    ['R$ 249,90', 24990], ['39,90', 3990], ['89.9', 8990], ['45', 4500],
    ['45,00', 4500], ['-79,90', -7990], ['1.234,56', 123456], ['?', null], ['', null],
  ])('%s → %s centavos', (texto, esperado) => expect(lerValor(texto)).toBe(esperado))
})

describe('datas do caderno', () => {
  it('lê os três formatos', () => {
    expect(lerData('02/11/2024')).toEqual({ dia: 2, mes: 11, ano: 2024 })
    expect(lerData('2024-11-04')).toEqual({ dia: 4, mes: 11, ano: 2024 })
    expect(lerData('1/11')).toEqual({ dia: 1, mes: 11, ano: null })
  })
  it('recusa data impossível', () => expect(lerData('31/02/2025')).toBeNull())

  it('deduz o ano pelas vendas vizinhas', () => {
    const janela = { min: '2024-11-01', max: '2026-10-31' }
    expect(inferirAno({ dia: 1, mes: 11, ano: null }, ['2024-11-02'], janela)).toBe('2024-11-01')
    expect(inferirAno({ dia: 17, mes: 11, ano: null }, ['2025-11-13', '2025-11-24'], janela)).toBe('2025-11-17')
    expect(inferirAno({ dia: 30, mes: 10, ano: null }, ['2026-10-27'], janela)).toBe('2026-10-30')
  })

  it('pagamento sem ano é a primeira data depois da venda', () => {
    expect(anoDoPagamento({ dia: 28, mes: 1, ano: null }, '2025-11-24')).toBe('2026-01-28')
    expect(anoDoPagamento({ dia: 20, mes: 11, ano: null }, '2024-11-04')).toBe('2024-11-20')
  })

  it('soma meses sem estourar o fim do mês', () => {
    expect(somarMeses('2026-03-31', -1)).toBe('2026-02-28')
    expect(somarMeses('2026-11-19', -12)).toBe('2025-11-19')
  })
})

describe('aniversário', () => {
  it.each([
    ['11/11', { dia: 11, mes: 11 }], ['1968-11-27', { dia: 27, mes: 11 }],
    ['14 de maio', { dia: 14, mes: 5 }], ['março', { dia: null, mes: 3 }], ['julho', { dia: null, mes: 7 }],
    ['', null], ['qualquer coisa', null],
  ] as const)('%s', (texto, esperado) => expect(lerAniversario(texto)).toEqual(esperado))
})

describe('telefone', () => {
  it.each(['93210-5432', '(11) 93210-5432', '+55 11 932105432', '11932105432'])('%s vira 932105432', (t) =>
    expect(chaveTelefone(t)).toBe('932105432'),
  )
  it('vazio é null', () => expect(chaveTelefone('')).toBeNull())
})

describe('arquivo CSV', () => {
  it('lê colunas com espaço e BOM', () => {
    const r = lerCsv('﻿data,cliente,telefone,produto,valor,pagamento,pago_em,aniversario,obs\n1/11, Ana ,,Batom,"R$ 45,00",pago,,,\n', 'a.csv')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ linha: 2, cliente: 'Ana', valor: 'R$ 45,00' })
  })
  it('avisa quando falta coluna', () => {
    expect(() => lerCsv('data,cliente\n1/1,Ana\n', 'errado.csv')).toThrow(ErroDeArquivo)
  })
})
