# Spec 011: UAT e Piloto com uma Caravana Real

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-010 (todas as anteriores)

## Contexto e Objetivo
Validar o sistema completo com uma caravana real da Estaca Natal, rodando em paralelo ao processo atual (Google Sites), antes do rollout definitivo e antes de convidar qualquer outra Estaca a usar a plataforma (SaaS compartilhada) ou clonar o repositório (auto-hospedagem).

## Escopo

### Dentro do escopo
- Execução do sistema em paralelo ao processo atual para uma caravana de teste.
- Coleta estruturada de feedback dos Admins Ala/Estaca reais.
- Ajustes finais de UX no mapa de assentos e no fluxo de permuta, com base no uso real.
- Documentação de usuário final (não técnica) para Admins Ala/Estaca.
- Validação de que o `SETUP.md` funciona para uma segunda instância de teste (self-hosted), confirmando a promessa do Artigo IX antes de divulgar a outras Estacas.

### Fora do escopo
- Onboarding real de outras Estacas (acontece só depois deste piloto ser considerado bem-sucedido).
- Migração de dados históricos do protótipo Google Sites (D20 — fora de escopo do projeto todo).

## Histórias de Usuário

### US-011.1: Piloto em paralelo
Como Admin Estaca, quero rodar o sistema novo ao lado do processo atual numa caravana real, para validar o comportamento sem risco de a viagem falhar por causa de um bug do sistema novo.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL operar completamente (reserva → pagamento → check-in) para uma caravana real, com o Google Sites atual mantido como fallback documentado durante o piloto.
- WHEN o piloto terminar, THE SYSTEM SHALL ter um relatório de divergências (se houver) entre o resultado do sistema novo e o controle manual paralelo.

### US-011.2: Validação de auto-hospedagem
Como responsável técnico, quero confirmar que o `SETUP.md` funciona do zero antes de divulgar a plataforma a outras Estacas.

**Critérios de Aceite (EARS):**
- WHEN uma segunda instância de teste é criada seguindo apenas o `SETUP.md`, THE SYSTEM SHALL ficar operacional sem exigir nenhuma alteração de código-fonte.

## Regras de Negócio Vinculadas
`docs/DECISIONS.md` D20.

## Dependências
000-010 (todas).

## Perguntas em Aberto
Nenhuma.
