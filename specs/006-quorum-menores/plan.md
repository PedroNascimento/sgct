# Plan 006: Quórum, Cancelamento de Caravana e Menores

**Spec de referência:** `specs/006-quorum-menores/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `CheckMinimumQuorum`, `RolloverReservation`, `UploadMinorApprovalForm`, `ApproveMinorForm` em `use-cases/`. |
| II | ✅ | Rollover recria reserva com o mesmo `stake_id`/`ward_id`; nunca migra para outra Estaca. |
| III | ✅ | Cancelamento de caravana e aprovação de formulário só via Server Action. |
| IV | ✅ | Teste de limite exato (47/48/49 inscritos) é obrigatório antes da implementação. |
| V | ✅ | Upload de documento valida tipo/tamanho de arquivo com Zod antes de enviar ao Storage. |
| VI | ✅ | Esta spec **é** onde a conformidade LGPD de menores nasce — `audit_logs` em toda leitura de documento. |
| VII | ✅ | D06, D07. |
| VIII | ✅ | Depende de 004/005 (status de reserva já existentes). |
| IX | ✅ | Sem hardcode de Estaca. |

## Abordagem Técnica
Ver `docs/DATABASE_SCHEMA.md` seções 2 (`passenger_manifest_entries`, `minor_approval_forms`) e 5.5 (RLS + Storage). O rollover de reserva por cancelamento de caravana usa a mesma lógica de derivação por trigger (seção 3) — a nova reserva nunca aceita `stake_id`/`ward_id` do payload, apenas copia da reserva original.

## Modelo de Dados
`passenger_manifest_entries`, `minor_approval_forms` — ver `docs/DATABASE_SCHEMA.md` seção 2. Bucket Storage `minor-forms` com path `{stake_id}/{ward_id}/{reservation_id}/`.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/quorum/
checkMinimumQuorum(caravanId: string): Promise<{ cancelled: boolean; rolledOverCount?: number }>

// src/use-cases/minors/
addManifestEntry(input: { reservationId: string; fullName: string; birthDate: string; filiation: string }): Promise<PassengerManifestEntry>
uploadMinorApprovalForm(input: { reservationId: string; file: File }): Promise<MinorApprovalForm>
approveMinorForm(formId: string, adminId: string): Promise<MinorApprovalForm>
```

## Decisões Técnicas Resolvidas (Research)
D06 (crianças de colo — sem conta, sem assento, no manifesto), D07 (menor 12-17, login próprio, vínculo opcional).

## Fases de Implementação
- **Fase 1:** `CheckMinimumQuorum` + job `pg_cron` (teste de limite exato).
- **Fase 2:** Rollover automático de reserva para a próxima caravana.
- **Fase 3:** `passenger_manifest_entries` — CRUD simples vinculado à reserva.
- **Fase 4:** `minor_approval_forms` — upload + Storage privado + policy.
- **Fase 5:** `ApproveMinorForm` por Admin Ala + `audit_logs` em toda leitura.
