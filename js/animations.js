/**
 * EcoHUB Animations Module
 * 
 * Controla animações e transições.
 * Nunca manipula estado.
 * Apenas adiciona/remove classes CSS e controla timings.
 */

class AnimationController {
  constructor() {
    this.isReducedMotion = this._checkReducedMotion();
  }
  
  /**
   * Verificar preferência de movimento reduzido
   */
  _checkReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  /**
   * Animar fade in
   */
  fadeIn(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms var(--ease-out)`;
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.style.opacity = '1';
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      }, 10);
    });
  }
  
  /**
   * Animar fade out
   */
  fadeOut(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    element.style.transition = `opacity ${duration}ms var(--ease-out)`;
    element.style.opacity = '0';
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }
  
  /**
   * Animar scale (crescimento)
   */
  scaleIn(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    element.style.opacity = '0';
    element.style.transform = 'scale(0.9)';
    element.style.transition = `opacity ${duration}ms var(--ease-out), transform ${duration}ms var(--ease-out)`;
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      }, 10);
    });
  }
  
  /**
   * Animar slide in (descendo de cima)
   */
  slideInDown(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    element.style.transition = `opacity ${duration}ms var(--ease-out), transform ${duration}ms var(--ease-out)`;
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      }, 10);
    });
  }
  
  /**
   * Animar slide in (subindo de baixo)
   */
  slideInUp(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = `opacity ${duration}ms var(--ease-out), transform ${duration}ms var(--ease-out)`;
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      }, 10);
    });
  }
  
  /**
   * Animar vibração (erro)
   */
  vibrate(element, duration = 400) {
    if (!element || this.isReducedMotion) return Promise.resolve();
    
    element.classList.add('vibrate');
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.classList.remove('vibrate');
        resolve();
      }, duration);
    });
  }
  
  /**
   * Animar card ao clicar (antes do modal)
   */
  expandCard(cardElement) {
    if (!cardElement) return Promise.resolve();
    
    cardElement.classList.add('expand-to-modal');
    
    return new Promise(resolve => {
      setTimeout(() => {
        cardElement.classList.remove('expand-to-modal');
        resolve();
      }, 300);
    });
  }
  
  /**
   * Blur do backdrop do modal
   */
  blurBackdrop(overlay) {
    if (!overlay) return Promise.resolve();
    
    return this.fadeIn(overlay, 300);
  }
  
  /**
   * Animar abertura do modal
   */
  openModal(modalElement) {
    if (!modalElement) return Promise.resolve();
    
    modalElement.classList.add('opening');
    
    return new Promise(resolve => {
      setTimeout(() => {
        modalElement.classList.remove('opening');
        resolve();
      }, 300);
    });
  }
  
  /**
   * Animar fechamento do modal
   */
  closeModal(modalElement) {
    if (!modalElement) return Promise.resolve();
    
    modalElement.classList.add('closing');
    
    return new Promise(resolve => {
      setTimeout(() => {
        modalElement.classList.remove('closing');
        resolve();
      }, 150);
    });
  }
  
  /**
   * Animar entrada em cascata (múltiplos elementos)
   */
  staggerIn(elements, duration = 300, initialDelay = 0) {
    if (!elements || elements.length === 0) return Promise.resolve();
    
    const promises = Array.from(elements).map((element, index) => {
      return new Promise(resolve => {
        const delay = initialDelay + index * 50;
        setTimeout(() => {
          this.slideInUp(element, duration).then(resolve);
        }, delay);
      });
    });
    
    return Promise.all(promises);
  }
  
  /**
   * Loading spinner (pulse)
   */
  animateLoading(element) {
    if (!element) return;
    element.classList.add('animate-pulse');
  }
  
  /**
   * Parar loading spinner
   */
  stopLoading(element) {
    if (!element) return;
    element.classList.remove('animate-pulse');
  }
  
  /**
   * Skeleton loading
   */
  createSkeleton(width = '100%', height = '20px') {
    const skeleton = document.createElement('div');
    skeleton.className = 'shimmer';
    skeleton.style.width = width;
    skeleton.style.height = height;
    skeleton.style.borderRadius = 'var(--radius-md)';
    return skeleton;
  }
  
  /**
   * Pulsar efeito (glow)
   */
  pulse(element) {
    if (!element || this.isReducedMotion) return;
    element.classList.add('animate-glow');
  }
  
  /**
   * Parar pulsar
   */
  stopPulse(element) {
    if (!element) return;
    element.classList.remove('animate-glow');
  }
}

// Criar instância global
window.animations = new AnimationController();

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationController;
}
