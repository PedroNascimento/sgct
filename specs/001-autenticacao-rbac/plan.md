# Plan 001: Autenticação, Perfis e RBAC

**Spec de referência:** `specs/001-autenticacao-rbac/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I — Clean Architecture | ✅ | `signUpMember`, `signUpMinor`, `createWardAdmin`, `deactivateInactiveAccounts` em `src/use-cases/auth/`. |
| II — Isolamento Multi-Tenant | ✅ | Cadastro sempre deriva `stake_id` da `ward_id` escolhida (trigger de 000); Admin Estaca só cria Admin Ala da própria `stake_id`. |
| III — Sem UPDATE direto | ✅ | Mudança de `role` nunca é feita por `update()` livre — só via `createWardAdmin` (Server Action), nunca pelo próprio usuário. |
| IV — TDD 80%+ | ✅ | Ver `tasks.md`. |
| V — Segurança por padrão | ✅ | Senha via Supabase Auth nativo (bcrypt/Argon2); nenhuma validação de força de senha customizada além do mínimo do Supabase. |
| VI — LGPD | ✅ | Consentimento de responsável coletado no cadastro do menor (campo explícito, não implícito nos Termos). |
| VII — Nenhuma regra inventada | ✅ | Toda regra desta spec já está em D07/D14/D20/D22. |
| IX — Auto-hospedagem | ✅ | Nenhuma configuração de Estaca específica hardcoded no fluxo de cadastro. |

## Abordagem Técnica
Cadastro de `member`/menor ocorre sempre no contexto de uma rota `/[estaca_slug]/...` já resolvida pelo middleware da spec 000 — o formulário de cadastro só oferece Alas (`wards`) da `stake_id` já resolvida, nunca um seletor livre de Estaca. Isso evita a maior parte dos casos de erro por design de UI, complementado pelo trigger de banco (defesa em profundidade, ver `DATABASE_SCHEMA.md` seção 4).

## Modelo de Dados
`profiles` (ver `DATABASE_SCHEMA.md` seção 2), incluindo `chk_super_admin_no_stake` e `chk_ward_by_role`. Nenhuma tabela nova nesta spec.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/auth/
signUpMember(input: { email; password; fullName; birthDate; wardId }): Promise<Profile>
signUpMinor(input: { email; password; fullName; birthDate; wardId; guardianId?: string }): Promise<Profile>
createWardAdmin(input: { wardId; email; fullName }, actingAdminEstacaId: string): Promise<Profile>
deactivateInactiveAccounts(): Promise<{ deactivatedCount: number }>  // job pg_cron
```
Zod: `signUpSchema` valida `birthDate` (calcula `is_minor`), `wardId` (uuid existente e pertencente à `stake_id` da rota atual).

## Decisões Técnicas Resolvidas (Research)
D07, D14, D20, D22 (`docs/DECISIONS.md`).

## Fases de Implementação
Fase 1: cadastro member/menor + testes. Fase 2: `createWardAdmin` + testes de escopo por stake. Fase 3: job `deactivateInactiveAccounts` + testes de limite temporal.
