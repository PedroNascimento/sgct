# Spec 002: Gestão de Caravanas (Admin Estaca)

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-fundacao-multi-tenant-saas, 001-autenticacao-rbac

## Contexto e Objetivo
Antes de qualquer reserva existir, um `admin_estaca` precisa cadastrar a caravana: datas, valores por categoria, pontos de embarque e prazos. Esta spec também cobre a página pública de calendário (site público por Estaca).

## Escopo

### Dentro do escopo
- CRUD de `caravans` por `admin_estaca` — sempre escopado à própria `stake_id` (nunca escolhida manualmente, sempre a do próprio admin).
- Múltiplos pontos de embarque por caravana (`boarding_points`), cada um com nome e horário.
- Tabela de preços por categoria (Padrão, Oficiante, Criança de Colo gratuita).
- Prazos: fechamento de inscrição (domingo anterior), verificação de quórum (terça anterior).
- Página pública de calendário em `/[estaca_slug]/calendario`, com status agregado (Disponíveis/Confirmadas/Em Validação/Espera).
- Campo de preferência de agrupamento familiar no formulário de inscrição (só coleta o dado — atribuição de quarto em si é fora do escopo digital, D18).

### Fora do escopo
- Atribuição de quarto/cartão de acesso com antecedência (D18 — só existe fisicamente na chegada a Recife).
- Lógica de reserva de assento em si (spec 003).
- Validação financeira e recálculo de ranking (spec 004).

## Histórias de Usuário

### US-002.1: Criar caravana
Como Admin Estaca, quero cadastrar uma nova caravana com datas, valores e pontos de embarque, para abrir as inscrições aos membros da minha Estaca.

**Critérios de Aceite (EARS):**
- WHEN um `admin_estaca` cria uma `caravan`, THE SYSTEM SHALL gravar `stake_id` igual ao da própria sessão do admin (nunca um campo escolhível no formulário).
- THE SYSTEM SHALL exigir `departure_date`, `price_standard`, `price_officiant`, `registration_deadline` (domingo anterior) e `quorum_check_date` (terça anterior).
- THE SYSTEM SHALL permitir cadastro de um ou mais `boarding_points`, cada um com nome e horário.

### US-002.2: Consultar calendário público
Como visitante do site de uma Estaca, quero ver as caravanas futuras com valores e vagas, para decidir se vou me inscrever.

**Critérios de Aceite (EARS):**
- WHEN um visitante acessa `/[estaca_slug]/calendario`, THE SYSTEM SHALL listar apenas caravanas cuja `stake_id` corresponde ao slug da rota.
- THE SYSTEM SHALL exibir status agregado (Disponíveis/Confirmadas/Em Validação/Espera) sem expor nome ou Ala de nenhum inscrito.

### US-002.3: Preferência de agrupamento familiar
Como membro se inscrevendo com família, quero indicar quem mais da minha família vai na mesma caravana, para que a equipe de alojamento tenha essa informação na chegada ao Templo.

**Critérios de Aceite (EARS):**
- WHERE o formulário de inscrição incluir o campo de agrupamento familiar, THE SYSTEM SHALL armazenar essa preferência vinculada à reserva.
- THE SYSTEM SHALL NOT criar nenhuma estrutura de "quarto" ou "cartão de acesso" a partir desse campo — é apenas informação de apoio para atribuição manual e presencial (D18).

## Regras de Negócio Vinculadas
`docs/DECISIONS.md`: D06 (colo gratuito), D12 (categoria autodeclarada — aplicada na reserva, spec 003, mas o preço em si é definido aqui), D18 (alojamento sem dado antecipado).

## Dependências
000 (schema `stakes`/`caravans`/`boarding_points`), 001 (só `admin_estaca` autenticado e escopado pode criar caravana).

## Perguntas em Aberto
Nenhuma.
