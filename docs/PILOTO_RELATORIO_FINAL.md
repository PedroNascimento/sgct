# Relatório de situação da homologação e piloto — Spec 011

Data da revisão: 21/10/2026. **Parecer: NÃO APROVADO PARA ROLLOUT; piloto real pendente.**

## Evidência disponível

O responsável confirma operação exclusivamente em desenvolvimento local, sem deploy na Vercel. A execução de baseline passou em 78 suítes/357 testes unitários, componentes e infraestrutura e 19 suítes/105 testes de integração/RLS no Supabase local. Há cinco testes adicionais da proteção de ambiente. Build e checagem de tipos passam; os limites desses resultados estão em [baseline](BASELINE-FASE-01.md).

A suíte `setup-self-hosted-validation.test.ts` simula uma segunda Estaca no mesmo banco: comprova apenas o cenário automatizado testado, não uma instalação independente desde zero. Testes com fixtures e service_role não comprovam a jornada completa com sessão de cada participante.

## Correção do registro anterior

A versão anterior descrevia como encerrada uma caravana de novembro/2026, apesar da revisão ocorrer em outubro/2026. Não há evidências anexadas que sustentem piloto presencial, satisfação 4,92/5, tempo de check-in 3,2 segundos, conciliação operacional completa ou segurança universal. Esses resultados não podem ser usados como medições ou parecer de homologação. O histórico anterior fica preservado no Git.

| Critério | Estado verificável |
|---|---|
| Testes automatizados locais | Baseline verde no escopo descrito, com 24 achados ainda em remediação |
| Piloto com caravana real | Pendente; identificação/data/responsáveis não confirmados |
| Feedback de usuários reais | Pendente; formulário é roteiro, não coleta concluída |
| Tempo de check-in e acessibilidade | Não medidos; definir cenário, amostra e método |
| Conciliação no ciclo real | Pendente |
| Operação offline em dispositivos reais | Pendente; há falhas abertas A08/A09/A10 |
| Instalação autônoma limpa | Pendente em ambiente descartável separado |
| Produção e rollout | Não realizados; nenhuma autorização de implantação neste relatório |

## Condições para novo parecer

1. Encerrar críticos/altos e demonstrar correções por teste, conforme [registro](REGISTRO-REMEDIACAO.md).
2. Executar R11.1–R11.4: jornadas reais autorizadas, concorrência, falhas e instalação limpa independente.
3. Realizar homologação com usuários, registrar divergências e obter aceite explícito.
4. Planejar separadamente a primeira implantação e o futuro piloto operacional. Preservar controle de contingência e não desativar o processo existente com base em testes locais.
5. Emitir novo relatório com evidências datadas, responsáveis, condições de medição e risco residual. Não preencher resultados antecipadamente.

Esta correção documental atende R01.3/M06 parcialmente; a conclusão operacional da Spec 011 permanece aberta.
