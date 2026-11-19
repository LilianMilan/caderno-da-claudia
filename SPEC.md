# Spec: Caderno da Cláudia

**Cliente:** Cláudia Ramos, revendedora de cosméticos. Não manja de tecnologia.
**Quem opera:** a Cláudia, ou a sobrinha Lu, que monta a planilha todo mês.
**Entrada:** `vendas.csv`, passado do caderno e do WhatsApp (nov/2024 a out/2026, 318 linhas, bem bagunçado).

## Problema
A Cláudia não sabe quem deve para ela nem quanto. Pagamentos parciais e atrasados se perdem no caderno. Ela também quer saber se o mês valeu a pena e começar um programa de fidelidade. Precisa funcionar todo mês com um CSV novo, sem trabalho manual de planilha.

## Escopo da v1
1. **Fiado** (prioridade): saldo por cliente (compra menos o que foi pago), dias desde a compra e alerta acima de 30 dias.
2. **Mês**: vendido, recebido e o que ficou no fiado. "Valeu a pena" = recebido maior que a média dos 3 meses anteriores.
3. **Fidelidade**: 1 ponto a cada R$ 10 **pagos**, dobro quando o pagamento cai no mês de aniversário. Bronze até 99, Prata de 100 a 299, Ouro a partir de 300 (10% de desconto). Dívida com mais de 30 dias deixa a cliente Bronze até pagar.
4. **Aniversariantes do mês**, com um link de WhatsApp que já traz a mensagem escrita pela Cláudia.
5. **Revisar**: nada é descartado em silêncio. O que é ambíguo vira uma pendência visível.

## Fora do escopo (e por quê)
- **Envio automático de WhatsApp:** exige a API paga do WhatsApp Business, um número aprovado e o consentimento das clientes. A v1 faz o envio com um clique.
- **Lucro:** a Cláudia não sabe o custo dos produtos. Fica para quando ela tiver esses valores.
- **Registro de pagamento dentro do app, login e várias pessoas usando ao mesmo tempo:** a planilha da Lu continua sendo a fonte da verdade. O próximo passo é registrar pagamentos direto no app.

## Regras confirmadas com a cliente (chat, 19/11/2026)
- **Status do pagamento:**
  - Pago: `pago`, `pg`, `ok`, `pix`, `pagou`, `pago (era fiado)`.
  - Em aberto: `fiado`, `deve`, `a receber`, `vai pagar dia 10`.
  - Em branco: considerado pago, mas sinalizado para revisão.
- **Pagamento parcial:** `pagou 50` significa R$ 50 pagos. `pagou metade` significa 50% pagos, com o valor marcado como estimado.
- **Linhas idênticas:** erro de digitação, contam uma vez. A exceção é a Joana em 18/10/2026, que comprou dois batons.
- **Clientes:** "Cris" é a Cristina Alves. "Ana" sem sobrenome fica sem dona até a Cláudia dizer quem é.
- **Pontos:**
  - Não vencem (opção B, escolhida depois de ver os números).
  - Os 30 dias contam da data da compra, e pagar uma parte não zera a contagem.
  - Devolução tira os pontos. Troca não é compra nova.
- **Valores desconhecidos:** o Kit Natal da Tatiane (valor "?") fica "a confirmar", fora do total do mês e dos pontos.

## Critérios de aceite (cada um tem teste automatizado)
- As 318 linhas viram 312 vendas: 6 repetições removidas e os 2 batons da Joana mantidos.
- As 64 grafias de nome viram 35 clientes. Só a "Ana" fica sem identificação, e o fiado dela (R$ 29,90) aparece separado.
- Casos conferidos à mão:
  - Kátia deve R$ 189,85 (um fiado, um "deve" e um "pagou metade").
  - Fernanda deve R$ 139,90 ("pagou 50" num perfume de R$ 189,90).
  - O fiado da Rosângela lançado duas vezes conta uma.
- Ninguém chega ao Ouro com os dados atuais. Sete clientes são Prata pelos pontos, mas quatro delas ficam Bronze por fiado atrasado.
- Uma venda que aparece num arquivo novo como "pago (era fiado)" sai da lista de fiado.

## Riscos
- Os valores "pagou metade" e as vendas sem status anotado podem não refletir o que aconteceu de verdade. Por isso ficam sinalizados em Revisar.
- O ano das datas sem ano é deduzido pelas vendas vizinhas (55 casos), o que pode errar perto da virada de ano. Cada caso fica listado em Revisar.
- Os dados ficam no navegador: se a Cláudia trocar de computador, precisa importar o CSV de novo.
