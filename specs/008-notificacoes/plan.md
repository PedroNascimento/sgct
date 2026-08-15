# Plan 008: Notificações por E-mail

**Spec de referência:** `specs/008-notificacoes/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | `SendNotification` (use-case) chama `EmailGateway` (interface) implementada por `ResendEmailGateway` em `infrastructure/`. |
| II | ✅ | Template de e-mail nunca inclui dado de outra Estaca; remetente configurável por `stake_id`. |
| III | N/A | Notificação não muda status de nada, é consequência de uma mudança já ocorrida. |
| IV | ✅ | Teste de deduplicação (janela de 5 min) e de retry com backoff antes da implementação. |
| V | ✅ | `RESEND_API_KEY` só server-side (Edge Function/Server Action), rate limiting conforme `docs/SECURITY.md`. |
| VI | N/A | |
| VII | ✅ | D04. |
| VIII | ✅ | Depende dos eventos das specs 004-007. |
| IX | ✅ | `.env.example` já cobre `RESEND_API_KEY`/`RESEND_FROM_EMAIL`. |

## Abordagem Técnica
`SendNotification` é chamado de forma assíncrona (fila simples em tabela `notification_queue` ou via Edge Function invocada por trigger de banco) para não bloquear a Server Action principal (ex: confirmar pagamento não deve esperar o e-mail ser enviado para retornar sucesso ao Admin Ala).

## Modelo de Dados
Nova tabela `notification_queue` (id, stake_id, event_type, recipient_id, payload jsonb, status, attempts, created_at) — RLS: só `service_role` lê/escreve (fila interna, sem acesso de usuário final).

## Contratos (Use-cases / Server Actions)
```ts
// src/use-cases/notifications/
enqueueNotification(input: { stakeId: string; eventType: string; recipientId: string; payload: Record<string, unknown> }): Promise<void>
processNotificationQueue(): Promise<{ sent: number; failed: number }>  // job pg_cron / Edge Function
```

## Decisões Técnicas Resolvidas (Research)
D04 (Resend, sem WhatsApp por custo).

## Fases de Implementação
- **Fase 1:** Tabela `notification_queue` + `enqueueNotification`.
- **Fase 2:** Integração Resend (`ResendEmailGateway`) + templates de todos os eventos do escopo.
- **Fase 3:** `processNotificationQueue` com retry/backoff e deduplicação por janela de 5 min.
- **Fase 4:** Painel Admin Estaca de métricas de volume de envio.
