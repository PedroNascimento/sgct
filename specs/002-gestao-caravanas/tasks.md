# Tasks 002: Gestão de Caravanas (Admin Estaca)

**Plan de referência:** `specs/002-gestao-caravanas/plan.md`

## Fase 1 — CRUD de Caravana
- [x] T002.1 — **Teste primeiro:** `createCaravan` sempre grava `stake_id` da sessão, ignorando qualquer valor enviado no payload
- [x] T002.2 — Implementar `createCaravan` + `addBoardingPoint`
- [x] T002.3 — **Teste:** `admin_estaca` da Estaca A não consegue editar/cancelar caravana da Estaca B (RLS + Server Action)
- [x] T002.4 — Implementar `updateCaravanStatus`
- [x] T002.5 — Tela `(admin)/[estaca_slug]/estaca/calendario` (CRUD)

**Dependências:** 000, 001.

## Fase 2 — Calendário Público
- [x] T002.6 — **Teste primeiro:** `listPublicCaravans` retorna apenas caravanas da `stake_id` informada, sem nenhum campo de PII
- [x] T002.7 — Implementar `listPublicCaravans`
- [x] T002.8 — Página `(public)/[estaca_slug]/calendario` (SSG/ISR)

**Dependências:** Fase 1.

## Fase 3 — Agrupamento Familiar
- [x] T002.9 — Migration: `reservations.family_group_label` (nullable)
- [ ] T002.10 — Campo no formulário de reserva (depende da spec 003 existir)

**Dependências:** spec 003 (estrutura de `reservations` já criada).
