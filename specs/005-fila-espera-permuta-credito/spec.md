# Spec 005: Fila de Espera, Permuta e Crédito

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000, 001, 002, 003, 004

## Contexto e Objetivo
Não existe cancelamento direto pelo membro. Toda saída da caravana passa por promoção de lista de espera (gera crédito) ou permuta mediada (sem crédito) — e, na ausência de ambos, o valor é perdido. Esta spec também cobre a expiração de crédito em 12 meses.

## Escopo

### Dentro do escopo
- `ProcessWaitlist`: promoção automática do primeiro da lista de espera quando uma vaga se abre.
- `RequestSeatSwap` / `ApproveSeatSwap`: permuta mediada por Líder de Caravana ou Admin Estaca (sem geração de crédito).
- Permuta no dia do embarque, limite de 6 por caravana.
- `CreditLedger`: geração (promoção de espera), expiração (12 meses), consulta pelo próprio membro.
- Regra de "valor perdido" quando não há espera nem permuta disponível.

### Fora do escopo
- Concessão excepcional de crédito por `NO_SHOW` (spec 007 — depende do check-in existir primeiro).
- Cancelamento de caravana inteira por quórum (spec 006 — gera crédito por um caminho diferente, "rollover").
- Envio de e-mail de notificação (spec 008).

## Histórias de Usuário

### US-005.1: Promoção automática da lista de espera
Como membro na lista de espera, quero ser promovido automaticamente quando uma vaga abrir, para não perder a chance de ir na caravana.

**Critérios de Aceite (EARS):**
- WHEN uma reserva `confirmado` sai da caravana (por permuta sem substituto ou timeout) E existe ao menos uma reserva `lista_espera` na mesma `caravan_id`, THE SYSTEM SHALL promover a reserva de posição mais antiga da lista de espera para `confirmado`.
- WHEN essa promoção ocorrer, THE SYSTEM SHALL gerar uma entrada em `credit_ledger` para o membro que saiu, com `source = 'waitlist_promotion'` e `expires_at` = data atual + 12 meses.
- THE SYSTEM SHALL executar a promoção e a geração de crédito na mesma transação (nunca um sem o outro).

### US-005.2: Permuta mediada
Como membro que não pode mais ir e sem lista de espera disponível, quero registrar uma permuta com alguém que assumirá minha vaga, para não perder o valor pago.

**Critérios de Aceite (EARS):**
- WHEN um Líder de Caravana ou Admin Estaca registra uma permuta aprovada para uma reserva, THE SYSTEM SHALL transferir a titularidade do assento ao novo nome informado, sem gerar entrada em `credit_ledger`.
- IF não houver lista de espera E nenhuma permuta for registrada até o prazo definido, THEN THE SYSTEM SHALL marcar a reserva como `cancelada_sem_credito` (valor perdido, sem crédito).
- WHILE for o dia do embarque, THE SYSTEM SHALL permitir no máximo 6 permutas por caravana; a 7ª tentativa THE SYSTEM SHALL rejeitar.

### US-005.3: Expiração de crédito
Como sistema, preciso expirar créditos não utilizados após 12 meses, para não manter passivo financeiro indefinido.

**Critérios de Aceite (EARS):**
- WHEN uma entrada de `credit_ledger` atingir `expires_at` sem ter sido usada, THE SYSTEM SHALL transicionar seu `status` para `expired`.
- THE SYSTEM SHALL notificar o membro antes da expiração (evento consumido pela spec 008).
- IF um crédito já expirado for aplicado a uma nova reserva, THEN THE SYSTEM SHALL rejeitar o uso.

## Regras de Negócio Vinculadas
`docs/PRD.md` seção 6.4, `docs/DECISIONS.md` D08, D13.

## Dependências
000, 001, 002, 003, 004.

## Perguntas em Aberto
Nenhuma.
