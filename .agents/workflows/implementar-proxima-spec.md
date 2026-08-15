---
description: Implementa a próxima spec pendente na ordem de dependência do projeto SGCT
---

## Passos

### 1. Identificar a próxima spec
- Leia `AGENTS.md` para confirmar a ordem de dependência das specs (`000` → `011`).
- Verifique em `specs/*/tasks.md` qual é a primeira spec, na ordem, que ainda tem itens não marcados como concluídos (`- [ ]`).
- Se todas as specs estiverem 100% concluídas, informe isso ao usuário e pare.

### 2. Carregar contexto obrigatório
- Leia `.specify/memory/constitution.md` na íntegra.
- Leia `docs/DECISIONS.md`.
- Leia `specs/<NNN>-<nome>/spec.md`, `plan.md` e `tasks.md` da spec identificada no passo 1.
- Leia os documentos de `docs/` referenciados no `plan.md` (tipicamente `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TESTING.md`, `SECURITY.md`).

### 3. Verificar conformidade constitucional
- Confirme que a tabela "Constitution Compliance Check" do `plan.md` está atualizada e coerente com o que será implementado.
- Se algo no `plan.md` parecer violar um artigo da constituição, **pare e avise o usuário** em vez de prosseguir ou "corrigir" silenciosamente.

### 4. Implementar as tasks em ordem
- Para cada item não concluído em `tasks.md`, na ordem em que aparecem:
  - Se a task pede teste + implementação: escreva o teste primeiro, confirme que falha, implemente, confirme que passa.
  - Marque a task como concluída (`- [x]`) no `tasks.md` só depois do teste passar.
  - Se uma task depender de uma decisão de negócio não coberta pela spec, pare e pergunte ao usuário antes de prosseguir.

### 5. Verificação final da spec
- Rode `npm run test:rls` se qualquer tabela/policy foi tocada.
- Rode `npm run test:coverage` e confirme ≥80% nos diretórios de `use-cases/` tocados.
- Confirme que o "Definition of Done" no final do `tasks.md` está satisfeito.
- Resuma ao usuário o que foi implementado e qualquer desvio ou dúvida encontrada.
