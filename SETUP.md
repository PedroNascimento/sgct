# SETUP.md — Guia de Instalação e Auto-Hospedagem (Self-Hosted)

> **Estado em 21/10/2026:** somente desenvolvimento local, sem deploy na Vercel. As seções de nuvem/deploy são instruções futuras e não evidência de instalação concluída. Antes da primeira implantação, fechar `REGISTRO-REMEDIACAO.md`. Não usar banco remoto para testes nem resetar o banco local atual sem autorização específica.

> Este guia permite que **qualquer Estaca no Brasil** suba sua própria instância do SGCT, gratuitamente, sem tocar em código-fonte — apenas configurando variáveis de ambiente. Ver Artigo IX da constituição (`.specify/memory/constitution.md`).

## 1. Pré-requisitos
- Conta gratuita na Vercel (vercel.com)
- Conta gratuita no Supabase (supabase.com)
- Conta gratuita no Resend (resend.com)
- Node.js 20+ e npm instalados localmente (para rodar migrations/seed)
- Git

## 2. Clonar o Repositório
```bash
git clone https://github.com/<org>/sgct.git
cd sgct
npm install
```

## 2bis. Ambiente de Desenvolvimento Local (Docker + Supabase CLI) — antes da Seção 3

Esta seção é separada de propósito: a Seção 3 cria a instância **real** (nuvem — SaaS compartilhado ou produção auto-hospedada); esta aqui é o ambiente onde você (ou o agente no Antigravity) desenvolve e testa, **sem tocar em dado real de nenhuma Estaca**.

Pré-requisito adicional: [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e rodando.

```bash
npx supabase --version  # CLI do projeto, instalada por npm ci
supabase init          # só na primeira vez, cria a pasta supabase/ se ainda não existir
supabase start          # sobe Postgres + Auth + Storage + Studio localmente via Docker
supabase functions serve # mantém as Edge Functions locais disponíveis em outro terminal
```

Ao final do `supabase start`, o terminal imprime a URL e as chaves locais. Copie para o seu `.env.local` (que já deve existir a partir de `cp .env.example .env.local`, ver Seção 5):
```bash
supabase status
# API URL          -> NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# anon key         -> NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# service_role key -> SUPABASE_SERVICE_ROLE_KEY=...
```

**Fluxo do dia a dia:**
```bash
supabase migration new nome_da_migration   # cria um novo arquivo em supabase/migrations/
# edite o arquivo SQL, incluindo RLS no mesmo arquivo (Artigo II da constituição)
supabase db reset                           # reaplica TODAS as migrations do zero no banco local
npm run test:rls                            # roda contra o banco local, nunca contra produção
```

`supabase db reset` é destrutivo **só no banco local** (Docker) — apaga e recria tudo a partir das migrations versionadas. Use apenas em banco local descartável ou após autorização específica para apagar os dados locais; não é comando rotineiro para o banco em uso. **Nunca** rode `supabase db push` (Seção 3/7) apontando para o projeto remoto até o CI passar (lint + test + `test:rls`) e o "Definition of Done" do `tasks.md` da spec estar satisfeito — essa é a fronteira entre desenvolvimento local e produção neste projeto.

```bash
supabase stop   # derruba o ambiente local quando não estiver desenvolvendo
```

## 3. Criar o Projeto Supabase (instância remota — SaaS compartilhado ou produção auto-hospedada)
1. Crie um novo projeto no dashboard do Supabase (plano Free).
2. Em Project Settings -> API, copie:
   - Project URL -> NEXT_PUBLIC_SUPABASE_URL
   - anon public key -> NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key -> SUPABASE_SERVICE_ROLE_KEY (nunca compartilhe ou commite essa chave)
3. Instale a CLI do Supabase e conecte ao projeto:
   ```bash
   npx supabase --version  # CLI do projeto, instalada por npm ci
   supabase login
   supabase link --project-ref <seu-project-ref>
   ```
4. Aplique todas as migrations (schema + RLS já incluídos):
   ```bash
   supabase db push
   ```
5. Publique a Edge Function de provisionamento de usuários. Ela é a única fronteira de request que recebe `service_role`; as Server Actions nunca recebem essa chave:
   ```bash
   supabase functions deploy provision-user --no-verify-jwt
   ```
   A função faz sua própria validação de JWT nas operações administrativas e mantém públicas somente as operações de autocadastro.
6. Habilite pg_cron em Database -> Extensions e confirme que os jobs agendados (docs/ARCHITECTURE.md secao 6) foram criados pelas migrations.
7. Configure o Auth Hook custom_access_token_hook em Authentication -> Hooks (aponta para a funcao ja criada pela migration — ver docs/DATABASE_SCHEMA.md secao 8).
8. Crie o bucket privado minor-forms em Storage (as migrations ja aplicam as policies; so o bucket em si precisa ser criado manualmente na primeira vez).

## 4. Configurar o Resend
1. Crie uma conta gratuita em resend.com.
2. Gere uma API Key -> RESEND_API_KEY.
3. (Opcional, recomendado) Verifique seu proprio dominio de e-mail para usar como RESEND_FROM_EMAIL; sem isso, use o dominio de teste do Resend enquanto valida o sistema.

## 5. Configurar Variaveis de Ambiente
Copie .env.example para .env.local e preencha todos os valores:
```bash
cp .env.example .env.local
```
Preste atencao especial a:
- NEXT_PUBLIC_DEFAULT_STAKE: o slug da sua Estaca (ex: natal, recife, joao-pessoa) — e o que a rota raiz "/" vai renderizar como fallback.
- QR_TOKEN_SECRET: gere um valor aleatorio forte: `openssl rand -hex 32`
- CRON_SECRET: idem, gere com o mesmo comando.

## 6. Bootstrap da instância e promoção de contas existentes
O seed inicial cria a identidade Super Admin da instância e a configuração inicial prevista no script. Administradores de Estaca/Ala são membros autocadastrados promovidos, conforme constituição v4.0.0/D32; o seed não é um fluxo para criar credenciais de participantes.

```bash
npm run seed:super-admin -- --email="seu-email@exemplo.org" --senha="defina-uma-senha-forte"
```

O comando usa `scripts/seed-bootstrap.ts`. Verifique a saída do script e nunca copie senhas/chaves para logs versionados. A implementação legada deve ser revalidada na remediação; a documentação não garante criação automática de todos os perfis.

Responsabilidades do bootstrap:
1. Usa a SUPABASE_SERVICE_ROLE_KEY (nunca a anon key) para criar o usuario via Admin API do Supabase Auth.
2. Insere a profile correspondente com role = 'super_admin' e stake_id = null (intencional — ver Artigo II.f da constituicao).
3. Fornece a identidade inicial necessária para acessar a plataforma; não se presume que gere link temporário.

Depois de logado como Super Admin, crie a Estaca em `/estacas`. O participante deve se cadastrar como membro nessa Estaca. Em `/admins`, o Super Admin identifica esse membro por busca dirigida e promove a Admin Estaca. Esse Admin Estaca cria as Alas e promove membros existentes da própria Estaca a Admin Ala; não promove outros Admins Estaca. Nenhum painel cria a senha do participante. Contratos/limitações de acesso ainda serão corrigidos nas Fases 02–03.

Atencao: se sua instancia vai atender uma unica Estaca (caso mais comum de auto-hospedagem), o slug cadastrado aqui deve ser exatamente o mesmo valor de NEXT_PUBLIC_DEFAULT_STAKE.

## 7. Deploy na Vercel
1. Importe o repositorio em vercel.com/new.
2. Configure as mesmas variaveis de .env.local em Project Settings -> Environment Variables (nunca reaproveite o arquivo .env.local — configure diretamente na Vercel).
3. Deploy. A Vercel free tier e suficiente para o volume esperado (uma Estaca, ~50-300 usuarios ativos).

## 8. Verificacao Pos-Deploy
- [ ] Acessar https://seu-dominio.vercel.app/ e confirmar que renderiza a Estaca configurada em NEXT_PUBLIC_DEFAULT_STAKE.
- [ ] Login como admin_estaca e criar uma Ala de teste + uma caravana de teste.
- [ ] Confirmar que os jobs pg_cron aparecem ativos em Database -> Cron Jobs no painel Supabase.
- [ ] Enviar um e-mail de teste (ex: confirmacao de reserva) e confirmar recebimento via Resend.
- [ ] Rodar npm run test:rls localmente contra o schema aplicado, como sanity check final.

## 9. Atualizacoes Futuras
Para atualizar sua instancia quando o repositorio upstream receber melhorias:
```bash
git pull origin main
npm install
supabase db push
```
Nenhuma configuracao especifica da sua Estaca (nome, valores, e-mails) e perdida — tudo vive em variaveis de ambiente ou no banco (stakes, caravans), nunca em codigo (Artigo IX da constituicao).

## Baseline e instalação de testes

Use `npm ci` para reproduzir o lockfile; configure somente URL/chaves do Supabase local e execute `npm run test:guard`, `npm run test:unit` e `npm run test:db`. O runner recusa destinos remotos. Conferir `.github/workflows/ci.yml` para banco descartável de CI, sem secrets remotos. Jobs exigem URL alcançável pelo banco/container e segredo configurados; existência em cron.job não comprova execução. Configuração/monitoramento completos ficam na Fase 07. A segunda instalação independente e o primeiro deploy continuam pendentes.
