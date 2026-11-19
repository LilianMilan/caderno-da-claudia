import { useState } from 'react'
import type { ResumoMes } from '../dominio/relatorios'
import { REGRAS } from '../dominio/regras'
import { nomeDoMes, reais } from '../formato'

export function TelaMes({ meses }: { meses: ResumoMes[] }) {
  const [escolhido, setEscolhido] = useState(meses.at(-1)?.mes ?? '')
  const m = meses.find((x) => x.mes === escolhido) ?? meses.at(-1)
  if (!m) return <p>Sem vendas com data.</p>
  const maior = Math.max(...meses.map((x) => Math.max(x.vendido, x.recebido)), 1)

  return (
    <section>
      <label className="campo">
        Mês{' '}
        <select value={m.mes} onChange={(e) => setEscolhido(e.target.value)}>
          {[...meses].reverse().map((x) => (
            <option key={x.mes} value={x.mes}>
              {nomeDoMes(x.mes)}
            </option>
          ))}
        </select>
      </label>

      <div className={`veredito ${m.valeuAPena === null ? '' : m.valeuAPena ? 'bom' : 'ruim'}`}>
        {m.valeuAPena === null ? (
          <>Ainda não dá para comparar: precisa de {REGRAS.mesesParaMedia} meses anteriores.</>
        ) : (
          <>
            <strong>{m.valeuAPena ? 'Valeu a pena.' : 'Ficou abaixo do normal.'}</strong> Entrou {reais(m.recebido)}; a média dos{' '}
            {REGRAS.mesesParaMedia} meses anteriores foi {reais(m.mediaRecebidaAnterior!)}.
          </>
        )}
      </div>

      <div className="cartoes">
        <div className="cartao">
          <span>Vendeu</span>
          <strong>{reais(m.vendido)}</strong>
        </div>
        <div className="cartao destaque">
          <span>Dinheiro que entrou</span>
          <strong>{reais(m.recebido)}</strong>
          <small>inclui fiado antigo pago neste mês</small>
        </div>
        <div className="cartao alerta">
          <span>Ficou no fiado</span>
          <strong>{reais(m.ficouNoFiado)}</strong>
          <small>das vendas deste mês, ainda não pago</small>
        </div>
      </div>

      <h3>Todos os meses</h3>
      <table className="tabela">
        <thead>
          <tr>
            <th>Mês</th>
            <th className="num">Vendeu</th>
            <th className="num">Entrou</th>
            <th className="barra-col" aria-hidden />
            <th className="num">No fiado</th>
            <th>Valeu?</th>
          </tr>
        </thead>
        <tbody>
          {[...meses].reverse().map((x) => (
            <tr key={x.mes} className={x.mes === m.mes ? 'selecionada' : ''} onClick={() => setEscolhido(x.mes)}>
              <td>{nomeDoMes(x.mes)}</td>
              <td className="num">{reais(x.vendido)}</td>
              <td className="num">{reais(x.recebido)}</td>
              <td className="barra-col" aria-hidden>
                <span className="barra" style={{ width: `${(x.recebido / maior) * 100}%` }} />
              </td>
              <td className="num">{reais(x.ficouNoFiado)}</td>
              <td>{x.valeuAPena === null ? '–' : x.valeuAPena ? 'sim' : 'não'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
