# Constituição do Projeto — SGCT
### Sistema de Gestão de Caravanas ao Templo — Plataforma Multi-Estaca

**Versão:** 3.0.0
**Ratificada em:** 2026-07-27 | **Emendada em:** 2026-07-28 (v2.0.0), 2026-07-29 (v3.0.0)
**Autoridade:** este documento supera qualquer outro artefato do repositório (spec, plan, task, código) em caso de conflito. Nenhum agente ou desenvolvedor deve implementar algo que viole um artigo abaixo, mesmo que um `spec.md` peça isso — nesse caso, o `spec.md` está errado e deve ser corrigido primeiro.

---

## Artigo I — Arquitetura em Camadas (Clean Architecture Adaptada)
Todo código de produção respeita a separação: `domain/` (puro, sem framework) → `use-cases/` (regra de negócio, testável isoladamente) → `infrastructure/` (implementações concretas) → `app/`/`components/` (UI). A direção de dependência é sempre de fora para dentro; `domain/` nunca importa de `infrastructure/` ou `app/`.
**Verificável por:** revisão de imports em CI (lint rule que bloqueia `domain/` importando de `infrastructure/` ou `app/`).

## Artigo II — Isolamento Multi-Tenant em Dois Níveis: Estaca (Stake) acima de Ala 🔄
O sistema é uma plataforma multi-tenant: **múltiplas Estacas compartilham o mesmo banco de dados (Supabase), com custo zero e isolamento absoluto.**

(a) **`stake_id` é o limite de tenant mais externo e mais crítico do sistema.** Vazamento de dado entre Estacas (uma Estaca enxergando qualquer dado de outra — reserva, perfil, financeiro, ou até contagem/metadado não-público) é tratado com a **mesma severidade de um incidente de segurança**, nunca como um bug comum.
(b) `stake_id` é propagado (denormalizado) em toda tabela que hoje carrega `ward_id`: `wards`, `profiles`, `caravans`, `reservations`, e por extensão de consistência, em toda tabela derivada de reserva (`passenger_manifest_entries`, `minor_approval_forms`, `seat_swap_requests`, `credit_ledger`, `checkins`, `audit_logs`).
(c) **`stake_id`/`ward_id` nunca são aceitos como input direto do client.** São sempre derivados via trigger `BEFORE INSERT` a partir da entidade pai (`ward → stake`, `caravan → stake`, `reservation → ward do usuário autenticado`). Confiar em RLS sozinha para essa consistência não é suficiente — a denormalização em si não pode ser forjável.
(d) Dentro de uma Estaca, o isolamento por Ala (Artigo II original, v1.0.0) permanece inalterado: Admin Ala só acessa dados da própria Ala **dentro da própria Estaca**. As únicas exceções documentadas a qualquer nível de isolamento são: (i) a view `v_seat_occupancy` (assento + status, sem PII), escopada por `stake_id`; e (ii) 🔄 **reservas de convidado inter-Estaca** (v3.0.0) — um membro de uma Estaca de origem pode reservar vaga em caravana de outra Estaca (anfitriã) mediante repasse financeiro em 3 elos (Ala origem → Estaca origem → Estaca anfitriã) e apenas quando há vaga não preenchida por membros da própria Estaca anfitriã (prioridade sempre da Estaca anfitriã). O `profile` do convidado pertence ao `stake_id` da Estaca **anfitriã** (para fins de RLS — é lá que a reserva existe e precisa ser visível ao Admin Estaca anfitrião); os dados de Estaca/Ala de origem são armazenados como texto livre (`home_stake_name`/`home_ward_name`), não como referência a linhas reais de `stakes`/`wards`, já que a Estaca de origem pode nem usar esta plataforma. Um convidado nunca tem `ward_id` preenchido (não pertence a nenhuma Ala da Estaca anfitriã) e nunca aparece em relatório financeiro de Ala (Artigo... ver `docs/DATABASE_SCHEMA.md` seção 5.8 e spec `013-convidados-interestaca`).
(e) **Hierarquia de papéis:** `super_admin` (global, cross-tenant) > `admin_estaca` (escopado ao próprio `stake_id`) > `admin_ala` (escopado ao próprio `ward_id` dentro do `stake_id`) > `member`/`menor` (escopado ao próprio registro).
(f) **`super_admin` opera sob o princípio de menor privilégio mesmo sendo o papel mais alto.** Suas únicas ações permitidas são: cadastrar novas Estacas (`stakes`) e cadastrar o primeiro `admin_estaca` de cada Estaca nova. `super_admin` **não tem** acesso de leitura a reservas, dados financeiros, dados de menores ou perfis de membros de nenhuma Estaca — essas tabelas não concedem policy alguma a `super_admin`. Qualquer exceção a isso exige emenda formal a este artigo.
**Verificável por:** suíte `test:rls` cobrindo vazamento cross-*stake* em toda tabela (não só cross-Ala); teste explícito confirmando que `super_admin` recebe conjunto vazio ao tentar `SELECT` em `reservations`/`credit_ledger`/`minor_approval_forms` de qualquer Estaca.

## Artigo III — Nenhuma Transição de Status Sensível via UPDATE Direto do Client
Mudanças de status de reserva, pagamento, crédito ou aprovação de menor passam exclusivamente por Server Actions/Edge Functions que executam o use-case correspondente e validam a regra de negócio (ex: bloqueio de autoaprovação). Policies de `UPDATE` no banco existem como defesa em profundidade, nunca como via de escrita primária.
**Verificável por:** nenhuma chamada `supabase.from(...).update(...)` fora de `src/infrastructure/` para essas tabelas (lint/grep em CI).

## Artigo IV — TDD Obrigatório e Cobertura Mínima Verificável
Todo código novo em `src/use-cases/` é precedido por um teste que falha antes de qualquer implementação (red → green → refactor). Cobertura mínima: 80% em `src/use-cases/` (90% em branches/functions), 75% global. Qualquer PR que reduza a cobertura abaixo do limiar é bloqueado pelo CI.
**Verificável por:** gate de cobertura no `jest.config` + CI (ver `docs/TESTING.md`).

## Artigo V — Segurança por Padrão
(a) Toda Server Action valida entrada com Zod antes de tocar o banco. (b) A `service_role` key do Supabase só é usada em Edge Functions/jobs `pg_cron`/scripts de seed, nunca em código que roda no client ou em Server Actions comuns. (c) Rate limiting ativo nos endpoints listados em `docs/SECURITY.md` seção 3. (d) Nenhum segredo é commitado — `.env*` no `.gitignore` desde a primeira migration; `.env.example` é a única fonte versionada de quais variáveis existem.
**Verificável por:** checklist de segurança em `docs/SECURITY.md` seção 9, executado antes de cada release.

## Artigo VI — Conformidade LGPD é Automatizada, Não Manual
Dados de menores (formulários, manifesto de crianças de colo) seguem a política de retenção definida em `docs/DATABASE_SCHEMA.md`/PRD, expurgados por job `pg_cron` (`PurgeExpiredMinorData`), nunca por processo manual esquecível. Toda leitura administrativa de documento de menor gera entrada em `audit_logs`. Consentimento do responsável é campo explícito e destacado no cadastro do menor, nunca implícito nos Termos de Uso gerais. Esta obrigação se aplica **por Estaca**, independente de instância ser hospedada por nós ou por terceiros (Artigo IX).
**Verificável por:** teste de expurgo automático (`test:rls`/integração) com data congelada nos limiares de 90 dias e 12 meses.

## Artigo VII — Nenhuma Regra de Negócio é Inventada pelo Agente
Se uma regra de negócio necessária para implementar uma tarefa não estiver em um `spec.md` aprovado, o agente **para e pergunta** — nunca assume a interpretação "mais provável" e segue codando. Isto é o oposto deliberado de *vibe coding*: specs são a única fonte de verdade de intenção de negócio.
**Verificável por:** todo `spec.md` tem seção "Fora do Escopo" explícita; ausência de uma regra em toda a árvore de specs é, por definição, "não implementar ainda".

## Artigo VIII — Fluxo Linear: Constitution → Specify → Plan → Tasks → Implement
Nenhuma implementação começa sem um `plan.md` aprovado, e nenhum `plan.md` é aprovado sem passar por uma checagem explícita de conformidade com esta constituição (seção "Constitution Compliance Check" em cada `plan.md`). Specs (`spec.md`) descrevem **o quê e o porquê**, nunca detalhe de implementação. Pular etapa é uma violação constitucional, mesmo sob pressão de prazo.

## Artigo IX — Distribuição Aberta e Auto-hospedável (Open Source / Self-Hosted) 🔄
O código é **100% agnóstico de tenant e de ambiente**, guiado inteiramente por variáveis de ambiente. Qualquer outra Estaca no Brasil deve conseguir clonar o repositório e subir sua própria instância gratuita, sem tocar em código-fonte.
(a) Nenhuma configuração específica de uma Estaca (nome, slug, valores, e-mails, segredos) é hardcoded em qualquer arquivo versionado — tudo vem de variável de ambiente ou de dado em banco (`stakes`, `caravans`).
(b) `.env.example` é obrigatório e mantido atualizado a cada nova variável introduzida — é a documentação viva de configuração do projeto.
(c) `SETUP.md` (ou seção equivalente do `README.md`) documenta, de forma que uma pessoa não-desenvolvedora tecnicamente orientada consiga seguir: clonar o repositório, criar projeto Supabase (free tier), criar conta Resend (free tier), configurar Vercel, rodar `supabase db push`, e executar o script de seed do primeiro `super_admin`.
(d) Testes de RLS e de use-cases nunca assumem um `stake_id` fixo/hardcoded — sempre usam fixtures de pelo menos 2 Estacas distintas, exatamente para pegar vazamento cross-*stake* antes de produção.
**Verificável por:** `docs/SETUP.md` seguido do zero em uma instância limpa como parte do checklist de release; `.env.example` revisado a cada PR que introduz `process.env.*` novo.

## Artigo X — Governança desta Constituição
Emendas a este documento exigem: (1) registro explícito do motivo da mudança, (2) incremento de versão semântica (`MAJOR.MINOR.PATCH` — mudança de artigo existente = MAJOR, novo artigo = MINOR, clarificação de texto = PATCH), (3) revisão de todos os `plan.md` existentes quanto à nova conformidade. O changelog de emendas fica registrado no final deste arquivo.

---

## Changelog de Emendas
| Versão | Data | Mudança |
|---|---|---|
| 1.0.0 | 2026-07-27 | Ratificação inicial, consolidando as decisões de arquitetura, RLS, TDD e segurança fechadas durante a especificação do PRD v5. |
| 2.0.0 | 2026-07-28 | **MAJOR.** Artigo II expandido de "isolamento por Ala" para "isolamento em dois níveis, Estaca acima de Ala" (mudança de artigo existente). Novo Artigo IX: Distribuição Aberta e Auto-hospedável. Governança renumerada de IX para X. Motivo: decisão estratégica de operar como plataforma SaaS regional multi-Estaca com distribuição híbrida open-source/self-hosted. |
| 3.0.0 | 2026-07-29 | **MAJOR.** Artigo II.d emendado: documentada formalmente a exceção de reservas de convidado inter-Estaca (mudança de artigo existente). Motivo: processo real de repasse financeiro entre Estacas identificado a partir do formulário de inscrição em uso, exigindo uma segunda exceção deliberada e documentada ao isolamento absoluto, sem enfraquecer a regra geral. |
