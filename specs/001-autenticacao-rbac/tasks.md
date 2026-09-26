# Tasks 001: Autenticação, Perfis e RBAC

**Plan de referência:** `specs/001-autenticacao-rbac/plan.md`

## Fase 1 — Cadastro e Login
- [x] T001.1 — **Teste primeiro:** `signUpMember` cria profile com `stake_id` derivado da `ward_id`, nunca do input direto
- [x] T001.2 — Implementar `signUpMember`
- [x] T001.3 — **Teste primeiro:** `signUpMinor` aceita 12-17 anos sem `guardianId`; rejeita `guardianId` como obrigatório
- [x] T001.4 — Implementar `signUpMinor`
- [x] T001.5 — Tela de cadastro em `(public)/[estaca_slug]/cadastro`, listando apenas `wards` da stake resolvida

**Dependências:** 000 concluída (schema + triggers + claims).

## Fase 2 — RBAC de Admin Ala
- [x] T001.6 — **Teste primeiro:** `createWardAdmin` por `admin_estaca` da Estaca A tentando criar admin para `ward_id` da Estaca B → rejeitado
- [x] T001.7 — Implementar `createWardAdmin`
- [x] T001.8 — **Teste:** `member` tentando `UPDATE` do próprio `role` → bloqueado pela policy `profiles_update_self`

**Dependências:** Fase 1.

## Fase 3 — Ciclo de Vida da Conta
- [x] T001.9 — **Teste primeiro:** conta com 24 meses e 1 dia sem login → `is_active = false`; com 23 meses e 29 dias → permanece ativa
- [x] T001.10 — Implementar job `pg_cron` `deactivate_inactive_accounts` (use-case `deactivateInactiveAccounts`)
- [x] T001.11 — **Teste:** inativação nunca exclui linha nem dado relacionado (reservas, créditos permanecem intactos)

**Dependências:** Fase 1.
