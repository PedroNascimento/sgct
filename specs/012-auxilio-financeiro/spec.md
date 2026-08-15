# Spec 012: Auxílio Financeiro (Aprovação e Fundo)

**Status:** Ready for Planning
**Constitution:** v3.0.0
**Depende de:** 000, 001, 003, 004

## Contexto e Objetivo
Membros sem condição de arcar com o valor da caravana podem ser custeados por um de três fundos (Auxílio da Área — Investidura Própria, Auxílio Recém-Converso, Auxílio Estaca Natal — Fundo Reserva). O processo de aprovação é externo ao sistema (decisão do Bispado) e leva de 20 a 30 dias — o sistema precisa registrar esse gate e impedir que a reserva avance sem ele, sem travar a operação normal das reservas pagas pelo próprio membro.

## Escopo

### Dentro do escopo
- Registro do pedido de auxílio (`aid_requests`) pelo Admin Ala, vinculado a uma `reservation` com `funding_source != 'membro'`.
- Aprovação/reprovação do pedido pelo Admin Ala (ou Admin Estaca), com o resultado do processo externo já decidido fora do sistema.
- Bloqueio: reserva com `status = 'aguardando_auxilio'` não avança para `pago_ala` sem `aid_requests.status = 'approved'`.
- Regra de prazo: como o processo externo leva 20-30 dias, a submissão do pedido precisa ocorrer bem antes do fechamento normal de inscrições (domingo anterior ao embarque) — o sistema alerta o Admin Ala se um pedido for registrado tarde demais para ter chance real de aprovação a tempo.
- Ao aprovar, o valor integral da categoria (R$117/R$130) continua sendo registrado como devido à Estaca (`payment_amount` não muda) — só a origem do custeio muda (D30).

### Fora do escopo
- O processo de decisão do Bispado em si (é externo, offline).
- Gestão contábil dos 3 fundos (quanto cada fundo tem disponível) — fora do MVP; o sistema só registra qual fundo foi usado, não controla saldo de fundo.

## Histórias de Usuário

### US-012.1: Registro do pedido de auxílio
Como Admin Ala, quero registrar o pedido de auxílio de um membro de acordo com o tipo aplicável, para formalizar no sistema um processo que já está em andamento com o Bispado.

**Critérios de Aceite (EARS):**
- WHEN uma reserva é criada com `funding_source` diferente de `'membro'`, THE SYSTEM SHALL criar automaticamente um `aid_requests` com `status = 'pending'` e a reserva correspondente em `status = 'aguardando_auxilio'`.
- THE SYSTEM SHALL exigir que `aid_requests.requested_by` seja um Admin Ala (ou Admin Estaca) da mesma `ward_id`/`stake_id` da reserva.

### US-012.2: Aprovação do auxílio
Como Admin Ala, quero marcar um pedido de auxílio como aprovado assim que o Bispado decidir favoravelmente, para destravar a reserva.

**Critérios de Aceite (EARS):**
- WHEN um Admin Ala aprova um `aid_requests`, THE SYSTEM SHALL transicionar a reserva de `aguardando_auxilio` para `pago_ala` (seguindo o fluxo normal de validação semanal da spec 004 a partir daí).
- IF o pedido for reprovado, THEN THE SYSTEM SHALL transicionar a reserva para `cancelada_sem_credito` e notificar o membro (spec 008), já que não houve pagamento de nenhuma origem.

### US-012.3: Alerta de prazo insuficiente
Como Admin Ala, quero ser avisado se um pedido de auxílio for registrado tarde demais para o processo de 20-30 dias terminar a tempo, para orientar o membro sobre o risco.

**Critérios de Aceite (EARS):**
- WHEN um `aid_requests` é criado com menos de 25 dias de antecedência da `caravans.departure_date`, THE SYSTEM SHALL exibir um alerta ao Admin Ala no momento do registro (não bloqueante — é um aviso, a decisão final é do Bispado).

## Regras de Negócio Vinculadas
`docs/DECISIONS.md` D27, D30.

## Dependências
000, 001, 003 (campo `funding_source` já existe na reserva), 004 (status `pago_ala` em diante).

## Perguntas em Aberto
Nenhuma — se o processo de gestão de saldo dos 3 fundos precisar ser controlado dentro do sistema no futuro, isso vira uma spec própria, fora do escopo aqui.
