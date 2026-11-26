# Spec 016: Formulário de Reserva em Etapas, Documento Alternativo e Poltronas Preferenciais

**Status:** Approved for Implementation
**Constitution:** v4.0.0
**Depende de:** 001-autenticacao-rbac, 003-reservas-concorrencia, 013-convidados-interestaca, 014-design-system-ux

## Contexto e Objetivo
Alinhar a experiência de cadastro e reserva do SGCT às informações coletadas no Google Forms anterior, organizando a reserva em etapas claras e aplicando a regra operacional das poltronas preferenciais (`01, 02, 03 e 04`).

## Escopo
### Dentro do escopo
- Campos opcionais no cadastro de usuário (`/cadastro` e Edge Function `provision-user`) e em Minha Conta (`/[estaca_slug]/conta`): tipo de documento alternativo (`document_type`), número (`document_number`) e órgão expedidor (`document_issuer`).
- Exibição dos dados de documento carregados do perfil na Etapa 1 da reserva.
- Coluna numérica opcional `family_group_size` em `reservations` para informar quantas pessoas compõem o grupo familiar.
- Formulário de reserva dividido em 4 etapas navegáveis:
  1. Orientações Prévias (links de agendamento de ordenanças no Templo e portal de doações/pagamento da Igreja + nota de auxílio aprovado pelo Bispo) e Conferência dos Dados Pessoais.
  2. Escolha de Poltrona & Preferencial.
  3. Detalhes da Viagem, Categoria, Tipo de Participação e Forma de Custeio (incluindo Origem de Convidado ou Autorização de Menor).
  4. Grupo Familiar (nome, quantidade e membros), Acompanhamento de Investidura, Criança de Colo e Confirmação Final.
- Regra das Poltronas Preferenciais:
  - As poltronas preferenciais são exclusivamente `01, 02, 03 e 04`.
  - Ao marcar Preferencial, apenas as poltronas `01–04` livres podem ser selecionadas (`05–50` ficam bloqueadas).
  - Se todas as 4 poltronas (`01–04`) estiverem ocupadas, a opção Preferencial fica bloqueada/desabilitada com aviso explicativo, permitindo selecionar apenas as demais poltronas livres (`05–50`).
  - Validação equivalente no backend (`createReservation` / schema Zod).

### Fora do escopo
- Bloquear reserva caso o membro ainda não tenha feito o pagamento prévio (fluxo SGCT mantém reserva primeiro e validação Ala → Estaca conforme D17).
- Alteração de precificação (D33) ou ranking (D17).
