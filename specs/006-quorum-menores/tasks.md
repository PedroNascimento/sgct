# Tasks 006: Quórum, Cancelamento de Caravana e Menores

- [ ] T006.1 — Teste + implementação: `CheckMinimumQuorum` (casos 47/48/49 inscritos)
- [ ] T006.2 — Job `pg_cron`: `check_minimum_quorum`, terça anterior ao embarque
- [ ] T006.3 — Teste + implementação: rollover de reserva (crédito + recriação na próxima caravana)
- [ ] T006.4 — Teste: rollover nunca migra `stake_id` da reserva original
- [ ] T006.5 — Teste + implementação: `addManifestEntry` (crianças de colo, sem afetar `seat_number`)
- [ ] T006.6 — Teste + implementação: `uploadMinorApprovalForm` (Storage privado, path por stake/ward)
- [ ] T006.7 — Teste + implementação: `approveMinorForm` (bloqueia `pago_ala` se `pending`/`rejected`)
- [ ] T006.8 — Teste: leitura de documento por admin grava `audit_logs`
- [ ] T006.9 — Teste RLS: Storage `minor-forms` cross-Ala e cross-Estaca → bloqueado
- [ ] T006.10 — Tela do menor: upload do formulário na própria reserva
- [ ] T006.11 — Tela Admin Ala: fila de formulários pendentes de aprovação
- [ ] T006.12 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/quorum/` e `src/use-cases/minors/`; `test:rls` sem regressão.
