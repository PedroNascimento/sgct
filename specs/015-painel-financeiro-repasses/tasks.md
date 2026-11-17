# Tasks 015: Painel Financeiro de Controle de Repasses e Créditos

**Spec:** `specs/015-painel-financeiro-repasses/spec.md`
**Plan:** `specs/015-painel-financeiro-repasses/plan.md`

## Fase 1 — Domínio e Contratos
- [x] **T015.1** Estender `src/domain/types/report.ts` com os tipos do painel financeiro:
  - `WardTransferSummary` (wardId, wardName, totalDue, totalPaidInWard, totalTransferredConfirmed, totalPendingMember, totalRemainingToTransfer, counts por status).
  - `FinancialRegistrantRow` (reservationId, createdAt, passengerName, wardId, wardName, fundingSource, category, participantType, paymentAmount, status, isGuest).
  - `FinancialCreditRow` (creditId, userId, memberName, wardId, wardName, amount, source, status, originReservationId, reason, expiresAt, usedAt, createdAt).
  - `StakeFinancialPanelData` e `WardFinancialPanelData`.
- [x] **T015.2** Estender `FinancialReportRepository` em `src/domain/interfaces/financial-report-repository.ts` com `getStakeFinancialPanelData` e `getWardFinancialPanelData`.

## Fase 2 — Use-Cases (TDD Primeiro)
- [x] **T015.3** Escrever testes unitários (red) e implementar `src/use-cases/reports/get-stake-financial-panel.ts` (validação Zod, cálculo agregado por Ala + seção `Outra Estaca`, detalhamento de inscritos e lista de créditos).
- [x] **T015.4** Escrever testes unitários (red) e implementar `src/use-cases/reports/get-ward-financial-panel.ts` (validação Zod, escopo estrito por `wardId`/`stakeId`, resumo de repasses da Ala, inscritos da Ala e créditos da Ala).

## Fase 3 — Infraestrutura e Segurança (RLS)
- [x] **T015.5** Implementar `getStakeFinancialPanelData` e `getWardFinancialPanelData` em `src/infrastructure/supabase/supabase-financial-report-repository.ts`.
- [ ] **T015.6** Adicionar/validar testes RLS em `src/__tests__/rls/financial-reports-isolation.test.ts` cobrindo:
  - Isolamento cross-Estaca nos dados de repasse, inscritos e créditos.
  - Isolamento cross-Ala no painel da Ala (incluindo ocultação de convidados inter-Estaca `ward_id IS NULL`).
  - Bloqueio de `super_admin`.

## Fase 4 — Painéis Administrativos (Estaca e Ala)
- [x] **T015.7** Atualizar `src/app/(admin)/[estaca_slug]/estaca/relatorios/page.tsx` e `estaca-relatorios-client.tsx` para exibir:
  - Seletor de caravana.
  - Cards globais da caravana (Total Devido, Pago na Ala, Transferido/Confirmado pela Estaca, Falta Transferir).
  - Tabela/cards de **Controle de Repasses por Ala** (incluindo `Outra Estaca` quando houver convidados).
  - **Registro Detalhado de Inscritos** agrupado por Ala (com busca, filtro por Ala, data/hora de inscrição, nome completo, forma de pagamento legível, valor devido, status e totais — substituindo a planilha do Google).
  - **Consulta de Créditos** (cancelamentos/lista de espera/concessões) com filtro por Ala, status e busca por nome.
  - Botões de exportação CSV/PDF.
- [x] **T015.8** Atualizar `src/app/(admin)/[estaca_slug]/ala/relatorios/page.tsx` e `ala-relatorios-client.tsx` para exibir o painel financeiro detalhado da própria Ala:
  - Seletor de caravana.
  - Cards de repasse da Ala (Total Devido, Pago na Ala aguardando repasse, Transferido/Confirmado pela Estaca, Falta Transferir).
  - Registro detalhado de inscritos da própria Ala.
  - Consulta de créditos dos membros da própria Ala.
  - Botões de exportação CSV/PDF escopados à Ala.

## Fase 5 — Verificação Final
- [ ] **T015.9** Executar `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:rls` (com Supabase local ativo) e `npm run build`.
