# 📘 EcoHUB — Documentação Completa do Projeto

**Versão:** 1.2 (Fase 1: Desenvolvimento Independente)
**Status:** ✅ Em desenvolvimento ativo — autenticação real, painel admin com CRUD de usuários, pronto para planejar a migração Wix
**Última atualização:** julho 2026

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Arquivos Principais](#arquivos-principais)
5. [Design System](#design-system)
6. [Padrões de Código](#padrões-de-código)
7. [Fluxos de Usuário](#fluxos-de-usuário)
8. [Estado e Dados](#estado-e-dados)
9. [Como Desenvolver](#como-desenvolver)
10. [Migração para Wix (Fase 2)](#migração-para-wix-fase-2)
11. [Próximas Features](#próximas-features)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é EcoHUB?

O **EcoHUB** é um **Sistema Operacional Corporativo** que centraliza o acesso a todos os sistemas da Ecoplan:

- DigidocAD (Atos e Decretos)
- DigidocRH (Gestão de RH)
- DigidocPAT (Patrimônio)
- LegisDigital (Legislação)
- DigidocLegis (Publicações)
- ImposiGov (Gestão de Impostos)

### Objetivo

Oferecer uma **experiência moderna, intuitiva e centralizada** para que operadores municipais, gestores públicos e consultores Ecoplan acessem todos os sistemas de forma segura e organizada.

### Não é um website

**Importante:** EcoHUB não é um site tradicional. É uma **plataforma**, um **aplicativo web**, um **sistema operacional corporativo**. Só tem modo escuro — não existe mais alternância de tema.

---

## 🏗️ Arquitetura

### Filosofia de Arquitetura

O projeto segue **3 princípios fundamentais**:

1. **Desacoplamento (Loose Coupling)**
   - `js/api.js` é a única porta de entrada para dados — ninguém lê `data/*.json` diretamente
   - Fácil trocar o "backend" (hoje JSON + localStorage, amanhã Wix Collections)

2. **Modularidade**
   - Cada tela do admin (Aplicativos, Municípios, Usuários, Configurações) é autocontida dentro de `admin.js`
   - Links de redirecionamento são **calculados por fórmula**, não digitados um a um

3. **Escalabilidade**
   - Preparado para crescimento (novo app ou município já nasce com link de redirecionamento correto)
   - Pronto para migração Wix — veja a seção [Migração para Wix](#migração-para-wix-fase-2), que é o roteiro real dessa migração

### ⚠️ Estado real da arquitetura (leia antes de mexer em `state.js`, `app.js`, `card.js` ou `modal.js`)

A doc original descrevia uma arquitetura em 4 camadas com Observer Pattern (`state.js`) e Component Pattern (`card.js`/`modal.js`) alimentando `index.html`. **Isso não é mais verdade.** `index.html` foi reconstruído como uma tela única ("launcher") com os cards dos sistemas escritos direto no HTML (cada um com uma ilustração SVG própria) e toda a lógica de busca/modal/login num `<script>` inline no próprio `index.html`. Hoje:

| Arquivo | Carregado por | Realmente usado? |
|---|---|---|
| `js/state.js` (`AppState`) | `index.html`, `admin.html` | ❌ **Não.** Nada chama `appState.*` em lugar nenhum do projeto. Só existe porque as duas páginas ainda têm a tag `<script>`. |
| `js/app.js` (`EcoHUBApp`) | — | ❌ **Não carregado por ninguém.** Foi escrito para a versão antiga do `index.html` (grid de `#appsGrid` + `CardComponent`), que não existe mais. |
| `js/components/card.js` (`CardComponent`) | — | ❌ **Não carregado por ninguém.** |
| `js/components/modal.js` (`ModalComponent`) | — | ❌ **Não carregado por ninguém.** O login do `index.html` usa seu próprio modal (`.launcher-modal-overlay`), controlado pelo `<script>` inline. |
| `js/animations.js` (`Animations`) | `admin.html` | ⚠️ Carregado, mas `admin.js` nunca chama `animations.*`. As animações do admin (toast, troca de aba) são só `@keyframes` do CSS acionadas por classe. |
| `css/components/card.css` | — | ❌ Não carregado por nenhuma página. |

**O que isso significa na prática:** o fluxo de dados real hoje é `data/*.json` (ou `localStorage`, que tem prioridade — veja [Estado e Dados](#estado-e-dados)) → `js/api.js` → manipulação direta do DOM em `admin.js` / no `<script>` inline de `index.html`. Não existe uma camada de estado compartilhado nem componentes reutilizáveis de fato — cada página gerencia seu próprio DOM diretamente. Isso é importante para a migração Wix: **o "estado" a recriar em Velo é o que está em `admin.js` e no `<script>` de `index.html`, não em `state.js`.**

Esses arquivos não foram apagados de propósito (podem servir de referência ou voltar a ser úteis), mas trate-os como **legado morto**, não como arquitetura ativa.

### Camadas da Aplicação (como funciona de verdade hoje)

```
┌─────────────────────────────────────────┐
│  1. APRESENTAÇÃO (UI Layer)             │
│  ├─ index.html — launcher com cards      │
│  │  fixos + <script> inline (busca,      │
│  │  modal de login, redirecionamento)    │
│  └─ admin.html — painel com 4 abas       │
│     (Aplicativos, Municípios, Usuários,  │
│     Configurações), tudo via admin.js    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  2. SERVIÇOS (js/api.js)                │
│  ├─ Autenticação real (users.json)       │
│  ├─ Checagem de permissão (access.json)  │
│  ├─ Cálculo de link de redirecionamento  │
│  │  (fórmula + override por município)   │
│  └─ Prefere dados do localStorage antes  │
│     de buscar o JSON "de fábrica"        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  3. DADOS (Data Layer)                  │
│  ├─ localStorage — fonte da verdade      │
│  │  enquanto o navegador estiver aberto  │
│  │  (ecohub-admin-data, ecohub-users-data)│
│  ├─ data/*.json — seed inicial, só usado │
│  │  quando o localStorage está vazio     │
│  └─ Será Wix CMS (Collections) na Fase 2 │
└─────────────────────────────────────────┘
```

### Padrões de Projeto Usados

1. **Singleton Pattern** (`api`, `appState`, `animations`)
   - Instância única disponível globalmente: `window.api`, `window.appState`, `window.animations`
   - Só `window.api` está em uso real hoje

2. **Formula over Data (destinationURL)**
   - O link de redirecionamento de cada sistema/município **não é um dado cadastrado** — é calculado por `api.buildDestinationURL(appName, cityName)`
   - Um novo app ou município já nasce com o link certo, sem digitar nada
   - Casos que fogem do padrão têm **override** por município (`city.linkOverrides[appId]`), editável no admin

3. **"LocalStorage-first" API Layer**
   - `js/api.js` sempre tenta `localStorage` antes de buscar `data/*.json`
   - Isso é o que faz uma edição no painel admin (renomear um app, cadastrar um usuário, mudar um link) valer de verdade no login de `index.html`, sem precisar exportar/reimportar nada
   - **Esse comportamento precisa de um equivalente em Velo** na migração — veja a seção de Wix

---

## 📁 Estrutura de Pastas

```
ecohub-project/
│
├── 📄 index.html                      # Launcher (tela única, sem sidebar/header)
├── 📄 admin.html                      # Painel administrativo (4 abas)
├── 📄 README.md                       # Documentação básica
├── 📄 PROJECT.md                      # Este arquivo
│
├── 📁 css/
│   ├── variables.css                  # 🎨 Design tokens (cores, espaçamento, tipografia) — dark mode é o único tema
│   ├── reset.css                      # Normalização de estilos HTML
│   ├── typography.css                 # Hierarquia de textos — usado só por admin.html
│   ├── layout.css                     # Utilitários de grid/flexbox — usado só por admin.html
│   ├── animations.css                 # @keyframes (fadeIn, slideInUp, etc.) — usado por admin.html
│   ├── home.css                       # Só o `.header`/`.header-logo` compartilhado do topo do admin
│   ├── admin.css                      # Estilos específicos do Painel Admin (sidebar, tabelas, modais)
│   ├── launcher.css                   # 🖼️ Design system PRÓPRIO do index.html — autocontido,
│   │                                    #    não reaproveita button.css/card.css/modal.css
│   │
│   └── 📁 components/
│       ├── button.css                 # Botões — usado só por admin.html (launcher.css tem os próprios)
│       ├── card.css                   # ⚠️ Não usado por nenhuma página (legado da versão antiga do index.html)
│       ├── modal.css                  # Modais do admin.html (app/cidade/usuário)
│       ├── form.css                   # Formulários do admin.html
│       └── table.css                  # Tabelas do admin.html
│
├── 📁 js/
│   ├── state.js                       # ⚠️ Carregado mas não usado em lugar nenhum (veja aviso acima)
│   ├── api.js                         # 🌐 ÚNICA porta de entrada para dados — auth real, links calculados
│   ├── animations.js                  # ⚠️ Carregado pelo admin.html mas nunca chamado
│   ├── app.js                         # ⚠️ Não carregado por nenhuma página (index.html antigo)
│   ├── admin.js                       # ⚙️ Toda a lógica do painel admin (4 abas, CRUD completo)
│   │
│   └── 📁 components/
│       ├── card.js                    # ⚠️ Não carregado por nenhuma página
│       └── modal.js                   # ⚠️ Não carregado por nenhuma página
│
├── 📁 data/                           # Dados iniciais ("seed") — só valem quando localStorage está vazio
│   ├── apps.json                      # 6 sistemas, cada um com cor própria (usada em ícones/gradientes)
│   ├── cities.json                    # 8 municípios; cada um pode ganhar `linkOverrides` via admin
│   ├── users.json                     # 3 usuários DE VERDADE (username + password em texto puro — é demo)
│   └── access.json                    # Quem acessa o quê — substituiu permissions.json (veja abaixo)
│
└── 📁 assets/ (futuro)               # Logos, ícones, imagens
    ├── icons/
    ├── logos/
    └── backgrounds/
```

> `data/permissions.json` **não existe mais** — foi substituído por `data/access.json`, com um formato completamente diferente (mapa aninhado, não array de registros). Se você tem uma versão antiga desta doc ou memória de conversa anterior mencionando `permissions.json`, ela está desatualizada.

---

## 📄 Arquivos Principais

### **index.html** (Launcher)
**Propósito:** Tela única onde o usuário escolhe um sistema e faz login
**O que faz:**
- Cabeçalho com marca + campo de busca (filtra os cards por nome/tag, `Ctrl+K` foca a busca)
- Grid de cards fixos, um por sistema, cada um com uma ilustração SVG própria e cor (`--card-color`) definida inline no HTML
- Botão flutuante no canto (`.hub-admin-link`) que leva direto para `admin.html`
- Clique em um card abre um modal de login de 2 colunas (formulário + ilustração do sistema, vinda do objeto `SYSTEMS` dentro do `<script>` inline)
- Login real contra `data/users.json` + `data/access.json` (via `api.authenticate`), com mensagem de sucesso/erro específica
- Login bem-sucedido no card "Administração" redireciona de verdade para `admin.html`; os demais sistemas só mostram a confirmação (não existe página real para redirecionar hoje)

**Não usa mais:** `js/app.js`, `js/components/card.js`, `js/components/modal.js`, `css/components/card.css` — toda a lógica está inline no próprio arquivo.

**Se for adicionar um sistema novo:** duplique um bloco `.launcher-card` (HTML) + uma entrada no objeto `SYSTEMS` (JS, mesmo arquivo) — não existe renderização dinâmica a partir de `apps.json` aqui.

---

### **admin.html** (Painel Administrativo)
**Propósito:** Gerenciar aplicativos, municípios, usuários e configurações
**4 abas (sidebar):**
1. **Aplicativos** — CRUD de sistemas (nome, ícone, cor, ordem, ativo/inativo)
2. **Municípios** — CRUD de cidades **+ visualização/edição dos links de redirecionamento** de cada sistema naquele município (padrão calculado, ou personalizado com um clique no lápis)
3. **Usuários** — CRUD de usuários (nome, e-mail, login, senha, master ou não, ativo/inativo) **+ concessão de acesso** (escolher sistema + município e adicionar como um "chip" removível)
4. **Configurações** — Exportar todos os dados (`apps`, `cities`, `users`, `access`) como um único JSON, ou limpar tudo

**Fluxo:**
```
1. Administrador acessa admin.html
2. admin.js tenta ler localStorage (2 chaves: ecohub-admin-data, ecohub-users-data)
3. Se vazio, carrega o seed de data/*.json via api.js e já salva no localStorage
4. As 3 tabelas (apps, cidades, usuários) são renderizadas
5. Toda alteração (criar/editar/excluir) atualiza o array em memória e chama _saveData()/_saveUsersData()
6. api.js passa a enxergar essa alteração imediatamente (localStorage tem prioridade sobre o JSON)
```

**Dados persistem:** Sim, via `localStorage`, em **duas chaves separadas**:
- `ecohub-admin-data` → `{ apps, cities }`
- `ecohub-users-data` → `{ users, access }`

---

### **js/state.js** (`AppState`) — ⚠️ Legado, não usado
Continua existindo com a mesma API de sempre (`getState`, `setState`, `subscribe`, etc.), mas **nenhum arquivo do projeto chama `appState` hoje**. Não invista tempo aqui a menos que decida reativar um fluxo de estado compartilhado — na migração Wix, o candidato natural a "estado global" é o `wixData`/Velo, não este arquivo.

---

### **js/api.js** (Abstração de Dados) — o arquivo mais importante do projeto hoje
**Propósito:** Única porta de entrada para dados. Autenticação real, cálculo de links, e resolução de onde os dados realmente estão (localStorage vs. JSON).

**Métodos principais:**
```javascript
await api.loadAppData()                          // { apps, municipalities, users, access } — usado só no primeiro carregamento do admin
await api.getApps()                               // Apps ativos, ordenados por displayOrder
await api.getAppById(appId)
await api.getMunicipalities()                     // Lê cities (localStorage-first)

// Autenticação — REAL, não simulada
await api.authenticate(appId, cityId, username, password)
// 1. Valida usuário/senha contra users.json (username + password em texto puro)
// 2. Se isMaster !== true, exige um grant ativo em access.json (appId + cityId)
// 3. Calcula destinationURL (veja abaixo) e devolve a sessão

await api.getAccessGrant(username, appId, cityId)  // Lookup O(1) em access.json
await api.getDestinationURL(appId, cityId)         // Resolve o link final (override > padrão)
api.buildDestinationURL(appName, cityName)          // A FÓRMULA pura, sem I/O (síncrona)
await api.redirectToApp(session)                    // Usa session.destinationURL
```

**A fórmula do link padrão** (`buildDestinationURL`):
```
https://www.ecoplancontabilidade.com/{primeiraLetraMinúscula(nomeDoApp)}{nomeDoMunicípioSemAcentoOuEspaço}

"DigidocAD" + "Patos"        -> .../digidocADPatos
"DigidocRH" + "João Pessoa"  -> .../digidocRHJoaoPessoa
```
Não é um dado cadastrado — é recalculada toda vez. Um admin só precisa mexer em algo quando um sistema **não** segue esse padrão (aí edita o link direto na aba Municípios, o que grava em `city.linkOverrides[appId]`).

**"LocalStorage-first"** — os 4 getters privados que sustentam tudo isso:
```javascript
api._getApps()     // localStorage['ecohub-admin-data'].apps  ||  fetch data/apps.json
api._getCities()   // localStorage['ecohub-admin-data'].cities || fetch data/cities.json
api._getUsers()    // localStorage['ecohub-users-data'].users  || fetch data/users.json
api._getAccess()   // localStorage['ecohub-users-data'].access || fetch data/access.json
```
Isso é o que faz o painel admin não ser "só uma maquete" — uma edição lá realmente muda o comportamento do login em `index.html`, na mesma máquina/navegador.

**Será substituído por (Fase 2 — Velo by Wix):**
```javascript
const result = await wixData.query('Apps').ascending('displayOrder').find();
```
Veja a seção [Migração para Wix](#migração-para-wix-fase-2) para o mapeamento completo.

---

### **js/animations.js** (`Animations`) — ⚠️ Carregado, não usado
API continua a mesma (`fadeIn`, `slideInUp`, `scaleIn`, `vibrate`, etc.), mas `admin.js` não chama nenhum desses métodos hoje. As animações visíveis no admin (toast entrando, troca de aba) são CSS puro (`animation: slideInUp ...` disparado por classe). Mantenha isso em mente antes de "consertar uma animação" aqui — o efeito visual provavelmente vem do CSS, não deste arquivo.

---

### **js/app.js**, **js/components/card.js**, **js/components/modal.js** — ⚠️ Não carregados por nenhuma página
Documentados na íntegra na versão anterior deste arquivo. Deixados no repositório como referência, mas não fazem parte do fluxo ativo. Se for deletá-los ou reaproveitá-los, é uma decisão consciente a tomar — não algo a assumir como "é assim que index.html funciona".

---

### **js/admin.js** (Painel Admin — 4 abas)
**Responsabilidades:**
1. Carregar dados de `localStorage` (ou seed de `data/*.json`, na primeira vez)
2. Renderizar as 3 tabelas (apps, cidades, usuários)
3. Abrir/fechar os 3 modais de formulário (app, cidade, usuário)
4. Validar e persistir (`localStorage`, 2 chaves — veja acima)
5. Calcular e permitir editar os links de redirecionamento por município
6. Construir concessões de acesso (sistema + município) por usuário
7. Mostrar notificações (toasts) e controlar a sidebar mobile

**Métodos principais:**
```javascript
// Aplicativos
adminApp._openAppForm(appId) / _submitAppForm(e) / _deleteApp(appId) / _renderAppTable()

// Municípios
adminApp._openCityForm(cityId) / _submitCityForm(e) / _deleteCity(cityId) / _renderCityTable()
adminApp._renderCityLinks(cityName)         // Lista os links padrão/personalizados no modal
adminApp._editCityLink(appId)               // Coloca uma linha em modo de edição
adminApp._saveCityLinkOverride(appId)       // Salva (ou descarta, se igual ao padrão)
adminApp._resetCityLink(appId)              // Remove a personalização

// Usuários
adminApp._openUserForm(userId) / _submitUserForm(e) / _deleteUser(userId) / _renderUserTable()
adminApp._addAccessGrant() / _removeAccessGrant(appId, cityId)  // Monta this.editingUserAccess
adminApp._togglePasswordReveal(userId)      // Mostra/oculta a senha na tabela

// Configurações
adminApp._exportData()      // Baixa um único JSON com apps + cities + users + access
adminApp._clearAllData()    // Limpa as 2 chaves do localStorage

// UI
adminApp._showToast(msg, type) / adminApp._switchTab(tabName)
```

---

## 🎨 Design System

⚠️ **Existem hoje DOIS design systems paralelos**, e isso é importante saber antes da migração Wix (onde provavelmente eles precisam virar um só):

- **`css/variables.css` + `css/admin.css` + `css/components/*`** → usado só por `admin.html`. Visual "flat": bordas finas, sombras suaves, ícones em blocos com cor tintada (sem gradiente).
- **`css/launcher.css`** → usado só por `index.html`. Autocontido: define seus próprios botões, inputs, cards — não importa `button.css`/`form.css`/`modal.css`. Visual mais rico: gradientes, glassmorphism na busca, cards com ilustração SVG.

Ambos compartilham `variables.css` (cores base) e são **somente dark mode** — não existe mais `[data-theme]`, `prefers-color-scheme` ou botão de alternância em lugar nenhum do projeto.

### Cores Primárias

```css
--color-orange: #E8590C;      /* Principal - Destaque, botões, hover */
--color-blue: #0066CC;        /* Links, informações */
--color-text: #FFFFFF;        /* Texto principal (dark mode) */
--color-bg: #0F1117;          /* Fundo principal (dark mode) */
--color-surface: #1A1D23;     /* Cards, containers secundários (dark mode) */
--color-line: #30363D;        /* Bordas (dark mode) */
```

### Cores por sistema (`apps.json` → campo `color`)

Cada app tem uma cor própria, usada em ícones/gradientes/artes tanto no admin quanto no launcher:

| Sistema | Cor |
|---|---|
| DigidocAD | `#6366F1` (índigo) |
| DigidocRH | `#C026D3` (magenta) |
| DigidocPAT | `#0066CC` (azul) |
| LegisDigital | `#F59E0B` (âmbar) |
| DigidocLegis | `#10B981` (verde) |
| ImposiGov | `#F43F5E` (rosa) |

### Estados

```css
--color-success: #10B981;     /* Verde - Sucesso ✓ */
--color-warning: #F59E0B;     /* Amarelo - Avisos ⚠ */
--color-error: #EF4444;       /* Vermelho - Erros ✕ */
--color-info: #3B82F6;        /* Azul - Informações */
```

### Espaçamento (Grid de 8px)

```css
--space-xs: 4px;   --space-sm: 8px;   --space-md: 16px;  --space-lg: 24px;
--space-xl: 32px;  --space-2xl: 40px; --space-3xl: 48px; --space-4xl: 64px;
```

### Tipografia

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-size-base: 16px;
```
Única família de fonte no projeto todo (inclusive `launcher.css`) — nenhuma fonte serifada ou de "display" foi adotada.

### Raio de Bordas

```css
--radius-sm: 8px;   --radius-md: 12px;   --radius-lg: 16px;
--radius-xl: 24px;  --radius-full: 999px;
```
`launcher.css` usa valores literais um pouco maiores em alguns lugares (ex.: `22px` no `.launcher-card`) em vez dessas variáveis — não é um bug, é intencional, mas fique atento ao portar estilos entre os dois sistemas.

### Sombras e Transições

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1);

--duration-fast: 150ms;  --duration-normal: 300ms;  --duration-slow: 500ms;
--ease-out: cubic-bezier(0,0,0.2,1);
```

---

## 💻 Padrões de Código

*(sem mudanças em relação à versão anterior — nomenclatura kebab-case/BEM em CSS, camelCase/PascalCase em JS, comentários só quando explicam o "porquê", DRY, tratamento de erro com try/catch + toast. Continua valendo em todo o projeto, inclusive nos arquivos legados.)*

### Nomenclatura

```
HTML/CSS: kebab-case (.admin-sidebar), BEM quando fizer sentido (.card__title)
JavaScript: camelCase (const userName), PascalCase para classes (class API {}), 
            SCREAMING_SNAKE_CASE para constantes
IDs: únicos no documento (#appModalOverlay)
```

### Estrutura de Arquivos JavaScript

Cada método público orquestra; métodos privados (prefixo `_`) fazem uma coisa só. Veja `admin.js` como referência viva disso — `init()` só chama `_loadData()`, `_setupListeners()`, `_render*()`.

---

## 🔄 Fluxos de Usuário

### Fluxo 1: Usuário acessa index.html e pesquisa

```
1️⃣ Usuário abre index.html
   └─ <script> inline liga os listeners de busca e dos cards (sem framework, sem componente)

2️⃣ Digita na busca (ou Ctrl+K)
   └─ Filtra os .launcher-card visíveis comparando data-name/data-tag com o texto digitado
   └─ Não consulta apps.json — os cards já estão todos no HTML

3️⃣ Clica em um sistema
   └─ openModal(systemId) busca a config visual em SYSTEMS (mesmo <script>)
   └─ api.getMunicipalities() popula o <select> de município (localStorage-first)
```

### Fluxo 2: Usuário faz login

```
1️⃣ Preenche Município + Usuário + Senha, clica "Entrar"

2️⃣ api.authenticate(appId, cityId, username, password)
   ├─ Usuário não existe        → "Login incorreto: usuário não encontrado"
   ├─ Usuário inativo           → "Login incorreto: usuário inativo"
   ├─ Senha errada              → "Login incorreto: senha inválida"
   ├─ Sem grant em access.json  → "Login incorreto: usuário sem permissão para este
   │                                sistema neste município" (não se aplica a isMaster)
   └─ Sucesso:
        destinationURL = await api.getDestinationURL(appId, cityId)
        (override do município, se existir; senão o link calculado pela fórmula)

3️⃣ Sucesso na tela
   ├─ Mostra "Login com sucesso! Bem-vindo(a), {fullName}."
   ├─ Sistema "Administração" → navega de verdade para admin.html após ~900ms
   └─ Demais sistemas → só fecha o modal (não existe página real para redirecionar ainda)
```

**Credenciais de teste (seed):** `marcos`/`123456`, `ana`/`123456`, `pedro`/`123456` (master — pula a checagem de `access.json`).

### Fluxo 3: Administrador gerencia Aplicativos/Municípios

*(sem mudanças relevantes de fluxo — CRUD padrão: abrir modal → preencher → salvar → `_saveData()` → localStorage → re-renderizar tabela. Veja `js/admin.js` para os métodos exatos.)*

### Fluxo 4: Administrador cadastra um usuário e dá acesso

```
1️⃣ Aba Usuários → "Novo Usuário"
   └─ _openUserForm() — form limpo, this.editingUserAccess = {}

2️⃣ Preenche nome, e-mail, login, senha
   ├─ Marcar "master" esconde a seção de concessões (master não precisa delas)
   └─ Deixar desmarcado mostra o construtor de acesso

3️⃣ Construtor de acesso (repetir por sistema/município)
   └─ Escolhe Sistema + Município → "Adicionar" → vira um chip removível
      (this.editingUserAccess[appId][cityId] = { isActive: true })

4️⃣ "Salvar"
   ├─ Valida nome/login/senha, login precisa ser único
   ├─ Cria/atualiza o usuário em this.users
   ├─ Grava this.access[username] = this.editingUserAccess (ou remove a chave, se vazio/master)
   └─ _saveUsersData() → localStorage['ecohub-users-data']

5️⃣ A partir de agora, esse usuário já consegue logar de verdade em index.html
   (mesma máquina/navegador — api.js lê o mesmo localStorage)
```

### Fluxo 5: Administrador personaliza o link de um sistema num município

```
1️⃣ Aba Municípios → editar (ou criar) uma cidade
   └─ "Links padrão dos sistemas" já aparece preenchido, recalculado a cada
      letra digitada no campo Nome

2️⃣ Clica no lápis ao lado de um sistema
   └─ A linha vira um campo de texto, pré-preenchido com o link padrão calculado

3️⃣ Edita e clica no ✓
   ├─ Se o valor digitado for igual ao padrão calculado → não salva override nenhum
   └─ Se for diferente → this.editingCityLinkOverrides[appId] = valor digitado
      (badge "Personalizado" aparece; botão de restaurar permite voltar ao padrão)

4️⃣ "Salvar" no modal do município
   └─ city.linkOverrides = { ...this.editingCityLinkOverrides } é gravado junto com o resto da cidade

5️⃣ api.getDestinationURL() passa a devolver esse override para esse app+cidade,
   em qualquer login (index.html lê o mesmo localStorage)
```

---

## 💾 Estado e Dados

### ⚠️ Onde os dados realmente vivem, em ordem de prioridade

1. **`localStorage`** (por aba/navegador) — é a fonte da verdade enquanto existir
2. **`data/*.json`** — usado só na ausência de qualquer coisa no localStorage (primeira visita)

Duas chaves de `localStorage`, gravadas só por `admin.js`, lidas por `api.js` em qualquer página:

```javascript
// ecohub-admin-data
{ "apps": [...], "cities": [...] }

// ecohub-users-data
{ "users": [...], "access": {...} }
```

### `data/apps.json` — campos

```javascript
{
  id: 'digidoc-ad', name: 'DigidocAD', slug: 'digidoc-ad',
  description: 'Gestão de Atos e Decretos', icon: '⚖️',
  color: '#6366F1',          // usada em ícones/gradientes, admin e launcher
  displayOrder: 1, isActive: true,
  version: '2.1.0', category: 'Administrativo'
}
```

### `data/cities.json` — campos

```javascript
{
  id: '001', name: 'Patos', state: 'PB',
  ibgeCode: '2510070', region: 'Sertão',
  isActive: true,             // opcional; ausência = true
  linkOverrides: {            // opcional; só existe se algum admin personalizou um link
    'digidoc-rh': 'https://sistemas.ecoplan.com.br/rh-patos-legado'
  }
}
```

### `data/users.json` — campos

```javascript
{
  id: 'user-001', fullName: 'Marcos Silva', email: 'marcos@ecoplan.com',
  username: 'marcos', password: '123456',   // texto puro — ver alerta de segurança abaixo
  isMaster: false, isActive: true, createdAt: '2024-01-15'
}
```

> 🔴 **Senha em texto puro é aceitável aqui só porque é demo local, sem rede.** Isso é tratado com prioridade máxima na seção de migração Wix — **não subir isso assim para produção**.

### `data/access.json` — substituiu `permissions.json`

Mapa aninhado `username → appId → cityId`, não mais um array de registros com `userId`/`id`/`createdAt`:

```javascript
{
  "marcos": {
    "digidoc-ad":  { "001": { "isActive": true } },   // DigidocAD em Patos
    "digidoc-rh":  { "004": { "isActive": true } },   // DigidocRH em Areia (só essa cidade)
    "digidoc-pat": { "001": { "isActive": true } }
  },
  "ana":   { "digidoc-ad": { "005": { "isActive": true } } },
  "pedro": { "digidoc-rh": { "007": { "isActive": true } } }   // pedro é master, isso nem é checado
}
```
`destinationURL` **não é gravado aqui** — é sempre calculado on-the-fly por `api.getDestinationURL()`.

---

## 🚀 Como Desenvolver

### Setup Inicial

```bash
python -m http.server 8000

# Launcher: http://localhost:8000/index.html
# Admin:    http://localhost:8000/admin.html
```

Precisa de servidor HTTP (não abrir com `file://`) porque `fetch()` de `data/*.json` exige isso.

### Adicionando um sistema novo

1. Adicionar em `data/apps.json` (id, name, description, icon, **color**, displayOrder, isActive, version, category)
2. Duplicar um bloco `.launcher-card` em `index.html` + uma entrada no objeto `SYSTEMS` (mesmo arquivo) — não é gerado dinamicamente
3. Pronto — o link de redirecionamento para qualquer município já existe automaticamente (fórmula), e a aba Municípios do admin já mostra ele sem precisar editar nada

### Adicionando um município novo

1. Admin → aba Municípios → "Novo Município" (ou editar `data/cities.json` direto)
2. Todos os links padrão para os sistemas ativos já aparecem prontos no modal — só mexa se algum precisar de link personalizado

---

## 🔀 Migração para Wix (Fase 2)

Esta seção é o roteiro real da migração — escrita a partir do que foi construído hoje, não do que estava planejado antes dele. Antes de começar, o mais importante:

### O que precisa de um "dono" em Velo

O comportamento **"localStorage tem prioridade sobre o JSON"** (`api._getApps`, `_getCities`, `_getUsers`, `_getAccess`) é o que hoje faz o painel admin editar dados "de verdade". Numa Collection do Wix, isso deixa de ser necessário — **Collections já são a fonte única da verdade**, lida tanto pelo admin quanto pelo launcher. Ou seja: essa complexidade de "dois lugares possíveis pra cada dado" **desaparece** na migração, não precisa ser recriada. É simplificação, não trabalho extra.

### Collections a criar

| Collection | Vem de | Campos-chave |
|---|---|---|
| **Apps** | `data/apps.json` | id, name, slug, description, icon, **color**, displayOrder, isActive, version, category |
| **Cities** | `data/cities.json` | id, name, state, ibgeCode, region, isActive, **linkOverrides** (objeto ou sub-collection `appId → url`) |
| **Users** | `data/users.json` | id, fullName, email, username, **password (⚠️ ver abaixo)**, isMaster, isActive, createdAt |
| **Access** | `data/access.json` | Hoje é um mapa aninhado `username → appId → cityId`. Em Wix, provavelmente vira uma Collection **flat** de novo: `{ userId, appId, cityId, isActive }` (referências, não strings soltas), porque Collections do Wix trabalham melhor com registros do que mapas aninhados. Isso é o inverso do que fizemos ao sair de `permissions.json` para `access.json` — foi a escolha certa para um arquivo JSON hand-edited, mas o motivo de otimização (lookup O(1) em vez de `.find()`) deixa de importar com um índice de banco de verdade. |

### 🔴 Prioridade #1: senha em texto puro

`data/users.json` guarda a senha sem qualquer hash porque isso é uma demo sem backend. **Isso não pode ir para Velo do jeito que está.** Ao migrar:
- Trocar por `wixData` + `wix-users-backend` (autenticação nativa do Wix) **ou**
- Se a autenticação continuar customizada em Velo, aplicar hash (bcrypt via `wix-crypto` ou similar) antes de gravar, e nunca devolver a senha para o cliente (hoje `admin.js` até mostra a senha em texto na tabela, com um botão de revelar — isso é aceitável só em ambiente local de demo)

### O que vira função de backend (Velo `.web.js`)

- `api.authenticate(appId, cityId, username, password)` → função de backend (não pode rodar no cliente depois que houver hash de senha)
- `api.buildDestinationURL(appName, cityName)` → pode continuar sendo uma função pura, só que rodando no backend (ou como computed field na Collection Cities, gerado num hook de `beforeInsert`/`beforeUpdate`)
- `api.getDestinationURL(appId, cityId)` → vira uma query em Cities + checagem de `linkOverrides`

### O que continua igual em espírito

- A lógica de "override por município" (`linkOverrides`) — só muda de onde mora (de um campo dentro do objeto da cidade para talvez uma sub-collection `CityLinkOverrides`, se o volume crescer)
- A distinção `isMaster` pulando a checagem de `Access` — mapeia direto para uma regra de permissão em Velo
- O painel admin (4 abas) — a interface pode continuar quase idêntica, só trocando `localStorage`/`fetch` por `wixData.query(...)`/`wixData.save(...)`

### Arquivos que NÃO precisam ser portados

`js/state.js`, `js/app.js`, `js/components/card.js`, `js/components/modal.js`, `css/components/card.css` — são código morto hoje (veja o aviso em [Arquitetura](#arquitetura)). Não gaste tempo de migração "traduzindo" esses arquivos para Velo; eles não descrevem o comportamento atual.

---

## 🔮 Próximas Features (Roadmap)

### Fase 1.2 (curto prazo)
- [ ] Exportar/gerar `data/*.json` atualizados direto do botão "Exportar Dados" (hoje baixa um JSON combinado, não os 4 arquivos separados)
- [ ] Confirmação visual antes de deletar (hoje é só `confirm()` nativo do navegador)
- [ ] Página de destino real para pelo menos um sistema, para testar o redirecionamento completo (hoje só "Administração" tem destino real)

### Fase 2 (migração Wix) — veja a seção completa acima
- [ ] Collections: Apps, Cities, Users, Access
- [ ] Autenticação real via Velo (hash de senha — **bloqueante antes de qualquer dado real entrar no sistema**)
- [ ] `buildDestinationURL`/`getDestinationURL` como função de backend ou computed field

### Fase 3 (longo prazo)
- [ ] Dashboard com gráficos (acessos, sistemas mais usados)
- [ ] Logs de auditoria (quem fez o quê e quando)
- [ ] Notificações, multi-idioma, app mobile nativo

---

## 🐛 Troubleshooting

### Problema: Editei algo no admin e não aparece no login (`index.html`)

```javascript
// F12 → Console, nas DUAS páginas (precisa ser o MESMO navegador/perfil):
localStorage.getItem('ecohub-admin-data')
localStorage.getItem('ecohub-users-data')

// Se vier null em qualquer uma: o admin ainda não salvou nada — abra admin.html
// primeiro e faça pelo menos uma edição, ou espere o carregamento inicial (que
// já grava o seed automaticamente).
//
// Se vier preenchido mas o login não reflete a mudança: confirme que está no
// MESMO navegador — localStorage não é compartilhado entre navegadores/dispositivos.
```

### Problema: Login sempre falha com "sem permissão"

```javascript
// F12 → Console:
await api.getAccessGrant('marcos', 'digidoc-rh', '001')
// null significa que não existe concessão para esse usuário+sistema+município

// Verificar se o usuário é master (pula a checagem):
JSON.parse(localStorage.getItem('ecohub-users-data')).users.find(u => u.username === 'marcos')
```

### Problema: Cards não aparecem no launcher

Não se aplica mais da forma antiga — os cards de `index.html` são fixos no HTML, não vêm de `apps.json`. Se um card sumiu, o problema é no próprio `index.html` (HTML removido/quebrado), não em `data/apps.json` ou no servidor.

### Problema: Estilo não está aplicando

```
Lembre-se: index.html e admin.html usam FOLHAS DE ESTILO DIFERENTES.
- index.html  → variables.css, reset.css, launcher.css (só esses 3)
- admin.html  → variables.css, reset.css, typography.css, layout.css,
                animations.css, components/{button,form,table,modal}.css,
                home.css, admin.css

Editar css/components/card.css ou css/components/button.css não afeta
index.html — essa página não carrega esses arquivos.
```

### Problema: `appState`/`animations` não fazem nada

Não é bug — nenhuma das duas páginas usa esses módulos hoje (veja o aviso em [Arquitetura](#arquitetura)). Se precisar de reatividade ou animações via JS, ou reative esse código conscientemente, ou implemente direto onde a lógica já mora (`admin.js` / `<script>` de `index.html`).

---

## 📚 Referências Rápidas

```
Preciso mexer em:

🎨 Cores/Design (base)?     → css/variables.css
🖼️ Visual do launcher?      → css/launcher.css (autocontido — não mexe em button.css etc.)
🖼️ Visual do admin?         → css/admin.css + css/components/*.css
🔗 Fórmula de link padrão?  → js/api.js → buildDestinationURL()
🔐 Autenticação?            → js/api.js → authenticate()
👤 CRUD de usuários?        → admin.html (aba Usuários) + js/admin.js
🏙️ CRUD de municípios?      → admin.html (aba Municípios) + js/admin.js
📦 Sistemas (apps)?         → data/apps.json + admin.html (aba Aplicativos)
🚪 Login/launcher?          → index.html (tudo inline, sem arquivo JS separado)
⚙️ Admin (estrutura geral)? → admin.html + js/admin.js
```

---

**Este documento é seu "mapa mental" do projeto. Sempre que tiver dúvida de onde algo está — ou se algo realmente está em uso — consulte aqui antes de assumir a arquitetura antiga.**

**Última atualização:** Julho 2026
**Versão:** 1.2 (Fase 1 completa: launcher reconstruído, autenticação real, CRUD de usuários, links calculados por fórmula)
**Status:** ✅ Pronto para planejar a migração Wix (Fase 2)
