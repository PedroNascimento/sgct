# Spec 001: Autenticação, Perfis e RBAC

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-fundacao-multi-tenant-saas

## Contexto e Objetivo
Todo acesso ao sistema — membro, Admin Ala, Admin Estaca — começa por aqui. Esta spec cobre cadastro, login, atribuição de papel dentro de uma Estaca já existente (a criação da própria Estaca e do primeiro Admin Estaca é escopo da spec 000, feita por `super_admin`) e a manutenção do ciclo de vida da conta (inativação por inatividade).

## Escopo

### Dentro do escopo
- Cadastro e login de `member` (adulto e menor 12-17 com login próprio).
- Cadastro de `admin_ala` por um `admin_estaca` da mesma `stake_id`.
- 🔄 Cadastro de `guest` (convidado inter-Estaca) — conta leve, sem `ward_id`, vinculada à Estaca **anfitriã** (D28, corrigido).
- Vínculo opcional (nunca obrigatório) de um menor 12-17 à conta de um responsável.
- Inativação automática de conta após 24 meses sem login (D14).
- Bloqueio de autopromoção de `role` pelo próprio usuário.

### Fora do escopo
- Criação de `stakes` e do primeiro `admin_estaca` de cada uma (spec 000, papel exclusivo de `super_admin`).
- Autenticação via OTP/SMS/WhatsApp (D20 — e-mail próprio para todos, inclusive menores).
- Portal separado para o responsável de um menor (o vínculo é só um campo de referência, sem funcionalidade própria nesta versão).

## Histórias de Usuário

### US-001.1: Cadastro de membro adulto
Como visitante do site de uma Estaca, quero me cadastrar como membro, para poder reservar vagas em caravanas.

**Critérios de Aceite (EARS):**
- WHEN um visitante se cadastra a partir de `/[estaca_slug]`, THE SYSTEM SHALL criar um `profile` com `role = 'member'`, `stake_id` derivado da Ala escolhida (nunca escolhido diretamente) e `ward_id` da Ala selecionada.
- IF a Ala escolhida não pertencer à Estaca do slug atual, THEN THE SYSTEM SHALL rejeitar o cadastro.
- THE SYSTEM SHALL exigir e-mail e senha (Supabase Auth nativo), sem OTP externo.
- 🔄 THE SYSTEM SHALL coletar `sexo` (masculino/feminino) como campo do `profile`, perguntado uma única vez no cadastro — nunca novamente no formulário de reserva (ver spec 003, US-003.5).

### US-001.2: Cadastro de menor 12-17 com login próprio
Como jovem de 12 a 17 anos sem responsável na caravana, quero ter minha própria conta, para me inscrever mesmo sem meus pais serem membros cadastrados no sistema.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL permitir cadastro de conta própria para usuários entre 12 e 17 anos (campo `is_minor` computado de `birth_date`).
- THE SYSTEM SHALL NOT exigir vínculo (`guardian_id`) com conta de responsável como campo obrigatório.
- WHERE o menor optar por vincular um responsável já cadastrado, THE SYSTEM SHALL permitir esse vínculo opcional.

### US-001.3: Promoção de Membro Existente a Admin Ala por um Admin Estaca
Como Admin Estaca, quero promover um membro já cadastrado da minha Estaca a Administrador de Ala, para descentralizar a aprovação de pagamentos.

**Critérios de Aceite (EARS):**
- PRE-CONDITION: O usuário a ser promovido deve ter cadastro prévio como `member` na mesma Estaca (D32).
- WHEN um `admin_estaca` promove um `member` existente a `admin_ala`, THE SYSTEM SHALL buscar o perfil pelo e-mail e confirmar que pertence à mesma `stake_id` antes de elevar a permissão.
- THE SYSTEM SHALL exigir que o `ward_id` informado pertença à mesma `stake_id` do `admin_estaca` que está promovendo (Artigo II.d).
- IF um `admin_estaca` tentar promover um membro vinculado a outra Estaca, THEN THE SYSTEM SHALL rejeitar.
- THE SYSTEM SHALL NOT permitir criação de novos usuários pelo painel admin — apenas elevação de permissão de contas existentes.
- WHEN a permissão for revogada, THE SYSTEM SHALL retornar o usuário para `role = 'member'` sem excluir a conta nem o histórico.

### US-001.4: Inativação automática por inatividade
Como responsável técnico do sistema, quero que contas sem uso por muito tempo sejam inativadas automaticamente, sem perder o histórico de dados.

**Critérios de Aceite (EARS):**
- WHEN uma conta completa 24 meses sem login (`last_login_at`), THE SYSTEM SHALL marcar `profiles.is_active = false`.
- THE SYSTEM SHALL NOT excluir nenhum dado da conta ao inativá-la — apenas bloquear novo login até reativação.
- IF a conta tiver exatamente 23 meses e 29 dias de inatividade, THEN THE SYSTEM SHALL mantê-la ativa (teste de limite exato).

### US-001.5: Bloqueio de autopromoção
Como responsável de segurança do sistema, quero impedir que um usuário altere o próprio papel via API, para que RBAC não seja contornável por manipulação direta de request.

**Critérios de Aceite (EARS):**
- IF um `member` envia um `UPDATE` no próprio `profile` alterando `role` para qualquer valor diferente de `member`, THEN THE SYSTEM SHALL rejeitar a operação.

### US-001.6: 🔄 Cadastro de convidado inter-Estaca
Como membro de outra Estaca que não usa (ou não precisa usar) este sistema, quero criar uma conta leve na Estaca anfitriã, para reservar uma vaga pontual na caravana dela.

**Critérios de Aceite (EARS):**
- WHEN alguém se cadastra explicitamente como convidado a partir de `/[estaca_slug]` da Estaca anfitriã, THE SYSTEM SHALL criar um `profile` com `role = 'guest'`, `stake_id` = Estaca anfitriã (resolvido server-side do slug, nunca do payload), `ward_id = null`.
- THE SYSTEM SHALL coletar `home_stake_name` e `home_ward_name` como texto livre (não como referência a `stakes`/`wards` reais — a Estaca de origem pode não usar esta plataforma).
- THE SYSTEM SHALL NOT permitir que um `guest` seja promovido a `member`/`admin_ala` da Estaca anfitriã sem um cadastro completo separado (papéis são mutuamente exclusivos nesta versão).

## Regras de Negócio Vinculadas
`docs/DECISIONS.md`: D07 (menor sem vínculo obrigatório), D14 (inativação, não exclusão), D20 (auth por e-mail), D22 (hierarquia de papéis), D28 (convidado inter-Estaca, corrigido), D32 (admin é promovido, nunca criado pelo painel).

## Dependências
000-fundacao-multi-tenant-saas (schema `stakes`/`profiles`, triggers de consistência de tenant, claims JWT).

## Perguntas em Aberto
Nenhuma.
