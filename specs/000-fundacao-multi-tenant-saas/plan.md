# Plan 000: Fundação Multi-Tenant e Distribuição Open-Source

**Spec de referência:** `specs/000-fundacao-multi-tenant-saas/spec.md`

## Verificação de Conformidade com a Constituição

| Artigo | Conformidade | Observação |
|---|---|---|
| I — Clean Architecture | ✅ | Lógica de resolução de `stake_id`/RBAC fica em `use-cases/` (`ResolveStakeFromSlug`, `CreateStake`, `CreateBootstrapAdminEstaca`), nunca direto em middleware ou componente. |
| II — Isolamento Multi-Tenant | ✅ | Esta spec **é** a implementação do Artigo II. Toda tabela ganha `stake_id`; `super_admin` explicitamente sem acesso a dado sensível. |
| III — Sem UPDATE direto | ✅ | Criação de `stakes`/bootstrap de `admin_estaca` via Server Action dedicada, nunca `update()` genérico do client. |
| IV — TDD 80%+ | ✅ | `use-cases` de resolução de tenant e criação de Estaca cobertos por testes antes da implementação (ver `tasks.md`). |
| V — Segurança por padrão | ✅ | `.env.example` cobre todos os segredos novos; `service_role` só no script de seed e Edge Functions. |
| VI — LGPD automatizada | N/A | Esta spec não introduz dado de menor novo — apenas propaga `stake_id` às tabelas já existentes. |
| VII — Nenhuma regra inventada | ✅ | Toda decisão (D21-D25) já está registrada em `docs/DECISIONS.md`, aprovada explicitamente pelo responsável do projeto antes desta spec ser escrita. |
| VIII — Fluxo linear | ✅ | Esta é a primeira spec do fluxo; nenhuma implementação de 001-011 pode começar antes desta ser concluída. |
| IX — Portabilidade/Auto-hospedagem | ✅ | `.env.example` e `SETUP.md` são entregáveis diretos desta spec. |

## Abordagem Técnica
Ver `docs/ARCHITECTURE.md` seção 3 (roteamento multi-tenant) e `docs/DATABASE_SCHEMA.md` completo (esta spec introduziu a v2 do schema). Pontos-chave:
- `stake_id` nunca é aceito como input do client — sempre derivado via trigger `BEFORE INSERT` a partir da entidade-pai (ver `DATABASE_SCHEMA.md` seção 4).
- Middleware resolve `estaca_slug → stake_id` e compara com o claim do usuário **antes** de qualquer Server Action (ver `ARCHITECTURE.md` seção 3.1, `SECURITY.md` seção 2.1).
- `super_admin` é modelado com `stake_id = null` em `profiles`, e nenhuma policy RLS de tabela sensível o inclui na cláusula de acesso (omissão deliberada, não descuido).

## Modelo de Dados
Ver `docs/DATABASE_SCHEMA.md` seções 2 (DDL: `stakes` nova; `stake_id` em `wards`, `profiles`, `caravans`, `reservations` e dependentes), 3 (funções helper `current_stake_id()`, `is_super_admin()`, `is_admin_estaca_of()`), 4 (triggers de consistência de tenant).

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/tenant/
createStake(input: { name: string; slug: string }): Promise<Stake>
createBootstrapAdminEstaca(input: { stakeId: string; email: string; fullName: string }): Promise<Profile>
resolveStakeFromSlug(slug: string): Promise<Stake | null>

// src/use-cases/auth/
// (nenhum novo use-case de auth nesta spec — apenas o Auth Hook, que é config de infra, não use-case de app)
```
Zod schemas correspondentes em `src/domain/schemas/tenant.ts` — validam `slug` como `kebab-case`, único, sem caracteres especiais (necessário para compor a URL `/[estaca_slug]` com segurança).

## Decisões Técnicas Resolvidas (Research)
Ver `docs/DECISIONS.md`: D21 (multi-tenant SaaS regional), D22 (`super_admin` least privilege), D23 (stake_id/ward_id nunca vêm do client), D24 (roteamento por slug + fallback), D25 (distribuição open-source auto-hospedável).

## Fases de Implementação
- **Fase 0 (Research):** já concluída — decisões D21-D25 registradas.
- **Fase 1 (Schema + RLS):** migration com `stakes`, `stake_id` em todas as tabelas, triggers de consistência, policies RLS de dois níveis, Auth Hook atualizado.
- **Fase 2 (Roteamento):** middleware de resolução de slug, grupo de rotas `(super-admin)`, rewrite silencioso da raiz.
- **Fase 3 (Bootstrap):** script de seed, `.env.example`, `SETUP.md`.
- **Fase 4 (Testes):** suíte `test:rls` cross-stake completa antes de considerar a spec concluída — nenhuma outra spec (001+) começa sem esta suíte verde.
