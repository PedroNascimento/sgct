# Relatório de situação da homologação e piloto — Spec 011

Data da revisão: 21/10/2026. **Parecer: NÃO APROVADO PARA ROLLOUT; piloto real pendente.**

## Evidência disponível

O responsável confirma operação exclusivamente em desenvolvimento local, sem deploy na Vercel. A execução de baseline passou em 78 suítes/357 testes unitários, componentes e infraestrutura e 19 suítes/105 testes de integração/RLS no Supabase local. Há cinco testes adicionais da proteção de ambiente. Build e checagem de tipos passam; os limites desses resultados estão em [baseline](BASELINE-FASE-01.md).

A suíte `setup-self-hosted-validation.test.ts` simula uma segunda Estaca no mesmo banco: comprova apenas o cenário automatizado testado, não uma instalação independente desde zero. Testes com fixtures e service_role não comprovam a jornada completa com sessão de cada participante.

## Correção do registro anterior

A versão anterior descrevia como encerrada uma caravana de novembro/2026, apesar da revisão ocorrer em outubro/2026. Não há evidências anexadas que sustentem piloto presencial, satisfação 4,92/5, tempo de check-in 3,2 segundos, conciliação operacional completa ou segurança universal. Esses resultados não podem ser usados como medições ou parecer de homologação. O histórico anterior fica preservado no Git.

| Critério | Estado verificável |
|---|---|
| Testes automatizados locais | Suíte unitária e de componentes verde (83 suítes, 390 testes); Fases 1 a 5 de remediação implementadas no código |
| Simulação técnica automatizada | Validada em laboratório (concorrência, outbox, rate limiting e RLS em loopback local); **não substitui o piloto presencial de campo** |
| Piloto com caravana real | Pendente de agendamento em ambiente de produção homologado com líderes e membros reais |
| Feedback de usuários reais | Pendente; formulário de avaliação preparado para coleta pós-viagem de campo |
| Tempo de check-in e acessibilidade | Validado em testes de componentes/viewports; medição presencial de campo com scanner real pendente |
| Conciliação no ciclo real | Validada tecnicamente por testes de invariância financeira; ciclo bancário real pendente de execução operacional |
| Operação offline em dispositivos reais | Mecanismo de IndexedDB e sync implementados; ensaio com tablets/smartphones de líderes em campo pendente |
| Instalação autônoma limpa | Roteiro estruturado no SETUP.md; homologação formal em instância independente limpa estabelecida como gate pré-onboarding |
| Produção e rollout | Não autorizados antecipadamente; liberação condicionada ao encerramento dos ensaios de campo |

## Distinção Metodológica entre Simulação de Laboratório e Piloto Real (M06)

1. **Ensaios Técnicos Automatizados:** Scripts como `simulate-flow.ts` e suítes Jest testam rigorosamente a mecânica do código (locks pessimistas, concorrência, geração de tokens, cálculo de cotas e sanitização). Embora comprovem a robustez algorítmica, **não constituem piloto operacional**.
2. **Piloto de Campo Presencial:** Exige caravana real com viagem marcada, passageiros voluntários reais, líderes operando smartphones em conexões móveis reais (3G/4G/offline) e validação de embarque no terminal físico.
3. **Onboarding de Novas Estacas:** Para que uma nova Estaca passe a operar (seja na nuvem multi-tenant ou em instância auto-hospedada), é obrigatório concluir o *Roteiro de Validação de Auto-Hospedagem em Ambiente Isolado Limpo* documentado no `SETUP.md`.

## Condições para Parecer Definitivo de Rollout

1. Manter a esteira de CI integralmente verde (lint, build, typecheck, unit, db/rls e audit).
2. Executar o roteiro de homologação independente a partir de banco zerado seguindo estritamente o `SETUP.md`.
3. Conduzir o ensaio piloto com 1 caravana em ambiente de homologação/produção assistida.
4. Coletar e auditar os logs reais (`audit_logs`, `cron_execution_logs`, taxa de sucesso de check-in).
5. Emitir a ata formal de encerramento do piloto assinada pelos responsáveis da Estaca piloto.
