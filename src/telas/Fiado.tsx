import { useState } from 'react'
import type { Ymd } from '../dominio/datas'
import type { Divida, Fiado } from '../dominio/relatorios'
import { REGRAS } from '../dominio/regras'
import { dataBr, dias, reais } from '../formato'

interface Props {
  fiado: Fiado
  nomes: Map<string, string>
  hoje: Ymd
}

export function TelaFiado({ fiado, nomes, hoje }: Props) {
  const [aberta, setAberta] = useState<string | null>(null)
  const atrasadas = fiado.porCliente.filter((f) => f.atrasada)

  return (
    <section>
      <div className="cartoes">
        <div className="cartao destaque">
          <span>Total a receber</span>
          <strong>{reais(fiado.total)}</strong>
          <small>em {dataBr(hoje)}</small>
        </div>
        <div className="cartao">
          <span>Clientes devendo</span>
          <strong>{fiado.porCliente.length + (fiado.semCliente.length ? 1 : 0)}</strong>
        </div>
        <div className="cartao alerta">
          <span>Devendo há mais de {REGRAS.diasParaAtraso} dias</span>
          <strong>{atrasadas.length}</strong>
          <small>perdem o nível até pagar</small>
        </div>
      </div>

      <ul className="lista">
        {fiado.porCliente.map((f) => (
          <li key={f.clienteId}>
            <button className="linha-cliente" aria-expanded={aberta === f.clienteId} onClick={() => setAberta(aberta === f.clienteId ? null : f.clienteId)}>
              <span className="nome">{nomes.get(f.clienteId)}</span>
              <span className={`selo ${f.atrasada ? 'vermelho' : 'amarelo'}`}>
                {f.atrasada ? `atrasada · ${dias(f.diasDaMaisAntiga)}` : `há ${dias(f.diasDaMaisAntiga)}`}
              </span>
              <span className="valor">{reais(f.total)}</span>
            </button>
            {aberta === f.clienteId && <Detalhe dividas={f.dividas} />}
          </li>
        ))}
      </ul>

      {fiado.semCliente.length > 0 && (
        <>
          <h3>Sem cliente identificada</h3>
          <p className="miudo">Pela planilha não dá para saber quem é. Veja em Revisar.</p>
          <Detalhe dividas={fiado.semCliente} mostrarCliente />
        </>
      )}
    </section>
  )
}

function Detalhe({ dividas, mostrarCliente }: { dividas: Divida[]; mostrarCliente?: boolean }) {
  return (
    <table className="tabela detalhe">
      <thead>
        <tr>
          <th>Compra</th>
          {mostrarCliente && <th>Na planilha</th>}
          <th>Produto</th>
          <th>Situação</th>
          <th className="num">Falta</th>
        </tr>
      </thead>
      <tbody>
        {dividas.map((d) => (
          <tr key={d.venda.id}>
            <td>{dataBr(d.venda.data)}</td>
            {mostrarCliente && <td>{d.venda.clienteTexto}</td>}
            <td>{d.venda.produto}</td>
            <td>
              {d.venda.situacao === 'parcial' ? 'pagou uma parte' : 'não pagou'}
              {d.estimada && <em title="A planilha diz 'pagou metade'"> (estimado)</em>}
              {' · '}
              {dias(d.dias)}
            </td>
            <td className="num">{reais(d.emAberto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
