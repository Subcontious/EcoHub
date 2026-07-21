/**
 * EcoHUB Admin Application
 * 
 * Gerencia o painel administrativo com CRUD completo
 * para aplicativos e municípios.
 */

class AdminApp {
  constructor() {
    this.apps = [];
    this.cities = [];
    this.users = [];
    this.access = {};
    this.editingId = null;
    this.editingType = null;
    this.editingUserAccess = {};
    this.editingCityLinkOverrides = {};
    this.editingLinkRowAppId = null;
    this.revealedPasswords = new Set();
  }

  /**
   * Inicializar painel administrativo
   */
  async init() {
    console.log('🛠️ Iniciando Painel Administrativo...');

    try {
      // Carregar dados
      await this._loadData();

      // Configurar listeners
      this._setupListeners();

      // Renderizar tabelas iniciais
      this._renderAppTable();
      this._renderCityTable();
      this._renderUserTable();

      console.log('✅ Painel Administrativo inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar admin:', error);
      this._showToast('Erro ao inicializar painel', 'error');
    }
  }
  
  /**
   * Carregar dados do localStorage
   */
  async _loadData() {
    try {
      // Tentar carregar dados salvos
      const saved = localStorage.getItem('ecohub-admin-data');

      if (saved) {
        const data = JSON.parse(saved);
        this.apps = data.apps || [];
        this.cities = data.cities || [];
      } else {
        // Se não houver dados salvos, carregar de JSON
        const data = await api.loadAppData();
        this.apps = data.apps;
        this.cities = data.municipalities;
        this._saveData();
      }

      console.log(`📦 Dados carregados: ${this.apps.length} apps, ${this.cities.length} cidades`);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.apps = [];
      this.cities = [];
    }

    try {
      // Usuários e acessos têm sua própria chave no localStorage
      const savedUsers = localStorage.getItem('ecohub-users-data');

      if (savedUsers) {
        const data = JSON.parse(savedUsers);
        this.users = data.users || [];
        this.access = data.access || {};
      } else {
        const [users, access] = await Promise.all([
          api.fetchJSON('users').catch(() => []),
          api.fetchJSON('access').catch(() => ({}))
        ]);
        this.users = users;
        this.access = access;
        this._saveUsersData();
      }

      console.log(`👤 Usuários carregados: ${this.users.length}`);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.users = [];
      this.access = {};
    }
  }

  /**
   * Salvar dados no localStorage
   */
  _saveData() {
    try {
      localStorage.setItem('ecohub-admin-data', JSON.stringify({
        apps: this.apps,
        cities: this.cities
      }));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  /**
   * Salvar usuários e acessos no localStorage
   * (equivalente local a "gravar" data/users.json e data/access.json —
   * veja _exportData() para baixar o JSON atualizado de verdade)
   */
  _saveUsersData() {
    try {
      localStorage.setItem('ecohub-users-data', JSON.stringify({
        users: this.users,
        access: this.access
      }));
    } catch (error) {
      console.error('Erro ao salvar usuários:', error);
    }
  }
  
  /**
   * Configurar listeners
   */
  _setupListeners() {
    // Abas
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        this._switchTab(e.currentTarget.dataset.tab);
        this._closeSidebar();
      });
    });

    // Menu mobile (sidebar retrátil)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => this._toggleSidebar());
    document.getElementById('sidebarScrim')?.addEventListener('click', () => this._closeSidebar());
    
    // Apps
    document.getElementById('addAppBtn')?.addEventListener('click', () => this._openAppForm());
    document.getElementById('appForm')?.addEventListener('submit', (e) => this._submitAppForm(e));
    document.getElementById('closeAppModal')?.addEventListener('click', () => this._closeAppModal());
    document.getElementById('cancelAppForm')?.addEventListener('click', () => this._closeAppModal());
    
    // Cidades
    document.getElementById('addCityBtn')?.addEventListener('click', () => this._openCityForm());
    document.getElementById('cityForm')?.addEventListener('submit', (e) => this._submitCityForm(e));
    document.getElementById('closeCityModal')?.addEventListener('click', () => this._closeCityModal());
    document.getElementById('cancelCityForm')?.addEventListener('click', () => this._closeCityModal());
    document.getElementById('cityName')?.addEventListener('input', (e) => {
      this.editingLinkRowAppId = null;
      this._renderCityLinks(e.target.value);
    });

    // Usuários
    document.getElementById('addUserBtn')?.addEventListener('click', () => this._openUserForm());
    document.getElementById('userForm')?.addEventListener('submit', (e) => this._submitUserForm(e));
    document.getElementById('closeUserModal')?.addEventListener('click', () => this._closeUserModal());
    document.getElementById('cancelUserForm')?.addEventListener('click', () => this._closeUserModal());
    document.getElementById('addAccessGrantBtn')?.addEventListener('click', () => this._addAccessGrant());
    document.getElementById('userMaster')?.addEventListener('change', (e) => this._toggleUserAccessSection(e.target.checked));

    // Settings
    document.getElementById('exportDataBtn')?.addEventListener('click', () => this._exportData());
    document.getElementById('clearDataBtn')?.addEventListener('click', () => this._clearAllData());

    // Fechar modais ao clicar no overlay
    document.getElementById('appModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'appModalOverlay') this._closeAppModal();
    });

    document.getElementById('cityModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'cityModalOverlay') this._closeCityModal();
    });

    document.getElementById('userModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'userModalOverlay') this._closeUserModal();
    });

    // Fechar modais com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closeAppModal();
        this._closeCityModal();
        this._closeUserModal();
        this._closeSidebar();
      }
    });
  }

  /**
   * Abrir/fechar sidebar (mobile)
   */
  _toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
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
    document.getElementById('adminSidebar')?.classList.remove('active');
    document.getElementById('sidebarScrim')?.setAttribute('hidden', '');
    document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', 'false');
  }

  /**
   * Alternar abas
   */
  _switchTab(tabName) {
    // Desativar abas atuais
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Ativar nova aba
    document.querySelector(`[data-panel="${tabName}"]`)?.classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  }
  
  /* ========================================
     GERENCIAR APLICATIVOS
     ======================================== */
  
  /**
   * Abrir formulário de novo app
   */
  _openAppForm(appId = null) {
    const modal = document.getElementById('appModalOverlay');
    const form = document.getElementById('appForm');
    const title = document.getElementById('appModalTitle');
    
    form.reset();
    this.editingId = appId;
    this.editingType = 'app';
    
    if (appId) {
      const app = this.apps.find(a => a.id === appId);
      if (app) {
        title.textContent = 'Editar Aplicativo';
        document.getElementById('appName').value = app.name;
        document.getElementById('appDescription').value = app.description;
        document.getElementById('appIcon').value = app.icon;
        document.getElementById('appOrder').value = app.displayOrder;
        document.getElementById('appActive').checked = app.isActive;
      }
    } else {
      title.textContent = 'Novo Aplicativo';
    }
    
    modal?.removeAttribute('hidden');
  }
  
  /**
   * Fechar modal de app
   */
  _closeAppModal() {
    document.getElementById('appModalOverlay')?.setAttribute('hidden', '');
    document.getElementById('appForm')?.reset();
    this.editingId = null;
  }
  
  /**
   * Enviar formulário de app
   */
  async _submitAppForm(e) {
    e.preventDefault();
    
    const name = document.getElementById('appName').value.trim();
    const description = document.getElementById('appDescription').value.trim();
    const icon = document.getElementById('appIcon').value.trim();
    const order = parseInt(document.getElementById('appOrder').value) || 1;
    const isActive = document.getElementById('appActive').checked;
    
    if (!name) {
      this._showToast('Nome do aplicativo é obrigatório', 'error');
      return;
    }
    
    if (this.editingId) {
      // Editar
      const app = this.apps.find(a => a.id === this.editingId);
      if (app) {
        app.name = name;
        app.description = description;
        app.icon = icon;
        app.displayOrder = order;
        app.isActive = isActive;
      }
      this._showToast('Aplicativo atualizado com sucesso', 'success');
    } else {
      // Criar
      const newApp = {
        id: 'app-' + Date.now(),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        icon: icon || '📱',
        displayOrder: order,
        isActive,
        version: '1.0.0',
        category: 'Geral',
        createdAt: new Date().toISOString()
      };
      this.apps.push(newApp);
      this._showToast('Aplicativo criado com sucesso', 'success');
    }
    
    this._saveData();
    this._renderAppTable();
    this._closeAppModal();
  }
  
  /**
   * Deletar app
   */
  _deleteApp(appId) {
    if (!confirm('Tem certeza que deseja deletar este aplicativo?')) return;
    
    this.apps = this.apps.filter(a => a.id !== appId);
    this._saveData();
    this._renderAppTable();
    this._showToast('Aplicativo removido', 'success');
  }
  
  /**
   * Renderizar tabela de apps
   */
  _renderAppTable() {
    const tbody = document.getElementById('appsTableBody');
    const empty = document.getElementById('appsEmpty');
    
    if (!this.apps || this.apps.length === 0) {
      tbody.innerHTML = '';
      empty?.removeAttribute('hidden');
      return;
    }
    
    empty?.setAttribute('hidden', '');
    
    tbody.innerHTML = this.apps.map(app => `
      <tr>
        <td class="icon-cell"><span class="app-icon-tile" style="--icon-color: ${app.color || 'var(--color-orange)'}">${app.icon}</span></td>
        <td><strong>${app.name}</strong></td>
        <td>${app.description || '—'}</td>
        <td>${app.displayOrder}</td>
        <td>
          <span class="status-badge ${app.isActive ? '' : 'inactive'}">
            <span class="status-dot"></span>
            ${app.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Editar" onclick="window.adminApp._openAppForm('${app.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" title="Deletar" onclick="window.adminApp._deleteApp('${app.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  /* ========================================
     GERENCIAR MUNICÍPIOS
     ======================================== */
  
  /**
   * Abrir formulário de novo município
   */
  _openCityForm(cityId = null) {
    const modal = document.getElementById('cityModalOverlay');
    const form = document.getElementById('cityForm');
    const title = document.getElementById('cityModalTitle');
    
    form.reset();
    this.editingId = cityId;
    this.editingType = 'city';
    this.editingCityLinkOverrides = {};
    this.editingLinkRowAppId = null;

    if (cityId) {
      const city = this.cities.find(c => c.id === cityId);
      if (city) {
        title.textContent = 'Editar Município';
        document.getElementById('cityName').value = city.name;
        document.getElementById('cityState').value = city.state;
        document.getElementById('cityIBGE').value = city.ibgeCode || '';
        document.getElementById('cityRegion').value = city.region || '';
        document.getElementById('cityActive').checked = city.isActive !== false;
        this.editingCityLinkOverrides = JSON.parse(JSON.stringify(city.linkOverrides || {}));
      }
    } else {
      title.textContent = 'Novo Município';
    }

    this._renderCityLinks(document.getElementById('cityName').value);

    modal?.removeAttribute('hidden');
  }

  /**
   * Fechar modal de município
   */
  _closeCityModal() {
    document.getElementById('cityModalOverlay')?.setAttribute('hidden', '');
    document.getElementById('cityForm')?.reset();
    this._renderCityLinks('');
    this.editingId = null;
    this.editingCityLinkOverrides = {};
    this.editingLinkRowAppId = null;
  }

  /**
   * Renderizar os links dos sistemas para este município no formulário.
   * Cada linha usa o link padrão calculado, a não ser que exista uma
   * personalização em this.editingCityLinkOverrides — para os sistemas
   * que não seguem o padrão. Recalculado a cada tecla digitada no nome.
   */
  _renderCityLinks(cityName) {
    const container = document.getElementById('cityLinksList');
    if (!container) return;

    const name = (cityName || '').trim();

    if (!name) {
      container.innerHTML = '<p class="access-grants-empty">Digite o nome do município para gerar os links.</p>';
      return;
    }

    const activeApps = this.apps.filter(app => app.isActive);

    if (activeApps.length === 0) {
      container.innerHTML = '<p class="access-grants-empty">Nenhum sistema ativo cadastrado.</p>';
      return;
    }

    container.innerHTML = activeApps.map(app => {
      const standardUrl = api.buildDestinationURL(app.name, name);
      const override = this.editingCityLinkOverrides[app.id];
      const currentUrl = override || standardUrl;

      if (this.editingLinkRowAppId === app.id) {
        return `
          <div class="city-link-row city-link-row-editing">
            <span class="city-link-app">${app.name}</span>
            <div class="city-link-edit">
              <input type="url" class="form-input city-link-input" id="cityLinkInput-${app.id}" value="${currentUrl}">
              <button type="button" class="action-btn" title="Salvar link" onclick="window.adminApp._saveCityLinkOverride('${app.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button type="button" class="action-btn delete" title="Cancelar" onclick="window.adminApp._cancelCityLinkEdit()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="city-link-row">
          <span class="city-link-app">${app.name}</span>
          <div class="city-link-value">
            ${override ? '<span class="city-link-custom-badge">Personalizado</span>' : ''}
            <a href="${currentUrl}" target="_blank" rel="noopener noreferrer" class="city-link-url">${currentUrl}</a>
            <button type="button" class="action-btn" title="Editar link" onclick="window.adminApp._editCityLink('${app.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            ${override ? `
              <button type="button" class="action-btn delete" title="Restaurar link padrão" onclick="window.adminApp._resetCityLink('${app.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Colocar a linha de um sistema em modo de edição
   */
  _editCityLink(appId) {
    this.editingLinkRowAppId = appId;
    this._renderCityLinks(document.getElementById('cityName').value);
    document.getElementById(`cityLinkInput-${appId}`)?.focus();
  }

  /**
   * Cancelar a edição da linha, sem salvar
   */
  _cancelCityLinkEdit() {
    this.editingLinkRowAppId = null;
    this._renderCityLinks(document.getElementById('cityName').value);
  }

  /**
   * Salvar o link personalizado digitado (ou descartar, se igual ao padrão)
   */
  _saveCityLinkOverride(appId) {
    const input = document.getElementById(`cityLinkInput-${appId}`);
    const value = (input?.value || '').trim();
    const app = this.apps.find(a => a.id === appId);
    const cityName = document.getElementById('cityName').value.trim();
    const standardUrl = app ? api.buildDestinationURL(app.name, cityName) : '';

    if (!value || value === standardUrl) {
      delete this.editingCityLinkOverrides[appId];
    } else {
      this.editingCityLinkOverrides[appId] = value;
    }

    this.editingLinkRowAppId = null;
    this._renderCityLinks(cityName);
  }

  /**
   * Remover a personalização e voltar a usar o link padrão
   */
  _resetCityLink(appId) {
    delete this.editingCityLinkOverrides[appId];
    this._renderCityLinks(document.getElementById('cityName').value);
  }

  /**
   * Enviar formulário de município
   */
  async _submitCityForm(e) {
    e.preventDefault();

    const name = document.getElementById('cityName').value.trim();
    const state = document.getElementById('cityState').value.trim().toUpperCase();
    const ibgeCode = document.getElementById('cityIBGE').value.trim();
    const region = document.getElementById('cityRegion').value;
    const isActive = document.getElementById('cityActive').checked;

    if (!name || !state) {
      this._showToast('Nome e estado são obrigatórios', 'error');
      return;
    }

    if (this.editingId) {
      // Editar
      const city = this.cities.find(c => c.id === this.editingId);
      if (city) {
        city.name = name;
        city.state = state;
        city.ibgeCode = ibgeCode;
        city.region = region;
        city.isActive = isActive;
        city.linkOverrides = { ...this.editingCityLinkOverrides };
      }
      this._showToast('Município atualizado com sucesso', 'success');
    } else {
      // Criar
      const newCity = {
        id: 'city-' + Date.now(),
        name,
        state,
        ibgeCode,
        region,
        isActive,
        linkOverrides: { ...this.editingCityLinkOverrides },
        createdAt: new Date().toISOString()
      };
      this.cities.push(newCity);
      this._showToast('Município criado com sucesso', 'success');
    }

    this._saveData();
    this._renderCityTable();
    this._closeCityModal();
  }
  
  /**
   * Deletar município
   */
  _deleteCity(cityId) {
    if (!confirm('Tem certeza que deseja deletar este município?')) return;
    
    this.cities = this.cities.filter(c => c.id !== cityId);
    this._saveData();
    this._renderCityTable();
    this._showToast('Município removido', 'success');
  }
  
  /**
   * Renderizar tabela de cidades
   */
  _renderCityTable() {
    const tbody = document.getElementById('citiesTableBody');
    const empty = document.getElementById('citiesEmpty');
    
    if (!this.cities || this.cities.length === 0) {
      tbody.innerHTML = '';
      empty?.removeAttribute('hidden');
      return;
    }
    
    empty?.setAttribute('hidden', '');
    
    tbody.innerHTML = this.cities.map(city => `
      <tr>
        <td><strong>${city.name}</strong></td>
        <td>${city.state}</td>
        <td>${city.ibgeCode || '—'}</td>
        <td>${city.region || '—'}</td>
        <td>
          <span class="status-badge ${city.isActive !== false ? '' : 'inactive'}">
            <span class="status-dot"></span>
            ${city.isActive !== false ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Editar" onclick="window.adminApp._openCityForm('${city.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" title="Deletar" onclick="window.adminApp._deleteCity('${city.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  /* ========================================
     GERENCIAR USUÁRIOS
     ======================================== */

  /**
   * Abrir formulário de novo usuário (ou edição, se userId for passado)
   */
  _openUserForm(userId = null) {
    const modal = document.getElementById('userModalOverlay');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');

    form.reset();
    this.editingId = userId;
    this.editingType = 'user';
    this.editingUserAccess = {};

    this._populateAccessSelects();

    if (userId) {
      const user = this.users.find(u => u.id === userId);
      if (user) {
        title.textContent = 'Editar Usuário';
        document.getElementById('userFullName').value = user.fullName;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userPassword').value = user.password;
        document.getElementById('userMaster').checked = !!user.isMaster;
        document.getElementById('userActive').checked = user.isActive !== false;

        // Clonar os acessos atuais do usuário para a área de trabalho do modal
        this.editingUserAccess = JSON.parse(JSON.stringify(this.access[user.username] || {}));
      }
    } else {
      title.textContent = 'Novo Usuário';
    }

    this._toggleUserAccessSection(document.getElementById('userMaster').checked);
    this._renderAccessGrantsList();

    modal?.removeAttribute('hidden');
  }

  /**
   * Fechar modal de usuário
   */
  _closeUserModal() {
    document.getElementById('userModalOverlay')?.setAttribute('hidden', '');
    document.getElementById('userForm')?.reset();
    this.editingId = null;
    this.editingUserAccess = {};
  }

  /**
   * Mostrar/ocultar a área de concessão de acesso (irrelevante p/ usuário master)
   */
  _toggleUserAccessSection(isMaster) {
    const section = document.getElementById('userAccessSection');
    if (!section) return;

    if (isMaster) {
      section.setAttribute('hidden', '');
    } else {
      section.removeAttribute('hidden');
    }
  }

  /**
   * Preencher os selects de sistema e município do formulário de acesso
   */
  _populateAccessSelects() {
    const appSelect = document.getElementById('accessAppSelect');
    const citySelect = document.getElementById('accessCitySelect');
    if (!appSelect || !citySelect) return;

    appSelect.innerHTML = '<option value="">Sistema...</option>' +
      this.apps.map(app => `<option value="${app.id}">${app.name}</option>`).join('');

    citySelect.innerHTML = '<option value="">Município...</option>' +
      this.cities.map(city => `<option value="${city.id}">${city.name} - ${city.state}</option>`).join('');
  }

  /**
   * Adicionar uma concessão de acesso (sistema + município) ao usuário em edição
   */
  _addAccessGrant() {
    const appId = document.getElementById('accessAppSelect').value;
    const cityId = document.getElementById('accessCitySelect').value;

    if (!appId || !cityId) {
      this._showToast('Selecione um sistema e um município', 'error');
      return;
    }

    if (!this.editingUserAccess[appId]) {
      this.editingUserAccess[appId] = {};
    }

    if (this.editingUserAccess[appId][cityId]) {
      this._showToast('Este usuário já tem acesso a esse sistema nesse município', 'warning');
      return;
    }

    this.editingUserAccess[appId][cityId] = { isActive: true };

    this._renderAccessGrantsList();
  }

  /**
   * Remover uma concessão de acesso da área de trabalho do modal
   */
  _removeAccessGrant(appId, cityId) {
    if (this.editingUserAccess[appId]) {
      delete this.editingUserAccess[appId][cityId];
      if (Object.keys(this.editingUserAccess[appId]).length === 0) {
        delete this.editingUserAccess[appId];
      }
    }
    this._renderAccessGrantsList();
  }

  /**
   * Renderizar a lista de concessões de acesso dentro do modal
   */
  _renderAccessGrantsList() {
    const container = document.getElementById('accessGrantsList');
    if (!container) return;

    const rows = [];
    Object.entries(this.editingUserAccess).forEach(([appId, cities]) => {
      const app = this.apps.find(a => a.id === appId);
      Object.keys(cities).forEach(cityId => {
        const city = this.cities.find(c => c.id === cityId);
        const link = app && city ? api.buildDestinationURL(app.name, city.name) : null;

        rows.push(`
          <div class="access-grant-chip">
            <div>
              <div><strong>${app ? app.name : appId}</strong> <span class="grant-city">· ${city ? city.name : cityId}</span></div>
              ${link ? `<div class="grant-link">${link}</div>` : ''}
            </div>
            <button type="button" class="chip-remove" title="Remover acesso" onclick="window.adminApp._removeAccessGrant('${appId}', '${cityId}')">×</button>
          </div>
        `);
      });
    });

    container.innerHTML = rows.length
      ? rows.join('')
      : '<p class="access-grants-empty" id="accessGrantsEmpty">Nenhum acesso concedido ainda.</p>';
  }

  /**
   * Enviar formulário de usuário
   */
  async _submitUserForm(e) {
    e.preventDefault();

    const fullName = document.getElementById('userFullName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const username = document.getElementById('userUsername').value.trim().toLowerCase();
    const password = document.getElementById('userPassword').value.trim();
    const isMaster = document.getElementById('userMaster').checked;
    const isActive = document.getElementById('userActive').checked;

    if (!fullName || !username || !password) {
      this._showToast('Nome, usuário e senha são obrigatórios', 'error');
      return;
    }

    // Login precisa ser único (exceto para o próprio usuário em edição)
    const duplicate = this.users.find(u =>
      u.username.toLowerCase() === username && u.id !== this.editingId
    );
    if (duplicate) {
      this._showToast('Já existe um usuário com esse login', 'error');
      return;
    }

    let previousUsername = null;

    if (this.editingId) {
      // Editar
      const user = this.users.find(u => u.id === this.editingId);
      if (user) {
        previousUsername = user.username;
        user.fullName = fullName;
        user.email = email;
        user.username = username;
        user.password = password;
        user.isMaster = isMaster;
        user.isActive = isActive;
      }
      this._showToast('Usuário atualizado com sucesso', 'success');
    } else {
      // Criar
      const newUser = {
        id: 'user-' + Date.now(),
        fullName,
        email,
        username,
        password,
        isMaster,
        isActive,
        createdAt: new Date().toISOString().slice(0, 10)
      };
      this.users.push(newUser);
      this._showToast('Usuário criado com sucesso', 'success');
    }

    // Se o login mudou, a concessão antiga precisa migrar de chave
    if (previousUsername && previousUsername !== username) {
      delete this.access[previousUsername];
    }

    // Gravar (ou limpar, se master) as concessões de acesso deste usuário
    if (isMaster || Object.keys(this.editingUserAccess).length === 0) {
      delete this.access[username];
    } else {
      this.access[username] = this.editingUserAccess;
    }

    this._saveUsersData();
    this._renderUserTable();
    this._closeUserModal();
  }

  /**
   * Deletar usuário
   */
  _deleteUser(userId) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    const user = this.users.find(u => u.id === userId);
    this.users = this.users.filter(u => u.id !== userId);
    if (user) {
      delete this.access[user.username];
    }

    this._saveUsersData();
    this._renderUserTable();
    this._showToast('Usuário removido', 'success');
  }

  /**
   * Alternar exibição da senha em texto puro na tabela
   */
  _togglePasswordReveal(userId) {
    if (this.revealedPasswords.has(userId)) {
      this.revealedPasswords.delete(userId);
    } else {
      this.revealedPasswords.add(userId);
    }
    this._renderUserTable();
  }

  /**
   * Contar quantas concessões de acesso (sistema + município) um usuário tem
   */
  _countAccessGrants(username) {
    const grants = this.access[username];
    if (!grants) return 0;
    return Object.values(grants).reduce((total, cities) => total + Object.keys(cities).length, 0);
  }

  /**
   * Formatar data (YYYY-MM-DD ou ISO) para DD/MM/AAAA
   */
  _formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Renderizar tabela de usuários
   */
  _renderUserTable() {
    const tbody = document.getElementById('usersTableBody');
    const empty = document.getElementById('usersEmpty');

    if (!this.users || this.users.length === 0) {
      tbody.innerHTML = '';
      empty?.removeAttribute('hidden');
      return;
    }

    empty?.setAttribute('hidden', '');

    tbody.innerHTML = this.users.map(user => {
      const isRevealed = this.revealedPasswords.has(user.id);
      const grantCount = this._countAccessGrants(user.username);

      return `
      <tr>
        <td class="user-cell">
          <strong>${user.fullName}</strong>
          <span class="user-username">@${user.username}</span>
          ${user.createdAt ? `<span class="user-created">Criado em ${this._formatDate(user.createdAt)}</span>` : ''}
        </td>
        <td>${user.email || '—'}</td>
        <td>
          <div class="password-cell">
            <span>${isRevealed ? user.password : '••••••••'}</span>
            <button type="button" class="password-reveal-btn" title="${isRevealed ? 'Ocultar senha' : 'Mostrar senha'}" onclick="window.adminApp._togglePasswordReveal('${user.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isRevealed
                  ? '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                  : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'}
              </svg>
            </button>
          </div>
        </td>
        <td>
          ${user.isMaster ? '<span class="badge-master">Master</span>' : '<span class="badge-standard">Padrão</span>'}
        </td>
        <td>
          <span class="access-count">${user.isMaster ? 'Acesso total' : `${grantCount} acesso${grantCount === 1 ? '' : 's'}`}</span>
        </td>
        <td>
          <span class="status-badge ${user.isActive !== false ? '' : 'inactive'}">
            <span class="status-dot"></span>
            ${user.isActive !== false ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Editar" onclick="window.adminApp._openUserForm('${user.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" title="Deletar" onclick="window.adminApp._deleteUser('${user.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  /* ========================================
     CONFIGURAÇÕES
     ======================================== */

  /**
   * Exportar dados
   */
  _exportData() {
    const data = {
      apps: this.apps,
      cities: this.cities,
      users: this.users,
      access: this.access,
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecohub-backup-${Date.now()}.json`;
    a.click();

    this._showToast('Dados exportados com sucesso', 'success');
  }

  /**
   * Limpar todos os dados
   */
  _clearAllData() {
    if (!confirm('Tem CERTEZA? Isso deletará TODOS os dados permanentemente!')) return;
    if (!confirm('Tem certeza MESMO?')) return;

    this.apps = [];
    this.cities = [];
    this.users = [];
    this.access = {};
    this._saveData();
    this._saveUsersData();
    this._renderAppTable();
    this._renderCityTable();
    this._renderUserTable();
    this._showToast('Todos os dados foram deletados', 'warning');
  }
  
  /* ========================================
     UI HELPERS
     ======================================== */
  
  /**
   * Mostrar notificação toast
   */
  _showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this._getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remover após 4 segundos
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
  
  /**
   * Obter ícone do toast
   */
  _getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || '•';
  }
}

/**
 * Inicializar quando DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', async () => {
  const adminApp = new AdminApp();
  await adminApp.init();
  
  // Disponibilizar globalmente para debug
  window.adminApp = adminApp;
});
