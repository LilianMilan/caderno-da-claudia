import { describe, expect, it } from 'vitest'
import { analisar } from '..'
import { resolverClientes } from '../clientes'
import { classificarPagamento } from '../movimentos'
import { aniversariantesDoMes } from '../relatorios'
import type { LinhaBruta } from '../tipos'
import { linhas } from './ajuda'

const HOJE = '2026-11-19'

describe('status de pagamento (respostas da Cláudia)', () => {
  it.each(['pago', 'PG', 'ok', 'pix', 'pagou', 'pago (era fiado)'])('"%s" é pago', (s) =>
    expect(classificarPagamento(s, 'Batom', 4500)).toMatchObject({ tipo: 'venda', situacao: 'pago' }),
  )
  it.each(['fiado', 'Deve', 'a receber', 'vai pagar dia 10'])('"%s" é fiado', (s) =>
    expect(classificarPagamento(s, 'Batom', 4500)).toMatchObject({ situacao: 'aberto' }),
  )
  it('em branco é pago, mas marcado para conferir', () =>
    expect(classificarPagamento('', 'Batom', 4500)).toMatchObject({ situacao: 'pago', naoAnotado: true }))
  it('"pagou 50" e "pagou metade" são parciais', () => {
    expect(classificarPagamento('pagou 50', 'Perfume', 18990)).toMatchObject({ situacao: 'parcial', parcial: 5000 })
    expect(classificarPagamento('pagou metade', 'Perfume', 18990)).toMatchObject({ situacao: 'parcial', parcial: 'metade' })
  })
  it('devolução e troca', () => {
    expect(classificarPagamento('', 'devolução - Base', -7990)).toMatchObject({ tipo: 'devolucao' })
    expect(classificarPagamento('troca', 'Hidratante', 5990)).toMatchObject({ tipo: 'troca' })
  })
  it('status desconhecido vira fiado e pede revisão', () =>
    expect(classificarPagamento('vou ver', 'Batom', 4500)).toMatchObject({ situacao: 'aberto', desconhecido: true }))
})

describe('quem é quem', () => {
  const reg = (nome: string, telefone = '') => ({ nome, telefone, aniversario: '', arquivo: 'a', linha: 1 })

  it('junta grafias diferentes da mesma cliente', () => {
    const r = resolverClientes([reg('Luciana Martins'), reg('luciana martins '), reg('LUCIANA MARTINS'), reg('Luciana M.')])
    expect(new Set(r.ids)).toEqual(new Set(['luciana martins']))
    expect(r.clientes[0].nome).toBe('Luciana Martins')
  })
  it('prefere a grafia com acento', () => {
    const r = resolverClientes([reg('LUCIA MOREIRA'), reg('Lucia Moreira'), reg('Lúcia Moreira')])
    expect(r.clientes[0].nome).toBe('Lúcia Moreira')
  })
  it('"Cris" é a Cristina Alves (confirmado pela Cláudia)', () => {
    const r = resolverClientes([reg('Cristina Alves'), reg('Cristiane Moura'), reg('Cris')])
    expect(r.ids[2]).toBe('cristina alves')
  })
  it('"Ana" sozinha fica sem dona: não chuta entre Ana Paula e Ana Beatriz', () => {
    const r = resolverClientes([reg('Ana Paula Ribeiro'), reg('Ana Beatriz Costa'), reg('Ana')])
    expect(r.ids[2]).toBeNull()
    expect(r.pendencias[0]).toMatchObject({ tipo: 'cliente_nao_identificada', precisaRevisar: true })
  })
  it('usa o telefone quando o nome não basta', () => {
    const r = resolverClientes([reg('Ana Paula Ribeiro', '(11) 99123-4567'), reg('Ana Beatriz Costa'), reg('Ana', '99123-4567')])
    expect(r.ids[2]).toBe('ana paula ribeiro')
  })
  it('avisa aniversário anotado de dois jeitos', () => {
    const r = resolverClientes([
      { ...reg('Rosângela Pereira'), aniversario: '12/03' },
      { ...reg('Rosângela Pereira'), aniversario: '12/03' },
      { ...reg('Rosângela Pereira'), aniversario: '21/03' },
    ])
    expect(r.clientes[0].aniversario).toEqual({ dia: 12, mes: 3 })
    expect(r.pendencias[0].tipo).toBe('aniversario_conflitante')
  })
})

describe('linhas repetidas', () => {
  it('conta uma vez só (erro da Lu)', () => {
    const a = analisar(linhas({ data: '16/11/2025', produto: 'Óleo' }, { data: '16/11/2025', produto: 'Óleo' }), HOJE)
    expect(a.vendas).toHaveLength(1)
    expect(a.pendencias.some((p) => p.tipo === 'linha_repetida')).toBe(true)
  })
  it('exceto a Joana em 18/10, que levou dois batons', () => {
    const joana = { data: '18/10/2026', cliente: 'Joana Conceição', produto: 'Batom Matte', valor: '45' }
    expect(analisar(linhas(joana, joana), HOJE).vendas).toHaveLength(2)
  })
  it('a mesma venda em dois arquivos vale a versão mais nova (fiado que foi pago)', () => {
    const antiga = { arquivo: 'outubro.csv', data: '10/10/2026', pagamento: 'fiado' }
    const nova = { arquivo: 'novembro.csv', data: '10/10/2026', pagamento: 'pago (era fiado)', pago_em: '05/11/2026' }
    const a = analisar(linhas(antiga, nova), HOJE)
    expect(a.vendas).toHaveLength(1)
    expect(a.fiado.total).toBe(0)
  })
})

describe('fiado', () => {
  it('soma o que cada cliente deve, com pagamento parcial', () => {
    const a = analisar(
      linhas(
        { data: '2026-11-01', produto: 'Perfume', valor: '189,90', pagamento: 'pagou 50' },
        { data: '2026-11-10', produto: 'Batom', valor: '45', pagamento: 'fiado' },
        { data: '2026-11-11', produto: 'Base', valor: '80', pagamento: 'pago' },
      ),
      HOJE,
    )
    expect(a.fiado.porCliente).toHaveLength(1)
    expect(a.fiado.porCliente[0].total).toBe(13990 + 4500)
  })
  it('"pagou metade" deixa metade em aberto, marcada como estimada', () => {
    const a = analisar(linhas({ data: '2026-11-01', valor: '159,90', pagamento: 'pagou metade' }), HOJE)
    expect(a.fiado.porCliente[0].dividas[0]).toMatchObject({ emAberto: 7995, estimada: true })
  })
  it('atrasada só depois de 30 dias da compra', () => {
    const com = (data: string) => analisar(linhas({ data, pagamento: 'fiado' }), HOJE).fiado.porCliente[0].atrasada
    expect(com('2026-10-20')).toBe(false) // 30 dias
    expect(com('2026-10-19')).toBe(true) // 31 dias
  })
  it('pagar uma parte não zera a contagem', () => {
    const d = analisar(linhas({ data: '2026-10-01', valor: '100', pagamento: 'pagou 50', pago_em: '15/11/2026' }), HOJE)
    expect(d.fiado.porCliente[0]).toMatchObject({ total: 5000, atrasada: true })
  })
  it('fiado da "Ana" aparece separado, sem dona', () => {
    const a = analisar(linhas({ cliente: 'Ana Paula Ribeiro' }, { cliente: 'Ana Beatriz Costa' }, { cliente: 'Ana', pagamento: 'fiado' }), HOJE)
    expect(a.fiado.semCliente).toHaveLength(1)
    expect(a.fiado.porCliente).toHaveLength(0)
  })
})

describe('fidelidade', () => {
  const de = (xs: Partial<LinhaBruta>[]) => analisar(linhas(...xs), HOJE).fidelidade[0]

  it('1 ponto a cada R$ 10 pagos, e os centavos somam entre compras', () => {
    expect(de([{ valor: '45' }, { valor: '55', produto: 'Base' }]).pontos).toBe(10)
    expect(de([{ valor: '9,90' }]).pontos).toBe(0)
  })
  it('fiado não dá ponto até pagar', () => {
    expect(de([{ valor: '100', pagamento: 'fiado', data: '2026-11-10' }]).pontos).toBe(0)
  })
  it('pagou no mês do aniversário: dobro (mesmo se a compra foi antes)', () => {
    const base = { valor: '100', aniversario: '05/09', data: '2026-08-20' }
    expect(de([{ ...base, pagamento: 'pago (era fiado)', pago_em: '10/09/2026' }]).pontos).toBe(20)
    expect(de([{ ...base, pagamento: 'pago' }]).pontos).toBe(10)
  })
  it('pontos não vencem (opção B escolhida pela Cláudia)', () => {
    expect(de([{ valor: '100', data: '2024-11-20' }]).pontos).toBe(10)
  })
  it('validade é ajustável, se ela mudar de ideia', () => {
    const a = analisar(linhas({ valor: '100', data: '2025-11-19' }), HOJE, { prata: 100, ouro: 300, mesesDeValidade: 12 })
    expect(a.fidelidade[0].pontos).toBe(0)
  })
  it('devolução tira os pontos', () => {
    expect(de([{ valor: '189,90' }, { valor: '-189,90', produto: 'DEVOLUÇÃO Perfume', pagamento: 'devolvi' }]).pontos).toBe(0)
  })
  it('troca não dá ponto', () => expect(de([{ valor: '59,90', pagamento: 'troca' }]).pontos).toBe(0))

  it('níveis: Bronze até 99, Prata 100–299, Ouro 300+ com 10% de desconto', () => {
    expect(de([{ valor: '990' }])).toMatchObject({ pontos: 99, nivel: 'Bronze', faltamParaProximo: 1 })
    expect(de([{ valor: '1000' }])).toMatchObject({ nivel: 'Prata', desconto: 0 })
    expect(de([{ valor: '3000' }])).toMatchObject({ nivel: 'Ouro', desconto: 0.1, faltamParaProximo: null })
  })
  it('dívida com mais de 30 dias: vira Bronze, mas não perde os pontos', () => {
    const f = de([{ valor: '3000', data: '2026-06-01' }, { produto: 'Base', valor: '80', pagamento: 'fiado', data: '2026-09-01' }])
    expect(f).toMatchObject({ pontos: 300, nivelPelosPontos: 'Ouro', nivel: 'Bronze', bloqueadaPorDivida: true, desconto: 0 })
  })
  it('pagou a dívida: volta na hora para o nível dela', () => {
    const f = de([
      { valor: '3000', data: '2026-06-01' },
      { produto: 'Base', valor: '80', pagamento: 'pago (era fiado)', pago_em: '18/11/2026', data: '2026-09-01' },
    ])
    expect(f).toMatchObject({ nivel: 'Ouro', bloqueadaPorDivida: false })
  })
})

describe('o mês valeu a pena?', () => {
  it('recebido maior que a média dos 3 meses anteriores (fiado não conta)', () => {
    const a = analisar(
      linhas(
        { data: '2026-01-05', valor: '100' },
        { data: '2026-02-05', valor: '100' },
        { data: '2026-03-05', valor: '100' },
        { data: '2026-04-05', valor: '150' },
        { data: '2026-05-05', valor: '500', pagamento: 'fiado' },
      ),
      HOJE,
    )
    const mes = (m: string) => a.meses.find((x) => x.mes === m)!
    expect(mes('2026-03').valeuAPena).toBeNull() // ainda não tem 3 meses antes
    expect(mes('2026-04')).toMatchObject({ recebido: 15000, mediaRecebidaAnterior: 10000, valeuAPena: true })
    expect(mes('2026-05')).toMatchObject({ vendido: 50000, recebido: 0, ficouNoFiado: 50000, valeuAPena: false })
  })
  it('pagamento entra no mês em que foi pago', () => {
    const a = analisar(linhas({ data: '2026-01-20', pagamento: 'pagou', pago_em: '05/02/2026' }), HOJE)
    expect(a.meses.find((m) => m.mes === '2026-02')!.recebido).toBe(4500)
  })
})

describe('aniversariantes', () => {
  it('lista do mês com a mensagem da Cláudia e link do WhatsApp', () => {
    const a = analisar(linhas({ cliente: 'Renata Almeida', telefone: '(11) 93210-5432', aniversario: '11/11' }), HOJE)
    const [r] = aniversariantesDoMes(a.clientes, 11)
    expect(r.mensagem).toBe('Oi Renata! 🎉 Parabéns pelo seu dia, que seja cheio de beleza e alegrias. Um beijo, Cláudia 🙏')
    expect(r.linkWhatsapp).toMatch(/^https:\/\/wa\.me\/5511932105432\?text=Oi%20Renata/)
  })
})
