---
description: Audita o código atual do repositório contra cada artigo da constituição do SGCT
---

## Passos

### 1. Carregar a constituição
- Leia `.specify/memory/constitution.md` na íntegra.

### 2. Auditar Artigo I (Clean Architecture)
- Verifique se `src/domain/` importa algo de `src/infrastructure/` ou `src/app/` (não deveria).
- Verifique se há lógica de negócio (regras condicionais complexas, cálculo de status, validação de regra) diretamente em componentes de `src/app/` ou `src/components/` em vez de `src/use-cases/`.

### 3. Auditar Artigo II (Isolamento Multi-Tenant)
- Para cada tabela em `docs/DATABASE_SCHEMA.md`, confirme que existe `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` na migration correspondente.
- Confirme que nenhuma policy concede a `super_admin` acesso a `reservations`, `credit_ledger`, `minor_approval_forms` ou `checkins`.
- Confirme que `stake_id`/`ward_id` são preenchidos por trigger, nunca aceitos diretamente do payload de `INSERT` no código de `src/infrastructure/`.

### 4. Auditar Artigo III (Sem UPDATE direto)
- Busque no código por chamadas `.update(` fora de `src/infrastructure/` que alterem `status` de `reservations`, `credit_ledger` ou `minor_approval_forms`.

### 5. Auditar Artigo IV (TDD e Cobertura)
- Rode `npm run test:coverage` e compare com os limiares definidos em `docs/TESTING.md` seção 5.

### 6. Auditar Artigo V (Segurança) e Artigo IX (Portabilidade)
- Confirme que toda variável em `process.env.*` usada no código está documentada em `.env.example`.
- Busque por strings hardcoded que pareçam nome/slug de uma Estaca específica fora de dados de seed/teste.

### 7. Relatório final
- Liste, artigo por artigo, o status (✅ conforme / ⚠️ divergência encontrada) com o arquivo e linha da divergência, se houver.
- Não corrija nada automaticamente nesta auditoria — apenas relate. Correções entram como tasks em uma spec existente, seguindo o fluxo normal.
