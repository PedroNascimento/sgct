# Spec 004: Workflow de Pagamento e Validação Semanal

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-fundacao-multi-tenant-saas, 001-autenticacao-rbac, 002-gestao-caravanas, 003-reservas-concorrencia

## Contexto e Objetivo
O ciclo financeiro em duas etapas (Membro → Ala → Estaca) e o mecanismo que decide, semanalmente, quem fica dentro dos 50 assentos confirmados e quem cai para a lista de espera — com base na ordem de confirmação da transferência, não na ordem de criação da reserva (D17).

## Escopo

### Dentro do escopo
- Transição `PENDENTE → PAGO_ALA` por Admin Ala (com bloqueio de autoaprovação).
- Ciclo semanal de validação (toda terça-feira, exceto semana do embarque) por Admin Estaca: `PAGO_ALA → CONFIRMADO`.
- `RecalculateCaravanRanking`: reordena reservas `PAGO_ALA`/`CONFIRMADO` por `confirmed_at`, aplica o limite de 50 assentos, move excedente para `lista_espera`.
- Timeout de reserva `PENDENTE` sem `PAGO_ALA` a ≤7 dias do embarque (`ExpirePendingReservations`).
- Notificação automática de mudança de posição, com possibilidade de revisão manual do Secretário da Estaca (D15).

### Fora do escopo
- Geração de crédito por promoção de lista de espera ou permuta (spec 005).
- Cancelamento de caravana inteira por quórum insuficiente (spec 006).
- Envio efetivo de e-mail (spec 008 cobre a integração Resend; aqui só o evento é disparado).

## Histórias de Usuário

### US-004.1: Confirmar pagamento na Ala
Como Admin Ala, quero marcar que um membro pagou pelos canais oficiais, para que a reserva avance no fluxo financeiro.

**Critérios de Aceite (EARS):**
- WHEN um Admin Ala confirma o pagamento de uma reserva da própria `ward_id` e `stake_id`, THE SYSTEM SHALL transicionar a reserva de `pendente` para `pago_ala`.
- IF o Admin Ala tentar confirmar uma reserva cujo `user_id` é o dele mesmo, THEN THE SYSTEM SHALL rejeitar (bloqueio de autoaprovação).
- IF o Admin Ala não pertencer à mesma `ward_id`/`stake_id` da reserva, THEN THE SYSTEM SHALL negar o acesso (RLS + validação de use-case).

### US-004.2: Validação semanal das transferências
Como Admin Estaca, quero validar em lote as transferências recebidas toda terça-feira, para confirmar definitivamente as reservas dentro do limite de assentos.

**Critérios de Aceite (EARS):**
- WHILE for terça-feira e não for a semana do embarque da caravana, THE SYSTEM SHALL disparar o job `validate_weekly_transfers`.
- WHEN o Admin Estaca confirma uma transferência, THE SYSTEM SHALL transicionar a reserva de `pago_ala` para `confirmado` e registrar `confirmed_at`.
- IF for a semana do próprio embarque, THEN THE SYSTEM SHALL NOT disparar o ciclo automático semanal (validação nessa semana é manual/contínua).

### US-004.3: Recálculo automático de posição na lista
Como sistema, preciso reordenar a lista da caravana sempre que uma reserva for confirmada, para refletir corretamente quem está dentro do limite de 50 assentos.

**Critérios de Aceite (EARS):**
- WHEN uma reserva transiciona para `confirmado`, THE SYSTEM SHALL recalcular `confirmation_rank` de todas as reservas `confirmado`/`pago_ala` da mesma `caravan_id`, ordenadas por `confirmed_at`.
- IF o número de reservas `confirmado` ultrapassar `seat_limit` (50), THEN THE SYSTEM SHALL mover o excedente (pela ordem de `confirmation_rank`) para `status = 'lista_espera'`.
- WHEN a posição de uma reserva muda entre "dentro do limite" e "lista de espera", THE SYSTEM SHALL disparar um evento de notificação (consumido pela spec 008) e permitir que o Secretário da Estaca revise manualmente antes ou depois do envio automático.
- 🔄 NOVO: WHERE uma reserva tiver `funding_source = 'convidado_transferencia_interestaca'`, THE SYSTEM SHALL rankeá-la **sempre depois** de todas as reservas de membros da própria Estaca anfitriã (`funding_source != 'convidado_transferencia_interestaca'`), independentemente da data de `confirmed_at` do repasse inter-Estaca. Um convidado só ocupa uma das 50 vagas se, depois de rankeados todos os membros da Estaca anfitriã, ainda sobrar espaço e a lista de espera da própria Estaca estiver vazia (D28).

### US-004.4: Timeout de reserva não paga
Como sistema, preciso liberar o compromisso de uma reserva que nunca foi paga, para não bloquear a operação indefinidamente — mas sem liberar o assento antes do prazo.

**Critérios de Aceite (EARS):**
- WHEN a data atual estiver a 7 dias ou menos do embarque E a reserva ainda estiver `pendente` (sem `pago_ala`), THE SYSTEM SHALL transicionar a reserva para `expirada`.
- THE SYSTEM SHALL NOT liberar o assento de uma reserva `pendente`/`pago_ala` antes desse prazo, independentemente de outra reserva da mesma caravana já ter sido confirmada primeiro (D17).
- 🔄 NOVO: IF a reserva estiver em `status = 'aguardando_auxilio'` (aprovação de auxílio pendente, spec 012), THEN THE SYSTEM SHALL NOT aplicar o timeout padrão de 7 dias — o prazo de expiração dessas reservas é tratado na spec 012, já que o processo de aprovação externo leva de 20 a 30 dias e normalmente exige submissão bem antes do prazo geral de inscrição.
- 🔄 NOVO: IF a reserva estiver em `status = 'aguardando_transferencia_interestaca'` (convidado, spec 013), THEN THE SYSTEM SHALL NOT aplicar o timeout padrão de 7 dias — o prazo dessas reservas é tratado na spec 013.

## Regras de Negócio Vinculadas
Ver `docs/PRD.md` seções 6.3, `docs/DECISIONS.md` D01, D15, D17, D28 (prioridade de convidado no ranking).

## Dependências
000, 001, 002, 003.

## Perguntas em Aberto
Nenhuma.
