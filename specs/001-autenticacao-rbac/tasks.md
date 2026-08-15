# Tasks 001: Autenticação, Perfis e RBAC

**Plan de referência:** `specs/001-autenticacao-rbac/plan.md`

## Fase 1 — Cadastro e Login
- [ ] T001.1 — **Teste primeiro:** `signUpMember` cria profile com `stake_id` derivado da `ward_id`, nunca do input direto
- [ ] T001.2 — Implementar `signUpMember`
- [ ] T001.3 — **Teste primeiro:** `signUpMinor` aceita 12-17 anos sem `guardianId`; rejeita `guardianId` como obrigatório
- [ ] T001.4 — Implementar `signUpMinor`
- [ ] T001.5 — Tela de cadastro em `(public)/[estaca_slug]/cadastro`, listando apenas `wards` da stake resolvida

**Dependências:** 000 concluída (schema + triggers + claims).

## Fase 2 — RBAC de Admin Ala
- [ ] T001.6 — **Teste primeiro:** `createWardAdmin` por `admin_estaca` da Estaca A tentando criar admin para `ward_id` da Estaca B → rejeitado
- [ ] T001.7 — Implementar `createWardAdmin`
- [ ] T001.8 — **Teste:** `member` tentando `UPDATE` do próprio `role` → bloqueado pela policy `profiles_update_self`

**Dependências:** Fase 1.

## Fase 3 — Ciclo de Vida da Conta
- [ ] T001.9 — **Teste primeiro:** conta com 24 meses e 1 dia sem login → `is_active = false`; com 23 meses e 29 dias → permanece ativa
- [ ] T001.10 — Implementar job `pg_cron` `deactivate_inactive_accounts` (use-case `deactivateInactiveAccounts`)
- [ ] T001.11 — **Teste:** inativação nunca exclui linha nem dado relacionado (reservas, créditos permanecem intactos)

**Dependências:** Fase 1.
