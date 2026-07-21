/**
 * EcoHUB State Management
 * 
 * Centraliza o estado global da aplicação.
 * Nunca manipula HTML diretamente.
 * Apenas armazena e gerencia dados.
 */

class AppState {
  constructor() {
    // Estado inicial
    this.state = {
      // Aplicativos e dados
      apps: [],
      municipalities: [],
      users: [],
      permissions: [],
      settings: {},
      
      // Estado da UI
      selectedApp: null,
      selectedMunicipality: null,
      selectedUser: null,
      isModalOpen: false,
      isLoading: false,

      // Autenticação
      isAuthenticated: false,
      currentSession: null,

      // Erros
      error: null
    };

    // Observers para reatividade
    this.observers = [];
  }

  /**
   * Obter estado completo (leitura)
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Obter valor específico do estado
   */
  get(path) {
    return this._getNestedValue(this.state, path);
  }
  
  /**
   * Atualizar estado (com validação)
   */
  setState(updates) {
    const prevState = this.getState();
    
    // Mesclar updates no estado
    this.state = {
      ...this.state,
      ...updates
    };
    
    // Notificar observers
    this._notifyObservers(prevState, this.state);
  }
  
  /**
   * Atualizar valor aninhado
   */
  setNested(path, value) {
    const prevState = this.getState();
    this._setNestedValue(this.state, path, value);
    this._notifyObservers(prevState, this.state);
  }
  
  /**
   * Selecionar aplicativo
   */
  selectApp(appId) {
    this.state.selectedApp = this.state.apps.find(app => app.id === appId);
    this.state.error = null;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Limpar seleção de aplicativo
   */
  deselectApp() {
    this.state.selectedApp = null;
    this.state.selectedMunicipality = null;
    this.state.selectedUser = null;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Definir modal como aberto
   */
  openModal() {
    this.state.isModalOpen = true;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Definir modal como fechado
   */
  closeModal() {
    this.state.isModalOpen = false;
    this.deselectApp();
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Definir estado de carregamento
   */
  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Definir erro
   */
  setError(error) {
    this.state.error = error;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Limpar erro
   */
  clearError() {
    this.state.error = null;
    this._notifyObservers({}, this.state);
  }
  
  /**
   * Registrar observer
   */
  subscribe(callback) {
    this.observers.push(callback);
    
    // Retornar função para desinscrever
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }
  
  /**
   * Notificar todos os observers
   */
  _notifyObservers(prevState, newState) {
    this.observers.forEach(callback => {
      try {
        callback(newState, prevState);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }
  
  /**
   * Obter valor de path aninhado (ex: "user.name")
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
  
  /**
   * Definir valor de path aninhado
   */
  _setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// Criar instância global
window.appState = new AppState();

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppState;
}
