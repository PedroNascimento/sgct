# Plan 005: Fila de Espera, Permuta e Crédito

**Spec de referência:** `specs/005-fila-espera-permuta-credito/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `ProcessWaitlist`, `RequestSeatSwap`, `ApproveSeatSwap`, `ExpireCredits` em `use-cases/`. |
| II | ✅ | `credit_ledger`/`seat_swap_requests` carregam `stake_id`+`ward_id` (derivados por trigger, seção 3 de `DATABASE_SCHEMA.md`); nenhuma policy concede acesso a `super_admin`. |
| III | ✅ | Toda transição via Server Action; nenhum `update()` livre no client. |
| IV | ✅ | Teste crítico: promoção + crédito atômicos (mesma transação) — testar falha simulada no meio para garantir rollback. |
| V | ✅ | `RequestSeatSwap` valida `new_holder_document` com Zod antes de gravar. |
| VI | N/A | Sem dado de menor. |
| VII | ✅ | D08, D13. |
| VIII | ✅ | Depende de 004 (status `confirmado`/`lista_espera` já existem). |
| IX | ✅ | Sem hardcode de Estaca. |

## Abordagem Técnica
Ver `docs/ARCHITECTURE.md` seção 5.2. `ProcessWaitlist` e a geração de crédito rodam na mesma transação Postgres (via função `plpgsql` ou transação explícita na Server Action) — nunca em duas chamadas separadas que possam falhar independentemente.

## Modelo de Dados
`seat_swap_requests`, `credit_ledger` — ver `docs/DATABASE_SCHEMA.md` seção 2 e políticas na seção 5.6.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/waitlist/
processWaitlist(caravanId: string, vacatedReservationId: string): Promise<{ promoted?: Reservation; credit?: CreditLedgerEntry }>

// src/use-cases/swap/
requestSeatSwap(input: { reservationId: string; newHolderName: string; newHolderDocument?: string; requestedBy: string }): Promise<SeatSwapRequest>
approveSeatSwap(swapRequestId: string, approverId: string): Promise<Reservation>

// src/use-cases/credit/
expireCredits(): Promise<{ expiredCount: number }>  // job pg_cron
applyCreditToReservation(creditId: string, reservationId: string): Promise<Reservation>
```

## Decisões Técnicas Resolvidas (Research)
D08 (expiração 12 meses), D13 (permuta mediada por Líder de Caravana ou Admin Estaca, sem self-service).

## Fases de Implementação
- **Fase 1:** `ProcessWaitlist` + geração atômica de crédito (teste de rollback em falha simulada).
- **Fase 2:** `RequestSeatSwap`/`ApproveSeatSwap`, incluindo limite de 6 permutas no dia do embarque.
- **Fase 3:** Regra de "valor perdido" (`cancelada_sem_credito`) quando não há espera nem permuta.
- **Fase 4:** `ExpireCredits` + job `pg_cron` diário.
- **Fase 5:** Tela do membro para consultar saldo/crédito ativo.
