# Tasks 004: Workflow de Pagamento e Validação Semanal

> Ordenado por dependência, não por calendário. TDD obrigatório (Artigo IV) — teste antes da implementação em toda task de `use-cases/`.

- [x] T004.1 — Teste + implementação: `ConfirmWardPayment` (transição `pendente → pago_ala`, bloqueio de autoaprovação, escopo de `ward_id`/`stake_id`)
- [x] T004.2 — Teste RLS: Admin Ala de outra Ala/Estaca tentando `ConfirmWardPayment` → bloqueado
- [x] T004.3 — Teste + implementação: `RecalculateCaravanRanking` (caso limite: 48/49/50/51 confirmados)
- [x] T004.4 — Teste + implementação: `ValidateWeeklyTransfers` (chama T004.3 internamente, mesma transação)
- [x] T004.5 — Teste: `ValidateWeeklyTransfers` não dispara na semana do embarque (data mockada)
- [x] T004.6 — Job `pg_cron`: `validate_weekly_transfers`, terça 06:00, autenticado via `CRON_SECRET`
- [x] T004.7 — Teste + implementação: `ExpirePendingReservations` (limite de 7 dias, reserva `pago_ala` não expira, só `pendente`)
- [x] T004.8 — Job `pg_cron`: `expire_pending_reservations`, diário
- [x] T004.9 — Evento de notificação de mudança de posição (payload pronto para a spec 008 consumir; envio real fora do escopo aqui)
- [x] T004.10 — Tela Admin Ala: lista de reservas `pendente` da própria Ala com ação "Confirmar Pagamento"
- [x] T004.11 — Tela Admin Estaca: lista de reservas `pago_ala` pendentes de validação semanal, com ação em lote
- [x] T004.12 — `npm run test:rls` verde para todas as tabelas tocadas antes de considerar a spec concluída
- [x] T004.13 — **Teste primeiro:** listar apenas reservas do usuário autenticado e da Estaca da rota, descartando inconsistências cross-tenant
- [x] T004.14 — Implementar `ListOwnReservations` com dados da caravana e ponto de embarque, sem expor dados de terceiros
- [x] T004.15 — Implementar página responsiva "Minhas reservas" com progresso financeiro, estados especiais e estado vazio
- [x] T004.16 — Adicionar navegação autenticada para "Minhas reservas" no cabeçalho e na página "Minha conta"
- [x] T004.17 — Executar regressão completa, cobertura e `test:rls`

**Definition of Done:** todos os itens acima com teste verde, cobertura ≥80% em `src/use-cases/payment/`, `test:rls` sem regressão.
