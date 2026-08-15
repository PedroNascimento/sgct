# Tasks 000: Fundação Multi-Tenant e Distribuição Open-Source

**Plan de referência:** `specs/000-fundacao-multi-tenant-saas/plan.md`
**Regra:** todo item de `use-cases`/`domain` segue TDD (teste antes da implementação — Constituição Artigo IV). Nenhuma task desta spec pode ser considerada concluída sem a suíte `test:rls` cross-stake passando.

## Fase 1 — Schema e RLS
- [ ] T000.1 — Migration: criar tabela `stakes` + policy RLS (seção 5.2 de `DATABASE_SCHEMA.md`)
- [ ] T000.2 — Migration: adicionar `stake_id` a `wards`, `profiles` (+ constraints `chk_super_admin_no_stake`, `chk_ward_by_role`), `caravans`, `reservations`, `boarding_points` e tabelas dependentes
- [ ] T000.3 — Criar funções helper: `current_stake_id()`, `is_super_admin()`, `is_admin_estaca_of()`, `is_admin_ala_of()` (atualizada para 2 parâmetros)
- [ ] T000.4 — Criar triggers de consistência de tenant (`enforce_profile_tenant_consistency`, `enforce_boarding_point_tenant_consistency`, `enforce_reservation_tenant_consistency`, `enforce_stake_ward_from_reservation`)
- [ ] T000.5 — Reescrever policies RLS de `reservations`, `profiles`, `wards`, `caravans`, `credit_ledger`, `minor_approval_forms`, `audit_logs` para o padrão de dois níveis
- [ ] T000.6 — Atualizar Auth Hook (`custom_access_token_hook`) para incluir claim `stake_id`
- [ ] T000.7 — **Teste (TDD, antes das tasks acima serem consideradas prontas):** suíte `test:rls` cross-stake para cada tabela — Estaca A não lê/escreve dado da Estaca B
- [ ] T000.8 — **Teste:** `super_admin` não lê `reservations`/`credit_ledger`/`minor_approval_forms`/`checkins` de nenhuma Estaca
- [ ] T000.9 — **Teste:** trigger sobrescreve `stake_id`/`ward_id` forjado no payload de `INSERT`

**Dependências:** nenhuma (fase inicial).

## Fase 2 — Roteamento Multi-Tenant
- [ ] T000.10 — Implementar `resolveStakeFromSlug` (use-case) + teste unitário (slug existente, inexistente, inativo)
- [ ] T000.11 — Criar estrutura de rotas `(public)/[estaca_slug]`, `(auth)/[estaca_slug]`, `(admin)/[estaca_slug]`, `(super-admin)`
- [ ] T000.12 — Implementar `src/middleware.ts`: resolução de slug, checagem de sessão, comparação `claim.stake_id` vs slug resolvido, checagem de `role` por sub-rota
- [ ] T000.13 — Implementar rewrite silencioso da raiz `/` → `/${NEXT_PUBLIC_DEFAULT_STAKE}`
- [ ] T000.14 — **Teste:** usuário autenticado da Estaca A tentando acessar `(admin)/[slug-estaca-B]/...` → 403 antes de qualquer Server Action
- [ ] T000.15 — **Teste:** acesso a slug inexistente/inativo → 404
- [ ] T000.16 — **Teste:** raiz `/` renderiza o conteúdo de `NEXT_PUBLIC_DEFAULT_STAKE` sem alterar a URL visível

**Dependências:** T000.1-T000.9 (schema e claims precisam existir antes do middleware poder validá-los).

## Fase 3 — Bootstrap e Auto-hospedagem
- [ ] T000.17 — Implementar use-cases `createStake` e `createBootstrapAdminEstaca` (Server Actions restritas a `super_admin`)
- [ ] T000.18 — Implementar telas `(super-admin)/estacas` e `(super-admin)/admins`
- [ ] T000.19 — Escrever `scripts/seed-bootstrap.ts` (ver implementação de referência em `SETUP.md`)
- [ ] T000.20 — Finalizar `.env.example` com todas as variáveis desta spec
- [ ] T000.21 — Finalizar `SETUP.md` com o passo a passo completo de auto-hospedagem
- [ ] T000.22 — **Teste:** `super_admin` cria Estaca com slug duplicado → rejeitado com mensagem clara
- [ ] T000.23 — **Teste (integração, ambiente local):** rodar o fluxo completo do `SETUP.md` (migrations + seed) do zero em um banco Supabase local vazio e confirmar que o primeiro login funciona

**Dependências:** T000.1-T000.9 (schema), T000.10-T000.16 (rotas onde o super_admin vai operar).

## Fase 4 — Fechamento
- [ ] T000.24 — Revisão cruzada: `docs/TESTING.md` e `docs/SECURITY.md` já atualizados (feito nesta rodada de especificação) — conferir que nenhum teste da lista acima ficou órfão sem entrada correspondente em `TESTING.md`
- [ ] T000.25 — Checklist de segurança da seção 9 de `docs/SECURITY.md` executado uma vez, manualmente, antes de liberar a Fase 1 das specs 001+

**Dependências:** todas as fases anteriores.

---

## Observação sobre integração com o backlog anterior (`docs/SPRINTS.md`)
Esta spec substitui, em conteúdo, o que era descrito como "Sprint 0" no backlog por sprints (calendário). Se a cadência de 1 semana por sprint for mantida como envelope de tempo, esta spec inteira (Fases 1-4) corresponde a **1 sprint**, e as specs 001-011 seguem o mesmo mapeamento 1:1 já estabelecido com as sprints antigas — apenas reformatadas no padrão spec/plan/tasks. `docs/SPRINTS.md` pode ser mantido como camada de calendário por cima de `specs/`, mas `tasks.md` de cada spec é a fonte de verdade de ordem de execução (por dependência, não por semana) — ver Constituição Artigo X.
