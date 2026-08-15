# Regras do Projeto SGCT (sempre ativas)

> Este arquivo é lido automaticamente pelo Antigravity ao abrir o workspace. Ele espelha (não substitui) `.specify/memory/constitution.md` — em caso de qualquer divergência entre os dois, a constituição vale, e este arquivo deve ser corrigido para voltar a espelhá-la.

## Antes de qualquer tarefa
1. Leia `.specify/memory/constitution.md` por completo.
2. Leia `docs/DECISIONS.md` — não repita uma pergunta cuja resposta já está lá.
3. Identifique qual `specs/NNN-*/` é relevante para a tarefa pedida. Se a tarefa não corresponder a nenhuma spec existente, **pare e pergunte** antes de criar código — não infira uma spec nova sozinho.

## Regras que NUNCA podem ser violadas nesta sessão
- **Isolamento multi-tenant (Artigo II):** toda tabela sensível tem `stake_id` e `ward_id`, ambos derivados por trigger `BEFORE INSERT`, nunca aceitos do payload do client. `super_admin` nunca recebe policy de acesso a `reservations`, `credit_ledger`, `minor_approval_forms` ou `checkins`.
- **Sem UPDATE direto do client (Artigo III):** toda transição de status de reserva/pagamento/crédito passa por uma Server Action que chama o use-case correspondente.
- **TDD obrigatório (Artigo IV):** para qualquer arquivo novo em `src/use-cases/`, escreva o teste primeiro, rode e confirme que falha, só então implemente. Nunca gere implementação e teste no mesmo passo sem esse ciclo.
- **Nenhum segredo hardcoded (Artigo V/IX):** toda variável de configuração nova entra em `.env.example` no mesmo commit em que é introduzida no código.
- **Nenhuma regra de negócio inventada (Artigo VII):** se a tarefa exigir uma decisão de negócio que não está em nenhum `spec.md`, pare e pergunte ao usuário.

## Ao final de qualquer tarefa que toque schema/RLS
- Rode `npm run test:rls` e confirme que está verde antes de considerar a tarefa concluída.
- Se uma tabela nova foi criada, confirme contra o checklist da seção 10 de `docs/DATABASE_SCHEMA.md`.

## Ao final de qualquer tarefa que toque `src/use-cases/`
- Rode `npm run test:coverage` e confirme ≥80% no diretório tocado.

## Convenção de commits
Prefixe commits com o número da spec sendo implementada, ex: `[004] Implementa ConfirmWardPayment com bloqueio de autoaprovação`.
