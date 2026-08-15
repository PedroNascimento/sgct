# Tasks 005: Fila de Espera, Permuta e Crédito

- [ ] T005.1 — Teste + implementação: `ProcessWaitlist` (promoção + crédito na mesma transação)
- [ ] T005.2 — Teste: falha simulada entre promoção e crédito → nenhuma das duas operações persiste (rollback)
- [ ] T005.3 — Teste + implementação: `RequestSeatSwap`/`ApproveSeatSwap` (sem geração de crédito)
- [ ] T005.4 — Teste: 7ª tentativa de permuta no dia do embarque → rejeitada (limite de 6)
- [ ] T005.5 — Teste + implementação: regra de valor perdido (`cancelada_sem_credito`) sem espera nem permuta
- [ ] T005.6 — Teste RLS: `credit_ledger`/`seat_swap_requests` cross-Ala e cross-Estaca → vazio/bloqueado
- [ ] T005.7 — Teste + implementação: `ExpireCredits` (limite exato de 12 meses, data congelada)
- [ ] T005.8 — Job `pg_cron`: `expire_credits`, diário
- [ ] T005.9 — Tela do membro: saldo/crédito ativo, com data de expiração visível
- [ ] T005.10 — Tela Líder de Caravana/Admin Estaca: registrar permuta
- [ ] T005.11 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/waitlist/`, `src/use-cases/swap/`, `src/use-cases/credit/`; `test:rls` sem regressão.
