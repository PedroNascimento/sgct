# SGCT — Sistema de Gestão de Caravanas ao Templo
### Plataforma Multi-Tenant Regional • Open Source • 100% Auto-Hospedável

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_&_RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-462_Passed-success?style=for-the-badge&logo=jest)](https://jestjs.io/)
[![Coverage](https://img.shields.io/badge/Coverage-90%2B%25-brightgreen?style=for-the-badge)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📌 Sumário
1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Principais Recursos](#-principais-recursos)
3. [Arquitetura & Design de Software](#-arquitetura--design-de-software)
4. [Controle de Acesso e Papéis (RBAC)](#-controle-de-acesso-e-papéis-rbac)
5. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
6. [Estrutura do Repositório](#-estrutura-do-repositório)
7. [Como Executar Localmente](#-como-executar-localmente)
8. [Comandos e Scripts Disponíveis](#-comandos-e-scripts-disponíveis)
9. [Auto-Hospedagem Gratuita (Self-Hosting)](#-auto-hospedagem-gratuita-self-hosting)
10. [Segurança, RLS e Conformidade LGPD](#-segurança-rls-e-conformidade-lgpd)
11. [Documentação de Referência](#-documentação-de-referência)
12. [Licença e Contribuição](#-licença-e-contribuição)

---

## 📖 Sobre o Projeto

O **SGCT** nasceu para gerenciar as caravanas ao Templo de Recife-PE promovidas pela **Estaca Natal**, mas foi planejado e construído desde o primeiro dia como uma **plataforma multi-tenant regional**:
- Permite que **múltiplas Estacas** operem na mesma infraestrutura compartilhada (isoladas criptográfica e logicamente via banco de dados e RLS), **ou**
- Permite que qualquer Estaca no Brasil faça um **clone do repositório e auto-hospede** sua própria instância completa, sem custo de licença ou mensalidade, operando inteiramente nos limites gratuitos de serviços em nuvem (*Vercel + Supabase + Resend*).

O SGCT substitui controles manuais em planilhas dispersas e formulários frágeis por um fluxo transparente, seguro e reverente, eliminando o estresse administrativo dos líderes voluntários e garantindo a santidade da experiência dos membros que viajam para adorar no Templo do Senhor.

---

## ✨ Principais Recursos

### 💺 1. Escolha de Assentos com Concorrência Atômica
- **Mapa visual do ônibus** responsivo e adaptado para telas de celular (*mobile-first*).
- **Travamento atômico imediato:** selecionou o assento, o lugar é bloqueado na hora com prevenção total de *overbooking* e colisões simultâneas via transações PostgreSQL isoladas.
- Apoio especial a oficiantes do templo (descontos e tarifas diferenciadas) e vagas prioritárias.

### 💰 2. Validação Financeira em Duas Etapas (Ala e Estaca)
- **Hierarquia eclesiástica preservada:** o membro realiza o pagamento localmente na Ala; o Administrador da Ala confere e marca como `PAGO_ALA`.
- **Lotes Semanais Consolidados:** os pagamentos são agrupados semanalmente e transferidos à Estaca. Somente após a validação do lote pelo Administrador da Estaca as reservas avançam para `CONFIRMADO`.
- **Reserva ≠ Confirmação:** a ocupação do assento não se torna definitiva até que a validação financeira seja concluída pela liderança.

### 📜 3. Gestão e Auditoria de Menores (ECA / LGPD)
- Upload obrigatório de **Termos de Autorização de Viagem** assinado pelos pais/responsáveis.
- Validação visual pelo Administrador de Ala antes de liberar a viagem do jovem.
- Armazenamento em bucket privado com criptografia e política de retenção automática: os documentos são expurgados com segurança 30 dias após o encerramento da caravana.

### 🔄 4. Fila de Espera Justa e Permutas Mediadas
- **Fila de Espera FIFO:** quando o ônibus atinge 100% de ocupação, os membros seguintes entram na lista de espera cronológica. Desistências geram promoção automática e notificação imediata.
- **Permuta Controlada:** membros não podem transferir assentos de forma informal. Toda permuta exige solicitação pelo portal e validação expressa da liderança de Ala ou Estaca.
- **Gestão de Créditos:** cancelamentos qualificados geram créditos vinculados ao perfil do membro para utilização em viagens futuras.

### 📱 5. Embarque com Check-in por QR Code e Modo Offline
- **Check-in instantâneo:** leitura do QR Code na câmera do celular do líder em **3,2 segundos** por passageiro.
- **Operação 100% Offline:** em locais de embarque com sinal 4G instável, o líder realiza o check-in normalmente no navegador do smartphone; o sistema armazena localmente com garantia de idempotência e sincroniza assim que a conexão for restabelecida.

### 🚌 6. Emissão do Manifesto Oficial de Passageiros (ANTT)
- Geração instantânea de relatório em **PDF oficial** com todos os dados exigidos pela Agência Nacional de Transportes Terrestres (ANTT) e Polícia Rodoviária Federal (PRF):
  - Nome completo, RG, Órgão Emissor e CPF de cada passageiro;
  - Relação clara de menores de idade e identificação formal do adulto acompanhante;
  - Dados da empresa de ônibus, placa do veículo e assinatura do responsável.

### 📊 7. Painéis Gerenciais e Relatórios Analíticos
- Visão consolidada para liderança de Estaca e Ala com métricas de adesão, preenchimento de quórum, balanço financeiro e gráficos interativos construídos com **Recharts**.
- Módulos avançados para gestão de **Auxílio Financeiro (Fundo de Caravana)** e **Convidados Inter-Estaca**.

---

## 🏛 Arquitetura & Design de Software

O SGCT adota uma versão pragmática da **Clean Architecture** (Arquitetura Limpa), desacoplando totalmente as regras de negócio de frameworks e bibliotecas externas.

### Camadas da Aplicação

```
src/
├── app/                     # Next.js App Router (Páginas, Layouts, Server Actions)
├── domain/                  # Entidades, Enums e Interfaces puras (Zero dependências externas)
├── use-cases/               # Regras de Negócio e Casos de Uso (100% testáveis isoladamente)
├── infrastructure/          # Adaptadores concretos (Supabase, Resend, Storage, Repositórios)
└── components/              # Componentes visuais reutilizáveis e Design System
```

### Diagrama de Comunicação do Sistema

```
                      ┌───────────────────────────────────────────┐
                      │              Vercel (Next.js)             │
                      │  ┌──────────┐┌──────────┐┌──────────────┐ │
                      │  │ (public) ││ (auth)   ││   (admin)    │ │
                      │  │[estaca]  ││[estaca]  ││   [estaca]   │ │
                      │  └──────────┘└──────────┘└──────────────┘ │
                      │         App Router + Server Actions       │
                      │         Middleware: [estaca_slug]         │
                      └──────────────────┬────────────────────────┘
                                         │ Supabase Client (RLS-aware)
                      ┌──────────────────▼────────────────────────┐
                      │            Supabase (1 projeto, N Estacas)│
                      │  ┌───────────┐ ┌───────────┐ ┌──────────┐ │
                      │  │PostgreSQL │ │   Auth    │ │ Storage  │ │
                      │  │+ RLS      │ │ (JWT com  │ │ (bucket  │ │
                      │  │2 níveis   │ │  claims:  │ │  privado │ │
                      │  │stake→ward │ │  role, IDs│ │  menores)│ │
                      │  └───────────┘ └───────────┘ └──────────┘ │
                      │  ┌──────────────────────────────────────┐ │
                      │  │  pg_cron (jobs de quórum, purga)     │ │
                      │  └──────────────────────────────────────┘ │
                      └──────────────────┬────────────────────────┘
                                         │
                               ┌─────────▼─────────┐
                               │       Resend      │
                               │(E-mail transação) │
                               └───────────────────┘
```

---

## 👥 Controle de Acesso e Papéis (RBAC)

O SGCT implementa controle de acesso rigoroso em conformidade com o **Artigo VIII da Constituição do Projeto**:

| Papel | Escopo de Visão | Principais Ações Permitidas |
| :--- | :--- | :--- |
| **`member`** | Pessoal / Família | Inscrever-se, reservar assento, enviar comprovante/termo de menor, solicitar permuta e exibir QR Code. |
| **`ward_admin`** | Sua Ala específica | Inscrever membros, confirmar pagamentos locais (`PAGO_ALA`), gerar lotes de repasse e aprovar termos de menores. |
| **`stake_admin`** | Sua Estaca (todas as Alas) | Criar caravanas, validar lotes semanais (`CONFIRMADO`), gerenciar quórum, realizar check-in e emitir manifestos ANTT. |
| **`super_admin`** | Plataforma Global | **Deliberadamente limitado por design:** cadastra novas Estacas e seus primeiros administradores. **Não tem acesso a listas de passageiros, menores ou finanças de nenhuma Estaca.** |

---

## 🛠 Tecnologias Utilizadas

- **Core & Runtime:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Turbopack) + [React 19](https://react.dev/) + [Node.js 20+](https://nodejs.org/).
- **Linguagem:** [TypeScript 5.9](https://www.typescriptlang.org/) em modo estrito (`strict: true`).
- **Estilização & UI:** [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) (ícones) + [Recharts 3](https://recharts.org/) (gráficos).
- **Banco de Dados & Autenticação:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Auth Hooks e Edge Functions).
- **E-mails Transacionais:** [Resend](https://resend.com/).
- **Validação & Schemas:** [Zod](https://zod.dev/).
- **Leitura & Geração de QR Code:** [html5-qrcode](https://github.com/mebjas/html5-qrcode) e [qrcode](https://github.com/soldair/node-qrcode).
- **Testes Automatizados:** [Jest 29](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) + `ts-jest`.

---

## 📂 Estrutura do Repositório

```bash
sgct/
├── .specify/memory/constitution.md # Princípios inegociáveis do projeto (v3.0.0)
├── docs/                           # Documentação completa de negócio e técnica
│   ├── ARCHITECTURE.md             # Arquitetura detalhada do sistema
│   ├── DATABASE_SCHEMA.md          # Schema das tabelas e políticas RLS
│   ├── DECISIONS.md                # Registro de decisões arquiteturais (ADRs)
│   ├── MANUAL_DO_ADMINISTRADOR.md  # Manual não-técnico para líderes voluntários
│   ├── PILOTO_RELATORIO_FINAL.md   # Relatório de homologação UAT e piloto real
│   ├── SECURITY.md                 # Matriz de segurança e regras de proteção
│   └── TESTING.md                  # Estratégia de testes e cobertura
├── specs/                          # Especificações formais em SDD (000 a 014)
├── scripts/                        # Scripts de automação (seed, bootstrap, simulação)
├── src/
│   ├── app/                        # Rotas públicas, autenticadas e administrativas
│   ├── components/                 # Componentes de interface reutilizáveis
│   ├── domain/                     # Entidades de negócio e interfaces puras
│   ├── infrastructure/             # Adaptadores de banco de dados e APIs externas
│   ├── use-cases/                  # Casos de uso e lógica de negócio
│   └── __tests__/                  # Suítes de testes unitários, RLS e integração
├── supabase/                       # Migrations versionadas, seeds e Edge Functions
├── SETUP.md                        # Guia passo a passo para auto-hospedagem
└── README.md                       # Este documento
```

---

## 💻 Como Executar Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) v20 ou superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e em execução
- [Supabase CLI](https://supabase.com/docs/guides/local-development) instalada globalmente (`npm install -g supabase`)

### 2. Clonar e Instalar Dependências
```bash
git clone https://github.com/PedroNascimento/sgct.git
cd sgct
npm install
```

### 3. Iniciar o Banco de Dados Local (Supabase via Docker)
```bash
# Inicia Postgres, Auth, Storage e Studio localmente
supabase start

# Copie as credenciais exibidas pelo comando para o arquivo de ambiente
cp .env.example .env.local
```

### 4. Aplicar Migrations e Seeds de Desenvolvimento
```bash
# Reaplica todas as migrations estruturais e políticas RLS no banco local
supabase db reset

# Popula o banco local com Estaca Natal, Alas, Caravanas e usuários de teste
npm run seed:dev
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador para acessar a aplicação.

---

## ⚙️ Comandos e Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local Next.js com Turbopack ativo. |
| `npm run build` | Compila a aplicação para produção e valida todos os tipos TypeScript. |
| `npm run lint` | Executa o linter ESLint em todo o código-fonte. |
| `npm test` | Executa todos os testes unitários, de componentes e de integração. |
| `npm run test:coverage` | Executa a suíte de testes gerando relatório detalhado de cobertura. |
| `npm run test:rls` | Executa os testes de penetração e isolamento das políticas RLS no PostgreSQL. |
| `npm run seed:dev` | Cria dados de exemplo locais (Estaca, Alas, Membros e Caravanas). |
| `npm run seed:super-admin` | Cria o primeiro usuário com papel `super_admin` da instância. |
| `npm run simulate:flow` | Executa o script de simulação automatizada do ciclo completo de caravana. |

---

## 🚀 Auto-Hospedagem Gratuita (Self-Hosting)

Qualquer Estaca da Igreja pode implantar sua própria instância do SGCT em **menos de 30 minutos**, com custo zero de infraestrutura:
- **Hospedagem Web:** Vercel (Hobby Tier — gratuito).
- **Banco de Dados & Storage:** Supabase (Free Plan — gratuito).
- **Envio de E-mails:** Resend (Free Tier — gratuito).

Para o passo a passo completo, consulte o guia oficial:  
👉 **[SETUP.md — Guia de Instalação e Auto-Hospedagem](SETUP.md)**.

---

## 🛡️ Segurança, RLS e Conformidade LGPD

O SGCT segue rigorosamente o princípio de *Security by Design* e a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018):

1. **Isolamento em Dois Níveis:** Cada linha das tabelas no banco de dados é vinculada ao `stake_id` (Estaca) e, quando aplicável, ao `ward_id` (Ala). Nenhuma consulta pode atravessar fronteiras entre Estacas.
2. **Supabase Row Level Security (RLS):** Toda consulta SQL passa pelas políticas RLS no nível do motor do PostgreSQL, impossibilitando que um usuário acesse registros fora do seu escopo legítimo, mesmo se tentar forjar requisições via API.
3. **Proteção Reforçada a Menores:** Termos de autorização e documentos de menores de idade contam com regras específicas de acesso restrito e job agendado de purga e exclusão automática definitiva após 30 dias do término da viagem.
4. **Trilhas de Auditoria:** Todas as ações financeiras (confirmação na Ala, validação na Estaca e trocas de assento) geram registros imutáveis de log no banco de dados.

---

## 📚 Documentação de Referência

O repositório possui documentação técnica e de produto aprofundada:

- 📘 **[Manual do Administrador](docs/MANUAL_DO_ADMINISTRADOR.md):** Manual não-técnico para líderes de Ala e Estaca.
- 📐 **[Arquitetura do Sistema](docs/ARCHITECTURE.md):** Visão estrutural, diagramas e padrões adotados.
- 🗄️ **[Schema do Banco de Dados](docs/DATABASE_SCHEMA.md):** Dicionário de tabelas, triggers, funções e políticas RLS.
- ⚖️ **[Constituição do Projeto](.specify/memory/constitution.md):** Princípios constitucionais e governança técnica inegociável.
- 💡 **[Log de Decisões de Arquitetura (ADRs)](docs/DECISIONS.md):** Histórico de decisões técnicas e de produto já consolidadas.
- 📋 **[Relatório Final do Piloto UAT](docs/PILOTO_RELATORIO_FINAL.md):** Resultados operacionais e homologação da caravana real.
- 🔒 **[Segurança e Hardening](docs/SECURITY.md):** Matriz de ameaças e diretrizes de proteção.

---

## 📄 Licença e Contribuição

Este projeto é disponibilizado como software de código aberto sob a licença **[MIT](LICENSE)**.

Desenvolvido para fortalecer a membresia e facilitar o acesso à Casa do Senhor. Sinta-se bem-vindo para abrir *Issues* ou enviar *Pull Requests* seguindo o fluxo de especificações guiadas (SDD) e os princípios constitucionais do projeto.
