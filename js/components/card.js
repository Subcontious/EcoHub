/**
 * EcoHUB Card Component
 * 
 * Controla o comportamento interativo dos cards (aplicativos).
 * Apenas manipula seu próprio elemento.
 * Emite eventos quando necessário comunicar com outros componentes.
 */

class CardComponent {
  constructor(appData) {
    this.appData = appData;
    this.element = null;
    this.isLoading = false;
    this.isDisabled = false;
  }
  
  /**
   * Criar elemento DOM do card
   */
  render() {
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.dataset.appId = this.appData.id;
    card.role = 'button';
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Abrir ${this.appData.name}`);
    
    const iconColor = this.appData.color || 'var(--color-orange)';

    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon" style="--icon-color: ${iconColor}" aria-hidden="true">
          ${this.appData.icon}
        </div>
        <svg class="card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6"></path>
        </svg>
      </div>
      <div class="card-body">
        <h2 class="card-title">${this.appData.name}</h2>
        <p class="card-description">${this.appData.description}</p>
      </div>
      ${this.appData.isNew ? '<div class="card-badge" aria-label="Novo">1</div>' : ''}
    `;
    
    this.element = card;
    this._attachEventListeners();
    
    return card;
  }
  
  /**
   * Anexar listeners de evento
   */
  _attachEventListeners() {
    if (!this.element) return;
    
    // Clique do mouse
    this.element.addEventListener('click', () => this._handleClick());
    
    // Teclado (Enter ou Space)
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._handleClick();
      }
    });
    
    // Focus para acessibilidade
    this.element.addEventListener('focus', () => this._handleFocus());
    this.element.addEventListener('blur', () => this._handleBlur());
  }
  
  /**
   * Manipulador de clique
   */
  _handleClick() {
    if (this.isDisabled || this.isLoading) return;
    
    // Disparar evento customizado
    const event = new CustomEvent('cardClicked', {
      detail: { appId: this.appData.id },
      bubbles: true
    });
    this.element.dispatchEvent(event);
  }
  
  /**
   * Manipulador de focus
   */
  _handleFocus() {
    this.element.classList.add('focused');
  }
  
  /**
   * Manipulador de blur
   */
  _handleBlur() {
    this.element.classList.remove('focused');
  }
  
  /**
   * Definir estado loading
   */
  setLoading(isLoading) {
    this.isLoading = isLoading;
    
    if (isLoading) {
      this.element.classList.add('loading');
      this.element.disabled = true;
    } else {
      this.element.classList.remove('loading');
      this.element.disabled = false;
    }
  }
  
  /**
   * Definir estado disabled
   */
  setDisabled(isDisabled) {
    this.isDisabled = isDisabled;
    
    if (isDisabled) {
      this.element.classList.add('disabled');
      this.element.tabIndex = -1;
    } else {
      this.element.classList.remove('disabled');
      this.element.tabIndex = 0;
    }
  }
  
  /**
   * Definir estado error
   */
  setError() {
    this.element.classList.add('error');
    animations.vibrate(this.element);
    
    setTimeout(() => {
      this.element.classList.remove('error');
    }, 1000);
  }
  
  /**
   * Definir como selecionado
   */
  select() {
    this.element.classList.add('selected');
  }
  
  /**
   * Remover seleção
   */
  deselect() {
    this.element.classList.remove('selected');
  }
  
  /**
   * Animar expansão (antes de abrir modal)
   */
  async animateExpand() {
    await animations.expandCard(this.element);
  }
  
  /**
   * Destruir componente
   */
  destroy() {
    if (this.element) {
      this.element.remove();
    }
    this.element = null;
  }
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardComponent;
}
