# Spec 000: Fundação Multi-Tenant e Distribuição Open-Source

**Status:** Ready for Planning
**Constitution:** v2.0.0

## Contexto e Objetivo
O SGCT nasceu como um sistema single-tenant para a Estaca Natal. Esta spec formaliza a evolução estratégica do produto para uma **plataforma multi-tenant regional**: múltiplas Estacas do Brasil podem operar na mesma instância (mesmo banco Supabase), com isolamento absoluto entre elas, **e** o próprio código deve poder ser clonado e auto-hospedado por qualquer Estaca que prefira uma instância totalmente própria. Esta é a spec fundacional — toda outra spec (001-011) depende dela, pois todas as tabelas de negócio passam a carregar `stake_id`.

## Escopo

### Dentro do escopo
- Tabela `stakes` e propagação de `stake_id` para `wards`, `profiles`, `caravans`, `reservations` (e, por consistência de padrão, para as tabelas dependentes de `reservations`: `passenger_manifest_entries`, `minor_approval_forms`, `seat_swap_requests`, `credit_ledger`, `checkins`, `audit_logs`).
- Papel global `super_admin`, restrito a criar `stakes` e o primeiro `admin_estaca` de cada uma.
- Roteamento público dinâmico por slug de Estaca (`/[estaca_slug]`) e fallback silencioso da raiz `/` via `NEXT_PUBLIC_DEFAULT_STAKE`.
- `.env.example` e `SETUP.md` como artefatos de auto-hospedagem.
- Script de seed (`scripts/seed-bootstrap.ts`) para criar o `super_admin` e a primeira `stake` de uma instância nova.

### Fora do escopo
- Cobrança/monetização entre Estacas (o modelo é "cada Estaca hospeda de graça", não um SaaS pago).
- Painel de gestão centralizada de múltiplas Estacas por um único `admin_estaca` (cada `admin_estaca` gerencia apenas a própria Estaca — não há hierarquia entre Estacas).
- Migração de dados entre instâncias diferentes (cada instância auto-hospedada é independente; não há sincronização entre instâncias).
- Customização visual/tema por Estaca (fora desta spec; pode ser uma spec futura).

## Histórias de Usuário

### US-000.1: Isolamento absoluto entre Estacas
Como responsável técnico da plataforma, quero que nenhuma Estaca consiga acessar dado de outra Estaca, para que o modelo multi-tenant seja seguro o suficiente para hospedar clientes reais no mesmo banco.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL armazenar `stake_id` em toda tabela de reserva, financeiro, membro ou menor.
- WHEN um usuário autenticado de uma Estaca A tenta ler/escrever um registro de `stake_id` pertencente à Estaca B, THE SYSTEM SHALL negar o acesso e retornar conjunto vazio (nunca um erro que confirme a existência do dado).
- IF um payload de `INSERT` contém um `stake_id`/`ward_id` diferente do derivado da entidade-pai correspondente, THEN THE SYSTEM SHALL sobrescrever com o valor derivado, ignorando o valor enviado.
- WHILE o papel do usuário for `super_admin`, THE SYSTEM SHALL negar acesso de leitura a `reservations`, `credit_ledger`, `minor_approval_forms` e `checkins` de qualquer Estaca.

### US-000.2: Cadastro de nova Estaca por um Super Admin
Como `super_admin`, quero cadastrar uma nova Estaca e seu primeiro Admin Estaca, para que essa Estaca comece a operar de forma independente sem eu precisar administrar seu dia a dia depois.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL permitir que `super_admin` crie um registro em `stakes` (nome, slug único).
- THE SYSTEM SHALL permitir que `super_admin` crie exatamente um `profile` com `role = 'admin_estaca'` vinculado à Estaca recém-criada.
- IF o slug informado já existir, THEN THE SYSTEM SHALL rejeitar a criação com mensagem clara.
- WHEN o primeiro `admin_estaca` de uma Estaca faz login, THE SYSTEM SHALL permitir que ele cadastre suas próprias Alas e admins de Ala, sem depender de nova ação do `super_admin`.

### US-000.3: Acesso público por slug de Estaca
Como visitante do site público, quero acessar as informações da minha Estaca por uma URL específica, para que eu não veja ou confunda com dados de outra Estaca.

**Critérios de Aceite (EARS):**
- WHEN um visitante acessa `/[estaca_slug]`, THE SYSTEM SHALL exibir apenas caravanas e informações da Estaca correspondente àquele slug.
- WHEN um visitante acessa a raiz `/` (sem slug), THE SYSTEM SHALL renderizar silenciosamente o conteúdo da Estaca definida em `NEXT_PUBLIC_DEFAULT_STAKE`, sem alterar a URL visível para o usuário.
- IF o slug não corresponder a nenhuma Estaca ativa, THEN THE SYSTEM SHALL retornar 404.

### US-000.4: Acesso administrativo restrito à própria Estaca
Como Admin Ala ou Admin Estaca, quero que o sistema me impeça de sequer navegar até o painel de outra Estaca, para que erros de URL não virem tentativas de acesso indevido.

**Critérios de Aceite (EARS):**
- WHEN um usuário autenticado com `stake_id` X tenta acessar `/(admin)/[slug de Estaca Y]/...`, THE SYSTEM SHALL responder 403 antes de qualquer Server Action ser executada.
- THE SYSTEM SHALL aplicar essa checagem no middleware, como camada adicional e não substituta ao RLS do banco.

### US-000.5: Auto-hospedagem por qualquer Estaca
Como Secretário de Estaca de uma Estaca diferente da Estaca Natal, quero clonar o repositório e subir minha própria instância gratuita, para que eu não dependa da infraestrutura de outra organização.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL funcionar corretamente com um `.env` novo e um banco Supabase vazio, após rodar as migrations e o script de seed.
- THE SYSTEM SHALL NOT conter nenhuma string hardcoded de nome/slug de Estaca em código de aplicação (fora de dados de seed/teste).
- WHEN uma variável de ambiente nova é introduzida em qualquer código, THE SYSTEM SHALL exigir que `.env.example` seja atualizado no mesmo PR (verificação manual de revisão, não automatizável totalmente).
- THE SYSTEM SHALL fornecer um script de seed que cria o `super_admin` inicial e a primeira `stake` de uma instância nova, sem exigir acesso direto ao banco via SQL manual.

## Regras de Negócio Vinculadas
Ver `docs/DECISIONS.md` entradas D21-D25 e Constituição, Artigos II e IX.

## Dependências
Nenhuma — esta é a spec fundacional. Todas as demais specs (001-011) dependem desta.

## Perguntas em Aberto
Nenhuma.
