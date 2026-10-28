# Plano de Ação e Remediação da Auditoria
### SGCT — Sistema de Gestão de Caravanas ao Templo
**Documento de Planejamento Técnico e Execução Baseado na Auditoria de 21/10/2026**

---

## 1. Visão Geral e Diretrizes de Execução

Este plano traduz os 24 achados da auditoria realizada em 21/10/2026 (`docs/AUDITORIA-2026-10-21.md`) em um roteiro prático e estruturado de trabalho. O objetivo é eliminar todas as vulnerabilidades de segurança, fechar as jornadas reais de ponta a ponta sem atalhos com `service_role`, garantir a integridade dos dados e preparar o sistema para um rollout com risco zero.

### Premissas Inegociáveis (Constituição SGCT v3.0.0):
1. **TDD Obrigatório (Artigo VI):** Nenhum bug ou vulnerabilidade é corrigido sem que um teste automatizado seja escrito primeiro, reproduzindo a falha ou o vetor de exploração.
2. **Isolamento e RLS Real (Artigo I):** Os testes de integração e componentes devem rodar com sessões reais (`anon`, `member`, `ward_admin`, `stake_admin`), nunca mascarando falhas por meio de privilégios `service_role`.
3. **Não-Regressão:** A cada fase, a suíte completa de testes (`npm test` e `npm run test:rls`) deve permanecer 100% verde.

---

## 2. Matriz de Priorização e Fases

O plano está organizado em **5 Fases Sequenciais**, respeitando as dependências técnicas e a criticidade dos bloqueios:

```
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Bloqueios Críticos de Segurança e Banco (C01, C02, A02, A05, A14)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ FASE 2: Fechamento de Jornadas Reais e Autonomia (A03, A04, A06, A07, A09, A10) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ FASE 3: Privacidade, Governança e Integridade LGPD (A01, A08, A12, A13, A15, A16, M01) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ FASE 4: Automação Operacional, Mensageria e Finanças (A11, M02, M03)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ FASE 5: Hardening de Plataforma, CI, Design System e Homologação (M04, M05, M06, T014.15/16) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalhamento das Fases de Execução

---

### 🔴 FASE 1: Bloqueios Críticos de Segurança e Banco de Dados
**Foco:** Eliminar vetores de elevação de privilégio, contorno de RLS e colisões de integridade no PostgreSQL.

#### 1.1 Remediação da RPC de Promoção Atômica (C01)
- **Problema:** `process_waitlist_atomic_promotion` é `SECURITY DEFINER` aberta para `anon`/`authenticated` sem validação de ator, valores ou entidades.
- **Ações:**
  1. Criar migration revogando `EXECUTE ON FUNCTION process_waitlist_atomic_promotion` de `PUBLIC` e `anon`.
  2. Restringir `search_path = public, pg_temp`.
  3. Validar dentro da função: caller deve ser `stake_admin` ou `ward_admin` da Estaca/Ala correspondente; derivar preços e titulares diretamente do banco; aplicar lock (`FOR UPDATE`) nas linhas afetadas.
  4. Revogar os grants padrão amplos (`ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`).
  5. **Testes:** Escrever testes de integração chamando a RPC via API do PostgREST com `anon`, `member`, líder de outra Estaca e verificar rejeição (HTTP 403 / erro SQL).

#### 1.2 Impedir INSERT Direto com Status Forjado em Reservas (C02)
- **Problema:** A policy de INSERT em `reservations` valida apenas `user_id = auth.uid()`, permitindo que um usuário crie sua própria reserva diretamente como `confirmado` ou com valor arbitrário.
- **Ações:**
  1. Alterar a policy de INSERT em `reservations` ou implementar trigger `BEFORE INSERT` que force estritamente o estado inicial como `pendente` e derive `payment_amount` e `stake_id`/`ward_id` da caravana/usuário legítimo.
  2. Bloquear qualquer inserção de assento com status direto `confirmado` ou `pago_ala` vindo de sessões não administrativas.
  3. Validar prazo de inscrição (`registration_deadline`) e capacidade máxima da caravana no banco.
  4. **Testes:** Criar teste tentando fazer `supabase.from('reservations').insert({ status: 'confirmado', ... })` com JWT de membro comum e confirmar que a tentativa é rejeitada ou forçada a `pendente`.

#### 1.3 Correção da Constraint de Unicidade de Assentos (A05)
- **Problema:** A constraint `UNIQUE(caravan_id, seat_number)` impede que um assento cancelado ou expirado seja reservado novamente por outra pessoa.
- **Ações:**
  1. Substituir a constraint global por um índice único parcial (*partial unique index*):
     ```sql
     CREATE UNIQUE INDEX unique_active_seat_per_caravan 
     ON reservations (caravan_id, seat_number) 
     WHERE status IN ('pendente', 'confirmado', 'pago_ala', 'presente');
     ```
  2. Ajustar a RPC de promoção da fila de espera para transferir o assento com segurança atômica.
  3. **Testes:** Teste de expiração de reserva, tentativa de nova reserva no mesmo assento por outro usuário e promoção da fila para a poltrona desocupada.

#### 1.4 Proteção de Policies Administrativas e Integridade (A02)
- **Problema:** `reservations_update_admin` concede UPDATE amplo em todas as colunas sem validação de transição válida de estado.
- **Ações:**
  1. Adicionar trigger `BEFORE UPDATE ON reservations` validando a máquina de estados (ex: transição de `pendente` para `pago_ala` apenas por Admin Ala; de `pago_ala` para `confirmado` apenas por Admin Estaca; bloqueio de alteração de `caravan_id`, `seat_number` ou `user_id` após confirmação).
  2. Restringir updates de dados em `minor_approval_forms` e `aid_requests`.
  3. **Testes:** Tentar alterar valor pago e usuário titular de reserva confirmada via UPDATE direto e garantir rejeição.

#### 1.5 Rate Limiter Atômico e Seguro (A14)
- **Problema:** RPC de rate limit aceita chaves e janelas arbitrárias fornecidas pelo cliente e sofre de race conditions (DELETE/COUNT/INSERT sem lock).
- **Ações:**
  1. Redesenhar a RPC de rate limit: sanitizar chaves no backend (hash seguro do IP + User ID + Contexto); impedir que o cliente passe limites e janelas customizadas.
  2. Utilizar transação atômica com upsert ou lock na chave de rate limit.
  3. **Testes:** Teste de requisições paralelas concorrentes tentando ultrapassar o limite simultaneamente.

---

### 🟠 FASE 2: Fechamento de Jornadas Reais e Autonomia Funcional
**Foco:** Fazer os fluxos do usuário funcionarem ponta a ponta com sessões reais de membro e convidados, sem atalhos com `service_role`.

#### 2.1 Fluxo Real de Upload do Termo de Menor (A03)
- **Problema:** A ação de upload usa a sessão do membro, mas a tabela `minor_approval_forms` só permite escrita por admins, causando falha no INSERT após upload no Storage.
- **Ações:**
  1. Ajustar a policy RLS de `minor_approval_forms` para permitir `INSERT` ao responsável legal da reserva (`reservation.user_id = auth.uid()`).
  2. Garantir transação de compensação: se a persistência no banco falhar, o arquivo recém-enviado ao Storage deve ser deletado imediatamente.
  3. **Testes:** Teste de ponta a ponta: membro faz upload de arquivo mock, registro inserido em `minor_approval_forms` e status refletido na reserva.

#### 2.2 Convidado Inter-Estaca com Repasse Associado (A03)
- **Problema:** Criação de convidado tenta inserir em `guest_transfer_confirmations` com sessão guest, cuja policy exige Admin Estaca.
- **Ações:**
  1. Disponibilizar RPC segura ou Server Action autorizada para registrar a reserva e o vínculo de transferência de convidado atomicamente.
  2. **Testes:** Testar cadastro de convidado com sessão autenticada de `guest` e confirmar inserção da reserva e do registro de repasse.

#### 2.3 Geração e Persistência do Token de Check-in pelo Membro (A03, A10)
- **Problema:** Membro não tem permissão para gravar `qr_token` na reserva (policy só autoriza admin) e o gerador de token usa fallback de segredo hardcoded público se faltar a env.
- **Ações:**
  1. Mudar o fluxo de token de check-in: o token JWT assinado é gerado dinamicamente sob demanda ou gravado via RPC dedicada com validação de titularidade (`user_id = auth.uid()`).
  2. Remover completamente a constante de fallback hardcoded (`sgct-qr-token-secret-fallback-key-32chars`); falhar fechado (*throw Error*) se `QR_TOKEN_SECRET` não estiver configurado.
  3. Exigir `exp` obrigatório na validação do token.
  4. **Testes:** Teste de geração de QR Code com sessão de membro real; teste de rejeição de token expirado ou sem `exp`.

#### 2.4 Consumo Atômico de Crédito Persistido (A04)
- **Problema:** `apply-credit.ts` não persiste o abatimento financeiro no banco, permitindo consumo duplicado em chamadas paralelas.
- **Ações:**
  1. Criar use-case / repositório com transação atômica: bloqueia o crédito (`FOR UPDATE`), verifica se `status = 'active'`, marca como `used` e grava o abatimento de valor diretamente na reserva correspondente.
  2. Integrar a chamada de aplicação de crédito no fluxo de reserva da UI.
  3. **Testes:** Teste de uso concorrente do mesmo crédito em duas reservas simultâneas garantindo que apenas uma tem sucesso.

#### 2.5 Permuta Real de Passageiros (A07)
- **Problema:** Aprovação de permuta cria registro fictício no manifesto (ano 1900) e não substitui o passageiro efetivo, gerando duplicatas.
- **Ações:**
  1. Redesenhar o caso de uso `approveSeatSwap`: atualiza o titular da reserva para o novo membro ou substitui a titularidade da passagem atômica e legalmente, vinculando o novo passageiro com CPF e dados reais.
  2. Ajustar `generatePassengerManifest` para refletir o passageiro real ativo no assento, sem duplicar o passageiro original.
  3. **Testes:** Teste ponta a ponta de permuta: membro A troca com membro B; manifesto gerado contém apenas o membro B naquele assento.

#### 2.6 Conexão dos Casos de Uso Órfãos (A06)
- **Problema:** `processWaitlist`, `RolloverReservationUseCase` e `requestAid` não estão conectados na aplicação real.
- **Ações:**
  1. Conectar a verificação de quórum ao `RolloverReservationUseCase`, gerando os créditos/transferências para os membros afetados com dados consistentes de ponto de embarque.
  2. Injetar `aidRepository` em `createReservationAction` e conectar `requestAid` à interface quando o membro solicita reserva com auxílio.
  3. **Testes:** Testes E2E cobrindo cancelamento por quórum com crédito e criação de reserva com pedido de auxílio financeiro.

#### 2.7 Validação de Liderança de Caravana no Check-in (A09)
- **Problema:** Ações de check-in e marcação de no-show não verificam se o ator é de fato o `caravan_leader_id` da caravana.
- **Ações:**
  1. Implementar autorização estrita: checar se `actingUser.id === caravan.caravan_leader_id` OU se o ator é `stake_admin` daquela Estaca.
  2. Ajustar policies RLS em `checkins` para refletir a mesma regra.
  3. **Testes:** Teste de líder tentando bipar passageiro de outra caravana da qual não é líder (espera rejeição 403).

---

### 🟡 FASE 3: Privacidade, Governança e LGPD
**Foco:** Restringir acessos excessivos do Super Admin, corrigir vazamentos de dados de auxílio e auditar acesso a menores.

#### 3.1 Limitação Constitucional do Super Admin (A01)
- **Problema:** `src/app/(super-admin)/actions.ts` lista membros globais com `service_role`, violando o Artigo II e Artigo VIII da Constituição.
- **Ações:**
  1. Remover a listagem global de membros no painel de Super Admin.
  2. Substituir por busca/lookup pontual e dirigido (ex: busca por e-mail exato do usuário para bootstrap do primeiro Admin Estaca).
  3. Não exibir dados de reservas, financeiro ou histórico de membros no painel de Super Admin.
  4. **Testes:** Testar as Server Actions de Super Admin garantindo que nenhum endpoint retorne listagem irrestrita de membros da base.

#### 3.2 Ocultação de Dados de Auxílio no Calendário Público (M01)
- **Problema:** Calendário público exibe status `Ag. auxílio` associado ao nome do membro.
- **Ações:**
  1. Criar DTO público estrito: expor apenas `name`, `ward_name` e status operacional neutro (`Ocupado`).
  2. Remover `service_role` da página pública do calendário; utilizar cliente anônimo com policy pública apropriada.
  3. **Testes:** Teste verificando que a resposta da rota/página pública não contém termos como `auxilio`, `aid` ou dados financeiros.

#### 3.3 Resiliência do Check-in Offline (A08)
- **Problema:** IndexedDB global, tokens desconhecidos aceitos cegamente no modo offline e perda de pendências na sincronização de lotes parciais.
- **Ações:**
  1. Particionar armazenamento local no IndexedDB por `stake_id` e `caravan_id`.
  2. Validar que o token escaneado offline pertence à caravana ativa antes de registrar localmente.
  3. Na sincronização em lote, unificar contrato (`checkedInAt`) e descartar apenas os itens individualmente confirmados ou com duplicação idempotente; manter itens com erro para inspeção do líder.
  4. **Testes:** Teste de sincronização com lote parcialmente rejeitado; verificar que itens falhos permanecem na fila local.

#### 3.4 Auditoria Obrigatória e Retenção de Menores (A12, A13)
- **Problema:** Visualização de documento de menor não persiste log de auditoria por restrição de RLS e falha silenciosa; purga ignora viagens sem `return_date` e apaga registro se o Storage falhar.
- **Ações:**
  1. Encapsular a geração de URL assinada de documentos de menor em função de backend que persista o `audit_log` de forma atômica e obrigatória; falhar se o log não for gravado.
  2. Ajustar `supabase-retention-repository.ts` para calcular data de encerramento considerando `COALESCE(return_date, departure_date)`.
  3. No job de expurgo, apagar o registro do banco apenas após a confirmação bem-sucedida da exclusão física no Storage.
  4. **Testes:** Teste de consulta a documento de menor verificando presença de log na tabela `audit_logs`; teste de retenção com `return_date` nulo.

#### 3.5 Cadastro Seguro na Edge Function `provision-user` (A15, A16)
- **Problema:** Validação de menores pode ser contornada por outras operações da Edge Function; operações obsoletas de bootstrap continuam expostas; `last_login_at` não é atualizado.
- **Ações:**
  1. Remover operações legadas da Edge Function (`create_ward_admin`, etc.), mantendo apenas o fluxo moderno orientado a D32.
  2. Impor validação estrita de data de nascimento e consentimento dos pais na borda.
  3. Implementar trigger/hook no Auth para atualizar `profiles.last_login_at` a cada login bem-sucedido.
  4. Validar `is_active` no middleware e nos helpers de verificação de permissão.
  5. **Testes:** Teste tentando registrar menor via rota de membro sem consentimento; teste de bloqueio de usuário com `is_active = false`.

---

### 🔵 FASE 4: Automação Operacional, Mensageria e Finanças
**Foco:** Integrar o outbox transacional de e-mails, reconciliar relatórios financeiros e monitorar jobs agendados.

#### 4.1 Outbox Transacional de Notificações (A11)
- **Problema:** Notificações não são disparadas na transição real de estados e processamento de fila não possui lock atômico de claim.
- **Ações:**
  1. Instanciar `NotificationEventDispatcher` nas Server Actions e transições de pagamento, confirmação de lote e fila de espera.
  2. Implementar claim atômico no worker:
     ```sql
     UPDATE notification_queue 
     SET status = 'processing', lease_until = NOW() + INTERVAL '2 minutes' 
     WHERE id IN (
       SELECT id FROM notification_queue 
       WHERE status = 'pending' AND (scheduled_for IS NULL OR scheduled_for <= NOW())
       ORDER BY priority ASC, created_at ASC 
       LIMIT 10 
       FOR UPDATE SKIP LOCKED
     );
     ```
  3. Implementar política de retries com backoff exponencial e limite diário de envios.
  4. **Testes:** Teste com dois workers concorrentes processando a fila garantindo que nenhuma mensagem é enviada em duplicidade.

#### 4.2 Reconciliação dos Relatórios Financeiros (M02)
- **Problema:** Passageiros que mudam para `presente` deixam de ser computados nas receitas; convidados inter-estaca são omitidos no consolidado da Estaca; falta de sanitização contra CSV Injection.
- **Ações:**
  1. Atualizar queries de relatório financeiro para considerar estados finais válidos (`confirmado`, `presente`).
  2. Incluir convidados da Estaca anfitriã no consolidado financeiro da Estaca.
  3. Sanitizar exportação de CSV neutralizando caracteres perigosos no início de campos (`=`, `+`, `-`, `@`).
  4. **Testes:** Teste de integridade do total arrecadado antes e depois do check-in de todos os passageiros; teste de exportação de CSV com payload de fórmula maliciosa.

#### 4.3 Configuração e Observabilidade dos Jobs Agendados (M03)
- **Problema:** Jobs no `pg_cron` dependem de `service_url` e `cron_secret` ausentes na sessão; falta documentação de setup e job de `mark-no-shows`.
- **Ações:**
  1. Documentar no `SETUP.md` a configuração obrigatória de `app.settings.service_url` e `app.settings.cron_secret`.
  2. Criar tabela/mecanismo de log de execução dos crons para acompanhar horário de início, duração, quantidade de registros afetados e erros.
  3. **Testes:** Teste de execução pontual do cron via chamada de API autenticada com secret.

---

### 🟢 FASE 5: Hardening de Plataforma, CI, Design System e Homologação
**Foco:** Cabeçalhos HTTP, esteira de CI, refinamento visual/acessibilidade e saneamento documental de homologação.

#### 5.1 Hardening HTTP e Cabeçalhos de Segurança (M04)
- **Problema:** `next.config.ts` não implementa os cabeçalhos de segurança descritos em `SECURITY.md`.
- **Ações:**
  1. Adicionar `headers()` em `next.config.ts`:
     - `Content-Security-Policy` (CSP) com suporte a scripts, conexões Supabase e câmera/scanner;
     - `X-Frame-Options: DENY` ou `frame-ancestors 'none'`;
     - `X-Content-Type-Options: nosniff`;
     - `Referrer-Policy: strict-origin-when-cross-origin`;
     - `Permissions-Policy: camera=(self), geolocation=()`.
  2. **Testes:** Teste de integração checando headers retornados em rotas públicas e autenticadas.

#### 5.2 Esteira de Integração Contínua (CI) e Gates de Cobertura (M04, M05)
- **Problema:** Repositório sem GitHub Actions versionado e threshold de branches no `jest.config.js` incompatível com a Constituição (60% vs 90%).
- **Ações:**
  1. Criar `.github/workflows/ci.yml` executando `npm run lint`, checagem TypeScript (`tsc --noEmit`), `npm test` e `npm run test:rls`.
  2. Configurar threshold específico de 90% para arquivos em `src/use-cases/**` no `jest.config.js`.
  3. **Testes:** Executar `npm test` com os novos gates e validar conformidade.

#### 5.3 Conclusão do Design System e Acessibilidade (T014.15, T014.16 e Melhorias da Auditoria)
- **Problema:** Tabelas sem visualização em cartões no mobile; alvos de toque inferiores a 48px; labels sem IDs associados; bundle de componentes pesados não modularizado.
- **Ações:**
  1. Implementar visualização em cartões responsivos nas telas de convidados, validação semanal e notificações.
  2. Ajustar alvos de toque para no mínimo 48px (`min-h-[48px]`, `min-w-[48px]`).
  3. Aplicar lazy loading / dynamic imports com `next/dynamic` para `html5-qrcode` e `recharts`, evitando bloqueio de carregamento.
  4. Marcar tarefas T014.15 e T014.16 como concluídas.
  5. **Testes:** Teste de renderização em viewport 320px sem overflow horizontal.

#### 5.4 Saneamento Documental e Validação de Auto-Hospedagem (M06)
- **Problema:** `PILOTO_RELATORIO_FINAL.md` com datas inconsistentes e dados simulados descritos como piloto real; validação de `SETUP.md` feita no mesmo banco.
- **Ações:**
  1. Revisar `docs/PILOTO_RELATORIO_FINAL.md`: distinguir claramente a simulação técnica automatizada de um piloto de campo real; ajustar cronologia e indicadores para refletir com exatidão os ensaios realizados.
  2. Documentar o roteiro de execução do `SETUP.md` em ambiente isolado limpo como pré-requisito formal para onboarding de novas Estacas.

---

## 4. Cronograma de Entregas e Critérios de Aceite (Definition of Done)

| Fase | Foco Principal | Itens Cobertos | Critério de Aceite (DoD) | Status |
| :---: | :--- | :--- | :--- | :---: |
| **Fase 1** | Bloqueios Críticos de Banco | C01, C02, A02, A05, A14 | Zero EXECUTE anônimo em RPCs privilegiadas; sem INSERT forjado de reservas; índice de assento ativo implementado; testes RLS 100% verdes. | ✅ **Concluído** |
| **Fase 2** | Fechamento de Jornadas | A03, A04, A06, A07, A09, A10 | Upload de menor, convidado e QR Code funcionando com sessões comuns; permuta sem duplicatas; uso de crédito atômico. | ✅ **Concluído** |
| **Fase 3** | Privacidade e LGPD | A01, A08, A12, A13, A15, A16, M01 | Super Admin sem listagem global de membros; calendário público sem menção a auxílio; offline particionado e seguro; retenção e auditoria blindadas. | ✅ **Concluído** |
| **Fase 4** | Automação e Finanças | A11, M02, M03 | Outbox ativo com claim atômico; relatórios com status `presente` e convidados; jobs pg_cron documentados e monitorados. | ✅ **Concluído** |
| **Fase 5** | Hardening, CI e UX | M04, M05, M06, T014.15/16 | Headers HTTP ativos; workflow GitHub Actions criado; gates de 90% em use-cases; cartões mobile e alvos de 48px; relatório final saneado. | ✅ **Concluído** |

---

## 5. Próximos Passos Recomendados

Para iniciar a execução de forma controlada e segura:
1. Criar branch de remediação dedicada: `remediation/audit-2026-10-21-phase-1`.
2. Implementar as migrations e correções da **Fase 1**, validando com testes TDD de penetração e RLS.
3. Submeter cada fase para revisão com PR e testes verdes antes de avançar para a próxima etapa.
