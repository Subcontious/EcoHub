/**
 * EcoHUB Main Application
 * 
 * Arquivo principal que coordena toda a aplicação.
 * - Inicializa estado
 * - Carrega dados
 * - Renderiza UI
 * - Conecta listeners de evento
 */

class EcoHUBApp {
  constructor() {
    this.apps = [];
    this.cards = new Map();
    this.isInitialized = false;
  }
  
  /**
   * Inicializar aplicação
   */
  async init() {
    console.log('🚀 Iniciando EcoHUB...');
    
    try {
      // 1. Carregar dados
      await this._loadData();
      
      // 2. Renderizar grid de apps
      this._renderAppsGrid();
      
      // 3. Configurar listeners globais
      this._setupGlobalListeners();

      this.isInitialized = true;
      console.log('✅ EcoHUB inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar EcoHUB:', error);
      this._showFatalError();
    }
  }
  
  /**
   * Carregar dados da API
   */
  async _loadData() {
    console.log('📦 Carregando dados...');
    
    const data = await api.loadAppData();
    
    appState.setState({
      apps: data.apps,
      municipalities: data.municipalities,
      users: data.users,
      permissions: data.permissions
    });
    
    this.apps = data.apps;
    console.log(`✅ ${this.apps.length} aplicativos carregados`);
  }
  
  /**
   * Renderizar grid de aplicativos
   */
  _renderAppsGrid() {
    console.log('🎨 Renderizando grid de apps...');
    
    const grid = document.getElementById('appsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!this.apps || this.apps.length === 0) {
      grid.innerHTML = '';
      emptyState.removeAttribute('hidden');
      return;
    }
    
    // Limpar grid
    grid.innerHTML = '';
    this.cards.clear();
    
    // Renderizar cards
    this.apps.forEach(appData => {
      const card = new CardComponent(appData);
      const cardElement = card.render();
      
      grid.appendChild(cardElement);
      this.cards.set(appData.id, card);
      
      // Listener de clique no card
      cardElement.addEventListener('cardClicked', () => {
        this._handleCardClick(appData);
      });
    });
    
    emptyState.setAttribute('hidden', '');
  }
  
  /**
   * Manipulador de clique no card
   */
  async _handleCardClick(appData) {
    console.log(`📱 Card clicado: ${appData.name}`);
    
    // Atualizar estado
    appState.selectApp(appData.id);
    appState.openModal();
    
    // Abrir modal de autenticação
    try {
      await modalComponent.open(appData);
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
    }
  }
  
  /**
   * Configurar listeners globais
   */
  _setupGlobalListeners() {
    console.log('🎯 Configurando listeners globais...');
    
    // Listener de autenticação bem-sucedida
    if (modalComponent.form) {
      modalComponent.form.addEventListener('authSuccess', (e) => {
        console.log('✅ Autenticação bem-sucedida');
        this._handleAuthSuccess(e.detail.session);
      });
    }
    
    // Listener de fechamento do modal
    if (modalComponent.overlay) {
      modalComponent.overlay.addEventListener('modalClosed', () => {
        appState.closeModal();
        console.log('🔒 Modal fechado');
      });
    }
    
    // Listener de busca (futuro)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._handleSearch(e.target.value);
      });
    }
    
    // Atalho de teclado (futuro: Ctrl+K para busca)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
      }
    });

    // Menu mobile (sidebar retrátil)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => this._toggleSidebar());
    document.getElementById('sidebarScrim')?.addEventListener('click', () => this._closeSidebar());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._closeSidebar();
    });
  }

  /**
   * Abrir/fechar sidebar (mobile)
   */
  _toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const scrim = document.getElementById('sidebarScrim');
    const toggle = document.getElementById('sidebarToggle');
    const isOpen = sidebar?.classList.toggle('active');

    if (isOpen) {
      scrim?.removeAttribute('hidden');
    } else {
      scrim?.setAttribute('hidden', '');
    }
    toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  /**
   * Fechar sidebar (mobile)
   */
  _closeSidebar() {
    document.getElementById('appSidebar')?.classList.remove('active');
    document.getElementById('sidebarScrim')?.setAttribute('hidden', '');
    document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', 'false');
  }
  
  /**
   * Manipulador de autenticação bem-sucedida
   */
  async _handleAuthSuccess(session) {
    console.log('🎯 Processando autenticação bem-sucedida');
    
    try {
      // Simular redirecionamento
      const redirectUrl = await api.redirectToApp(session);
      console.log('🔀 Redirecionamento para:', redirectUrl);
      
      // Em produção com Wix, aqui seria feito:
      // window.location.href = redirectUrl;
      
      // Para fins de demonstração, apenas logar
      console.log('✅ Usuário autenticado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao redirecionar:', error);
      modalComponent.showError('Erro ao redirecionar para o sistema');
    }
  }
  
  /**
   * Manipulador de busca (futuro)
   */
  _handleSearch(query) {
    if (!query.trim()) {
      this._renderAppsGrid();
      return;
    }
    
    const filtered = this.apps.filter(app =>
      app.name.toLowerCase().includes(query.toLowerCase()) ||
      app.description.toLowerCase().includes(query.toLowerCase())
    );
    
    const grid = document.getElementById('appsGrid');
    grid.innerHTML = '';
    this.cards.clear();
    
    filtered.forEach(app => {
      const card = new CardComponent(app);
      const cardElement = card.render();
      grid.appendChild(cardElement);
      this.cards.set(app.id, card);
      
      cardElement.addEventListener('cardClicked', () => {
        this._handleCardClick(app);
      });
    });
  }
  
  /**
   * Mostrar erro fatal
   */
  _showFatalError() {
    const appsSection = document.querySelector('.app-content');
    if (appsSection) {
      appsSection.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 class="empty-title">Falha ao carregar</h2>
          <p class="empty-message">Não foi possível inicializar o EcoHUB. Por favor, recarregue a página.</p>
        </div>
      `;
    }
  }
}

/**
 * Inicializar aplicação quando DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', async () => {
  const app = new EcoHUBApp();
  await app.init();
  
  // Disponibilizar globalmente para debug
  window.ecohubredApp = app;
});

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EcoHUBApp;
}
