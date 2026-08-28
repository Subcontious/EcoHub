/**
 * POST /api/login — autentica contra a collection Usuarios (Wix, já em
 * produção) e devolve os Apps que o usuário pode abrir.
 *
 * Acesso é dado pelo campo multi-referência de Usuarios (nome configurado
 * em WIX_USER_APPS_FIELD — ver .env.example e o tutorial de setup), não
 * por município/cliente. nivel === 1 (master) pula essa lista e recebe
 * todos os Apps ativos.
 *
 * A senha nunca é devolvida na resposta, em nenhum caso.
 */

const { wixQuery } = require('./_wixClient');

const MASTER_NIVEL = 1;
const GENERIC_AUTH_ERROR = 'Usuário ou senha inválidos';

/**
 * A Wix Data API pode devolver o campo multi-referência já expandido
 * (array de objetos com os dados do Apps referenciado) ou só como array
 * de IDs, dependendo de como a referência foi configurada. Cobrimos os
 * dois casos — confirmar durante o teste manual (passo A0) qual é o real
 * e simplificar esta função depois, se for sempre um dos dois.
 */
async function resolveUserApps(rawValue) {
  const list = Array.isArray(rawValue) ? rawValue : [];
  if (list.length === 0) return [];

  const alreadyExpanded = typeof list[0] === 'object' && list[0] !== null &&
    ('nomeApp' in list[0] || 'url' in list[0]);

  if (alreadyExpanded) {
    return list.map(app => ({ id: app._id || app.id, nomeApp: app.nomeApp, url: app.url }));
  }

  const ids = list.map(entry => (typeof entry === 'string' ? entry : entry._id || entry.id)).filter(Boolean);
  if (ids.length === 0) return [];

  const { items } = await wixQuery('Apps', { filter: { _id: { $hasSome: ids } } });
  return items.map(app => ({ id: app.id, nomeApp: app.nomeApp, url: app.url }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const { username, password } = req.body || {};
  const uname = (username || '').trim().toLowerCase();
  const pass = (password || '').trim();

  if (!uname || !pass) {
    res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    return;
  }

  try {
    // Filtrado em memória (case-insensitive) em vez de via query, porque
    // o campo `usuario` na Wix tem entradas em maiúsculas/minúsculas
    // variadas (ex.: "Max", "Josinaldo") e a comparação precisa ignorar
    // caixa como o login sempre fez.
    const { items: users } = await wixQuery('Usuarios', { paging: { limit: 1000 } });
    const user = users.find(u => (u.usuario || '').trim().toLowerCase() === uname);

    if (!user || user.ativo !== true || user.senha !== pass) {
      res.status(401).json({ error: GENERIC_AUTH_ERROR });
      return;
    }

    const isMaster = Number(user.nivel) === MASTER_NIVEL;

    let apps;
    if (isMaster) {
      const { items } = await wixQuery('Apps', { paging: { limit: 1000 } });
      apps = items.map(app => ({ id: app.id, nomeApp: app.nomeApp, url: app.url }));
    } else {
      const appsField = process.env.WIX_USER_APPS_FIELD;
      if (!appsField) {
        throw new Error('WIX_USER_APPS_FIELD não configurado nas variáveis de ambiente.');
      }
      apps = await resolveUserApps(user[appsField]);
    }

    res.status(200).json({
      userId: user.id,
      username: user.usuario,
      isMaster,
      cliente: user.cliente || null,
      apps
    });
  } catch (error) {
    console.error('Erro em /api/login:', error);
    res.status(500).json({ error: 'Erro ao consultar dados. Tente novamente.' });
  }
};
