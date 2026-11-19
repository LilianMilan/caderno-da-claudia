import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analisar, lerCsv } from '..'
import { aniversariantesDoMes } from '../relatorios'

/** O vendas.csv que a Lu montou (nov/2024 a out/2026), com o "hoje" da entrega. */
const a = analisar(lerCsv(readFileSync(__dirname + '/vendas.csv', 'utf8'), 'vendas.csv'), '2026-11-19')
const fiadoDe = (id: string) => a.fiado.porCliente.find((f) => f.clienteId === id)
const fidDe = (id: string) => a.fidelidade.find((f) => f.clienteId === id)!

describe('vendas.csv real', () => {
  it('318 linhas viram 312 vendas: 6 repetições removidas, os 2 batons da Joana mantidos', () => {
    expect(a.vendas).toHaveLength(312)
    expect(a.pendencias.filter((p) => p.tipo === 'linha_repetida')).toHaveLength(6)
    expect(a.vendas.filter((v) => v.data === '2026-10-18' && v.clienteId === 'joana conceicao')).toHaveLength(2)
  })

  it('64 grafias viram 35 clientes; só "Ana" fica sem dona', () => {
    expect(a.clientes).toHaveLength(35)
    expect(a.vendas.filter((v) => !v.clienteId).map((v) => v.clienteTexto)).toEqual(['Ana', 'Ana'])
  })

  it('"1/11" da primeira linha é 2024', () => expect(a.vendas[0].data).toBe('2024-11-01'))

  it('fiado de casos conferidos à mão', () => {
    expect(fiadoDe('katia mendes')!.total).toBe(4500 + 6490 + 7995) // fiado + deve + "pagou metade"
    expect(fiadoDe('fernanda lima')!.total).toBe(13990) // "pagou 50" em 189,90
    expect(fiadoDe('rosangela pereira')!.total).toBe(6990) // óleo lançado 2x, deve 1
    expect(a.fiado.semCliente.map((d) => d.emAberto)).toEqual([2990]) // creme da "Ana"
  })

  it('"pago (era fiado)" sai da lista de fiado', () => {
    expect(fiadoDe('simone araujo')).toBeUndefined()
    expect(fiadoDe('bruna castro')).toBeUndefined()
  })

  it('Eliane (valor em branco) e Tatiane (valor "?") ficam para confirmar', () => {
    expect(a.pendencias.filter((p) => p.tipo === 'sem_valor').map((p) => p.cliente)).toEqual(['Eliane Nunes', 'TATIANE CARVALHO'])
  })

  it('pagamento em branco conta como pago, sinalizado (a devolução da Sandra não entra)', () => {
    expect(a.pendencias.filter((p) => p.tipo === 'pagamento_nao_anotado')).toHaveLength(19)
  })

  it('pontos sem vencimento: 7 clientes Prata pelos pontos, nenhuma Ouro', () => {
    const prata = a.fidelidade.filter((f) => f.nivelPelosPontos === 'Prata').map((f) => f.clienteId).sort()
    expect(prata).toEqual(
      ['adriana souza', 'patricia gomes', 'renata almeida', 'rosangela pereira', 'sandra ferreira', 'vanessa oliveira', 'viviane lopes'],
    )
    expect(a.fidelidade.some((f) => f.nivelPelosPontos === 'Ouro')).toBe(false)
  })

  it('4 delas ficam Bronze por fiado atrasado', () => {
    expect(fidDe('sandra ferreira')).toMatchObject({ nivel: 'Bronze', bloqueadaPorDivida: true })
    expect(fidDe('vanessa oliveira')).toMatchObject({ nivel: 'Prata', bloqueadaPorDivida: false })
    expect(a.fidelidade.filter((f) => f.bloqueadaPorDivida)).toHaveLength(4)
  })

  it('aniversariantes de novembro', () => {
    expect(aniversariantesDoMes(a.clientes, 11).map((x) => x.cliente.nome)).toEqual(['Renata Almeida', 'Ana Beatriz Costa', 'Sandra Ferreira'])
  })
})
