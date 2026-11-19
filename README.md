# Caderno da Cláudia

App web para a Cláudia Ramos (revendedora de cosméticos) acompanhar o negócio a partir da planilha que a sobrinha Lu monta todo mês com as vendas do caderno e do WhatsApp.

Ela importa o CSV e vê:

- **Fiado**: quem deve, quanto, há quantos dias e o que está atrasado (mais de 30 dias).
- **Mês**: quanto vendeu, quanto dinheiro entrou de verdade, quanto ficou no fiado e se o mês "valeu a pena".
- **Fidelidade**: pontos e nível (Bronze, Prata, Ouro) de cada cliente, com perda de nível por dívida atrasada.
- **Aniversários**: aniversariantes do mês com um botão que abre o WhatsApp com a mensagem de parabéns pronta.
- **Revisar**: o que a planilha não deixa claro e como o app interpretou cada caso.
- **Regras**: as regras que a Cláudia aprovou, escritas por extenso, com os limites de nível ajustáveis.

Os dados ficam só no navegador (`localStorage`). Não há servidor e nenhuma informação das clientes sai do computador dela.

Documentos: [SPEC.md](SPEC.md) (spec de 1 página) · [DECISOES.md](DECISOES.md) (decision log)

## Rodar

```bash
npm install
npm run dev     # http://localhost:5173. Use "Ver com a planilha de exemplo"
npm test        # 79 testes, incluindo uma bateria no vendas.csv real
npm run build   # site estático em dist/
```

## Como funciona

```
CSV ──► leitura.ts ──► movimentos.ts ──► clientes.ts ──► relatorios.ts ──► telas
        (colunas)      (datas, valores,   (quem é quem)    (fiado, pontos,
                        status, repetidas,                  mês, aniversários)
                        pagamentos)
```

- `src/dominio/` concentra todas as regras de negócio, em funções puras e sem React, testadas com Vitest.
  - `regras.ts` é o único lugar com decisões de negócio: limites, status aceitos, apelidos e exceções confirmadas pela cliente.
  - Dinheiro é tratado em **centavos inteiros** e datas como texto `AAAA-MM-DD`, para evitar erros de arredondamento e de fuso horário.
  - `analisar(linhas, hoje, ajustes)` recalcula tudo a partir das linhas importadas e não guarda estado escondido.
- `src/telas/` contém só apresentação.
- **Importação mensal:** pode-se importar o histórico inteiro ou um arquivo por mês. A mesma venda (data + cliente + produto + valor) em arquivos diferentes conta uma vez e vale a versão do arquivo mais recente. É assim que um fiado que a Lu atualizou para "pago" deixa de aparecer como dívida.

## Publicação

Cloudflare Pages ou Vercel: build `npm run build`, pasta `dist`. O `base: './'` do Vite permite servir em qualquer caminho.

## Formato esperado do CSV

`data,cliente,telefone,produto,valor,pagamento,pago_em,aniversario,obs`

O app aceita a bagunça da planilha atual: datas em 3 formatos, valores com `R$` ou ponto, status livres e nomes escritos de vários jeitos. Uma linha com colunas faltando é recusada com uma mensagem clara.
