# Tasks 005: Fila de Espera, Permuta e Crédito

- [x] T005.1 — Teste + implementação: `ProcessWaitlist` (promoção + crédito na mesma transação)
- [x] T005.2 — Teste: falha simulada entre promoção e crédito → nenhuma das duas operações persiste (rollback)
- [x] T005.3 — Teste + implementação: `RequestSeatSwap`/`ApproveSeatSwap` (sem geração de crédito)
- [x] T005.4 — Teste: 7ª tentativa de permuta no dia do embarque → rejeitada (limite de 6)
- [x] T005.5 — Teste + implementação: regra de valor perdido (`cancelada_sem_credito`) sem espera nem permuta
- [x] T005.6 — Teste RLS: `credit_ledger`/`seat_swap_requests` cross-Ala e cross-Estaca → vazio/bloqueado
- [x] T005.7 — Teste + implementação: `ExpireCredits` (limite exato de 12 meses, data congelada)
- [x] T005.8 — Job `pg_cron`: `expire_credits`, diário
- [x] T005.9 — Tela do membro: saldo/crédito ativo, com data de expiração visível
- [x] T005.10 — Tela Líder de Caravana/Admin Estaca: registrar permuta
- [x] T005.11 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/waitlist/`, `src/use-cases/swap/`, `src/use-cases/credit/`; `test:rls` sem regressão.
## Aceite em remediação — 21/10/2026

Os itens marcados acima registram o trabalho histórico; não equivalem ao encerramento dos achados da auditoria. Aceite final reaberto até os testes das fases responsáveis em `docs/REGISTRO-REMEDIACAO.md` e `docs/PLANO-REMEDIACAO-2026-10-21.md`. Ver baseline da Fase 01 e revisão constitucional v4.0.0 para escopo/limitações. Não há aprovação de produção ou de piloto real.
