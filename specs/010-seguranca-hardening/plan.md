# Plan 010: Hardening de Segurança

**Spec de referência:** `specs/010-seguranca-hardening/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | Rate limiting implementado em `infrastructure/rate-limit/`, chamado por middleware — não em `use-cases`. |
| II | ✅ | Esta spec é a auditoria final do próprio Artigo II — checklist completo executado aqui. |
| III | ✅ | Auditoria confirma que nenhuma Server Action usa `update()` livre. |
| IV | N/A | Esta spec é majoritariamente auditoria/configuração, não lógica de negócio nova. |
| V | ✅ | Esta spec **é** a implementação operacional do Artigo V. |
| VI | ✅ | Confirma que os jobs de retenção (spec 009) estão realmente agendados em produção. |
| VII | N/A | |
| VIII | ✅ | Última spec antes do piloto (011) — todas as anteriores precisam estar concluídas. |
| IX | ✅ | Checklist de `SETUP.md` re-executado do zero como parte desta spec. |

## Abordagem Técnica
Ver `docs/SECURITY.md` completo. Rate limiting via tabela própria no Supabase (janela deslizante) por padrão, com opção de Upstash Redis documentada como alternativa (`.env.example` já prevê ambas as opções).

## Modelo de Dados
Nova tabela (se optar pela alternativa sem Redis): `rate_limit_events` (id, stake_id, key, created_at) com índice em `(key, created_at)` para consulta de janela deslizante.

## Contratos (Use-cases / Server Actions)
```ts
// src/infrastructure/rate-limit/
checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter?: number }>
```

## Decisões Técnicas Resolvidas (Research)
Nenhuma decisão de produto nova — esta spec consolida decisões de segurança já presentes em `docs/SECURITY.md` desde a primeira versão da documentação.

## Fases de Implementação
- **Fase 1:** `checkRateLimit` + aplicação em login, criação de reserva, scanner de check-in, envio de e-mail, upload de menor.
- **Fase 2:** Auditoria de 100% das Server Actions quanto à validação Zod.
- **Fase 3:** Execução completa do checklist de `docs/DATABASE_SCHEMA.md` seção 10 em todas as tabelas.
- **Fase 4:** Teste de penetração manual (chamada direta à API do Supabase com token de outra Estaca) + relatório curto.
- **Fase 5:** Re-execução do `SETUP.md` do zero em ambiente limpo, como sanity check de auto-hospedagem.
