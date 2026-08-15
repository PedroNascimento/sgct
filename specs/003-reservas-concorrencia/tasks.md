# Tasks 003: Mapa de Assentos e Reserva

**Plan de referência:** `specs/003-reservas-concorrencia/plan.md`

## Fase 1 — Reserva com Concorrência Real
- [ ] T003.1 — **Teste primeiro (crítico):** duas requisições paralelas reais contra o banco local tentando o mesmo `seat_number`/`caravan_id` → exatamente uma sucede
- [ ] T003.2 — Implementar `createReservation` (INSERT direto, trata erro de unicidade como "assento ocupado")
- [ ] T003.3 — **Teste:** categoria "Oficiante" aplica `price_officiant` sem chamada a nenhuma rotina de aprovação
- [ ] T003.4 — **Teste:** `stake_id`/`ward_id` gravados são os derivados pelo trigger, mesmo que o payload tente forjar outro valor
- [ ] T003.5 — Rate limiting em `POST /reserva` (ver `docs/SECURITY.md` seção 3) — testar especialmente o cenário de pico de abertura de inscrições

**Dependências:** 000, 001, 002.

## Fase 2 — Manifesto de Crianças de Colo
- [ ] T003.6 — **Teste primeiro:** `addManifestEntry` não ocupa `seat_number`, não gera `payment_amount`, não conta para os 50/55
- [ ] T003.7 — Implementar `addManifestEntry`

**Dependências:** Fase 1.

## Fase 3 — Mapa de Assentos (UI)
- [ ] T003.8 — **Teste primeiro:** `getSeatOccupancy` nunca retorna coluna de PII, nunca retorna linha de `stake_id` diferente do solicitado
- [ ] T003.9 — Implementar `getSeatOccupancy` (view `v_seat_occupancy`)
- [ ] T003.10 — Componente de mapa de assentos (layout fiel: fileiras duplas, corredor, banheiro, motorista) — assento ocupado não é clicável
- [ ] T003.11 — **Teste (RTL):** estado otimista do componente reverte corretamente se a reserva falhar por concorrência

**Dependências:** Fase 1.
