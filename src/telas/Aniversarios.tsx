import { useState } from 'react'
import { mesDe, NOME_MES, type Ymd } from '../dominio/datas'
import { aniversariantesDoMes, type Fidelidade } from '../dominio/relatorios'
import type { Cliente } from '../dominio/tipos'

interface Props {
  clientes: Cliente[]
  fidelidade: Fidelidade[]
  hoje: Ymd
  modelo: string
  aoMudarModelo: (m: string) => void
}

export function TelaAniversarios({ clientes, fidelidade, hoje, modelo, aoMudarModelo }: Props) {
  const [mes, setMes] = useState(mesDe(hoje))
  const [editando, setEditando] = useState(false)
  const lista = aniversariantesDoMes(clientes, mes, modelo)
  const nivel = new Map(fidelidade.map((f) => [f.clienteId, f.nivel]))
  const semData = clientes.filter((c) => !c.aniversario).length

  return (
    <section>
      <label className="campo">
        Mês{' '}
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {NOME_MES.map((n, i) => (
            <option key={n} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {lista.length === 0 ? (
        <p>Nenhuma aniversariante em {NOME_MES[mes - 1]}.</p>
      ) : (
        <ul className="lista">
          {lista.map(({ cliente, linkWhatsapp }) => (
            <li key={cliente.id} className="linha-aniversario">
              <span className="dia">{cliente.aniversario!.dia ?? '?'}</span>
              <span className="nome">
                {cliente.nome}
                <small>
                  {nivel.get(cliente.id)} · pontos em dobro este mês{cliente.aniversario!.dia === null && ' · dia não anotado'}
                </small>
              </span>
              {linkWhatsapp ? (
                <a className="botao whatsapp" href={linkWhatsapp} target="_blank" rel="noreferrer">
                  Mandar parabéns
                </a>
              ) : (
                <span className="miudo">sem telefone</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mensagem">
        <div className="mensagem-topo">
          <h3>Mensagem de parabéns</h3>
          <button onClick={() => setEditando(!editando)}>{editando ? 'Pronto' : 'Editar'}</button>
        </div>
        {editando ? (
          <>
            <textarea value={modelo} rows={3} onChange={(e) => aoMudarModelo(e.target.value)} />
            <p className="miudo">Escreva {'{nome}'} onde entra o primeiro nome da cliente.</p>
          </>
        ) : (
          <p className="balao">{modelo.replace('{nome}', 'Renata')}</p>
        )}
        <p className="miudo">
          O botão abre o WhatsApp com a mensagem pronta; você só aperta enviar.
          {semData > 0 && ` ${semData} ${semData === 1 ? 'cliente ainda não tem' : 'clientes ainda não têm'} aniversário anotado.`}
        </p>
      </div>
    </section>
  )
}
