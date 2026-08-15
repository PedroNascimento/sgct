# Spec 008: Notificações por E-mail

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000, 004, 005, 006, 007

## Contexto e Objetivo
Consumir os eventos já disparados pelas specs 004-007 e efetivamente enviar e-mail via Resend, respeitando o free tier e o remetente configurável por Estaca.

## Escopo

### Dentro do escopo
- Integração Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL` por Estaca).
- Templates para: confirmação de reserva + QR Code, alerta de pagamento pendente, promoção de fila de espera, confirmação `PAGO_ALA`/`CONFIRMADO`, cancelamento/expiração de reserva, cancelamento de caravana por quórum, expiração de crédito, aprovação/reprovação de formulário de menor.
- Rate limiting de envio (ver `docs/SECURITY.md` seção 3) para não estourar a cota do free tier.
- Fila com backoff para picos (ex: validação semanal em lote).

### Fora do escopo
- Notificação por WhatsApp/SMS (D04 — fora de escopo por custo).
- Personalização visual avançada de template (HTML simples é suficiente no MVP).

## Histórias de Usuário

### US-008.1: Envio de e-mail por evento de negócio
Como membro, quero ser notificado por e-mail sempre que o status da minha reserva mudar, para acompanhar o processo sem precisar checar o site manualmente.

**Critérios de Aceite (EARS):**
- WHEN qualquer evento listado no escopo desta spec ocorrer, THE SYSTEM SHALL enviar um e-mail correspondente ao membro afetado em até 5 minutos.
- IF o envio falhar, THEN THE SYSTEM SHALL tentar novamente com backoff exponencial, até 3 tentativas, antes de registrar falha permanente.
- THE SYSTEM SHALL NOT enviar o mesmo e-mail (mesmo evento + mesma reserva) mais de uma vez em uma janela de 5 minutos (evita duplicidade em retry).

### US-008.2: Respeito ao limite do free tier
Como sistema, preciso evitar estourar a cota gratuita do Resend em picos de envio (ex: validação semanal em lote).

**Critérios de Aceite (EARS):**
- WHILE o volume de envio diário se aproximar do limite do free tier, THE SYSTEM SHALL enfileirar os e-mails excedentes para envio no próximo período, em vez de falhar silenciosamente.
- THE SYSTEM SHALL registrar métricas de volume de envio por dia, acessíveis ao Admin Estaca.

## Regras de Negócio Vinculadas
`docs/PRD.md` seção 6.7 (6.6 na v3); `docs/DECISIONS.md` D04.

## Dependências
000, 004, 005, 006, 007 (todos os eventos de origem).

## Perguntas em Aberto
Nenhuma.
