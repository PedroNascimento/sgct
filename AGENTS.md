# AGENTS.md — SGCT (Sistema de Gestão de Caravanas ao Templo)
### Plataforma Multi-Tenant Regional — Open Source / Self-Hosted

> Este arquivo é o ponto de entrada de contexto para qualquer agente (Antigravity, Claude Code, etc.) trabalhando neste repositório.
>
> **Leia primeiro, nesta ordem:** `.specify/memory/constitution.md` (não-negociável) → `docs/DECISIONS.md` (decisões já resolvidas) → o `spec.md` da feature que você vai implementar → o `plan.md` correspondente → `tasks.md` correspondente.

## O que é o sistema
O SGCT gerencia caravanas ao Templo de Recife-PE. Nasceu para a Estaca Natal, mas é uma **plataforma multi-tenant**: múltiplas Estacas podem operar na mesma instância (isoladas por `stake_id`) ou clonar o repositório e auto-hospedar gratuitamente (ver `SETUP.md`).

**Não invente regra de negócio.** Se algo não estiver em um `spec.md` aprovado sob `specs/`, pare e pergunte — nunca assuma a interpretação mais provável (Artigo VII da constituição).

## Fluxo de Trabalho Obrigatório (SDD)
```
.specify/memory/constitution.md  (princípios não-negociáveis, fonte de autoridade máxima)
        ↓
specs/NNN-nome/spec.md            (o quê e por quê — sem detalhe de implementação)
        ↓
specs/NNN-nome/plan.md            (blueprint técnico + Constitution Compliance Check)
        ↓
specs/NNN-nome/tasks.md           (lista ordenada por dependência, TDD-first)
        ↓
Implementação
```
Nunca pule uma etapa. Nunca implemente algo que um `plan.md` não passou pela checagem de conformidade constitucional.

## Arquivos Específicos do Antigravity
- `.antigravity/rules.md` — regras sempre ativas, carregadas automaticamente ao abrir o workspace (espelha esta constituição de forma resumida e acionável).
- `.agents/workflows/implementar-proxima-spec.md` — invocar com `/implementar-proxima-spec` para tocar o projeto spec por spec, na ordem de dependência.
- `.agents/workflows/verificar-constituicao.md` — invocar com `/verificar-constituicao` para auditar o código atual contra todos os artigos, sem corrigir nada automaticamente.

## Ordem das Specs (dependência, não calendário)
`000-fundacao-multi-tenant-saas` → `001-autenticacao-rbac` → `002-gestao-caravanas` → `003-reservas-concorrencia` → `004-workflow-pagamento-validacao` → `005-fila-espera-permuta-credito` → `006-quorum-menores` → `007-checkin-qrcode` → `008-notificacoes` → `009-relatorios-lgpd` → `010-seguranca-hardening` → `011-uat-piloto`

🔄 **`012-auxilio-financeiro`** e **`013-convidados-interestaca`** podem ser implementadas em paralelo, a qualquer momento **depois de `004`** estar concluída (ambas dependem de `funding_source`/status de reserva já existirem) — não bloqueiam nem são bloqueadas por `005`-`011`. Recomendação: implementar antes de `010-seguranca-hardening`, já que ambas introduzem tabelas/RLS novas que precisam entrar na auditoria final.

## Stack
- Next.js 15 (App Router) + React + TypeScript (strict mode)
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage, Row Level Security, Edge Functions, `pg_cron`)
- Vercel (hospedagem, free tier) | Resend (e-mail transacional)
- Jest + React Testing Library — TDD obrigatório, 80%+ cobertura (Artigo IV)

## Comandos
```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:coverage
npm run test:rls           # obrigatório sempre que uma tabela/policy for tocada
supabase db reset
supabase db push
npm run seed:super-admin -- --email=... --senha=...   # bootstrap de instância nova
```

## Estrutura de Diretórios
```
.specify/memory/constitution.md   # autoridade máxima do projeto
specs/NNN-nome/{spec,plan,tasks}.md
docs/
  PRD.md                # histórico de negócio (referência; specs/ é a fonte executável)
  DECISIONS.md           # log de decisões já resolvidas — não perguntar de novo
  ARCHITECTURE.md
  DATABASE_SCHEMA.md     # schema + RLS completos, 2 níveis (Estaca > Ala)
  TESTING.md
  SECURITY.md
.env.example              # única fonte versionada de configuração
SETUP.md                  # guia de auto-hospedagem
src/
  app/(public|auth|admin|super-admin)/[estaca_slug]/...
  domain/ → use-cases/ → infrastructure/ → components/
supabase/migrations/
```

## Regras Não-Negociáveis (resumo — ver constituição para o texto completo)
1. **Isolamento em dois níveis é crítico:** `stake_id` (Estaca) é o limite mais externo; vazamento entre Estacas tem a mesma severidade de um incidente de segurança. `ward_id` (Ala) é o limite interno. 🔄 Única exceção adicional documentada: reserva de convidado inter-Estaca (spec 013, Artigo II.d) — visível só ao Admin Estaca anfitrião, nunca a nenhum Admin Ala.
2. **`stake_id`/`ward_id` nunca vêm do payload do client** — sempre derivados por trigger a partir da entidade pai.
3. **`super_admin` é deliberadamente limitado**: só cadastra Estacas e o primeiro Admin Estaca de cada uma. Sem acesso a reservas/financeiro/menores.
4. **Reserva ≠ confirmação:** escolher assento trava fisicamente, mas a posição final segue a ordem de transferência Ala→Estaca validada semanalmente. Assento nunca é liberado antecipadamente.
5. **Sem cancelamento direto pelo membro** — só promoção de lista de espera (gera crédito) ou permuta mediada (sem crédito).
6. **QR Code de check-in** só após `CONFIRMADO`, token assinado, suporte offline idempotente.
7. **Código 100% agnóstico de tenant e ambiente** — nada hardcoded; tudo via `.env` ou banco.
8. **TDD obrigatório**, 80%+ em `use-cases/`.

## O que NÃO fazer
- Não implementar regra de negócio ausente de um `spec.md` — parar e perguntar.
- Não desabilitar RLS "para testar mais rápido".
- Não conceder a `super_admin` acesso a dados operacionais de qualquer Estaca.
- Não hardcodear nome/slug/valores de uma Estaca específica em código versionado.
- Não pular a checagem de conformidade constitucional em um `plan.md`.
- Não commitar segredos — `.env*` no `.gitignore`, `.env.example` é a única referência versionada.
