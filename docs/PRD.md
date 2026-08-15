# Product Requirements Document (PRD)
## Sistema de Gestão de Caravanas ao Templo (SGCT) - Estaca Natal
### Versão 5.0

> **Nota de origem:** esta versão incorpora regras de negócio identificadas a partir do protótipo atual em produção (Google Sites), usado hoje pela Estaca Natal para gerenciar as caravanas, além de decisões que unificaram papéis e redefiniram o escopo do módulo de alojamento. Regras novas ou que substituem premissas de versões anteriores estão sinalizadas com 🔄.

---

### 1. Visão Geral do Produto
O SGCT é uma aplicação web projetada para automatizar e organizar a logística, inscrições, check-in, alojamento e controle financeiro das caravanas ao Templo de Recife-PE realizadas pela Estaca Natal (6 Alas). O sistema substitui um protótipo atual baseado em Google Sites + formulários manuais, resolvendo o problema de concorrência na reserva de assentos, o controle financeiro em duas etapas (Membro → Ala → Estaca) e a operação logística completa da viagem (embarque, alojamento, check-in de presença).

**Escala de referência:** 6 Alas, ônibus de 50 assentos + até 5 vagas de lista de espera (55 inscrições válidas no total). Volume compatível com camadas gratuitas (Supabase, Vercel, Resend).

---

### 2. Estrutura da Aplicação
* **Site Público:** informações institucionais, regras e instruções, calendário de caravanas com valores, datas e status de vagas (Disponíveis / Confirmadas / Em Validação / Espera), aviso de privacidade (LGPD) e contato do Encarregado de Dados.
* **Área Autenticada (Membro):** login obrigatório para reserva, acompanhamento de status de pagamento, saldo/crédito, lista de espera, QR Code de check-in, upload de formulário de autorização de menor, consulta de alojamento/quarto ("Lista Confirmada") e solicitação de permuta.
* **Painel Administrativo:** acesso restrito a Admin Ala e Admin Estaca, com telas por nível de permissão — gestão de membros, aprovação de pagamento, validação semanal de transferências, aprovação de formulário de menor, dashboard global, gestão de calendário/valores/pontos de embarque, atribuição de Líder de Caravana e de Responsável pela Caravana, gestão de permutas, gestão de alojamento e relatórios financeiros.

---

### 3. Stack Tecnológico
* **Frontend/BFF:** Next.js (App Router) com React.
* **Linguagem:** TypeScript.
* **Estilização:** Tailwind CSS.
* **Backend as a Service (BaaS):** Supabase (PostgreSQL, Auth, Row Level Security, Storage, Edge Functions, `pg_cron`).
* **Hospedagem:** Vercel (free tier).
* **Notificações:** Resend (e-mail transacional, free tier — a validar em teste).
* **Leitura de QR Code:** biblioteca client-side (ex: `html5-qrcode`), com leitura offline via cache local e sincronização posterior.
* **Geração de relatórios:** exportação CSV nativa + geração de PDF (ex: `@react-pdf/renderer` ou lib equivalente) para relatórios financeiros e manifesto de passageiros.
* **Testes:** Jest e React Testing Library.
* **CI/CD:** GitHub Actions.
* **Ambiente de Desenvolvimento:** Google Antigravity IDE.

---

### 4. Padrão de Arquitetura (Clean Architecture Adaptada)
* `src/app/`: Rotas por grupo — `(public)`, `(auth)`, `(admin)`.
* `src/domain/`: Entidades core — `User`, `Caravan`, `BoardingPoint`, `Reservation`, `PassengerManifestEntry`, `SeatSwapRequest`, `WaitlistEntry`, `CaravanLeader` (papel único, cobre pré-viagem e viagem), `CheckIn`, `MinorApprovalForm`, `CreditLedger`, `FinancialReport`, `DataRetentionPolicy`.
* `src/use-cases/`: `ProcessWaitlist`, `ConfirmWardPayment`, `ValidateWeeklyTransfers`, `RecalculateCaravanRanking`, `RequestSeatSwap`, `ApproveSeatSwap`, `CheckMinimumQuorum`, `GenerateCheckInToken`, `ValidateCheckIn`, `ExpireCredits`, `ExpirePendingReservations`, `GrantExceptionalCredit`, `GenerateFinancialReport`, `PurgeExpiredMinorData`, `DeactivateInactiveAccounts`.
* `src/infrastructure/`: clientes Supabase, repositórios, cliente Resend, geração de PDF/CSV, jobs `pg_cron`.
* `src/components/`: Mapa de Assentos (layout real do ônibus), Scanner QR, Mapa de Quartos.

---

### 5. Perfis e Controle de Acesso (RBAC)
Implementado via Supabase Custom Claims e RLS:

* **Membro (Usuário Padrão):** reserva, histórico, saldo/crédito, lista de espera, solicitação de permuta.
* **Menor 12-17 anos:** 🔄 possui **login próprio** (conta Supabase Auth independente). Pode ter um **vínculo opcional** (não obrigatório) com a conta de um responsável — o vínculo não é exigido porque há jovens cujos pais não são membros da Igreja e, portanto, não se enquadram no perfil de usuário do sistema.
* **Admin Ala** (Bispo, Conselheiros, Secretário, Pres. Quórum de Élderes): gestão de membros da própria Ala, aprovação de pagamento nível 1 (`PAGO_ALA`), aprovação de formulário de menor, consulta de `NO_SHOW`, concessão excepcional de crédito, 🔄 **geração de relatórios financeiros escopados à própria Ala**. Restrição: bloqueio de autoaprovação.
* **Admin Estaca** (Pres. Estaca, Conselheiros, Sec. Estaca, Sec. Finanças): dashboard global, aprovação de repasse financeiro nível 2 (`CONFIRMADO`), 🔄 **validação semanal das transferências** (toda terça-feira, exceto na semana do embarque), 🔄 **verificação de quórum mínimo** e cancelamento de caravana, criação do 1º Admin de cada Ala, gestão de calendário/valores/pontos de embarque, atribuição do Líder de Caravana, 🔄 **mediação e registro de permutas** (junto com o Líder de Caravana), 🔄 **geração de relatórios financeiros globais (todas as Alas)**.
* **Líder de Caravana** 🔄 (permissão contextual, atribuído dentre Presidência da Estaca, Sumo Conselho, Bispos ou Presidentes de Quórum/Sociedade de Socorro da Ala que encabeça a caravana; **papel único que cobre tanto a fase pré-viagem quanto a viagem em si** — unifica o que antes era descrito separadamente como "Responsável pela Caravana"):
  * **Pré-viagem:** ponto de contato para inscrições emergenciais (segunda/terça antes do embarque), intermediação de solicitações de permuta quando não há lista de espera.
  * **Durante a viagem:** validação de embarque (ida e volta), distribuição de cartões de alojamento aos Líderes de Quarto, prestação de contas do pagamento do alojamento, resolução de ocorrências, leitura de QR Code de check-in, decisão final em conflitos de poltrona.
  * Recebe treinamento prévio do Sumo Conselheiro responsável por Templo e História da Família.
* **Líder de Quarto** 🔄 (permissão contextual, atribuída presencialmente na chegada ao Templo — não há indicação prévia no sistema, ver 6.6): recebe e supervisiona a devolução do cartão de acesso ao quarto.

---

### 6. Core Features (Casos de Uso)

#### 6.1. Site Público
* Informações institucionais, regras e instruções.
* Calendário anual de caravanas com datas, valores e status de vagas.
* Aviso de privacidade (LGPD) e contato do Encarregado de Dados.

#### 6.2. Sistema de Reservas e Concorrência
* 🔄 **Mapa de assentos fiel ao layout real do ônibus:** 50 assentos numerados em fileiras duplas (ex: 49/50, 45/46 ... 1/2), com corredor central, banheiro e posição do motorista representados visualmente.
* 🔄 **Múltiplos pontos de embarque por caravana** (ex: "Sede da Estaca" às 18:30, "Cidade Nova" às 19:30) — cada reserva deve indicar o ponto de embarque escolhido.
* 🔄 **Tabela de preços por categoria:**
  | Categoria | Valor (referência) |
  |---|---|
  | Padrão | R$ 130,00 |
  | Oficiante do Templo | R$ 117,00 |
  | Criança de Colo (até 5 anos) | Gratuito |
  * 🔄 **Decisão fechada:** a categoria "Oficiante do Templo" é **autodeclarada pelo próprio membro** no momento da reserva (sem etapa de validação administrativa prévia).
* Status inicial da reserva: `PENDENTE`.
* Suporte a inscrição de dependentes:
  * **Crianças de colo (0-5 anos):** sem assento próprio, gratuitas, registradas no manifesto de passageiros (fiscalização rodoviária). Não contam para a contagem de 50 vagas nem para a posição 51-55 da lista de espera.
  * **Menores de 12-17 anos sem responsável na caravana:** assento próprio, upload do formulário de autorização assinado, aprovação do Admin Ala.
* 🔄 **Prazo de inscrição regular:** até o domingo que antecede a caravana.
* 🔄 **Inscrição emergencial (segunda e terça-feira antes do embarque):** realizada diretamente com o **Líder de Caravana**, mediante envio do comprovante de pagamento — válida apenas se a caravana ainda não tiver sido fechada no domingo anterior.

#### 6.3. Workflow de Pagamentos e Validação
* **Etapa 1:** Membro paga pelos canais oficiais da Igreja. Admin da Ala identifica o recurso e marca como `PAGO_ALA` (equivalente ao status "Em Validação" exibido publicamente).
* **Etapa 2:** Ala transfere o valor para a conta da Estaca. Admin Estaca confirma e marca como `CONFIRMADO`.
* 🔄 **Ciclo de validação semanal:** a validação das inscrições (passagem de `PAGO_ALA` para `CONFIRMADO`) ocorre **toda terça-feira**, exceto na semana do próprio embarque (quando a validação passa a ser contínua/manual, dado o prazo curto).
* 🔄 **Modelo de reserva provisória + confirmação por ordem de transferência (decisão fechada):**
  * Ao reservar, o membro escolhe um assento específico no mapa, o que **demonstra intenção/desejo** por aquela poltrona e a torna indisponível para outros membros escolherem (trava exclusiva por assento, como hoje).
  * A **confirmação definitiva da vaga** (dentro do limite de 50 lugares) só ocorre após a Ala transferir o valor para a Estaca **e** o Secretário da Estaca validar a transferência — seguindo o ciclo semanal (terças-feiras).
  * A **posição final na lista da caravana** (quem fica nos 50 confirmados vs. quem cai na lista de espera 51-55) é recalculada a cada ciclo de validação, na ordem em que as transferências forem confirmadas — e não na ordem em que a reserva foi feita no site. Ou seja: é possível escolher um assento cedo e, mesmo assim, cair na lista de espera se a transferência da própria Ala demorar mais que a de outras Alas.
  * **Trava mínima de permanência:** mesmo que a reserva de outro membro seja confirmada mais rápido, o assento de uma reserva `PENDENTE`/`PAGO_ALA` **não pode ser liberado antecipadamente** para outra pessoa. A liberação do assento só ocorre quando os prazos já definidos se esgotarem (fechamento de domingo, checagem de quórum na terça anterior ao embarque, ou timeout de 7 dias) — nunca por simples "corrida" de confirmação entre membros.
  * 🔄 **Decisão fechada:** o recálculo de posição é **automatizado** — a cada mudança de status de uma reserva para `CONFIRMADO` (via ciclo semanal de validação), o sistema reordena a lista da caravana e reclassifica automaticamente quem permanece nos 50 confirmados e quem passa para a lista de espera (51-55), disparando notificação por e-mail ao(s) membro(s) afetado(s). O **Secretário da Estaca pode revisar o resultado do recálculo e, se necessário, avisar manualmente** o membro (canal complementar, não substitui a notificação automática).
* **Notificação de pendência:** se a inscrição não for validada, o membro é informado pelo Secretário da Estaca (ou pelo sistema, via e-mail). Caso não seja contatado, o fluxo de contato secundário é: Secretário da Ala ou Presidente do Quórum de Élderes.
* 🔄 **Quórum mínimo da caravana:** se a caravana não atingir **48 inscritos válidos** até a terça-feira anterior ao embarque, ela é **cancelada automaticamente**. Todos os inscritos ficam com **crédito na Estaca**, e são **automaticamente transferidos** (rollover) para a próxima caravana disponível. O aviso deve ser enviado com antecedência.

#### 6.4. Cancelamento, Permuta e Lista de Espera
🔄 Esta seção substitui o modelo anterior de "desistência com aviso prévio gera crédito automaticamente". O processo real não permite cancelamento direto pelo membro:

* **Cancelamento direto pelo sistema não é permitido.** Se o membro não puder mais ir, ele deve buscar uma solução por dois caminhos:
  1. **Lista de espera existente:** o membro é substituído automaticamente pelo primeiro da lista de espera, e o valor já pago vira **crédito na Estaca** para uso em caravana futura.
  2. **Sem lista de espera → Permuta:** o membro deve encontrar, por conta própria, uma pessoa para assumir sua vaga.
     * A pessoa que assume a vaga paga o valor diretamente ao membro original (fora do sistema).
     * 🔄 O membro original informa a permuta ao **Líder de Caravana ou a um Admin da Estaca** (ambos habilitados a mediar e registrar a permuta no sistema), que atualiza o cadastro — a pessoa substituta **não se inscreve diretamente pelo site**.
     * Se não for encontrado ninguém para a permuta, **o valor pago é perdido** (não vira crédito, não pode ser usado em outra caravana).
* **Prazo para permutas pré-embarque:** definido por caravana (ex: "Último dia para Permutas").
* 🔄 **Permutas no dia do embarque:** permitidas até **6 permutas** no momento do embarque em si, seguindo a mesma regra (quem assume paga o valor ao titular original; o valor original não vira crédito).
* **Lista de espera:** posições 51 a 55 (sem contar crianças de colo). Membros de outras Estacas entram direto na lista de espera e só embarcam se sobrarem vagas não preenchidas por membros da Estaca Natal.
* Membros da lista de espera que não embarcarem ficam com **crédito na Estaca** para outra caravana.
* **Expiração de crédito:** 12 meses após a geração, controlada via `pg_cron` (`ExpireCredits`), com notificação prévia.

#### 6.5. Check-in de Embarque via QR Code
* QR Code com token assinado gerado apenas após `CONFIRMADO`.
* Leitura pelo Líder de Caravana (ou Admin Estaca presente), com suporte offline e sincronização posterior por idempotência.
* Confirmação de presença atualiza a reserva para `PRESENTE`. Líder de Caravana verifica embarque tanto na ida quanto na volta.
* **Manifesto de passageiros** consolidado por caravana (incluindo crianças de colo) para fiscalização rodoviária.
* **No-show sem aviso prévio:** status `NO_SHOW`, sem crédito automático — tratado localmente na Ala, com opção de concessão manual excepcional de crédito pelo Admin Ala (log de auditoria).
* 🔄 **Poltronas:** o membro deve se acomodar na poltrona escolhida na inscrição; a poltrona de ida é a mesma da volta; troca de poltrona é permitida entre dois membros que concordem mutuamente; em caso de conflito, o **Líder de Caravana decide** e sua decisão deve ser respeitada.

#### 6.6. Alojamento 🔄 (módulo majoritariamente operacional/presencial — fora do escopo digital do sistema)
* 🔄 **Decisão fechada:** a atribuição de quartos, chaves e cartões de acesso **não é conhecida com antecedência** — essa informação só existe fisicamente no momento da chegada dos membros a Recife, definida no local pela equipe do Templo. Por isso, o sistema **não terá** uma tela de consulta antecipada de quarto ("Lista Confirmada" de alojamento fica fora do escopo do MVP).
* O que **permanece no escopo do sistema**, por ser coletável antes da viagem:
  * **Campo de agrupamento familiar** no formulário de inscrição, indicando quais membros desejam ficar no mesmo quarto (até 6 pessoas da mesma família) — essa preferência serve apenas como **informação de apoio** para a equipe que fará a distribuição física no dia, não como reserva confirmada de quarto.
* O restante do processo de alojamento é inteiramente presencial e manual, conduzido pelo Líder de Caravana e pelos Líderes de Quarto (atribuídos no local):
  * Não é permitida troca de quarto após a chegada ao Templo; limite de 6 pessoas por quarto; proibido mover colchões entre quartos.
  * Cartões de acesso: validade até às 17h, entregues pelo Líder de Quarto no saguão, devolvidos na caixinha ao lado do elevador ou diretamente ao Líder de Quarto, que supervisiona a devolução.
  * Prestação de contas do pagamento do alojamento: o Líder de Caravana presta contas na recepção do alojamento do Templo, entrega o comprovante recebido do Sumo Conselheiro responsável por Templo e História da Família, e repassa o recibo ao Secretário da Estaca — fluxo mantido fora do sistema (WhatsApp), sem alteração digital nesta versão.

#### 6.7. Notificações por E-mail
Via Resend (free tier). Eventos: confirmação de reserva + QR Code, alerta de validação pendente, promoção de fila de espera, confirmação de `PAGO_ALA`/`CONFIRMADO`, cancelamento de reserva ou de caravana inteira (quórum não atingido), expiração de crédito, aprovação/reprovação de formulário de menor, atribuição de quarto/alojamento.

#### 6.8. Relatórios Financeiros 🔄
* **Admin Ala:** gera e exporta (CSV/PDF) relatório financeiro **escopado à própria Ala** — valores arrecadados, repassados e pendentes por caravana.
* **Admin Estaca:** gera e exporta relatório financeiro **consolidado de todas as Alas**, com filtro por caravana/período, para prestação de contas.

#### 6.9. Dados de Menores e LGPD
* **0-5 anos (colo):** vinculados à reserva do responsável, sem conta própria, sem pagamento, presentes apenas no manifesto.
* **12-17 anos sem responsável presente:** conta própria (login independente), assento próprio, upload de formulário de autorização assinado pelos pais, aprovação do Admin Ala. Vínculo com conta de um responsável é **opcional**, não obrigatório.
* Consentimento explícito do responsável legal no cadastro do menor.
* RLS restringindo acesso aos dados/documentos de menores apenas a Admin Ala/Estaca com permissão relevante.

---

### 7. Política de Retenção de Dados (LGPD) 🔄

| Tipo de dado | Prazo de retenção sugerido | Ação ao expirar |
|---|---|---|
| Dados cadastrais e financeiros da reserva (para fins contábeis/fiscais) | 5 anos após a viagem | Anonimização (mantém histórico agregado sem PII) |
| Documento de autorização de menor (upload) | 90 dias após a conclusão da viagem, salvo pendência/disputa em aberto | Exclusão definitiva do Storage |
| Dados de crianças de colo no manifesto | 90 dias após a conclusão da viagem | Exclusão definitiva |
| Logs de acesso a documentos sensíveis (auditoria) | 12 meses | Exclusão definitiva |
| Conta de usuário inativa (sem login) | 🔄 24 meses de inatividade (decisão fechada) | 🔄 **Inativação automática** da conta (sem exclusão de dados) — o usuário pode reativar mediante novo login/contato |

**Requisitos de implementação:**
* Consentimento específico e destacado (não genérico) para tratamento de dados de menores, no momento do cadastro.
* Mecanismo de solicitação de acesso, correção ou exclusão de dados pelo titular/responsável (Art. 18 LGPD).
* Job `pg_cron` (`PurgeExpiredMinorData`) para expurgo automático de documentos e dados vencidos, com log de auditoria da própria exclusão.
* Contato do Encarregado de Dados (DPO) visível no site público.
* Aviso de privacidade no site público, distinto dos Termos de Uso.
* Documentos sensíveis em bucket privado do Supabase Storage, com RLS e log de acesso (quem visualizou, quando).

---

### 8. Requisitos Não-Funcionais
* **Pipeline CI/CD (GitHub Actions):** Linter, Testes Unitários (Jest), Deploy (Vercel).
* **Responsividade:** mobile-first, com atenção à tela de leitura de QR Code em campo.
* **Performance:** SSR/SSG do Next.js na página pública e no calendário.
* **Custo:** stack integralmente em camadas gratuitas, compatível com o volume (6 Alas × 50 assentos + 5 espera).
* **Disponibilidade offline parcial:** check-in funcional sem conexão, com sincronização posterior.
* **Segurança documental:** uploads sensíveis em bucket privado com RLS e log de acesso.
* **Auditoria:** ações administrativas sensíveis (aprovação de pagamento, concessão excepcional de crédito, aprovação de menor, exclusão de dados) devem gerar log de auditoria (quem, quando, o quê).

---

### 9. Status das Decisões de Negócio
Todos os pontos em aberto das versões anteriores foram fechados nesta versão. O PRD está pronto para avançar para a modelagem do schema de banco de dados (Supabase) e definição das políticas de RLS.
