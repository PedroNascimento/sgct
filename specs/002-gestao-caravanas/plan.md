# Plan 002: Gestão de Caravanas (Admin Estaca)

**Spec de referência:** `specs/002-gestao-caravanas/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| II — Isolamento Multi-Tenant | ✅ | `createCaravan` nunca aceita `stake_id` do formulário — sempre da sessão do `admin_estaca` autenticado (mesmo padrão de defesa em profundidade da spec 000: trigger + Server Action). |
| III — Sem UPDATE direto | ✅ | Alterações de `status` de caravana (`open → cancelled`, etc.) via use-case dedicado, não `update()` livre do client. |
| IV — TDD 80%+ | ✅ | Ver `tasks.md`. |
| VII — Nenhuma regra inventada | ✅ | D06, D12, D18 já resolvidas. |

## Abordagem Técnica
`caravans_write_admin_estaca` (RLS, `DATABASE_SCHEMA.md` 5.5) já impede escrita fora da própria `stake_id`; a Server Action reforça isso não expondo nem aceitando `stake_id` como parâmetro do formulário — o valor é sempre lido do claim da sessão no servidor. A página pública de calendário roda como Server Component com SSG/ISR (Next.js), filtrando explicitamente por `stake_id` resolvido do slug (não depender só de RLS para o filtro de exibição, já que a policy de `caravans` é propositalmente permissiva — ver `DATABASE_SCHEMA.md` 5.5).

## Modelo de Dados
`caravans`, `boarding_points` (ver `DATABASE_SCHEMA.md` seção 2). Campo de agrupamento familiar: adicionar `family_group_label text` em `reservations` (nullable, texto livre curto, ex: "Família Silva") — não uma tabela nova, dado que não vira lógica de sistema, só informação de apoio.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/caravan/
createCaravan(input: {...}, actingAdminEstacaId: string): Promise<Caravan>
addBoardingPoint(input: { caravanId; name; boardingTime }): Promise<BoardingPoint>
updateCaravanStatus(caravanId: string, status: CaravanStatus, actingAdminEstacaId: string): Promise<Caravan>
listPublicCaravans(stakeId: string): Promise<CaravanSummary[]>  // sem PII
```

## Decisões Técnicas Resolvidas (Research)
D06, D12, D18 (`docs/DECISIONS.md`).

## Fases de Implementação
Fase 1: CRUD de caravana + pontos de embarque. Fase 2: página pública de calendário. Fase 3: campo de agrupamento familiar no formulário de reserva (depende de `reservations` existir — spec 003).
