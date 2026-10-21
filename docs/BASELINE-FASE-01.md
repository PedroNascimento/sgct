# Baseline da Fase 01 — Governança e baseline

Data: 21/10/2026. Branch: `docs/plano-remediacao-auditoria`, criada previamente pelo responsável. HEAD de referência anterior às alterações: `0a85757`. Repositório versionável: `C:/Users/Pedro/Desktop/projetos-dev/sgct`. A pasta `sgct-sdd` é a cópia documental, não o repositório Git da aplicação.

## Entrega e limites

**R01.1–R01.6 concluídos como fase de governança e infraestrutura de baseline, não como correção das vulnerabilidades.** As Fases 02–11 não foram executadas. Sem deploy, db push remoto, reset do banco de desenvolvimento, envio de e-mail real, commit ou mudança de branch.

- Constituição emendada para v4.0.0: Super Admin cria Estacas/promove membro existente a Admin Estaca; Admin Estaca promove somente Admin Ala da própria Estaca. Conta é criada pelo participante, nunca pelo painel. Lookup dirigido mínimo, sem acesso operacional de Super Admin. Nome/Ala públicos por projeção, demais campos pessoais protegidos.
- D09/D22/D32, specs 000/001/010/011/014, documentos operacionais e tarefas alinhados. Os 15 plans foram revisados e suas pendências registradas na [matriz constitucional](REVISAO-CONSTITUCIONAL-4.0.0.md).
- Relatórios de piloto/pentest corrigidos: seis vetores automatizados não provam segurança universal; segunda Estaca no mesmo banco não prova instalação independente; métricas e piloto real sem evidência não são aceitos.
- [Inventário de acesso](INVENTARIO-ACESSOS.md): 63 exports de Server Actions/métodos HTTP, 25 páginas, 89 objetos SQL declarados; índices de grants/revogações/RLS e fronteiras Edge/Storage/IndexedDB/cron. Atores normativos e referências nominais de testes não equivalem a autorização efetiva ou cobertura comprovada.
- [Registro dos 24 achados](REGISTRO-REMEDIACAO.md): todos com tarefas e critérios de fechamento. Aceites afetados reabertos, histórico preservado no Git.
- Guarda loopback nos runners e no setup do Jest para suítes integração/RLS; bloqueia destino remoto antes de importar os testes, inclusive chamada direta de Jest. Credenciais locais obrigatórias, sem imprimir valores.
- CI mínimo versionado em `.github/workflows/ci.yml`: instalação reproduzível, lint, inventário, testes de proteção, Supabase descartável, unitários com cobertura, integração/RLS, build, tipos e audit. Não usa secrets de produção.

## Resultados executados nesta fase

| Comando | Resultado local |
|---|---|
| `npm run test:guard` | 5 testes Node passaram; URL remota, hostname enganoso, ausência de configuração, runner e Jest direto |
| `npm run test:unit -- --coverage --coverageDirectory=C:/Users/Pedro/AppData/Local/Temp/sgct-phase01-coverage --silent` | 78 suítes / 357 testes passaram |
| `npm run test:db -- --silent` | 19 suítes / 105 testes passaram no Supabase local `127.0.0.1:54321` |
| `npm run build` | Passou; Next.js instalado 16.4.2; sem deploy |
| `npm run typecheck` | Passou |
| `npm run lint` | Zero erros; 2 avisos preexistentes na página de check-in (diretiva eslint-disable e navegação via window.location) |
| `npm run inventory:access` e `npm run inventory:check` | Geração reproduzível e checagem passaram |
| `npm audit --json` | 42 nós vulneráveis: 35 high e 7 moderate; todos na árvore de desenvolvimento |
| `npm audit --omit=dev --json` | Zero vulnerabilidades reportadas na árvore de produção |

Total: **97 suítes Jest/462 testes**, mais **5 testes Node** da proteção de ambiente. Passar os testes existentes não fecha os achados; vários cenários de falha ainda não têm regressão adequada. Integração usa fixtures e limpeza por identificador; não foi realizado reset geral.

## Cobertura: denominador explícito

Valores calculados de `coverage-final.json` da execução acima:

| Escopo instrumentado | Statements | Functions | Branches |
|---|---:|---:|---:|
| domain + use-cases | 93,37% (1161 pontos) | 92,86% (98 funções) | 73,68% (775 ramos) |
| use-cases | 93,66% (1119 pontos) | 98,89% (90 funções) | 73,68% (775 ramos) |

O Jest coleta somente domain/use-cases; **não é cobertura global de toda a aplicação**. Thresholds legados 80/60/80/80 foram preservados, sem redução. Ainda não comprovam o Artigo IV (use-cases 80%, branches/functions 90%, global 75%). Fechamento obrigatório em R09.6, sem tratar este baseline como gate de release aprovado.

## Segurança e limitações da infraestrutura

O runner exige URL explícita http/https em 127.0.0.1/localhost/[::1], origem sem caminho extra, query, hash ou credenciais embutidas, além de chaves locais. Variáveis do CI têm precedência sobre .env.local. A proteção evita configuração remota acidental; **não substitui isolamento de rede**, nem detecta túneis/proxies locais configurados manualmente. Não redirecionar loopback a ambientes remotos.

O CI usa o Supabase criado no próprio runner e descarta somente esse ambiente ao terminar. **O workflow ainda não foi executado no GitHub**; validações locais não certificam seu primeiro cold start hospedado. O script de exportação é exclusivo do contexto CI/GITHUB_ENV, mascara chaves e não deve ser usado para exibir configurações locais.

O audit completo de desenvolvimento é registrado como pendência com continue-on-error no CI mínimo; audit de produção continua bloqueante para high. Essa exceção explícita não é aceite de dependências seguras; R09.4/R09.6 devem removê-la e concluir gates constitucionais, E2E, secret scanning e lint de camadas.

Não houve alteração de migrations, RLS, RPC, ações operacionais, componentes visuais ou regras de negócio implementadas. Alterações em src limitam-se ao setup de testes. Promoções, transações, retenção, check-in, filas e projeção pública ainda precisam das correções rastreadas.

## Critérios e rastreabilidade

| Tarefa | Evidência de entrega |
|---|---|
| R01.1 | Constituição v4.0.0, changelog e revisão de todos os plans |
| R01.2 | DECISIONS, specs 000/001, SECURITY/DATABASE_SCHEMA/ARCHITECTURE/TESTING/SETUP/AGENTS alinhados |
| R01.3 | PILOTO_RELATORIO_FINAL, PILOTO_ROTEIRO_E_FEEDBACK e conclusão PENTEST_REPORT corrigidos |
| R01.4 | Inventário gerado, atores/testes nominais/grants/RLS e lacunas explícitos |
| R01.5 | scripts de proteção e runner, setup Jest, 5 testes negativos/positivos e CI mínimo |
| R01.6 | Este baseline, auditoria/plano incorporados ao Git e registro dos 24 achados; aceites reabertos |

A cópia documental recebe somente os artefatos de governança selecionados; o repositório da aplicação é a referência do código e da branch. Nenhuma sincronização indiscriminada de documentos históricos.

Próxima fase proposta: **Fase 02 — Segurança da fronteira de banco**. Sua execução requer nova solicitação; este registro não fecha C01/C02 nem autoriza implantação.
