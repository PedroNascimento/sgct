# Plan 004: Workflow de Pagamento e Validação Semanal

**Spec de referência:** `specs/004-workflow-pagamento-validacao/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I — Clean Architecture | ✅ | `ConfirmWardPayment`, `ValidateWeeklyTransfers`, `RecalculateCaravanRanking`, `ExpirePendingReservations` em `use-cases/`, testáveis com repositório mockado. |
| II — Isolamento Multi-Tenant | ✅ | Toda query filtra por `stake_id` (índice primário) e `ward_id`; Admin Ala só confirma pagamento da própria Ala/Estaca. |
| III — Sem UPDATE direto | ✅ | Transições de status exclusivamente via Server Actions que chamam os use-cases acima. |
| IV — TDD 80%+ | ✅ | Casos de borda (off-by-one no limite de 50, bloqueio de autoaprovação, exclusão da semana de embarque) exigem teste antes da implementação. |
| V — Segurança por padrão | ✅ | `validate_weekly_transfers` roda via `pg_cron` com `service_role`, nunca exposto como endpoint público sem `CRON_SECRET`. |
| VI — LGPD | N/A | Sem dado de menor nesta spec. |
| VII — Nenhuma regra inventada | ✅ | Regras vindas de D01, D15, D17 (`docs/DECISIONS.md`). |
| VIII — Fluxo linear | ✅ | Depende de 000-003 já implementadas e testadas. |
| IX — Portabilidade | ✅ | Nenhuma referência hardcoded a uma Estaca específica. |

## Abordagem Técnica
Ver `docs/ARCHITECTURE.md` seção 5.1 (fluxo de reserva/confirmação) e seção 6 (job `validate_weekly_transfers`). O recálculo de ranking roda dentro da mesma transação que confirma o pagamento em lote, para evitar estado intermediário inconsistente (uma reserva confirmada sem o ranking global atualizado).

## Modelo de Dados
`reservations` (colunas `status`, `confirmed_at`, `confirmation_rank`) — ver `docs/DATABASE_SCHEMA.md` seção 2. Nenhuma tabela nova nesta spec.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/payment/
confirmWardPayment(input: { reservationId: string; adminId: string }): Promise<Reservation>
validateWeeklyTransfers(input: { caravanId: string; adminId: string }): Promise<Reservation[]>
recalculateCaravanRanking(caravanId: string): Promise<{ confirmed: Reservation[]; waitlisted: Reservation[] }>
expirePendingReservations(): Promise<{ expiredCount: number }>  // chamado só pelo job pg_cron
```

## Decisões Técnicas Resolvidas (Research)
D01 (timeout 7 dias / domingo de fechamento), D15 (recálculo automatizado + revisão manual), D17 (ordem por transferência, assento nunca liberado antecipadamente).

## Fases de Implementação
- **Fase 1:** `ConfirmWardPayment` com bloqueio de autoaprovação (testes primeiro).
- **Fase 2:** `RecalculateCaravanRanking` — caso de teste crítico: exatamente 50 vs. 51 confirmados (off-by-one).
- **Fase 3:** `ValidateWeeklyTransfers` + job `pg_cron`, com exclusão explícita da semana de embarque.
- **Fase 4:** `ExpirePendingReservations` + job diário.
- **Fase 5:** Integração do evento de notificação (consumido por 008).
