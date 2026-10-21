# Tasks 006: Quórum, Cancelamento de Caravana e Menores

- [x] T006.1 — Teste + implementação: `CheckMinimumQuorum` (casos 47/48/49 inscritos)
- [x] T006.2 — Job `pg_cron`: `check_minimum_quorum`, terça anterior ao embarque
- [x] T006.3 — Teste + implementação: rollover de reserva (crédito + recriação na próxima caravana)
- [x] T006.4 — Teste: rollover nunca migra `stake_id` da reserva original
- [x] T006.5 — Teste + implementação: `addManifestEntry` (crianças de colo, sem afetar `seat_number`)
- [x] T006.6 — Teste + implementação: `uploadMinorApprovalForm` (Storage privado, path por stake/ward)
- [x] T006.7 — Teste + implementação: `approveMinorForm` (bloqueia `pago_ala` se `pending`/`rejected`)
- [x] T006.8 — Teste: leitura de documento por admin grava `audit_logs`
- [x] T006.9 — Teste RLS: Storage `minor-forms` cross-Ala e cross-Estaca → bloqueado
- [x] T006.10 — Tela do menor: upload do formulário na própria reserva
- [x] T006.11 — Tela Admin Ala: fila de formulários pendentes de aprovação
- [x] T006.12 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/quorum/` e `src/use-cases/minors/`; `test:rls` sem regressão.
## Aceite em remediação — 21/10/2026

Os itens marcados acima registram o trabalho histórico; não equivalem ao encerramento dos achados da auditoria. Aceite final reaberto até os testes das fases responsáveis em `docs/REGISTRO-REMEDIACAO.md` e `docs/PLANO-REMEDIACAO-2026-10-21.md`. Ver baseline da Fase 01 e revisão constitucional v4.0.0 para escopo/limitações. Não há aprovação de produção ou de piloto real.
