# Plan 003: Mapa de Assentos e Reserva

**Spec de referência:** `specs/003-reservas-concorrencia/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| II — Isolamento Multi-Tenant | ✅ | `stake_id`/`ward_id` de `reservations` são gravados pelo trigger `enforce_reservation_tenant_consistency` (spec 000) — o use-case nunca os define diretamente. |
| III — Sem UPDATE direto | ✅ | Criação de reserva é `INSERT` via Server Action; mudança de status é sempre de outra spec (004+), nunca aqui. |
| IV — TDD 80%+ | ✅ | Teste de concorrência real (não só de regra isolada) é obrigatório antes de considerar a spec pronta. |
| V — Segurança | ✅ | Rate limiting de criação de reserva (ver `docs/SECURITY.md` seção 3) — crítico no horário de abertura de inscrições. |

## Abordagem Técnica
A trava de concorrência é a constraint `unique (caravan_id, seat_number)` do Postgres — não um lock otimista no client nem um `SELECT` prévio de disponibilidade seguido de `INSERT` (que teria race condition clássica). O client tenta o `INSERT` diretamente; se falhar por violação de unicidade, a UI trata como "assento já ocupado, escolha outro" e atualiza o mapa via `v_seat_occupancy`.

## Modelo de Dados
`reservations`, `passenger_manifest_entries`, view `v_seat_occupancy` (ver `DATABASE_SCHEMA.md` seções 2, 5.1).

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/reservation/
createReservation(input: { caravanId; userId; seatNumber; boardingPointId; category }): Promise<Reservation>
addManifestEntry(input: { reservationId; fullName; birthDate; filiation }): Promise<PassengerManifestEntry>
getSeatOccupancy(caravanId: string): Promise<SeatOccupancy[]>
```
Zod: `createReservationSchema` valida `category in ('standard','officiant')`, `seatNumber` no intervalo 1-50.

## Decisões Técnicas Resolvidas (Research)
D06, D12, D17 (parcial — ranking em si é da spec 004) — `docs/DECISIONS.md`.

## Fases de Implementação
Fase 1: `createReservation` + trava de concorrência + testes de race condition reais (chamadas paralelas contra o banco local, não apenas lógica isolada). Fase 2: manifesto de crianças de colo. Fase 3: `v_seat_occupancy` + UI do mapa.
