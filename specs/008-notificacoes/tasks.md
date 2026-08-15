# Tasks 008: Notificações por E-mail

- [ ] T008.1 — Migration: tabela `notification_queue` + RLS (`service_role` apenas)
- [ ] T008.2 — Teste + implementação: `enqueueNotification`
- [ ] T008.3 — `ResendEmailGateway` (infrastructure) implementando interface `EmailGateway`
- [ ] T008.4 — Templates de e-mail: confirmação de reserva+QR, alerta de pendência, promoção de espera, PAGO_ALA/CONFIRMADO, cancelamento/expiração, cancelamento por quórum, expiração de crédito, aprovação/reprovação de menor
- [ ] T008.5 — Teste + implementação: `processNotificationQueue` com retry exponencial (3 tentativas)
- [ ] T008.6 — Teste: deduplicação — mesmo evento+reserva em janela de 5 min não duplica envio
- [ ] T008.7 — Integração dos eventos das specs 004-007 chamando `enqueueNotification`
- [ ] T008.8 — Painel Admin Estaca: métricas de volume de envio diário
- [ ] T008.9 — `npm run test:rls` verde (fila só acessível por `service_role`)

**Definition of Done:** cobertura ≥80% em `src/use-cases/notifications/`; nenhum e-mail duplicado em teste de carga simulado.
