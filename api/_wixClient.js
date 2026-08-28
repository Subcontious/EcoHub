/**
 * Cliente mínimo para a Wix Data API v2 (REST), usado pelos endpoints em
 * /api. Não é uma rota — o prefixo "_" faz a Vercel ignorar este arquivo
 * como função.
 *
 * Autenticação testada via curl (passo A0 do plano) antes de qualquer
 * chamada real daqui — se a Wix devolver 401 reclamando de conta/site,
 * a API Key é do tipo "conta" e precisa do header wix-account-id
 * (WIX_ACCOUNT_ID), não só wix-site-id.
 */

const WIX_DATA_BASE = 'https://www.wixapis.com/wix-data/v2';

function buildHeaders() {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  const accountId = process.env.WIX_ACCOUNT_ID;

  if (!apiKey || !siteId) {
    throw new Error('WIX_API_KEY/WIX_SITE_ID não configurados nas variáveis de ambiente da Vercel.');
  }

  const headers = {
    'Authorization': apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json'
  };

  if (accountId) {
    headers['wix-account-id'] = accountId;
  }

  return headers;
}

/**
 * Consulta uma collection da Wix.
 * `query` segue o formato da Wix Data Query API: { filter, paging, sort }.
 * Filtros usam operadores com "$" (ex.: { usuario: { $eq: 'marcos' } },
 * { _id: { $hasSome: ['id1','id2'] } }) — ver documentação da Wix Data API.
 *
 * Retorna os itens já "achatados": { id, ...campos } em vez do formato
 * bruto { id, data: {...campos} } da API, para simplificar quem consome.
 */
async function wixQuery(collectionId, query = {}) {
  const response = await fetch(`${WIX_DATA_BASE}/items/query`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ dataCollectionId: collectionId, query })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(`Wix Data API respondeu ${response.status} ao consultar ${collectionId}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  // NOTA: confirmar durante o teste de curl (passo A0) se a resposta real
  // usa a chave "dataItems" — ajustar aqui se a Wix devolver outro nome.
  const rawItems = body.dataItems || [];
  const items = rawItems.map(item => ({ id: item.id, ...item.data }));

  return { items, pagingMetadata: body.pagingMetadata || {} };
}

/**
 * Atalho para buscar no máximo 1 item que bata com o filtro.
 */
async function wixQuerySingle(collectionId, filter) {
  const { items } = await wixQuery(collectionId, { filter, paging: { limit: 1 } });
  return items[0] || null;
}

module.exports = { wixQuery, wixQuerySingle };
