# Spec 013: Reservas de Convidado Inter-Estaca

**Status:** Ready for Planning
**Constitution:** v3.0.0
**Depende de:** 000, 001, 002, 003, 004

## Contexto e Objetivo
Um membro de uma Estaca de origem pode, pontualmente, participar da caravana de outra Estaca (anfitriã), mediante um repasse financeiro em 3 elos: Ala de origem → Estaca de origem → Estaca anfitriã. Esta spec implementa a exceção formalmente documentada no Artigo II.d da constituição (v3.0.0) — isolamento continua absoluto para tudo, exceto esta reserva específica do convidado, visível apenas ao Admin Estaca da Estaca anfitriã.

## Escopo

### Dentro do escopo
- Cadastro de conta `guest` (spec 001, US-001.6) e criação de reserva vinculada a essa conta.
- Registro do repasse (`guest_transfer_confirmations`) pelo Admin Estaca anfitrião.
- Regra de prioridade: convidado só é confirmado se, depois de rankeados todos os membros da própria Estaca anfitriã (spec 004, US-004.3), ainda houver vaga livre **e** a lista de espera da Estaca anfitriã estiver vazia.
- Regra de prazo estendido: como a cadeia de repasse entre 3 organizações leva mais tempo que uma transferência normal Ala→Estaca, a reserva de convidado não se submete ao timeout padrão de 7 dias (spec 004, US-004.4) — expira apenas se não confirmada até o fechamento da caravana (domingo anterior) sem repasse recebido.

### Fora do escopo
- Qualquer automação do lado da Estaca de **origem** do convidado (Ala origem → Estaca origem) — isso é inteiramente externo, mesmo que a Estaca de origem também use esta plataforma (são tenants diferentes, sem integração entre si nesta versão).
- Conversão de conta `guest` em `member` permanente da Estaca anfitriã.

## Histórias de Usuário

### US-013.1: Criação da reserva do convidado
Como convidado de outra Estaca, quero reservar uma vaga na caravana da Estaca anfitriã, para participar pontualmente mesmo sem ser membro dela.

**Critérios de Aceite (EARS):**
- WHEN um `profile` com `role = 'guest'` cria uma reserva, THE SYSTEM SHALL definir `funding_source = 'convidado_transferencia_interestaca'` automaticamente (ver trigger em `docs/DATABASE_SCHEMA.md` seção 3) e `status = 'aguardando_transferencia_interestaca'`.
- THE SYSTEM SHALL exigir os campos `origin_stake_name`/`origin_ward_name` (texto livre) no momento da reserva, gravados em `guest_transfer_confirmations`.

### US-013.2: Confirmação do repasse pela Estaca anfitriã
Como Admin Estaca da Estaca anfitriã, quero confirmar que recebi o repasse da Estaca de origem do convidado, para liberar a reserva dele.

**Critérios de Aceite (EARS):**
- WHEN o Admin Estaca anfitrião confirma o recebimento em `guest_transfer_confirmations`, THE SYSTEM SHALL avaliar a regra de prioridade (US-013.3) antes de transicionar a reserva.
- IF a regra de prioridade permitir, THEN THE SYSTEM SHALL transicionar a reserva para `confirmado` diretamente (sem passar por `pago_ala` — não há Ala anfitriã envolvida).
- IF a regra de prioridade não permitir (sem vaga ou lista de espera da Estaca anfitriã não vazia), THEN THE SYSTEM SHALL manter a reserva em `lista_espera`, mesmo com o repasse já confirmado.

### US-013.3: Prioridade dos membros da Estaca anfitriã
Como membro da Estaca que está organizando a caravana, quero ter prioridade sobre qualquer convidado de outra Estaca, para que minha vaga nunca seja ocupada por alguém de fora antes de mim.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL NUNCA confirmar uma reserva de convidado enquanto houver reserva `pendente`, `pago_ala` ou `lista_espera` de um membro da própria Estaca anfitriã ainda não resolvida para aquela caravana.
- WHEN uma vaga se abre (cancelamento/timeout) E existe convidado com repasse já confirmado aguardando, THE SYSTEM SHALL promover primeiro qualquer membro da Estaca anfitriã na lista de espera, e só depois considerar o convidado.

## Regras de Negócio Vinculadas
`docs/DECISIONS.md` D28; Constituição Artigo II.d.

## Dependências
000, 001 (conta guest), 002, 003 (reserva), 004 (ranking e status de referência).

## Perguntas em Aberto
Nenhuma — se no futuro a plataforma quiser automatizar a perna Ala origem→Estaca origem quando ambas as Estacas usarem o sistema, isso é uma extensão de escopo que exigiria nova decisão e possivelmente nova emenda constitucional (o repasse cruzaria dados de duas Estacas simultaneamente, o que hoje não é permitido por nenhuma exceção documentada).
