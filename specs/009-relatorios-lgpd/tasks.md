# Tasks 009: Relatórios Financeiros e Conformidade LGPD

- [ ] T009.1 — Teste + implementação: `generateWardFinancialReport` (CSV)
- [ ] T009.2 — Teste + implementação: `generateStakeFinancialReport` (CSV, consolidado por Estaca)
- [ ] T009.3 — Exportação em PDF (reaproveitando os mesmos dados do CSV)
- [ ] T009.4 — Teste RLS: Admin Ala/Estaca tentando gerar relatório de outra Ala/Estaca → vazio/bloqueado
- [ ] T009.5 — Teste + implementação: `purgeExpiredMinorData` (limite 89/90 dias)
- [ ] T009.6 — Job `pg_cron`: `purge_expired_minor_data`, semanal
- [ ] T009.7 — Teste + implementação: `deactivateInactiveAccounts` (limite 24 meses)
- [ ] T009.8 — Job `pg_cron`: `deactivate_inactive_accounts`, semanal
- [ ] T009.9 — Aviso de privacidade no site público + formulário de solicitação de acesso/exclusão
- [ ] T009.10 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/reports/` e `src/use-cases/retention/`; testes de limite exato obrigatoriamente verdes.
