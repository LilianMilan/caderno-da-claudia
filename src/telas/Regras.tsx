import type { Ymd } from '../dominio/datas'
import { AJUSTES_PADRAO, type AjustesFidelidade } from '../dominio/relatorios'
import { REGRAS } from '../dominio/regras'

interface Props {
  ajustes: AjustesFidelidade
  aoMudarAjustes: (a: AjustesFidelidade) => void
  hoje: Ymd
  aoMudarHoje: (d: Ymd) => void
}

export function TelaRegras({ ajustes, aoMudarAjustes, hoje, aoMudarHoje }: Props) {
  const numero = (campo: 'prata' | 'ouro') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    if (Number.isFinite(n) && n > 0) aoMudarAjustes({ ...ajustes, [campo]: n })
  }

  return (
    <section className="regras">
      <h3>As regras que você aprovou</h3>
      <ol>
        <li>Fiado: a cliente deve o valor da compra menos o que já pagou. "Pagou metade" conta metade do valor.</li>
        <li>Os {REGRAS.diasParaAtraso} dias de atraso contam a partir da data da compra. Pagar uma parte não zera a contagem.</li>
        <li>1 ponto a cada R$ 10 que a cliente paga. Os centavos vão somando entre as compras.</li>
        <li>Fiado só dá pontos quando é pago. Se o pagamento cair no mês do aniversário, os pontos vêm em dobro.</li>
        <li>
          Níveis: Bronze até {ajustes.prata - 1} pontos, Prata de {ajustes.prata} a {ajustes.ouro - 1}, Ouro a partir de {ajustes.ouro} (10% de
          desconto).
        </li>
        <li>Quem deve há mais de {REGRAS.diasParaAtraso} dias fica Bronze até pagar, sem perder os pontos.</li>
        <li>Devolução tira os pontos da compra. Troca não conta como compra nova.</li>
        <li>O mês valeu a pena quando o dinheiro que entrou é maior que a média dos {REGRAS.mesesParaMedia} meses anteriores. Fiado não conta.</li>
        <li>Pagamento em branco na planilha conta como pago, e fica marcado em Revisar.</li>
        <li>Linhas iguais são erro de digitação e contam uma vez (menos os 2 batons da Joana em 18/10).</li>
      </ol>

      <h3>Ajustes</h3>
      <div className="ajustes">
        <label className="campo">
          Prata a partir de <input type="number" min={1} value={ajustes.prata} onChange={numero('prata')} /> pontos
        </label>
        <label className="campo">
          Ouro a partir de <input type="number" min={1} value={ajustes.ouro} onChange={numero('ouro')} /> pontos
        </label>
        <label className="campo">
          Os pontos{' '}
          <select
            value={ajustes.mesesDeValidade ?? 'nunca'}
            onChange={(e) => aoMudarAjustes({ ...ajustes, mesesDeValidade: e.target.value === 'nunca' ? null : Number(e.target.value) })}
          >
            <option value="nunca">não vencem</option>
            <option value={12}>valem 12 meses</option>
            <option value={24}>valem 24 meses</option>
          </select>
        </label>
        <label className="campo">
          Calcular como se hoje fosse <input type="date" value={hoje} onChange={(e) => e.target.value && aoMudarHoje(e.target.value)} />
        </label>
        <button onClick={() => aoMudarAjustes(AJUSTES_PADRAO)}>Voltar ao combinado</button>
      </div>
    </section>
  )
}
