# Tasks 008: Notificações por E-mail

- [x] T008.1 — Migration: tabela `notification_queue` + RLS (`service_role` apenas)
- [x] T008.2 — Teste + implementação: `enqueueNotification`
- [x] T008.3 — `ResendEmailGateway` (infrastructure) implementando interface `EmailGateway`
- [x] T008.4 — Templates de e-mail: confirmação de reserva+QR, alerta de pendência, promoção de espera, PAGO_ALA/CONFIRMADO, cancelamento/expiração, cancelamento por quórum, expiração de crédito, aprovação/reprovação de menor
- [x] T008.5 — Teste + implementação: `processNotificationQueue` com retry exponencial (3 tentativas)
- [x] T008.6 — Teste: deduplicação — mesmo evento+reserva em janela de 5 min não duplica envio
- [x] T008.7 — Integração dos eventos das specs 004-007 chamando `enqueueNotification`
- [x] T008.8 — Painel Admin Estaca: métricas de volume de envio diário
- [x] T008.9 — `npm run test:rls` verde (fila só acessível por `service_role`)

**Definition of Done:** cobertura ≥80% em `src/use-cases/notifications/`; nenhum e-mail duplicado em teste de carga simulado.
