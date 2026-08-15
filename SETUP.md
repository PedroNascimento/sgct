# SETUP.md — Guia de Instalação e Auto-Hospedagem (Self-Hosted)

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

## 3. Criar o Projeto Supabase
1. Crie um novo projeto no dashboard do Supabase (plano Free).
2. Em Project Settings -> API, copie:
   - Project URL -> NEXT_PUBLIC_SUPABASE_URL
   - anon public key -> NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key -> SUPABASE_SERVICE_ROLE_KEY (nunca compartilhe ou commite essa chave)
3. Instale a CLI do Supabase e conecte ao projeto:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <seu-project-ref>
   ```
4. Aplique todas as migrations (schema + RLS já incluídos):
   ```bash
   supabase db push
   ```
5. Habilite pg_cron em Database -> Extensions e confirme que os jobs agendados (docs/ARCHITECTURE.md secao 6) foram criados pelas migrations.
6. Configure o Auth Hook custom_access_token_hook em Authentication -> Hooks (aponta para a funcao ja criada pela migration — ver docs/DATABASE_SCHEMA.md secao 8).
7. Crie o bucket privado minor-forms em Storage (as migrations ja aplicam as policies; so o bucket em si precisa ser criado manualmente na primeira vez).

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

## 6. Rodar o Script de Seed (primeira Estaca + super_admin)
Toda instancia nova precisa de pelo menos: (1) um registro em stakes, (2) um usuario com role super_admin, (3) o primeiro admin_estaca daquela Estaca.

```bash
npm run seed:super-admin -- --email="seu-email@exemplo.org" --senha="defina-uma-senha-forte"
```

Esse script (scripts/seed-super-admin.ts):
1. Usa a SUPABASE_SERVICE_ROLE_KEY (nunca a anon key) para criar o usuario via Admin API do Supabase Auth.
2. Insere a profile correspondente com role = 'super_admin' e stake_id = null (intencional — ver Artigo II.f da constituicao).
3. Imprime no terminal um link de login temporario.

Depois de logado como super_admin, acesse /super-admin/estacas para cadastrar a Estaca (nome + slug) e /super-admin/admins para cadastrar o primeiro admin_estaca dela — esse admin, a partir dai, gerencia tudo pela interface normal, sem precisar mais do super_admin.

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
