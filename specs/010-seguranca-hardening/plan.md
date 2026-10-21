# Plan 010: Hardening de Segurança

> **Revisão constitucional de 21/10/2026 — v4.0.0:** II/X: nova matriz normativa e baseline local; testes verdes não fecham 24 achados. Fases 02–09. Ver [matriz de revisão](../../docs/REVISAO-CONSTITUCIONAL-4.0.0.md). As tabelas de conformidade descrevem o desenho; não são atestado de implementação ou rollout.

**Spec de referência:** `specs/010-seguranca-hardening/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I | ✅ | Rate limiting implementado em `infrastructure/rate-limit/`, chamado por middleware — não em `use-cases`. |
| II | Pendente na implementação | RLS/RPC/Server Actions têm achados abertos; matriz de acesso v4.0.0 orienta a remediação. |
| III | Pendente na implementação | Auditoria encontrou escritas diretas e permissões amplas; corrigir na Fase 02. |
| IV | Baseline | Runner protegido e testes próprios; cobertura de branches ainda abaixo de 90%, com fechamento na Fase 09. |
| V | ✅ | Esta spec **é** a implementação operacional do Artigo V. |
| VI | Pendente | Somente desenvolvimento local; jobs existentes não demonstram execução bem-sucedida nem retenção correta. |
| VII | N/A | |
| VIII | ✅ | Última spec antes do piloto (011) — todas as anteriores precisam estar concluídas. |
| IX | Pendente | Instalação independente será executada na Fase 11; não está comprovada pelo teste de segunda Estaca. |

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

## Fase adicional — Governança e baseline (21/10/2026)

Autorizada pelo responsável conforme `docs/PLANO-REMEDIACAO-2026-10-21.md`, R01.1–R01.6. Entregas: constituição v4.0.0 e revisão dos 15 plans; inventário de acesso; status real do piloto; guarda loopback nos runners; CI local ao runner; baseline e matriz de remediação. Não altera migrations/policies nem comportamento operacional.

Contratos da infraestrutura: `assertLocalTestEnvironment(env)` rejeita URL ausente/não loopback e credenciais locais ausentes sem imprimi-las; setupAfterEnv valida o destino antes de importar suítes de integração/RLS; runner chama Jest via argv sem shell. CI usa chaves efêmeras do Supabase do runner e não usa secrets remotos.

Verificação constitucional desta fase: I — infraestrutura separada do domínio; II/V — protege o destino de testes, sem abrir acesso; III/VI — nenhuma mutação de produção; IV — testes negativos da trava e baseline separados do aceite; VII/VIII/X — regras confirmadas, spec/plan/tasks alinhados e emenda registrada; IX — configuração portátil. A conformidade da fase documental não equivale à conformidade do código operacional.
