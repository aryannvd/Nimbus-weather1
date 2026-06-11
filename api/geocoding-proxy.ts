import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

export default async function handler(request: any, response: any) {
  const url = request.url || '';
  let suffix = '';
  
  try {
    const urlObj = new URL(url, 'http://localhost');
    const pathParam = urlObj.searchParams.get('path');
    if (pathParam) {
      suffix = pathParam;
    } else {
      const prefix = '/api/geocoding-proxy';
      if (url.startsWith(prefix)) {
        suffix = url.substring(prefix.length);
      } else {
        suffix = urlObj.pathname + urlObj.search;
      }
    }
  } catch (e) {
    const qIndex = url.indexOf('?path=');
    if (qIndex !== -1) {
      suffix = decodeURIComponent(url.substring(qIndex + 6));
    }
  }

  const targetUrl = `https://geocoding-api.open-meteo.com${suffix}`;
  
  try {
    console.log(`[Server Proxy] Fetching: ${targetUrl}`);
    const fetchRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    if (!fetchRes.ok) {
      const text = await fetchRes.text();
      response.status(fetchRes.status || 500).send(text);
      return;
    }

    const data = await fetchRes.json();
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).json(data);
  } catch (err: any) {
    console.error(`[Server Proxy] Failed for ${targetUrl}:`, err);
    response.status(500).json({ error: true, message: err?.message || 'Proxy Error' });
  }
}
