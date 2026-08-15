# Spec 006: Quórum, Cancelamento de Caravana e Menores

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000, 001, 002, 003, 004, 005

## Contexto e Objetivo
Regra de quórum mínimo (48 inscritos) que pode cancelar a caravana inteira com rollover automático de crédito, e o fluxo de cadastro de menores: crianças de colo no manifesto e menores 12-17 com formulário de autorização aprovado pelo Admin Ala.

## Escopo

### Dentro do escopo
- `CheckMinimumQuorum`: job semanal (terça anterior ao embarque) que cancela a caravana se `confirmado + pago_ala < 48`.
- Rollover automático: toda reserva da caravana cancelada gera crédito e é recriada na próxima caravana disponível da mesma Estaca.
- `passenger_manifest_entries` (crianças de colo, 0-5 anos): CRUD vinculado à reserva do responsável.
- `minor_approval_forms`: upload de formulário assinado + aprovação pelo Admin Ala.

### Fora do escopo
- Geração/validação do QR Code de check-in (spec 007).
- Regras de assento/reserva em si (spec 003).

## Histórias de Usuário

### US-006.1: Cancelamento de caravana por quórum insuficiente
Como sistema, preciso cancelar uma caravana que não atingiu o mínimo de inscritos, para não realizar uma viagem inviável financeiramente.

**Critérios de Aceite (EARS):**
- WHEN for a data de `quorum_check_date` de uma caravana E o total de reservas `confirmado`+`pago_ala` for menor que `min_quorum` (48), THE SYSTEM SHALL transicionar `caravans.status` para `cancelled`.
- IF o total for exatamente 48, THEN THE SYSTEM SHALL NOT cancelar (teste de limite exato).
- WHEN uma caravana é cancelada por quórum, THE SYSTEM SHALL gerar crédito (`source = 'caravan_cancelled'`) para toda reserva ativa daquela caravana e recriar automaticamente uma reserva equivalente (mesmo `user_id`, `ward_id`, categoria) na próxima caravana disponível da mesma `stake_id`.

### US-006.2: Manifesto de crianças de colo
Como responsável, quero registrar meu filho de até 5 anos na minha reserva, para que ele conste no manifesto de passageiros sem pagar e sem ocupar assento.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL permitir associar uma ou mais entradas de `passenger_manifest_entries` a uma reserva existente, sem afetar `seat_number` ou `payment_amount`.
- THE SYSTEM SHALL NOT contar crianças de colo para o limite de 50 assentos nem para a posição 51-55 da lista de espera.

### US-006.3: Autorização de menor 12-17 sem responsável
Como menor de 12-17 anos sem responsável na caravana, quero anexar o formulário de autorização assinado pelos meus pais, para que minha reserva possa ser aprovada.

**Critérios de Aceite (EARS):**
- WHEN um menor com conta própria faz upload de um documento em `minor_approval_forms` vinculado à sua reserva, THE SYSTEM SHALL armazená-lo no bucket privado `minor-forms`, no path `{stake_id}/{ward_id}/{reservation_id}/...`.
- WHEN um Admin Ala aprova o formulário, THE SYSTEM SHALL permitir que a reserva avance para `pago_ala`; IF o formulário estiver `pending` ou `rejected`, THEN THE SYSTEM SHALL bloquear essa transição.
- WHEN qualquer admin lê o documento armazenado, THE SYSTEM SHALL registrar uma entrada em `audit_logs` (`action = 'VIEW_MINOR_DOCUMENT'`).

## Regras de Negócio Vinculadas
`docs/PRD.md` seções 6.2, 6.3, 6.9; `docs/DECISIONS.md` D06, D07.

## Dependências
000, 001, 002, 003, 004, 005.

## Perguntas em Aberto
Nenhuma.
