# Plan 014: Design System e Experiência Responsiva

**Spec de referência:** `specs/014-design-system-ux/spec.md`
**Decisão visual:** `DESIGN.md`

## Verificação de Conformidade com a Constituição

| Artigo | Conformidade | Observação |
|---|---|---|
| I — Clean Architecture | ✅ | Mudanças ficam em `app/` e `components/`; domínio e use-cases permanecem intactos. |
| II — Isolamento Multi-Tenant | ✅ | Nenhuma query, policy ou identificação de tenant é alterada. |
| III — Sem UPDATE direto | ✅ | A camada visual reutiliza Server Actions existentes. |
| IV — TDD 80%+ | ✅ | Nenhum use-case novo; os use-cases de cadastro existentes ganham cobertura para CPF e telefone, além da regressão completa. |
| V — Segurança por padrão | ✅ | Nenhum segredo ou novo endpoint. CPF e telefone são normalizados e validados antes da persistência. |
| VI — LGPD | ✅ | CPF e telefone utilizam campos de perfil já previstos e permanecem somente nos contextos autorizados existentes. |
| VII — Nenhuma regra inventada | ✅ | Microcopy e estados mapeiam somente regras e status já aprovados. |
| VIII — Fluxo linear | ✅ | Spec, plan e tasks foram criados antes da alteração da interface. |
| IX — Portabilidade | ✅ | Tokens e textos não fixam Estaca; nome e slug continuam vindos do contexto resolvido. |
| X — Governança | ✅ | Constituição não é alterada. |

## Abordagem Técnica

1. Expandir `tailwind.config.ts` com tokens semânticos do `DESIGN.md`.
2. Implementar variáveis, base tipográfica, foco, formulários e classes de componente em `globals.css`.
3. Criar componentes de apresentação sem regra de negócio: marca, cabeçalho público, cabeçalho de página, ícones e formatadores.
4. Aplicar os componentes e tokens às telas públicas e autenticadas.
5. Adaptar mapas, formulários longos, painéis e tabelas para mobile.
6. Validar testes, lint, build e inspeção visual nos viewports definidos.
7. Completar o cadastro inicial com CPF e telefone de WhatsApp, usando os campos já existentes em `profiles` e validação em todas as fronteiras.

## Decisões Técnicas

- Fonte principal: Source Sans 3 quando disponível, seguida por fontes de sistema. Não haverá download de fonte em runtime nem redistribuição de Ensign.
- SVGs simples e próprios serão usados para ícones essenciais, evitando emojis e dependências adicionais.
- Tailwind continuará sendo a tecnologia de composição; classes semânticas globais reduzirão repetição e divergência.
- As ações de cadastro existentes serão estendidas somente para coletar CPF e telefone já previstos no perfil.
- Tabelas críticas receberão visualização responsiva por cartões, mantendo tabela para desktop.

## Arquivos Principais

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/components/ui/*`
- rotas em `src/app/(public)`, `src/app/(auth)`, `src/app/(admin)` e `src/app/(super-admin)`
- componentes em `src/components/reservation`

## Riscos e Mitigações

- **Regressão funcional:** manter props, nomes de campos e Server Actions; executar suíte completa.
- **Quebra mobile:** validar em 320, 360, 390, 768 e 1280 px.
- **Contraste inconsistente:** usar somente tokens semânticos com pares registrados no `DESIGN.md`.
- **Fonte indisponível:** fallback de sistema preserva legibilidade e layout.
