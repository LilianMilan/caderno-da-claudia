/**
 * Regras combinadas com a Cláudia (chat de 19/11/2026).
 * Tudo que é decisão de negócio fica aqui, em um lugar só, para ela revisar.
 */
export const REGRAS = {
  /** 1 ponto a cada R$ 10 pagos (centavos somam entre compras). */
  centavosPorPonto: 1000,
  /** Pontos em dobro quando o pagamento cai no mês de aniversário. */
  multiplicadorAniversario: 2,
  /**
   * Pontos não vencem (null). A Cláudia escolheu a opção B depois de ver que, com validade
   * de 12 meses, nenhuma cliente passaria de Bronze.
   */
  mesesDeValidadeDosPontos: null as number | null,
  niveis: { prata: 100, ouro: 300 },
  descontoOuro: 0.1,
  /** Dívida com mais de 30 dias (contados da compra) derruba para Bronze até quitar. */
  diasParaAtraso: 30,
  /** Mês valeu a pena: recebido maior que a média dos 3 meses anteriores. */
  mesesParaMedia: 3,
  dddPadrao: '11',
} as const

/** Como a Lu escreve o pagamento no caderno. */
export const STATUS_PAGO = ['pago', 'pg', 'ok', 'pix', 'pagou', 'pago (era fiado)']
export const STATUS_ABERTO = ['fiado', 'deve', 'a receber', 'vai pagar dia 10']

/** Apelidos confirmados pela Cláudia. "Ana" não entra: pode ser Ana Paula ou Ana Beatriz. */
export const APELIDOS: Record<string, string> = {
  cris: 'cristina alves',
  'cris moura': 'cristiane moura',
}

/**
 * Linhas iguais são erro de digitação da Lu, exceto estas (a cliente levou duas unidades).
 * Formato: data|cliente|produto|centavos
 */
export const REPETICOES_REAIS = ['2026-10-18|joana conceicao|batom matte|4500']

/** Texto da própria Cláudia (chat de 19/11/2026). {nome} vira o primeiro nome da cliente. */
export const MENSAGEM_ANIVERSARIO_PADRAO =
  'Oi {nome}! 🎉 Parabéns pelo seu dia, que seja cheio de beleza e alegrias. Um beijo, Cláudia 🙏'
