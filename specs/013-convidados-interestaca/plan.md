# Plan 013: Reservas de Convidado Inter-Estaca

**Spec de referência:** `specs/013-convidados-interestaca/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `ConfirmGuestTransfer`, `EvaluateGuestPriority` em `use-cases/`. |
| II | ⚠️→✅ | Esta spec **é** a exceção documentada no Artigo II.d — implementação deve ser auditada com atenção redobrada: nenhuma outra tabela/fluxo pode reaproveitar esse padrão sem nova emenda constitucional. `is_admin_ala_of` nunca é chamada em `guest_transfer_confirmations` (só `is_admin_estaca_of`), reforçando que esta exceção é estritamente de nível Estaca, nunca Ala. |
| III | ✅ | Confirmação de repasse e transição de reserva via Server Action. |
| IV | ✅ | Teste crítico: convidado NUNCA é confirmado à frente de membro da própria Estaca, mesmo com repasse confirmado antes. |
| V | ✅ | Server Action valida que `origin_stake_name`/`origin_ward_name` não estão vazios (Zod), mesmo sendo texto livre. |
| VI | N/A | |
| VII | ✅ | D28. |
| VIII | ✅ | Depende de 001 (conta guest) e 004 (ranking). |
| IX | ✅ | Sem hardcode de nome de Estaca — funciona para qualquer par origem/anfitriã. |

## Abordagem Técnica
`EvaluateGuestPriority` roda como parte do mesmo `RecalculateCaravanRanking` da spec 004 (não é um recálculo paralelo) — reservas com `funding_source = 'convidado_transferencia_interestaca'` são simplesmente ordenadas por último em qualquer ranking, usando o mesmo `confirmation_rank`. Isso evita ter duas lógicas de ranking divergentes no sistema.

## Modelo de Dados
`guest_transfer_confirmations` — ver `docs/DATABASE_SCHEMA.md` seção 2 e 5.5ter. `profiles.role = 'guest'` e `reservations.funding_source = 'convidado_transferencia_interestaca'` — ver seções 2 (profiles/reservations) e 3 (triggers).

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/guest/
registerGuestSignup(input: { stakeSlug: string; fullName: string; document: string; phone: string; homeStakeName: string; homeWardName: string }): Promise<Profile>
createGuestReservation(input: { userId: string; caravanId: string; seatNumber: number; originStakeName: string; originWardName: string; amount: number }): Promise<{ reservation: Reservation; transferConfirmation: GuestTransferConfirmation }>
confirmGuestTransfer(transferConfirmationId: string, confirmedBy: string): Promise<Reservation>
```

## Decisões Técnicas Resolvidas (Research)
D28 (convidado suportado, 3 elos de repasse, prioridade sempre da Estaca anfitriã — corrige a suposição anterior de "fora do MVP").

## Fases de Implementação
- **Fase 1:** Cadastro de conta `guest` (junto com spec 001) — teste: `stake_id` sempre resolvido do slug, nunca do payload.
- **Fase 2:** `createGuestReservation` (cria reserva + `guest_transfer_confirmations` na mesma transação).
- **Fase 3:** `confirmGuestTransfer` + integração com `RecalculateCaravanRanking` (spec 004) para aplicar a prioridade.
- **Fase 4:** Teste de integração completo: 2 Estacas fixture, membro da Estaca anfitriã em `lista_espera` + convidado com repasse confirmado → convidado NÃO é promovido antes do membro.
