const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

function parseTable(req) {
  return req.query.table || req.body?.table;
}

function parseSelect(req) {
  return req.query.select || req.body?.select || '*';
}

function parseFilter(req) {
  return req.query.filter || req.body?.filter || '';
}

function buildQueryString(select, filter) {
  const params = new URLSearchParams({ select });
  if (!filter) return params.toString();

  const segments = String(filter).split('&').filter(Boolean);
  for (const segment of segments) {
    const [key, ...rest] = segment.split('=');
    if (!key || rest.length === 0) continue;
    params.append(key, rest.join('='));
  }

  return params.toString();
}

async function callSupabase({ table, method, select, filter, body }) {
  const query = buildQueryString(select, filter);
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await res.text();
  const payload = raw ? (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  })() : [];

  if (!res.ok) {
    const err = new Error('Supabase request failed');
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

module.exports = async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      success: false,
      message: 'Missing SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in Vercel env'
    });
  }

  const table = parseTable(req);
  if (!table) {
    return res.status(400).json({ success: false, message: 'table is required' });
  }

  const select = parseSelect(req);
  const filter = parseFilter(req);

  try {
    if (req.method === 'GET') {
      const data = await callSupabase({ table, method: 'GET', select, filter });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const data = await callSupabase({
        table,
        method: 'POST',
        select,
        filter,
        body: req.body?.body ?? req.body
      });
      return res.status(200).json(data);
    }

    if (req.method === 'PATCH') {
      const data = await callSupabase({
        table,
        method: 'PATCH',
        select,
        filter,
        body: req.body?.body ?? req.body
      });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const data = await callSupabase({ table, method: 'DELETE', select, filter });
      return res.status(200).json(data);
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
      details: error.payload || null
    });
  }
};
