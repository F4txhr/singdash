const CF_API_TOKEN = process.env.CF_API_TOKEN;

function normalizeHostname(input) {
  if (!input) return null;
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(withScheme).hostname;
  } catch {
    return null;
  }
}

async function cfFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`Cloudflare API request failed (${res.status})`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function resolveZoneId(hostname) {
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length < 2) {
    throw new Error('Invalid domain provided');
  }

  // Try exact hostname first (for apex), then root domain fallback.
  const candidates = [hostname, labels.slice(-2).join('.')];

  for (const candidate of candidates) {
    const url = `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(candidate)}&status=active&per_page=1`;
    const payload = await cfFetch(url);
    const zoneId = payload?.result?.[0]?.id;
    if (zoneId) {
      return zoneId;
    }
  }

  throw new Error('No active Cloudflare zone found for this domain');
}

async function queryBandwidth(zoneId, sinceDate) {
  const query = `
    query GetZoneBandwidth($zoneTag: string, $filter: ZoneHttpRequests1dGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(limit: 1000, filter: $filter) {
            sum {
              bytes
              requests
            }
          }
        }
      }
    }
  `;

  const variables = {
    zoneTag: zoneId,
    filter: {
      date_geq: sinceDate,
      date_leq: new Date().toISOString().slice(0, 10)
    }
  };

  const payload = await cfFetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables })
  });

  if (payload?.errors?.length) {
    const err = new Error('Cloudflare GraphQL error');
    err.status = 502;
    err.payload = payload.errors;
    throw err;
  }

  const groups = payload?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  const totalBytes = groups.reduce((acc, item) => acc + (item?.sum?.bytes || 0), 0);
  const totalRequests = groups.reduce((acc, item) => acc + (item?.sum?.requests || 0), 0);

  return {
    total_bytes: totalBytes,
    total_requests: totalRequests,
    days: groups.length
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!CF_API_TOKEN) {
    return res.status(500).json({
      success: false,
      message: 'Missing CF_API_TOKEN in Vercel env'
    });
  }

  const domain = req.query.domain;
  const sinceDays = Number(req.query.since_days || 30);
  const hostname = normalizeHostname(domain);

  if (!hostname) {
    return res.status(400).json({ success: false, message: 'Valid domain is required' });
  }

  const safeSinceDays = Number.isFinite(sinceDays) ? Math.min(Math.max(sinceDays, 1), 365) : 30;
  const sinceDate = new Date(Date.now() - safeSinceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const zoneId = await resolveZoneId(hostname);
    const bandwidth = await queryBandwidth(zoneId, sinceDate);

    return res.status(200).json({
      success: true,
      domain: hostname,
      zone_id: zoneId,
      range: {
        since_date: sinceDate,
        until_date: new Date().toISOString().slice(0, 10),
        since_days: safeSinceDays
      },
      data: {
        bandwidth
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
      details: error.payload || null
    });
  }
};
