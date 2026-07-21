/**
 * EcoHUB Modal Component
 * 
 * Controla o modal de autenticação.
 * Gerencia formulário, validação e envio.
 */

class ModalComponent {
  constructor() {
    this.overlay = document.getElementById('modalOverlay');
    this.modal = document.getElementById('authModal');
    this.form = document.getElementById('authForm');
    this.closeBtn = document.getElementById('modalClose');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.submitBtn = document.getElementById('submitBtn');
    
    this.municipalitySelect = document.getElementById('municipality');
    this.usernameInput = document.getElementById('username');
    this.passwordInput = document.getElementById('password');
    this.errorDiv = document.getElementById('formError');
    this.successDiv = document.getElementById('formSuccess');
    this.appNameSpan = document.getElementById('appName');
    
    this.currentApp = null;
    this.isSubmitting = false;
    
    this._attachEventListeners();
  }
  
  /**
   * Anexar listeners de evento
   */
  _attachEventListeners() {
    // Fechar modal
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    
    // Fechar ao clicar no overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // Enviar formulário
    this.form.addEventListener('submit', (e) => this._handleSubmit(e));
    
    // Limpar erro ao digitar
    this.usernameInput.addEventListener('input', () => this._clearFeedback());
    this.passwordInput.addEventListener('input', () => this._clearFeedback());
    this.municipalitySelect.addEventListener('change', () => this._clearFeedback());
    
    // Fechar com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  /**
   * Verificar se modal está aberto
   */
  isOpen() {
    return !this.overlay.hasAttribute('hidden');
  }
  
  /**
   * Abrir modal
   */
  async open(appData) {
    this.currentApp = appData;
    this.appNameSpan.textContent = appData.name;
    this._clearFeedback();

    // Carregar municípios
    await this._loadMunicipalities();
    
    // Remover hidden do overlay
    this.overlay.removeAttribute('hidden');
    
    // Animar abertura
    await animations.blurBackdrop(this.overlay);
    await animations.openModal(this.modal);
    
    // Focar no primeiro campo (acessibilidade)
    setTimeout(() => {
      this.municipalitySelect.focus();
    }, 300);
    
    // Preventar scroll de fundo
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Fechar modal
   */
  async close() {
    if (!this.isOpen()) return;
    
    // Animar fechamento
    await animations.closeModal(this.modal);
    
    // Ocultar overlay
    this.overlay.setAttribute('hidden', '');
    
    // Limpar formulário
    this.form.reset();
    this._clearFeedback();

    // Restaurar scroll
    document.body.style.overflow = '';
    
    // Disparar evento
    const event = new CustomEvent('modalClosed');
    this.overlay.dispatchEvent(event);
  }
  
  /**
   * Carregar municípios no select
   */
  async _loadMunicipalities() {
    try {
      const municipalities = await api.getMunicipalities();
      
      // Limpar opções atuais
      this.municipalitySelect.innerHTML = '<option value="">Selecione...</option>';
      
      // Adicionar opções
      municipalities.forEach(municipality => {
        const option = document.createElement('option');
        option.value = municipality.id;
        option.textContent = `${municipality.name} - ${municipality.state}`;
        this.municipalitySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      this.showError('Erro ao carregar municípios');
    }
  }
  
  /**
   * Validar formulário
   */
  _validateForm() {
    const municipality = this.municipalitySelect.value;
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value.trim();
    
    if (!municipality) {
      this.showError('Selecione um município');
      return false;
    }
    
    if (!username) {
      this.showError('Digite seu usuário');
      return false;
    }
    
    if (!password) {
      this.showError('Digite sua senha');
      return false;
    }
    
    return true;
  }
  
  /**
   * Manipulador do envio do formulário
   */
  async _handleSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    if (!this._validateForm()) return;
    
    this.isSubmitting = true;
    this.setSubmitLoading(true);
    this._clearFeedback();

    try {
      const municipalityId = this.municipalitySelect.value;
      const username = this.usernameInput.value.trim();
      const password = this.passwordInput.value.trim();

      // Fazer autenticação
      const session = await api.authenticate(
        this.currentApp.id,
        municipalityId,
        username,
        password
      );

      // Sucesso!
      console.log('Autenticação bem-sucedida:', session);
      this.showSuccess(`Login com sucesso! Bem-vindo(a), ${session.fullName}.`);
      this.setSubmitLoading(false);

      // Disparar evento de sucesso
      const event = new CustomEvent('authSuccess', {
        detail: { session }
      });
      this.form.dispatchEvent(event);

      // Fechar modal após o usuário ver a confirmação
      setTimeout(() => {
        this.close();
      }, 1400);

    } catch (error) {
      console.error('Erro de autenticação:', error);
      this.showError(error.message || 'Login incorreto: falha na autenticação');
      animations.vibrate(this.form);
      this.setSubmitLoading(false);

    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Mostrar erro
   */
  showError(message) {
    this.successDiv.setAttribute('hidden', '');
    this.errorDiv.textContent = message;
    this.errorDiv.removeAttribute('hidden');
  }

  /**
   * Mostrar sucesso
   */
  showSuccess(message) {
    this.errorDiv.setAttribute('hidden', '');
    this.successDiv.textContent = message;
    this.successDiv.removeAttribute('hidden');
  }

  /**
   * Limpar erro
   */
  clearError() {
    this.errorDiv.setAttribute('hidden', '');
    this.errorDiv.textContent = '';
  }

  /**
   * Limpar sucesso
   */
  clearSuccess() {
    this.successDiv.setAttribute('hidden', '');
    this.successDiv.textContent = '';
  }

  /**
   * Limpar erro e sucesso
   */
  _clearFeedback() {
    this.clearError();
    this.clearSuccess();
  }
  
  /**
   * Definir estado loading do botão submit
   */
  setSubmitLoading(isLoading) {
    if (isLoading) {
      this.submitBtn.classList.add('loading');
      this.submitBtn.disabled = true;
    } else {
      this.submitBtn.classList.remove('loading');
      this.submitBtn.disabled = false;
    }
  }
}

// Criar instância global
window.modalComponent = new ModalComponent();

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalComponent;
}
