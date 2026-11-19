import type { Pendencia, TipoPendencia } from '../dominio/tipos'

const TITULOS: Record<TipoPendencia, string> = {
  cliente_nao_identificada: 'Não sei quem é a cliente',
  sem_valor: 'Valor a confirmar',
  sem_data: 'Venda sem data',
  data_invalida: 'Data que não entendi',
  status_desconhecido: 'Pagamento que não entendi',
  aniversario_conflitante: 'Aniversário anotado de jeitos diferentes',
  pagamento_nao_anotado: 'Pagamento não anotado (considerei pago)',
  linha_repetida: 'Linhas repetidas (contei uma vez)',
  ano_inferido: 'Data sem ano (deduzi pelo resto da planilha)',
  valor_pago_estimado: '"Pagou metade" (considerei metade do valor)',
  troca: 'Trocas (não contam como venda)',
}

export function TelaRevisar({ pendencias }: { pendencias: Pendencia[] }) {
  const grupos = (precisa: boolean) => {
    const m = new Map<TipoPendencia, Pendencia[]>()
    pendencias.filter((p) => p.precisaRevisar === precisa).forEach((p) => m.set(p.tipo, [...(m.get(p.tipo) ?? []), p]))
    return [...m]
  }

  return (
    <section>
      <p>
        O app não joga nada fora em silêncio. Aqui está o que precisa da sua ajuda e, embaixo, como ele entendeu o resto da planilha.
        Para corrigir, ajuste a linha na planilha e importe de novo.
      </p>
      <h3>Precisa da sua ajuda</h3>
      {grupos(true).map(([tipo, ps]) => (
        <Grupo key={tipo} titulo={TITULOS[tipo]} pendencias={ps} aberto={ps.length <= 6} />
      ))}
      <h3>Como o app entendeu</h3>
      {grupos(false).map(([tipo, ps]) => (
        <Grupo key={tipo} titulo={TITULOS[tipo]} pendencias={ps} aberto={false} />
      ))}
    </section>
  )
}

function Grupo({ titulo, pendencias, aberto }: { titulo: string; pendencias: Pendencia[]; aberto: boolean }) {
  return (
    <details className="grupo" open={aberto}>
      <summary>
        {titulo} <span className="contador">{pendencias.length}</span>
      </summary>
      <table className="tabela">
        <tbody>
          {pendencias.map((p, i) => (
            <tr key={i}>
              <td className="miudo">
                {p.arquivo}, linha {p.linha}
              </td>
              <td>{p.cliente}</td>
              <td>{p.mensagem}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
