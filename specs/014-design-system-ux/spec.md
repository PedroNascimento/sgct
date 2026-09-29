# Spec 014: Design System e Experiência Responsiva

**Status:** Approved for Implementation
**Constitution:** v3.0.0
**Depende de:** 000-004 implementadas
**Referência de produto:** `DESIGN.md`

## Contexto e Objetivo

Uniformizar a interface já implementada do SGCT e torná-la clara, acessível e confortável em celulares, especialmente para membros com pouca familiaridade tecnológica. Esta spec traduz o `DESIGN.md` em critérios verificáveis sem alterar regras de negócio.

## Escopo

### Dentro do escopo

- Tokens de cor, tipografia, espaço, borda, foco e elevação.
- Componentes visuais reutilizáveis para ações, campos, cartões, alertas e estados.
- Shells consistentes para áreas pública, autenticada, administrativa e Super Admin.
- Redesign responsivo das telas existentes das specs 000-004.
- Formatação humana de datas, horários, valores e estados já existentes.
- Navegação, foco, contraste, alvos de toque e reflow compatíveis com WCAG 2.2 AA.
- Estados existentes de carregamento, erro, vazio, sucesso e desabilitado com apresentação consistente.
- Estado autenticado visível, acesso ao perfil e encerramento de sessão no cabeçalho público.
- Coleta de CPF no cadastro inicial para evitar bloqueio imediato no primeiro fluxo de reserva.

### Fora do escopo

- Alterar regras de reserva, pagamento, ranking, tenant ou RBAC.
- Criar novas etapas de negócio, novas tabelas ou migrations.
- Implementar funcionalidades previstas nas specs 005-013.
- Reutilizar fontes, marcas ou ativos proprietários do site de referência.
- Criar modo escuro nesta fase.

## Histórias de Usuário

### US-014.1: Navegação clara no celular

Como membro com pouca familiaridade tecnológica, quero identificar onde estou e qual é a ação principal, para concluir a inscrição sem ajuda.

**Critérios de Aceite:**

- WHEN uma tela pública for aberta entre 320 px e 430 px, THE SYSTEM SHALL organizar o conteúdo em uma coluna, sem rolagem horizontal.
- WHEN houver uma ação principal, THE SYSTEM SHALL apresentá-la com rótulo descritivo e alvo mínimo de 48 px.
- WHEN o usuário navegar para um fluxo interno, THE SYSTEM SHALL oferecer retorno textual ao contexto anterior.

### US-014.2: Formulários legíveis e recuperáveis

Como participante, quero compreender cada campo e cada erro, para corrigir meus dados com segurança.

**Critérios de Aceite:**

- WHEN um campo for exibido, THE SYSTEM SHALL manter rótulo visível e associação semântica.
- WHEN uma conta for criada, THE SYSTEM SHALL solicitar CPF e telefone de WhatsApp com DDD, explicar o formato esperado e validar os dados antes da persistência.
- WHEN ocorrer erro, THE SYSTEM SHALL exibir mensagem textual com cor e região de alerta, sem depender apenas de cor.
- WHILE uma ação estiver sendo processada, THE SYSTEM SHALL manter feedback textual e impedir envio duplicado.

### US-014.3: Calendário e reserva compreensíveis

Como membro, quero entender data, disponibilidade, valor e situação da viagem antes de reservar.

**Critérios de Aceite:**

- WHEN uma caravana for listada, THE SYSTEM SHALL apresentar datas em português, disponibilidade, contribuição, embarques, prazo e ação aplicável em hierarquia clara.
- WHEN o mapa de assentos for exibido, THE SYSTEM SHALL usar alvos acessíveis, legenda textual e estados anunciáveis.
- WHEN a reserva for enviada, THE SYSTEM SHALL diferenciar reserva de confirmação conforme as regras existentes.

### US-014.4: Operação administrativa responsiva

Como administrador, quero realizar tarefas essenciais pelo celular, para operar o sistema sem depender de computador.

**Critérios de Aceite:**

- WHEN dados tabulares forem vistos em tela estreita, THE SYSTEM SHALL manter identificação, valores e ação disponíveis sem rolagem horizontal obrigatória.
- WHEN o contexto administrativo for exibido, THE SYSTEM SHALL distingui-lo visualmente e manter navegação acessível.

### US-014.5: Acessibilidade consistente

Como pessoa que usa teclado, zoom ou tecnologia assistiva, quero concluir os mesmos fluxos sem perda de informação.

**Critérios de Aceite:**

- THE SYSTEM SHALL possuir foco visível, contraste AA e semântica apropriada.
- WHEN `prefers-reduced-motion` estiver ativo, THE SYSTEM SHALL reduzir transições não essenciais.
- WHEN a página estiver em 200% de zoom, THE SYSTEM SHALL preservar conteúdo e funções principais.

## Regras Vinculadas

### US-014.6: Estrutura unificada de navegação

- A área autenticada deve ter uma única lateral fixa no desktop, recolhível por botão, com preferência local persistida.
- No celular a navegação deve abrir como gaveta, fechar com Escape, controlar foco e não cobrir permanentemente o conteúdo.
- O canto superior direito deve reunir identificação, acesso ao perfil, saída e alternância entre visão de membro e administração para Admin Ala/Estaca.
- A alternância deve funcionar nos dois sentidos sem modificar role, claims ou permissões. Super Admin permanece limitado à gestão da plataforma.
- Todas as telas existentes devem compartilhar superfícies, espaçamento e controles refinados, preservando integralmente paleta e família tipográfica do DESIGN.md.


- `DESIGN.md` é a fonte de decisão visual.
- Specs 000-004 e `docs/DECISIONS.md` continuam sendo a fonte exclusiva das regras de negócio.
- A identidade é própria do SGCT e não implica endosso oficial da Igreja.

## Perguntas em Aberto

Nenhuma.
