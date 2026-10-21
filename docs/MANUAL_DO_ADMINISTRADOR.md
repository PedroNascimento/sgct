# Manual do Administrador — SGCT
### Sistema de Gestão de Caravanas ao Templo
**Guia Prático para Administradores de Ala e de Estaca**

---

## 1. Introdução e Propósito

Bem-vindo ao SGCT! Este sistema foi projetado com carinho e reverência para apoiar os líderes e membros da Igreja na organização e participação nas caravanas ao Templo.

O propósito do SGCT é aliviar o fardo administrativo dos líderes voluntários, substituindo controles manuais em planilhas por um fluxo seguro, transparente e justo para todos os santos.

### Os Dois Papéis Administrativos

1. **Administrador de Ala (`ward_admin`):**
   - É o elo direto com os membros da sua unidade (Ala ou Ramo).
   - Apoia membros com dificuldades tecnológicas nas inscrições.
   - Confirma o recebimento local dos pagamentos da sua Ala.
   - Realiza o repasse formal dos valores para a liderança da Estaca.
   - Analisa e aprova os Termos de Autorização de Menores da sua Ala.
   - Medeia pedidos de permuta entre membros da unidade.

2. **Administrador de Estaca (`stake_admin`):**
   - É responsável pelo planejamento e governança das caravanas da Estaca.
   - Cria e configura novas caravanas (datas, limites de assentos, valores e pontos de embarque).
   - Valida os lotes semanais de repasse enviados pelos Administradores de Ala.
   - Acompanha o atingimento do quórum mínimo e gerencia a lista de espera geral.
   - Coordena o embarque no dia da viagem via Check-in por QR Code.
   - Emite o Manifesto Oficial de Passageiros para apresentação à ANTT/Polícia Rodoviária e à empresa de ônibus.

---

## 2. Acesso ao Sistema e Primeiro Login

O SGCT é uma plataforma multi-tenant isolada. Cada Estaca possui seu próprio endereço exclusivo no formato:
`https://sgct.exemplo.org/[sua-estaca]` (por exemplo: `https://sgct.exemplo.org/natal`).

### Como Entrar:
1. Acesse o endereço da sua Estaca fornecido pelo Coordenador de Caravanas.
2. Clique no botão **"Entrar"** no canto superior direito.
3. Insira seu e-mail e senha cadastrados.
4. Ao se autenticar, o sistema direcionará você automaticamente para o painel administrativo correspondente ao seu papel:
   - Administradores de Ala acessam o painel da sua respectiva Ala.
   - Administradores de Estaca têm visão geral de todas as Alas e caravanas ativas.

---

## 3. Gestão de Caravanas (Administrador de Estaca)

### Criando uma Nova Caravana
No menu lateral, clique em **"Caravanas"** e depois no botão **"Nova Caravana"**. Preencha os campos obrigatórios:
- **Título / Descrição:** Ex: *Caravana de Outubro — Templo de Recife*.
- **Data de Partida e Data de Retorno:** Horários e dias planejados para ida e volta.
- **Prazo Limite de Inscrição:** Data a partir da qual novas reservas regulares não são mais aceitas pelo sistema.
- **Data de Verificação de Quórum:** Data em que a liderança avalia se o ônibus atingiu a ocupação mínima de viabilidade financeira.
- **Preço Regular (R$) e Preço para Oficiantes do Templo (R$):** Se houver tarifa subsidiada para oficiantes com recomendação ativa, defina o valor com desconto.
- **Limite de Assentos:** Quantidade total de lugares no ônibus (geralmente 46 a 50 assentos).
- **Limite da Lista de Espera:** Quantidade máxima de inscrições permitidas na fila após o preenchimento do ônibus (ex: 10 vagas).
- **Quórum Mínimo:** Número mínimo de passageiros pagantes para confirmar a viagem (ex: 40 passageiros).
- **Pontos de Embarque:** Cadastre os locais onde o ônibus fará paradas para embarcar membros (ex: Capela Neópolis, Capela Tirol, Posto Rodoviário).

---

## 4. O Fluxo de Reservas e Escolha de Assentos

### Como os Membros Reservam
1. O membro acessa o portal público da Estaca, seleciona a caravana ativa e visualiza o mapa visual do ônibus.
2. Cada membro pode reservar para si mesmo e para dependentes de sua família (incluindo menores de idade).
3. **Travamento Imediato:** Ao selecionar o assento no mapa, ele fica imediatamente reservado para aquele membro no status **`PENDENTE`**, evitando que duas pessoas cliquem no mesmo lugar simultaneamente.
4. **Importante:** Ter um assento reservado não garante o embarque definitivo até que o pagamento seja confirmado pela Ala e validado pela Estaca no ciclo semanal.

---

## 5. Ciclo Semanal de Validação e Pagamentos

Para garantir transparência financeira e evitar cobranças desorganizadas, o SGCT adota um **ciclo semanal em duas etapas**:

```
[Membro Realiza Pagamento]
          ↓
[Admin de Ala Confirma Recebimento Local] (Status: PAGO_ALA)
          ↓
[Admin de Ala Consolida Lote de Repasse e Transfere à Estaca]
          ↓
[Admin de Estaca Valida o Lote Semanal] (Status: CONFIRMADO)
```

### Passo a Passo para o Administrador de Ala:
1. Acesse o menu **"Financeiro / Pagamentos"** da sua Ala.
2. Localize os membros da sua unidade que realizaram o pagamento via PIX, dinheiro ou depósito identificado na conta da caravana da Ala.
3. Clique em **"Confirmar Pagamento Local"** para cada reserva quitada. O status mudará para `PAGO_ALA`.
4. Ao final da semana (geralmente domingo à noite ou segunda-feira), reúna todas as reservas pagas e clique em **"Criar Lote de Repasse"**.
5. Transfira o montante total para a conta bancária oficial da Estaca e anexe o comprovante bancário do lote no SGCT.

### Passo a Passo para o Administrador de Estaca:
1. Acesse o menu **"Financeiro da Estaca / Lotes Recebidos"**.
2. Compare o valor do comprovante bancário anexado pela Ala com o extrato da conta da Estaca.
3. Se o valor estiver correto, clique em **"Validar Lote Semanal"**.
4. Imediatamente, **todas as reservas incluídas naquele lote avançam para o status `CONFIRMADO`**, e os membros recebem confirmação por e-mail com a liberação de seus bilhetes de viagem.

---

## 6. Termos de Autorização de Menores (ECA e Regras da Igreja)

Para qualquer jovem ou criança menor de 18 anos que viaje desacompanhado dos pais ou com outro responsável:
1. O responsável legal deve baixar o modelo oficial do **Termo de Autorização de Viagem** disponibilizado no sistema.
2. O termo deve ser assinado e digitalizado (PDF ou foto legível).
3. O responsável faz o upload do documento na área de detalhes da sua reserva.
4. **Aprovação pelo Administrador de Ala:**
   - No menu **"Autorizações de Menores"**, o Admin de Ala analisa o documento enviado.
   - Verifique: legibilidade, assinatura dos pais e indicação do adulto responsável no ônibus.
   - Clique em **"Aprovar Documento"** ou **"Rejeitar com Motivo"** (o responsável é notificado para reenviar se houver erro).
5. **Regra de Segurança:** Nenhuma reserva de menor é liberada para check-in no dia do embarque sem que a autorização esteja expressamente aprovada no sistema.

---

## 7. Fila de Espera, Permutas e Créditos

### Como Funciona a Fila de Espera Justa
- Quando todos os assentos do ônibus são preenchidos, os próximos inscritos entram na **Lista de Espera**.
- A ordem é rigorosamente cronológica (**FIFO** — primeiro a entrar, primeiro a sair).
- Se houver uma desistência formal aprovada pela liderança, o primeiro membro da fila de espera é promovido automaticamente para o status de reserva, e o sistema envia um e-mail de aviso para que ele proceda ao pagamento na Ala.

### Permutas Entre Membros (Trocas de Assento)
- Se um membro confirmado não puder mais viajar na data, ele **não pode vender ou transferir sua vaga diretamente** sem controle.
- Ele deve solicitar a permuta através do sistema, indicando o membro substituto (da mesma Ala ou com mediação da liderança).
- O Administrador de Ala ou de Estaca avalia e clica em **"Aprovar Permuta"**.
- O sistema atualiza a titularidade do assento instantaneamente e ajusta o Manifesto Oficial de Passageiros.

### Créditos para Caravanas Futuras
- Se um membro precisar cancelar sua participação antes do prazo limite e a vaga for preenchida por alguém da lista de espera, o valor pago é convertido em **Crédito no SGCT**.
- Esse crédito fica vinculado ao perfil do membro e poderá ser utilizado como desconto na próxima caravana em que ele se inscrever.

---

## 8. Dia da Viagem: Check-in por QR Code e Operação Offline

No dia da partida, a pontualidade e organização no embarque são essenciais para que o ônibus saia no horário programado.

### Como Realizar o Check-in no Celular:
1. Abra o navegador do seu celular (smartphone) e acesse o SGCT.
2. Acesse a caravana do dia e toque no botão **"Check-in de Embarque"**.
3. O sistema carrega a lista completa de passageiros confirmados no seu aparelho.
4. **Modo Offline:** Mesmo que a conexão 4G/Wi-Fi oscile ou caia no ponto de embarque, a tela de check-in continua funcionando sem interrupções!

### Duas Formas de Confirmar o Embarque:
- **Pela Câmera (QR Code):** Peça ao passageiro para mostrar o QR Code na tela do celular ou impresso no comprovante. Aponte a câmera do seu celular; o sistema bipará na hora exibindo o nome, foto, número do assento e confirmando a presença.
- **Manual por Busca Rápida:** Digite os primeiros caracteres do nome ou o número do assento do membro na barra de pesquisa e toque em **"Confirmar Presença"**.

---

## 9. Manifesto de Passageiros (ANTT e Fiscalização)

Antes do ônibus ligar os motores e iniciar a viagem na rodovia:
1. O Administrador de Estaca acessa o menu **"Relatórios / Manifesto de Passageiros"**.
2. Clique no botão **"Gerar Manifesto ANTT (PDF)"**.
3. O sistema gera instantaneamente o documento consolidado contendo:
   - Dados completos da Caravana e da Estaca promotora.
   - Razão social, CNPJ e placa do veículo de transporte contratado.
   - Lista completa de todos os passageiros com Nome Completo, Número do Documento de Identidade (RG/Certidão), Órgão Emissor e CPF.
   - Lista de menores de idade com a identificação formal do adulto acompanhante responsável.
   - Assinatura do Coordenador responsável pelo grupo.
4. Imprima duas vias ou compartilhe o PDF diretamente com o motorista do ônibus para apresentação nos postos fiscais da Polícia Rodoviária Federal (PRF) e ANTT.

---

## 10. FAQ e Suporte aos Membros

**P: Um membro idoso não tem smartphone nem e-mail. Como inscrevê-lo?**
*R:* O Administrador de Ala pode cadastrar o membro diretamente pelo painel administrativo, selecionando o assento em nome dele. O comprovante e QR Code podem ser impressos em papel na impressora da capela.

**P: Um membro pagou o valor errado (a menos ou a mais). O que fazer?**
*R:* O Administrador de Ala não deve confirmar o pagamento local enquanto o valor exato da tarifa não for ajustado. Se houver crédito prévio no perfil do membro, o sistema abaterá o valor automaticamente no momento da reserva.

**P: O que acontece se a caravana não atingir o quórum mínimo até a data estipulada?**
*R:* Na data de verificação de quórum, a liderança da Estaca pode optar por: (a) renegociar com a empresa de ônibus um veículo menor, (b) estender o prazo por mais 48 horas ou (c) cancelar a viagem, convertendo todos os valores pagos em créditos integrais para a próxima caravana.

**P: Em caso de dúvidas técnicas com a plataforma, a quem recorrer?**
*R:* Entre em contato com a equipe de suporte técnico da sua Estaca ou consulte o Administrador de Sistemas responsável pela implantação.
