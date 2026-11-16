# Spec 015: Painel Financeiro de Controle de Repasses e Créditos

**Status:** Approved for Planning
**Constitution:** v4.0.0
**Depende de:** 004-workflow-pagamento-validacao, 005-fila-espera-permuta-credito, 009-relatorios-lgpd, 012-auxilio-financeiro, 013-convidados-interestaca, 014-design-system-ux

## Contexto e Objetivo
Atualmente, o acompanhamento de quanto cada Ala arrecadou e precisa transferir para a Estaca é controlado manualmente em planilhas externas do Google Sheets (agrupadas por Ala e "Outra Estaca", listando data/hora de inscrição, nome completo, forma de pagamento, valor devido e total geral).

Esta spec integra esse controle diretamente nos painéis administrativos do SGCT:
- **Painel Administrativo da Estaca:** registra quanto cada Ala deve transferir para a Estaca, quanto já foi transferido/confirmado e quanto ainda falta, além do registro detalhado por caravana (inscritos, valores, formas de pagamento) e consulta de créditos em caso de cancelamento/promoção.
- **Painel Administrativo da Ala:** oferece a mesma visão detalhada escopada à própria Ala, permitindo à liderança local acompanhar pagamentos recebidos dos membros, valores já transferidos e validados pela Estaca, saldo pendente de repasse e créditos dos membros da Ala.

Os dados do painel são atualizados automaticamente conforme o fluxo operacional já existente: confirmação de pagamento do membro pela Ala (`pendente → pago_ala`), transferência e confirmação de recebimento pela Estaca (`pago_ala → confirmado`, além de `guest_transfer_confirmations` para convidados), e registros de crédito em `credit_ledger`.

## Escopo

### Dentro do escopo
- **Painel Financeiro da Estaca (`/[estaca_slug]/estaca/relatorios`):**
  - Seletor de caravana da Estaca.
  - **Resumo de Transferências por Ala (+ Outra Estaca):**
    - Total devido pela Ala na caravana (soma das reservas ativas/pagas vinculadas à caravana).
    - Total já pago na Ala aguardando repasse/confirmação da Estaca (`pago_ala`).
    - Total já transferido e confirmado pela Estaca (`confirmado` e `presente`; e para `Outra Estaca`, repasses inter-Estaca confirmados).
    - Saldo ainda pendente com os membros (`pendente`, `aguardando_auxilio`, `aguardando_transferencia_interestaca`) e saldo total restante a transferir para a Estaca.
  - **Registro Financeiro Detalhado por Caravana (visão equivalente à planilha):**
    - Agrupamento por Ala da Estaca + grupo separado **Outra Estaca** (convidados inter-Estaca, visível apenas ao Admin Estaca).
    - Para cada inscrito: data/hora da inscrição (`created_at`), nome completo, forma de pagamento (`funding_source` em rótulo legível), valor devido (`payment_amount`), status financeiro/da reserva e subtotal por Ala + total geral da caravana.
  - **Consulta de Créditos (Cancelamentos / Lista de Espera / Concessões):**
    - Listagem e filtro de créditos (`credit_ledger`) na Estaca (por Ala, status `active` / `used` / `expired` e busca por nome), exibindo membro, Ala, valor do crédito, origem (`caravan_cancelled`, `waitlist_promotion`, `exceptional_grant`), reserva/caravana de origem, data de criação e validade (`expires_at`).
  - Exportação CSV e PDF mantendo os dados consolidados e detalhados.
- **Painel Financeiro da Ala (`/[estaca_slug]/ala/relatorios`):**
  - Seletor de caravana da Estaca.
  - Cards e resumo financeiro **exclusivos da própria Ala** (`ward_id`/`stake_id`):
    - Total devido pela Ala na caravana, total pago na Ala (`pago_ala`), total já transferido e confirmado pela Estaca (`confirmado`/`presente`) e quanto ainda falta transferir.
  - Tabela/lista detalhada dos inscritos da própria Ala na caravana (data/hora de inscrição, nome completo, forma de pagamento, valor devido, status e total da Ala).
  - Consulta de créditos dos membros da própria Ala (`credit_ledger` escopado por `ward_id`).
  - Exportação CSV e PDF escopada à própria Ala.

### Fora do escopo
- Conciliação bancária automática ou leitura de comprovantes PIX via API externa.
- Alteração das regras de precificação (D33), validade de créditos (D08) ou ordem de confirmação (D17).
- Exposição de dados de outras Alas ou de convidados inter-Estaca (`Outra Estaca`) no painel do Admin Ala (Constituição Artigo II.d).
- Acesso de `super_admin` a qualquer painel financeiro de Estaca ou Ala (Constituição Artigo II.f).
- Nova migração de tabela se os dados existentes em `reservations`, `wards`, `caravans`, `credit_ledger` e `guest_transfer_confirmations` já atenderem integralmente aos requisitos.

## Histórias de Usuário

### US-015.1: Controle de transferências por Ala no painel da Estaca
Como Admin Estaca, quero visualizar quanto cada Ala deve transferir para a Estaca, quanto já foi transferido/confirmado e quanto ainda falta em cada caravana, para eliminar o controle manual em planilhas do Google.

**Critérios de Aceite (EARS):**
- WHEN o Admin Estaca acessa o painel financeiro e seleciona uma caravana da própria `stake_id`, THE SYSTEM SHALL exibir, para cada Ala da Estaca (e em linha/seção separada para `Outra Estaca` quando houver convidados), o total devido, o total já transferido/confirmado pela Estaca, o valor já pago na Ala aguardando validação/repasse e o saldo que ainda falta transferir.
- WHEN uma Ala confirma o pagamento de um membro (`pendente → pago_ala`) ou o Admin Estaca confirma o recebimento da transferência (`pago_ala → confirmado`), THE SYSTEM SHALL refletir imediatamente os novos totais no painel ao recarregar os dados.
- THE SYSTEM SHALL NOT exibir dados de nenhuma outra Estaca (`stake_id` diferente).

### US-015.2: Registro financeiro detalhado por caravana
Como Admin Estaca, quero consultar o registro completo dos inscritos de uma caravana agrupados por Ala (e Outra Estaca), com data de inscrição, nome completo, forma de pagamento e valor devido, para auditar cada repasse recebido.

**Critérios de Aceite (EARS):**
- WHEN o Admin Estaca visualiza o registro financeiro de uma caravana, THE SYSTEM SHALL listar os inscritos agrupados por Ala (e seção `Outra Estaca` para `funding_source = 'convidado_transferencia_interestaca'`), mostrando data/hora da inscrição, nome completo, forma de pagamento legível, valor devido, status atual e total por grupo.
- THE SYSTEM SHALL permitir filtrar por Ala ou buscar por nome do participante.

### US-015.3: Consulta de créditos em caso de cancelamento
Como Admin Estaca ou Admin Ala, quero consultar quem possui crédito ativo, utilizado ou expirado decorrente de cancelamento ou promoção de fila de espera, para orientar membros e fechar a prestação de contas.

**Critérios de Aceite (EARS):**
- WHEN o Admin Estaca acessa a seção de créditos no painel financeiro, THE SYSTEM SHALL listar os registros de `credit_ledger` da própria `stake_id` com filtro por Ala, status (`active`, `used`, `expired`) e busca por nome, exibindo valor, origem, validade e reserva de origem.
- WHEN o Admin Ala acessa a seção de créditos no painel financeiro da Ala, THE SYSTEM SHALL listar exclusivamente os registros de `credit_ledger` da própria `ward_id` e `stake_id`.

### US-015.4: Painel financeiro detalhado no painel administrativo da Ala
Como Admin Ala, quero ter um painel financeiro detalhado da minha Ala com os valores arrecadados, transferidos para a Estaca, pendentes de repasse, lista de inscritos e créditos, para controlar a prestação de contas local sem depender de planilhas.

**Critérios de Aceite (EARS):**
- WHEN o Admin Ala acessa o painel financeiro da Ala e seleciona uma caravana, THE SYSTEM SHALL exibir os indicadores financeiros da própria `ward_id` (total devido, pago na Ala aguardando repasse, transferido/confirmado pela Estaca e falta transferir), a lista detalhada de inscritos da Ala e os créditos da Ala.
- THE SYSTEM SHALL NOT exibir inscritos, totais ou créditos de outras Alas ou de convidados inter-Estaca (`ward_id IS NULL`).

## Regras de Negócio Vinculadas
- `docs/DECISIONS.md`: D17 (fluxo de validação Ala → Estaca), D19 (relatórios escopados por papel), D28 (convidados inter-Estaca visíveis apenas ao Admin Estaca), D30 (`funding_source` não muda preço), D33 (precificação com/sem pernoite), D34 (substituição da planilha Google Sheets pelo painel financeiro).
- Constituição v4.0.0: Artigo I (Clean Architecture), Artigo II (Isolamento Estaca > Ala e exceção delimitada de convidados), Artigo III (transições de status apenas via use-cases/Server Actions), Artigo IV (TDD), Artigo IX (agnóstico de tenant).

## Dependências
004, 005, 009, 012, 013, 014.

## Perguntas em Aberto
Nenhuma.
