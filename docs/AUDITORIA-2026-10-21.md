# Auditoria SGCT — 21/10/2026

## Parecer e escopo

**Parecer: não liberar rollout definitivo antes de corrigir os bloqueios críticos e altos abaixo.** Há implementação substancial e testes verdes, mas os testes não cobrem caminhos importantes da aplicação real.

Código examinado: `C:/Users/Pedro/Desktop/projetos-dev/sgct`, HEAD `0a85757`. A árvore estava limpa antes e depois das verificações. Este relatório está no workspace documental; nenhum código, migration ou configuração da aplicação foi alterado. Os testes de banco criaram suas fixtures no Supabase local e executaram suas rotinas de limpeza.

Foram considerados as specs 000–013 e, adicionalmente, a 014 de design. As tarefas de 000–013 estão marcadas como concluídas; isso não constitui comprovação de aceite. A 014 ainda contém duas tarefas pendentes. Foram inspecionados código, migrations, permissões instaladas no PostgreSQL local, casos de uso, testes e evidências documentais.

**Critério esclarecido pelo responsável durante a auditoria:** nome e Ala dos inscritos podem aparecer no calendário público. Essa exposição autorizada não é um achado. CPF, e-mail, telefone, documentos e outros dados pessoais sensíveis devem continuar protegidos. A exposição de situação de auxílio financeiro é tratada separadamente, sem equipará-la à simples lista de nomes.

Limites: produção e configurações remotas não foram acessadas; não se executaram ataques destrutivos, envios reais de e-mail ou mudanças de permissões. A aplicação HTTP não estava acessível em localhost:3000 durante a verificação; não houve teste visual em navegador, Lighthouse, medição de Core Web Vitals ou build de produção nesta rodada. O parecer sobre UX e desempenho é de revisão de código, com validação visual ainda necessária. Não foi feita varredura exaustiva de todo o histórico Git por segredos.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Testes unitários/componentes/infraestrutura, excluindo integração e RLS | **78 suítes; 357 testes passaram** |
| Integração e RLS, contra Supabase local 127.0.0.1:54321 | **19 suítes; 105 testes passaram** |
| Total executado | **97 suítes; 462 testes passaram** |
| TypeScript: `tsc --noEmit --incremental false` | Passou |
| ESLint, sem autofix | Zero erros; dois avisos na página de check-in |
| Cobertura dos arquivos instrumentados de domain/use-cases | Statements 93,37%; functions 92,86%; branches 73,68% |
| Cobertura somente de use-cases | Statements 93,66%; functions 98,89%; branches 73,68% |
| npm audit, incluindo desenvolvimento | **42 pacotes sinalizados: 35 high, 7 moderate** |
| npm audit, omitindo desenvolvimento | **Zero alertas reportados** |
| PostgreSQL local: execução de promoção da fila | `anon_execute=true`, `user_execute=true`, `SECURITY DEFINER`, proprietário postgres com BYPASSRLS |
| PostgreSQL local: jobs cron | Sete jobs ativos; `app.settings.service_url` e `app.settings.cron_secret` ausentes na sessão inspecionada |

Cobertura calculada a partir do relatório desta execução em `C:/Users/Pedro/AppData/Local/Temp/sgct-audit-coverage-20261021`. A cobertura apresentada **não é cobertura de toda a aplicação**: o coletor não inclui rotas, componentes, Edge Functions, migrations ou a maior parte da infraestrutura.

Os 42 alertas npm são pacotes afetados na árvore, incluindo propagação por dependências; não significam 42 vulnerabilidades independentes exploráveis pela aplicação. Os avisos diretos retornados incluem DoS em braces, postcss-selector-parser e sprintf-js. Fontes: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Recomenda-se atualizar/reconciliar o ferramental em uma branch própria, com testes, sem aplicar upgrades major cegamente.

## Bloqueios críticos

### C01 — RPC financeira permite execução anônima com privilégios do proprietário

**Specs 000, 005, 010.** A migration `supabase/migrations/20261020000001_spec005_waitlist_swap_credit.sql:7` define `process_waitlist_atomic_promotion` como SECURITY DEFINER, sem autenticar chamador, validar Estaca/Ala, confirmar estados anteriores ou derivar o valor/beneficiário do crédito no banco. A função recebe IDs de reservas, assento, usuário, valor e vencimento do client e devolve registros completos.

A migration de fundação concede privilégios amplos, inclusive privilégios padrão para novas funções (`20260816000001_spec000_multi_tenant_foundation.sql:853`). A inspeção do banco **confirmou** EXECUTE para anon e authenticated e proprietário postgres com BYPASSRLS. Portanto, a RLS das tabelas não restringe essa execução privilegiada. Não foi efetuada mutação exploratória em reservas reais.

**Correção:** revogar EXECUTE público/anônimo e os grants padrão excessivos; implementar autorização explícita, derivação de entidades/valores, verificação de estados, locks e idempotência dentro da transação. Restringir search_path. Acrescentar teste pela API RPC com anon, membro, outra Ala, outra Estaca e super_admin, além de retries concorrentes.

### C02 — INSERT direto permite criar a própria reserva já confirmada

**Specs 003, 004, 006, 010, 012, 013.** `reservations_insert` verifica apenas `user_id = auth.uid()` (`migration de fundação:653`). O único trigger instalado em reservations atua no INSERT e deriva tenant/Ala; não impõe estado inicial, preço, prazo, capacidade ou aprovação. As constraints instaladas validam enums e unicidade do assento, mas não o valor devido nem a transição inicial.

Um membro autenticado pode contornar a Server Action e inserir sua própria reserva com status `confirmado`, valor arbitrário e assento fora do limite lógico da caravana. A validação correta de campos no TypeScript não protege a API direta do Supabase. Isto também contorna regras de pagamento, menor e auxílio.

**Correção:** remover escrita genérica de reservas por clientes e disponibilizar operação transacional autorizada, ou impor invariantes equivalentes no banco. Derivar preço e status de entidades confiáveis; verificar prazo, status da caravana, capacidade, titularidade de embarque e unicidade de reserva ativa por participante. Testar entradas maliciosas no mesmo tenant, e não apenas cross-tenant.

## Achados de alta prioridade

### A01 — Super Admin acessa membros e exerce poderes além do limite constitucional

**Specs 000, 001, 010.** `src/app/(super-admin)/actions.ts:258` lista profiles com role admin_estaca **e member**, vinculando nomes, e-mails e Estacas via service_role. As ações de alteração de role e status aceitam userId sem restringir o alvo ao bootstrap do primeiro administrador. D32 autoriza promoção de membros, mas não resolve o conflito com o Artigo II.f nem autoriza listagem global de membros.

**Correção:** limitar respostas e operações ao escopo formalmente aprovado, encapsular operações privilegiadas e alinhar constituição, decisões e specs. Testes atuais de SELECT com JWT super_admin não cobrem o vazamento pela Server Action com service_role.

### A02 — Policies administrativas permitem contornar regras de pagamento e integridade

**Specs 004, 006, 007, 010, 012, 013.** `reservations_update_admin` permite UPDATE amplo por administradores da Ala/Estaca. Não há trigger de UPDATE protegendo transições ou vínculos. Autoaprovação, alteração de valor e mudança de entidades relacionadas podem contornar os casos de uso. As policies de menores, auxílio e repasses também concedem escrita ampla.

**Correção:** permissões por operação/coluna e RPCs que validem ator, entidade, estado anterior e regras de aprovação. Revalidar consistência em UPDATE de chaves relacionadas. Preservar logs para cada transição e testar a API direta dentro da mesma Ala.

### A03 — Caminhos reais de upload, reserva de convidado e QR do membro falham na RLS

**Specs 006, 007, 013.** A ação de upload usa SupabaseMinorRepository com a sessão do membro, mas minor_approval_forms só permite escrita administrativa. O arquivo pode ser enviado ao Storage e o INSERT do registro falhar, deixando arquivo órfão. A criação de convidado insere a reserva e depois tenta inserir guest_transfer_confirmations com a sessão guest; a policy de escrita é exclusiva de Admin Estaca. A reserva pode permanecer sem repasse associado. `requestCheckInTokenAction` valida titularidade e tenta persistir qr_token com a sessão do membro, mas reservations só permite UPDATE administrativo.

**Correção:** operações específicas, autorizadas e transacionais para cada fluxo. Remover arquivo de upload se a persistência falhar. Testar ponta a ponta com credenciais reais de membro, menor e guest. O piloto atual usa service_role nos repositórios, ocultando essas falhas.

### A04 — Crédito é consumido sem persistir o abatimento e sem transação

**Spec 005.** `src/use-cases/credit/apply-credit.ts:83` marca o crédito como used, atualiza somente status e acrescenta payment_amount reduzido apenas no objeto de retorno. O repositório não recebe esse valor. Se a segunda operação falhar, o crédito já foi consumido; chamadas concorrentes também podem passar pelas mesmas leituras. A tabela não concede UPDATE a sessões comuns para consumo de crédito. Além disso, applyCredit não tem chamador de produção na aplicação inspecionada.

**Correção:** persistir crédito e saldo financeiro juntos em transação idempotente, com lock e estado anterior esperado. Definir o fluxo de aplicação na interface conforme a spec e validar o saldo após recarregar do banco. Testar falha intermediária e uso simultâneo do mesmo crédito.

### A05 — Liberação/promoção de assentos conflita com a constraint de unicidade

**Specs 003–006.** A constraint é UNIQUE(caravan_id, seat_number) para todos os estados (`migration de fundação:148`). Expiração/cancelamento altera somente status e mantém seat_number. A RPC de promoção mantém o assento na reserva antiga e atribui o mesmo número à promovida: o caminho esperado conflita com a unicidade e reverte a transação. O mapa pode indicar assento livre embora o INSERT seguinte seja rejeitado.

**Correção:** modelar ocupação ativa explicitamente, preservando histórico e os prazos de liberação aprovados. Usar índice parcial ou entidade separada de ocupação, transação e locks. Testar expirar/cancelar, reservar novamente e promover exatamente para a mesma poltrona.

### A06 — Fluxos de fila, quórum e auxílio não estão totalmente conectados

**Specs 005, 006, 012.** processWaitlist e RolloverReservationUseCase não possuem chamadas de produção localizadas. A verificação de quórum cancela a caravana, mas não aciona a geração/transferência prevista. createReservationAction não injeta aidRepository; requestAid também não possui chamada de produção localizada. Assim, é possível ficar em aguardando_auxilio sem pedido associado, enquanto a interface de aprovação depende desse pedido.

**Correção:** ligar os eventos aos respectivos fluxos transacionais e adicionar testes de aceitação pela entrada real da aplicação. Validar também seat_number e boarding_point_id na nova caravana: o rollover atualmente copia o ponto de embarque da caravana anterior e cria crédito ativo junto de uma reserva confirmada, exigindo reconciliação financeira.

### A07 — Permuta não substitui o passageiro efetivo

**Specs 005, 007.** `src/use-cases/swap/approve-seat-swap.ts` aprova o pedido e adiciona manifesto com nascimento fictício 1900-01-01. Não muda o titular efetivo. O gerador de manifesto continua incluindo o passageiro original e trata as entradas adicionais como crianças de colo. O piloto espera três linhas para dois assentos, incluindo o substituto, e por isso aprova esse resultado incorreto.

**Correção:** modelar substituição de passageiro e documento preservando histórico e pagamento, sem duplicar o original no manifesto. Aprovação e substituição devem ser atômicas; o limite de seis permutas precisa de lock e contagem pela aprovação efetiva, não apenas created_at da solicitação.

### A08 — Check-in offline aceita entrada desconhecida e pode perder pendências

**Spec 007.** `src/components/checkin/qr-code-scanner.tsx:152` procura o token no cache, mas grava e informa sucesso offline mesmo sem correspondência. Em `:194`, qualquer resposta success do lote limpa todas as pendências, incluindo itens cujo resultado individual foi failed. O schema de sincronização espera offlineCheckedInAt, enquanto o client envia checkedInAt; o resultado do parse não é usado. O IndexedDB usa armazenamento global por origem, sem particionamento por usuário/caravana ou expurgo localizado no logout.

**Correção:** validar cache/caravana/validade antes da aceitação offline; remover somente itens confirmados ou duplicados; preservar falhas para recuperação; unificar o contrato e usar o valor validado. Particionar cache e definir expiração/limpeza. Testar lote parcialmente inválido, queda de rede, troca de direção, usuário e caravana.

### A09 — Controle de liderança do check-in está incompleto

**Spec 007.** As ações de check-in verificam autenticação, mas não verificam se o ator é caravan_leader_id da caravana alvo. A policy chamada checkins_insert_leader autoriza administradores da Ala/Estaca, sem testar liderança. Um líder com perfil member não recebe os acessos operacionais necessários; um Admin Ala recebe capacidades sem o vínculo de liderança exigido. getPassengerManifestAction e markNoShowsAction seguem o mesmo padrão de confiar na sessão/RLS, sem autorização funcional explícita.

**Correção:** autorizar por caravana e ação, conforme os papéis aprovados, inclusive nas policies/RPCs. Validar encerramento de embarque e estado temporal antes de no-show. Testar líder designado, não designado e outra caravana.

### A10 — QR tem chave fallback pública

**Specs 007, 010.** generate-checkin-token, validate-checkin e sync-offline-checkins usam a constante `sgct-qr-token-secret-fallback-key-32chars` quando as variáveis faltam. O verificador aceita payload sem exp obrigatório. O ambiente local tem QR_TOKEN_SECRET; o risco da chave pública é **condicional à ausência da configuração** em outra instalação.

**Correção:** falhar fechado sem segredo forte; validar schema completo, expiração obrigatória, finalidade e contexto. Evitar reutilizar segredo de JWT de autenticação para QR. Testar configuração ausente e token sem exp.

### A11 — Notificações existem isoladamente, mas os eventos não estão conectados

**Specs 004–008.** NotificationEventDispatcher não é instanciado em produção e não há chamadas produtivas aos notify*. O processador de fila pode funcionar sem receber os eventos reais. O evento exceeded_capacity_waitlisted está mapeado para WAITLIST_PROMOTED, embora represente ida para a espera. A entrada inicial pago_ala → confirmado não gera o mesmo evento que confirmado/lista_espera.

Além disso, deduplicação depende de Map em memória + SELECT/INSERT; múltiplas instâncias podem duplicar. Workers não fazem claim atômico dos jobs. Não há agendamento exponencial real de retries nem controle persistente da cota diária na fila.

**Correção:** outbox transacional ligado aos eventos, idempotency key no banco, claim com locks/lease, next_attempt_at, recuperação de itens processing e quota compartilhada. Testar eventos reais e dois workers concorrentes, sem enviar e-mails reais durante testes.

### A12 — Retenção de menores pode deixar documentos indefinidamente

**Spec 009.** `supabase-retention-repository.ts:35` filtra apenas return_date: viagens sem retorno informado nunca entram no expurgo, apesar da regra return_date ?? departure_date. Em purge-expired-minor-data, falha ao remover arquivo é capturada e o registro de referência é apagado mesmo assim. O objeto fica órfão e não será reencontrado na próxima execução. Erros de consulta/remoção também podem retornar vazio/zero e aparentar sucesso.

**Correção:** usar data de término calculada no banco; preservar rastreabilidade até remoção confirmada, com retry e métrica de falha. Testar return_date nulo, Storage indisponível, limites de 89/90 dias e reexecução.

### A13 — Auditoria de leitura de menor falha silenciosamente

**Specs 006, 009, 010.** getMinorDocumentViewUrlAction e evaluateMinorFormAction passam a sessão comum para SupabaseAuditLogPort. audit_insert_service aceita apenas service_role. O insert do log é rejeitado, mas recordLog apenas escreve console.error e retorna. Uma URL assinada pode ser entregue sem o registro obrigatório. Além disso, admins têm SELECT direto no bucket, permitindo leitura fora dessa ação auditada.

**Correção:** emissão de URL e auditoria por uma fronteira confiável, sem retornar sucesso se o registro obrigatório falhar; impedir o caminho alternativo de leitura administrativa não auditada. Testar persistência real do log com o ator autorizado.

### A14 — Rate limiter genérico pode ser manipulado e não é atômico

**Spec 010.** `20261021000006_spec010_rate_limit_events.sql` expõe a anon/authenticated uma função SECURITY DEFINER que aceita p_key, p_limit e p_window_seconds arbitrários. DELETE/COUNT/INSERT não possui lock. Clientes podem consumir o orçamento de uma vítima ou usar outra janela para limpar eventos da chave. Requisições simultâneas podem ultrapassar o limite. Chaves abandonadas não têm limpeza global. GENERAL_AUTHENTICATED está definido, mas sem uso localizado. O login usa e-mail sozinho como chave, sem o IP previsto.

**Correção:** derivar sujeito/contexto e limites em backend confiável, normalizar/hash das chaves, locks ou contador atômico e limpeza global. Aplicar limites no endpoint público de provisionamento, além das Server Actions. Testar concorrência e tentativas de adulterar parâmetros. Verificar a compatibilidade do requisito 429/Retry-After com as respostas atuais de Server Actions.

### A15 — Cadastro direto pode contornar proteção de menores e comprovação de e-mail

**Specs 001, 006, 010.** A Edge Function provision-user valida idade e consentimento apenas em register_minor. register_member e register_guest não impõem faixa etária equivalente; a API pública pode receber nascimento de menor usando outra operação. O consentimento é checado no payload, mas não é persistido no profile (confirmado no schema instalado). A função cria contas via Admin API com email_confirm:true, sem limitação própria localizada. Operações antigas create_ward_admin e create_bootstrap_admin continuam acessíveis a atores autorizados na Edge Function, apesar da D32 dizer que esses caminhos foram eliminados.

**Correção:** impor faixa etária e política de consentimento na fronteira pública efetiva, persistir evidência mínima de consentimento e validar data real. Definir confirmação de e-mail e antiabuso para criação pública; remover operações obsoletas conforme D32. Não confiar apenas nas validações da UI.

### A16 — Inativação não reflete login e não revoga capacidades de forma consistente

**Specs 001, 009, 010.** profiles.last_login_at é usado na inativação, mas não há atualização localizada nos fluxos de login/migrations. Contas usadas podem ser inativadas com base na criação. is_active não é consultado pelos helpers RLS de papéis nem pelo middleware em cada operação. Alterar is_active não revoga por si só uma sessão já autenticada. O cache de slug mantém is_active da Estaca sem TTL/invalidação.

**Correção:** atualizar atividade a partir de fonte confiável de Auth, validar perfil/Estaca ativos na autorização e implementar revogação/renovação de sessões adequada. Adicionar TTL ou invalidação do cache e teste de desativação com sessão previamente aberta.

## Achados adicionais e operacionais

### M01 — Calendário público revela situação de auxílio

Nome e Ala estão autorizados pelo responsável. Entretanto, `src/app/(public)/[estaca_slug]/calendario/page.tsx:16` também mostra status financeiros e `Ag. auxílio`, associando necessidade de auxílio ao nome. A consulta atual seleciona nome e status, não CPF, e-mail ou telefone; não foi identificado vazamento desses três campos nessa consulta.

**Recomendação:** manter nome/Ala e, se desejado, apenas um estado operacional público neutro. Remover status que revelem auxílio ou situação financeira individual e definir DTO público com allowlist. Substituir service_role nessa página por operação de leitura explicitamente restrita aos campos aprovados. Testar também o payload HTML/RSC, não apenas os campos visíveis.

### M02 — Relatórios financeiros mudam após check-in e omitem convidados no consolidado

`supabase-financial-report-repository.ts:84` soma somente confirmado e pago_ala. Quando confirmado vira presente, a arrecadação correspondente deixa de entrar no total. O consolidado da Estaca agrega a partir das Alas; convidados com ward_id nulo não aparecem na soma. A exclusão é correta no relatório da Ala, mas deve ser tratada explicitamente no consolidado da anfitriã.

**Recomendação:** separar fatos financeiros dos estados logísticos; adicionar reconciliação para presente, no_show, créditos e convidados conforme a regra aprovada. Testar invariância da arrecadação antes/depois do embarque e impedir CSV formula injection: formatManifestAsCsv escapa aspas, mas não neutraliza campos iniciados por =, +, - ou @.

### M03 — Jobs criados não garantem automação operacional

Os sete jobs estão ativos no banco local, mas as configurações SQL service_url e cron_secret consultadas estão ausentes. SETUP.md orienta conferir a existência dos jobs sem documentar esses dois parâmetros. Criar o agendamento não comprova chamadas HTTP bem-sucedidas. O endpoint mark-no-shows exige caravan_id e não possui agendamento localizado.

**Recomendação:** configurar parâmetros/segredos por mecanismo seguro, documentar a instalação e monitorar execuções reais, falhas e último sucesso de cada job. Validar o ambiente remoto separadamente antes de concluir qualquer coisa sobre produção.

### M04 — Hardening HTTP e controles de arquitetura/CI estão incompletos

next.config.ts contém apenas reactStrictMode, sem os cabeçalhos de proteção descritos em SECURITY.md. Não existe workflow GitHub Actions versionado neste checkout; isso não exclui CI externo, que não foi inspecionado. ESLint não implementa as restrições de dependência de camadas declaradas na constituição. Ações comuns e até páginas públicas usam service_role em desacordo com o Artigo V.

**Recomendação:** configurar CSP compatível com Next.js e scanner, frame-ancestors, nosniff, Referrer-Policy e Permissions-Policy; verificar HSTS no ambiente HTTPS. Centralizar fronteiras privilegiadas, aplicar regras de imports e introduzir CI verificável com testes, RLS, tipos, dependências e secret scanning.

### M05 — Gate de cobertura aprova resultado abaixo do requisito de branches

jest.config.js exige branches 60 e functions 80 globalmente para os arquivos coletados. A constituição exige 90% de branches/functions em use-cases. A execução atual tem branches 73,68% em use-cases e passa. O teste chamado server-actions-zod-audit verifica cenários de approveMinorForm, não todas as Server Actions, apesar do nome e da tarefa declararem cobertura integral.

**Recomendação:** gates por diretório compatíveis com a constituição; ampliar testes de autorização e falhas intermediárias, sem confundir cobertura alta com correção. Manter relatório explícito dos limites da instrumentação.

### M06 — Homologação real não está demonstrada pelos artefatos inspecionados

PILOTO_RELATORIO_FINAL.md afirma piloto concluído em novembro de 2026 e homologação em outubro de 2026. Em 21/10/2026, a cronologia é inconsistente. O documento registra 3,2s de check-in, satisfação 4,92/5 e aprovação total sem evidências primárias de medições/feedback nos artefatos revisados. O teste de self-hosting cria outra Estaca no mesmo banco via service_role; não valida uma segunda instância instalada do zero. O teste do piloto contorna RLS por service_role e confirma comportamento incorreto da permuta.

**Recomendação:** distinguir simulação automatizada de piloto real; corrigir datas e afirmações sem evidência, anexar feedback e divergências verificáveis e executar SETUP em instância separada. Não usar o parecer GO existente como autorização técnica para desativar o processo de fallback.

## Rastreabilidade por spec

| Spec | Situação encontrada / principal pendência |
|---|---|
| 000 Fundação | Base multi-tenant testada; grants/RPC e poderes do super_admin impedem aceite integral |
| 001 Auth/RBAC | Login e perfis implementados; fronteira de cadastro, atividade e revogação precisam correção |
| 002 Caravanas | Gestão implementada; prazos/capacidade não são invariantes suficientes no INSERT direto |
| 003 Reservas | Concorrência do mesmo assento testada; reserva confirmada forjada e liberação após expiração pendentes |
| 004 Pagamentos | Fluxos testados; escrita administrativa direta e integração de eventos precisam correção |
| 005 Fila/permuta/crédito | Bloqueios de segurança, persistência e integração; não considerar concluída |
| 006 Quórum/menores | Cancelamento, upload, auditoria e rollover não fecham o fluxo real |
| 007 Check-in | Assinatura e testes existem; QR do membro, liderança e offline precisam correção |
| 008 Notificações | Templates/fila testados; eventos produtivos, concorrência, backoff e cota incompletos |
| 009 Relatórios/LGPD | Relatórios implementados; totais, retenção e atividade precisam correção |
| 010 Hardening | RLS testada em cenários existentes; RPC, bypass no mesmo tenant, rate limiter e CI incompletos |
| 011 UAT/piloto | Simulações verdes; piloto real e segunda instalação não comprovados pelos artefatos |
| 012 Auxílio | Casos de uso/repositórios testados; falta integração de criação do pedido no caminho real |
| 013 Convidados | Isolamento testado; criação com sessão guest não conclui o repasse associado |
| 014 Design, adicional | Evolução visível no código; duas tarefas abertas e validação visual/acessível ainda pendente |

## Melhorias de responsividade e desempenho

1. **Cartões mobile para todas as listas operacionais.** O calendário administrativo tem cartões, mas convidados, validação semanal e métricas de notificações ainda dependem de tabelas com overflow horizontal. A CSS global overflow-wrap:anywhere nas células favorece palavras quebradas em colunas estreitas. Adotar uma apresentação móvel própria, não apenas comprimir a tabela.
2. **Alvos de toque e rótulos.** Há botões min-h-9/min-h-10 e texto text-xs em ações importantes, abaixo do alvo de 48px do DESIGN.md. No formulário de caravana há labels sem htmlFor/id associado. Revisar leitura por teclado/leitor de tela, foco dos modais e mensagens inline; substituir alert/confirm por feedback acessível sem perder confirmação de ações destrutivas.
3. **Automação visual de aceite.** Testar 320, 360, 390, 440, 768 e 1280px; zoom 200%; nomes e textos longos; listas vazias/grandes; orientação horizontal; teclado e leitor de tela. Executar axe e fluxo E2E de cadastro até acompanhamento da reserva. Esses ensaios não foram realizados visualmente nesta rodada.
4. **Paginação real e consultas agregadas.** Listas, relatórios, retenção e jobs buscam arrays completos e agregam/filtram em memória. O limite PostgREST local é 1000 linhas; relatórios e jobs podem ficar incompletos silenciosamente. Aplicar cursor/paginação e agregação SQL, filtros de prazo no banco, índices adequados e processamento em lotes com progresso.
5. **Auth listUsers paginado.** Buscas e listagens administrativas chamam listUsers sem percorrer páginas, podendo deixar e-mails ausentes e não localizar usuários. Substituir varredura global por lookup autorizado adequado ou projeção mínima confiável, com paginação explícita quando necessária.
6. **Carregamento do scanner e gráficos.** Usar importação sob demanda das bibliotecas pesadas, iniciar câmera só quando solicitada, encerrar tracks ao sair e medir bundle/INP em dispositivo modesto. Preservar resumo textual dos gráficos e não bloquear a página com widgets secundários.
7. **Jobs e filas com lote/claim.** Aplicar locks por caravana, idempotência e leases; monitorar duração, retries e backlog. Evitar longas sequências de round-trips e sobreposição de jobs em ambientes serverless.
8. **Medição antes de prometer desempenho.** Estabelecer orçamento de payload/bundle e metas de LCP, INP e CLS; medir em build de produção com rede móvel e CPU reduzida. Adicionar observabilidade de falhas de reserva, leituras negadas, expurgo e notificações sem registrar documentos, tokens ou CPF em claro.

## Ordem recomendada de remediação

1. **Bloquear release:** C01 e C02, revisão de grants/RPC/RLS e exposição de operações privilegiadas.
2. **Fechar jornadas reais:** upload de menor, QR do membro, convidado, créditos, promoção de fila, permuta, auxílio e cancelamento por quórum. Testar com sessões reais, sem service_role nas ações comuns.
3. **Proteger dados e confiabilidade:** auditoria obrigatória, retenção, offline sem perda, cadastro de menor e isolamento/atividade de sessões.
4. **Tornar automações operacionais:** eventos/outbox, cota/backoff, cron com configuração e monitoramento verificáveis, relatórios reconciliados.
5. **Concluir qualidade e aceite:** dependências, CI/gates, cabeçalhos, testes visuais/performance e novo piloto com evidência real e fallback preservado.

O fechamento exige testes novos para os caminhos omitidos, reaplicação das migrations em banco local descartável separado, reexecução da suíte e comprovação de aceite operacional. Testes verdes atuais são um ponto positivo, mas não substituem esses critérios.
