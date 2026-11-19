# Decision log

Cada decisão indica a origem: **[Cláudia]** quando foi confirmada no chat com a cliente, **[Eu]** quando foi decidida por mim e está explicada aqui.

## Produto

| # | Decisão | Alternativas descartadas | Por quê |
|---|---|---|---|
| 1 | Prioridade é o **fiado** **[Eu]** | Começar pela fidelidade | É a dor real ("não sei quem me deve"). A fidelidade depende do fiado (pontos só no que foi pago, perda de nível por dívida). |
| 2 | WhatsApp de **um clique** (`wa.me` com o texto pronto), sem envio automático **[Eu]** | API do WhatsApp Business | O envio automático exige API paga, número aprovado e consentimento das clientes (LGPD). O link resolve 90% com custo zero. O texto é da própria Cláudia **[Cláudia]**. |
| 3 | "Mês valeu a pena" = **dinheiro que entrou maior que a média dos 3 meses anteriores** **[Cláudia, por proposta minha]** | Comparar o total vendido; meta fixa; lucro | O vendido inclui fiado, que ainda não está no bolso, e a dor dela é justamente vender fiado e não receber. Ela não sabe o custo dos produtos, então lucro não dá para calcular. A média móvel se ajusta à sazonalidade sem ela precisar definir uma meta. |
| 4 | **Pontos não vencem** **[Cláudia]** | Validade de 12 meses (minha proposta inicial) | Rodei a regra nos dados do case (dados fictícios fornecidos pela Data² para o teste técnico): com 12 meses, a melhor cliente teria 97 pontos e ninguém sairia do Bronze, então o programa não premiaria ninguém. Apresentei 3 opções com números e ela escolheu a B. Os limites e a validade ficaram ajustáveis na tela Regras. |
| 5 | Dívida atrasada: a cliente **vira Bronze, mas mantém os pontos** **[Cláudia]** | Descer só um nível; zerar os pontos | É a leitura literal de "perde o nível até pagar". Pagou, volta na hora. É simples de explicar para a cliente. |
| 6 | 30 dias **contados da data da compra**; pagamento parcial não zera **[Cláudia]** | Contar do último pagamento | É a única data presente em todas as linhas: `pago_em` só existe em 24 das 318. |
| 7 | Pontos somam os **centavos entre compras** **[Cláudia]** | Arredondar compra por compra | Arredondar por compra faria quem compra batom (R$ 45) perder cerca de 10% dos pontos, e uma compra de R$ 9 nunca daria ponto. |

## Dados

| # | Decisão | Alternativas descartadas | Por quê |
|---|---|---|---|
| 8 | **Pagamento em branco = pago**, sinalizado em Revisar **[Cláudia]** | Considerar fiado; descartar a linha | "Na maioria das vezes foi pago na hora." Assumir fiado inflaria dívidas de quem provavelmente pagou, e cobrar quem já pagou é pior para o negócio do que deixar de cobrar uma. |
| 9 | **Linhas idênticas** contam uma vez, com uma lista de exceções em `regras.ts` (Joana, 18/10) **[Cláudia]** | Somar tudo; perguntar caso a caso | A Cláudia confirmou que costuma ser erro da Lu. A exceção fica registrada em código, visível e testada. |
| 10 | **Identidade da venda** = data + cliente + produto + valor, sem o status **[Eu]** | Linha inteira; número da linha | Quando a Lu muda "fiado" para "pago (era fiado)", a venda precisa continuar sendo a mesma. Entre arquivos, vale a versão do mais recente. Isso permite importar o histórico inteiro ou só o mês novo. |
| 11 | **Quem é quem:** nome normalizado, depois abreviação única ("Luciana M."), depois telefone **[Eu]**; apelido "Cris" é a Cristina **[Cláudia]** | Agrupar só pelo telefone; correspondência aproximada de texto | O telefone falta em muitas linhas. A correspondência aproximada juntaria "Cristina" com "Cristiane". Quando há dúvida, o app **não chuta**: "Ana" fica sem dona e o fiado dela aparece separado. |
| 12 | **Data sem ano:** o app escolhe o ano mais próximo das vendas vizinhas no arquivo **[Eu]** | Assumir o ano corrente; descartar | 57 linhas não têm ano e o arquivo está quase em ordem. Achei um bug com o teste da 1ª linha ("1/11" virava 2025): a janela de datas precisava cobrir meses inteiros. Corrigi e o caso virou teste. |
| 13 | **"Pagou metade"** = 50% pago, marcado como "estimado" **[Cláudia]** | Ignorar o pagamento | A Cláudia não sabe quanto falta. Metade é a melhor estimativa, e a marcação deixa isso visível. |
| 14 | **Valor desconhecido** ("?" da Tatiane, valor em branco da Eliane) fica "a confirmar", fora dos totais e dos pontos **[Cláudia]** | Usar o preço de tabela do produto | A Tatiane teve desconto, então o preço de tabela inventaria dinheiro. Usei a mesma regra para a Eliane por consistência. |
| 15 | **Devolução** tira o valor da venda e os pontos (sem o dobro de aniversário); **troca** não entra **[Cláudia]** | Ligar a devolução à compra original | A planilha não liga uma coisa à outra. Simplifiquei e registrei aqui. |
| 16 | **Aniversário em conflito** (Rosângela: 12/03 e 21/03): o app usa a data mais citada e avisa **[Eu]** | Escolher em silêncio | É um dado da cliente, então quem decide é a Cláudia. |

## Técnica

| # | Decisão | Alternativas descartadas | Por quê |
|---|---|---|---|
| 17 | App **estático** (React + TS + Vite), dados no navegador **[Eu]** | Backend com banco; Google Sheets com script | Não tem custo, não tem servidor para manter, e os dados das clientes não saem do computador dela. O custo é que os dados não sincronizam entre aparelhos, o que está anotado como próximo passo. |
| 18 | **Regras em funções puras + Vitest** e um único `regras.ts` **[Eu]** | Lógica dentro dos componentes | A regra de negócio fica testável e revisável. Cada resposta da Cláudia virou um teste. |
| 19 | **Centavos inteiros** e datas como texto `AAAA-MM-DD` **[Eu]** | `number` em reais e `Date` | Evita erros de arredondamento (0,1 + 0,2) e de fuso horário (UTC-3 jogando a venda para o dia anterior). |
