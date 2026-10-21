# Tasks 012: Auxílio Financeiro (Aprovação e Fundo)

- [x] T012.1 — Migration: tabela `aid_requests` + RLS (padrão 4 camadas, igual `minor_approval_forms`)
- [x] T012.2 — Teste + implementação: `RequestAid` (criado atomicamente junto da reserva quando `funding_source != 'membro'`)
- [x] T012.3 — Teste: reserva com auxílio nasce em `aguardando_auxilio`, nunca em `pendente`
- [x] T012.4 — Teste + implementação: `ApproveAid` (transiciona reserva para `pago_ala`)
- [x] T012.5 — Teste + implementação: `RejectAid` (transiciona reserva para `cancelada_sem_credito`, sem crédito)
- [x] T012.6 — Teste: reserva com auxílio pendente NÃO é afetada pelo timeout padrão de 7 dias (spec 004, US-004.4)
- [x] T012.7 — Alerta de prazo insuficiente (<25 dias) na tela de registro do Admin Ala
- [x] T012.8 — Teste RLS: `aid_requests` cross-Ala e cross-Estaca → bloqueado
- [x] T012.9 — Integração com spec 008 (notificação de aprovação/reprovação)
- [x] T012.10 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/aid/`; teste do gate bloqueante (auxílio pendente nunca chega em `pago_ala`) obrigatoriamente verde.
