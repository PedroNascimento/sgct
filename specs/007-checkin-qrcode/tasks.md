# Tasks 007: Check-in de Embarque via QR Code

- [ ] T007.1 — Teste + implementação: `GenerateCheckInToken` (só para `confirmado`)
- [ ] T007.2 — Teste + implementação: `ValidateCheckIn` online (assinatura válida/inválida/expirada)
- [ ] T007.3 — Componente scanner web (`html5-qrcode`) com estado de leitura
- [ ] T007.4 — Cache local (IndexedDB) dos tokens válidos da caravana do dia
- [ ] T007.5 — Teste + implementação: sincronização offline→online, idempotência por `(reservation_id, direction)`
- [ ] T007.6 — Teste: leitura duplicada (offline + online) do mesmo QR não gera dois check-ins
- [ ] T007.7 — Job pós-embarque: marcar `no_show` para reservas `confirmado` sem check-in de `ida`
- [ ] T007.8 — Teste + implementação: `GrantExceptionalCredit` (exige `reason`, grava `audit_logs`)
- [ ] T007.9 — Geração do manifesto de passageiros consolidado (CSV/PDF), incluindo crianças de colo
- [ ] T007.10 — Teste RLS: `checkins` cross-Ala/cross-Estaca → bloqueado
- [ ] T007.11 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/checkin/`; teste de idempotência offline/online obrigatoriamente verde.
