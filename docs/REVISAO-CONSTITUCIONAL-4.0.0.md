# Revisão constitucional — v4.0.0

Data: 21/10/2026. Motivo e autorização: responsável confirmou promoções de contas existentes e nome/Ala públicos, e solicitou executar a Fase 01. Revisão exigida pelo Artigo X; os 15 plans foram lidos e receberam referência explícita à nova constituição.

## Delimitação da emenda

- II.e/f: Super Admin cria Estacas/promove member → admin_estaca. Admin Estaca promove member → admin_ala na própria Estaca, não promove pares. Admin Ala/membro não promovem. Nenhum painel cria conta/senha do participante. Lookup mínimo dirigido não é listagem global nem acesso operacional.
- II.g: nome/Ala podem aparecer no calendário da Estaca. Demais campos pessoais, documentos, tokens e informação financeira/de auxílio individual continuam restritos, inclusive em HTML/RSC/JSON/cache.
- Demais artigos e exceção guest II.d preservados. A alteração normativa não corrige automaticamente policies, funções ou Server Actions existentes.

## Revisão dos plans

| Spec / plan | Impacto e pendências | Conclusão |
|---|---|---|
| [000-fundacao-multi-tenant-saas](../specs/000-fundacao-multi-tenant-saas/plan.md) | II.e/f/g: promoção de membros existentes e lookup mínimo; público restrito; C01/C02/A01 abertos. Fases 02–03 e 08. | Desenho revisado; aceite operacional pendente da remediação |
| [001-autenticacao-rbac](../specs/001-autenticacao-rbac/plan.md) | II.e/f: promover member → admin_ala somente na própria Estaca; não criar conta por painel nem promover pares. A15/A16 abertos; Fase 03. | Desenho revisado; aceite operacional pendente da remediação |
| [002-gestao-caravanas](../specs/002-gestao-caravanas/plan.md) | II.g: nome/Ala permitidos na projeção pública, demais campos restritos. Validação de prazo/capacidade pendente; Fases 02/04/08. | Desenho revisado; aceite operacional pendente da remediação |
| [003-reservas-concorrencia](../specs/003-reservas-concorrencia/plan.md) | II/III: invariantes de reserva precisam sobreviver à API direta; C02/A05 permanecem abertos. Fases 02/04. | Desenho revisado; aceite operacional pendente da remediação |
| [004-workflow-pagamento-validacao](../specs/004-workflow-pagamento-validacao/plan.md) | II/III: autoridade administrativa não autoriza UPDATE financeiro genérico; A02/A11 pendentes. Fases 02/04/07. | Desenho revisado; aceite operacional pendente da remediação |
| [005-fila-espera-permuta-credito](../specs/005-fila-espera-permuta-credito/plan.md) | II/III: super_admin sem acesso operacional; C01/A04/A05/A07 pendentes de transações e testes reais. Fases 02/04. | Desenho revisado; aceite operacional pendente da remediação |
| [006-quorum-menores](../specs/006-quorum-menores/plan.md) | II/VI: lookup de promoção e calendário público não expõem documentos. Upload/rollover/auditoria pendentes, Fases 04/05. | Desenho revisado; aceite operacional pendente da remediação |
| [007-checkin-qrcode](../specs/007-checkin-qrcode/plan.md) | II: promoção de papel não equivale a designação de líder; nenhuma exceção dá ao Super Admin acesso a check-in. Fase 06. | Desenho revisado; aceite operacional pendente da remediação |
| [008-notificacoes](../specs/008-notificacoes/plan.md) | II/V: fila interna não fica acessível a Super Admin ou calendário público; eventos/workers pendentes. Fase 07. | Desenho revisado; aceite operacional pendente da remediação |
| [009-relatorios-lgpd](../specs/009-relatorios-lgpd/plan.md) | II/VI: financeiro e documentos não integram a projeção pública/lookup de promoção; totais, retenção e sessões pendentes. Fases 03/05/08. | Desenho revisado; aceite operacional pendente da remediação |
| [010-seguranca-hardening](../specs/010-seguranca-hardening/plan.md) | II/X: nova matriz normativa e baseline local; testes verdes não fecham 24 achados. Fases 02–09. | Desenho revisado; aceite operacional pendente da remediação |
| [011-uat-piloto](../specs/011-uat-piloto/plan.md) | IX: simulação local não comprova piloto real ou segunda instalação; aceites reabertos. Fase 11. | Desenho revisado; aceite operacional pendente da remediação |
| [012-auxilio-financeiro](../specs/012-auxilio-financeiro/plan.md) | II.g: necessidade/tipo de auxílio não pode ser publicado junto ao nome; autorização administrativa e criação do pedido ainda precisam integração. Fases 05/08. | Desenho revisado; aceite operacional pendente da remediação |
| [013-convidados-interestaca](../specs/013-convidados-interestaca/plan.md) | II.d preservado: guest sem Ala, repasse visível à Estaca anfitriã, não ao Admin Ala; sem novos poderes do Super Admin. Fase 05. | Desenho revisado; aceite operacional pendente da remediação |
| [014-design-system-ux](../specs/014-design-system-ux/plan.md) | II.e/g: navegação não altera role; nome/Ala públicos não permitem campos sensíveis em payloads. Inspeção visual ainda pendente. Fase 10. | Desenho revisado; aceite operacional pendente da remediação |

As marcas de implementação anteriores registram histórico. Não substituem a matriz de achados ou testes das novas fronteiras. O status efetivo de aceite é o da auditoria/registro de remediação, não uma tabela antiga com todos os itens verdes. Não há deploy de produção nem piloto real comprovado.

