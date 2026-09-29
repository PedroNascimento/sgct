# Tasks 014: Design System e Experiência Responsiva

- [x] T014.1 — Implementar tokens globais, tipografia, foco, superfícies e componentes básicos.
- [x] T014.2 — Criar componentes reutilizáveis de marca, cabeçalho, ícones e formatação visual.
- [x] T014.3 — Redesenhar entrada, login e cadastro em mobile-first.
- [x] T014.4 — Redesenhar calendário público e estados vazios/fechados.
- [x] T014.5 — Redesenhar mapa e formulário de reserva com alvos de toque e resumo claro.
- [x] T014.6 — Redesenhar Minha Conta.
- [x] T014.7 — Redesenhar calendário e validação administrativa, incluindo responsividade das tabelas.
- [x] T014.8 — Redesenhar shell e telas de Super Admin.
- [x] T014.9 — Executar testes, lint e build; corrigir regressões.
- [x] T014.10 — Inspecionar visualmente os fluxos principais em mobile e desktop.
- [x] T014.11 — Exibir sessão ativa no cabeçalho, disponibilizar Minha Conta e logout, e coletar CPF no cadastro inicial.
- [x] T014.12 — Coletar, validar e persistir o telefone de WhatsApp no cadastro inicial.

**Definition of Done:** critérios da spec atendidos, nenhuma regra de negócio alterada, testes/lint/build verdes e telas principais utilizáveis em 320 px sem rolagem horizontal indevida.

- [x] T014.13 — Estrutura única, lateral fixa/recolhível, gaveta mobile acessível e menu superior de conta.
- [x] T014.14 — Integrar áreas de membro, administração e plataforma; alternância bidirecional apenas para papéis autorizados.
- [ ] T014.15 — Refinar superfícies, formulários, tabelas e hierarquia preservando cores e tipografia.
- [ ] T014.16 — Validar interações, lint, build e responsividade.

Validação parcial: 17 testes de componentes passaram, incluindo navegação e resumo dos gráficos. Lint dos componentes alterados passou. Validação visual responsiva ainda pendente; checagem global encontra erros preexistentes no Super Admin e no formulário de equipe.

Recharts e Lucide React instalados por solicitação explícita. Gráficos integrados aos painéis da Estaca e Ala; biblioteca compartilhada de ícones migrada para Lucide.
