# Spec 003: Mapa de Assentos e Reserva

**Status:** Ready for Planning
**Constitution:** v2.0.0
**Depende de:** 000-fundacao-multi-tenant-saas, 001-autenticacao-rbac, 002-gestao-caravanas

## Contexto e Objetivo
O momento mais concorrido do sistema: membros de até 6 Alas de uma mesma Estaca disputando 50 assentos (+5 de espera) no mesmo ônibus. Esta spec cobre a criação da reserva em si — a confirmação financeira e o recálculo de posição são da spec 004.

## Escopo

### Dentro do escopo
- Mapa de assentos fiel ao layout real (fileiras duplas, corredor, banheiro, motorista).
- Reserva com seleção de assento, ponto de embarque e categoria (Padrão/Oficiante, autodeclarada).
- Trava exclusiva por assento (`unique (caravan_id, seat_number)`), sem race condition entre dois membros da mesma Estaca.
- Manifesto de crianças de colo (0-5 anos, sem conta, sem assento, gratuitas) vinculado à reserva do responsável.
- View `v_seat_occupancy` (ocupado/livre, sem PII), sempre escopada por `stake_id`.
- 🔄 Formulário de reserva **dentro do sistema** (substitui o Google Forms atual), que reaproveita dado já cadastrado no `profile` e só pergunta o que é específico daquela reserva (D27, D29 — ver US-003.5 e US-003.6).

### Fora do escopo
- Validação financeira, ranking de confirmação e passagem para lista de espera (spec 004).
- Formulário de autorização de menor 12-17 (spec 006).
- Check-in físico (spec 007).
- 🔧 **CORRIGIDO:** aprovação do pedido de auxílio financeiro (gate bloqueante) — spec **012-auxilio-financeiro** (nova). Esta spec (003) só cobre a coleta do campo `funding_source` no formulário; o fluxo de aprovação em si vive em 012.
- 🔧 **CORRIGIDO:** confirmação do repasse inter-Estaca e regra de prioridade de convidado — spec **013-convidados-interestaca** (nova). Esta spec (003) só cobre a existência do assento reservável por um `profile` com `role = 'guest'`; a lógica de repasse/prioridade vive em 013.
- Atribuição automática de assento preferencial/acessível a um conjunto restrito de poltronas — o campo é coletado (US-003.6) mas não há lógica de restrição de quais números de assento podem ser marcados como preferenciais nesta versão.

## Histórias de Usuário

### US-003.1: Reservar assento
Como membro autenticado, quero escolher um assento específico no mapa do ônibus da minha Estaca, para demonstrar minha intenção de participar da caravana.

**Critérios de Aceite (EARS):**
- WHEN um membro seleciona um assento livre e confirma, THE SYSTEM SHALL criar uma `reservation` com `status = 'pendente'`, `stake_id` derivado da `caravan`, `ward_id` derivado do próprio `profile`.
- IF dois membros tentarem reservar o mesmo `seat_number` da mesma `caravan_id` simultaneamente, THEN THE SYSTEM SHALL garantir que apenas um tenha sucesso (constraint `unique` no banco, nunca só lock otimista no client).
- IF o assento já estiver ocupado, THEN THE SYSTEM SHALL informar isso antes de tentar submeter (via `v_seat_occupancy`).

### US-003.2: Categoria autodeclarada
Como membro que serve no Templo, quero indicar minha categoria de Oficiante no momento da reserva, para pagar o valor correto.

**Critérios de Aceite (EARS):**
- WHEN um membro seleciona a categoria "Oficiante" na reserva, THE SYSTEM SHALL aplicar `price_officiant` sem exigir validação administrativa prévia (D12).

### US-003.3: Criança de colo no manifesto
Como responsável de uma criança de até 5 anos, quero registrá-la na minha reserva, para que ela conste no manifesto de passageiros sem ocupar assento nem gerar cobrança.

**Critérios de Aceite (EARS):**
- WHEN um responsável adiciona uma criança de colo à própria reserva, THE SYSTEM SHALL criar um registro em `passenger_manifest_entries` vinculado, sem `seat_number` e sem valor de pagamento.
- THE SYSTEM SHALL NOT contar crianças de colo para o limite de 50 assentos nem para as posições 51-55 da lista de espera.

### US-003.4: Ocupação visível entre Alas da mesma Estaca
Como membro de qualquer Ala da minha Estaca, quero ver quais assentos já estão ocupados, para escolher entre os disponíveis — mesmo que eu não saiba quem os ocupou.

**Critérios de Aceite (EARS):**
- WHEN um membro consulta o mapa de assentos, THE SYSTEM SHALL retornar apenas `seat_number` e `occupancy_status`, nunca nome, Ala ou status de pagamento de outro membro.
- THE SYSTEM SHALL NOT retornar ocupação de assentos de caravanas de outra `stake_id`.

### US-003.5: 🔄 Formulário de reserva reaproveita dados de cadastro
Como membro que já tem conta no sistema, quero que o formulário de reserva não me pergunte de novo meu nome, documento ou telefone, para não repetir o que já cadastrei.

**Critérios de Aceite (EARS):**
- WHEN um membro autenticado inicia uma reserva, THE SYSTEM SHALL pré-preencher (sem campo editável neste formulário) nome completo, documento, telefone e sexo a partir do próprio `profile`.
- THE SYSTEM SHALL NOT exibir esses campos como perguntas no formulário de reserva — se algo estiver errado, a correção acontece na tela "Minha Conta" (spec 001), não aqui.
- IF o `profile` estiver com um campo obrigatório ausente (ex: `cpf` nulo), THEN THE SYSTEM SHALL bloquear o início da reserva e direcionar o membro para completar o cadastro antes de prosseguir.

### US-003.6: 🔄 Campos específicos da reserva
Como membro fazendo uma nova reserva, quero informar dados que mudam a cada viagem, para que a Ala e o Líder de Caravana tenham o contexto correto desta caravana especificamente.

**Critérios de Aceite (EARS):**
- THE SYSTEM SHALL perguntar, a cada reserva (nunca reaproveitado de uma reserva anterior): assento, ponto de embarque, categoria (Padrão/Oficiante, define o preço — D12), tipo de participante (Adulto/Jovem/Criança/Investidura/Selamento/Missionário de Serviço — metadado de logística, não afeta preço, D29), `funding_source` (quem custeia: membro ou um dos 3 tipos de auxílio — D30, ver spec 012 para o gate de aprovação), indicação de assento preferencial/acessibilidade (opcional), se está viajando com grupo familiar (e, se sim, quantidade e nomes, sem garantia de quarto — reaproveita a regra já definida para alojamento), e se está acompanhando alguém em investidura própria (opcional, nome do acompanhado).
- THE SYSTEM SHALL armazenar esses campos na própria `reservation`, nunca no `profile` — são específicos daquela viagem.
- 🔧 **CORRIGIDO:** IF `funding_source` diferente de `'membro'` for selecionado, THEN THE SYSTEM SHALL criar a reserva com `status = 'aguardando_auxilio'` (não `pendente` comum) e disparar a criação de um `aid_request` (spec 012) — a reserva só pode avançar para `pago_ala` depois que o `aid_request` for aprovado pelo Admin Ala.
- WHERE o membro selecionar "Criança de Colo" como tipo de participante para si mesmo, THE SYSTEM SHALL redirecionar o fluxo para o cadastro de manifesto (US-003.3) em vez de criar uma reserva com assento — crianças de colo nunca ocupam `seat_number` (D06).

## Regras de Negócio Vinculadas
`docs/DECISIONS.md`: D06 (colo), D12 (oficiante autodeclarado), D17 (reserva demonstra intenção, não garante vaga — detalhado na spec 004), D27 (auxílio com gate, corrigido), D28 (convidado suportado, corrigido), D30 (funding_source independente do preço).

## Dependências
000, 001, 002 (caravana e pontos de embarque já precisam existir).

## Perguntas em Aberto
Nenhuma.
