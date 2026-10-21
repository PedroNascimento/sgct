# Roteiro futuro de homologação, contingência e feedback — Spec 011

Revisão: 21/10/2026. **Template não executado.** O sistema está somente em desenvolvimento local. Nenhuma caravana, liderança ou resultado abaixo está confirmado. Não enviar e-mails reais nem coletar documentos reais de menores durante testes automatizados.

## Preparação (T011.1–T011.2)

- [ ] Confirmar caravana, Estaca, datas, capacidade e pontos de embarque a partir do cadastro aprovado.
- [ ] Registrar responsáveis pelo teste, suporte e aceite, com sua autorização.
- [ ] Escolher dados de teste e definir acesso restrito, retenção e consentimentos aplicáveis.
- [ ] Treinar os participantes com o manual existente; registrar dúvidas observadas.
- [ ] Definir qual controle operacional continua oficial e como comparar o SGCT, sem transição automática.

## Marcos a executar (T011.3)

| Marco | Cenário | Evidência a registrar |
|---|---|---|
| Inscrições | Cadastro, reserva concorrente, fila e limites | Sessão/ator, passos e resultado esperado/obtido |
| Financeiro | Recebimento na Ala, lote e validação pela Estaca | Reconciliação autorizada, sem dados pessoais no relatório público |
| Menores, auxílio e convidados | Fluxos permitidos e bloqueios | Resultado, erro e trilha de auditoria minimizada |
| Crédito e permuta | Compensação, titularidade e ocupação | Estado persistido antes/depois e histórico |
| Embarque | QR, liderança, duplicata, offline e sincronização parcial | Dispositivo, rede, direção, falha e recuperação |
| Fechamento | Relatórios e retenção | Totais reconciliados e pendências |
| Instalação independente | SETUP desde zero em instância descartável distinta | Comandos, versões e evidências sem credenciais |

## Registro de divergências (T011.5)

Preencher apenas após executar: identificador, data, cenário, esperado, obtido, severidade, evidência sem PII, spec/tarefa de correção, responsável e reteste. Nunca substituir falha por afirmação genérica de conformidade.

## Contingência a aprovar antes do piloto

- [ ] Definir backup/restauração conforme a infraestrutura efetivamente contratada e comprovar teste de restauração; não presumir snapshots horários/30 dias no free tier.
- [ ] Definir exportação mínima, destinatários autorizados, proteção do dispositivo e prazo de descarte; não prometer CSV/PDF criptografado se essa função não foi verificada.
- [ ] Preparar lista física controlada e procedimento manual de presença para indisponibilidade, com posterior reconciliação.
- [ ] Definir carregadores/aparelho reserva e contato de suporte.
- [ ] Documentar interrupção segura e retorno ao controle oficial. Não prometer risco zero.

## Feedback de usuários reais (T011.4)

Aplicar após a sessão: papel do participante (sem nome obrigatório), dispositivo, cenário e avaliação 1–5 de facilidade de acesso, leitura, escolha do assento, compreensão do pagamento/confirmação, uso no celular e recuperação de erros. Perguntar: “Onde ficou em dúvida?”, “Precisou de ajuda?” e “O que impediria seu uso?”.

Resultados: **não coletados**. Registrar número de respostas, período, distribuição e método antes de calcular média. Medir tempo de check-in com amostra, condições de rede/dispositivo e percentis; não preencher valores exemplificativos como resultados.

## Encerramento (T011.8)

Anexar evidências, divergências e retestes ao relatório. Homologação local, instalação limpa, piloto real e aprovação de produção são marcos distintos. Só o responsável poderá aprovar a próxima etapa após revisar os bloqueadores.
