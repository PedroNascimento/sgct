# Plan 001: Autenticação, Perfis e RBAC

> **Revisão constitucional de 21/10/2026 — v4.0.0:** II.e/f: promover member → admin_ala somente na própria Estaca; não criar conta por painel nem promover pares. A15/A16 abertos; Fase 03. Ver [matriz de revisão](../../docs/REVISAO-CONSTITUCIONAL-4.0.0.md). As tabelas de conformidade descrevem o desenho; não são atestado de implementação ou rollout.

**Spec de referência:** `specs/001-autenticacao-rbac/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I — Clean Architecture | ✅ | `signUpMember`, `signUpMinor`, `promoteWardAdmin`, `deactivateInactiveAccounts` em `src/use-cases/auth/`. |
| II — Isolamento Multi-Tenant | ✅ | Cadastro sempre deriva `stake_id` da `ward_id` escolhida (trigger de 000); Admin Estaca só promove membro existente a Admin Ala da própria `stake_id`. |
| III — Sem UPDATE direto | ✅ | Mudança de `role` nunca é feita por `update()` livre — o provisionamento privilegiado ocorre na Edge Function `provision-user`, nunca pelo próprio usuário. |
| IV — TDD 80%+ | ✅ | Ver `tasks.md`. |
| V — Segurança por padrão | ✅ | Senha via Supabase Auth nativo; `service_role` fica restrita à Edge Function `provision-user`, com JWT validado para operações administrativas. |
| VI — LGPD | ✅ | Consentimento de responsável coletado no cadastro do menor (campo explícito, não implícito nos Termos). |
| VII — Nenhuma regra inventada | ✅ | Toda regra desta spec já está em D07/D14/D20/D22. |
| IX — Auto-hospedagem | ✅ | Nenhuma configuração de Estaca específica hardcoded no fluxo de cadastro. |

## Abordagem Técnica
Cadastro de `member`/menor ocorre sempre no contexto de uma rota `/[estaca_slug]/...` já resolvida pelo middleware da spec 000 — o formulário de cadastro só oferece Alas (`wards`) da `stake_id` já resolvida, nunca um seletor livre de Estaca. A Edge Function resolve novamente o slug e a Ala antes de criar as credenciais, complementada pelo trigger de banco (defesa em profundidade, ver `DATABASE_SCHEMA.md` seção 4).

## Modelo de Dados
`profiles` (ver `DATABASE_SCHEMA.md` seção 2), incluindo `chk_super_admin_no_stake` e `chk_ward_by_role`. Nenhuma tabela nova nesta spec.

## Contratos (Use-cases / Edge Function)
```ts
// src/use-cases/auth/
signUpMember(input: { email; password; fullName; birthDate; wardId }): Promise<Profile>
signUpMinor(input: { email; password; fullName; birthDate; wardId; guardianId?: string }): Promise<Profile>
promoteWardAdmin(input: { wardId; memberId }, actingAdminEstacaId: string): Promise<Profile>
deactivateInactiveAccounts(): Promise<{ deactivatedCount: number }>  // job pg_cron
```
Zod: `signUpSchema` valida `birthDate` (calcula `is_minor`), `wardId` (uuid existente e pertencente à `stake_id` da rota atual).

`supabase/functions/provision-user` é a fronteira de autocadastro. Promoções deverão usar operação privilegiada específica autorizada e auditada, sem criar credenciais. Os caminhos legados `create_ward_admin`/`create_bootstrap_admin` devem ser removidos na Fase 03 da remediação; esta revisão documental não remove esses caminhos do código.

## Decisões Técnicas Resolvidas (Research)
D07, D14, D20, D22 e D32 (`docs/DECISIONS.md`).

## Fases de Implementação
Fase 1: cadastro member/menor + testes. Fase 2: `promoteWardAdmin` + testes de escopo por stake. Fase 3: job `deactivateInactiveAccounts` + testes de limite temporal.
