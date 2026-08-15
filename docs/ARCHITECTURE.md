# Arquitetura do Sistema — SGCT
### 🔄 v2 — Plataforma Multi-Tenant (múltiplas Estacas, um único deploy)

## 1. Visão Geral

```
                    ┌───────────────────────────────────────────┐
                    │              Vercel (Next.js)                │
                    │  ┌──────────┐┌──────────┐┌──────────┐┌─────┐│
                    │  │ (public) ││ (auth)   ││ (admin)  ││(super││
                    │  │[estaca_  ││[estaca_  ││[estaca_  ││-admin││
                    │  │ slug]    ││ slug]    ││ slug]    ││)     ││
                    │  └──────────┘└──────────┘└──────────┘└─────┘│
                    │         App Router + Server Actions            │
                    │         Middleware resolve [estaca_slug]       │
                    │            → stake_id (ou usa DEFAULT_STAKE)   │
                    └──────────────────┬────────────────────────────┘
                                        │ Supabase JS Client (RLS-aware)
                    ┌──────────────────▼────────────────────────────┐
                    │            Supabase (1 projeto, N Estacas)      │
                    │  ┌───────────┐ ┌───────────┐ ┌────────────────┐│
                    │  │ PostgreSQL │ │   Auth    │ │Storage          ││
                    │  │ + RLS      │ │ (JWT +    │ │(bucket privado, ││
                    │  │ 2 níveis   │ │  claims:  │ │ path por        ││
                    │  │ stake→ward │ │ role,     │ │ stake_id/ward)  ││
                    │  │            │ │ stake_id, │ │                 ││
                    │  │            │ │ ward_id)  │ │                 ││
                    │  └───────────┘ └───────────┘ └────────────────┘│
                    │  ┌────────────────────────────────────────────┐│
                    │  │   pg_cron (jobs agendados, por Estaca)        ││
                    │  └────────────────────────────────────────────┘│
                    └──────────────────┬────────────────────────────┘
                                        │
                             ┌──────────▼──────────┐
                             │       Resend           │
                             │  (e-mail transacional,  │
                             │  remetente por Estaca)  │
                             └────────────────────────┘
```

Cada Estaca (`stake`) que optar por **auto-hospedar** roda esta mesma stack em seu próprio projeto Supabase/Vercel/Resend gratuito (Artigo IX da constituição — ver `SETUP.md`). Estacas que optarem por usar a instância compartilhada (SaaS regional) convivem no mesmo banco, isoladas por `stake_id`.

## 2. Camadas da Aplicação (inalterado — Clean Architecture Adaptada)

| Camada | Responsabilidade | Regra de dependência |
|---|---|---|
| `src/app/` | Rotas, layouts, Server Actions, UI | Depende de `use-cases` e `components`. Nunca contém regra de negócio. |
| `src/domain/` | Entidades, tipos, enums, interfaces puras | Não depende de nada. |
| `src/use-cases/` | Regras de negócio puras, testáveis sem framework | Depende só de `domain` e interfaces de repositório. |
| `src/infrastructure/` | Implementações concretas (Supabase, Resend, Storage) | Implementa interfaces de `domain`/`use-cases`. |
| `src/components/` | UI reutilizável | Sem lógica de negócio. |

## 3. 🔄 Roteamento Multi-Tenant e Resolução de Estaca

```
src/app/
  (public)/
    [estaca_slug]/
      page.tsx                    # landing page daquela Estaca específica
      calendario/
      regras/
    page.tsx                      # raiz "/" — lê NEXT_PUBLIC_DEFAULT_STAKE e faz
                                    # rewrite interno para (public)/[estaca_slug]
                                    # (fallback silencioso, sem redirect visível na URL)
  (auth)/
    [estaca_slug]/
      reserva/
      minha-conta/
      check-in/
  (admin)/
    [estaca_slug]/
      ala/                         # requer role=admin_ala E stake_id do JWT == stake do slug
        pagamentos/
        relatorios/
        formularios-menor/
      estaca/                     # requer role=admin_estaca E stake_id do JWT == stake do slug
        validacao-semanal/
        quorum/
        permutas/
        relatorios/
        calendario/
      caravana/[id]/lider/
        check-in-scanner/
        manifesto/
  (super-admin)/                  # 🔄 NOVO — sem [estaca_slug], é cross-tenant por natureza
    estacas/                      # cadastrar/gerenciar Estacas (stakes)
    admins/                       # cadastrar o 1º admin_estaca de uma Estaca nova
```

### 3.1. Middleware (`src/middleware.ts`) — 🔄 lógica de resolução de tenant

```
1. Extrair [estaca_slug] da URL (ou usar NEXT_PUBLIC_DEFAULT_STAKE se rota = "/")
2. Resolver slug → stake_id via SELECT em `stakes` (cacheável — stakes mudam raramente)
   - Se slug não existe ou stake.is_active = false → 404
3. Ler sessão Supabase do cookie (se houver)
4. 🔴 CHECAGEM CRÍTICA ANTI-VAZAMENTO: se há sessão E a rota é (auth)/* ou (admin)/*,
   comparar claims.stake_id (do JWT) com o stake_id resolvido do slug.
   Se forem diferentes → bloquear com 403, mesmo que o usuário tenha uma sessão válida
   (ele só não pertence a ESTA Estaca). Isso é uma camada adicional de defesa,
   redundante com a RLS, e é INTENCIONAL (defesa em profundidade, Artigo II).
5. Se rota (admin)/[slug]/ala/* e claims.role não é admin_ala nem admin_estaca → 403
6. Se rota (admin)/[slug]/estaca/* e claims.role != admin_estaca → 403
7. Se rota (admin)/[slug]/caravana/[id]/lider/* → verificar auth.uid() ==
   caravans.caravan_leader_id PARA aquele [id] (não basta ter role de admin)
8. Se rota (super-admin)/* e claims.role != super_admin → 403
```

Middleware é a **primeira** camada, não a única — RLS no banco (seção 5 de `docs/DATABASE_SCHEMA.md`) é quem efetivamente impede vazamento mesmo que o middleware tenha uma falha de lógica.

### 3.2. Fallback da Raiz (`/`) — Decisão D24

A rota raiz `/` não redireciona visivelmente para `/natal`; em vez disso, faz um **rewrite interno** (Next.js `rewrites()` ou lógica de middleware) que renderiza o conteúdo de `(public)/[estaca_slug=NEXT_PUBLIC_DEFAULT_STAKE]/page.tsx` mantendo a URL como `/`. Isso permite que a Estaca Natal (ou qualquer instância auto-hospedada configurada com uma única Estaca) funcione como um site "normal" de domínio único, enquanto o código por baixo já é 100% multi-tenant.

## 4. Modelo Multi-Tenant em Dois Níveis (Estaca acima de Ala)

- Toda `profile` tem `stake_id` (nulo só para `super_admin`) e, quando aplicável, `ward_id`.
- Toda tabela sensível denormaliza `stake_id` **e** `ward_id`, derivados por trigger (nunca aceitos do client — ver seção 3 de `DATABASE_SCHEMA.md`).
- **Exceção documentada de isolamento:** `v_seat_occupancy` (assento + status, sem PII) é visível a qualquer membro autenticado da mesma Estaca — necessário porque a reserva é competitiva entre as Alas de uma mesma Estaca no mesmo ônibus. Nunca atravessa o limite de Estaca.
- `super_admin` é global, mas **sem** acesso de leitura a nenhum dado operacional de nenhuma Estaca (reservas, financeiro, menores) — só administra a tabela `stakes` e faz o bootstrap do primeiro `admin_estaca` de cada Estaca nova (Artigo II.f da constituição).

## 5. Fluxos Principais
*(inalterados em relação à v1 — reserva/confirmação, permuta/lista de espera, quórum, check-in — ver versão anterior deste documento no histórico do repositório; a única mudança é que toda entidade citada nesses fluxos agora carrega `stake_id` desde a criação.)*

## 6. Jobs Agendados (`pg_cron`) — 🔄 escopados por Estaca

| Job | Frequência | Use-case | Observação multi-tenant |
|---|---|---|---|
| `expire_pending_reservations` | Diário | `ExpirePendingReservations` | Roda para todas as Estacas ativas num único job, filtrando por `stake_id` internamente — não é um job por Estaca. |
| `validate_weekly_transfers` | Terça, 06:00 | `ValidateWeeklyTransfers` + `RecalculateCaravanRanking` | Idem — processa por `caravan_id`, que já é escopado a uma Estaca. |
| `check_minimum_quorum` | Terça anterior ao embarque | `CheckMinimumQuorum` | Idem. |
| `expire_credits` | Diário | `ExpireCredits` | Idem. |
| `deactivate_inactive_accounts` | Semanal | `DeactivateInactiveAccounts` | Idem. |
| `purge_expired_minor_data` | Semanal | `PurgeExpiredMinorData` | Idem. |

**Importante:** nenhum job precisa ser "um job por Estaca" — o particionamento lógico já vem do `stake_id` em cada linha. Isso mantém a arquitetura simples mesmo com N Estacas na mesma instância.

## 7. Integrações Externas

| Serviço | Uso | Observação multi-tenant |
|---|---|---|
| Supabase Auth | Autenticação | Claims `role`, `stake_id`, `ward_id` no JWT — únicos para toda a instância. |
| Supabase Storage | Upload de formulário de menor | Path prefixado por `{stake_id}/{ward_id}/...` — isolamento reforçado no próprio caminho do arquivo, não só na policy. |
| Resend | E-mails transacionais | Remetente (`from`) pode variar por Estaca se cada uma configurar seu próprio domínio verificado; caso contrário, usa um remetente genérico da plataforma. |
| `html5-qrcode` | Leitura de QR | Sem impacto — check-in já é escopado por `reservation_id`, que carrega `stake_id`. |

## 8. Deploy

- **Modo SaaS regional (compartilhado):** um único deploy Vercel + um único projeto Supabase atende N Estacas, todas isoladas por `stake_id`.
- **Modo auto-hospedado:** cada Estaca clona o repositório e sobe seu próprio Vercel + Supabase + Resend (free tier), com `NEXT_PUBLIC_DEFAULT_STAKE` apontando para a única Estaca daquela instância. Ver `SETUP.md`.
- Migrations aplicadas via `supabase db push`, sempre com aprovação manual em produção — nunca automático em tabela com RLS sensível, em nenhum dos dois modos.
