# 🏗️ EcoHUB — Central de Sistemas Ecoplan

Versão: 1.0 (Fase 1: Desenvolvimento Independente)

## 📋 Sobre este Projeto

O **EcoHUB** é um **Sistema Operacional Corporativo** que centraliza o acesso a todos os sistemas da Ecoplan (DigidocRH, DigidocAD, DigidocPAT, LegisDigital, ImposiGov, etc.).

Nesta fase (Fase 1), toda a interface foi desenvolvida em **HTML, CSS e JavaScript puro**, sem dependências externas. Os dados são simulados com JSON local.

Na Fase 2, será feita integração com Wix Studio + Velo para persistência real.

---

## 📁 Estrutura do Projeto

```
EcoHUB/
├── index.html                  # Página principal (Home)
│
├── css/
│   ├── variables.css           # Design System (cores, espaçamentos, etc.)
│   ├── reset.css               # Normalização de estilos HTML
│   ├── typography.css          # Hierarquia de textos
│   ├── layout.css              # Grid, flexbox, containers
│   ├── animations.css          # Transições e efeitos
│   ├── home.css                # Estilos específicos da Home
│   └── components/
│       ├── button.css          # Componente Botão (4 tipos)
│       ├── card.css            # Componente Card (aplicativo)
│       └── modal.css           # Componente Modal (autenticação)
│
├── js/
│   ├── state.js                # Gerenciamento de estado global
│   ├── api.js                  # Abstração da API (será Wix depois)
│   ├── animations.js           # Controlador de animações
│   ├── app.js                  # Arquivo principal (inicialização)
│   └── components/
│       ├── card.js             # Lógica do componente Card
│       └── modal.js            # Lógica do componente Modal
│
├── data/
│   ├── apps.json               # Sistemas disponíveis
│   ├── cities.json             # Municípios
│   ├── users.json              # Usuários
│   └── permissions.json        # Permissões (relacionamentos)
│
└── README.md                   # Este arquivo
```

---

## 🎯 Arquitetura

### Camadas

```
┌────────────────────────────┐
│    Camada de Apresentação  │ HTML, CSS, Componentes
│    (Interface Visual)      │ DOM Manipulation
└────────────────────────────┘
             ↓
┌────────────────────────────┐
│    Camada de Aplicação     │ State Management
│    (Lógica da UI)          │ Event Handling
└────────────────────────────┘
             ↓
┌────────────────────────────┐
│    Camada de Serviços      │ API (JSON local)
│    (Dados & Lógica)        │ Autenticação (simulada)
└────────────────────────────┘
             ↓
┌────────────────────────────┐
│    Persistência de Dados   │ JSON (local)
│    (Será Wix CMS depois)   │ LocalStorage
└────────────────────────────┘
```

### Filosofia

- **Desacoplamento**: Cada camada é independente
- **Modularidade**: Componentes reutilizáveis
- **Clareza**: Código bem documentado e organizado
- **Escalabilidade**: Preparado para migração futura

---

## 🚀 Como Usar

### Iniciando o Servidor Local

O projeto precisa ser servido via HTTP (não funciona com `file://`).

**Com Python 3:**
```bash
python -m http.server 8000
```

**Com Node.js (http-server):**
```bash
npx http-server
```

**Com VS Code:**
Use a extensão "Live Server"

Depois acesse: `http://localhost:8000`

---

## 📚 Documentação dos Módulos

### `state.js` — Gerenciamento de Estado

Centraliza o estado global da aplicação usando o padrão Observer.

**Métodos principais:**
```javascript
appState.getState()           // Obter estado completo
appState.setState({ ... })    // Atualizar estado
appState.get('path.to.value') // Obter valor específico
appState.selectApp(appId)     // Selecionar aplicativo
appState.openModal()          // Abrir modal
appState.closeModal()         // Fechar modal
appState.toggleTheme()        // Alternar tema claro/escuro
appState.subscribe(callback)  // Observar mudanças
```

**Estado inicial:**
```javascript
{
  apps: [],                    // Aplicativos carregados
  municipalities: [],          // Municípios
  selectedApp: null,           // App selecionado
  isModalOpen: false,          // Modal aberto?
  currentTheme: 'light',       // Tema atual
  isAuthenticated: false,      // Autenticado?
  error: null                  // Mensagem de erro
}
```

### `api.js` — Abstração da API

Comunica-se com a "API" (atualmente JSON local). Será substituído por Wix Velo na Fase 2.

**Métodos principais:**
```javascript
await api.loadAppData()        // Carregar todos os dados
await api.getApps()           // Obter aplicativos ativos
await api.getMunicipalities() // Obter municípios
await api.authenticate(...)   // Fazer login (simulado)
```

### `animations.js` — Controlador de Animações

Controla todas as animações e transições.

**Métodos principais:**
```javascript
animations.fadeIn(element)
animations.slideInUp(element)
animations.scaleIn(element)
animations.vibrate(element)
animations.openModal(element)
animations.closeModal(element)
animations.staggerIn(elements) // Entrada em cascata
```

**Timing padrão:**
- Microinterações: 100-150ms
- Hover: 180ms
- Abrir Modal: 250ms
- Fade: 200ms

### `CardComponent` — Componente de Aplicativo

Representa um sistema disponível.

```javascript
const card = new CardComponent(appData);
const element = card.render();
card.setLoading(true);
card.select();
card.setError();
```

### `ModalComponent` — Componente de Autenticação

Modal para login nos sistemas.

```javascript
modalComponent.open(appData);
modalComponent.close();
modalComponent.showError(message);
```

---

## 🎨 Design System

Todos os tokens de design estão em `css/variables.css`.

### Cores Primárias

```css
--color-orange: #E8590C;      /* Principal/Destaque */
--color-blue: #0066CC;        /* Links/Informações */
--color-text: #1B1D22;        /* Texto principal */
--color-bg: #FFFFFF;          /* Fundo */
```

### Espaçamento (múltiplos de 8px)

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Tipografia

```css
--font-family: 'Inter', sans-serif;
--font-size-base: 16px;
--font-size-lg: 18px;
--font-size-xl: 20px;
```

### Transições

```css
--duration-fast: 150ms;
--duration-normal: 300ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

---

## 📱 Responsividade

O projeto é desenvolvido com **Desktop First** e é responsivo para:
- **Desktop**: 1920px, 1600px, 1440px, 1366px, 1280px
- **Tablet**: Otimizado até 1024px
- **Mobile**: Otimizado para 640px

---

## ♿ Acessibilidade

✅ Navegação por teclado
✅ ARIA labels e roles
✅ Contraste adequado
✅ Suporta modo escuro por preferência do sistema
✅ Respeita `prefers-reduced-motion`

---

## 🔄 Fluxo de Uso

1. Usuário acessa `index.html`
2. App inicializa e carrega dados de `apps.json`
3. Grid de aplicativos é renderizado
4. Usuário clica em um card (ex: DigidocRH)
5. Modal de autenticação abre
6. Usuário seleciona Município, digita usuário e senha
7. API simula autenticação
8. Se bem-sucedido → Redirecionar para sistema

---

## 🛠️ Desenvolvimento

### Adicionar um Novo Aplicativo

1. Adicionar entrada em `data/apps.json`:
```json
{
  "id": "novo-app",
  "name": "Novo App",
  "description": "Descrição",
  "icon": "📱",
  "displayOrder": 7
}
```

2. Grid será atualizado automaticamente

### Adicionar um Novo Município

1. Adicionar entrada em `data/cities.json`:
```json
{
  "id": "999",
  "name": "Nova Cidade",
  "state": "UF"
}
```

2. Select do modal será atualizado automaticamente

### Debug

Abrir console do navegador:
```javascript
// Ver estado completo
appState.getState()

// Ver aplicativos carregados
window.api.getApps()

// Ver instância da app
window.ecohubredApp
```

---

## ⚠️ Limitações da Fase 1

- Autenticação é **simulada** (não faz login real)
- Dados vêm de **JSON local** (não de banco de dados)
- Redirecionamento é **simulado** (não redireciona)
- Sem integração com **Wix Studio** ainda

---

## 📋 Próximos Passos (Fase 2)

- [ ] Integrar com Wix CMS Collections
- [ ] Implementar Wix Velo para autenticação real
- [ ] Conectar URLs reais dos sistemas
- [ ] Implementar sistema de logs
- [ ] Adicionar painel administrativo
- [ ] Implementar busca global (Ctrl+K)

---

## 📖 Referências

- Documentação de Arquitetura: Ver `ECOHUB.pdf`
- Design System: `css/variables.css`
- Filosofia: Ver seções de comentários no código

---

## ✨ Características

✅ Interface moderna e intuitiva
✅ Sem dependências externas
✅ Design responsivo
✅ Modo escuro/claro
✅ Animações suaves
✅ Acessível
✅ Preparado para migração futura

---

**Desenvolvido com ❤️ para a Ecoplan**

Versão 1.0 — Fase 1 (Desenvolvimento Independente)
