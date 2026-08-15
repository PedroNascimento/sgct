# Segurança — SGCT

## 1. Modelo de Ameaças (o que este sistema precisa proteger)

| Ativo | Risco principal | Mitigação |
|---|---|---|
| Dados de menores (0-17) | Vazamento, acesso indevido | RLS estrito por Ala + Storage privado + audit log de leitura + retenção limitada (LGPD) |
| 🔄 Vazamento entre Estacas (multi-tenant) | Estaca A lendo qualquer dado da Estaca B | `stake_id` derivado por trigger (não confiável do client) + RLS de 4 camadas + checagem redundante no middleware (slug vs. claim) |
| 🔄 Abuso do papel `super_admin` | Papel global virar um ponto único de vazamento de todas as Estacas | Least privilege constitucional: `super_admin` só acessa `stakes` e faz bootstrap de `admin_estaca`; nenhuma policy concede acesso a `reservations`/`credit_ledger`/dados de menores |
| Dados financeiros (quem pagou quanto) | Vazamento entre Alas, fraude de confirmação | RLS por Ala + bloqueio de autoaprovação + Server Actions para toda transição de status |
| Assentos do ônibus | Disputa/corrida na abertura de inscrições | Constraint `unique (caravan_id, seat_number)` no banco (fonte da verdade), não só lock otimista no client |
| QR Code de check-in | Falsificação, replay | Token assinado (HMAC/JWT) de curta duração, gerado só após `CONFIRMADO`, checagem de idempotência |
| Contas de usuário | Força bruta, sequestro de conta | Rate limiting de login, Supabase Auth (bcrypt/Argon2 nativo), sessões JWT curtas + refresh |
| E-mails (Resend, free tier) | Estouro de cota, abuso para spam | Rate limiting de envio por usuário/evento |

## 2. Proteção de Rotas

### 2.1. Middleware (`src/middleware.ts`)
Todo request a `(auth)/*` e `(admin)/*` passa pelo middleware antes de renderizar:
```ts
// Pseudocódigo do fluxo — implementação real em src/middleware.ts
1. Resolver [estaca_slug] da URL → stake_id (ou usar NEXT_PUBLIC_DEFAULT_STAKE na raiz "/")
2. Ler sessão Supabase do cookie
3. Se rota (auth)/* ou (admin)/* e não há sessão → redirect /login
4. 🔴 CRÍTICO: se claims.stake_id (do JWT) !== stake_id resolvido do slug → 403,
   mesmo com sessão válida (usuário de outra Estaca tentando acessar esta)
5. Se rota (admin)/[slug]/ala/* e claim.role !== 'admin_ala' e !== 'admin_estaca' → 403
6. Se rota (admin)/[slug]/estaca/* e claim.role !== 'admin_estaca' → 403
7. Se rota (super-admin)/* e claim.role !== 'super_admin' → 403
8. Se rota (admin)/[slug]/caravana/[id]/lider/* → verificar se auth.uid() === caravans.caravan_leader_id
   para aquele [id] especificamente (não basta ter role de admin)
```
Middleware é a **primeira** camada, não a única — RLS no banco é a camada que efetivamente impede vazamento mesmo que o middleware tenha uma falha (defesa em profundidade).

### 2.2. Server Actions / API Routes
- Toda Server Action reconfirma `role`/`ward_id` a partir da sessão do servidor (nunca confia em valor vindo do client, mesmo que o client já tenha passado pelo middleware).
- Toda entrada é validada com **Zod** antes de qualquer query — inclusive parâmetros de rota (`params.id`) e query strings.
- Nenhuma Server Action usa a `service_role` key do Supabase — isso é reservado a Edge Functions/jobs que rodam fora do contexto de request do usuário (ex: `pg_cron`, webhooks).

## 3. Rate Limiting

| Endpoint / Ação | Limite sugerido | Motivo |
|---|---|---|
| Login (`/auth/login`) | 5 tentativas / 15 min por IP+e-mail | Força bruta |
| Criação de reserva (`POST /reserva`) | 10 requisições / minuto por usuário | Abertura de inscrições gera pico de concorrência — limitar não trava usuário legítimo, mas impede script tentando "varrer" assentos |
| Leitura de check-in (scanner QR) | 30 leituras / minuto por dispositivo do Líder | Uso legítimo é sequencial (uma pessoa por vez); acima disso é sinal de mau uso |
| Envio de e-mail (Resend) | Throttle por evento — nunca mais de 1 e-mail idêntico por reserva a cada 5 min (evita duplicidade em retry) + fila com backoff se aproximar do limite diário do free tier | Free tier tem cota (ver `docs/PRD.md` seção 6.7) |
| Upload de formulário de menor | 5 uploads / hora por usuário | Evita abuso do Storage |
| Requisições gerais autenticadas | 100 / minuto por usuário (limite generoso, "guarda-chuva") | Proteção geral contra scraping/abuso |

**Implementação sugerida:** middleware de rate limiting baseado em Upstash Redis (tem free tier compatível com Vercel Edge) ou, alternativa mais simples sem dependência extra, uma tabela `rate_limit_events` no próprio Supabase com contagem por janela deslizante — mais barato, sem novo serviço externo, adequado à filosofia de custo zero do projeto.

⚠️ **Atenção especial ao momento de abertura de inscrições:** como a reserva é competitiva entre 6 Alas para 50 assentos, é esperado um pico real de tráfego legítimo no horário anunciado de abertura. O rate limit de criação de reserva deve ser generoso o suficiente para não bloquear um usuário real tentando de novo após uma falha de rede, mas restritivo o bastante para impedir automação. Testar esse cenário de carga antes de cada abertura de caravana popular é recomendado (ver Sprint 10 em `docs/SPRINTS.md`).

## 4. Segurança do QR Code de Check-in

- Token: JWT assinado com chave simétrica mantida apenas server-side (nunca exposta ao client), payload mínimo (`reservation_id`, `caravan_id`, `exp`).
- Validade curta (ex: expira ao fim do dia do embarque de ida/volta).
- Geração **apenas** a partir do status `CONFIRMADO` — nenhuma função de geração aceita outro status como entrada (reforçar isso no nível de tipo do TypeScript, não só em runtime).
- `checkins.unique(reservation_id, direction)` impede replay mesmo que o token seja reutilizado/fotografado.
- Cache offline do scanner armazena tokens localmente **apenas** no dispositivo do Líder de Caravana daquele dia — nunca em `localStorage` acessível por outras origens (usar IndexedDB com escopo do app).

## 5. Segurança de Dados e Documentos Sensíveis

- Bucket `minor-forms` no Supabase Storage: privado por padrão, acesso via signed URL de curta duração, nunca URL pública.
- Toda leitura de documento de menor por um admin gera entrada em `audit_logs` (implementado na Server Action que gera a signed URL, não no Storage em si).
- Dados de CPF/documento tratados como sensíveis mesmo não sendo classificados como "dado de menor" — nunca logados em texto claro em logs de aplicação (Vercel/console).

## 6. Cabeçalhos e Proteções Padrão do Next.js

- CSRF: Server Actions do Next.js já incluem proteção nativa (verificação de origin); confirmar que nenhuma mutação sensível é exposta via `GET`.
- XSS: nunca usar `dangerouslySetInnerHTML` com conteúdo vindo de input do usuário (ex: nome do formulário de permuta) sem sanitização.
- Content-Security-Policy configurada no `next.config.js`, restringindo origens de script (importante dado que o site público é indexável e recebe qualquer visitante).
- HTTPS obrigatório (padrão Vercel).

## 7. Segredos e Configuração

- Todas as chaves (`SUPABASE_SERVICE_ROLE_KEY`, chave do Resend, chave de assinatura do QR) ficam em variáveis de ambiente da Vercel/Supabase — nunca commitadas.
- `.env.local` no `.gitignore` desde o Sprint 0.
- `SUPABASE_SERVICE_ROLE_KEY` usada **somente** em Edge Functions e jobs `pg_cron` — jamais em código que roda no client ou em Server Actions comuns (essas usam o client autenticado do usuário, respeitando RLS).

## 8. Dependências e CI

- `npm audit` (ou Dependabot do GitHub) rodando no CI a cada PR — falha se houver vulnerabilidade de severidade alta sem patch disponível.
- Atualização de dependências revisada manualmente antes de merge (não é para ser automática em produção, dado o volume baixo de commits esperado).

## 9. Checklist de Segurança Antes de Cada Release

- [ ] Todas as tabelas novas têm RLS habilitada e testada (ver checklist de `DATABASE_SCHEMA.md`)
- [ ] Nenhuma rota `(admin)` acessível sem middleware ativo (testar manualmente com sessão de `member`)
- [ ] Rate limiting ativo nos endpoints da tabela da seção 3
- [ ] `npm audit` sem vulnerabilidades altas
- [ ] Nenhum segredo commitado (`git log -p | grep` sanity check antes de releases maiores)
- [ ] QR Code testado quanto a expiração e replay
