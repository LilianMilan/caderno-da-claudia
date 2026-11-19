import { useMemo, useRef, useState, type DragEvent } from 'react'
import { gravar, ler } from './armazenamento'
import { analisar, ErroDeArquivo, lerCsv } from './dominio'
import { AJUSTES_PADRAO, type AjustesFidelidade } from './dominio/relatorios'
import { MENSAGEM_ANIVERSARIO_PADRAO } from './dominio/regras'
import { dataBr, hojeLocal } from './formato'
import { TelaAniversarios } from './telas/Aniversarios'
import { TelaFiado } from './telas/Fiado'
import { TelaFidelidade } from './telas/Fidelidade'
import { TelaMes } from './telas/Mes'
import { TelaRegras } from './telas/Regras'
import { TelaRevisar } from './telas/Revisar'

interface Arquivo {
  nome: string
  texto: string
  importadoEm: string
}

const ABAS = ['Fiado', 'Mês', 'Fidelidade', 'Aniversários', 'Revisar', 'Regras'] as const
type Aba = (typeof ABAS)[number]

export default function App() {
  const [arquivos, setArquivos] = useState<Arquivo[]>(() => ler('arquivos', []))
  const [ajustes, setAjustes] = useState<AjustesFidelidade>(() => ler('ajustes', AJUSTES_PADRAO))
  const [modelo, setModelo] = useState<string>(() => ler('mensagemAniversario', MENSAGEM_ANIVERSARIO_PADRAO))
  const [hoje, setHoje] = useState(hojeLocal)
  const [aba, setAba] = useState<Aba>('Fiado')
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const salvarArquivos = (novos: Arquivo[]) => {
    setArquivos(novos)
    gravar('arquivos', novos)
  }

  const analise = useMemo(
    () => (arquivos.length ? analisar(arquivos.flatMap((a) => lerCsv(a.texto, a.nome)), hoje, ajustes) : null),
    [arquivos, hoje, ajustes],
  )
  const nomes = useMemo(() => new Map(analise?.clientes.map((c) => [c.id, c.nome])), [analise])

  async function importar(lista: { nome: string; texto: string }[]) {
    setErro(null)
    try {
      lista.forEach((a) => lerCsv(a.texto, a.nome)) // valida antes de guardar
    } catch (e) {
      setErro(e instanceof ErroDeArquivo ? e.message : 'Não consegui ler esse arquivo. Ele é um CSV?')
      return
    }
    // mesmo nome substitui; o mais recente vai para o fim (vale a versão dele)
    const novos = lista.map((a) => ({ ...a, importadoEm: new Date().toISOString() }))
    salvarArquivos([...arquivos.filter((a) => !novos.some((n) => n.nome === a.nome)), ...novos])
  }

  const importarArquivos = async (files: FileList | null) => {
    if (!files?.length) return
    await importar(await Promise.all([...files].map(async (f) => ({ nome: f.name, texto: await f.text() }))))
  }

  const usarExemplo = async () => {
    const texto = await (await fetch(`${import.meta.env.BASE_URL}exemplo-vendas.csv`)).text()
    await importar([{ nome: 'vendas.csv', texto }])
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    importarArquivos(e.dataTransfer.files)
  }

  const revisar = analise?.pendencias.filter((p) => p.precisaRevisar).length ?? 0
  const ultimaVenda = analise?.vendas.map((v) => v.data).filter(Boolean).sort().at(-1) ?? null

  return (
    <div
      className={`app ${arrastando ? 'arrastando' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={soltar}
    >
      <header className="topo">
        <div>
          <h1>Caderno da Cláudia</h1>
          <p className="sub">
            {analise
              ? `${analise.vendas.length} vendas · ${analise.clientes.length} clientes · última venda em ${dataBr(ultimaVenda)}`
              : 'Fiado, vendas do mês, pontos e aniversários'}
          </p>
        </div>
        <div className="acoes">
          <input ref={entrada} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => importarArquivos(e.target.files)} />
          <button className="primario" onClick={() => entrada.current?.click()}>
            Importar planilha do mês
          </button>
        </div>
      </header>

      {erro && <div className="aviso erro">{erro}</div>}

      {!analise ? (
        <section className="boas-vindas">
          <h2>Comece pela planilha da Lu</h2>
          <p>
            Arraste o arquivo <strong>.csv</strong> para cá ou toque em <em>Importar planilha do mês</em>. Pode ser o histórico todo ou só o
            mês novo: o app junta tudo e não conta a mesma venda duas vezes.
          </p>
          <button onClick={usarExemplo}>Ver com a planilha de exemplo (nov/2024 a out/2026)</button>
          <p className="miudo">Os dados ficam só neste navegador. Nada é enviado para a internet.</p>
        </section>
      ) : (
        <>
          <div className="arquivos">
            {arquivos.map((a) => (
              <span key={a.nome} className="chip">
                {a.nome}
                <button
                  aria-label={`Remover ${a.nome}`}
                  onClick={() => confirm(`Remover "${a.nome}" do app?`) && salvarArquivos(arquivos.filter((x) => x !== a))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <nav className="abas" role="tablist">
            {ABAS.map((a) => (
              <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? 'ativa' : ''} onClick={() => setAba(a)}>
                {a}
                {a === 'Revisar' && revisar > 0 && <span className="contador">{revisar}</span>}
              </button>
            ))}
          </nav>

          <main>
            {aba === 'Fiado' && <TelaFiado fiado={analise.fiado} nomes={nomes} hoje={hoje} />}
            {aba === 'Mês' && <TelaMes meses={analise.meses} />}
            {aba === 'Fidelidade' && <TelaFidelidade fidelidade={analise.fidelidade} nomes={nomes} ajustes={ajustes} />}
            {aba === 'Aniversários' && (
              <TelaAniversarios
                clientes={analise.clientes}
                fidelidade={analise.fidelidade}
                hoje={hoje}
                modelo={modelo}
                aoMudarModelo={(m) => {
                  setModelo(m)
                  gravar('mensagemAniversario', m)
                }}
              />
            )}
            {aba === 'Revisar' && <TelaRevisar pendencias={analise.pendencias} />}
            {aba === 'Regras' && (
              <TelaRegras
                ajustes={ajustes}
                hoje={hoje}
                aoMudarHoje={setHoje}
                aoMudarAjustes={(a) => {
                  setAjustes(a)
                  gravar('ajustes', a)
                }}
              />
            )}
          </main>
        </>
      )}
      <footer>Os dados ficam só neste navegador. Nada é enviado para a internet.</footer>
    </div>
  )
}
