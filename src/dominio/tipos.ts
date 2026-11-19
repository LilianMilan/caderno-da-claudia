import type { Aniversario, Ymd } from './datas'
import type { Centavos } from './texto'

/** Uma linha do CSV, como veio. */
export interface LinhaBruta {
  arquivo: string
  linha: number // número da linha no arquivo (cabeçalho = 1)
  data: string
  cliente: string
  telefone: string
  produto: string
  valor: string
  pagamento: string
  pago_em: string
  aniversario: string
  obs: string
}

export type TipoPendencia =
  | 'sem_data'
  | 'data_invalida'
  | 'ano_inferido'
  | 'sem_valor'
  | 'status_desconhecido'
  | 'pagamento_nao_anotado'
  | 'valor_pago_estimado'
  | 'linha_repetida'
  | 'cliente_nao_identificada'
  | 'aniversario_conflitante'
  | 'troca'

export interface Pendencia {
  tipo: TipoPendencia
  arquivo: string
  linha: number
  cliente: string
  mensagem: string
  /** Precisa de ação da Cláudia (true) ou é só aviso de como o app interpretou (false). */
  precisaRevisar: boolean
}

export type TipoMovimento = 'venda' | 'devolucao' | 'troca'
export type SituacaoPagamento = 'pago' | 'aberto' | 'parcial'

export interface Venda {
  id: string
  arquivo: string
  linha: number
  data: Ymd | null
  clienteId: string | null
  clienteTexto: string
  produto: string
  tipo: TipoMovimento
  /** null = valor a confirmar */
  valor: Centavos | null
  situacao: SituacaoPagamento
  observacao: string
}

export interface Pagamento {
  vendaId: string
  clienteId: string | null
  data: Ymd
  valor: Centavos // negativo = devolução de dinheiro
  estimado: boolean
}

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  aniversario: Aniversario | null
}
