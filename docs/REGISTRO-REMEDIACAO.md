# Registro de remediação da auditoria

Data: 21/10/2026. Responsável por execução/aceite: mantenedor do projeto. Origem: [auditoria](AUDITORIA-2026-10-21.md); tarefas detalhadas e dependências no [plano](PLANO-REMEDIACAO-2026-10-21.md). A implementação operacional de todos os 24 achados permanece **ABERTA**. Esta fase não corrige políticas, transações ou fluxos de usuários.

A01: promoção foi autorizada normativamente; o excesso de acesso continua aberto. M04/M05: infraestrutura de baseline entregue, gates completos pendentes. M06: afirmações documentais corrigidas nesta fase; homologação real ainda pendente. Nome/Ala públicos não são vulnerabilidade; M01 trata somente a informação excedente.

| ID | Tema | Tarefas responsáveis | Critério obrigatório para fechar |
|---|---|---|---|
| C01 | RPC privilegiada exposta | R02.1–R02.3, R04.2, R09.5 | Chamadas anon e fora do tenant negadas sem efeitos; operação legítima atômica. |
| C02 | INSERT de reserva forjada | R02.1, R02.4–R02.5, R11.2 | PostgREST não permite confirmação/preço/prazo adulterados; reserva válida funciona. |
| A01 | Poderes e lookup de Super Admin | R03.1–R03.4 | Busca dirigida mínima e promoção de conta existente; sem listagem global nem operação de Estaca. |
| A02 | UPDATE amplo e referências cruzadas | R02.3, R02.5–R02.6, R04.6 | Acesso direto não altera estado/tenant indevido; transições permitidas persistem com auditoria. |
| A03 | Upload, guest e QR bloqueados por RLS | R05.1, R05.4, R06.1 | Sessões reais completam fluxos autorizados, sem bypass service_role no caminho sob teste. |
| A04 | Consumo de crédito sem abatimento persistido | R04.3 | Reuso concorrente negado, falha intermediária reverte tudo e total recarregado confere. |
| A05 | Unicidade e liberação de assento | R04.1–R04.2 | Expirar/liberar/promover não perde histórico nem duplica ocupação; teste concorrente. |
| A06 | Fluxos sem chamada produtiva | R04.2, R04.5, R05.3, R07.1 | Evento real aciona fila, rollover e auxílio; estados e efeitos comprovados ponta a ponta. |
| A07 | Permuta e manifesto incorretos | R04.4, R08.1–R08.2 | Uma titularidade efetiva por assento; documento correto, sem nascimento fictício ou duplicata. |
| A08 | Perda e validação de pendências offline | R06.3–R06.6 | QR inválido recusado, lote parcial preserva falhas, cache isolado e sincronização idempotente. |
| A09 | Autorização de liderança do check-in | R03.4, R06.2 | Somente liderança/papel previsto na spec opera a caravana; outros atores negados diretamente. |
| A10 | Segredo fallback e validação de QR | R06.1, R09.5 | Configuração ausente falha fechada; expiração, assinatura, finalidade e contexto testados. |
| A11 | Eventos, deduplicação e fila | R07.1–R07.4 | Evento correto entregue à caixa local; workers concorrentes, retries e cota testados. |
| A12 | Retenção incompleta e falha de Storage | R05.5–R05.6, R07.6 | Retorno nulo usa data prevista; falhas não são sucesso, remoção rastreável e sem órfãos. |
| A13 | Leitura de menor sem auditoria eficaz | R02.2–R02.3, R05.2 | Entrega autorizada gera log obrigatório; falha de log nega URL, leitura direta indevida negada. |
| A14 | Rate limiter manipulável/não atômico | R09.1–R09.2 | Chave/limite derivado no servidor; corrida e manipulação recusadas com limites legítimos. |
| A15 | Cadastro público, idade e consentimento | R03.6, R05.6, R09.1 | Entrada efetiva valida data/idade/consentimento persistido e antiabuso, inclusive Edge direta. |
| A16 | Atividade, inativação e sessão/cache | R03.4–R03.5, R07.6 | Login confiável atualiza atividade; conta/tenant inativos e sessão revogada perdem poderes. |
| M01 | Projeção pública excessiva | R08.3–R08.4 | Nome/Ala mantidos; campos sensíveis ausentes do HTML/RSC/JSON e cache. |
| M02 | Relatórios financeiros e CSV | R04.3, R08.1–R08.2 | Check-in não muda financeiro; guest reconciliado no escopo correto, CSV sem fórmula executável. |
| M03 | Jobs sem execução comprovada | R07.5–R07.6, R11.4 | Execução HTTP local real, último sucesso/erro e falhas/retries registrados, sem e-mail externo. |
| M04 | Headers, CI e fronteiras de serviço | R02.6, R08.4, R09.3, R09.5–R09.6 | CI remoto verde quando acionado, headers compatíveis e service_role fora de ações comuns. |
| M05 | Cobertura e testes incompletos | R09.5–R09.6, R11.1–R11.2 | Branches/functions e global cumprem constituição com denominadores claros e casos reais. |
| M06 | Homologação documental sem comprovação | R11.3, R11.5–R11.7 | Instalação independente e piloto têm evidências reais e datadas; nenhum GO antecipado. |

## Procedimento de fechamento

Para cada achado: registrar regressão antes da correção, mudança/commit, comando e resultado depois, ambiente/ator, evidência sem dados pessoais e risco residual. Teste verde não relacionado não fecha achado. Alterações de banco exigem integração/RLS com duas Estacas, chamadas diretas e sessões reais. Aprovação de desenho constitucional não certifica implementação. Nenhuma fase seguinte foi executada implicitamente.

