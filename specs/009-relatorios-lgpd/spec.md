# Spec 009: Relatórios Financeiros e Conformidade LGPD

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000, 001, 004, 006

## Contexto e Objetivo
Relatórios financeiros escopados (Admin Ala vê só a própria Ala; Admin Estaca vê o consolidado da própria Estaca) e a automação de retenção/expurgo de dados exigida pelo Artigo VI da constituição.

## Escopo

### Dentro do escopo
- `v_ward_financial_summary` (Admin Ala) e visão consolidada por Estaca (Admin Estaca) — exportação CSV/PDF.
- `PurgeExpiredMinorData`: expurgo automático de documentos/dados de menor (90 dias pós-viagem).
- `DeactivateInactiveAccounts`: inativação automática após 24 meses sem login.
- Aviso de privacidade no site público + fluxo de solicitação de acesso/exclusão (LGPD Art. 18).

### Fora do escopo
- Relatório consolidado **entre Estacas** (não existe — cada Admin Estaca só vê a própria, mesmo no modo SaaS compartilhado; ver Artigo II.f).
- Anonimização de dados financeiros de longo prazo (5 anos) — mencionada no PRD como política, mas a automação desse expurgo específico fica para uma spec futura, já que o prazo é longo demais para ser testado/validado nesta fase do projeto.

## Histórias de Usuário

### US-009.1: Relatório financeiro por Ala
Como Admin Ala, quero exportar um relatório dos valores arrecadados e pendentes da minha Ala, para prestar contas na reunião de bispado.

**Critérios de Aceite (EARS):**
- WHEN um Admin Ala solicita o relatório, THE SYSTEM SHALL retornar dados exclusivamente da própria `ward_id`/`stake_id`, exportáveis em CSV e PDF.

### US-009.2: Relatório financeiro consolidado da Estaca
Como Admin Estaca, quero um relatório consolidado de todas as Alas da minha Estaca, para prestação de contas central.

**Critérios de Aceite (EARS):**
- WHEN um Admin Estaca solicita o relatório consolidado, THE SYSTEM SHALL agregar dados de todas as Alas da própria `stake_id` apenas — nunca de outra Estaca.

### US-009.3: Expurgo automático de dados de menor
Como sistema, preciso expurgar documentos de autorização de menor vencidos, para cumprir a política de retenção da LGPD sem depender de processo manual.

**Critérios de Aceite (EARS):**
- WHEN um `minor_approval_form` completar 90 dias após a data de retorno da caravana associada, THE SYSTEM SHALL excluí-lo do Storage e da tabela.
- IF o documento tiver 89 dias, THEN THE SYSTEM SHALL NOT excluí-lo (teste de limite).

### US-009.4: Inativação automática de conta
Como sistema, preciso inativar (não excluir) contas sem uso prolongado, preservando histórico.

**Critérios de Aceite (EARS):**
- WHEN um `profile` completar 24 meses sem `last_login_at` atualizado, THE SYSTEM SHALL definir `is_active = false`.
- THE SYSTEM SHALL NOT excluir a linha ou qualquer dado histórico associado.

## Regras de Negócio Vinculadas
`docs/PRD.md` seção 7 (Política de Retenção), `docs/DECISIONS.md` D14, D19; Constituição Artigo VI.

## Dependências
000, 001, 004, 006.

## Perguntas em Aberto
Nenhuma.
