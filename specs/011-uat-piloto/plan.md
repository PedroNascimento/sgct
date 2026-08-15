# Plan 011: UAT e Piloto com uma Caravana Real

**Spec de referência:** `specs/011-uat-piloto/spec.md`

## Verificação de Conformidade com a Constituição
| Artigo | Conformidade | Observação |
|---|---|---|
| I-IX | ✅ | Esta spec não introduz código novo de produção — é validação do que já foi construído nas specs 000-010. Nenhuma violação esperada; qualquer achado do piloto que exija mudança de regra volta como emenda a uma spec anterior, nunca como código solto fora do fluxo. |

## Abordagem Técnica
Rollout controlado: uma caravana real, sistema novo em paralelo ao Google Sites atual, sem desligar o processo manual até o piloto ser validado. Divergências encontradas geram issues rastreadas, cada uma endereçada como correção na spec correspondente (nunca como patch avulso fora do fluxo Constitution→Specify→Plan→Tasks→Implement).

## Modelo de Dados
N/A — sem schema novo.

## Contratos (Use-cases / Server Actions)
N/A — sem código novo de produção previsto; eventuais correções usam os contratos já definidos nas specs 000-010.

## Decisões Técnicas Resolvidas (Research)
D20 (sem migração de dados do protótipo; sem prazo fixo).

## Fases de Implementação
- **Fase 1:** Selecionar a caravana piloto e comunicar aos Admins Ala/Estaca envolvidos.
- **Fase 2:** Rodar o ciclo completo (reserva → validação semanal → check-in) com acompanhamento próximo.
- **Fase 3:** Coletar feedback estruturado (formulário curto para os Admins).
- **Fase 4:** Validar `SETUP.md` numa segunda instância de teste, do zero.
- **Fase 5:** Relatório final de piloto — vai/não vai para rollout completo, com lista de ajustes se houver.
