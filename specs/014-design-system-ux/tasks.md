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
- [ ] T014.10 — Inspecionar visualmente os fluxos principais em mobile e desktop.
- [x] T014.11 — Exibir sessão ativa no cabeçalho, disponibilizar Minha Conta e logout, e coletar CPF no cadastro inicial.
- [x] T014.12 — Coletar, validar e persistir o telefone de WhatsApp no cadastro inicial.

**Definition of Done:** critérios da spec atendidos, nenhuma regra de negócio alterada, testes/lint/build verdes e telas principais utilizáveis em 320 px sem rolagem horizontal indevida.

- [x] T014.13 — Estrutura única, lateral fixa/recolhível, gaveta mobile acessível e menu superior de conta.
- [x] T014.14 — Integrar áreas de membro, administração e plataforma; alternância bidirecional apenas para papéis autorizados.
- [x] T014.15 — Refinar superfícies, formulários, tabelas e hierarquia preservando cores e tipografia.
- [x] T014.16 — Validar interações, lint, build e responsividade.

Registro histórico da implementação visual (não é o baseline atual): 17 testes de componentes passaram, incluindo navegação e resumo dos gráficos. Lint dos componentes alterados passou. Validação visual responsiva ainda pendente; checagem global encontra erros preexistentes no Super Admin e no formulário de equipe.

Recharts e Lucide React instalados por solicitação explícita. Gráficos integrados aos painéis da Estaca e Ala; biblioteca compartilhada de ícones migrada para Lucide.
## Revalidação — 21/10/2026

Build e tipos globais passam no baseline atual; a observação histórica de erros não descreve o estado de hoje. T014.10 reaberto para matriz completa de viewport/zoom/teclado/axe (R10.1–R10.7), sem alteração de paleta/tipografia. A aprovação histórica de telas principais não comprova todas as listas e painéis.

## Correção Super Admin — 28/10/2026

- [x] T014.17 — Escrever regressões de filtros acessíveis, busca, paginação e promoção com nome longo, usando somente mocks em memória.
- [x] T014.18 — Ajustar login, formulários, listas, ações e paginação responsivos, preservando código local e regras de acesso.
- [x] T014.19 — Conferir viewports no navegador com conta existente; executar testes, lint, tipos e build. Não criar perfis, alterar permissões ou outros cadastros na verificação.

Evidência de 28/10/2026: regressões novas primeiro falharam (4 casos), depois as três suítes focadas passaram (18 testes). Suíte completa sem banco: 86 suítes/407 testes aprovados; lint, tipos e build aprovados. Login conferido em 320/390/768/1280px; Estacas e Administradores em 320–1600px, incluindo largura disponível descontando scrollbar e overflow interno das células. Busca, estado vazio, limpeza e paginação verificados no navegador; confirmações canceladas cobertas por mocks. Nenhum usuário criado, Estaca ativada/desativada ou permissão alterada no ensaio visual. O aviso preexistente de migração middleware→proxy permanece fora deste escopo. Este aceite é restrito ao Super Admin; T014.10 continua aberto para a matriz global do sistema.
