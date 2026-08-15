# Tasks 012: Auxílio Financeiro (Aprovação e Fundo)

- [ ] T012.1 — Migration: tabela `aid_requests` + RLS (padrão 4 camadas, igual `minor_approval_forms`)
- [ ] T012.2 — Teste + implementação: `RequestAid` (criado atomicamente junto da reserva quando `funding_source != 'membro'`)
- [ ] T012.3 — Teste: reserva com auxílio nasce em `aguardando_auxilio`, nunca em `pendente`
- [ ] T012.4 — Teste + implementação: `ApproveAid` (transiciona reserva para `pago_ala`)
- [ ] T012.5 — Teste + implementação: `RejectAid` (transiciona reserva para `cancelada_sem_credito`, sem crédito)
- [ ] T012.6 — Teste: reserva com auxílio pendente NÃO é afetada pelo timeout padrão de 7 dias (spec 004, US-004.4)
- [ ] T012.7 — Alerta de prazo insuficiente (<25 dias) na tela de registro do Admin Ala
- [ ] T012.8 — Teste RLS: `aid_requests` cross-Ala e cross-Estaca → bloqueado
- [ ] T012.9 — Integração com spec 008 (notificação de aprovação/reprovação)
- [ ] T012.10 — `npm run test:rls` verde antes de concluir

**Definition of Done:** cobertura ≥80% em `src/use-cases/aid/`; teste do gate bloqueante (auxílio pendente nunca chega em `pago_ala`) obrigatoriamente verde.
