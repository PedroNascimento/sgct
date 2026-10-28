# Checklist de homologação manual — SGCT v1

**Documento preparado em:** 28/10/2026  
**Referência de código:** branch `develop`, commit `67a6b56`  
**Base normativa:** Constituição v4.0.0, DECISIONS.md e specs 000–014  
**Estado:** roteiro NÃO EXECUTADO; nenhum item está previamente aprovado.

> Este documento não cria contas, Alas, Estacas ou reservas. Todos os 15 usuários abaixo devem ser cadastrados manualmente por você durante o teste. Não executar seed ou script de provisionamento desses usuários. Esta entrega não altera o banco de dados.

## 1. Como usar e registrar os resultados

Execute na ordem das seções. Cada item contém uma ação e o resultado esperado. Recarregue a página depois das alterações importantes e consulte a mesma reserva em cada papel envolvido: mensagem de sucesso sozinha não comprova persistência.

- Marque `[x]` somente depois de observar o resultado esperado.
- Registre **FALHOU** quando houver comportamento incorreto; **BLOQUEADO** quando faltar acesso, interface, configuração ou definição de regra. Deixe a caixa desmarcada nos dois casos.
- Não marque “não se aplica” só porque a função não aparece no menu. Se a spec exige o fluxo e não há como executá-lo, isso é uma pendência.
- Guarde evidência por ID: captura de tela, horário, papel, URL e resultado. Use uma pasta local de evidências fora da aplicação; não publique cookies, tokens, segredos ou dados reais.
- **[UI]** = executar pela interface, com conta comum do papel indicado.
- **[TEC]** = exige verificação técnica complementar. Não é substituído por um botão oculto ou por teste usando service_role.
- **[CEL]** = executar também em aparelho real.
- Se uma etapa falhar, registre a falha e prossiga apenas nos cenários independentes. Não altere dados pelo SQL para fazer o fluxo parecer aprovado.

### Ficha da rodada

| Campo | Preenchimento |
|---|---|
| Responsável pela execução | |
| Início / fim | |
| Commit efetivamente testado | |
| URL e ambiente local utilizado | |
| Identificador do banco local de teste | |
| Versões de navegador / celular | |
| Evidências armazenadas em | |
| Casos aprovados / falhos / bloqueados | |
| Decisão final | NÃO AVALIADO |

### Registro de falha — copiar para cada ocorrência

| Campo | Preenchimento |
|---|---|
| ID do caso | |
| Spec / regra relacionada | |
| Usuário / papel / caravana | |
| Passos executados | |
| Resultado esperado | |
| Resultado obtido | |
| Evidência e horário | |
| Severidade: bloqueador / alta / média / baixa | |
| Issue ou correção vinculada | |
| Commit e resultado do reteste | |

## 2. Base de teste: uma Estaca e seis Alas

Usar nomes claramente identificados como homologação:

- **Estaca:** Estaca Homologação SGCT.
- **Slug:** `homologacao-sgct`.
- **Alas:** Ala 01 — Centro; Ala 02 — Jardim; Ala 03 — Lagoa; Ala 04 — Parque; Ala 05 — Vila; Ala 06 — Horizonte.

A base principal tem **uma Estaca e seis Alas**, conforme solicitado. Não criar uma segunda Estaca nesta rodada funcional principal. Os ensaios de isolamento entre Estacas são um gate técnico separado: exigem uma segunda Estaca mínima em ambiente de teste e execução explicitamente planejada; não podem ser aprovados usando apenas uma Estaca.

### 2.1 Dados dos 15 usuários — preencher manualmente no cadastro

Todos os nomes e contatos são dados de teste. Os CPFs foram gerados para este roteiro, com dígitos verificadores válidos; isso **não comprova que sejam inexistentes em registros reais**. Não consultar serviços externos de CPF nem associá-los a pessoas reais. As senhas são públicas e exclusivas desta base local: nunca reutilizar em contas reais ou produção.

Os e-mails usam domínio de teste, não recebem mensagens na internet. Verificar mensagens somente na infraestrutura de teste configurada. A ausência de entrega em `example.test` não é prova de defeito do provedor.

| ID | Nome completo | CPF de teste | E-mail | Nascimento | Senha de teste | Ala |
|---|---|---|---|---|---|---|
| U01 | Lucas André Monteiro | 012.300.001-78 | u01@sgct.example.test | 12/04/1985 | `Sgct!Teste#01-2026` | Ala 01 |
| U02 | Mariana Beatriz Nogueira | 012.300.002-59 | u02@sgct.example.test | 23/09/1988 | `Sgct!Teste#02-2026` | Ala 01 |
| U03 | Rafael Henrique Duarte | 012.300.003-30 | u03@sgct.example.test | 17/02/1982 | `Sgct!Teste#03-2026` | Ala 02 |
| U04 | Camila Fernanda Ribeiro | 012.300.004-10 | u04@sgct.example.test | 08/06/1990 | `Sgct!Teste#04-2026` | Ala 03 |
| U05 | Bruno César Valença | 012.300.005-00 | u05@sgct.example.test | 19/11/1987 | `Sgct!Teste#05-2026` | Ala 04 |
| U06 | Juliana Patrícia Farias | 012.300.006-82 | u06@sgct.example.test | 26/03/1984 | `Sgct!Teste#06-2026` | Ala 05 |
| U07 | Tiago Vinícius Barbosa | 012.300.007-63 | u07@sgct.example.test | 14/08/1992 | `Sgct!Teste#07-2026` | Ala 06 |
| U08 | Ana Luísa Teixeira | 012.300.008-44 | u08@sgct.example.test | 30/01/1995 | `Sgct!Teste#08-2026` | Ala 01 |
| U09 | Felipe Augusto Siqueira | 012.300.009-25 | u09@sgct.example.test | 05/07/1979 | `Sgct!Teste#09-2026` | Ala 02 |
| U10 | Renata Cristina Azevedo | 012.300.010-69 | u10@sgct.example.test | 11/12/1993 | `Sgct!Teste#10-2026` | Ala 03 |
| U11 | Diego Matheus Cavalcanti | 012.300.011-40 | u11@sgct.example.test | 22/05/1998 | `Sgct!Teste#11-2026` | Ala 04 |
| U12 | Larissa Eduarda Moreira | 012.300.012-20 | u12@sgct.example.test | 03/10/1996 | `Sgct!Teste#12-2026` | Ala 05 |
| U13 | Eduardo Gabriel Peixoto | 012.300.013-01 | u13@sgct.example.test | 07/12/1989 | `Sgct!Teste#13-2026` | Ala 06 |
| U14 | Isabela Sofia Mendonça | 012.300.014-92 | u14@sgct.example.test | 18/04/2010 | `Sgct!Teste#14-2026` | Ala 01 |
| U15 | Gustavo Daniel Albuquerque | 012.300.015-73 | u15@sgct.example.test | 15/09/1986 | `Sgct!Teste#15-2026` | Sem Ala anfitriã; origem: Ala Visitante |

**U14** tem 16 anos na data de preparação deste documento. Se a homologação ocorrer muito depois, reavaliar a idade antes do teste de menor.

**U15** deve se cadastrar na opção **Convidado**, dentro da URL da Estaca anfitriã. Informar **Estaca Visitante Homologação** e **Ala Visitante** como textos de origem; o cadastro não deve criar essas unidades nem vincular o convidado a uma das seis Alas anfitriãs. Essa origem não exige cadastrar uma segunda Estaca na plataforma.

O cadastro também exige telefone/WhatsApp. Usar estes números sintéticos apenas para preencher o formulário; não enviar mensagens nem tentar ligar:

| ID | Telefone de teste |
|---|---|
| U01 | (11) 90000-0001 |
| U02 | (11) 90000-0002 |
| U03 | (11) 90000-0003 |
| U04 | (11) 90000-0004 |
| U05 | (11) 90000-0005 |
| U06 | (11) 90000-0006 |
| U07 | (11) 90000-0007 |
| U08 | (11) 90000-0008 |
| U09 | (11) 90000-0009 |
| U10 | (11) 90000-0010 |
| U11 | (11) 90000-0011 |
| U12 | (11) 90000-0012 |
| U13 | (11) 90000-0013 |
| U14 | (11) 90000-0014 |
| U15 | (11) 90000-0015 |

Preencher os demais campos obrigatórios, como sexo, com dados de teste coerentes e registrar o valor escolhido na evidência.

### 2.2 Papel final e finalidade de cada conta

**Todos começam como member por autocadastro**, exceto U15, que começa como guest. Nenhum painel administrativo deve criar conta ou definir senha para eles.

| Conta | Papel final planejado | Utilização principal |
|---|---|---|
| U01 | Admin Estaca, promovido pelo Super Admin | Alas, caravanas, equipe, validação e relatórios |
| U02 | Admin Ala 01 | Pagamentos, termos do jovem U14 e testes de autoaprovação |
| U03 | Admin Ala 02 | Pagamento de U09 e isolamento entre Alas |
| U04 | Admin Ala 03 | Auxílio de U10 |
| U05 | Admin Ala 04 | Operação da reserva de U11 |
| U06 | Admin Ala 05 | Operação da reserva de U12 |
| U07 | Admin Ala 06 | Operação da reserva de U13 |
| U08 | Member da Ala 01 | Reserva principal, perfil e disputa de assento |
| U09 | Member da Ala 02 | Categoria Oficiante, disputa e relatórios |
| U10 | Member da Ala 03 | Auxílio; repetir cenários em caravanas separadas |
| U11 | Member da Ala 04 | Fila de espera |
| U12 | Member da Ala 05 | Permuta |
| U13 | Member da Ala 06; líder designado para uma caravana | Scanner, manifesto e limites da liderança |
| U14 | Member menor da Ala 01 | Consentimento, termo e aprovação |
| U15 | Guest, sem ward_id anfitriã | Repasse inter-Estaca e prioridade |

A conta **Super Admin inicial é um pré-requisito técnico**, fora dessas 15 contas. Usar a conta de bootstrap já existente. Se não existir, registrar o bloqueio e tratar a instalação inicial conforme SETUP.md; não criar outro Super Admin pelo cadastro público.

### 2.3 Caravanas independentes para não misturar cenários

Criar pela interface, quando disponível:

| Identificação de teste | Uso | Preparação |
|---|---|---|
| C01 — Jornada principal | Cadastro, reserva, pagamento, menor e relatório | Embarque futuro com antecedência superior a 30 dias |
| C02 — Auxílio | Aprovação, reprovação e alerta de prazo | Separar cenários com mais e menos de 25 dias |
| C03 — Convidados | Repasse, vaga e prioridade | Manter independente da lotação de C04 |
| C04 — Lotação e espera | Limites 50 + 5 e concorrência | Capacidade 50, espera 5 |
| C05 — Permuta e crédito | Saída, substituição e reaproveitamento | Preparar reservas confirmadas e próxima viagem |
| C06 — Embarque | Ida, volta, offline e no-show | Data/ciclo compatíveis com o teste |
| C07 — Prazos e quórum | Expiração, 47/48 e rollover | Massa temporal separada, acompanhada tecnicamente |

Para facilitar a conferência, usar **Padrão R$ 130,00**, **Oficiante R$ 117,00** e dois pontos de embarque com nomes/horários distintos. São valores de teste configurados na caravana, não valores globais obrigatórios do sistema.

Quinze contas bastam para a jornada funcional básica, **não** para comprovar 48 passageiros, 50 assentos e 5 pessoas em espera. Se for validar esses limites manualmente, cadastrar manualmente contas fictícias adicionais, com dados únicos. Não reutilizar uma pessoa em várias reservas da mesma caravana para simular participantes distintos. Alternativamente, registrar o bloco de volume como pendente de ensaio técnico separado, sem criar contas automaticamente nesta execução.

## 3. Preparação e segurança do ambiente [TEC]

- [ ] PRE-01 — Registrar branch e commit antes de iniciar → execução corresponde à develop escolhida, sem misturar mudanças não commitadas.
- [ ] PRE-02 — Confirmar URL/chaves do Supabase local → nenhum teste aponta para projeto remoto ou banco com dados reais.
- [ ] PRE-03 — Conferir histórico de migrations e objetos existentes → todas as migrations do commit estão aplicadas e registradas, sem SQL manual não rastreado.
- [ ] PRE-04 — Confirmar Auth, Edge Function de cadastro, Storage privado e aplicação local disponíveis → cadastro e arquivos podem ser testados pelo fluxo real.
- [ ] PRE-05 — Preparar sessões independentes em perfis de navegador/aparelhos diferentes → trocar uma conta não troca silenciosamente as outras sessões. Duas abas do mesmo perfil compartilham cookies.
- [ ] PRE-06 — Configurar caixa/captura de e-mail de teste para Auth e para notificações da aplicação → nenhuma mensagem é enviada a terceiros. Inbucket do Auth não captura automaticamente chamadas do gateway Resend.
- [ ] PRE-07 — Confirmar que arquivos de autorização são documentos fictícios, sem assinatura/documentos reais de menores → teste não coleta dados reais.
- [ ] PRE-08 — Reservar banco/instância local isolada para testes destrutivos, limites e retenção → não executar db reset no banco atual nem db push remoto para preparar esta rodada.
- [ ] PRE-09 — Registrar estado inicial e processo de recuperação da base de teste → falhas podem ser investigadas sem apagar evidências.
- [ ] PRE-10 — Confirmar que os achados críticos/altos da análise de 28/10 foram tratados ou estão registrados como bloqueadores → checklist funcional não é autorização para ignorá-los.

## 4. Super Admin e criação da Estaca [UI] — spec 000

**Ator:** Super Admin.

- [ ] EST-01 — Entrar na área de Super Admin → sessão identificada e acesso à gestão de Estacas.
- [ ] EST-02 — Criar Estaca Homologação SGCT com slug homologacao-sgct → uma Estaca ativa, com URL própria.
- [ ] EST-03 — Tentar criar outra Estaca com o mesmo slug → operação rejeitada, sem duplicata.
- [ ] EST-04 — Enviar formulário sem nome ou slug obrigatório → erro claro e nenhuma criação parcial.
- [ ] EST-05 — Abrir /homologacao-sgct e /homologacao-sgct/calendario sem login → contexto correto e estado vazio compreensível.
- [ ] EST-06 — Acessar um slug inexistente → 404, sem conteúdo privado ou dados de outra Estaca.
- [ ] EST-07 — Conferir a raiz / quando a Estaca padrão estiver configurada para teste → conteúdo da Estaca padrão sem troca indevida de contexto/URL, conforme spec 000.
- [ ] EST-08 — Tentar, como Super Admin, acessar reservas, créditos, menores, scanner e financeiro da Estaca → acesso operacional negado, inclusive por URL direta.

## 5. Primeiro administrador: teste obrigatório de onboarding [UI]

**Atenção:** há uma dependência circular a verificar: cadastro de member exige Ala; criação de Ala exige Admin Estaca; promoção a Admin Estaca exige member já cadastrado. Este documento **não inventa uma exceção** para resolvê-la.

- [ ] INI-01 — Em Estaca nova, sem Alas, abrir cadastro público de U01 → identificar se existe caminho aprovado para seu autocadastro.
- [ ] INI-02 — Verificar se o fluxo permite chegar à promoção sem SQL, conta criada pelo painel ou senha definida por terceiro → onboarding completo deve respeitar a Constituição.
- [ ] INI-03 — Se não for possível cadastrar U01 antes da primeira Ala, registrar BLOQUEADOR com telas e regra envolvida → não aprovar onboarding nem contornar silenciosamente.
- [ ] INI-04 — Com U01 legitimamente autocadastrado, pesquisar seu e-mail exato na Estaca pelo Super Admin e promover → mesma conta passa de member para Admin Estaca, sem mudar senha ou tenant.
- [ ] INI-05 — Sair/entrar com U01 e abrir o painel → permissões administrativas aparecem e dados do cadastro permanecem.

Se precisar de base previamente existente para investigar outros módulos, identificá-la como **rodada complementar**. Isso não aprova os passos INI-01 a INI-03 nem autoriza criação automática dos 15 usuários.

## 6. Criar e verificar as seis Alas [UI] — specs 000/001

**Ator:** U01, depois da promoção.

- [ ] ALA-01 — Criar Ala 01 — Centro, Ala 02 — Jardim e Ala 03 — Lagoa → três registros da própria Estaca.
- [ ] ALA-02 — Criar Ala 04 — Parque, Ala 05 — Vila e Ala 06 — Horizonte → total de seis Alas, com nomes e identificação corretos.
- [ ] ALA-03 — Recarregar e sair/entrar no painel → as seis Alas continuam cadastradas.
- [ ] ALA-04 — Abrir cadastro público → opções correspondem às Alas da Estaca da URL.
- [ ] ALA-05 — Como membro/Admin Ala, tentar acessar criação/edição de Alas → gestão negada.
- [ ] ALA-06 — Se a interface oferecer edição/inativação/exclusão, validar apenas operações formalizadas nas specs; tentar afetar Ala com histórico → sem perda silenciosa de vínculos. Registrar comportamento sem regra aprovada como pendente de definição.

## 7. Autocadastro manual e perfil [UI/CEL] — specs 001/014

Cadastrar U02–U14 um a um; U01 já deve ter sido criado no onboarding. Não usar o painel de administradores para criar essas contas.

- [ ] CAD-01 — Cadastrar cada adulto na Ala da tabela → nome, CPF, e-mail, nascimento, telefone e demais campos persistidos na própria conta.
- [ ] CAD-02 — Confirmar que todos os adultos recém-cadastrados começam como member → nenhum escolhe papel administrativo no formulário.
- [ ] CAD-03 — Tentar cadastro com e-mail já utilizado → erro claro e nenhuma segunda conta/orfandade.
- [ ] CAD-04 — Tentar CPF incompleto, e-mail malformado, telefone sem DDD e senha abaixo do mínimo anunciado → validações impedem envio inválido e explicam correção.
- [ ] CAD-05 — Recarregar após cadastro e entrar com senha correta → sessão ativa visível, acesso a Minha Conta e Sair.
- [ ] CAD-06 — Usar senha incorreta → acesso negado, sem autenticação parcial.
- [ ] CAD-07 — Alterar contato próprio em Minha Conta, salvar e entrar novamente → dados mantidos e reaproveitados na próxima reserva.
- [ ] CAD-08 — Tentar editar papel, Estaca, ativação ou campos administrativos pelo perfil → não existe autorização de autoelevação.
- [ ] CAD-09 — Sair e tentar reabrir URL privada, inclusive pelo botão Voltar → nenhuma nova consulta privada é permitida.
- [ ] CAD-10 — Cadastrar U14, com nascimento da tabela e e-mail próprio → jovem de 12–17 pode ter conta sem guardian_id obrigatório.
- [ ] CAD-11 — Verificar consentimento explícito do responsável no fluxo do menor; tentar prosseguir sem ele → obrigação constitucional não é substituída por aceite genérico.
- [ ] CAD-12 — Informar data impossível/futura e idade incompatível com a opção de cadastro → erro claro; não contornar cadastro de menor pela opção adulto.
- [ ] CAD-13 — Se existir comprovação de e-mail/recuperação de senha, testar com caixa local conforme contrato documentado → links seguros e retorno compreensível. Ausência de política definida deve ser registrada, não presumida como aprovada.

## 8. Promoções, revogação e troca de visão [UI] — specs 000/001/014

- [ ] ADM-01 — Como U01, promover U02 a Admin Ala 01 → conta existente, senha e histórico preservados.
- [ ] ADM-02 — Promover U03, U04, U05, U06 e U07 às Alas 02, 03, 04, 05 e 06, respectivamente → escopo correto para cada conta.
- [ ] ADM-03 — Entrar com cada um dos seis Admins Ala → painel mostra somente a operação autorizada da própria Ala.
- [ ] ADM-04 — Como U01, tentar promover alguém a Admin Estaca → negado; somente Super Admin possui essa autoridade.
- [ ] ADM-05 — Como Admin Ala ou member, tentar promover/revogar administradores → negado, inclusive por URL direta.
- [ ] ADM-06 — Como Super Admin, buscar candidato inexistente/guest → nenhuma criação automática e nenhuma promoção de guest por atalho.
- [ ] ADM-07 — Como Admin Ala/Estaca, alternar para visão de membro, fazer navegação e retornar à administração → mesma conta e permissões, sem alteração de role.
- [ ] ADM-08 — Como member/guest, procurar alternância administrativa → não obtém acesso.
- [ ] ADM-09 — Como U01, revogar temporariamente U03 → U03 retorna a member, mantendo conta e histórico; depois promover novamente para continuar.
- [ ] ADM-10 — Manter sessão antiga de U03 aberta durante revogação e tentar operação administrativa → privilégio revogado deixa de funcionar, não apenas após logout.
- [ ] ADM-11 — Em cenário separado, revogar Admin Estaca pelo Super Admin → volta a member e perde poderes; restaurar somente pela promoção autorizada para continuar a rodada.
- [ ] ADM-12 — Conferir lookup/listagens do Super Admin → sem varredura global de todos os membros e contatos; apenas contexto mínimo autorizado.

## 9. Caravanas e calendário público [UI/CEL] — specs 002/014

**Ator:** U01.

- [ ] CAR-01 — Criar C01 com ida/retorno, R$130/R$117, capacidade e dois embarques → todos os campos persistem na própria Estaca.
- [ ] CAR-02 — Definir inscrição no domingo anterior e quórum na terça anterior ao embarque → datas exibidas e respeitadas sem diferença indevida de fuso.
- [ ] CAR-03 — Criar os cenários C02–C07 necessários → dados de um cenário não alteram os demais.
- [ ] CAR-04 — Editar dados permitidos e recarregar → atualização refletida no calendário e formulário de reserva.
- [ ] CAR-05 — Tentar criar caravana sem dados obrigatórios, com valores/capacidades inválidos → erro claro e nenhum registro parcial.
- [ ] CAR-06 — Abrir calendário sem login → datas em português, valores, embarques, prazo e disponibilidade compreensíveis.
- [ ] CAR-07 — Abrir calendário com zero caravanas e com inscrições fechadas/canceladas → estados vazios/indisponíveis claros, sem reserva indevida.
- [ ] CAR-08 — Acessar página pública com e sem login → nome/Ala podem aparecer; CPF, e-mail, telefone, documentos, tokens e situação financeira/auxílio individual não.
- [ ] CAR-09 — Como Admin Ala/member/guest, tentar criar/editar/cancelar caravana → acesso não autorizado negado.
- [ ] CAR-10 — Se testar cancelamento administrativo, fazê-lo em caravana separada e conferir a regra aplicável → nunca confundir com cancelamento livre pelo membro nem presumir efeito financeiro não definido.

## 10. Reserva comum e acompanhamento [UI/CEL] — specs 003/004

**Atores:** U08 e U09, em sessões independentes.

- [ ] RES-01 — Abrir reserva como visitante → exige autenticação antes de gravar.
- [ ] RES-02 — Com perfil de teste incompleto, iniciar reserva → bloqueia e direciona a Minha Conta; depois completar manualmente.
- [ ] RES-03 — Como U08, conferir dados reaproveitados → nome/documento/telefone/sexo vêm do perfil, sem recadastrá-los no formulário de viagem.
- [ ] RES-04 — Selecionar assento, embarque, Padrão e custeio próprio em C01 → resumo mostra R$130 e aviso de que reserva não é confirmação.
- [ ] RES-05 — Confirmar → uma reserva pendente, assento ocupado e registro em Minhas reservas.
- [ ] RES-06 — Recarregar e consultar como U02/U01 → mesma reserva, assento, preço, Ala e estado.
- [ ] RES-07 — Como U09, escolher Oficiante → R$117, sem aprovação administrativa da categoria.
- [ ] RES-08 — Testar tipos de participante logísticos, acessibilidade, grupo familiar/nomes e acompanhante de investidura → dados persistem por viagem, sem mudar indevidamente o preço da categoria.
- [ ] RES-09 — Fazer inscrição em outra caravana → campos específicos da nova viagem não são herdados silenciosamente.
- [ ] RES-10 — Consultar Minhas reservas → ida/retorno, assento, embarque, valor, data e progresso textual corretos.
- [ ] RES-11 — Como outra conta, tentar abrir o ID da reserva de U08 → dados privados negados.
- [ ] RES-12 — Como U08, procurar cancelamento direto/self-service → não permite saída fora dos fluxos aprovados de fila/permuta.
- [ ] RES-13 — Dar duplo clique no envio ou voltar após sucesso → não criar duplicata por reenvio da mesma operação; conferir banco/contagens com apoio técnico.
- [ ] RES-14 — Iniciar reserva com página antiga após fechamento/cancelamento da caravana → servidor recusa a gravação, mesmo que o botão antigo esteja visível.

## 11. Pagamento na Ala e confirmação na Estaca [UI] — spec 004

Nenhum pagamento bancário real é necessário: simular reconhecimento administrativo somente com os dados de teste.

- [ ] PAG-01 — Como U02, reconhecer pagamento da reserva de U08 → pendente passa a pago_ala, sem confirmar automaticamente pela Estaca.
- [ ] PAG-02 — Como U08, conferir Minhas reservas → etapa da Ala concluída, confirmação da Estaca ainda pendente.
- [ ] PAG-03 — Como U03, tentar reconhecer a reserva de U08/Ala 01 → negado.
- [ ] PAG-04 — Fazer reserva própria de U02 e tentar reconhecer o próprio pagamento → autoaprovação bloqueada.
- [ ] PAG-05 — Como member, tentar reconhecer pagamento próprio ou de terceiro → negado.
- [ ] PAG-06 — Como U01, validar transferência/lote autorizado → pago_ala passa a confirmado e registra data/posição.
- [ ] PAG-07 — Como U08, recarregar → confirmação textual da Estaca e QR disponível somente após elegibilidade.
- [ ] PAG-08 — Confirmar duas reservas em ordem inversa à criação → ranking segue a transferência/confirmed_at prevista, não simplesmente quem reservou primeiro.
- [ ] PAG-09 — Conferir que mudança de ranking não libera antecipadamente assento de outro participante → ocupação continua consistente.
- [ ] PAG-10 — Repetir confirmação/lote já processado → sem duplicar confirmação, efeitos financeiros ou eventos.
- [ ] PAG-11 — Se a interface oferecer rejeição de transferência, testar em reserva separada → efeito e mensagem correspondem à regra aprovada, sem inventar estorno/crédito.
- [ ] PAG-12 — Como Admin Ala, tentar a confirmação final reservada à Estaca → negado.

## 12. Crianças de colo e autorização de menor [UI/CEL] — specs 003/006/007

- [ ] MEN-01 — Na reserva de um responsável adulto, adicionar criança fictícia de até 5 anos com dados exigidos → aparece no manifesto, sem nova conta, assento ou cobrança.
- [ ] MEN-02 — Adicionar segunda criança de colo → capacidade de assentos e espera não aumenta.
- [ ] MEN-03 — Selecionar Criança de Colo como tipo de participante → fluxo direciona ao manifesto, não cria poltrona paga para a criança.
- [ ] MEN-04 — Como U14, reservar com conta própria → responsável cadastrado não é pré-requisito obrigatório.
- [ ] MEN-05 — Tentar reconhecer pagamento de U14 sem termo aprovado → avanço para pago_ala bloqueado.
- [ ] MEN-06 — Como U14, enviar PDF/JPEG/PNG fictício permitido → arquivo privado e formulário vinculados à reserva correta; permanece aguardando avaliação.
- [ ] MEN-07 — Tentar arquivo vazio, tipo não permitido e maior que 10 MiB, conforme contrato atual de upload → rejeição clara, sem arquivo/registro órfão.
- [ ] MEN-08 — Como U02, abrir o termo de U14 → acesso permitido e leitura registrada em auditoria.
- [ ] MEN-09 — Como U03, outro member ou visitante, tentar ler o mesmo termo → acesso negado.
- [ ] MEN-10 — Reprovar o termo → motivo/estado compreensível e pagamento continua bloqueado; testar reenvio seguro conforme fluxo disponível.
- [ ] MEN-11 — Aprovar o termo como autoridade autorizada → libera o fluxo da Ala, sem fingir confirmação final da Estaca.
- [ ] MEN-12 — Concluir pagamento/validação de U14 → estado e QR passam a refletir a elegibilidade.
- [ ] MEN-13 — [TEC] Simular falha de persistência após upload e falha ao gravar auditoria de leitura → limpeza/compensação correta; nenhuma URL entregue sem log obrigatório.

## 13. Auxílio financeiro [UI] — spec 012

**Atores:** U10, U04 e U01. Repetir com os três tipos de fundo em caravanas/reservas independentes.

- [ ] AUX-01 — Registrar pedido conforme o fluxo aprovado da Ala, com U10 como beneficiária → reserva aguardando_auxilio e pedido pending, sem transformar o membro em administrador.
- [ ] AUX-02 — Conferir requested_by e escopo → responsável administrativo da própria Ala/Estaca, conforme spec 012; ausência desse fluxo ou autoria divergente é falha/bloqueio.
- [ ] AUX-03 — Tentar reconhecer pagamento/confirmar antes da aprovação → bloqueado.
- [ ] AUX-04 — Aprovar com autoridade autorizada → reserva passa a pago_ala, mantendo o valor integral da categoria como devido à Estaca.
- [ ] AUX-05 — Concluir validação da Estaca → confirmado; origem do custeio não se confunde com categoria nem altera indevidamente o relatório.
- [ ] AUX-06 — Reprovar pedido separado → cancelada_sem_credito e notificação, sem gerar crédito por pagamento inexistente.
- [ ] AUX-07 — Registrar pedido com menos de 25 dias de antecedência → alerta não bloqueante; com antecedência suficiente, sem aviso indevido.
- [ ] AUX-08 — Como Admin de outra Ala/member, tentar aprovar/reprovar → negado.
- [ ] AUX-09 — Consultar calendário público → situação individual de auxílio não aparece, inclusive em payload de rede.
- [ ] AUX-10 — [TEC] Rodar expiração padrão sobre cenário com auxílio pendente → não aplicar indevidamente timeout comum de 7 dias; verificar a regra específica.

## 14. Convidado inter-Estaca [UI] — specs 001/013

**Ator:** U15. A Estaca de origem é informação textual, não outro tenant cadastrado nesta base.

- [ ] GUE-01 — Autocadastrar U15 pela opção Convidado na Estaca anfitriã → guest, ward_id nulo, origem informativa preservada.
- [ ] GUE-02 — Criar reserva em C03 → aguardando_transferencia_interestaca e registro de repasse vinculado, com valor correto.
- [ ] GUE-03 — Conferir como U01 → convidado aparece na gestão da anfitriã; Admins de Ala não recebem acesso operacional a essa reserva.
- [ ] GUE-04 — Como U15, tentar confirmar o próprio repasse ou promover-se a member/admin → negado.
- [ ] GUE-05 — Como U01, confirmar repasse com vaga disponível e nenhuma pendência/prioridade local impeditiva → confirmado diretamente, sem pago_ala fictício da Ala anfitriã.
- [ ] GUE-06 — Repetir em cenário com member local pendente/pago_ala/lista_espera ainda não resolvido → prioridade local respeitada; convidado não confirmado antes do membro.
- [ ] GUE-07 — Confirmar repasse quando não houver vaga/espera local vazia não estiver atendida → estado de espera coerente, sem overbooking.
- [ ] GUE-08 — Abrir vaga com membro local e convidado aguardando → promover primeiro o membro local elegível.
- [ ] GUE-09 — [TEC] Validar prazo específico até o fechamento de inscrições → não aplicar indiscriminadamente a expiração comum de 7 dias.
- [ ] GUE-10 — [TEC] Simular falha ao registrar repasse após criar reserva → nenhuma reserva de convidado fica sem vínculo recuperável/compensado; não aprovar gravação parcial.

## 15. Concorrência, lotação e fila [UI + TEC] — specs 003–005

Usar C04. Os testes de limite precisam de participantes distintos adicionais cadastrados manualmente; não estão cobertos apenas pelos 15 usuários da tabela.

- [ ] FIL-01 — Em duas sessões independentes, U08 e U09 escolherem o mesmo assento e confirmarem simultaneamente → exatamente uma reserva ocupa a poltrona; o outro recebe orientação clara.
- [ ] FIL-02 — Conferir mapa após atualização nas duas sessões → ocupação consistente, sem depender de página desatualizada.
- [ ] FIL-03 — Preencher os 50 assentos com participantes distintos → sem assento duplicado nem livre/ocupado contraditório.
- [ ] FIL-04 — Inscrever cinco participantes adicionais, incluindo U11 → posições de espera coerentes, sem criar assentos físicos além da capacidade.
- [ ] FIL-05 — Tentar o participante de número 56 → rejeição/indisponibilidade explícita, sem reserva flutuante.
- [ ] FIL-06 — Aplicar a saída autorizada de reserva confirmada quando houver espera → primeiro elegível da lista é promovido e o antigo titular recebe o crédito previsto.
- [ ] FIL-07 — Recarregar e conferir assento/estados/crédito → promoção e crédito persistidos juntos, sem dupla ocupação.
- [ ] FIL-08 — [TEC] Repetir promoção simultaneamente ou provocar falha no meio → somente uma promoção/crédito; rollback/retry seguro.
- [ ] FIL-09 — [TEC] Expirar reserva elegível e reutilizar seu assento → histórico preservado e nova ocupação permitida somente após a liberação prevista.
- [ ] FIL-10 — Verificar notificações de entrada em espera, mudança de posição e promoção → eventos distintos, destinatários corretos.

## 16. Permuta mediada [UI] — spec 005

Usar U12 como titular que sai e outro adulto elegível como substituto, em C05 sem espera impeditiva. Se necessário, usar outra caravana para que o substituto não possua reserva concorrente no mesmo cenário.

- [ ] TRO-01 — Como member, procurar troca direta sem mediação → não permite self-service fora do fluxo previsto.
- [ ] TRO-02 — Como U01 ou líder designado, registrar permuta com nome/documento reais de teste do substituto → pedido correto e aprovação pela autoridade prevista.
- [ ] TRO-03 — Aprovar → um passageiro efetivo no mesmo assento, sem gerar crédito ao titular que saiu.
- [ ] TRO-04 — Emitir manifesto → nome/documento do substituto, sem duplicar original como passageiro ativo ou criança fictícia com nascimento em 1900.
- [ ] TRO-05 — Conferir tokens/comprovantes antigos do titular substituído → não permitem presença de passageiro que deixou de ser o titular efetivo.
- [ ] TRO-06 — Como pessoa sem autorização, tentar registrar/aprovar permuta → negado.
- [ ] TRO-07 — [TEC] No dia do embarque, executar seis permutas válidas e tentar a sétima → sétima rejeitada, inclusive em chamadas simultâneas.
- [ ] TRO-08 — Sem espera nem permuta até o prazo aplicável → cancelada_sem_credito, sem crédito automático. Se o prazo operacional não estiver definido, registrar bloqueio de especificação antes de aprovar este caso.

## 17. Crédito e reutilização [UI + TEC] — spec 005

- [ ] CRE-01 — Entrar com titular que recebeu crédito em FIL-06 → crédito aparece em Meus créditos com valor, origem, estado e vencimento.
- [ ] CRE-02 — Entrar como outra pessoa → não vê nem utiliza o crédito do titular.
- [ ] CRE-03 — Pelo fluxo de reserva de uma próxima viagem, localizar e aplicar crédito permitido → abatimento aparece na tela e permanece após recarregar.
- [ ] CRE-04 — Conferir crédito e reserva depois da operação → crédito usado uma única vez e valor persistido correspondente; ausência de ação na UI é funcionalidade bloqueada, não aprovação da RPC isolada.
- [ ] CRE-05 — Tentar usar crédito já consumido ou vencido → negado.
- [ ] CRE-06 — [TEC] Aplicar o mesmo crédito simultaneamente em duas reservas → apenas uma utilização tem sucesso.
- [ ] CRE-07 — [TEC] Simular falha intermediária na aplicação → nem crédito perdido sem abatimento nem abatimento sem consumo.
- [ ] CRE-08 — [TEC] Testar antes e no vencimento de 12 meses → crédito ativo antes do limite e expired no limite; notificação prevista emitida.
- [ ] CRE-09 — Testar crédito parcial/igual/superior ao preço somente depois de confirmar a política aprovada → não inferir perda de saldo, troco, saldo residual ou dupla compensação pelo comportamento atual.

## 18. Datas, fechamento, quórum e rollover [TEC + conferência UI] — specs 004–006

Usar massa separada. Não mudar relógio do computador/servidor compartilhado para simular o tempo; isso pode afetar JWT, outros projetos e jobs. Preparar cenários datados em ambiente isolado, com execução controlada.

- [ ] TEM-01 — Validar prazo de inscrição: imediatamente antes/depois do fechamento → aceita apenas dentro do prazo aprovado, inclusive submissão por página antiga.
- [ ] TEM-02 — Testar pendente antes e no limite de 7 dias definido na US-004.4 → não expira antes; expira no limite aplicável, sem alcançar exceções de auxílio/guest.
- [ ] TEM-03 — Conferir domingo de fechamento e timeout de 7 dias na mesma linha do tempo → conflitos entre D01 e spec 004 precisam de decisão registrada; não ocultar reservas que já nascem expiradas.
- [ ] TEM-04 — Executar validação semanal em terça fora da semana do embarque → apenas reservas elegíveis processadas.
- [ ] TEM-05 — Executar na semana do embarque → ciclo automático semanal não roda; validação manual/contínua autorizada continua distinta.
- [ ] TEM-06 — Na data de quórum, conferir 47 reservas elegíveis confirmado+pago_ala, com mínimo 48 → caravana cancelada.
- [ ] TEM-07 — Repetir em caravana separada com exatamente 48 elegíveis → não cancelar; pendente/criança de colo não aumentam esse quórum.
- [ ] TEM-08 — Conferir cancelamento por quórum → créditos e reservas equivalentes na próxima caravana disponível da mesma Estaca, conforme spec; ninguém fica sem resultado visível.
- [ ] TEM-09 — Reexecutar job → sem créditos ou reservas duplicadas.
- [ ] TEM-10 — Conferir ocupação, embarque, categoria e reconciliação após rollover → sem assento inválido ou crédito livre junto de compensação já utilizada.
- [ ] TEM-11 — Testar ausência de próxima viagem ou destino sem vaga somente com regra formalizada → registrar bloqueio se a spec não definir o resultado.
- [ ] TEM-12 — Conferir limites de dia/fuso com os horários exibidos → fechamento, expiração, embarque e terça não mudam pelo fuso do aparelho.

## 19. QR, liderança e embarque online [UI/CEL] — spec 007

**Ator:** U13 como líder designado da C06 e autoridade administrativa autorizada. O papel de líder é designação na caravana, não autopromoção a admin.

- [ ] EMB-01 — Como U01, designar U13 líder da C06 pelo fluxo aprovado → designação persiste.
- [ ] EMB-02 — Como U13, acessar scanner/manifesto da C06 → líder consegue operar pelo caminho previsto; se o menu/rota o bloquear por ser member, registrar falha.
- [ ] EMB-03 — Como U13, tentar operar outra caravana sem designação/autorização → negado.
- [ ] EMB-04 — Conferir reserva pendente/pago_ala/espera/auxílio → sem QR antecipado.
- [ ] EMB-05 — Abrir QR de reserva confirmada elegível → token disponível ao próprio titular, não ao visitante ou a outro membro.
- [ ] EMB-06 — Permitir câmera no celular e ler QR válido para ida → presença registrada uma vez, com passageiro e direção corretos.
- [ ] EMB-07 — Ler o mesmo QR novamente e em segundo aparelho → sem duplicar presença.
- [ ] EMB-08 — Registrar volta → registro separado da ida, sem sobrescrever a primeira leitura.
- [ ] EMB-09 — Usar QR expirado, adulterado, de caravana diferente ou reserva não elegível → rejeitado, sem marcar presença.
- [ ] EMB-10 — Negar câmera, fechar scanner e sair da página → orientação clara e câmera/tracks encerrados.
- [ ] EMB-11 — Encerrar embarque pelo fluxo autorizado → confirmado sem ida passa a no_show; pessoa presente não é marcada como ausente.
- [ ] EMB-12 — Conferir no-show → nenhum crédito automático.
- [ ] EMB-13 — Como Admin Ala da reserva, conceder exceção com justificativa → crédito exceptional_grant com autor e log; sem justificativa/ator autorizado, rejeitar.
- [ ] EMB-14 — Volta sem ida prévia e sincronização tardia após vencimento → registrar resultado, mas só aprovar depois de resolver a regra temporal aplicável; não inventar comportamento físico de embarque.

## 20. Offline e sincronização parcial [CEL + TEC] — spec 007

Preparar dois aparelhos/sessões, reserva confirmada e cache válido ainda online. Documentar se o teste é DevTools Offline ou modo avião real. Câmera móvel exige contexto seguro compatível: HTTP pelo IP da rede pode bloqueá-la; usar localhost no dispositivo ou HTTPS de teste aprovado, sem confundir essa restrição com bug do scanner.

- [ ] OFF-01 — Carregar dados da C06 ainda online → cache disponível para essa operação autorizada.
- [ ] OFF-02 — Desconectar a rede e ler QR conhecido válido → leitura fica explicitamente pendente de sincronização.
- [ ] OFF-03 — Ler QR desconhecido/de outra caravana offline → não apresenta presença definitiva como aceita.
- [ ] OFF-04 — Recarregar/reabrir a tela offline conforme suporte previsto → pendências preservadas, ou limitação explicitamente registrada; nunca prometer PWA se não existir.
- [ ] OFF-05 — Reconectar → itens válidos sincronizados automaticamente; presença persistida confirmada após recarregar online.
- [ ] OFF-06 — Repetir leitura/sincronização em dois aparelhos → uma presença por reserva+direção.
- [ ] OFF-07 — [TEC] Sincronizar lote com item válido e item inválido → remover apenas sucesso/duplicata comprovada; manter a falha para recuperação.
- [ ] OFF-08 — Trocar caravana/usuário no mesmo aparelho → cache anterior não fica disponível a sessão não autorizada.
- [ ] OFF-09 — Fazer logout com pendências → nenhuma perda silenciosa; dados privados não ficam acessíveis à próxima pessoa e a recuperação é explícita.
- [ ] OFF-10 — Fechar/reabrir durante sincronização → retry não duplica presença nem descarta itens sem confirmação.

## 21. Relatórios, manifesto e conferência financeira [UI + TEC] — specs 007/009/013

Usar primeiro uma caravana limpa com três reservas confirmadas: dois Padrão de R$130 e um Oficiante de R$117. **Total esperado: R$377.** Não misturar outros testes nessa conferência. Depois, em cenário com prioridade atendida, adicionar convidado Padrão confirmado: **total R$507**. Criança de colo não altera esses totais.

- [ ] REL-01 — Como Admin Ala, abrir relatório → somente própria Ala; totais conferem com o controle manual.
- [ ] REL-02 — Como U01, abrir consolidado → soma das seis Alas e convidados da anfitriã no escopo correto; sem dados de outro tenant.
- [ ] REL-03 — Conferir convidado → entra no consolidado autorizado, nunca como membro de uma Ala anfitriã.
- [ ] REL-04 — Exportar CSV e PDF → abrem, têm acentos/datas/valores corretos, cabeçalhos e total coerentes com a tela.
- [ ] REL-05 — Registrar check-in dos confirmados e exportar novamente → total arrecadado não diminui porque o status virou presente.
- [ ] REL-06 — Gerar manifesto com adulto, jovem, criança de colo, convidado e permuta → titular/documento/assento corretos e nenhuma pessoa duplicada.
- [ ] REL-07 — Como member, guest, Super Admin ou Admin Ala de outra Ala, tentar relatório/documento fora do escopo → negado.
- [ ] REL-08 — [TEC] Exportar campo fictício começando por =, +, - ou @ → CSV trata como texto e não executa fórmula.
- [ ] REL-09 — [TEC] Conferir volume superior ao limite REST padrão em ambiente separado → listagens/exportações não truncam silenciosamente.
- [ ] REL-10 — Conferir gráficos e cartões → mesmos dados do relatório; legenda textual, estados vazio/erro e valores compreensíveis.

## 22. Notificações por e-mail [UI + TEC] — spec 008

Para cada evento, usar captura local configurada ou destinatário controlado autorizado; não enviar a terceiros. Medir tempo entre evento e entrega esperada em até 5 minutos, no cenário normal. Confirmar primeiro o estado persistido da operação, não apenas a mensagem.

- [ ] NOT-01 — Reserva pendente/alerta de pagamento → mensagem correta ao titular, sem prometer viagem confirmada ou QR antecipado.
- [ ] NOT-02 — Pagamento reconhecido na Ala → mensagem de etapa intermediária, distinta da confirmação da Estaca.
- [ ] NOT-03 — Confirmação da Estaca → mensagem e QR elegível corretos.
- [ ] NOT-04 — Entrada em espera/mudança de posição/promoção → conteúdo representa o evento real, não envia promoção quando apenas entrou na fila.
- [ ] NOT-05 — Expiração/cancelamento de reserva e cancelamento por quórum → mensagens e orientação coerentes com cada situação.
- [ ] NOT-06 — Aprovação/reprovação de termo de menor → destinatário correto, sem documento/token secreto exposto a terceiros.
- [ ] NOT-07 — Aviso/vencimento de crédito → datas e estado corretos.
- [ ] NOT-08 — [TEC] Repetir mesmo evento+reserva dentro de 5 minutos → sem duplicidade de envio.
- [ ] NOT-09 — [TEC] Simular falha do gateway → retry com backoff, até três tentativas conforme spec, depois falha rastreável.
- [ ] NOT-10 — [TEC] Aproximar/atingir cota configurada no ambiente de teste → excedente fica na fila para próximo período, não desaparece.
- [ ] NOT-11 — [TEC] Executar dois workers simultaneamente e simular lease abandonado → recuperação sem corrida de claim; registrar limites da deduplicação externa.
- [ ] NOT-12 — Como U01, consultar métricas → volume/falha/pendências correspondem à fila da própria Estaca, sem acesso a métricas operacionais alheias.

## 23. Jobs, privacidade e retenção [TEC + conferência UI] — specs 001/008/009/010

Antes de acionar jobs, conferir massa de teste e escopo, pois expurgo remove dados. Usar somente instância descartável aprovada, sem registros reais. Não imprimir CRON_SECRET ou outros segredos nas evidências.

- [ ] JOB-01 — Conferir pg_cron/pg_net, URL acessível a partir do container e segredo correspondente → agendamento não depende de localhost inacessível no container.
- [ ] JOB-02 — Acionar endpoint sem segredo/com segredo errado → negado, sem efeito.
- [ ] JOB-03 — Observar execução HTTP real do agendamento → não basta existir uma linha em cron.job.
- [ ] JOB-04 — Conferir validação semanal, expiração de reservas/créditos, quórum, notificações, expurgo e inativação → execução, resultado, quantidade e erros rastreáveis.
- [ ] JOB-05 — Repetir job já executado e provocar falha controlada → sem efeitos duplicados nem sucesso falso; retry recuperável.
- [ ] LGPD-01 — Abrir aviso de privacidade público e solicitação de acesso/exclusão → texto e canal/retorno coerentes; não executar exclusão real de histórico financeiro nesta rodada.
- [ ] LGPD-02 — Testar formulário vazio/inválido e repetido → validação e antiabuso, sem expor solicitações de outra pessoa.
- [ ] LGPD-03 — Preparar termo fictício com 89 dias pós-retorno e executar job → arquivo e registro preservados.
- [ ] LGPD-04 — Preparar termo com 90 dias e executar → arquivo e registro removidos; leitura posterior negada.
- [ ] LGPD-05 — Preparar viagem sem return_date e validar data-base documentada → não deixar documentos retidos indefinidamente; decisão/exigência de fallback rastreável.
- [ ] LGPD-06 — Simular falha no Storage → não apagar registro e reportar sucesso deixando arquivo órfão; falha recuperável.
- [ ] LGPD-07 — Preparar conta com 23 meses e 29 dias sem login → permanece ativa; com 24 meses, inativada, sem excluir histórico.
- [ ] LGPD-08 — Fazer login antes do limite e conferir atividade → atualização confiável, não campo livre do membro.
- [ ] LGPD-09 — Inativar/revogar perfil e usar sessão antiga → operações deixam de funcionar, inclusive por API direta.
- [ ] LGPD-10 — Conferir auditoria de promoção/revogação, criação de Estaca, aprovação/leitura de menor e crédito excepcional → autor, entidade e escopo corretos, sem segredos nos logs.

## 24. Segurança além da interface [TEC] — specs 000/010

Executar somente no ambiente autorizado, com tokens reais dos papéis de teste. service_role não serve para provar que a RLS bloqueia usuários. Consultar primeiro as permissões por catálogo; **não executar RPC de expurgo sobre dados úteis para demonstrar uma falha**.

- [ ] SEG-01 — Com token de member, tentar elevar role/alterar tenant ou ativação do perfil pela API → negado.
- [ ] SEG-02 — Tentar INSERT de reserva já confirmada, com preço/assento/prazo/caravana/embarque adulterados → invariantes e escopo impostos no banco.
- [ ] SEG-03 — Com member titular de reserva confirmada, tentar UPDATE de preço, assento, titular ou campos financeiros usando a permissão de QR → negado; somente a operação específica autorizada funciona.
- [ ] SEG-04 — Com Admin Ala, tentar pular fluxo financeiro, autoaprovar pagamento ou alterar reserva de outra Ala → negado no banco, não somente na UI.
- [ ] SEG-05 — Conferir EXECUTE de funções internas de retenção/fila/métricas e seus checks de ator → anon/authenticated sem privilégio não conseguem chamar operações de serviço.
- [ ] SEG-06 — Tentar manipular chave/limite/janela do limiter pela API → client não escolhe política de proteção nem limpa o histórico de terceiro.
- [ ] SEG-07 — Exceder limites documentados em massa descartável: login 5/15min, reserva 10/min, scanner 30/min, upload 5/h → bloqueio e recuperação após janela; HTTP aplicável com 429/Retry-After, feedback correto nas Server Actions.
- [ ] SEG-08 — Conferir HTML, RSC/JSON, Network, cache e bundle públicos → nome/Ala autorizados podem aparecer, mas não CPF/e-mail/telefone/documentos/tokens/detalhe financeiro/auxílio individual.
- [ ] SEG-09 — Ler arquivo de menor diretamente pelo Storage com ator sem acesso e fora do fluxo auditado → negado; URL temporária não é pública nem permanente.
- [ ] SEG-10 — Inserir texto fictício de teste com caracteres HTML em campo textual → não executa script nem quebra a tela; CSV também protegido.
- [ ] SEG-11 — Conferir headers no servidor de build local → CSP e demais proteções não quebram hidratação, câmera, gráficos ou Storage; política permissiva não é considerada proteção completa.
- [ ] SEG-12 — Conferir DevTools/logs/histórico versionado → nenhuma service_role, chave Resend, segredo QR ou cron exposta.
- [ ] SEG-13 — Executar ensaio separado com segunda Estaca mínima e duas Alas → JWT da principal não lê/grava dados operacionais da outra e vice-versa; nomes/Alas em projeção pública não são tratados como vazamento.
- [ ] SEG-14 — No ensaio cross-tenant, repetir com IDs conhecidos, endpoints diretos, exports, Storage, helpers e logs de cron → sem contagens/metadados privados cruzados; Super Admin continua sem acesso operacional.
- [ ] SEG-15 — Rodar audit, testes de regressão/RLS e gates constitucionais → nenhuma vulnerabilidade crítica/alta aberta e cobertura não mascarada por exclusões.

## 25. Usabilidade, responsividade e recuperação [UI/CEL] — spec 014

Repetir os fluxos principais como membro, jovem, Admin Ala, Admin Estaca e Super Admin. A emulação desktop é complemento, não substitui câmera/teclado/rede de aparelho real.

- [ ] UX-01 — Testar 320, 360, 390, 440, 768 e 1280 px → conteúdo funcional, sem cortar ações ou obrigar rolagem horizontal nas listas principais.
- [ ] UX-02 — Conferir inscritos, caravanas, convidados, validação, equipe, notificações e relatórios → nomes longos, valores/status e ações permanecem legíveis.
- [ ] UX-03 — Abrir/recolher lateral no desktop, navegar e recarregar → um único menu, preferência preservada e conteúdo bem distribuído.
- [ ] UX-04 — Abrir gaveta no celular e fechar por botão/Escape quando disponível → foco controlado e conteúdo não permanentemente coberto.
- [ ] UX-05 — Usar menu superior de conta para perfil, saída e troca bidirecional membro/admin → rótulos claros e permissões corretas.
- [ ] UX-06 — Preencher cadastro/reserva com teclado virtual → campo visível, tipo de teclado adequado, rótulo permanente e erro junto do campo.
- [ ] UX-07 — Usar apenas teclado, Tab/Shift+Tab/Enter/Escape → foco visível, ordem lógica, modais sem armadilha e retorno de foco.
- [ ] UX-08 — Usar zoom 200%, orientação horizontal e leitor de tela → informação/ações preservadas; assentos e status não dependem só de cor.
- [ ] UX-09 — Conferir botões principais com alvo de 48 px, contraste e movimento reduzido → compatíveis com DESIGN.md e spec, sem mudar paleta/tipografia.
- [ ] UX-10 — Simular carregamento lento, erro, lista vazia e formulário inválido → feedback explícito, sem clique duplicado nem perda injustificada de campos.
- [ ] UX-11 — Interromper rede durante cadastro/reserva/aprovação e tentar novamente → estado persistido conferível, sem sucesso falso ou duplicação.
- [ ] UX-12 — Testar mensagens “pago na Ala” versus “confirmado pela Estaca” → participante entende o que falta fazer e consegue voltar à reserva.
- [ ] UX-13 — Reiniciar navegador/aplicação e repetir login → dados persistem e rotas protegidas continuam protegidas.
- [ ] UX-14 — [TEC] Medir carregamento em build local com rede/CPU móvel e volume de teste → registrar condições, bundle e resultados; teste de classes CSS não comprova ausência de overflow.
- [ ] UX-15 — Pedir a pessoa com pouca familiaridade tecnológica que execute cadastro, reserva e acompanhamento sem orientação passo a passo → registrar onde precisou de ajuda e corrigir bloqueios.

## 26. Ambiguidades que não podem ser aprovadas por suposição

| Tema | Como registrar nesta rodada |
|---|---|
| Primeiro member/Admin Estaca antes de existir Ala | INI-01–03: bloquear onboarding se não houver caminho aprovado; não permitir criação administrativa de conta por conveniência |
| Nome/Ala no calendário versus redação antiga da spec 002 | Prevalece Constituição II.g v4.0.0: nome/Ala permitidos por projeção; demais dados protegidos |
| Pedido de auxílio coletado no formulário versus autoria administrativa da spec 012 | Conferir como os dois requisitos coexistem; sem fluxo aprovado, marcar AUX-01/02 bloqueados, não dispensar requested_by autorizado |
| Crédito parcial/excedente e compensação no rollover | Confirmar política e reconciliação antes de CRE-09/TEM-10; não inventar saldo/troco/dupla vantagem |
| Próxima viagem inexistente/lotada | TEM-11 exige definição de resultado antes do aceite |
| Domingo de fechamento versus timeout de 7 dias | TEM-03: comparar a linha do tempo e formalizar conflito se houver |
| Criança de 6–11 anos | Não deduzir a regra de conta/reserva a partir do fluxo de colo ou do jovem 12–17; pedir definição se não estiver aprovada |
| Volta sem ida e token vencido antes de sincronização tardia | EMB-14: resultado observado não substitui regra aprovada |
| Política de verificação/recuperação de e-mail | Registrar contrato e validar; não assumir que email_confirm=true equivale à comprovação de titularidade |

As definições devem voltar às specs/decisões antes de uma correção que altere negócio. Não há implementação dessas regras neste documento.

## 27. Matriz de cobertura do roteiro

| Spec | Blocos principais |
|---|---|
| 000 — Fundação multi-tenant | PRE, EST, INI, ALA, ADM, SEG, instalação independente |
| 001 — Autenticação/RBAC | CAD, ADM, GUE, LGPD |
| 002 — Gestão de caravanas | CAR, RES |
| 003 — Reservas/concorrência | RES, MEN, FIL |
| 004 — Pagamento/validação | PAG, AUX, GUE, TEM, REL |
| 005 — Fila/permuta/crédito | FIL, TRO, CRE |
| 006 — Quórum/menores | MEN, TEM |
| 007 — Check-in | EMB, OFF, REL |
| 008 — Notificações | NOT, JOB |
| 009 — Relatórios/LGPD | REL, LGPD |
| 010 — Hardening | PRE, SEG, gates técnicos |
| 011 — UAT/piloto | UX-15, instalação independente, piloto posterior |
| 012 — Auxílio | AUX |
| 013 — Convidados | GUE, PAG, REL |
| 014 — Design/UX | CAD, CAR, RES, UX |

## 28. Gate antes da primeira implantação

Este roteiro é **homologação local**, não piloto real e não autorização automática de produção. A base de 15 usuários não encerra volume, isolamento cross-tenant, segurança técnica ou observação de campo.

- [ ] GATE-01 — Todos os casos obrigatórios têm resultado/evidência e nenhuma falha crítica/alta permanece aberta.
- [ ] GATE-02 — Onboarding de Estaca nova funciona sem contorno e sem criação de contas por painéis.
- [ ] GATE-03 — Banco e migrations reproduzidos em **segunda instância local independente e limpa**, seguindo SETUP.md; isso não é cadastrar segunda Estaca no mesmo banco.
- [ ] GATE-04 — Build, lint, tipos, unitários, integração/RLS e inventário passam no commit candidato; cobertura atende à Constituição, não só ao threshold legado.
- [ ] GATE-05 — Audit e revisão de permissões/segredos aprovados; testes diretos de API não são substituídos por telas aparentemente corretas.
- [ ] GATE-06 — Jobs demonstram execução real, envio de teste e recuperação; financeiro reconciliado e offline sem perda silenciosa.
- [ ] GATE-07 — Celular real, acessibilidade e jornadas dos seis Admins Ala validados.
- [ ] GATE-08 — Pendências documentais reconciliadas com resultado observado; nenhum relatório declara teste/piloto não executado.
- [ ] GATE-09 — Plano separado da primeira implantação inclui variáveis/callbacks, HTTPS/domínio, Storage, e-mail, cron, backup/restauração, monitoramento e rollback; nenhuma credencial de teste reutilizada.
- [ ] GATE-10 — Responsável aprova explicitamente a implantação inicial **controlada**, com contingência e limites de acesso; não equivale a rollout amplo.

### Verificações posteriores à implantação controlada — não marcar antes do deploy

- [ ] POS-01 — Conferir HTTPS, cookies, redirects/callbacks, cache e headers no ambiente efetivamente implantado.
- [ ] POS-02 — Fazer smoke test com contas/dados autorizados e destinatários controlados → cadastro, reserva, aprovação, QR, relatório e jobs funcionam no ambiente real.
- [ ] POS-03 — Conduzir piloto de caravana real em paralelo ao controle anterior, com contingência, feedback e divergências registradas (spec 011).
- [ ] POS-04 — Emitir aceite de campo e decisão de rollout amplo somente após evidências reais; não desligar o processo anterior com base apenas no checklist local.

### Parecer da rodada

- Resultado: **NÃO EXECUTADO**.
- Bloqueadores:
- Pendências médias/baixas e plano de tratamento:
- Commit candidato após correções:
- Responsável pelo aceite:
- Data e decisão:

## 29. Fontes do resultado esperado

- [Constituição](../.specify/memory/constitution.md)
- [Decisões aprovadas](DECISIONS.md)
- [Specs 000–014](../specs/)
- [Estratégia de testes](TESTING.md)
- [Segurança](SECURITY.md)
- [Guia de instalação](../SETUP.md)
- [Design System](../DESIGN.md)
- [Registro de remediação](REGISTRO-REMEDIACAO.md)
- [Situação do piloto](PILOTO_RELATORIO_FINAL.md)

Os números/estados históricos desses documentos não substituem uma execução nova no commit candidato. Este arquivo acrescenta somente um roteiro e dados textuais fictícios; não concede privilégios, não executa testes e não cria nenhum perfil na base.
