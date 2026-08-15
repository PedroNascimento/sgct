# Spec 010: Hardening de Segurança

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-009 (todas as anteriores)

## Contexto e Objetivo
Revisão e reforço de segurança antes de qualquer rollout real: rate limiting, revisão completa de RLS (incluindo cross-*stake*), validação de entrada, auditoria e teste de penetração básico manual.

## Escopo

### Dentro do escopo
- Rate limiting nos endpoints críticos (login, criação de reserva, scanner de check-in, envio de e-mail, upload de menor).
- Revisão de 100% das tabelas contra o checklist de `docs/DATABASE_SCHEMA.md` seção 10.
- Validação Zod em 100% das Server Actions (auditoria de cobertura, não só teste unitário).
- `audit_logs` cobrindo toda ação administrativa sensível ainda não coberta pelas specs anteriores.
- Teste de penetração básico manual: tentar acessar dado de outra Estaca/Ala via chamada direta à API, não só pela UI.

### Fora do escopo
- Contratação de serviço de pentest profissional externo (fora do orçamento do projeto nesta fase).
- WAF ou proteção de borda além do que a Vercel já oferece nativamente.

## Histórias de Usuário

### US-010.1: Rate limiting ativo
Como responsável técnico, quero que endpoints sensíveis tenham limite de requisições, para mitigar força bruta e abuso de automação.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL aplicar os limites definidos em `docs/SECURITY.md` seção 3 a cada endpoint listado.
- IF um cliente exceder o limite, THEN THE SYSTEM SHALL responder com código HTTP 429 e um cabeçalho `Retry-After`.

### US-010.2: Revisão completa de RLS
Como responsável técnico, quero confirmar que toda tabela sensível está corretamente isolada por Estaca e Ala antes do rollout, para eliminar a possibilidade de vazamento crítico.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL ter, para cada tabela listada em `docs/DATABASE_SCHEMA.md`, um teste `test:rls` cobrindo cross-*stake* e cross-Ala.
- WHEN o checklist da seção 10 de `docs/DATABASE_SCHEMA.md` for executado, THE SYSTEM SHALL passar em 100% dos itens antes de qualquer release considerada "pronta para produção".

### US-010.3: Teste de penetração manual básico
Como responsável técnico, quero simular um ataque simples de acesso cross-tenant via API direta, para validar que a RLS realmente impede o vazamento mesmo contornando a UI.

**Critérios de Aceite (EARS):**
- WHEN um token JWT de um usuário da Estaca A é usado para chamar a API do Supabase diretamente (contornando o Next.js) tentando ler dado da Estaca B, THE SYSTEM SHALL retornar conjunto vazio.
- THE SYSTEM SHALL documentar o resultado desse teste manual em um relatório curto, anexado ao checklist de release.

## Regras de Negócio Vinculadas
`docs/SECURITY.md` completo; Constituição Artigos II e V.

## Dependências
000-009 (todas).

## Perguntas em Aberto
Nenhuma.
