# Plano de remediação e preparação do SGCT

Data: 21/10/2026. Fase 01 executada; Fases 02–11 pendentes. Referência: [auditoria de 21/10/2026](AUDITORIA-2026-10-21.md).

## Premissas confirmadas pelo responsável

- O sistema opera somente em desenvolvimento local. Ainda não existe deploy de produção na Vercel. As fases abaixo são preparação para a primeira implantação; não constituem resposta a incidente de produção.
- O Super Admin cria Estacas e promove a Admin Estaca um membro que já criou sua própria conta.
- O Admin Estaca não promove outro Admin Estaca. Ele promove membros previamente cadastrados da própria Estaca a Admin Ala, com vínculo de Ala válido.
- Admin Ala e membro não promovem administradores. Nenhum painel administrativo cria a conta do participante ou define a senha inicial dele.
- Nome e Ala dos inscritos podem ser públicos. CPF, e-mail, telefone, documentos e informação sensível de auxílio ficam restritos aos contextos autorizados. Paleta, tipografia, Lucide e Recharts permanecem conforme as decisões já tomadas.
- O trabalho deste documento é planejamento. Não há autorização implícita para deploy, alteração de produção, exclusão de dados locais, envio de e-mails reais, merge ou criação de contas externas.

## Conferência constitucional antes de implementar administradores

> Registro histórico do planejamento: a conferência abaixo descreve a v3.0.0 antes da Fase 01. Em 21/10/2026, a execução autorizada emendou a constituição para v4.0.0, alinhou decisões/specs e revisou os 15 planos. Ver `REVISAO-CONSTITUCIONAL-4.0.0.md` e `BASELINE-FASE-01.md`. A implementação de promoções permanece para a Fase 03.

Foi consultada a constituição **v3.0.0 do repositório de código**, em `C:/Users/Pedro/Desktop/projetos-dev/sgct/.specify/memory/constitution.md`:

- Artigo II.e, linha 21: define a hierarquia super_admin > admin_estaca > admin_ala > member/menor, mas não descreve as operações de promoção.
- Artigo II.f, linha 22: ainda restringe Super Admin a cadastrar novas Estacas e **cadastrar o primeiro admin_estaca**. Também proíbe leitura de perfis de membros e exige emenda formal para exceções.
- Artigo X, linha 57: exige motivo, versão semântica e revisão dos plans ao alterar artigos.
- `docs/DECISIONS.md:38`, D32: documenta que **admin é promovido, não criado**; Super Admin promove member → admin_estaca e Admin Estaca promove member → admin_ala na própria Estaca. Revogação retorna a member, preservando conta/histórico.
- A US-001.3 já contém promoção de membro existente a Admin Ala. A spec 000 ainda pede criação de exatamente um perfil admin_estaca.

**Conclusão:** a regra confirmada pelo responsável está na D32 e parcialmente na spec 001, mas **não está integralmente incorporada à constituição**. Não interpretar a hierarquia como autorização genérica para promover qualquer papel. Antes da implementação administrativa, executar o alinhamento documental da Fase 01. Este plano não altera nem declara ratificada uma emenda.

A cópia documental em `sgct-sdd` está desatualizada em relação ao repositório: não contém a D32 e conserva decisões duplicadas. Usar o repositório de código como referência da versão implementada e reconciliar somente os documentos necessários, preservando o histórico.

## Matriz de permissões que deverá ser formalizada

| Ator | Operação permitida | Alvo e escopo | Proibição explícita |
|---|---|---|---|
| Super Admin | Criar Estaca; promover member → admin_estaca | Conta existente, vinculada à Estaca escolhida | Criar conta administrativa pelo painel; consultar operação financeira, reservas ou documentos de membros |
| Admin Estaca | Promover member → admin_ala | Membro e Ala da própria stake_id | Promover admin_estaca; operar outra Estaca; atribuir super_admin |
| Admin Ala | Operação da própria Ala prevista nas specs | Própria ward_id/stake_id | Promover papéis administrativos |
| Membro | Cadastro e atualização permitida do próprio perfil | Própria conta | Alterar role, tenant, Ala ou ativação por payload próprio |

A identificação de candidato à promoção deve oferecer busca dirigida e dados mínimos, não listagem global de membros com dados de contato. A exceção mínima necessária para esse lookup deve constar da emenda, sem conceder SELECT genérico de profiles ao Super Admin. A busca por e-mail já prevista na D32/spec 001 pode confirmar nome, Ala e elegibilidade sem retornar campos não necessários.

Revogação segue a D32 existente: executada pela autoridade correspondente, retorna a member, preserva histórico e invalida capacidades administrativas anteriores. Não estender revogação, desativação de contas ou gestão de Estacas além do que estiver formalizado nas specs.

## Organização do trabalho

Corrigir e complementar as specs existentes 000–014; não criar novas regras de negócio para solucionar falhas técnicas. Cada fase deverá atualizar os spec.md/plan.md/tasks.md afetados antes do código, com checagem constitucional explícita. Não marcar tarefas como concluídas apenas porque há um caso de uso ou teste mockado.

Usar branches de correção no formato oficial `fix/spec-NNN-slug/descricao`; alterações de regra/documentação exigem primeiro o alinhamento SDD. As sugestões abaixo são nomes para a execução futura: nenhuma branch foi criada ou trocada neste planejamento. Cada fase deve ser integrada e validada antes de iniciar a próxima dependente.

| Fase | Entrega | Depende de | Specs principais |
|---|---|---|---|
| 01 | Governança, baseline e plano de testes | — | 000, 001, 010, 011, 014 |
| 02 | Fechamento das brechas de banco | 01 | 000, 003, 004, 010 |
| 03 | Identidade, promoções e sessões | 01–02 | 000, 001, 010 |
| 04 | Ocupação, fila, pagamentos, créditos e permutas | 02–03 | 002–006 |
| 05 | Menores, auxílio, convidados e retenção | 02–04 | 001, 006, 009, 012, 013 |
| 06 | QR, liderança, check-in e offline | 03–05 | 007, 010 |
| 07 | Eventos, notificações e automações | 04–06 | 004–009 |
| 08 | Relatórios e projeções públicas | 04–07 | 002, 007, 009, 013 |
| 09 | Hardening, dependências e gates completos | 02–08 | 010 |
| 10 | Responsividade, acessibilidade e desempenho | APIs das fases anteriores estabilizadas | 014 e telas das demais |
| 11 | Homologação local, instalação limpa e preparação Vercel | 01–10 | 010–011 |

A infraestrutura mínima de CI/testes é preparada na Fase 01 e usada desde a primeira correção. A Fase 09 conclui os gates; não deixa segurança e testes para o final. A revisão de UX pode preparar inventário enquanto os contratos mudam, mas o aceite visual depende das telas finais.

## Fase 01 — Governança e baseline

Branch utilizada: `docs/plano-remediacao-auditoria`, previamente criada pelo responsável.

- [x] R01.1 — Formalizar, como primeira alteração documental, o fluxo de promoção confirmado: atualizar Artigo II.e/f e decisões relacionadas; remover a limitação obsoleta de criar o primeiro perfil, preservando menor privilégio. Propor versão 4.0.0 conforme Artigo X, com motivo e revisão dos plans afetados. Na proposta, a versão ainda não estava aplicada; na execução desta fase a emenda v4.0.0 foi registrada.
- [x] R01.2 — Alinhar D22/D32, specs 000/001, planos, tarefas, SECURITY, DATABASE_SCHEMA, SETUP e AGENTS. Registrar a projeção pública de nome/Ala como exceção estritamente delimitada, sem abrir tabelas pessoais.
- [x] R01.3 — Corrigir documentação de piloto para indicar simulação local e pendências reais; preservar resultados que possuam evidência. Definir o que será homologação local e o que só poderá ser declarado após piloto real.
- [x] R01.4 — Inventariar endpoints, Server Actions, Edge Functions, RPCs, grants, RLS, buckets e jobs, com ator autorizado e teste correspondente.
- [x] R01.5 — Preparar runner de integração com trava que rejeite qualquer host não local/não explicitamente descartável; credenciais isoladas e limpeza limitada a fixtures. Criar CI mínimo com lint, tipos, testes e Supabase descartável.
- [x] R01.6 — Capturar baseline dos testes, cobertura e dependências; mapear cada achado a uma tarefa e critério de aceite. Reabrir aceites afetados, sem apagar histórico nem sobrescrever indiscriminadamente a cópia documental.

Aceite da Fase 01: documentação alinhada, inventário revisável e baseline executado; trava exige destino loopback e bloqueia URLs remotas. CI preparado, ainda sem execução hospedada. Evidências e limites em `BASELINE-FASE-01.md`; nenhum deploy/piloto real realizado. A trava de URL não é isolamento de rede contra túneis ou proxies configurados manualmente.

## Fase 02 — Segurança da fronteira de banco

Branch sugerida: `fix/spec-010-seguranca-hardening/contratos-rls-rpc`.

- [ ] R02.1 — Escrever testes que falhem para EXECUTE anônimo da promoção, INSERT próprio já confirmado e UPDATE administrativo que burle regras. Incluir API RPC, PostgREST direto e sessão real.
- [ ] R02.2 — Revogar grants amplos/defaults perigosos; inventariar e conceder explicitamente privilégios de cada objeto. Separar schemas internos de operações expostas quando necessário; fixar search_path de funções privilegiadas.
- [ ] R02.3 — Impedir INSERT/UPDATE genérico de estado financeiro e segurança. Definir RPCs específicas com ator derivado da sessão, perfil ativo, tenant/Ala, estado anterior e regras aprovadas verificados no banco.
- [ ] R02.4 — Derivar preço, estado inicial e escopo de reserva; validar caravana aberta, prazo, limite de assentos, capacidade de espera e ponto de embarque pertencente à caravana. Não confiar em status/valor/tenant do payload.
- [ ] R02.5 — Proteger consistência em UPDATE de entidades relacionadas e verificar unicidade de reserva ativa conforme a spec. Não inventar política de múltiplas reservas: confirmar o requisito existente antes de acrescentar uma nova restrição.
- [ ] R02.6 — Definir chaves de idempotência, locks por agregado e resultados de replay; registrar eventos de auditoria dentro das transações sensíveis. Manter service_role apenas nas fronteiras permitidas pela constituição, como Edge Functions e jobs.

Aceite: anon, membro, Admin Ala de outra Ala, Admin Estaca de outra Estaca e Super Admin não conseguem executar operações fora do escopo, inclusive chamadas manuais à API. Operações autorizadas continuam funcionando. Migrations reaplicáveis num banco local descartável separado.

## Fase 03 — Identidade e promoções administrativas

Branch sugerida: `fix/spec-001-autenticacao-rbac/promocoes-sessoes`.

- [ ] R03.1 — Implementar busca dirigida de candidato já cadastrado e ativo, por e-mail/contexto de Estaca conforme spec, sem varredura/listagem global de profiles ou Auth users. Evitar dependência de listUsers limitado à primeira página.
- [ ] R03.2 — Centralizar promoção autorizada com verificações no backend confiável: Super Admin promove somente a Admin Estaca; Admin Estaca promove somente a Admin Ala da própria Estaca. Validar papel anterior elegível e vínculo da Ala. Admin Estaca nunca promove seus pares.
- [ ] R03.3 — Remover operações antigas de criação administrativa da Edge Function e chamadas obsoletas; preservar seed independente do primeiro Super Admin da instância.
- [ ] R03.4 — Tornar alteração de permissões e atualização da sessão recuperáveis e auditadas. Preferir banco como fonte autoritativa para autorização sensível; não depender de duas escritas independentes e de claims antigas para revogar privilégio.
- [ ] R03.5 — Atualizar atividade de login por fonte confiável; impedir edição própria desse indicador. Aplicar perfil/Estaca ativos na autorização, renovar/revogar capacidades conforme necessário e invalidar/expirar cache de tenant.
- [ ] R03.6 — Proteger cadastro público efetivo: validar datas reais/faixa etária em cada operação, consentimento quando aplicável e antiabuso. Persistir evidência mínima de consentimento e versão do texto. Documentar a política de comprovação de e-mail antes de mudar esse comportamento; usar caixa de e-mail local no desenvolvimento.

Aceite: matriz de promoção coberta por testes positivos e negativos; conta não é criada pelos painéis; pessoa de outra Estaca e payload de autoelevação são rejeitados; sessões antigas perdem poderes após revogação; troca entre visão de membro/admin não altera role. Atualização de contato próprio permanece disponível.

## Fase 04 — Integridade financeira, assentos, fila e permutas

Branch sugerida: `fix/spec-005-fila-espera-permuta-credito/transacoes-ocupacao`.

- [ ] R04.1 — Modelar ocupação ativa com histórico: índice parcial de ocupação ou entidade equivalente, liberando somente nos prazos/eventos previstos. Tratar expiração/cancelamento e promoção numa transação com lock.
- [ ] R04.2 — Reimplementar promoção autorizada derivando reserva desocupada, primeiro candidato elegível, assento e crédito. Conectar o evento real à promoção. Não antecipar confirmação ou pagamento em desacordo com a spec.
- [ ] R04.3 — Persistir consumo de crédito e abatimento financeiro na mesma transação, rejeitando reuso concorrente e mantendo o preço original/reconciliação. Conectar a aplicação de crédito ao fluxo previsto. Formalizar antes qualquer comportamento não definido de crédito parcial, saldo excedente ou funding_source; não decidir essas regras no código.
- [ ] R04.4 — Corrigir titularidade de permuta, documento e manifesto; remover datas fictícias e duplicação como criança de colo. Manter histórico do original e revogar comprovantes que deixem de representar o passageiro efetivo. Contagem/limite de seis aprovações no embarque deve ser atômica e baseada na data correta.
- [ ] R04.5 — Ligar cancelamento por quórum ao tratamento financeiro/rollover existente; garantir idempotência e impedir crédito disponível junto de uma nova viagem confirmada sem compensação contábil. Validar assento e embarque na caravana de destino; aplicar a regra aprovada quando não houver vaga.
- [ ] R04.6 — Revalidar bloqueio de autoaprovação, data de transferência, ranking, elegibilidade de menores e prioridade da anfitriã nas operações transacionais, inclusive acesso direto ao banco.

Aceite: testes reais de corrida pelo mesmo assento, liberação/reocupação, promoção para a mesma poltrona, uso simultâneo de crédito, retries e falha intermediária. Valores recarregados do banco devem corresponder à tela; uma permuta deve gerar exatamente um passageiro efetivo por assento.

## Fase 05 — Menores, auxílio, convidados e retenção

Branch sugerida: `fix/spec-006-quorum-menores/jornadas-protegidas`.

- [ ] R05.1 — Fechar upload de menor com sessão real: autorização por reserva, tipo/tamanho verificados antes de carregar bytes desnecessários, registro consistente, remoção compensatória de arquivo em falha e reenvio seguro.
- [ ] R05.2 — Emitir URL curta de documento apenas pelo fluxo autorizado com log obrigatório; remover leitura administrativa direta que contorne auditoria. Falha ao persistir auditoria impede entrega da URL.
- [ ] R05.3 — Ligar pedido de auxílio ao caminho definido pela spec e ao ator administrador autorizado. Resolver atomicidade entre reserva/pedido, aprovação/reprovação e pagamento; apresentar alerta de antecedência já previsto. Não manter pedido invisível ou reserva órfã.
- [ ] R05.4 — Criar reserva guest e registro de transferência numa operação autorizada e atômica; preservar ausência de ward_id, escopo anfitrião, prioridade dos membros e exclusão dos relatórios de Ala.
- [ ] R05.5 — Corrigir retenção usando return_date ou departure_date, paginação e retries. Só concluir remoção após tratar arquivo e registro de forma rastreável; monitorar órfãos e falhas sem falsos sucessos.
- [ ] R05.6 — Testar idades, consentimento, aprovação bloqueante quando exigida, 89/90 dias de retenção, retorno nulo, Storage indisponível e expiração de crédito em 12 meses.

Aceite: os fluxos funcionam a partir das entradas reais com member/menor/guest; a sessão de service_role não mascara o teste. Não ficam arquivos, pedidos ou reservas órfãos após falha simulada.

## Fase 06 — Check-in online e offline

Branch sugerida: `fix/spec-007-checkin-qrcode/validacao-offline`.

- [ ] R06.1 — Permitir ao titular solicitar/persistir QR pelo contrato restrito; exigir estado e aprovações previstos. Remover segredo fallback público, rejeitar configuração ausente e validar payload/expiração/finalidade/contexto.
- [ ] R06.2 — Autorizar scanner, manifesto e encerramento por usuário/caravana conforme liderança e papéis da spec; não confiar no nome da policy. Validar caravana/direção/tempo da operação e limitar lotes de sincronização.
- [ ] R06.3 — Unificar contrato checkedInAt entre cliente/schema/backend; usar o resultado validado e rejeitar timestamp inválido. Definir verificação temporal de sincronização tardia sem aceitar arbitrariamente a data informada pelo client.
- [ ] R06.4 — Validar token no conjunto autorizado offline, direção, contexto e validade. Separar estado pendente de confirmação definitiva. Não mostrar embarque aceito para QR desconhecido.
- [ ] R06.5 — Particionar IndexedDB por usuário/Estaca/caravana; expirar cache e limpar dados pessoais no momento apropriado, preservando pendências não sincronizadas de forma explícita e recuperável. Não descartar pendências silenciosamente no logout.
- [ ] R06.6 — Sincronizar por item com idempotência; remover apenas sucesso/duplicata, preservar falhas e permitir recuperação. Encerrar câmera/tracks ao sair; recuperar queda de rede e evitar múltiplos leitores ativos.

Aceite: leituras duplicadas e dois dispositivos não duplicam presença; lote parcialmente inválido preserva falhas; cache de outra caravana/usuário é recusado; testes incluem direção de volta, ausência de rede e reabertura do app.

## Fase 07 — Eventos, notificações e jobs operacionais

Branch sugerida: `fix/spec-008-notificacoes/eventos-fila-cron`.

- [ ] R07.1 — Gravar outbox junto à transação de negócio e conectar pagamento, confirmação, promoção, espera, cancelamento, expiração, menor e auxílio aos eventos corretos. Diferenciar entrada na espera de promoção.
- [ ] R07.2 — Deduplicar no banco por chave de evento/entidade/destinatário, sem depender do Map de uma instância. Usar claim atômico, locks/leases e recuperação de processing abandonado.
- [ ] R07.3 — Implementar next_attempt_at, backoff exponencial, teto de tentativas e controle diário compartilhado da cota. Tratar timeout após envio com idempotência do provedor quando disponível; não prometer exatamente uma entrega externa sem essa garantia.
- [ ] R07.4 — Consultar métricas com autorização de Admin Estaca e escopo correto; evitar executar função que espera contexto do usuário com cliente service_role sem a identidade exigida.
- [ ] R07.5 — Configurar os jobs no ambiente local com URL/segredo seguros, documentando a diferença entre URL do host e URL alcançável pelo container. Usar servidor local acessível para testar chamadas reais, sem deploy.
- [ ] R07.6 — Validar último sucesso, erros, backlog e duração de todos os jobs: validação semanal, expiração de reservas/créditos, quórum, notificações, retenção e inativação. Fechar o gatilho de no-show conforme o encerramento operacional aprovado.

Aceite: evento produzido pelo fluxo real chega à caixa local; dois workers não enviam o mesmo job por corrida; retry respeita intervalo; teste verifica execução HTTP do cron, não somente existência em cron.job. Não enviar e-mails reais nos testes.

## Fase 08 — Relatórios e calendário público

Branch sugerida: `fix/spec-009-relatorios-lgpd/reconciliacao-projecoes`.

- [ ] R08.1 — Separar fatos financeiros de status logístico: total não pode diminuir por check-in. Reconciliar créditos, no-show e convidados de acordo com regras aprovadas, mantendo guest fora do relatório da Ala e explícito no consolidado anfitrião.
- [ ] R08.2 — Agregar/paginar relatórios no banco para não truncar em 1000 linhas; validar exportações PDF/CSV, caracteres acentuados, quebras e neutralização de fórmulas perigosas.
- [ ] R08.3 — Criar projeção pública com allowlist de nome e Ala, ocupação agregada e campos logísticos autorizados. Remover estado de auxílio/financeiro individual; não expor CPF, e-mail, telefone, documento ou token em HTML, RSC, JSON ou cache.
- [ ] R08.4 — Retirar service_role das páginas públicas e das Server Actions comuns; lookup mínimo autorizado para promoções sem dar acesso genérico aos perfis. Garantir cache público sem dados de sessão e impedir cache compartilhado de resposta privada.
- [ ] R08.5 — Revisar solicitação LGPD: finalidade, persistência, protocolo, limites de tamanho, antiabuso, tenant resolvido de contexto confiável e ausência de CPF em logs gerais. Não executar exclusões reais durante a homologação.

Aceite: total financeiro é invariável antes/depois do embarque; volumes acima do limite REST não truncam resultados; nomes/Alas continuam públicos; campos restritos não aparecem nem na resposta de rede.

## Fase 09 — Hardening, dependências e qualidade

Branch sugerida: `fix/spec-010-seguranca-hardening/gates-hardening`.

- [ ] R09.1 — Reescrever limiter genérico com identidade/limites derivados em contexto confiável, operação atômica e limpeza global. Proteger login, cadastro direto, reserva, upload, scanner, sincronização e contato LGPD conforme o risco de cada fluxo. Rejeitar manipulação de janela/chave/limite pelo client.
- [ ] R09.2 — Aplicar limite guarda-chuva previsto, normalização das chaves e proteção contra bloqueio intencional da conta de terceiro. Formalizar resposta compatível com Server Actions e 429/Retry-After em endpoints HTTP aplicáveis.
- [ ] R09.3 — Configurar CSP, frame-ancestors, nosniff, Referrer-Policy e Permissions-Policy; testar scripts/hidratação, câmera e Storage. Definir HSTS para futuro ambiente HTTPS, sem quebrar o localhost.
- [ ] R09.4 — Atualizar dependências vulneráveis de desenvolvimento em mudanças pequenas, avaliando compatibilidade Jest/ts-jest/Tailwind. Repetir audit e testes; não executar audit fix --force indiscriminadamente nem trocar o design system para resolver uma dependência.
- [ ] R09.5 — Aplicar lint de camadas, server-only em módulos sensíveis e validação Zod completa com limites nos payloads/arquivos/lotes. Fazer varredura de segredos no HEAD/histórico sem imprimir valores; prever rotação apenas se houver exposição comprovada.
- [ ] R09.6 — Concluir CI com instalação reproduzível, lint, tipos, build, unitários, integração/RLS, E2E e audit/secret scanning. Gate: use-cases com mínimo de 80% e branches/functions de 90%, além dos requisitos globais constitucionais. Definir denominadores/exclusões transparentemente; não reduzir thresholds para passar.

Aceite: parâmetros maliciosos e corrida não burlam limites; suíte completa verde; vulnerabilidades altas resolvidas ou impedimento explicitamente registrado; nenhum segredo exposto; gate não aprova cobertura de branches abaixo da constituição.

## Fase 10 — UX/UI, acessibilidade e desempenho

Branch sugerida: `fix/spec-014-design-system-ux/responsividade-desempenho`.

- [ ] R10.1 — Inventariar telas públicas, membro, Admin Ala/Estaca e Super Admin. Adaptar listas restantes para cartões mobile, incluindo convidados, validação semanal e métricas; manter identificação, valores e ações sem rolagem horizontal obrigatória.
- [ ] R10.2 — Remover quebra arbitrária de palavras nas tabelas; padronizar 48px nas ações principais, texto legível, labels associados, foco visível, modais com gerenciamento de foco e feedback inline. Preservar confirmação das operações destrutivas.
- [ ] R10.3 — Preservar paleta/tipografia do DESIGN.md, Lucide e Recharts; revisar hierarquia, estados de carregamento/erro/vazio e clareza entre reserva, pagamento e confirmação. Alternância membro/admin funciona nos dois sentidos sem elevar privilégio.
- [ ] R10.4 — Testar 320, 360, 390, 440, 768 e 1280px, zoom 200%, nomes longos, listas extensas, teclado, leitor de tela e orientação horizontal. Executar axe e testes de navegação, não apenas screenshots.
- [ ] R10.5 — Paginar listagens e jobs; filtrar datas no SQL; eliminar SELECT * e consultas N+1 quando desnecessários; criar índices guiados por EXPLAIN/medição, com volume de teste acima de 1000 registros.
- [ ] R10.6 — Carregar scanner/gráficos sob demanda, controlar câmera e conexões e otimizar fontes/assets; medir bundle, payload, LCP/INP/CLS em build local de produção com CPU/rede móvel simuladas. Propor metas de LCP ≤2,5s, INP ≤200ms e CLS ≤0,1 no cenário documentado; não alegar p75 de usuários reais sem dados de campo.
- [ ] R10.7 — Medir latência e erro no pico de reservas e jobs. Registrar condições/volume, preservar limites legítimos e observar contenção no banco. Adicionar métricas sem CPF, tokens ou conteúdo de documentos nos logs.

Aceite: jornadas principais utilizáveis no celular; sem perda de foco/informação no zoom; relatórios e listas não truncam; benchmarks e screenshots têm condições reproduzíveis, antes/depois e limitações registradas.

## Fase 11 — Homologação local e preparação da primeira implantação

Branch sugerida: `fix/spec-011-uat-piloto/homologacao-pre-deploy`.

- [ ] R11.1 — Reexecutar as 97 suítes/462 testes de baseline e os novos testes. Revisar testes que usam service_role para simular operações de usuário: serviço só prepara fixtures; ações reais usam tokens dos papéis.
- [ ] R11.2 — Executar E2E com duas Estacas e duas Alas por Estaca: cadastro, promoções, reserva, pagamentos, menor, auxílio, guest, crédito, fila, permuta, QR, offline, relatórios e privacidade. Acrescentar tentativas diretas à API no mesmo tenant e cross-tenant.
- [ ] R11.3 — Validar migrations desde zero em instância local descartável independente e instalação seguindo SETUP, com portas/projeto distintos do banco de desenvolvimento. Não resetar o banco atual sem autorização específica; preservar dados locais necessários.
- [ ] R11.4 — Rodar build e servidor local de produção; verificar cabeçalhos, hidratação, cache, cookies, fluxos e bundle. Simular variáveis ausentes, Storage/rede indisponíveis, falha de worker e reinício do processo.
- [ ] R11.5 — Realizar homologação com usuários reais em ambiente local acessível e dados adequados a teste; coletar feedback e corrigir divergências com rastreabilidade. Piloto em caravana real permanece etapa futura, sem fabricar datas ou métricas.
- [ ] R11.6 — Preparar checklist futuro da Vercel/Supabase: ambientes separados, URL de callback, domínio/HTTPS, variáveis, políticas, migrations, cron alcançável, e-mail, armazenamento, backups/restauração e monitoramento. Nenhum deploy ou db push remoto faz parte da execução automática deste plano.
- [ ] R11.7 — Emitir relatório de encerramento por achado, com teste/evidência, risco residual e pendências. Diferenciar pronto para homologação remota de piloto real concluído e de produção aprovada.

Aceite: nenhum achado crítico/alto aberto; todas as jornadas autorizadas funcionam; gates de qualidade atendidos; instalação limpa reproduzível; evidências reais substituem afirmações não demonstradas. A primeira implantação poderá então ser planejada como tarefa própria.

## Cobertura de todos os achados da auditoria

| Achado | Fases responsáveis |
|---|---|
| C01 RPC anônima | 02, 04, 09 |
| C02 reserva confirmada via INSERT | 02, 04, 11 |
| A01 poderes do Super Admin | 01, 03 — promoção é autorizada pelo responsável; o excesso de acesso continua fora de escopo |
| A02 UPDATE amplo e integridade | 02, 04, 05 |
| A03 upload/guest/QR bloqueados | 05, 06 |
| A04 crédito não persistido | 04 |
| A05 unicidade/liberação de assento | 04 |
| A06 fluxos desconectados | 04, 05, 07 |
| A07 permuta e manifesto | 04, 08 |
| A08 offline e perda de pendências | 06 |
| A09 liderança do check-in | 03, 06 |
| A10 segredo fallback de QR | 06, 09 |
| A11 eventos/fila | 07 |
| A12 retenção | 05, 07 |
| A13 auditoria de menor | 02, 05 |
| A14 limiter | 09 |
| A15 cadastro/consentimento | 03, 05, 09 |
| A16 atividade e revogação | 03, 07 |
| M01 calendário público | 01, 08 — nome/Ala mantidos; informação sensível protegida |
| M02 financeiro/CSV | 04, 08 |
| M03 cron | 07, 11 — validação primeiro local |
| M04 hardening/CI | 01, 02, 09 |
| M05 cobertura | 01, 09, 11 |
| M06 homologação documental | 01, 11 |
| Oito melhorias de UX/desempenho | 06–10, validadas na 11 |

## Definition of Done de cada fase

1. Requisitos e checagem constitucional coerentes antes do código; divergências de negócio resolvidas na documentação correspondente.
2. Teste de regressão relevante falha antes da correção e passa depois, especialmente em use-cases. Testes de interface devem validar comportamento necessário, sem testes que apenas repitam classes CSS.
3. Mudanças de tabela, trigger, RPC ou policy exigem teste de integração/RLS com pelo menos duas Estacas, papéis reais e chamadas diretas. Evitar bypass por service_role no caminho verificado.
4. Transações testadas com falha intermediária, repetição e concorrência; payloads inválidos não produzem efeitos parciais.
5. Lint, tipos e testes aplicáveis verdes; documentação e relatório de evidência atualizados; nenhuma tarefa marcada concluída sem resultado observável.
6. PR pequeno por fase, rastreando achados e specs. Dependências e migrations integradas em ordem; nenhuma mudança remota implícita.

## Decisões a fechar na fase correspondente

As regras de promoção e exposição pública de nome/Ala já foram confirmadas e não precisam ser perguntadas novamente. A execução deverá verificar nas specs se estão definidas as regras de saldo excedente de crédito, destino sem vaga no rollover, tratamento temporal de sincronização offline após expiração e comprovação de e-mail. Quando faltar regra, apresentar proposta concreta e documentá-la antes de implementar apenas o trecho dependente; as demais correções podem avançar.

Não é estimado um prazo fechado sem decomposição e execução da primeira fase. A sequência e os critérios acima são a base de acompanhamento; número de tarefas concluídas e evidências de aceite devem determinar o progresso.
