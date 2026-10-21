# Tasks 009: Relatórios Financeiros e Conformidade LGPD

- [x] T009.1 — Teste + implementação: `generateWardFinancialReport` (CSV)
- [x] T009.2 — Teste + implementação: `generateStakeFinancialReport` (CSV, consolidado por Estaca)
- [x] T009.3 — Exportação em PDF (reaproveitando os mesmos dados do CSV)
- [x] T009.4 — Teste RLS: Admin Ala/Estaca tentando gerar relatório de outra Ala/Estaca → vazio/bloqueado
- [x] T009.5 — Teste + implementação: `purgeExpiredMinorData` (limite 89/90 dias)
- [x] T009.6 — Job `pg_cron`: `purge_expired_minor_data`, semanal
- [x] T009.7 — Teste + implementação: `deactivateInactiveAccounts` (limite 24 meses)
- [x] T009.8 — Job `pg_cron`: `deactivate_inactive_accounts`, semanal
- [x] T009.9 — Aviso de privacidade no site público + formulário de solicitação de acesso/exclusão
- [x] T009.10 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/reports/` e `src/use-cases/retention/`; testes de limite exato obrigatoriamente verdes.
## Aceite em remediação — 21/10/2026

Os itens marcados acima registram o trabalho histórico; não equivalem ao encerramento dos achados da auditoria. Aceite final reaberto até os testes das fases responsáveis em `docs/REGISTRO-REMEDIACAO.md` e `docs/PLANO-REMEDIACAO-2026-10-21.md`. Ver baseline da Fase 01 e revisão constitucional v4.0.0 para escopo/limitações. Não há aprovação de produção ou de piloto real.
