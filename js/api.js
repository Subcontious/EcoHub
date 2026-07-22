/**
 * EcoHUB API Module
 * 
 * Abstração da comunicação com backend.
 * Atualmente usa JSON local.
 * Depois será substituído por Wix Velo.
 * 
 * Responsável apenas por requisições HTTP/Wix.
 * Nunca manipula estado ou DOM diretamente.
 */

class API {
  constructor() {
    this.baseUrl = '/data';
    this.cache = {};
  }
  
  /**
   * Buscar arquivo JSON com cache
   */
  async fetchJSON(filename) {
    if (this.cache[filename]) {
      return JSON.parse(JSON.stringify(this.cache[filename]));
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/${filename}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.cache[filename] = data;
      return data;
    } catch (error) {
      console.error(`Error fetching ${filename}:`, error);
      throw error;
    }
  }
  
  /**
   * Carregar todos os dados da aplicação
   */
  async loadAppData() {
    try {
      const [apps, municipalities, users, access] = await Promise.all([
        this.fetchJSON('apps'),
        this.fetchJSON('cities').catch(() => []),
        this.fetchJSON('users').catch(() => []),
        this.fetchJSON('access').catch(() => ({}))
      ]);

      return {
        apps,
        municipalities,
        users,
        access
      };
    } catch (error) {
      console.error('Failed to load app data:', error);
      return {
        apps: [],
        municipalities: [],
        users: [],
        access: {}
      };
    }
  }
  
  /**
   * Obter aplicativos disponíveis (com ordenação)
   */
  async getApps() {
    const apps = await this._getApps();
    return apps
      .filter(app => app.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Obter aplicativo por ID
   */
  async getAppById(appId) {
    const apps = await this.getApps();
    return apps.find(app => app.id === appId);
  }

  /**
   * Obter municípios
   */
  async getMunicipalities() {
    try {
      return await this._getCities();
    } catch {
      // Se não houver arquivo de cidades, retornar cidades de exemplo
      return this._getMockMunicipalities();
    }
  }
  
  /**
   * Autenticar contra data/users.json e data/access.json
   * Depois será integrado com Wix
   */
  async authenticate(appId, municipalityId, username, password) {
    // Simular delay de rede
    await this._delay(600);

    const uname = (username || '').trim().toLowerCase();
    const pass = (password || '').trim();

    if (!uname) {
      throw new Error('Usuário inválido');
    }

    if (!pass) {
      throw new Error('Senha inválida');
    }

    const users = await this._getUsers();
    const user = users.find(u => (u.username || '').toLowerCase() === uname);

    if (!user) {
      throw new Error('Login incorreto: usuário não encontrado');
    }

    if (!user.isActive) {
      throw new Error('Login incorreto: usuário inativo');
    }

    if (user.password !== pass) {
      throw new Error('Login incorreto: senha inválida');
    }

    // Usuários master têm acesso a tudo; os demais precisam de uma
    // concessão ativa para este app + município em data/access.json
    if (!user.isMaster) {
      const grant = await this.getAccessGrant(user.username, appId, municipalityId);

      if (!grant || grant.isActive === false) {
        throw new Error('Login incorreto: usuário sem permissão para este sistema neste município');
      }
    }

    // O link de destino é sempre o padrão calculado a partir do
    // sistema + município — nunca precisa ser cadastrado à mão
    const destinationURL = await this.getDestinationURL(appId, municipalityId);

    // Sucesso: retornar sessão
    return {
      sessionId: this._generateToken(),
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      isMaster: user.isMaster,
      app: appId,
      municipality: municipalityId,
      destinationURL,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Consultar data/access.json — mapa aninhado username → appId → cityId,
   * o que dá acesso O(1) por nível (em vez de varrer um array de registros).
   *
   * Estrutura do arquivo:
   * {
   *   "marcos": {
   *     "digidoc-ad": { "001": { "isActive": true } }
   *   }
   * }
   *
   * Adicionar um usuário novo = adicionar uma chave nova no topo.
   * Adicionar um acesso novo = adicionar uma chave de cidade dentro do app.
   * O link de destino NÃO fica salvo aqui — veja getDestinationURL().
   */
  async getAccessGrant(username, appId, cityId) {
    const access = await this._getAccess();
    const uname = (username || '').trim().toLowerCase();
    return access[uname]?.[appId]?.[cityId] || null;
  }

  /**
   * Montar o link padrão de um sistema para um município específico.
   *
   * Se o app tiver um `urlPattern` cadastrado (ex.:
   * "www.ecoplancontabilidade.com/digidocad{municipio}"), o {municipio} é
   * substituído pelo nome do município sem acento/espaço e o resultado vira
   * o link. Sem urlPattern, cai na fórmula antiga por compatibilidade com
   * apps cadastrados antes desse campo existir:
   *
   * Padrão: https://www.ecoplancontabilidade.com/{app}{Municipio}
   * Ex.: "DigidocAD" + "Patos"       -> .../digidocADPatos
   *      "DigidocRH" + "João Pessoa" -> .../digidocRHJoaoPessoa
   *
   * `app` pode ser o objeto do app ou (por compatibilidade) só o nome em string.
   */
  buildDestinationURL(app, cityName) {
    const appObj = typeof app === 'string' ? { name: app } : (app || {});
    const citySlug = this._toUrlSlug(cityName);
    const pattern = (appObj.urlPattern || '').trim();

    if (pattern) {
      const url = pattern.replace(/\{municipio\}/gi, citySlug);
      return /^https?:\/\//i.test(url) ? url : `https://${url}`;
    }

    const name = appObj.name || '';
    const appSlug = name.charAt(0).toLowerCase() + name.slice(1);
    return `https://www.ecoplancontabilidade.com/${appSlug}${citySlug}`;
  }

  /**
   * "João Pessoa" -> "JoaoPessoa" (remove acentos e espaços, preserva maiúsculas)
   */
  _toUrlSlug(text) {
    const COMBINING_MARK_START = 0x0300;
    const COMBINING_MARK_END = 0x036f;

    return (text || '')
      .normalize('NFD')
      .split('')
      .filter(char => {
        const code = char.codePointAt(0);
        return code < COMBINING_MARK_START || code > COMBINING_MARK_END;
      })
      .join('')
      .replace(/\s+/g, '');
  }

  /**
   * Resolver o link de destino de um appId + cityId.
   * Usa o link personalizado em city.linkOverrides[appId] quando existir
   * (definido no painel admin, para os poucos casos que não seguem o
   * padrão); senão cai no link padrão calculado por buildDestinationURL().
   */
  async getDestinationURL(appId, cityId) {
    try {
      const [apps, cities] = await Promise.all([
        this._getApps(),
        this._getCities()
      ]);

      const app = apps.find(a => a.id === appId);
      const city = cities.find(c => c.id === cityId);

      if (!app || !city) return null;

      const override = city.linkOverrides && city.linkOverrides[appId];
      if (override) return override;

      return this.buildDestinationURL(app, city.name);
    } catch (error) {
      console.error('Erro ao montar link de destino:', error);
      return null;
    }
  }

  /**
   * Redirecionar para aplicativo (simular)
   */
  async redirectToApp(session) {
    const app = await this.getAppById(session.app);
    if (!app) {
      throw new Error('Aplicativo não encontrado');
    }

    // session.destinationURL já vem calculado por getDestinationURL();
    // só cai no fallback se o app/município não for encontrado
    const redirectUrl = session.destinationURL || `${app.id}/dashboard?session=${session.sessionId}`;
    console.log(`[Redirecionando para] ${redirectUrl}`);

    // Aqui seria feito: window.location.href = redirectUrl;
    return redirectUrl;
  }
  
  /**
   * Fazer logout
   */
  async logout() {
    await this._delay(300);
    return true;
  }
  
  /* ========================================
     HELPERS (Privados)
     ======================================== */

  /**
   * O painel admin (admin.html) grava suas edições no localStorage —
   * não existe backend aqui para escrever de volta em data/*.json.
   * Estes getters preferem essa cópia editada quando ela existe, e só
   * caem para o JSON estático (o "de fábrica") quando não há nada salvo
   * ainda. É o que faz uma edição no admin (um app renomeado, um usuário
   * novo, um link personalizado) valer de verdade no login de index.html,
   * em vez de ficar presa só na tela do admin.
   */
  _readLocalStorageJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(`Erro ao ler ${key} do localStorage:`, error);
      return null;
    }
  }

  async _getApps() {
    const local = this._readLocalStorageJSON('ecohub-admin-data');
    if (local && local.apps) return local.apps;
    return this.fetchJSON('apps');
  }

  async _getCities() {
    const local = this._readLocalStorageJSON('ecohub-admin-data');
    if (local && local.cities) return local.cities;
    return this.fetchJSON('cities');
  }

  async _getUsers() {
    const local = this._readLocalStorageJSON('ecohub-users-data');
    if (local && local.users) return local.users;
    return this.fetchJSON('users').catch(() => []);
  }

  async _getAccess() {
    const local = this._readLocalStorageJSON('ecohub-users-data');
    if (local && local.access) return local.access;
    return this.fetchJSON('access').catch(() => ({}));
  }

  /**
   * Simular delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Gerar token simulado
   */
  _generateToken() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  /**
   * Municípios de exemplo (fallback)
   */
  _getMockMunicipalities() {
    return [
      { id: '001', name: 'Patos', state: 'PB' },
      { id: '002', name: 'Pombal', state: 'PB' },
      { id: '003', name: 'Sousa', state: 'PB' },
      { id: '004', name: 'Areia', state: 'PB' },
      { id: '005', name: 'João Pessoa', state: 'PB' },
      { id: '006', name: 'Campina Grande', state: 'PB' },
      { id: '007', name: 'Recife', state: 'PE' },
      { id: '008', name: 'Caruaru', state: 'PE' }
    ];
  }
}

// Criar instância global
window.api = new API();

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
