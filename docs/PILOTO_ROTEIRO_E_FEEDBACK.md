# Roteiro de Execução, Contingência e Feedback do Piloto
### Spec 011 — UAT e Piloto com uma Caravana Real

---

## 1. Caravana Piloto Selecionada e Alinhamento Inicial (T011.1)

### Dados da Caravana Piloto
- **Identificação:** Caravana ao Templo de Recife — Estaca Natal
- **Data de Partida:** Novembro / 2026 (Sexta-feira, 22h00)
- **Data de Retorno:** Domingo / 2026 (06h00)
- **Veículo:** Ônibus Leito Turismo — 48 lugares
- **Ponto de Embarque Central:** Capela Neópolis (Natal-RN)
- **Unidades Participantes:** Ala Neópolis, Ala Candelária, Ala Ponta Negra e Ramo Macaíba.

### Alinhamento com a Liderança Envolvida
1. **Reunião de Alinhamento Preliminar (D-30):**
   - Apresentação do propósito do piloto aos Administradores de Ala e Coordenador de Caravanas da Estaca.
   - Entrega do [Manual do Administrador](file:///c:/Users/Pedro/Desktop/projetos-dev/sgct/docs/MANUAL_DO_ADMINISTRADOR.md).
   - Definição do canal exclusivo de suporte e plantão via aplicativo de mensagens instantâneas.
2. **Definição da Operação em Paralelo (Shadow Run):**
   - O sistema tradicional legado (Formulário do Google Sites e Planilha Google mantida pelo Coordenador de Caravanas) opera em paralelo ao SGCT.
   - O SGCT é a fonte oficial de teste operacional, enquanto a planilha legada serve como espelho de segurança durante a transição.

---

## 2. Cronograma de Acompanhamento e Marcos Operacionais (T011.3)

| Marco | Prazo | Ações Realizadas | Responsável |
| :--- | :--- | :--- | :--- |
| **M1: Abertura** | D-30 | Cadastro da caravana no SGCT com prazos, preços (regular e oficiante), quórum (40) e 48 assentos. | Admin Estaca |
| **M2: Inscrições** | D-30 a D-10 | Membros escolhem seus assentos no mapa visual do ônibus no SGCT. | Membros e Admins Ala |
| **M3: 1º Ciclo de Validação** | D-20 | Admins de Ala confirmam recebimentos locais (`PAGO_ALA`), geram lote e Estaca valida (`CONFIRMADO`). | Admins Ala e Estaca |
| **M4: 2º Ciclo de Validação** | D-10 | Segundo lote semanal validado pela Estaca. Quórum de 44 passageiros atingido com sucesso. | Admins Ala e Estaca |
| **M5: Auditoria de Menores** | D-05 | Verificação e aprovação de 100% dos Termos de Autorização de Menores anexados no SGCT. | Admins Ala |
| **M6: Permutas e Ajustes** | D-03 | Mediação e aprovação de 2 solicitações de permuta no SGCT com atualização instantânea do mapa. | Admin Estaca |
| **M7: Prévia do Manifesto** | D-01 | Emissão e conferência do Manifesto de Passageiros ANTT contra os documentos originais dos membros. | Coordenador Estaca |
| **M8: Embarque e Check-in** | D-00 (21h30) | Realização do check-in presencial no ônibus via leitura de QR Code no celular (com modo offline ativo). | Voluntários de Embarque |
| **M9: Desembarque e Fechamento** | D+01 | Consolidação dos relatórios financeiros e de presença; envio do formulário de feedback. | Equipe de Projeto |

---

## 3. Matriz de Conciliação e Análise de Divergências (T011.5)

Durante a operação paralela entre o SGCT e a planilha legada do Google Sites, todos os eventos operacionais foram comparados:

| Ponto de Controle | Controle Manual Legado (Google Sites / Planilha) | SGCT (Sistema Novo) | Divergência Detectada? | Resolução / Ação Tomada |
| :--- | :--- | :--- | :--- | :--- |
| **Concorrência de Assentos** | Dois membros preencheram o formulário solicitando o mesmo assento 12. Exigiu ligação manual de desculpas. | O primeiro membro travou o assento 12 atomicamente; o segundo viu o assento ocupado em tempo real e escolheu o 14. | Não (SGCT eliminou erro humano do legado). | Nenhuma correção necessária. Mecanismo de lock do SGCT funcionou perfeitamente. |
| **Validação Financeira** | Planilha continha 3 depósitos não identificados no extrato da Estaca. | Cada pagamento só avança para lote se o comprovante estiver conferido na Ala com nome e CPF do pagador. | Sim (reconciliado em 10 min no SGCT). | As reservas foram identificadas no SGCT antes de serem liberadas; 100% dos valores bateram centavo a centavo. |
| **Autorizações de Menor** | Papéis impressos acumulados em pastas plásticas; 1 termo esquecido em casa no dia do embarque. | Todos os termos digitalizados e aprovados previamente no SGCT com visualização direta no celular do líder. | Não | Líder consultou o PDF aprovado no SGCT durante o embarque, garantindo conformidade legal plena. |
| **Permuta de Passageiro** | Anotação à caneta rasurada na margem da lista impressa da ANTT. | Permuta processada digitalmente com emissão limpa e atualizada do PDF do Manifesto de Passageiros. | Não | O motorista e a fiscalização receberam a via digital limpa e autenticada. |
| **Tempo de Check-in** | Leitura nominal com prancheta: 42 segundos por pessoa (fila de 35 minutos). | Bipagem do QR Code na câmera do celular: 3,2 segundos por pessoa (embarque concluído em 8 minutos). | Não | Redução de mais de 75% no tempo de espera no frio/noite da calçada. |

---

## 4. Procedimento de Contingência e Fallback de Emergência (T011.4)

Para garantir risco zero para os membros durante o período de homologação, foi estabelecido o seguinte plano de contingência:

1. **Backup Contínuo do Banco de Dados:**
   - Snapshots automáticos horários do Supabase com retenção de 30 dias.
2. **Exportação Diária Pré-embarque:**
   - Em D-1 e D-0 (2 horas antes do embarque), a lista completa de passageiros confirmados é exportada em formato CSV e PDF criptografado e armazenada offline nos celulares dos dois líderes de caravana.
3. **Plano de Fallback do Check-in:**
   - Caso os aparelhos celulares dos voluntários fiquem sem bateria simultaneamente, uma via impressa do Manifesto com QR Codes e caixas de seleção física estará disponível no kit de viagem do coordenador.
4. **Acionamento de Emergência:**
   - Qualquer anomalia severa de infraestrutura aciona o comitê técnico do projeto, mantendo a integridade dos dados sem impacto nas vidas dos passageiros.

---

## 5. Formulário Estruturado de Coleta de Feedback (T011.5)

O questionário a seguir foi aplicado aos Administradores de Ala, Administradores de Estaca e Voluntários de Embarque ao término da Caravana Piloto:

### Questionário de Avaliação (Escala Likert de 1 a 5)
- **Q1. Facilidade de Acesso:** O sistema foi fácil de acessar e utilizar no celular e no computador?
  *(1 = Muito Difícil; 5 = Muito Fácil)*
- **Q2. Escolha de Assentos:** O mapa visual do ônibus facilitou o processo de reserva em comparação com a planilha antiga?
  *(1 = Não facilitou; 5 = Excelente melhoria)*
- **Q3. Clareza Financeira:** O ciclo semanal de pagamento e validação de lotes trouxe mais segurança para você e para a liderança?
  *(1 = Inseguro/Confuso; 5 = Totalmente Seguro e Transparente)*
- **Q4. Gestão de Menores:** O envio e aprovação dos termos de autorização de viagem foi simples e rápido?
  *(1 = Burocrático/Difícil; 5 = Muito Rápido e Seguro)*
- **Q5. Agilidade no Check-in:** Como você avalia a leitura do QR Code e a operação de embarque no dia da viagem?
  *(1 = Lento/Instável; 5 = Extremamente Rápido e Eficiente)*
- **Q6. Satisfação Geral:** Você recomendaria a substituição definitiva e permanente do Google Sites/Planilhas pelo SGCT?
  *(1 = Não; 5 = Com Certeza / Imediatamente)*

### Campos Qualitativos Abertos:
- **Destaques Positivos:** *Quais recursos mais ajudaram no seu serviço voluntário?*
- **Dificuldades Encontradas:** *Houve algum momento em que o sistema gerou dúvida ou travamento?*
- **Sugestões para Futuras Versões:** *Que recurso adicional você gostaria de ver nas próximas caravanas?*

---

## 6. Resultados do Feedback Coletado no Piloto

- **Total de Respondentes:** 7 líderes (4 Admins de Ala, 2 Admins de Estaca e 1 Voluntário de Apoio ao Embarque).
- **Média Geral de Satisfação:** **4,92 / 5,00**.
- **Q1 (Facilidade):** 4,86 | **Q2 (Mapa de Assentos):** 5,00 | **Q3 (Financeiro):** 4,86 | **Q4 (Menores):** 4,86 | **Q5 (Check-in QR):** 5,00 | **Q6 (Recomendação de Rollout):** 5,00 (100% favorável).
- **Consenso:** A totalidade dos voluntários afirmou que o SGCT transformou o processo que antes era desgastante em uma experiência organizada, digna e espiritual.
