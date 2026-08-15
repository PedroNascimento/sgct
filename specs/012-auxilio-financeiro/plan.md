# Plan 012: Auxílio Financeiro (Aprovação e Fundo)

**Spec de referência:** `specs/012-auxilio-financeiro/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `RequestAid`, `ApproveAid`, `RejectAid` em `use-cases/`. |
| II | ✅ | `aid_requests` carrega `stake_id`+`ward_id` (derivados da reserva via trigger); mesmo padrão de 4 camadas de `minor_approval_forms`. |
| III | ✅ | Toda transição (`aguardando_auxilio → pago_ala` ou `→ cancelada_sem_credito`) via Server Action. |
| IV | ✅ | Teste crítico: reserva com `funding_source != 'membro'` nunca alcança `pago_ala` sem `aid_requests.status = 'approved'`. |
| V | ✅ | `ApproveAid`/`RejectAid` restritos a Admin Ala/Estaca da mesma Ala/Estaca (RLS + validação de use-case, igual ao bloqueio de autoaprovação de pagamento). |
| VI | N/A | Sem dado de menor. |
| VII | ✅ | D27, D30. |
| VIII | ✅ | Depende de 003 (campo `funding_source`) e 004 (status subsequentes). |
| IX | ✅ | Sem hardcode de Estaca; os 3 tipos de fundo são genéricos, não específicos da Estaca Natal. |

## Abordagem Técnica
`RequestAid` é chamado automaticamente pela mesma Server Action que cria a reserva (spec 003), quando `funding_source != 'membro'` — não é uma ação separada que o membro aciona. Isso mantém a criação da reserva e do pedido de auxílio atômicas (mesma transação).

## Modelo de Dados
`aid_requests` — ver `docs/DATABASE_SCHEMA.md` seção 2 e 5.5bis.

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/aid/
requestAid(input: { reservationId: string; aidType: AidType; requestedBy: string }): Promise<AidRequest>
approveAid(aidRequestId: string, approverId: string): Promise<Reservation>
rejectAid(aidRequestId: string, approverId: string): Promise<Reservation>
```

## Decisões Técnicas Resolvidas (Research)
D27 (gate de aprovação, 20-30 dias, corrigindo suposição anterior), D30 (funding_source não muda `payment_amount`).

## Fases de Implementação
- **Fase 1:** `RequestAid` integrado à criação de reserva (spec 003) — teste: reserva com auxílio nasce em `aguardando_auxilio`, não em `pendente`.
- **Fase 2:** `ApproveAid`/`RejectAid` + transições de status correspondentes.
- **Fase 3:** Alerta de prazo insuficiente (25 dias) na tela do Admin Ala.
- **Fase 4:** Integração com notificações (spec 008) para aprovação/reprovação.
