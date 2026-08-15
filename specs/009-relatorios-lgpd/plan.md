# Plan 009: Relatórios Financeiros e Conformidade LGPD

**Spec de referência:** `specs/009-relatorios-lgpd/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `GenerateFinancialReport`, `PurgeExpiredMinorData`, `DeactivateInactiveAccounts` em `use-cases/`. |
| II | ✅ | Relatório de Admin Estaca nunca agrega dado de outra `stake_id` — `is_admin_estaca_of(stake_id)` na query. |
| III | ✅ | Relatórios são só leitura; jobs de expurgo/inativação via `service_role`, nunca update livre do client. |
| IV | ✅ | Teste de limite exato (89/90 dias; 23m29d/24m1d) obrigatório. |
| V | ✅ | Exportação PDF/CSV gerada server-side, nunca expõe dado de outra Ala mesmo por engenharia reversa do CSV. |
| VI | ✅ | Esta spec implementa diretamente o Artigo VI (automação de retenção). |
| VII | ✅ | D14, D19. |
| VIII | ✅ | Depende de 004 (dados financeiros) e 006 (documentos de menor). |
| IX | ✅ | Sem hardcode de Estaca nos relatórios. |

## Abordagem Técnica
Ver `docs/DATABASE_SCHEMA.md` seção 6 (`v_ward_financial_summary`) — a view já herda RLS via `security_invoker`, então o relatório de Admin Ala não precisa de lógica extra de escopo; o relatório de Admin Estaca agrega a mesma view filtrando só por `stake_id` (sem `ward_id`), o que a RLS de `reservations` já permite para esse papel.

## Modelo de Dados
`v_ward_financial_summary` (já existe, seção 6). Sem tabela nova além da já prevista em `minor_approval_forms`/`profiles` (spec 006/001) para os jobs de expurgo/inativação.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/reports/
generateWardFinancialReport(wardId: string, format: 'csv' | 'pdf'): Promise<Buffer>
generateStakeFinancialReport(stakeId: string, format: 'csv' | 'pdf'): Promise<Buffer>

// src/use-cases/retention/
purgeExpiredMinorData(): Promise<{ purgedCount: number }>       // job pg_cron
deactivateInactiveAccounts(): Promise<{ deactivatedCount: number }>  // job pg_cron
```

## Decisões Técnicas Resolvidas (Research)
D14 (inativação, não exclusão, 24 meses), D19 (relatórios escopados por papel).

## Fases de Implementação
- **Fase 1:** `generateWardFinancialReport`/`generateStakeFinancialReport` (CSV primeiro, PDF depois).
- **Fase 2:** `purgeExpiredMinorData` + job semanal (teste de limite 89/90 dias).
- **Fase 3:** `deactivateInactiveAccounts` + job semanal (teste de limite 24 meses).
- **Fase 4:** Aviso de privacidade no site público + formulário de solicitação de acesso/exclusão (LGPD Art. 18).
