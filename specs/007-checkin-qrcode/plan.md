# Plan 007: Check-in de Embarque via QR Code

**Spec de referência:** `specs/007-checkin-qrcode/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `GenerateCheckInToken`, `ValidateCheckIn`, `GrantExceptionalCredit` em `use-cases/`; scanner (UI) só chama o use-case, nunca valida assinatura no client. |
| II | ✅ | `checkins` carrega `stake_id`+`ward_id`; token inclui `stake_id` para validação cruzada extra. |
| III | ✅ | `ValidateCheckIn` é a única via de escrita em `checkins`. |
| IV | ✅ | Teste de idempotência (leitura dupla online+offline) é o caso mais crítico desta spec. |
| V | ✅ | `QR_TOKEN_SECRET` só no servidor; nunca embutido no bundle client-side. Rate limiting no scanner (`docs/SECURITY.md` seção 3). |
| VI | N/A | Sem novo dado de menor. |
| VII | ✅ | D02, D03. |
| VIII | ✅ | Depende de 004 (`confirmado` já existe). |
| IX | ✅ | Sem hardcode de Estaca. |

## Abordagem Técnica
Ver `docs/ARCHITECTURE.md` seção 5.4 e `docs/SECURITY.md` seção 4. O token é assinado com `QR_TOKEN_SECRET` (HMAC), nunca com uma chave por Estaca — a validação inclui `stake_id` no payload para detectar qualquer tentativa de reuso cruzado entre instâncias (relevante sobretudo no modo SaaS compartilhado).

## Modelo de Dados
`checkins` — ver `docs/DATABASE_SCHEMA.md` seção 2 e 5 (índice único `(reservation_id, direction)`).

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/checkin/
generateCheckInToken(reservationId: string): Promise<{ token: string; expiresAt: Date }>
validateCheckIn(input: { token: string; direction: 'ida' | 'volta'; checkedInBy: string; syncedOffline?: boolean }): Promise<CheckIn>
grantExceptionalCredit(input: { reservationId: string; grantedBy: string; reason: string }): Promise<CreditLedgerEntry>
generatePassengerManifest(caravanId: string): Promise<ManifestRow[]>
```

## Decisões Técnicas Resolvidas (Research)
D02 (QR só após `CONFIRMADO`), D03 (no-show sem crédito automático + exceção manual auditada).

## Fases de Implementação
- **Fase 1:** `GenerateCheckInToken` (teste: nunca gera para status != `confirmado`).
- **Fase 2:** `ValidateCheckIn` online (teste de assinatura inválida/expirada).
- **Fase 3:** Scanner web + cache IndexedDB + sincronização offline (teste de idempotência dupla).
- **Fase 4:** Job de marcação de `no_show` pós-embarque + `GrantExceptionalCredit`.
- **Fase 5:** Exportação do manifesto de passageiros (CSV/PDF).
