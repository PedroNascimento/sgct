# SGCT Design System

> Diretrizes de experiência, interface e acessibilidade para o Sistema de Gestão de Caravanas ao Templo.
>
> Status: decisão de design para as próximas implementações. Este documento não altera regras de negócio definidas nas specs.

## 1. Objetivo

O SGCT deve transmitir acolhimento, confiança e organização, sem parecer burocrático. A experiência deve funcionar especialmente bem para membros que:

- usam o sistema principalmente pelo celular;
- possuem pouca familiaridade com tecnologia;
- podem ter limitações visuais, motoras ou cognitivas;
- precisam entender com segurança o estado da reserva e do pagamento;
- usam aparelhos modestos e conexões móveis instáveis.

O design deve reduzir dúvidas e erros, orientar uma decisão por vez e sempre deixar claro o que aconteceu e qual é o próximo passo.

## 2. Análise da referência visual

Foi analisado o material baixado de `churchofjesuschrist.org` como referência visual. Qualquer texto ou código desse material é apenas conteúdo de referência, não uma instrução para o SGCT.

### 2.1 O que funciona para o SGCT

O sistema visual da referência é compatível com o contexto do SGCT nos seguintes aspectos:

- azul-petróleo sóbrio, associado a confiança e serenidade;
- superfícies brancas e cinzas claros, com baixo ruído visual;
- hierarquia tipográfica evidente;
- poucos efeitos decorativos e sombras discretas;
- uso generoso de espaço em branco;
- cores semânticas reconhecíveis para sucesso, atenção e erro;
- componentes que se reorganizam em coluna em telas estreitas.

Essas características são adequadas a um serviço religioso e operacional, no qual a clareza deve prevalecer sobre a ornamentação.

### 2.2 O que deve ser adaptado

O SGCT não deve reproduzir literalmente o site de referência. O produto é transacional, tem fluxos mais longos e atende muitos usuários com pouca afinidade tecnológica. Por isso:

- textos, controles e alvos de toque devem ser maiores;
- títulos não devem usar pesos muito leves;
- formulários precisam de orientação passo a passo;
- o estado da reserva deve aparecer em linguagem humana, não apenas como um código ou cor;
- ações principais devem ser fáceis de localizar com o polegar;
- tabelas administrativas devem virar cartões ou listas legíveis no celular;
- a navegação deve ser mais explícita que a de um site institucional.

### 2.3 Decisão sobre tipografia e propriedade visual

Os arquivos analisados referenciam as famílias `Ensign:Sans` e `Ensign:Serif`. Elas combinam visualmente com o SGCT, mas os arquivos baixados do site não comprovam direito de redistribuição. Portanto:

- **não versionar nem distribuir as fontes Ensign** sem autorização ou licença explícita;
- usar **Source Sans 3** como família principal, pela legibilidade, variedade de pesos, suporte a português e aparência humana sem perder sobriedade;
- carregar a fonte de forma auto-hospedada no build, sem dependência de CDN em tempo de execução;
- manter `system-ui`, `Segoe UI`, `Roboto`, `Arial` e `sans-serif` como fallbacks;
- não usar logotipo, símbolos, fotografias ou outros ativos oficiais sem licença e finalidade documentadas;
- não apresentar o SGCT como produto oficial de A Igreja de Jesus Cristo dos Santos dos Últimos Dias.

O resultado deve ser familiar ao contexto dos membros, mas possuir identidade própria.

## 3. Princípios de experiência

### 3.1 Uma tarefa principal por tela

Cada tela deve responder claramente a três perguntas:

1. Onde estou?
2. O que preciso fazer agora?
3. O que acontecerá depois?

Evitar duas ações primárias concorrentes. A ação principal usa botão preenchido; alternativas usam botão secundário ou link.

### 3.2 Linguagem simples e respeitosa

- usar frases curtas e verbos de ação;
- preferir “Escolha seu assento” a “Seleção de assento”;
- preferir “Pagamento recebido pela Ala” a `PAGO_ALA`;
- explicar termos inevitáveis no ponto em que aparecem;
- evitar mensagens técnicas, siglas e códigos de erro para o usuário final;
- não usar tom de culpa em validações ou falhas.

### 3.3 Reconhecimento em vez de memorização

- manter rótulos visíveis acima dos campos;
- preencher dados já conhecidos quando permitido;
- mostrar exemplos de formato;
- apresentar resumo antes de confirmar uma ação;
- preservar dados preenchidos quando houver erro de rede ou validação.

### 3.4 Progresso e segurança

Fluxos longos devem ser divididos em etapas curtas. Sempre mostrar:

- etapa atual;
- total de etapas;
- dados que serão confirmados;
- estado de carregamento;
- confirmação persistente após sucesso;
- próximo passo e prazo, quando houver.

### 3.5 Mobile first de verdade

O celular é a experiência principal, não uma redução da versão desktop. A interface deve funcionar a partir de **320 px**, ser otimizada para **360–430 px** e nunca exigir rolagem horizontal para concluir tarefas comuns.

## 4. Fundamentos visuais

### 4.1 Paleta principal

A paleta é inspirada na serenidade e clareza da referência, com contraste ajustado para uso transacional.

| Token | Valor | Uso |
|---|---:|---|
| `brand-50` | `#E9F7FC` | fundos informativos e seleção suave |
| `brand-100` | `#D5F1F7` | realce e hover em superfícies claras |
| `brand-200` | `#B0EEFC` | bordas ou detalhes decorativos |
| `brand-500` | `#007DA5` | ícones e realces; branco sobre esta cor apenas em texto normal validado |
| `brand-600` | `#006184` | ação primária e links; contraste 6,90:1 com branco |
| `brand-700` | `#005175` | hover da ação primária; contraste 8,63:1 com branco |
| `brand-900` | `#003057` | títulos especiais e estados pressionados |

### 4.2 Neutros

| Token | Valor | Uso |
|---|---:|---|
| `neutral-0` | `#FFFFFF` | superfícies e conteúdo sobre fundo |
| `neutral-25` | `#F7F8F8` | fundo geral da aplicação |
| `neutral-50` | `#EFF0F0` | áreas agrupadas e linhas alternadas |
| `neutral-100` | `#E0E2E2` | divisores sutis |
| `neutral-200` | `#D0D3D3` | bordas de componentes |
| `neutral-300` | `#BDC0C0` | controles desabilitados |
| `neutral-500` | `#676B6E` | texto auxiliar |
| `neutral-600` | `#53575B` | texto secundário; contraste 7,29:1 com branco |
| `neutral-800` | `#212225` | texto principal |
| `neutral-950` | `#0D0F10` | uso excepcional de alto contraste |

### 4.3 Cores semânticas

| Estado | Texto/ação | Fundo | Borda | Exemplo |
|---|---:|---:|---:|---|
| Informação | `#006184` | `#E9F7FC` | `#B0EEFC` | pagamento em validação |
| Sucesso | `#206B3F` | `#EEF7ED` | `#A8D5A2` | reserva confirmada |
| Atenção | `#8F4200` | `#FFF7E6` | `#F4C46B` | prazo próximo |
| Erro | `#B00504` | `#FDEDEC` | `#E8A09E` | falha ou campo inválido |

As cores não podem ser o único meio de transmitir informação. Todo estado deve combinar cor com texto e, quando útil, ícone.

### 4.4 Regras de uso de cor

- ação primária: fundo `brand-600`, texto branco;
- hover: `brand-700`; pressionado: `brand-900`;
- links no corpo: `brand-600`, sublinhados em parágrafos;
- foco: anel externo de 3 px em `brand-500`, com 2 px de separação clara;
- texto principal: `neutral-800`; secundário: `neutral-600`;
- nunca usar cinza claro para texto essencial;
- não usar cor decorativa em excesso: uma tela deve ter um ponto de ação visual dominante.

### 4.5 Tipografia

Família principal:

```css
font-family: "Source Sans 3", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
```

Pesos permitidos:

- 400 para texto corrente;
- 600 para rótulos, botões e ênfase;
- 700 para títulos e números importantes.

Evitar peso 300 em conteúdo operacional. Em telas pequenas ou de baixo brilho, traços leves prejudicam a leitura.

| Estilo | Tamanho | Entrelinha | Peso | Uso |
|---|---:|---:|---:|---|
| `display` | `clamp(2rem, 4vw, 2.625rem)` | 1.15 | 700 | abertura pública, uso raro |
| `heading-1` | `clamp(1.75rem, 3vw, 2.25rem)` | 1.2 | 700 | título da página |
| `heading-2` | `clamp(1.5rem, 2.5vw, 1.875rem)` | 1.25 | 700 | seção principal |
| `heading-3` | `1.25rem` | 1.3 | 700 | cartões e subseções |
| `body-lg` | `1.125rem` | 1.55 | 400 | introdução e orientação |
| `body` | `1rem` | 1.5 | 400 | texto padrão |
| `label` | `0.9375rem` | 1.35 | 600 | campos e metadados importantes |
| `caption` | `0.875rem` | 1.4 | 400 | ajuda e dados secundários |

Nenhum conteúdo necessário para concluir uma tarefa deve ter menos de 14 px.

### 4.6 Espaçamento

Usar uma escala baseada em 4 px:

| Token | Valor |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-24` | 96 px |

No celular, usar 16 px nas laterais. Em telas a partir de 768 px, usar 24–32 px conforme a largura do conteúdo.

### 4.7 Bordas, raios e sombras

- campos e botões: raio de 6 px;
- cartões: raio de 12 px;
- painéis de destaque e diálogos: raio de 16 px;
- chips de estado: formato arredondado apenas o suficiente para diferenciá-los;
- borda padrão: 1 px `neutral-200`;
- sombra padrão: `0 2px 8px rgb(13 15 16 / 8%)`;
- sombra elevada: `0 8px 24px rgb(13 15 16 / 12%)`, apenas para diálogos e menus flutuantes.

Evitar excesso de cartões aninhados, sombras fortes e componentes em formato de cápsula.

### 4.8 Ícones e imagens

- usar uma única família de ícones de contorno, com traços e tamanhos consistentes;
- tamanhos padrão: 20 px no conteúdo e 24 px em ações;
- ícone nunca substitui sozinho uma ação importante;
- não usar emoji como ícone de interface;
- fotografias são opcionais e devem ficar restritas à entrada pública ou estados vazios;
- nunca colocar texto operacional sobre fotografia;
- toda imagem informativa precisa de texto alternativo; imagens decorativas usam `alt=""`.

## 5. Layout responsivo

### 5.1 Faixas de referência

| Faixa | Largura | Comportamento esperado |
|---|---:|---|
| Compacta | 320–479 px | uma coluna, ações ocupam a largura disponível |
| Mobile | 480–767 px | uma coluna confortável, agrupamentos simples |
| Tablet | 768–1023 px | duas colunas quando reduzirem esforço cognitivo |
| Desktop | 1024 px ou mais | navegação lateral e painéis, sem esticar formulários |

Os pontos de quebra servem ao conteúdo; não devem ser usados para esconder funcionalidade.

### 5.2 Larguras máximas

- formulários e fluxos focados: 640 px;
- calendários e reservas: 960 px;
- painéis administrativos: 1200 px;
- texto corrido: aproximadamente 65–75 caracteres por linha.

### 5.3 Áreas seguras e ações móveis

- respeitar `env(safe-area-inset-*)`;
- manter pelo menos 16 px entre a ação fixa e a borda física do aparelho;
- barras inferiores não podem cobrir campos, erros ou o último item da página;
- quando uma ação principal ficar fixa no rodapé, reservar espaço equivalente no conteúdo.

## 6. Navegação e estrutura

### 6.1 Área pública e do membro

A navegação deve apresentar no máximo os destinos essenciais:

- Início;
- Caravanas;
- Minha reserva ou Minha conta;
- Entrar/Sair.

No mobile autenticado, pode ser usada navegação inferior com até quatro itens, sempre com ícone e rótulo. A Estaca atual deve estar visível no cabeçalho ou contexto da página, sem parecer um campo técnico.

### 6.2 Área administrativa

Administradores precisam ver claramente:

- nome da Estaca e, quando aplicável, da Ala;
- papel atual;
- seção ativa;
- pendências que exigem ação.

No desktop, usar navegação lateral. No mobile, usar cabeçalho compacto e menu explícito. Nunca depender apenas de ícone “hambúrguer” sem rótulo ou nome acessível.

### 6.3 Voltar e cancelar

- usar “Voltar para o calendário” em vez de apenas uma seta;
- preservar dados ao voltar entre etapas do mesmo fluxo;
- “Cancelar” deve significar sair de uma edição, não cancelar uma reserva, pois as regras de negócio não permitem cancelamento direto pelo membro;
- ações destrutivas ou irreversíveis exigem confirmação com consequência descrita.

## 7. Componentes

### 7.1 Botões

- altura mínima: 48 px;
- alvo de toque mínimo: 48 × 48 px;
- texto mínimo: 16 px, peso 600;
- no mobile, ação principal de formulários ocupa toda a largura;
- mostrar estado de processamento no próprio botão e impedir envio duplicado;
- não trocar o texto por um spinner sem manter um nome acessível.

Hierarquia:

1. **Primário:** uma ação principal por região ou tela.
2. **Secundário:** borda `brand-600`, fundo branco.
3. **Textual:** navegação ou ação de baixa ênfase.
4. **Perigoso:** reservado para ações realmente destrutivas.

### 7.2 Campos de formulário

- altura mínima: 48 px;
- rótulo sempre visível acima do campo;
- ajuda abaixo do rótulo ou campo, associada semanticamente;
- placeholder apenas como exemplo, nunca como rótulo;
- usar `autocomplete`, `inputmode` e tipos de campo adequados;
- aplicar máscaras sem impedir colar ou corrigir o valor;
- validar preferencialmente ao sair do campo e sempre no envio;
- exibir erro junto ao campo e um resumo no topo em formulários longos;
- mover o foco para o resumo de erros após tentativa de envio inválida;
- não apagar os valores válidos por causa de um erro.

### 7.3 Escolhas

Para poucas opções importantes, preferir cartões de seleção ou rádios grandes em vez de `select`. Exemplo no cadastro:

- “Sou membro adulto”;
- “Sou jovem de 12 a 17 anos”;
- “Sou convidado”.

Depois da escolha, apresentar apenas os campos pertinentes. Abas não devem ser usadas quando a seleção altera o significado de todo o formulário.

### 7.4 Cartões

Um cartão deve agrupar informação relacionada, não decorar cada bloco. Cartões de caravana devem priorizar:

1. data de saída em formato humano;
2. estado das inscrições;
3. assentos disponíveis;
4. valores aplicáveis;
5. pontos e horários de embarque;
6. prazo de inscrição;
7. ação principal.

Datas para membros devem aparecer como “20 de novembro de 2026”, com formato numérico apenas quando necessário em campos.

### 7.5 Alertas e mensagens

Alertas persistentes são usados quando a pessoa precisa agir. Toasts servem somente como confirmação complementar e nunca como único registro de sucesso ou erro.

Estrutura de um alerta:

- título direto;
- explicação curta;
- ação, se necessária;
- ícone e cor semântica;
- possibilidade de foco por teclado.

### 7.6 Estados de reserva

Chips devem conter texto completo e ser acompanhados de explicação no detalhe da reserva.

| Estado interno | Rótulo para o usuário | Tom |
|---|---|---|
| `PENDENTE` | Aguardando pagamento à Ala | atenção |
| `PAGO_ALA` | Pagamento recebido pela Ala | informação |
| `CONFIRMADO` | Viagem confirmada | sucesso |
| `LISTA_ESPERA` | Na lista de espera | atenção |
| `EXPIRADA` | Prazo encerrado | neutro/erro conforme contexto |
| `AGUARDANDO_AUXILIO` | Auxílio em análise | informação |
| `AGUARDANDO_TRANSFERENCIA_INTERESTACA` | Transferência em validação | informação |

Novos estados só devem entrar nesta tabela quando forem definidos pelas specs correspondentes.

### 7.7 Tabelas administrativas

- cabeçalho persistente apenas quando não cobrir conteúdo;
- primeira coluna identifica claramente a pessoa ou registro;
- ações ficam em menu rotulado “Ações” ou botão textual;
- no mobile, transformar linhas em cartões com pares rótulo/valor;
- oferecer busca e filtros apenas quando houver volume que justifique;
- filtros ativos devem ficar visíveis e fáceis de limpar;
- não depender de rolagem horizontal para a ação principal.

### 7.8 Diálogos e gavetas

- usar diálogo apenas quando interromper o fluxo for necessário;
- em telas pequenas, preferir gaveta inferior ou página dedicada para formulários extensos;
- foco deve entrar no diálogo e voltar ao acionador ao fechar;
- Escape fecha somente quando isso não causa perda silenciosa de dados.

### 7.9 Carregamento, vazio e erro

Toda tela de dados deve prever:

- carregamento com esqueleto coerente ou indicador acompanhado de texto;
- estado vazio explicando o motivo e o próximo passo;
- erro recuperável com ação “Tentar novamente”;
- erro de sessão com orientação para entrar novamente;
- conteúdo preservado quando a conexão cair durante um formulário.

## 8. Fluxos críticos

### 8.1 Entrada da Estaca

Em vez de um cartão pequeno isolado no centro de uma tela vazia:

- mostrar o nome do serviço e da Estaca com hierarquia clara;
- incluir uma frase simples sobre o que a pessoa pode fazer;
- destacar “Ver próximas caravanas” como ação primária;
- usar “Criar minha conta” e “Entrar” como ações secundárias;
- manter o conteúdo principal no primeiro viewport do celular;
- evitar imagem grande que atrase a abertura ou concorra com a ação.

### 8.2 Cadastro

Fluxo recomendado:

1. escolher o tipo de participante;
2. informar dados pessoais;
3. informar vínculo e contato;
4. revisar e criar conta.

Regras de interface:

- indicar “Etapa 2 de 4” e nome da etapa;
- explicar por que CPF, nascimento ou Ala são necessários antes de solicitá-los;
- usar teclado adequado para CPF, telefone e data;
- revisar os dados antes do envio;
- após sucesso, direcionar para a tarefa que originou o cadastro, quando houver.

### 8.3 Calendário de caravanas

- ordenar viagens por proximidade;
- destacar data, disponibilidade e prazo;
- mostrar valores sem exigir leitura de uma tabela densa;
- exibir embarques como lista curta com local e horário;
- usar “Escolher assento” ou “Entrar na lista de espera” conforme o estado real;
- evitar prometer “garanta sua vaga” quando a confirmação depende do fluxo de pagamento e validação.

### 8.4 Escolha de assento

- mostrar legenda textual: disponível, selecionado, ocupado e inacessível;
- assentos devem ter no mínimo 44 × 44 px, preferencialmente 48 × 48 px;
- organizar o ônibus sem exigir zoom ou rolagem horizontal nos celulares-alvo;
- representar corredor com espaço real;
- anunciar a seleção a tecnologias assistivas;
- manter um resumo visível com assento, participante e valor;
- reservar temporariamente apenas conforme as regras da spec, informando o tempo restante quando aplicável;
- se o cadastro estiver incompleto, levar a pessoa diretamente ao campo pendente e retornar ao fluxo.

### 8.5 Pagamento e validação

O usuário deve ver uma linha do tempo, e não apenas um selo:

1. Reserva realizada.
2. Pagamento entregue à Ala.
3. Pagamento em validação pela Estaca.
4. Viagem confirmada.

Cada etapa deve explicar:

- o que já aconteceu;
- quem precisa agir agora;
- prazo aplicável;
- o que a pessoa deve fazer se houver problema.

“Assento reservado” não deve ser apresentado como “viagem confirmada”. Essa distinção é essencial à confiança no sistema.

### 8.6 Confirmação final

Após uma operação bem-sucedida, mostrar uma página ou painel persistente com:

- confirmação em linguagem clara;
- nome da caravana e data;
- assento, quando aplicável;
- estado atual;
- próximo passo;
- acesso a “Ver minha reserva”.

Não depender somente de uma mensagem temporária.

## 9. Conteúdo e microcopy

### 9.1 Tom de voz

O SGCT deve ser:

- acolhedor, sem ser informal demais;
- direto, sem parecer ríspido;
- tranquilizador, sem esconder consequências;
- consistente entre membro, Ala e Estaca.

### 9.2 Padrões de texto

| Evitar | Preferir |
|---|---|
| Enviar | Confirmar cadastro |
| Continuar | Escolher assento |
| Inválido | Confira o CPF informado |
| Operação concluída | Pagamento marcado como recebido |
| Você falhou ao preencher | Informe sua data de nascimento |
| Status: PENDENTE | Aguardando pagamento à Ala |
| Voltar | Voltar para o calendário |

Botões devem descrever o resultado imediato. Títulos de confirmação devem declarar o que aconteceu.

### 9.3 Datas, horas e valores

- idioma `pt-BR`;
- datas visuais: “20 de novembro de 2026” ou “20 nov 2026” em espaços compactos;
- horas: “23h” ou “23h45”, de forma consistente;
- moeda: “R$ 130,00”;
- não mostrar datas ISO ao usuário;
- apresentar fuso horário quando uma operação administrativa depender de horário limite.

## 10. Acessibilidade

Meta: **WCAG 2.2 nível AA**.

### 10.1 Requisitos obrigatórios

- contraste mínimo de 4,5:1 para texto normal;
- contraste mínimo de 3:1 para texto grande e elementos gráficos essenciais;
- navegação completa por teclado;
- indicador de foco sempre visível;
- ordem de foco compatível com a ordem visual;
- regiões, títulos e campos com semântica HTML correta;
- mensagens dinâmicas anunciadas por `aria-live` quando necessário;
- erros associados aos respectivos campos;
- zoom de 200% sem perda de conteúdo ou função;
- reflow em 320 px sem rolagem horizontal, salvo conteúdo intrinsecamente bidimensional;
- suporte a `prefers-reduced-motion`;
- alvos de toque de 48 × 48 px para ações principais;
- nenhuma instrução baseada apenas em cor, posição, forma ou gesto.

### 10.2 Movimento

- transições de 120–200 ms para feedback simples;
- nenhuma animação automática longa;
- não usar parallax;
- esqueletos sem pulsação intensa;
- respeitar redução de movimento do sistema.

## 11. Desempenho e resiliência percebida

Boa UX também depende de resposta rápida:

- evitar fontes, imagens e bibliotecas desnecessárias;
- carregar apenas os pesos tipográficos 400, 600 e 700;
- otimizar imagens e definir dimensões para evitar saltos de layout;
- mostrar feedback em até 100 ms após toque ou clique;
- desabilitar envios duplicados durante processamento;
- oferecer nova tentativa em falhas transitórias;
- não apagar formulários por expiração silenciosa de sessão;
- priorizar o conteúdo e a ação principal na renderização inicial.

## 12. Tokens técnicos sugeridos

Os nomes abaixo formam o contrato entre design e implementação. Componentes não devem usar cores Tailwind arbitrárias quando existir um token semântico.

```css
:root {
  --color-brand-50: #e9f7fc;
  --color-brand-100: #d5f1f7;
  --color-brand-200: #b0eefc;
  --color-brand-500: #007da5;
  --color-brand-600: #006184;
  --color-brand-700: #005175;
  --color-brand-900: #003057;

  --color-bg: #f7f8f8;
  --color-surface: #ffffff;
  --color-text: #212225;
  --color-text-muted: #53575b;
  --color-border: #d0d3d3;
  --color-border-subtle: #e0e2e2;

  --color-info: #006184;
  --color-success: #206b3f;
  --color-warning: #8f4200;
  --color-danger: #b00504;

  --radius-control: 0.375rem;
  --radius-card: 0.75rem;
  --radius-panel: 1rem;
  --shadow-card: 0 2px 8px rgb(13 15 16 / 8%);
  --focus-ring: 0 0 0 3px #007da5;
}
```

Tokens semânticos devem ser expostos no Tailwind (`primary`, `surface`, `foreground`, `muted`, `border`, `success`, `warning`, `danger`) para impedir divergência entre telas.

O modo escuro não é requisito inicial. A arquitetura por tokens deve permitir sua inclusão futura, mas a prioridade é uma experiência clara e muito bem testada no modo claro.

## 13. Validação de qualidade

### 13.1 Viewports mínimos de teste

- 320 × 568 px;
- 360 × 800 px;
- 390 × 844 px;
- 768 × 1024 px;
- 1280 × 800 px.

### 13.2 Cenários manuais essenciais

- navegar e criar conta usando apenas teclado;
- aumentar zoom para 200%;
- cadastrar participante em celular estreito;
- interromper e retomar um formulário;
- receber e corrigir erros de validação;
- escolher assento sem zoom horizontal;
- entender a diferença entre reserva e confirmação;
- consultar estado do pagamento;
- realizar tarefas administrativas no celular;
- usar conexão lenta ou simular falha de rede.

### 13.3 Testes com usuários

Antes de considerar os fluxos principais concluídos, realizar sessões curtas com membros representativos, incluindo pessoas com pouca familiaridade tecnológica. Observar, sem orientar:

- encontrar a próxima caravana;
- criar uma conta;
- escolher um assento;
- explicar com as próprias palavras o estado da reserva;
- localizar o próximo passo do pagamento.

O objetivo é que a pessoa conclua a tarefa e compreenda o resultado, não apenas que consiga clicar até o final.

### 13.4 Definition of Done visual

Uma tela só está concluída quando:

- segue os tokens deste documento;
- não contém cores ou espaçamentos arbitrários sem justificativa;
- possui estados de carregamento, vazio, erro e sucesso;
- funciona em todos os viewports mínimos aplicáveis;
- passa por teclado, foco e leitor de tela no fluxo principal;
- mantém contraste AA;
- usa linguagem em português clara e consistente;
- não expõe nomes internos de status;
- não depende de hover;
- preserva corretamente as regras de tenant e negócio definidas nas specs.

## 14. Ordem recomendada de adoção

1. Implementar tokens de cor, tipografia, espaçamento, foco e elevação.
2. Criar componentes básicos acessíveis: botão, campo, seleção, alerta, chip e cartão.
3. Redesenhar os fluxos públicos e do membro, começando por entrada, cadastro, calendário e reserva.
4. Aplicar a linha do tempo ao fluxo de pagamento e confirmação.
5. Adaptar áreas administrativas e tabelas para mobile.
6. Executar auditoria de acessibilidade, responsividade e testes com membros.

Esta ordem não substitui o processo SDD nem autoriza alterações de regra de negócio fora de uma spec aprovada.

## 15. Resumo da decisão

O design system analisado **funciona como referência**, principalmente em cor, sobriedade, espaço e clareza. O SGCT deve adotar uma interpretação própria e mais funcional:

- azul-petróleo como cor de confiança;
- Source Sans 3 em vez de Ensign sem licença confirmada;
- controles maiores e mais contrastantes;
- fluxos guiados, linguagem simples e confirmação explícita;
- mobile como plataforma principal;
- WCAG 2.2 AA como requisito;
- identidade local sem copiar ou sugerir endosso oficial.

O objetivo visual não é impressionar pela decoração. É fazer com que qualquer membro consiga concluir uma inscrição com confiança, compreender o estado da viagem e saber exatamente o que fazer em seguida.
