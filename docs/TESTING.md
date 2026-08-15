# Estratégia de Testes — SGCT
### 🔄 v2 — inclui isolamento cross-*stake* (ver seção 3.6bis)

> Padrão do projeto: **TDD obrigatório**, cobertura mínima de **80%** em `src/domain/` e `src/use-cases/` (gate de CI — build quebra abaixo disso). Este documento define o que testar, como testar e quais cenários são inegociáveis dado que o sistema lida com dinheiro, concorrência e dados de menores.

## 1. Pirâmide de Testes

```
                    ▲
                   /E2E\              poucos, só fluxos críticos ponta a ponta
                  /------\            (Playwright — opcional, fase posterior)
                 /  Integ. \          Supabase local + RLS real (não mockado)
                /------------\
               /     Unit      \      maioria dos testes — use-cases, domain,
              /------------------\    componentes puros (Jest + RTL)
```

| Nível | Ferramenta | O que cobre | Roda em |
|---|---|---|---|
| Unitário | Jest | `domain/`, `use-cases/` (com repositórios mockados) | todo commit (`npm run test`) |
| Integração | Jest + Supabase local (Docker) | Repositórios reais, políticas RLS, migrations | CI, antes do merge (`npm run test:integration`) |
| RLS dedicado | Jest + Supabase local | Isolamento multi-tenant, tentativas de vazamento cross-Ala | CI, obrigatório em qualquer PR que toque schema (`npm run test:rls`) |
| E2E | Playwright (fase 2) | Fluxo completo: reserva → pagamento → check-in | Antes de releases maiores |

## 2. Fluxo TDD Esperado do Agente (Antigravity)

Para toda funcionalidade nova em `use-cases/`:
1. Ler a regra de negócio correspondente em `docs/PRD.md`.
2. Escrever o teste que descreve o comportamento esperado (`describe`/`it`), incluindo casos de borda e o caso de falha.
3. Rodar o teste e confirmar que falha (red).
4. Implementar o mínimo necessário para passar (green).
5. Refatorar mantendo os testes verdes.
6. Se a mudança tocou uma tabela/policy, rodar `npm run test:rls` antes de considerar a tarefa concluída.

**Não implementar código de produção sem um teste falhando primeiro.** Se o agente gerar código e só depois escrever o teste, isso deve ser sinalizado como desvio do padrão do projeto.

## 3. Cenários de Teste Obrigatórios por Módulo

### 3.1. Reservas e Concorrência
- Dois usuários tentando reservar o mesmo assento simultaneamente → só um sucesso (teste de race condition, não apenas de regra de negócio isolada — usar chamadas paralelas reais contra o banco local).
- Reserva além do `seat_limit` (50) → deve ir para lista de espera (51-55), nunca falhar silenciosamente.
- Reserva de 6ª pessoa na lista de espera (56ª posição) → deve ser rejeitada/informada, não criar registro "flutuante".
- Categoria "Oficiante" autodeclarada aplica o preço correto sem validação administrativa bloqueante.

### 3.2. Workflow de Pagamento
- `ConfirmWardPayment` por um Admin Ala tentando confirmar o próprio pagamento → bloqueado.
- `ConfirmWardPayment` por Admin Ala de outra Ala → bloqueado (RLS + regra de negócio).
- `RecalculateCaravanRanking`: reserva criada por último mas confirmada primeiro (transferência mais rápida) deve ficar à frente na lista de quem fica nos 50 confirmados.
- Recalculo após ultrapassar 50 confirmados → excedente vai para `lista_espera`, dispara notificação.
- Ciclo de validação não roda na semana do embarque (mockar data e confirmar que o job não dispara).

### 3.3. Fila de Espera, Permuta e Crédito
- Promoção da lista de espera gera crédito para quem saiu e reserva `CONFIRMADO` para quem entrou, atomicamente (nenhum estado intermediário inconsistente).
- Permuta aprovada: reserva original perde vínculo com titular original, sem gerar crédito.
- Sem lista de espera e sem permuta: reserva vai para `cancelada_sem_credito`, e nenhuma linha é criada em `credit_ledger`.
- Permuta no dia do embarque: a 7ª tentativa (acima do limite de 6) deve ser rejeitada.
- Crédito expira exatamente aos 12 meses (teste com data congelada/mockada, não `Date.now()` real).

### 3.4. Quórum e Cancelamento de Caravana
- Caravana com 47 confirmados na terça anterior ao embarque → cancelada automaticamente.
- Caravana com exatamente 48 → **não** cancelada (teste de limite exato, off-by-one é o erro mais comum aqui).
- Cancelamento gera crédito para todos os inscritos e rollover automático para a próxima caravana disponível (testar que a nova reserva criada tem o mesmo `user_id`, `ward_id`, categoria, mas novo `caravan_id`).

### 3.5. Check-in QR Code
- Token gerado antes de `CONFIRMADO` → deve ser impossível (nem sequer deve existir função que gere token para outro status).
- Token expirado ou assinatura inválida → `ValidateCheckIn` rejeita.
- Mesmo `reservation_id` lido duas vezes (uma offline, uma online, depois sincronizado) → apenas um registro em `checkins` por direção (`ida`/`volta`) — testar o merge de sincronização diretamente, não só o caminho feliz.
- Check-in de "volta" sem check-in de "ida" prévio → permitido ou bloqueado? (Confirmar regra com Pedro se não estiver clara — na dúvida, permitir e logar para auditoria, já que a segurança física da viagem não pode depender só do sistema.)

### 3.6bis. 🔄 Isolamento Cross-*Stake* (o teste mais crítico do sistema)
> Ver Artigo II da constituição e Decisão D26 em `docs/DECISIONS.md`. Todo teste de RLS deste projeto usa fixtures com **no mínimo 2 Estacas distintas** — não apenas 2 Alas da mesma Estaca — porque o vazamento entre Estacas é o cenário de maior severidade do sistema.
- Admin Estaca da Estaca A: `SELECT`/`INSERT`/`UPDATE` em qualquer tabela da Estaca B → vazio/bloqueado.
- `super_admin`: tentativa de `SELECT` em `reservations`, `credit_ledger` ou `minor_approval_forms` de **qualquer** Estaca → vazio (confirma o least privilege do papel — `super_admin` não é "admin de tudo").
- Forjar `stake_id` no payload de `INSERT` de uma reserva → o valor gravado deve ser o derivado por trigger a partir da `caravan_id`/`user_id`, nunca o valor forjado enviado pelo client (teste inspeciona a linha gravada, não apenas o código de resposta).
- Middleware: usuário autenticado da Estaca A tentando acessar `/(admin)/[slug-da-estaca-B]/...` → 403, mesmo com sessão válida (checagem redundante com a RLS, mas testada separadamente por ser uma camada distinta).

### 3.6ter. Isolamento Cross-Ala (dentro da mesma Estaca)
Para **cada** tabela sensível, o mínimo de testes é:
- Admin Ala da Ala A: `SELECT` em dado da Ala B → resultado vazio.
- Admin Ala da Ala A: `INSERT`/`UPDATE` forçando `ward_id` da Ala B → bloqueado pela policy `with check`.
- Membro: `SELECT` em reserva de outro membro → vazio.
- Membro: `UPDATE` direto de `status` da própria reserva (tentando pular a Server Action) → bloqueado.
- `v_seat_occupancy`: consulta retorna **apenas** `stake_id`, `caravan_id`, `seat_number`, `occupancy_status` — teste de schema da resposta, não só de conteúdo, para pegar regressões que exponham coluna nova sem querer.
- Tentativa de acesso a Storage (`minor-forms`) por Admin Ala de Ala diferente da pasta → bloqueado.

### 3.7. LGPD / Retenção
- `PurgeExpiredMinorData`: documento de menor com 91 dias pós-viagem → removido do Storage e da tabela.
- Documento com 89 dias → **não** removido (teste de limite).
- `DeactivateInactiveAccounts`: conta sem login há 24 meses e 1 dia → `is_active = false`; conta com 23 meses e 29 dias → permanece ativa. Confirma que a ação é inativação, **nunca** exclusão de linha.

## 4. Testes de Componentes (React Testing Library)
- Mapa de assentos: assento ocupado não é clicável; assento livre dispara ação de reserva; estado otimista reverte corretamente se a reserva falhar (ex: outro usuário reservou no mesmo instante).
- Formulário de reserva: validação client-side (Zod) bloqueia envio com dados inválidos antes de chamar o servidor.
- Scanner de QR: exibe estado "sincronizando" quando há leituras offline pendentes.

## 5. Cobertura e Gate de CI

```jsonc
// jest.config coverageThreshold sugerido
{
  "coverageThreshold": {
    "global": { "branches": 75, "functions": 80, "lines": 80, "statements": 80 },
    "./src/use-cases/": { "branches": 85, "functions": 90, "lines": 90, "statements": 90 }
  }
}
```

`use-cases/` tem exigência mais alta que o global porque é onde vive a regra de negócio — é o código que, se quebrar, mexe com dinheiro ou com vazamento de dado.

## 6. O que NÃO precisa de teste unitário exaustivo
- Estilização pura (Tailwind classes).
- Textos estáticos do site público.
- Configuração de infraestrutura (a própria migration SQL é "testada" pelo `test:rls`, não por Jest).

Isso evita inflar a métrica de cobertura com testes de baixo valor, mantendo o foco nos 80%+ em código que realmente carrega risco.
