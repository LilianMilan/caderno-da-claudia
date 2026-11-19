import { anoDoPagamento, inferirAno, lerData, ymd, type Ymd } from './datas'
import { REPETICOES_REAIS, STATUS_ABERTO, STATUS_PAGO } from './regras'
import { chaveNome, lerValor, type Centavos } from './texto'
import type { LinhaBruta, Pagamento, Pendencia, SituacaoPagamento, TipoMovimento, Venda } from './tipos'

interface Classificacao {
  tipo: TipoMovimento
  situacao: SituacaoPagamento
  /** só para parcial: quanto foi pago, ou 'metade' */
  parcial?: Centavos | 'metade'
  naoAnotado?: boolean
  desconhecido?: boolean
}

const PREFIXO_DEVOLUCAO = /^devolu[cç][aã]o\s*-?\s*/i

/** Traduz o que a Lu escreveu em "pagamento". */
export function classificarPagamento(status: string, produto: string, valor: Centavos | null): Classificacao {
  const s = status.trim().toLowerCase().replace(/\s+/g, ' ')
  if (PREFIXO_DEVOLUCAO.test(produto) || (valor !== null && valor < 0) || s === 'devolvi') {
    return { tipo: 'devolucao', situacao: 'pago' }
  }
  if (s === 'troca') return { tipo: 'troca', situacao: 'pago' }
  if (s === '') return { tipo: 'venda', situacao: 'pago', naoAnotado: true }
  if (STATUS_PAGO.includes(s)) return { tipo: 'venda', situacao: 'pago' }
  if (STATUS_ABERTO.includes(s) || s.startsWith('vai pagar')) return { tipo: 'venda', situacao: 'aberto' }
  if (s === 'pagou metade') return { tipo: 'venda', situacao: 'parcial', parcial: 'metade' }
  const m = s.match(/^pagou (?:r\$ ?)?(\d+(?:[.,]\d{1,2})?)$/)
  if (m) return { tipo: 'venda', situacao: 'parcial', parcial: lerValor(m[1])! }
  // Status que não conhecemos: tratamos como fiado para a dívida aparecer, e pedimos revisão.
  return { tipo: 'venda', situacao: 'aberto', desconhecido: true }
}

export interface Movimentos {
  vendas: Venda[]
  pagamentos: Pagamento[]
  pendencias: Pendencia[]
  /** linha bruta de cada venda (para identificar a cliente depois) */
  origem: LinhaBruta[]
}

/**
 * Transforma as linhas do caderno em vendas e pagamentos.
 * Vários arquivos podem ser importados (um por mês, ou o histórico todo): a mesma venda
 * em arquivos diferentes conta uma vez só, valendo a versão do arquivo mais recente
 * (é assim que a Lu atualiza um fiado que foi pago).
 */
export function montarMovimentos(linhas: LinhaBruta[]): Omit<Movimentos, 'vendas'> & { vendas: Omit<Venda, 'clienteId'>[] } {
  const pendencias: Pendencia[] = []
  const aviso = (l: LinhaBruta, tipo: Pendencia['tipo'], mensagem: string, precisaRevisar: boolean) =>
    pendencias.push({ tipo, arquivo: l.arquivo, linha: l.linha, cliente: l.cliente.trim(), mensagem, precisaRevisar })

  // 1. Datas: primeiro as completas, depois deduz o ano das que vieram sem.
  const parciais = linhas.map((l) => lerData(l.data))
  const completas: (Ymd | null)[] = parciais.map((p) => (p && p.ano !== null ? ymd(p.ano, p.mes, p.dia) : null))
  const conhecidas = completas.filter(Boolean).sort() as Ymd[]
  // janela em meses inteiros: '1/11' entra mesmo se a primeira data completa for 02/11
  const janela = {
    min: conhecidas.length ? conhecidas[0].slice(0, 8) + '01' : '2000-01-01',
    max: conhecidas.length ? conhecidas.at(-1)!.slice(0, 8) + '31' : '2100-12-31',
  }

  const datas = linhas.map((l, i) => {
    const p = parciais[i]
    if (!l.data) return null
    if (!p) return null
    if (completas[i]) return completas[i]
    const vizinhos = [anterior(linhas, completas, i), proximo(linhas, completas, i)].filter(Boolean) as Ymd[]
    return inferirAno(p, vizinhos, janela)
  })

  // 2. Repetições: chave = data + cliente + produto + valor (sem o status, que muda quando paga).
  const chaves = linhas.map(
    (l, i) => `${datas[i] ?? 'sem-data:' + l.data}|${chaveNome(l.cliente)}|${chaveNome(l.produto)}|${lerValor(l.valor) ?? l.valor}`,
  )
  const ultimoArquivo = new Map<string, string>()
  linhas.forEach((l, i) => ultimoArquivo.set(chaves[i], l.arquivo))
  const vistasNoArquivo = new Map<string, number>()

  const vendas: Omit<Venda, 'clienteId'>[] = []
  const pagamentos: Pagamento[] = []
  const origem: LinhaBruta[] = []

  linhas.forEach((l, i) => {
    const chave = chaves[i]
    if (ultimoArquivo.get(chave) !== l.arquivo) return // versão antiga, substituída por arquivo mais novo
    const n = (vistasNoArquivo.get(chave) ?? 0) + 1
    vistasNoArquivo.set(chave, n)
    if (n > 1 && !REPETICOES_REAIS.includes(chave)) {
      aviso(l, 'linha_repetida', `Linha igual a outra (${l.data}, ${l.produto}). Contei uma vez só.`, false)
      return
    }

    const data = datas[i]
    if (!l.data) aviso(l, 'sem_data', `Venda sem data${l.obs ? ` ("${l.obs}")` : ''}. Fica fora dos meses e dos pontos até ter data.`, true)
    else if (!data) aviso(l, 'data_invalida', `Não entendi a data "${l.data}".`, true)
    else if (!completas[i]) aviso(l, 'ano_inferido', `"${l.data}" veio sem ano; considerei ${data.split('-').reverse().join('/')}.`, false)

    const valor = lerValor(l.valor)
    const c = classificarPagamento(l.pagamento, l.produto, valor)
    if (valor === null && c.tipo !== 'troca') {
      aviso(l, 'sem_valor', `Valor "${l.valor || 'em branco'}"${l.obs ? ` ("${l.obs}")` : ''}: a confirmar. Fica fora do mês e dos pontos.`, true)
    }
    if (c.naoAnotado) aviso(l, 'pagamento_nao_anotado', 'Pagamento não anotado: considerei pago (é o que acontece na maioria das vezes).', true)
    if (c.desconhecido) aviso(l, 'status_desconhecido', `Não entendi o pagamento "${l.pagamento}"; considerei fiado.`, true)
    if (c.tipo === 'troca') aviso(l, 'troca', 'Troca: não conta como venda nova nem dá pontos.', false)

    const venda: Omit<Venda, 'clienteId'> = {
      id: `${l.arquivo}#${l.linha}`,
      arquivo: l.arquivo,
      linha: l.linha,
      data,
      clienteTexto: l.cliente.trim(),
      produto: l.produto.replace(PREFIXO_DEVOLUCAO, '').trim(),
      tipo: c.tipo,
      valor: c.tipo === 'troca' ? null : valor !== null && c.tipo === 'devolucao' ? -Math.abs(valor) : valor,
      situacao: c.situacao,
      observacao: l.obs,
    }
    vendas.push(venda)
    origem.push(l)

    // 3. Pagamentos derivados do status.
    if (!data || venda.valor === null || c.tipo === 'troca' || c.situacao === 'aberto') return
    const pagoEm = lerData(l.pago_em)
    const dataPagamento = (pagoEm && anoDoPagamento(pagoEm, data)) || data
    if (c.situacao === 'pago') {
      pagamentos.push({ vendaId: venda.id, clienteId: null, data: dataPagamento, valor: venda.valor, estimado: false })
    } else {
      const estimado = c.parcial === 'metade'
      const valorPago = c.parcial === 'metade' ? Math.round(venda.valor / 2) : Math.min(c.parcial!, venda.valor)
      if (estimado) aviso(l, 'valor_pago_estimado', '"Pagou metade": considerei metade do valor pago.', false)
      pagamentos.push({ vendaId: venda.id, clienteId: null, data: dataPagamento, valor: valorPago, estimado })
    }
  })

  return { vendas, pagamentos, pendencias, origem }
}

function anterior(linhas: LinhaBruta[], completas: (Ymd | null)[], i: number): Ymd | null {
  for (let j = i - 1; j >= 0 && linhas[j].arquivo === linhas[i].arquivo; j--) if (completas[j]) return completas[j]
  return null
}
function proximo(linhas: LinhaBruta[], completas: (Ymd | null)[], i: number): Ymd | null {
  for (let j = i + 1; j < linhas.length && linhas[j].arquivo === linhas[i].arquivo; j++) if (completas[j]) return completas[j]
  return null
}
