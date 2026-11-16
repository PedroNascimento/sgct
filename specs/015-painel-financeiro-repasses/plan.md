# Plan 015: Painel Financeiro de Controle de Repasses e Créditos

**Spec de referência:** `specs/015-painel-financeiro-repasses/spec.md`
**Constitution:** v4.0.0

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | Tipos/interfaces em `src/domain/`, use-cases puros em `src/use-cases/reports/`, implementação Supabase em `src/infrastructure/supabase/`, UI em `src/app/(admin)/[estaca_slug]/{estaca,ala}/relatorios/`. |
| II | ✅ | Isolamento em 2 níveis: `stake_id` obrigatório em todas as consultas; `ward_id` obrigatório para `admin_ala`; convidados (`ward_id IS NULL`) exibidos apenas na seção `Outra Estaca` do painel da Estaca; `super_admin` bloqueado pela RLS e redirecionado na UI. |
| III | ✅ | O painel financeiro é estritamente de leitura/consolidação e exportação; nenhuma transição de status de pagamento ou crédito é feita por `UPDATE` direto do client. |
| IV | ✅ | TDD obrigatório para os novos use-cases (`getStakeFinancialPanel`, `getWardFinancialPanel`) com cobertura mínima de 80% em `src/use-cases/` e testes RLS cross-stake/cross-ward. |
| V | ✅ | Entradas validadas com Zod (`stakeId`, `wardId`, `caravanId`); consultas executadas com `createSupabaseServerClient` (sem `service_role`). |
| VI | ✅ | Dados financeiros e de créditos permanecem restritos aos perfis administrativos autenticados; nenhuma exposição pública. |
| VII | ✅ | Todas as regras de cálculo (devido, pago na Ala, transferido/confirmado, falta transferir, créditos) derivam dos status e campos já aprovados nas specs 004, 005, 009, 012, 013 e D34. |
| VIII | ✅ | Fluxo Spec → Plan → Tasks → Implementação respeitado integralmente. |
| IX | ✅ | Nenhum nome de Estaca ou Ala hardcoded; listas de Alas e rótulos carregados dinamicamente do banco para o `stake_id` da sessão. |

## Abordagem Técnica
1. **Sem alteração destrutiva de banco:** As tabelas `caravans`, `wards`, `reservations`, `credit_ledger` e `guest_transfer_confirmations` já armazenam todos os dados necessários (`payment_amount`, `funding_source`, `status`, `created_at`, `confirmed_at`, `ward_id`, `stake_id`).
2. **Definição de métricas por Ala (e Outra Estaca) na caravana selecionada:**
   - **Reservas consideradas no compromisso financeiro ativo:** `pendente`, `pago_ala`, `aguardando_auxilio`, `aguardando_transferencia_interestaca`, `confirmado`, `presente`. *(Reservas `cancelada_com_credito`, `cancelada_sem_credito`, `expirada` e `lista_espera` são exibidas com status próprio quando aplicável, sem inflar o saldo devido de assentos ativos).*
   - **Total Devido (a transferir na caravana):** soma de `payment_amount` das reservas ativas da Ala.
   - **Já Pago na Ala (aguardando repasse/validação da Estaca):** soma de `payment_amount` das reservas em `status = 'pago_ala'`.
   - **Já Transferido / Confirmado pela Estaca:** soma de `payment_amount` das reservas em `status IN ('confirmado', 'presente')` (e para `Outra Estaca`, reservas de convidado confirmadas).
   - **Ainda Falta Transferir:** `Total Devido - Já Transferido`, composto por `(Já Pago na Ala aguardando repasse)` + `(Aguardando pagamento do membro/auxílio na Ala)`.
3. **Consulta de Créditos:**
   - Leitura de `credit_ledger` com join em `profiles` (nome) e `wards` (nome da Ala), filtrada por `stake_id` (para Estaca) ou `stake_id` + `ward_id` (para Ala), permitindo filtro por status (`active`, `used`, `expired`) e busca por nome.
4. **UI Responsiva (Spec 014):**
   - Cards de resumo proporcionais, tabela de repasses por Ala com barra de progresso visual + rótulos textuais, listagem detalhada por Ala / Outra Estaca (substituindo a planilha do Google), e aba/seção de Créditos por Cancelamento.
   - Compatível com desktop e mobile sem scroll horizontal obrigatório.

## Modelo de Dados
Reutiliza as tabelas existentes:
- `wards` (`id`, `stake_id`, `name`)
- `caravans` (`id`, `stake_id`, `departure_date`, `return_date`, `overnight`, `price_standard`, `price_officiant`, `status`)
- `reservations` (`id`, `stake_id`, `ward_id`, `caravan_id`, `user_id`, `created_at`, `funding_source`, `category`, `participant_type`, `payment_amount`, `status`, `confirmed_at`)
- `profiles` (`id`, `full_name`)
- `credit_ledger` (`id`, `stake_id`, `ward_id`, `user_id`, `amount`, `source`, `origin_reservation_id`, `reason`, `expires_at`, `used_at`, `status`, `created_at`)

## Contratos (Use-cases / Repositório)
```ts
// src/use-cases/reports/get-stake-financial-panel.ts
getStakeFinancialPanel(
  input: { stakeId: string; caravanId?: string },
  deps: { repository: FinancialReportRepository }
): Promise<StakeFinancialPanelData>

// src/use-cases/reports/get-ward-financial-panel.ts
getWardFinancialPanel(
  input: { stakeId: string; wardId: string; caravanId?: string },
  deps: { repository: FinancialReportRepository }
): Promise<WardFinancialPanelData>
```

## Decisões Técnicas Resolvidas (Research)
D17, D19, D28, D30, D33, D34.

## Fases de Implementação
- **Fase 1:** Tipos de domínio (`src/domain/types/report.ts`) e interface `FinancialReportRepository`.
- **Fase 2:** Use-cases `getStakeFinancialPanel` e `getWardFinancialPanel` com testes unitários (TDD).
- **Fase 3:** Implementação em `SupabaseFinancialReportRepository` e testes RLS garantindo isolamento de `stake_id`, `ward_id` e seção `Outra Estaca`.
- **Fase 4:** Interfaces `/estaca/relatorios` e `/ala/relatorios` substituindo a planilha do Google Sheets + consulta de créditos + exportação CSV/PDF.
