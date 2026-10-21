# Tasks 013: Reservas de Convidado Inter-Estaca

- [x] T013.1 — Migration: `guest_transfer_confirmations` + RLS (só dono + `is_admin_estaca_of`, nunca `is_admin_ala_of`)
- [x] T013.2 — Migration: `profiles.role = 'guest'`, `home_stake_name`/`home_ward_name`, constraints `guest_has_no_ward`/`only_guest_has_home_stake`
- [x] T013.3 — Teste + implementação: `registerGuestSignup` (stake_id sempre do slug resolvido server-side)
- [x] T013.4 — Teste + implementação: `createGuestReservation` (reserva + transfer confirmation atômicos)
- [x] T013.5 — Teste + implementação: `confirmGuestTransfer`
- [x] T013.6 — Integração com `RecalculateCaravanRanking` (spec 004): convidado sempre depois de membros da própria Estaca
- [x] T013.7 — Teste crítico: fixture com 2 Estacas — membro da anfitriã em `lista_espera` + convidado com repasse confirmado → convidado permanece em `lista_espera`, membro seria promovido primeiro
- [x] T013.8 — Teste RLS: `guest_transfer_confirmations` — Admin Ala (de qualquer Ala) nunca tem acesso, só Admin Estaca da própria Estaca anfitriã
- [x] T013.9 — Teste: convidado não se submete ao timeout padrão de 7 dias (spec 004, US-004.4)
- [x] T013.10 — Tela do convidado: cadastro + formulário de reserva com campos de origem
- [x] T013.11 — Tela Admin Estaca: fila de repasses inter-Estaca pendentes de confirmação
- [x] T013.12 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/guest/`; teste de prioridade (T013.7) obrigatoriamente verde — é o teste mais crítico desta spec.
