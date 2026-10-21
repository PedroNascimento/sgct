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
- [ ] T001.6 — **Teste primeiro:** promoção de membro existente a Admin Ala rejeita outro tenant, Ala inválida, autoelevação e promoção de Admin Estaca; revogação retira poderes da sessão (R03.1–R03.4)
- [ ] T001.7 — Concluir `promoteWardAdmin` sem criação de conta/senha pelo painel, com autorização e auditoria
- [x] T001.8 — **Teste:** `member` tentando `UPDATE` do próprio `role` → bloqueado pela policy `profiles_update_self`

**Dependências:** Fase 1.

## Fase 3 — Ciclo de Vida da Conta
- [x] T001.9 — **Teste primeiro:** conta com 24 meses e 1 dia sem login → `is_active = false`; com 23 meses e 29 dias → permanece ativa
- [x] T001.10 — Implementar job `pg_cron` `deactivate_inactive_accounts` (use-case `deactivateInactiveAccounts`)
- [x] T001.11 — **Teste:** inativação nunca exclui linha nem dado relacionado (reservas, créditos permanecem intactos)

**Dependências:** Fase 1.
## Reabertura de aceite — 21/10/2026

Concluir cadastro público efetivo/consentimento (A15), atividade e bloqueio de contas/sessões (A16). T001.9–11 registram implementação/testes históricos do job, não eficácia ponta a ponta da inativação. Ver R03.5–R03.6, R07.6 e `docs/REGISTRO-REMEDIACAO.md`.
