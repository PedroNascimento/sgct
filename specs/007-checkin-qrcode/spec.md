# Spec 007: Check-in de Embarque via QR Code

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000, 001, 002, 003, 004, 005, 006

## Contexto e Objetivo
Confirmação física de presença no embarque (ida e volta), com QR Code assinado gerado só após `CONFIRMADO`, suporte a leitura offline e sincronização idempotente. Também cobre a exceção de `NO_SHOW` com concessão manual de crédito.

## Escopo

### Dentro do escopo
- Geração de token assinado (JWT/HMAC) apenas para reservas `confirmado`.
- Scanner web para o Líder de Caravana, com cache local (IndexedDB) e sincronização pós-conexão.
- `ValidateCheckIn`: idempotente por `(reservation_id, direction)`.
- Manifesto de passageiros consolidado (exportável) para fiscalização rodoviária.
- `NO_SHOW` sem crédito automático + concessão manual excepcional de crédito pelo Admin Ala (com auditoria).

### Fora do escopo
- Distribuição de cartões de alojamento (fora do escopo digital do MVP — D18).
- Notificação por e-mail de check-in (spec 008).

## Histórias de Usuário

### US-007.1: Geração do QR Code
Como sistema, preciso gerar um token de check-in seguro assim que a reserva for confirmada, para permitir a validação de presença no embarque.

**Critérios de Aceite (EARS):**
- WHEN uma reserva transiciona para `confirmado`, THE SYSTEM SHALL gerar um token assinado (`reservation_id`, `caravan_id`, `stake_id`, `exp`) e armazená-lo em `qr_token`/`qr_token_expires_at`.
- THE SYSTEM SHALL NOT gerar token para reservas em qualquer outro status.

### US-007.2: Leitura de check-in (online e offline)
Como Líder de Caravana, quero ler o QR Code de cada membro no embarque, mesmo sem conexão de internet, para confirmar presença de forma confiável.

**Critérios de Aceite (EARS):**
- WHEN o Líder de Caravana lê um QR Code válido, THE SYSTEM SHALL registrar um `checkin` para aquela `reservation_id` e `direction` (`ida`/`volta`).
- IF o token estiver expirado ou a assinatura for inválida, THEN THE SYSTEM SHALL rejeitar o check-in.
- WHILE o dispositivo estiver offline, THE SYSTEM SHALL armazenar a leitura localmente e sincronizar automaticamente ao reconectar.
- IF a mesma `reservation_id`+`direction` for lida duas vezes (uma offline, uma online), THEN THE SYSTEM SHALL registrar apenas um `checkin` (idempotência por `unique(reservation_id, direction)`).

### US-007.3: No-show e crédito excepcional
Como Admin Ala, quero registrar uma exceção de crédito para um caso justificado de não comparecimento, sem que isso vire regra automática.

**Critérios de Aceite (EARS):**
- WHEN o embarque de uma caravana se encerra E uma reserva `confirmado` não teve check-in de `ida`, THE SYSTEM SHALL marcar a reserva como `no_show`, sem gerar crédito automaticamente.
- WHERE o Admin Ala decidir conceder uma exceção, THE SYSTEM SHALL permitir registrar um crédito manual (`source = 'exceptional_grant'`) com `granted_by` e `reason` obrigatórios, e gravar em `audit_logs`.

## Regras de Negócio Vinculadas
`docs/PRD.md` seção 6.5; `docs/DECISIONS.md` D02, D03.

## Dependências
000-006.

## Perguntas em Aberto
Nenhuma.
