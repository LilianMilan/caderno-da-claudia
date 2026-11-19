import { useState } from 'react'
import type { AjustesFidelidade, Fidelidade } from '../dominio/relatorios'
import { chaveNome } from '../dominio/texto'

interface Props {
  fidelidade: Fidelidade[]
  nomes: Map<string, string>
  ajustes: AjustesFidelidade
}

export function TelaFidelidade({ fidelidade, nomes, ajustes }: Props) {
  const [busca, setBusca] = useState('')
  const lista = fidelidade
    .filter((f) => chaveNome(nomes.get(f.clienteId) ?? '').includes(chaveNome(busca)))
    .sort((a, b) => b.pontos - a.pontos)
  const conta = (n: string) => fidelidade.filter((f) => f.nivel === n).length

  return (
    <section>
      <div className="cartoes">
        <div className="cartao ouro">
          <span>Ouro · 10% de desconto</span>
          <strong>{conta('Ouro')}</strong>
          <small>{ajustes.ouro}+ pontos</small>
        </div>
        <div className="cartao prata">
          <span>Prata</span>
          <strong>{conta('Prata')}</strong>
          <small>
            {ajustes.prata} a {ajustes.ouro - 1} pontos
          </small>
        </div>
        <div className="cartao bronze">
          <span>Bronze</span>
          <strong>{conta('Bronze')}</strong>
          <small>até {ajustes.prata - 1} pontos</small>
        </div>
      </div>

      <input className="busca" placeholder="Procurar cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} />

      <table className="tabela">
        <thead>
          <tr>
            <th>Cliente</th>
            <th className="num">Pontos</th>
            <th>Nível hoje</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((f) => (
            <tr key={f.clienteId}>
              <td>{nomes.get(f.clienteId)}</td>
              <td className="num">{f.pontos}</td>
              <td>
                <span className={`nivel ${f.nivel.toLowerCase()}`}>{f.nivel}</span>
              </td>
              <td className="obs">
                {f.bloqueadaPorDivida
                  ? `Seria ${f.nivelPelosPontos}, mas tem fiado com mais de 30 dias. Volta quando pagar.`
                  : f.faltamParaProximo !== null
                    ? `Faltam ${f.faltamParaProximo} pontos para ${f.nivelPelosPontos === 'Bronze' ? 'Prata' : 'Ouro'}`
                    : 'Nível máximo'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="miudo">
        1 ponto a cada R$ 10 pagos (fiado só conta quando paga). Pagamento no mês do aniversário vale em dobro.
        {ajustes.mesesDeValidade === null ? ' Os pontos não vencem.' : ` Valem os pontos dos últimos ${ajustes.mesesDeValidade} meses.`}
      </p>
    </section>
  )
}
